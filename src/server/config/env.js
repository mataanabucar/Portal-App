import { parseJsonEnv } from "../utils/parseJsonEnv.js";
import {
  DEFAULT_GRAPH_SCOPES,
  sanitizeGraphScopes,
} from "../services/graph/graphCapabilities.js";

export function buildConfig(overrides = {}) {
  // Master AI provider switch. Toggle parser/summary/ask at once via
  // AI_PROVIDER in .env (openai | teamgpt). Per-feature vars
  // (PARSER_PROVIDER, SUMMARY_PROVIDER, ASK_PROVIDER, BRIEFING_PROVIDER)
  // override it when set. BRIEFING_PROVIDER's default (below) is "teamgpt"
  // regardless of AI_PROVIDER, unlike the others which fall back to it.
  // ASK_PROVIDER additionally supports "orchestrator" (the deterministic
  // intent router and default).
  const defaultAiProvider = normalizeAiProvider(process.env.AI_PROVIDER, "openai");
  // When AI_PROVIDER is not set explicitly, /api/ask defaults to the
  // deterministic orchestrator rather than a single direct provider.
  const askDefault = process.env.AI_PROVIDER ? defaultAiProvider : "orchestrator";
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
    summaryProvider: normalizeAiProvider(process.env.SUMMARY_PROVIDER, defaultAiProvider),
    askProvider: normalizeAskProvider(process.env.ASK_PROVIDER, askDefault),
    parserProvider: normalizeAiProvider(process.env.PARSER_PROVIDER, defaultAiProvider),
    // Unlike the other per-feature providers, the day organizer briefing
    // defaults to TeamGPT regardless of AI_PROVIDER — set BRIEFING_PROVIDER
    // explicitly to override.
    briefingProvider: normalizeAiProvider(process.env.BRIEFING_PROVIDER, "teamgpt"),
    // OpenAI usage policy flags for the orchestrator. Both default off:
    // OpenAI is never the default KB/reasoning engine. See docs/orchestrator.md.
    orchestratorOpenAiFallbackEnabled:
      process.env.ORCHESTRATOR_OPENAI_FALLBACK_ENABLED === "true",
    orchestratorOpenAiClarifyEnabled:
      process.env.ORCHESTRATOR_OPENAI_CLARIFY_ENABLED === "true",
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
    // Optional per-task overrides for the orchestrator's TeamGPT wrappers
    // (src/server/services/teamgpt/tasks.js). Empty = fall back to
    // teamGptEndpointUrl/teamGptModel (summaries) and
    // teamGptParserEndpointUrl/teamGptParserModel (action-item JSON).
    teamGptSummaryEndpointUrl: process.env.TEAMGPT_SUMMARY_ENDPOINT_URL || "",
    teamGptSummaryModel: process.env.TEAMGPT_SUMMARY_MODEL || "",
    teamGptActionEndpointUrl: process.env.TEAMGPT_ACTION_ENDPOINT_URL || "",
    teamGptActionModel: process.env.TEAMGPT_ACTION_MODEL || "",

    // Sourcebot
    sourcebotHost:   process.env.SOURCEBOT_HOST    || "",
    sourcebotApiKey: process.env.SOURCEBOT_API_KEY || "",

    // Knowledge Base
    kbEndpoint:
      process.env.KB_ENDPOINT ||
      "https://tools.benchmarkdigital.com/kb/callKBX.cfm",
    kbAuthToken: process.env.KB_AUTH_TOKEN || "",
    // Marker string present in every KB document the user uploads. The
    // orchestrator's raw-KB fallback search includes it so results scope to
    // the user's own uploads rather than the whole org KB. Empty disables.
    kbUploadMarker: process.env.KB_UPLOAD_MARKER ?? "",
    kbRequestTimeoutMs: Number.parseInt(
      process.env.KB_REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || "20000",
      10
    ),

    // Genny Studio (gstudio agent invoke) — aris_search research source.
    // Reuses teamGptAuthService's cached JWT (same genai-proxy-na host as
    // TEAMGPT_ENDPOINT_URL/KB_AUTH_TOKEN); no separate token minting here.
    gennyStudioBaseUrl:
      process.env.GENNYSTUDIO_BASE_URL ||
      "https://genai-proxy-na.benchmarkdigital.com",
    gennyStudioAgentRef: process.env.GENNYSTUDIO_AGENT_REF || "aris_search",
    gennyStudioRequestTimeoutMs: Number.parseInt(
      process.env.GENNYSTUDIO_REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || "20000",
      10
    ),
    bambooImageCookie: process.env.BAMBOO_IMAGE_COOKIE || "",
    bambooImageReferer:
      process.env.BAMBOO_IMAGE_REFERER || "https://benchmarkgensuite.bamboohr.com/",
    bambooImageUserAgent:
      process.env.BAMBOO_IMAGE_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    bambooImageRequestTimeoutMs: Number.parseInt(
      process.env.BAMBOO_IMAGE_REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || "20000",
      10
    ),

    // Microsoft Graph / Azure AD
    graphTenantId:      process.env.GRAPH_TENANT_ID      || "",
    graphClientId:      process.env.GRAPH_CLIENT_ID      || "",
    graphClientSecret:  process.env.GRAPH_CLIENT_SECRET  || "",
    graphRedirectUri:   process.env.GRAPH_REDIRECT_URI   || "http://localhost:3069/auth/redirect",
    // Requested delegated scopes. Adding a scope (e.g. Mail.Send) requires
    // deleting .local-auth/graph-tester-token.json and logging in again.
    graphScopes:        sanitizeGraphScopes(
      (process.env.GRAPH_SCOPES || DEFAULT_GRAPH_SCOPES).split(/\s+/).filter(Boolean)
    ),
    // Outbound email is an outward-facing action: off unless explicitly enabled,
    // and still requires Mail.Send + Mail.ReadWrite in GRAPH_SCOPES and the token.
    graphMailSendEnabled: process.env.GRAPH_MAIL_SEND_ENABLED === "true",
    graphTokenCacheFile: process.env.GRAPH_TOKEN_CACHE_FILE || ".local-auth/graph-tester-token.json",
    teamGptTokenCacheFile: process.env.TEAMGPT_TOKEN_CACHE_FILE || ".local-auth/teamgpt-token.json",

    // Assistant chat engine. "orchestrator" (default) uses the deterministic
    // router over GennyStudio, TeamGPT, Sourcebot, Graph, and research. "cloud"
    // enables the optional OpenAI-compatible Graph tool-calling chat loop.
    assistantModelMode: normalizeAssistantModelMode(
      process.env.ASSISTANT_MODEL_MODE,
      "orchestrator"
    ),
    assistantMaxToolRounds: Number.parseInt(process.env.ASSISTANT_MAX_TOOL_ROUNDS || "4", 10),
    cloudLlmProvider: process.env.CLOUD_LLM_PROVIDER || "openai",
    cloudLlmApiKey: process.env.CLOUD_LLM_API_KEY || "",
    cloudLlmModel: process.env.CLOUD_LLM_MODEL || ""
  };

  return { ...baseConfig, ...overrides };
}

function normalizeAiProvider(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "openai" || normalized === "teamgpt"
    ? normalized
    : fallback;
}

function normalizeAskProvider(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "orchestrator") {
    return normalized;
  }
  return normalizeAiProvider(normalized, fallback);
}

function normalizeOnOffOption(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "on" || normalized === "off" ? normalized : fallback;
}

function normalizeAssistantModelMode(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "cloud" || normalized === "orchestrator" ? normalized : fallback;
}
