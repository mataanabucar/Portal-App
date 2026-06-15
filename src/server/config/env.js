import { parseJsonEnv } from "../utils/parseJsonEnv.js";

export function buildConfig(overrides = {}) {
  const baseConfig = {
    host: process.env.SERVER_HOST || "127.0.0.1",
    port: Number.parseInt(process.env.PORT || "3000", 10),
    requestTimeoutMs: Number.parseInt(
      process.env.REQUEST_TIMEOUT_MS || "20000",
      10
    ),
    portalSourceMode: process.env.PORTAL_SOURCE_MODE || "mock",
    portalTargetUrl: process.env.PORTAL_TARGET_URL || "",
    portalMethod: (process.env.PORTAL_METHOD || "GET").toUpperCase(),
    portalHeaders: parseJsonEnv(
      process.env.PORTAL_HEADERS_JSON,
      "PORTAL_HEADERS_JSON",
      {}
    ),
    dashboardCacheFile:
      process.env.DASHBOARD_CACHE_FILE || ".local-state/dashboard-cache.json",
    portalCookie: process.env.PORTAL_COOKIE || "",
    portalCookieCacheFile:
      process.env.PORTAL_COOKIE_CACHE_FILE || ".local-auth/portal-cookie-cache.json",
    portalBody: parseJsonEnv(process.env.PORTAL_BODY_JSON, "PORTAL_BODY_JSON", {}),
    portalDataPath: process.env.PORTAL_DATA_PATH || "",
    portalContentSelector: process.env.PORTAL_CONTENT_SELECTOR || "body",
    portalFrameSelector: process.env.PORTAL_FRAME_SELECTOR || "",
    portalItemSelector: process.env.PORTAL_ITEM_SELECTOR || "",
    portalLinkSelector: process.env.PORTAL_LINK_SELECTOR || "",
    portalTitleSelector: process.env.PORTAL_TITLE_SELECTOR || "",
    portalDetailSelector: process.env.PORTAL_DETAIL_SELECTOR || "",
    portalStatusSelector: process.env.PORTAL_STATUS_SELECTOR || "",
    portalOwnerSelector: process.env.PORTAL_OWNER_SELECTOR || "",
    portalPrioritySelector: process.env.PORTAL_PRIORITY_SELECTOR || "",
    portalDateSelector: process.env.PORTAL_DATE_SELECTOR || "",
    portalMaxItems: Number.parseInt(process.env.PORTAL_MAX_ITEMS || "25", 10),
    portalFollowDetailLinks: process.env.PORTAL_FOLLOW_DETAIL_LINKS === "true",
    portalMaxDetailPages: Number.parseInt(
      process.env.PORTAL_MAX_DETAIL_PAGES || "10",
      10
    ),
    portalDetailContentSelector:
      process.env.PORTAL_DETAIL_CONTENT_SELECTOR || "body",
    portalDetailTitleSelector: process.env.PORTAL_DETAIL_TITLE_SELECTOR || "",
    portalDetailMaxChars: Number.parseInt(
      process.env.PORTAL_DETAIL_MAX_CHARS || "4000",
      10
    ),
    playwrightExecutablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || "",
    playwrightUserDataDir:
      process.env.PLAYWRIGHT_USER_DATA_DIR || ".local-browser/portal-profile",
    playwrightConnectToExisting:
      process.env.PLAYWRIGHT_CONNECT_TO_EXISTING === "true",
    playwrightCdpEndpoint: process.env.PLAYWRIGHT_CDP_ENDPOINT || "",
    playwrightDevToolsActivePortFile:
      process.env.PLAYWRIGHT_DEVTOOLS_ACTIVE_PORT_FILE || "",
    playwrightHeadless: process.env.PLAYWRIGHT_HEADLESS === "true",
    playwrightNavigationTimeoutMs: Number.parseInt(
      process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS || "30000",
      10
    ),
    openAiEnabled: process.env.OPENAI_ENABLED === "true",
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    openAiModel: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    openAiAllowTestchat: process.env.OPENAI_ALLOW_TESTCHAT !== "false",

    // Sourcebot
    sourcebotHost:   process.env.SOURCEBOT_HOST    || "",
    sourcebotApiKey: process.env.SOURCEBOT_API_KEY || "",

    // Microsoft Graph / Azure AD
    graphTenantId:      process.env.GRAPH_TENANT_ID      || "",
    graphClientId:      process.env.GRAPH_CLIENT_ID      || "",
    graphClientSecret:  process.env.GRAPH_CLIENT_SECRET  || "",
    graphRedirectUri:   process.env.GRAPH_REDIRECT_URI   || "http://localhost:3069/auth/redirect",
    graphScopes:        (process.env.GRAPH_SCOPES || "User.Read Mail.Read Calendars.Read offline_access").split(" ").filter(Boolean),
    graphTokenCacheFile: process.env.GRAPH_TOKEN_CACHE_FILE || ".local-auth/graph-tester-token.json"
  };

  return { ...baseConfig, ...overrides };
}
