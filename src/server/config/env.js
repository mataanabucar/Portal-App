import { parseJsonEnv } from "../utils/parseJsonEnv.js";
import {
  DEFAULT_GRAPH_SCOPES,
  sanitizeGraphScopes,
} from "../services/graph/graphCapabilities.js";

export function buildConfig(overrides = {}) {
  // Master AI provider switch. Toggle parser/summary/ask at once via
  // AI_PROVIDER in .env (openai | teamgpt). Per-feature vars
  // (PARSER_PROVIDER, SUMMARY_PROVIDER, ASK_PROVIDER) override it when set.
  // ASK_PROVIDER additionally supports "orchestrator" (deterministic intent
  // router — the default) and "local" (legacy Ollama, requires
  // LEGACY_LOCAL_RAG_ENABLED=true).
  const defaultAiProvider = normalizeAiProvider(process.env.AI_PROVIDER, "openai");
  // When AI_PROVIDER is not set explicitly, /api/ask defaults to the
  // deterministic orchestrator rather than a single direct provider.
  const askDefault = process.env.AI_PROVIDER ? defaultAiProvider : "orchestrator";
  // Local Ollama chat + local embedding RAG are archived. They stay in the
  // repo behind this flag; without it, "local" modes are coerced away below.
  const legacyLocalRagEnabled = process.env.LEGACY_LOCAL_RAG_ENABLED === "true";
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
    askProvider: normalizeAskProvider(process.env.ASK_PROVIDER, askDefault),
    parserProvider: normalizeAiProvider(process.env.PARSER_PROVIDER, defaultAiProvider),
    legacyLocalRagEnabled,
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
    kbUploadMarker: process.env.KB_UPLOAD_MARKER ?? "mjabmllm",
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

    // Assistant chat engine. "orchestrator" (default) = deterministic intent
    // router over GennyStudio/TeamGPT/Sourcebot/Graph/research — no reasoning
    // model needed. "cloud"/"local" = the legacy tool-calling loop
    // (modelProvider.js); "local" additionally requires
    // LEGACY_LOCAL_RAG_ENABLED=true.
    assistantModelMode: normalizeAssistantModelMode(
      process.env.ASSISTANT_MODEL_MODE,
      "orchestrator"
    ),
    assistantMaxToolRounds: Number.parseInt(process.env.ASSISTANT_MAX_TOOL_ROUNDS || "4", 10),
    localLlmBaseUrl: process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1",
    // Empirically verified against this Ollama install (see CodeLogs): both
    // qwen2.5-coder:7b (writes a tool-call-shaped JSON blob as plain content
    // instead of populating tool_calls) and devstral-small-2:latest (24B —
    // correct format, but too slow for a multi-round loop; >5 min with no
    // response) were unreliable despite being tagged "tools"-capable by
    // Ollama. llama3.2:3b reliably emits real tool_calls and responds fast.
    localLlmModel: process.env.LOCAL_LLM_MODEL || "llama3.2:3b",
    localLlmApiKey: process.env.LOCAL_LLM_API_KEY || "ollama",
    cloudLlmProvider: process.env.CLOUD_LLM_PROVIDER || "openai",
    cloudLlmApiKey: process.env.CLOUD_LLM_API_KEY || "",
    cloudLlmModel: process.env.CLOUD_LLM_MODEL || "",

    // Assistant embeddings (docs + code vector search). "disabled" (default)
    // skips building docsKb/codeKb entirely — the orchestrator answers KB
    // questions via GennyStudio instead. "local" requires
    // LEGACY_LOCAL_RAG_ENABLED=true.
    assistantEmbeddingMode: normalizeEmbeddingMode(
      process.env.ASSISTANT_EMBEDDING_MODE,
      "disabled"
    ),
    localEmbeddingBaseUrl: process.env.LOCAL_EMBEDDING_BASE_URL || "http://localhost:11434/v1",
    localEmbeddingModel: process.env.LOCAL_EMBEDDING_MODEL || "nomic-embed-text",
    localEmbeddingApiKey: process.env.LOCAL_EMBEDDING_API_KEY || "ollama",
    cloudEmbeddingProvider: process.env.CLOUD_EMBEDDING_PROVIDER || "openai",
    cloudEmbeddingApiKey: process.env.CLOUD_EMBEDDING_API_KEY || "",
    cloudEmbeddingModel: process.env.CLOUD_EMBEDDING_MODEL || "text-embedding-3-small",

    // Optional override for where docsKb reads project documents from.
    // Empty string keeps the existing default (repo's docs/ folder).
    // Accepts an absolute path or one relative to the repo root.
    docsKbPath: process.env.DOCS_KB_PATH || ""
  };

  // Env-derived "local" modes are legacy-only. Coerce them away unless the
  // legacy flag is set. Programmatic overrides (spread below) are exempt so
  // tests can still force any mode.
  if (!legacyLocalRagEnabled) {
    if (baseConfig.assistantModelMode === "local") {
      console.warn(
        "[config] ASSISTANT_MODEL_MODE=local is archived; using \"orchestrator\". Set LEGACY_LOCAL_RAG_ENABLED=true to re-enable."
      );
      baseConfig.assistantModelMode = "orchestrator";
    }
    if (baseConfig.assistantEmbeddingMode === "local") {
      console.warn(
        "[config] ASSISTANT_EMBEDDING_MODE=local is archived; using \"disabled\". Set LEGACY_LOCAL_RAG_ENABLED=true to re-enable."
      );
      baseConfig.assistantEmbeddingMode = "disabled";
    }
    if (baseConfig.askProvider === "local") {
      console.warn(
        "[config] ASK_PROVIDER=local is archived; using \"orchestrator\". Set LEGACY_LOCAL_RAG_ENABLED=true to re-enable."
      );
      baseConfig.askProvider = "orchestrator";
    }
  }

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
  if (normalized === "local" || normalized === "orchestrator") {
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
  return normalized === "local" || normalized === "cloud" || normalized === "orchestrator"
    ? normalized
    : fallback;
}

function normalizeEmbeddingMode(value, fallback) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "local" || normalized === "cloud" || normalized === "disabled"
    ? normalized
    : fallback;
}
