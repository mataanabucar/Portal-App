import express from "express";
import { fileURLToPath } from "node:url";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));

export function createApp({ config, portalService, summarizer, parser }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(publicDirectory));

  app.get("/api/health", (request, response) => {
    response.json({
      ok: true,
      config: {
        port: config.port,
        portal: portalService.describe(),
        summarizer: summarizer.describe(),
        parser: parser.describe()
      },
      now: new Date().toISOString()
    });
  });

  app.post("/api/portal/preview", async (request, response, next) => {
    try {
      const payload = await buildPreviewPayload({
        portalService,
        summarizer,
        includeSummary: request.body?.includeSummary === true,
        focus: request.body?.focus
      });

      response.json(payload);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/portal/parse", async (request, response, next) => {
    try {
      const payload = await buildParserPayload({
        portalService,
        parser,
        focus: request.body?.focus,
        testchat: request.body?.testchat === true,
        model: request.body?.model
      });

      response.json(payload);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/dashboard", async (request, response, next) => {
    try {
      const payload = await buildDashboardPayload({
        portalService,
        summarizer,
        parser,
        includeSummary: request.body?.includeSummary !== false,
        focus: request.body?.focus,
        parserFocus: request.body?.parserFocus,
        parserTestchat: request.body?.parserTestchat === true,
        model: request.body?.model
      });

      response.json(payload);
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
