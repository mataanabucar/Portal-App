const elements = {
  clearResults: document.querySelector("#clear-results"),
  dashboardOutput: document.querySelector("#dashboard-output"),
  dashboardState: document.querySelector("#dashboard-state"),
  askOutput: document.querySelector("#ask-output"),
  askPrompt: document.querySelector("#ask-prompt"),
  askState: document.querySelector("#ask-state"),
  focus: document.querySelector("#focus-text"),
  healthOutput: document.querySelector("#health-output"),
  includeSummary: document.querySelector("#include-summary"),
  lastCurlOutput: document.querySelector("#last-curl-output"),
  lastRequestOutput: document.querySelector("#last-request-output"),
  parseOutput: document.querySelector("#parse-output"),
  parseState: document.querySelector("#parse-state"),
  parserFocus: document.querySelector("#parser-focus-text"),
  parserTestchat: document.querySelector("#parser-testchat"),
  previewOutput: document.querySelector("#preview-output"),
  previewState: document.querySelector("#preview-state"),
  runAsk: document.querySelector("#run-ask"),
  runCacheRead: document.querySelector("#run-cache-read"),
  runCacheWrite: document.querySelector("#run-cache-write"),
  runDashboard: document.querySelector("#run-dashboard"),
  runHealth: document.querySelector("#run-health"),
  runParse: document.querySelector("#run-parse"),
  runPreview: document.querySelector("#run-preview"),
  requestModel: document.querySelector("#request-model"),
  statusPill: document.querySelector("#tester-status-pill"),
  statusText: document.querySelector("#tester-status-text"),
  telemetryAi: document.querySelector("#telemetry-ai"),
  telemetryBrowser: document.querySelector("#telemetry-browser"),
  telemetryCache: document.querySelector("#telemetry-cache"),
  telemetryDetailLinks: document.querySelector("#telemetry-detail-links"),
  telemetrySource: document.querySelector("#telemetry-source"),
  telemetryTarget: document.querySelector("#telemetry-target"),
  boardMeta: document.querySelector("#tester-board-meta"),
  cacheReadOutput: document.querySelector("#cache-read-output"),
  cacheWriteOutput: document.querySelector("#cache-write-output")
};

const configFields = {
  portalSourceMode: document.querySelector("#portal-source-mode"),
  portalMethod: document.querySelector("#portal-method"),
  portalTargetUrl: document.querySelector("#portal-target-url"),
  requestTimeoutMs: document.querySelector("#request-timeout-ms"),
  portalMaxItems: document.querySelector("#portal-max-items"),
  portalDataPath: document.querySelector("#portal-data-path"),
  portalHeaders: document.querySelector("#portal-headers-json"),
  portalBody: document.querySelector("#portal-body-json"),
  portalCookie: document.querySelector("#portal-cookie"),
  portalContentSelector: document.querySelector("#portal-content-selector"),
  portalFrameSelector: document.querySelector("#portal-frame-selector"),
  portalItemSelector: document.querySelector("#portal-item-selector"),
  portalLinkSelector: document.querySelector("#portal-link-selector"),
  portalTitleSelector: document.querySelector("#portal-title-selector"),
  portalDetailSelector: document.querySelector("#portal-detail-selector"),
  portalStatusSelector: document.querySelector("#portal-status-selector"),
  portalOwnerSelector: document.querySelector("#portal-owner-selector"),
  portalPrioritySelector: document.querySelector("#portal-priority-selector"),
  portalDateSelector: document.querySelector("#portal-date-selector"),
  portalFollowDetailLinks: document.querySelector("#portal-follow-detail-links"),
  portalMaxDetailPages: document.querySelector("#portal-max-detail-pages"),
  portalDetailContentSelector: document.querySelector(
    "#portal-detail-content-selector"
  ),
  portalDetailTitleSelector: document.querySelector("#portal-detail-title-selector"),
  portalDetailMaxChars: document.querySelector("#portal-detail-max-chars"),
  playwrightExecutablePath: document.querySelector("#playwright-executable-path"),
  playwrightUserDataDir: document.querySelector("#playwright-user-data-dir"),
  playwrightConnectToExisting: document.querySelector(
    "#playwright-connect-to-existing"
  ),
  playwrightHeadless: document.querySelector("#playwright-headless"),
  playwrightCdpEndpoint: document.querySelector("#playwright-cdp-endpoint"),
  playwrightDevToolsActivePortFile: document.querySelector(
    "#playwright-devtools-active-port-file"
  ),
  playwrightNavigationTimeoutMs: document.querySelector(
    "#playwright-navigation-timeout-ms"
  ),
  openAiEnabled: document.querySelector("#openai-enabled"),
  openAiAllowTestchat: document.querySelector("#openai-allow-testchat"),
  openAiModel: document.querySelector("#openai-model"),
  openAiApiKey: document.querySelector("#openai-api-key"),
  dashboardCacheFile: document.querySelector("#dashboard-cache-file"),
  portalCookieCacheFile: document.querySelector("#portal-cookie-cache-file")
};

const routeStates = {
  ask: elements.askState,
  dashboard: elements.dashboardState,
  preview: elements.previewState,
  parse: elements.parseState
};

const routeButtons = {
  ask: elements.runAsk,
  health: elements.runHealth,
  dashboard: elements.runDashboard,
  preview: elements.runPreview,
  parse: elements.runParse,
  cacheRead: elements.runCacheRead,
  cacheWrite: elements.runCacheWrite
};

const state = {
  activeRoute: "",
  lastAsk: null,
  lastDashboard: null,
  lastHealth: null,
  lastParse: null,
  lastPreview: null
};

function format(value) {
  return JSON.stringify(value, null, 2);
}

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
  } catch (error) {
    throw new Error(buildNetworkFailureMessage(url, error));
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

function buildNetworkFailureMessage(url, error) {
  const currentOrigin =
    window.location.protocol === "file:"
      ? window.location.href
      : window.location.origin;

  return [
    `Could not reach ${url}.`,
    `Current page origin: ${currentOrigin}.`,
    "Open the tester from the local app server and keep the backend running."
  ].join(" ");
}

function buildTesterConfig() {
  const testerConfig = {};

  for (const [fieldName, element] of Object.entries(configFields)) {
    if (!element) {
      continue;
    }

    const tagName = element.tagName.toLowerCase();
    const rawValue = tagName === "textarea" || tagName === "input" || tagName === "select"
      ? element.value
      : "";

    if (tagName === "select") {
      if (rawValue && rawValue !== "inherit") {
        testerConfig[fieldName] = rawValue;
      }
      continue;
    }

    if (typeof rawValue === "string" && rawValue.trim()) {
      testerConfig[fieldName] = rawValue.trim();
    }
  }

  return testerConfig;
}

function buildRequestControls() {
  return {
    includeSummary: elements.includeSummary.checked,
    askPrompt: elements.askPrompt.value.trim(),
    parserTestchat: elements.parserTestchat.checked,
    focus: elements.focus.value.trim(),
    parserFocus: elements.parserFocus.value.trim(),
    requestModel: elements.requestModel.value.trim()
  };
}

function updateTelemetry() {
  const testerConfig = buildTesterConfig();
  const overrideKeys = Object.keys(testerConfig);
  const requestControls = buildRequestControls();
  const sourceMode = testerConfig.portalSourceMode || "Inherit";
  const targetText = testerConfig.portalTargetUrl
    ? clipText(testerConfig.portalTargetUrl, 68)
    : "Target inherited from the running server.";
  const detailLinks = resolveTriStateLabel(testerConfig.portalFollowDetailLinks);
  const browserSummary = testerConfig.playwrightConnectToExisting
    ? "Connect-to-existing browser override active."
    : testerConfig.playwrightExecutablePath || testerConfig.playwrightUserDataDir
      ? "Browser executable/profile override active."
      : "Browser settings inherit unless overridden.";
  const aiSummary = [
    resolveTriStateLabel(testerConfig.openAiEnabled),
    testerConfig.openAiModel || "Model inherits",
    requestControls.parserTestchat ? "test chat on" : "test chat off"
  ].join(" | ");
  const cacheSummary = testerConfig.dashboardCacheFile
    ? `Dashboard cache: ${clipText(testerConfig.dashboardCacheFile, 44)}`
    : "Cache file inherited from the running server.";
  const askSummary = requestControls.askPrompt
    ? `Ask prompt: ${clipText(requestControls.askPrompt, 44)}`
    : "Ask prompt ready.";

  elements.telemetrySource.textContent = sourceMode;
  elements.telemetryTarget.textContent = targetText;
  elements.telemetryDetailLinks.textContent = detailLinks;
  elements.telemetryBrowser.textContent = browserSummary;
  elements.telemetryAi.textContent = aiSummary;
  elements.telemetryCache.textContent = cacheSummary;
  elements.boardMeta.textContent = `${overrideKeys.length} override${
    overrideKeys.length === 1 ? "" : "s"
  } active | Summary ${requestControls.includeSummary ? "on" : "off"} | Request model ${
    requestControls.requestModel || "inherit"
  } | ${askSummary}`;
}

function resolveTriStateLabel(value) {
  if (value === "true" || value === true) {
    return "True";
  }

  if (value === "false" || value === false) {
    return "False";
  }

  return "Inherit";
}

function clipText(value, maxLength) {
  const normalizedValue = String(value || "").trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 3).trim()}...`;
}

function setStatus(message, stateName = "ready") {
  elements.statusText.textContent = message;
  elements.statusPill.textContent =
    stateName === "running"
      ? "Running"
      : stateName === "error"
        ? "Error"
        : "Ready";
  elements.statusPill.dataset.state =
    stateName === "running" ? "loading" : stateName === "error" ? "error" : "ready";
}

function setRouteState(routeName, stateName) {
  const stateElement = routeStates[routeName];

  if (!stateElement) {
    return;
  }

  stateElement.textContent =
    stateName === "running"
      ? "Running"
      : stateName === "success"
        ? "Success"
        : stateName === "error"
          ? "Error"
          : "Idle";
  stateElement.dataset.state = stateName;
}

function setRouteLoading(routeName, isLoading) {
  const button = routeButtons[routeName];

  if (!button) {
    return;
  }

  button.disabled = isLoading;

  if (!isLoading) {
    return;
  }

  if (routeName === "health") {
    button.textContent = "GET /api/health...";
    return;
  }

  if (routeName === "cacheRead") {
    button.textContent = "Run cache read...";
    return;
  }

  if (routeName === "cacheWrite") {
    button.textContent = "Run cache write...";
    return;
  }

  if (routeName === "ask") {
    button.textContent = "Run ask...";
    return;
  }

  button.textContent = routeName === "dashboard"
    ? "Run dashboard..."
    : routeName === "preview"
      ? "Run preview..."
      : "Run parse...";
}

function resetRouteButtonLabels() {
  elements.runAsk.textContent = "Run ask";
  elements.runHealth.textContent = "GET /api/health";
  elements.runDashboard.textContent = "Run dashboard";
  elements.runPreview.textContent = "Run preview";
  elements.runParse.textContent = "Run parse";
  elements.runCacheRead.textContent = "Run cache read";
  elements.runCacheWrite.textContent = "Run cache write";
}

function recordLastRequest({ method, url, body }) {
  const sanitizedBody = sanitizeForDisplay(body || null);
  const requestRecord = {
    method,
    url,
    body: sanitizedBody,
    sentAt: new Date().toISOString()
  };

  elements.lastRequestOutput.textContent = format(requestRecord);
  elements.lastCurlOutput.textContent = buildCurlCommand({
    method,
    url,
    body: sanitizedBody
  });
}

function buildCurlCommand({ method, url, body }) {
  if (method === "GET") {
    return `curl -sS "${url}"`;
  }

  const rawBody = JSON.stringify(body || {}, null, 2);
  const escapedBody = rawBody.replaceAll("'", "'\"'\"'");

  return [
    `curl -sS -X ${method} "${url}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  --data-raw '${escapedBody}'`
  ].join("\n");
}

async function runRoute(routeName, action) {
  state.activeRoute = routeName;
  setStatus(`Running ${routeName}...`, "running");
  setRouteLoading(routeName, true);

  if (routeStates[routeName]) {
    setRouteState(routeName, "running");
  }

  try {
    await action();

    if (routeStates[routeName]) {
      setRouteState(routeName, "success");
    }

    setStatus(`Completed ${routeName}.`, "ready");
  } catch (error) {
    if (routeStates[routeName]) {
      setRouteState(routeName, "error");
    }

    setStatus(error.message || String(error), "error");
    throw error;
  } finally {
    setRouteLoading(routeName, false);
    resetRouteButtonLabels();
    state.activeRoute = "";
  }
}

async function handleRoute(routeName, action, errorTarget) {
  try {
    await runRoute(routeName, action);
  } catch (error) {
    errorTarget.textContent = error instanceof Error ? error.message : String(error);
  }
}

function buildHealthUrl() {
  const testerConfig = buildTesterConfig();
  const testerConfigJson = JSON.stringify(testerConfig);

  if (!testerConfigJson || testerConfigJson === "{}") {
    return {
      url: "/api/health",
      usedOverrides: false,
      note: "Health used the live server config."
    };
  }

  if (testerConfigJson.length > 1400) {
    return {
      url: "/api/health",
      usedOverrides: false,
      note:
        "Health fell back to the live server config because the override payload is too large for a GET query."
    };
  }

  return {
    url: `/api/health?testerConfig=${encodeURIComponent(testerConfigJson)}`,
    usedOverrides: true,
    note: "Health included the current override set."
  };
}

function buildCacheReadUrl() {
  const cacheFile = configFields.dashboardCacheFile.value.trim();

  if (!cacheFile) {
    return "/api/dashboard/cache";
  }

  const testerConfig = JSON.stringify({ dashboardCacheFile: cacheFile });
  return `/api/dashboard/cache?testerConfig=${encodeURIComponent(testerConfig)}`;
}

function buildPreviewBody() {
  return {
    includeSummary: elements.includeSummary.checked,
    focus: elements.focus.value.trim(),
    testerConfig: buildTesterConfig()
  };
}

function buildParseBody() {
  const body = {
    focus: elements.parserFocus.value.trim(),
    testchat: elements.parserTestchat.checked,
    testerConfig: buildTesterConfig()
  };

  if (elements.requestModel.value.trim()) {
    body.model = elements.requestModel.value.trim();
  }

  return body;
}

function buildAskBody() {
  const prompt = elements.askPrompt.value.trim();

  if (!prompt) {
    throw new Error("Enter a prompt before running POST /api/ask.");
  }

  const body = {
    prompt,
    testerConfig: buildTesterConfig()
  };

  if (elements.requestModel.value.trim()) {
    body.model = elements.requestModel.value.trim();
  }

  return body;
}

function buildDashboardBody() {
  const body = {
    includeSummary: elements.includeSummary.checked,
    focus: elements.focus.value.trim(),
    parserFocus: elements.parserFocus.value.trim(),
    parserTestchat: elements.parserTestchat.checked,
    testerConfig: buildTesterConfig()
  };

  if (elements.requestModel.value.trim()) {
    body.model = elements.requestModel.value.trim();
  }

  return body;
}

function buildCacheWriteBody(payload, healthPayload) {
  return {
    cachedAt: new Date().toISOString(),
    healthPayload,
    payload,
    controls: {
      includeSummary: elements.includeSummary.checked,
      parserTestchat: elements.parserTestchat.checked,
      focus: elements.focus.value.trim(),
      parserFocus: elements.parserFocus.value.trim()
    },
    testerConfig: {
      ...(configFields.dashboardCacheFile.value.trim()
        ? { dashboardCacheFile: configFields.dashboardCacheFile.value.trim() }
        : {})
    }
  };
}

async function runHealth() {
  const { url, note } = buildHealthUrl();
  recordLastRequest({ method: "GET", url });
  const payload = await request(url);

  state.lastHealth = payload;
  elements.healthOutput.textContent = format({
    note,
    payload
  });
}

async function runPreview() {
  const body = buildPreviewBody();
  recordLastRequest({
    method: "POST",
    url: "/api/portal/preview",
    body
  });

  const payload = await request("/api/portal/preview", {
    method: "POST",
    body: JSON.stringify(body)
  });

  state.lastPreview = payload;
  elements.previewOutput.textContent = format(payload);
}

async function runParse() {
  const body = buildParseBody();
  recordLastRequest({
    method: "POST",
    url: "/api/portal/parse",
    body
  });

  const payload = await request("/api/portal/parse", {
    method: "POST",
    body: JSON.stringify(body)
  });

  state.lastParse = payload;
  elements.parseOutput.textContent = format(payload);
}

async function runDashboard() {
  const body = buildDashboardBody();
  recordLastRequest({
    method: "POST",
    url: "/api/dashboard",
    body
  });

  const payload = await request("/api/dashboard", {
    method: "POST",
    body: JSON.stringify(body)
  });

  state.lastDashboard = payload;
  elements.dashboardOutput.textContent = format(payload);
}

async function runAsk() {
  const body = buildAskBody();
  recordLastRequest({
    method: "POST",
    url: "/api/ask",
    body
  });

  const payload = await request("/api/ask", {
    method: "POST",
    body: JSON.stringify(body)
  });

  state.lastAsk = payload;
  elements.askOutput.textContent = format(payload);
}

async function runCacheRead() {
  const url = buildCacheReadUrl();
  recordLastRequest({ method: "GET", url });
  const payload = await request(url);
  elements.cacheReadOutput.textContent = format(payload);
}

async function ensureHealthPayload() {
  if (state.lastHealth) {
    return state.lastHealth;
  }

  const { url } = buildHealthUrl();
  const payload = await request(url);
  state.lastHealth = payload;
  return payload;
}

async function runCacheWrite() {
  if (!state.lastDashboard) {
    throw new Error("Run POST /api/dashboard first so there is a full payload to cache.");
  }

  const healthPayload = await ensureHealthPayload();
  const body = buildCacheWriteBody(state.lastDashboard, healthPayload);

  recordLastRequest({
    method: "POST",
    url: "/api/dashboard/cache",
    body
  });

  const payload = await request("/api/dashboard/cache", {
    method: "POST",
    body: JSON.stringify(body)
  });

  elements.cacheWriteOutput.textContent = format(payload);
}

function clearResults() {
  state.lastAsk = null;
  state.lastDashboard = null;
  state.lastHealth = null;
  state.lastParse = null;
  state.lastPreview = null;
  elements.lastRequestOutput.textContent = "No request sent yet.";
  elements.lastCurlOutput.textContent = "No curl command yet.";
  elements.healthOutput.textContent = "No health response yet.";
  elements.askOutput.textContent = "No ask response yet.";
  elements.previewOutput.textContent = "No preview response yet.";
  elements.parseOutput.textContent = "No parse response yet.";
  elements.dashboardOutput.textContent = "No dashboard response yet.";
  elements.cacheReadOutput.textContent = "No cache read response yet.";
  elements.cacheWriteOutput.textContent = "No cache write response yet.";
  setRouteState("ask", "idle");
  setRouteState("dashboard", "idle");
  setRouteState("preview", "idle");
  setRouteState("parse", "idle");
  setStatus("Waiting for the first test run.", "ready");
}

function sanitizeForDisplay(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForDisplay(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      if (
        key === "openAiApiKey" ||
        key === "portalCookie" ||
        key.toLowerCase() === "authorization" ||
        key.toLowerCase() === "cookie"
      ) {
        return [key, entryValue ? "[REDACTED]" : entryValue];
      }

      return [key, sanitizeForDisplay(entryValue)];
    })
  );
}

function attachTelemetryListeners() {
  const watchedElements = [
    ...Object.values(configFields),
    elements.includeSummary,
    elements.askPrompt,
    elements.parserTestchat,
    elements.focus,
    elements.parserFocus,
    elements.requestModel
  ].filter(Boolean);

  for (const element of watchedElements) {
    element.addEventListener("input", updateTelemetry);
    element.addEventListener("change", updateTelemetry);
  }
}

elements.runHealth.addEventListener("click", () => {
  handleRoute("health", runHealth, elements.healthOutput);
});

elements.runAsk.addEventListener("click", () => {
  handleRoute("ask", runAsk, elements.askOutput);
});

elements.runPreview.addEventListener("click", () => {
  handleRoute("preview", runPreview, elements.previewOutput);
});

elements.runParse.addEventListener("click", () => {
  handleRoute("parse", runParse, elements.parseOutput);
});

elements.runDashboard.addEventListener("click", () => {
  handleRoute("dashboard", runDashboard, elements.dashboardOutput);
});

elements.runCacheRead.addEventListener("click", () => {
  handleRoute("cacheRead", runCacheRead, elements.cacheReadOutput);
});

elements.runCacheWrite.addEventListener("click", () => {
  handleRoute("cacheWrite", runCacheWrite, elements.cacheWriteOutput);
});

elements.clearResults.addEventListener("click", clearResults);

function initializeApp() {
  attachTelemetryListeners();
  clearResults();
  updateTelemetry();
}

initializeApp();
