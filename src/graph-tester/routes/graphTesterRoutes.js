import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import {
  getClientCatalog,
  getCatalogEntry,
  getFlatCatalog,
  isCatalogEntryEnabled,
  getCatalogEntryMissingScopes,
} from "../catalog/graphTesterCatalog.js";
import {
  buildCapabilityReport,
  parseDecodedTokenFile,
} from "../../server/services/graph/graphCapabilities.js";
import { hasGraphTesterAuthConfig } from "../utils/graphSession.js";
import { parseCatalogArgs } from "../utils/fieldParsers.js";
import { buildGraphTesterError, buildResultSummary, countResultItems } from "../utils/resultFormatting.js";

export function createGraphTesterRouter({ config, authStore }) {
  const router = Router();

  // Delegated scopes from the current runtime token. Only tokens issued to
  // this app's client id gate features — never Graph Explorer / Outlook Web.
  async function getSessionScopes() {
    const session = await authStore.buildStatusPayload();
    const grantedScopes =
      session.authenticated && session.tokenType === "delegated"
        ? session.grantedScopes || []
        : [];
    return { session, grantedScopes };
  }

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

  // Catalog is gated by the signed-in token's delegated scopes. By default
  // only enabled functions are returned; ?includeUnavailable=true adds the
  // disabled ones with enabled: false and their missingScopes.
  router.get("/api/graph-tester/catalog", async (request, response) => {
    const includeUnavailable = request.query.includeUnavailable === "true";
    const { session, grantedScopes } = await getSessionScopes();

    const services = session.authenticated
      ? getClientCatalog(grantedScopes, { includeUnavailable })
      : includeUnavailable
        ? getClientCatalog([], { includeUnavailable: true })
        : [];

    response.json({
      ok: true,
      authenticated: session.authenticated === true,
      includeUnavailable,
      services,
      hint: session.authenticated
        ? undefined
        : "Login is required. Unauthenticated catalogs list functions as disabled metadata only.",
      generatedAt: new Date().toISOString(),
    });
  });

  // Capability report: token identity vs the app registration, granted
  // delegated scopes, and which catalog functions they enable.
  router.get("/api/graph-tester/capabilities", async (request, response) => {
    const { session, grantedScopes } = await getSessionScopes();
    const manifest = await readContextManifest();
    const decodedTokenClaims = await readContextDecodedTokenClaims();

    const currentTokenClaims = session.authenticated
      ? {
          scp:
            session.tokenType === "delegated" ? grantedScopes.join(" ") : undefined,
          roles: session.grantedRoles?.length ? session.grantedRoles : undefined,
          appid: session.claims?.appId || null,
          app_displayname: session.claims?.appDisplayName || null,
          tid: session.claims?.tid || null,
          upn: session.claims?.preferredUsername || null,
          name: session.claims?.name || null,
          exp: session.expiresAt
            ? Math.floor(Date.parse(session.expiresAt) / 1000)
            : null,
        }
      : null;

    const report = buildCapabilityReport({
      manifest,
      decodedTokenClaims,
      currentTokenClaims,
      catalog: getFlatCatalog(),
    });

    response.json({
      ok: true,
      authenticated: session.authenticated === true,
      tokenType: session.tokenType || null,
      configClientId: config.graphClientId || null,
      requestedScopes: config.graphScopes,
      ...report,
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

    if (!entry || entry.hidden) {
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

    // Server-side scope gate — never rely on the UI hiding a function. This
    // rejects before any Graph call is attempted.
    const { session, grantedScopes } = await getSessionScopes();

    if (!session.authenticated) {
      const errorPayload = buildGraphTesterError(
        createHttpError(
          401,
          "No signed-in Graph session. Login is required before running functions.",
          "GraphAuthRequired",
          "Use the Login button (or /auth/login) to sign in with the portal app registration."
        )
      );
      response.status(errorPayload.status).json({ ok: false, error: errorPayload });
      return;
    }

    if (!isCatalogEntryEnabled(entry, grantedScopes)) {
      const missingScopes = getCatalogEntryMissingScopes(entry, grantedScopes);
      const errorPayload = buildGraphTesterError(
        createHttpError(
          403,
          `The signed-in token does not grant the scopes required for ${service}.${functionName}. ` +
            `Missing: ${missingScopes.join(", ") || "unknown"}.`,
          "GraphFunctionScopeMissing",
          "Add the scope to GRAPH_SCOPES, delete the cached token file, and log in again."
        )
      );
      response
        .status(errorPayload.status)
        .json({ ok: false, error: { ...errorPayload, missingScopes } });
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

const CONTEXT_DIR = path.resolve(process.cwd(), "filesforcontext");

// App-registration manifest from filesforcontext/ — the file that carries
// appId + displayName. Diagnostics only; runtime identity is GRAPH_CLIENT_ID.
async function readContextManifest() {
  try {
    const fileNames = await fs.readdir(CONTEXT_DIR);
    for (const fileName of fileNames) {
      if (!fileName.endsWith(".json") || fileName.includes("generated")) continue;
      try {
        const parsed = JSON.parse(
          await fs.readFile(path.join(CONTEXT_DIR, fileName), "utf-8")
        );
        if (parsed && typeof parsed.appId === "string" && parsed.displayName) {
          return parsed;
        }
      } catch {
        // Not clean JSON (e.g. decodedToken.json) — skip.
      }
    }
  } catch {
    // filesforcontext/ is optional at runtime.
  }
  return null;
}

// decodedToken.json is a decoded JWT text file ({header}.{payload}.[Signature]),
// not valid JSON — parse defensively. Diagnostics only.
async function readContextDecodedTokenClaims() {
  try {
    const rawText = await fs.readFile(
      path.join(CONTEXT_DIR, "decodedToken.json"),
      "utf-8"
    );
    return parseDecodedTokenFile(rawText).claims;
  } catch {
    return null;
  }
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
