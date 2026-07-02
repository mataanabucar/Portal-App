import path from "node:path";
import {
  DEFAULT_GRAPH_SCOPES,
  sanitizeGraphScopes,
} from "../server/services/graph/graphCapabilities.js";

export function buildGraphTesterConfig(overrides = {}) {
  const baseConfig = {
    host: process.env.GRAPH_TESTER_HOST || "127.0.0.1",
    port: parsePort(process.env.GRAPH_TESTER_PORT, 3069),
    autoLoginOnStartup:
      process.env.GRAPH_TESTER_AUTO_LOGIN_ON_STARTUP !== "false",
    tokenCacheFile: process.env.GRAPH_TESTER_TOKEN_CACHE_FILE ||
      ".local-auth/graph-tester-token.json",
    graphTenantId: process.env.GRAPH_TENANT_ID || "",
    graphClientId: process.env.GRAPH_CLIENT_ID || "",
    graphClientSecret: process.env.GRAPH_CLIENT_SECRET || "",
    // Adding a scope (e.g. Mail.Send) requires deleting the token cache file
    // and logging in again so the cached token carries the new scope.
    graphScopes: sanitizeGraphScopes(
      (process.env.GRAPH_SCOPES || DEFAULT_GRAPH_SCOPES).split(/\s+/).filter(Boolean)
    ),
    graphRedirectUri: process.env.GRAPH_TESTER_REDIRECT_URI || "",
  };
  const mergedConfig = { ...baseConfig, ...overrides };
  const browserHost = normalizeBrowserHost(mergedConfig.host);
  const resolvedTokenCacheFile = path.resolve(
    process.cwd(),
    mergedConfig.tokenCacheFile
  );

  return {
    ...mergedConfig,
    browserHost,
    tokenCacheFile: resolvedTokenCacheFile,
    origin: mergedConfig.origin || `http://${browserHost}:${mergedConfig.port}`,
    graphRedirectUri:
      mergedConfig.graphRedirectUri ||
      `http://localhost:${mergedConfig.port}/auth/redirect`,
  };
}

function parsePort(value, fallbackPort) {
  const parsedValue = Number.parseInt(value || "", 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackPort;
}

function normalizeBrowserHost(host) {
  return host === "0.0.0.0" || host === "::" || host === "[::]"
    ? "127.0.0.1"
    : host;
}
