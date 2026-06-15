import express from "express";
import { fileURLToPath } from "node:url";
import { buildConfig } from "./config/env.js";
import {
  createAskService,
  createPortalParser,
  createSummarizer
} from "./services/ai/index.js";
import {
  readDashboardCache,
  writeDashboardCache
} from "./services/dashboardCache.js";
import { createPortalService } from "./services/portal/index.js";
import {
  hasTesterConfigOverrides,
  normalizeTesterConfig,
  parseTesterConfigQuery
} from "./services/testerConfig.js";
import { findItemEmail } from "./services/graph/services/itemEmailService.js";
import { enrichRecordsWithEmail } from "./services/graph/itemEmailEnricher.js";
import { runResearchPipeline } from "./services/sourcebot/researchPipeline.js";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const lucideDirectory = fileURLToPath(
  new URL("../../node_modules/lucide/dist/esm/", import.meta.url)
);

export function createApp({ config, portalService, summarizer, parser, asker, graphAuth, emailContextSummarizer, sourcebotService }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use("/vendor/lucide", express.static(lucideDirectory));
  app.use(express.static(publicDirectory));

  app.get("/api/health", (request, response) => {
    try {
      void respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          testerConfig: parseTesterConfigQuery(request.query?.testerConfig)
        },
        async ({
          effectiveConfig,
          portalService: runtimePortalService,
          summarizer: runtimeSummarizer,
          parser: runtimeParser,
          asker: runtimeAsker,
          usingTesterConfig
        }) => {
          response.json({
            ok: true,
            config: {
              port: effectiveConfig.port,
              portal: runtimePortalService.describe(),
              summarizer: runtimeSummarizer.describe(),
              parser: runtimeParser.describe(),
              ask: runtimeAsker.describe(),
              sourcebot: sourcebotService?.describe() ?? { enabled: false }
            },
            testing: {
              usingTesterConfig
            },
            now: new Date().toISOString()
          });
        }
      ).catch((error) => {
        response.status(error.statusCode || 500).json({
          error: error.message || "Unexpected server error."
        });
      });
    } catch (error) {
      response.status(error.statusCode || 500).json({
        error: error.message || "Unexpected server error."
      });
    }
  });

  app.get("/api/dashboard/cache", (request, response) => {
    const testerConfig = parseTesterConfigQuery(request.query?.testerConfig);
    const cacheFile =
      typeof testerConfig.dashboardCacheFile === "string"
        ? testerConfig.dashboardCacheFile
        : config.dashboardCacheFile;

    response.json(readDashboardCache(cacheFile) || null);
  });

  app.post("/api/dashboard/cache", (request, response, next) => {
    try {
      const testerConfig = normalizeTesterConfig(request.body?.testerConfig);
      const cacheFile =
        typeof testerConfig.dashboardCacheFile === "string"
          ? testerConfig.dashboardCacheFile
          : config.dashboardCacheFile;
      const payload = writeDashboardCache(
        cacheFile,
        request.body
      );
      response.json(payload);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/portal/preview", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ portalService: runtimePortalService, summarizer: runtimeSummarizer }) => {
          const payload = await buildPreviewPayload({
            portalService: runtimePortalService,
            summarizer: runtimeSummarizer,
            includeSummary: request.body?.includeSummary === true,
            focus: request.body?.focus
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/portal/parse", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ portalService: runtimePortalService, parser: runtimeParser }) => {
          const payload = await buildParserPayload({
            portalService: runtimePortalService,
            parser: runtimeParser,
            graphAuth,
            emailContextSummarizer,
            focus: request.body?.focus,
            testchat: request.body?.testchat === true,
            model: request.body?.model
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ask", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ asker: runtimeAsker }) => {
          const prompt = normalizeAskPrompt(
            request.body?.prompt ?? request.body?.question
          );

          if (!prompt) {
            const error = new Error("Prompt is required.");
            error.statusCode = 400;
            throw error;
          }

          const payload = await buildAskPayload({
            asker: runtimeAsker,
            prompt,
            model: request.body?.model
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/dashboard", async (request, response, next) => {
    try {
      await respondWithRuntime(
        {
          config,
          portalService,
          summarizer,
          parser,
          asker,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({
          portalService: runtimePortalService,
          summarizer: runtimeSummarizer,
          parser: runtimeParser,
          asker: runtimeAsker
        }) => {
          const payload = await buildDashboardPayload({
            portalService: runtimePortalService,
            summarizer: runtimeSummarizer,
            parser: runtimeParser,
            graphAuth,
            emailContextSummarizer,
            includeSummary: request.body?.includeSummary !== false,
            focus: request.body?.focus,
            parserFocus: request.body?.parserFocus,
            parserTestchat: request.body?.parserTestchat === true,
            model: request.body?.model
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/item/email", async (request, response, next) => {
    try {
      if (!graphAuth) {
        response.status(503).json({ ok: false, error: "Graph auth is not configured." });
        return;
      }

      let token;
      try {
        token = await graphAuth.getAccessToken();
      } catch (authError) {
        response.status(authError.statusCode || 401).json({ ok: false, error: authError.message });
        return;
      }

      const { requestId, relatedActionItem } = request.body || {};
      const email = await findItemEmail(token, { requestId, relatedActionItem });
      response.json({ ok: true, email });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/item/research", async (request, response, next) => {
    try {
      if (!sourcebotService?.enabled) {
        response.status(503).json({ ok: false, error: "Sourcebot is not configured." });
        return;
      }

      const { query, messages = [], itemContext = "" } = request.body || {};
      if (!query || typeof query !== "string" || !query.trim()) {
        response.status(400).json({ ok: false, error: "query is required." });
        return;
      }

      const result = await runResearchPipeline({
        sourcebotService,
        config,
        itemContext,
        userQuery: query.trim(),
        messages,
      });

      response.json({ ok: true, answer: result.answer, chatUrl: result.chatUrl, retrievalTrail: result.retrievalTrail });
    } catch (error) {
      console.error("[/api/item/research]", error);
      next(error);
    }
  });

  app.use((error, request, response, next) => {
    response.status(error.statusCode || 500).json({
      error: error.message || "Unexpected server error."
    });
  });

  return app;
}

async function respondWithRuntime(
  { config, portalService, summarizer, parser, asker, testerConfig },
  action
) {
  if (!hasTesterConfigOverrides(testerConfig)) {
    return action({
      effectiveConfig: config,
      portalService,
      summarizer,
      parser,
      asker,
      usingTesterConfig: false
    });
  }

  const effectiveConfig = buildConfig(testerConfig);
  const runtimePortalService = createPortalService(effectiveConfig);
  const runtimeSummarizer = createSummarizer(effectiveConfig);
  const runtimeParser = createPortalParser(effectiveConfig);
  const runtimeAsker = createAskService(effectiveConfig);

  try {
    return await action({
      effectiveConfig,
      portalService: runtimePortalService,
      summarizer: runtimeSummarizer,
      parser: runtimeParser,
      asker: runtimeAsker,
      usingTesterConfig: true
    });
  } finally {
    await runtimePortalService.dispose();
  }
}

async function buildPreviewPayload({
  portalService,
  summarizer,
  includeSummary,
  focus
}) {
  const snapshot = await portalService.fetchSnapshot();
  const summary = includeSummary
    ? await summarizer.summarize(snapshot, focus)
    : null;

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    summary
  };
}

async function buildParserPayload({
  portalService,
  parser,
  graphAuth,
  emailContextSummarizer,
  focus,
  testchat,
  model
}) {
  const snapshot = await portalService.fetchSnapshot();
  await tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot);
  const parsed = await parser.parseSnapshot(snapshot, {
    focus,
    testchat,
    model
  });

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    parser: parsed
  };
}

async function buildAskPayload({ asker, prompt, model }) {
  return asker.ask(prompt, {
    model
  });
}

async function buildDashboardPayload({
  portalService,
  summarizer,
  parser,
  graphAuth,
  emailContextSummarizer,
  includeSummary,
  focus,
  parserFocus,
  parserTestchat,
  model
}) {
  const snapshot = await portalService.fetchSnapshot();
  await tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot);
  const [summary, parsed] = await Promise.all([
    includeSummary ? summarizer.summarize(snapshot, focus) : Promise.resolve(null),
    parser.parseSnapshot(snapshot, {
      focus: parserFocus,
      testchat: parserTestchat,
      model
    })
  ]);

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    summary,
    parser: parsed
  };
}

function normalizeAskPrompt(value) {
  return typeof value === "string" ? value.trim() : "";
}


async function tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot) {
  if (!graphAuth || !Array.isArray(snapshot?.records)) return;
  try {
    const token = await graphAuth.getAccessToken();
    const before = snapshot.records.length;
    snapshot.records = await enrichRecordsWithEmail(token, snapshot.records, {
      summarize: emailContextSummarizer?.summarize.bind(emailContextSummarizer),
    });
    const enriched = snapshot.records.filter((r) => r.emailContext).length;
    console.log(`[email-enrichment] ${enriched}/${before} records enriched with email context`);
  } catch (error) {
    console.warn("[email-enrichment] skipped:", error.message);
  }
}
