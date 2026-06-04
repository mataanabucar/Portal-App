import path from "node:path";

const DEFAULT_GRAPH_SCOPES =
  "User.Read Mail.Read Calendars.Read Chat.Read People.Read MailboxSettings.ReadWrite offline_access";

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
    graphScopes: (process.env.GRAPH_SCOPES || DEFAULT_GRAPH_SCOPES)
      .split(" ")
      .filter(Boolean),
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
