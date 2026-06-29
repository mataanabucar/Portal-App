import { parseJsonEnv } from "../utils/parseJsonEnv.js";

export function buildConfig(overrides = {}) {
  // Master AI provider switch. Toggle every feature (parser, summary, ask) at
  // once via AI_PROVIDER in .env (openai | teamgpt). Per-feature vars
  // (PARSER_PROVIDER, SUMMARY_PROVIDER, ASK_PROVIDER) override it when set.
  const defaultAiProvider = normalizeAiProvider(process.env.AI_PROVIDER, "openai");
  const openAiModel = process.env.OPENAI_MODEL || "merlin";
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
    openAiModel,
    openAiAllowTestchat: process.env.OPENAI_ALLOW_TESTCHAT !== "false",
    openAiRealtimeEnabled: process.env.OPENAI_REALTIME_ENABLED === "true",
    openAiRealtimeModel: process.env.OPENAI_REALTIME_MODEL || openAiModel,
    openAiRealtimeVoice: process.env.OPENAI_REALTIME_VOICE || "marin",
    openAiRealtimeReasoningEffort:
      process.env.OPENAI_REALTIME_REASONING_EFFORT || "medium",
    openAiRealtimeMaxOutputTokens: Number.parseInt(
      process.env.OPENAI_REALTIME_MAX_OUTPUT_TOKENS || "900",
      10
    ),
    // Pin transcription language (ISO-639-1) to stop the transcriber from
    // hallucinating foreign-language phrases on silence/noise. "auto" = detect.
    openAiRealtimeTranscribeLanguage:
      process.env.OPENAI_REALTIME_TRANSCRIBE_LANGUAGE || "en",
    // Input noise reduction: near_field (headset/close mic), far_field, or off.
    openAiRealtimeNoiseReduction:
      process.env.OPENAI_REALTIME_NOISE_REDUCTION || "near_field",
    summaryProvider: normalizeAiProvider(process.env.SUMMARY_PROVIDER, defaultAiProvider),
    askProvider: normalizeAiProvider(process.env.ASK_PROVIDER, defaultAiProvider),
    parserProvider: normalizeAiProvider(process.env.PARSER_PROVIDER, defaultAiProvider),
    teamGptPageUrl:
      process.env.TEAMGPT_PAGE_URL ||
      "https://tools.benchmarkdigital.com/gsportal/genai/index.cfm",
    teamGptEndpointUrl:
      process.env.TEAMGPT_ENDPOINT_URL ||
      "https://genai-proxy-na.benchmarkdigital.com/bedrock/converse/chat/teamgpt-ask-anything-bedrock?stream=true",
    teamGptAppId: process.env.TEAMGPT_APP_ID || "9225",
    teamGptEnvironment: process.env.TEAMGPT_ENVIRONMENT || "prod",
    teamGptModel:
      process.env.TEAMGPT_MODEL || "anthropic.claude-sonnet-4-5-20250929-v1:0",
    teamGptLargeContextModel: normalizeOnOffOption(
      process.env.TEAMGPT_LARGE_CONTEXT_MODEL,
      "on"
    ),
    teamGptExtendedThinking: normalizeOnOffOption(
      process.env.TEAMGPT_EXTENDED_THINKING,
      "on"
    ),
    teamGptParserModel:
      process.env.TEAMGPT_PARSER_MODEL ||
      "anthropic.claude-sonnet-4-5-20250929-v1:0",
    teamGptParserEndpointUrl:
      process.env.TEAMGPT_PARSER_ENDPOINT_URL ||
      "https://genai-proxy-na.benchmarkdigital.com/bedrock/converse/chat/teamgpt-ask-anything-bedrock?stream=false",

    // Sourcebot
    sourcebotHost:   process.env.SOURCEBOT_HOST    || "",
    sourcebotApiKey: process.env.SOURCEBOT_API_KEY || "",

    // Knowledge Base
    kbEndpoint:
      process.env.KB_ENDPOINT ||
      "https://tools.benchmarkdigital.com/kb/callKBX.cfm",
    kbAuthToken: process.env.KB_AUTH_TOKEN || "",
    kbRequestTimeoutMs: Number.parseInt(
      process.env.KB_REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || "20000",
      10
    ),

    // Microsoft Graph / Azure AD
    graphTenantId:      process.env.GRAPH_TENANT_ID      || "",
    graphClientId:      process.env.GRAPH_CLIENT_ID      || "",
    graphClientSecret:  process.env.GRAPH_CLIENT_SECRET  || "",
    //graphRedirectUri:   process.env.GRAPH_REDIRECT_URI   || "http://localhost:3069/auth/redirect",
    graphRedirectUri:   "https://login.microsoftonline.com/common/oauth2/nativeclient",
    graphScopes:        (process.env.GRAPH_SCOPES || "User.Read Mail.Read Calendars.Read offline_access").split(" ").filter(Boolean),
    // Outbound email is an outward-facing action: off unless explicitly enabled,
    // and still requires Mail.Send + Mail.ReadWrite in GRAPH_SCOPES and the token.
    graphMailSendEnabled: process.env.GRAPH_MAIL_SEND_ENABLED === "true",
    graphTokenCacheFile: process.env.GRAPH_TOKEN_CACHE_FILE || ".local-auth/graph-tester-token.json",
    teamGptTokenCacheFile: process.env.TEAMGPT_TOKEN_CACHE_FILE || ".local-auth/teamgpt-token.json"
  };

  return { ...baseConfig, ...overrides };
}

function normalizeAiProvider(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "openai" || normalized === "teamgpt"
    ? normalized
    : fallback;
}

function normalizeOnOffOption(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "on" || normalized === "off" ? normalized : fallback;
}
