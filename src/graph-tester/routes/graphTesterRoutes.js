import { Router } from "express";
import { getClientCatalog, getCatalogEntry } from "../catalog/graphTesterCatalog.js";
import { hasGraphTesterAuthConfig } from "../utils/graphSession.js";
import { parseCatalogArgs } from "../utils/fieldParsers.js";
import { buildGraphTesterError, buildResultSummary, countResultItems } from "../utils/resultFormatting.js";

export function createGraphTesterRouter({ config, authStore }) {
  const router = Router();

  // Public app metadata used by the standalone UI to bootstrap itself.
  router.get("/api/health", (request, response) => {
    response.json({
      ok: true,
      app: "graph-tester",
      now: new Date().toISOString(),
      config: {
        host: config.host,
        port: config.port,
        origin: config.origin,
        redirectUri: config.graphRedirectUri,
        authConfigured: hasGraphTesterAuthConfig(config),
        autoLoginOnStartup: config.autoLoginOnStartup,
        tokenCacheFile: config.tokenCacheFile,
        scopes: config.graphScopes,
      },
    });
  });

  router.get("/api/graph-tester/catalog", (request, response) => {
    response.json({
      ok: true,
      services: getClientCatalog(),
      generatedAt: new Date().toISOString(),
    });
  });

  router.get("/api/graph-tester/session", async (request, response) => {
    const payload = await authStore.buildStatusPayload();
    response.json(payload);
  });

  // OAuth entrypoint for delegated Graph auth. Tokens stay server-side in the local cache file.
  router.get("/auth/login", async (request, response) => {
    try {
      assertAuthConfig(config);
      const { url } = authStore.beginAuthorizationRequest("manual");
      response.redirect(url);
    } catch (error) {
      sendTextError(response, error);
    }
  });

  router.get("/auth/redirect", async (request, response) => {
    try {
      assertAuthConfig(config);
      await authStore.completeAuthorizationRequest(request.query);
      response.redirect("/");
    } catch (error) {
      sendTextError(response, error);
    }
  });

  router.post("/api/graph-tester/logout", async (request, response) => {
    await authStore.clearStoredAuth();
    response.json({ ok: true, loggedOutAt: new Date().toISOString() });
  });

  // Dispatch an allowlisted Graph function using the current persisted Graph token.
  router.post("/api/graph-tester/run", async (request, response) => {
    const { service = "", functionName = "", args = {}, confirmMutation = false } =
      request.body || {};

    const entry = getCatalogEntry(service, functionName);

    if (!entry) {
      const errorPayload = buildGraphTesterError(
        createHttpError(
          404,
          "The requested service function is not allowlisted.",
          "GraphFunctionNotAllowed",
          "Use the catalog endpoint or the tester UI selectors to choose a supported function."
        )
      );
      response.status(errorPayload.status).json({ ok: false, error: errorPayload });
      return;
    }

    if (entry.mutation && confirmMutation !== true) {
      const errorPayload = buildGraphTesterError(
        createHttpError(
          400,
          "Mutation requests require confirmMutation: true.",
          "GraphMutationConfirmationRequired",
          "Check the confirmation box before running a mutating test."
        )
      );
      response.status(errorPayload.status).json({ ok: false, error: errorPayload });
      return;
    }

    try {
      const normalizedArgs = parseCatalogArgs(entry, args);
      const accessToken = await authStore.getAccessToken();
      const startedAt = Date.now();
      const data = await entry.invoke(accessToken, normalizedArgs);
      const finishedAt = new Date().toISOString();

      response.json({
        ok: true,
        service,
        functionName,
        input: normalizedArgs,
        data,
        summary: buildResultSummary(entry, data),
        meta: {
          count: countResultItems(data),
          timestamp: finishedAt,
          durationMs: Date.now() - startedAt,
        },
      });
    } catch (error) {
      const errorPayload = buildGraphTesterError(error);
      response.status(errorPayload.status).json({ ok: false, error: errorPayload });
    }
  });

  return router;
}

function assertAuthConfig(config) {
  if (!hasGraphTesterAuthConfig(config)) {
    throw createHttpError(
      500,
      "Graph auth is not configured. Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, the GRAPH_CLIENT_SECRET environment variable, and a valid redirect URI.",
      "GraphAuthConfigMissing"
    );
  }
}

function createHttpError(statusCode, message, code, hint) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.hint = hint;
  return error;
}

function sendTextError(response, error) {
  const errorPayload = buildGraphTesterError(error);
  response
    .status(errorPayload.status)
    .type("text/plain")
    .send(
      `${errorPayload.message}\n\nHint: ${errorPayload.hint || "Check the local tester logs and configuration."}`
    );
}
