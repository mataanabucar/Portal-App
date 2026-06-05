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

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const lucideDirectory = fileURLToPath(
  new URL("../../node_modules/lucide/dist/esm/", import.meta.url)
);

export function createApp({ config, portalService, summarizer, parser, asker }) {
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
              ask: runtimeAsker.describe()
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
  focus,
  testchat,
  model
}) {
  const snapshot = await portalService.fetchSnapshot();
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
  includeSummary,
  focus,
  parserFocus,
  parserTestchat,
  model
}) {
  const snapshot = await portalService.fetchSnapshot();
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
