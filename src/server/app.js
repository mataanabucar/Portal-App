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
import { createTeamGptAuthService } from "./services/teamgpt/auth.js";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const lucideDirectory = fileURLToPath(
  new URL("../../node_modules/lucide/dist/esm/", import.meta.url)
);

export function createApp({ config, portalService, summarizer, parser, asker, graphAuth, emailContextSummarizer, sourcebotService, teamGptAuthService }) {
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
          teamGptAuthService,
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
          teamGptAuthService,
          testerConfig: normalizeTesterConfig(request.body?.testerConfig)
        },
        async ({ portalService: runtimePortalService, summarizer: runtimeSummarizer }) => {
          const payload = await buildPreviewPayload({
            portalService: runtimePortalService,
            summarizer: runtimeSummarizer,
            includeSummary: request.body?.includeSummary === true,
            focus: request.body?.focus,
            summaryProvider: request.body?.summaryProvider
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
          teamGptAuthService,
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
            model: request.body?.model,
            provider: request.body?.parserProvider
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
          teamGptAuthService,
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
            model: request.body?.model,
            provider: request.body?.provider,
            threadId: request.body?.threadId
          });

          response.json(payload);
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/teamgpt/auth", async (request, response, next) => {
    try {
      const authPayload = await teamGptAuthService.getJwtToken();
      response.json({
        ok: true,
        jwtToken: authPayload.jwtToken,
        pageUrl: authPayload.pageUrl,
        endpointUrl: config.teamGptEndpointUrl,
        appId: config.teamGptAppId,
        environment: config.teamGptEnvironment
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/teamgpt/test", async (request, response, next) => {
    try {
      const endpointUrl = normalizeTeamGptEndpointUrl(request.body?.endpointUrl);
      const headers = normalizeTeamGptHeaders(request.body?.headers);
      const body = request.body?.body && typeof request.body.body === "object"
        ? request.body.body
        : {};
      let usedAutoAuth = false;
      let tokenPreview = "";

      if (!headers.Authorization) {
        const authPayload = await teamGptAuthService.getJwtToken();
        headers.Authorization = `Bearer ${authPayload.jwtToken}`;
        headers.appid = headers.appid || config.teamGptAppId;
        headers.environment = headers.environment || config.teamGptEnvironment;
        headers.ThreadID = headers.ThreadID || "";
        usedAutoAuth = true;
      } else {
        headers.appid = headers.appid || config.teamGptAppId;
        headers.environment = headers.environment || config.teamGptEnvironment;
        headers.ThreadID = headers.ThreadID || "";
      }

      tokenPreview = buildTokenPreview(headers.Authorization);

      const upstreamResponse = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const rawText = await upstreamResponse.text();
      response.status(upstreamResponse.status).json({
        ok: upstreamResponse.ok,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        usedAutoAuth,
        endpointUrl,
        headers: {
          ...headers,
          Authorization: headers.Authorization ? "[redacted]" : ""
        },
        tokenPreview,
        requestBody: body,
        rawText
      });
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
          teamGptAuthService,
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
            summaryProvider: request.body?.summaryProvider,
            parserFocus: request.body?.parserFocus,
            parserTestchat: request.body?.parserTestchat === true,
            model: request.body?.model,
            parserProvider: request.body?.parserProvider
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
  { config, portalService, summarizer, parser, asker, teamGptAuthService, testerConfig },
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
  const runtimeTeamGptAuthService = createTeamGptAuthService(effectiveConfig);
  const runtimeSummarizer = createSummarizer(effectiveConfig, {
    teamGptAuthService: runtimeTeamGptAuthService
  });
  const runtimeParser = createPortalParser(effectiveConfig, {
    teamGptAuthService: runtimeTeamGptAuthService
  });
  const runtimeAsker = createAskService(effectiveConfig, {
    teamGptAuthService: runtimeTeamGptAuthService
  });

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
    await runtimeTeamGptAuthService.dispose();
    await runtimePortalService.dispose();
  }
}

async function buildPreviewPayload({
  portalService,
  summarizer,
  includeSummary,
  focus,
  summaryProvider
}) {
  const snapshot = await portalService.fetchSnapshot();
  const summary = includeSummary
    ? await summarizer.summarize(snapshot, focus, {
        provider: summaryProvider
      })
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
  model,
  provider
}) {
  const snapshot = await portalService.fetchSnapshot();
  await tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot);
  const parsed = await parser.parseSnapshot(snapshot, {
    focus,
    testchat,
    model,
    provider
  });

  return {
    snapshot: portalService.toClientSnapshot(snapshot),
    parser: parsed
  };
}

async function buildAskPayload({ asker, prompt, model, provider, threadId }) {
  return asker.ask(prompt, {
    model,
    provider,
    threadId
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
  summaryProvider,
  parserFocus,
  parserTestchat,
  model,
  parserProvider
}) {
  const snapshot = await portalService.fetchSnapshot();
  await tryEnrichSnapshot(graphAuth, emailContextSummarizer, snapshot);
  const [summary, parsed] = await Promise.all([
    includeSummary
      ? summarizer.summarize(snapshot, focus, {
          provider: summaryProvider
        })
      : Promise.resolve(null),
    parser.parseSnapshot(snapshot, {
      focus: parserFocus,
      testchat: parserTestchat,
      model,
      provider: parserProvider
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

function normalizeTeamGptEndpointUrl(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : config.teamGptEndpointUrl;
}

function normalizeTeamGptHeaders(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const headers = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      continue;
    }

    const normalizedKey = String(key || "").trim();
    const normalizedValue = entryValue.trim();
    if (!normalizedKey || !normalizedValue) {
      continue;
    }

    headers[normalizedKey] = normalizedValue;
  }

  return headers;
}

function buildTokenPreview(authorizationHeader = "") {
  const rawToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : authorizationHeader.trim();

  if (!rawToken) {
    return "";
  }

  if (rawToken.length <= 24) {
    return rawToken;
  }

  return `${rawToken.slice(0, 12)}...${rawToken.slice(-8)}`;
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
