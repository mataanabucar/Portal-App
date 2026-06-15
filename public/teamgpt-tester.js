const elements = {
  appId: document.querySelector("#app-id"),
  curlOutput: document.querySelector("#curl-output"),
  endpointPath: document.querySelector("#endpoint-path"),
  environment: document.querySelector("#environment"),
  fetchAuth: document.querySelector("#fetch-auth"),
  jwtToken: document.querySelector("#jwt-token"),
  model: document.querySelector("#model"),
  prompt: document.querySelector("#prompt"),
  provider: document.querySelector("#provider"),
  requestOutput: document.querySelector("#request-output"),
  responseOutput: document.querySelector("#response-output"),
  runTest: document.querySelector("#run-test"),
  statusPill: document.querySelector("#status-pill"),
  statusText: document.querySelector("#status-text"),
  temperature: document.querySelector("#temperature"),
  threadId: document.querySelector("#thread-id"),
  tone: document.querySelector("#tone"),
  wordLimit: document.querySelector("#word-limit"),
  format: document.querySelector("#format")
};

const DEFAULT_MODELS = {
  teamgpt: "anthropic.claude-haiku-4-5-20251001-v1:0",
  openai: "gpt-5.4-mini"
};

function setStatus(message, state = "ready") {
  elements.statusText.textContent = message;
  elements.statusPill.textContent =
    state === "running" ? "Running" : state === "error" ? "Error" : "Ready";
  elements.statusPill.dataset.state =
    state === "running" ? "loading" : state === "error" ? "error" : "ready";
}

function clipToken(token) {
  const trimmed = token.trim();
  if (trimmed.length <= 24) {
    return trimmed;
  }
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-8)}`;
}

function buildBody() {
  return {
    wordlimit: Number(elements.wordLimit.value || 1500),
    format: elements.format.value.trim() || "any",
    tone: elements.tone.value.trim() || "Professional + Straightforward",
    temperature: Number(elements.temperature.value || 0.5),
    model: elements.model.value.trim(),
    messages: [
      {
        role: "user",
        content: [{ text: elements.prompt.value.trim() }]
      }
    ],
    additionalModelRequestFields: {}
  };
}

function buildHeaders() {
  const jwtToken = elements.jwtToken.value.trim();

  return {
    Authorization: jwtToken ? `Bearer ${jwtToken}` : "",
    appid: elements.appId.value.trim() || "9225",
    environment: elements.environment.value.trim() || "prod",
    ThreadID: elements.threadId.value.trim()
  };
}

function buildProxyPayload() {
  return {
    endpointUrl: elements.endpointPath.value.trim(),
    headers: buildHeaders(),
    body: buildBody(),
    provider: elements.provider.value
  };
}

function buildCurlCommand(payload) {
  const body = JSON.stringify(payload.body, null, 2).replaceAll("'", "'\"'\"'");
  const headers = Object.entries(payload.headers)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `  -H "${key}: ${value.replaceAll('"', '\\"')}" \\`)
    .join("\n");

  return [
    `curl -sS -X POST "http://127.0.0.1:3000/api/teamgpt/test" \\`,
    headers,
    '  -H "Content-Type: application/json" \\',
    `  --data-raw '${body}'`
  ].join("\n");
}

function buildOpenAiPayload() {
  return {
    prompt: elements.prompt.value.trim(),
    model: elements.model.value.trim()
  };
}

async function fetchTeamGptAuth({ silent = false } = {}) {
  if (!silent) {
    setStatus("Fetching TeamGPT auth...", "running");
  }

  const response = await fetch("/api/teamgpt/auth");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || `TeamGPT auth failed with ${response.status}`);
  }

  elements.jwtToken.value = payload.jwtToken || "";
  elements.endpointPath.value = payload.endpointUrl || elements.endpointPath.value;
  elements.appId.value = payload.appId || elements.appId.value;
  elements.environment.value = payload.environment || elements.environment.value;

  if (!silent) {
    setStatus("TeamGPT auth fetched.", "ready");
  }

  return payload;
}

async function sendTeamGptPrompt() {
  const payload = buildProxyPayload();

  if (!elements.jwtToken.value.trim()) {
    await fetchTeamGptAuth({ silent: true }).catch(() => undefined);
    payload.headers = buildHeaders();
  }

  elements.requestOutput.textContent = JSON.stringify(
    {
      endpointUrl: payload.endpointUrl,
      headers: {
        ...payload.headers,
        Authorization: payload.headers.Authorization
          ? `Bearer ${clipToken(payload.headers.Authorization.slice(7))}`
          : ""
      },
      body: payload.body
    },
    null,
    2
  );
  elements.curlOutput.textContent = buildCurlCommand(payload);
  setStatus("Sending request...", "running");

  const response = await fetch("/api/teamgpt/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const errorMessage = parsed?.error || `Request failed with ${response.status}`;
    throw new Error(errorMessage);
  }

  elements.responseOutput.textContent = JSON.stringify(parsed, null, 2);
  setStatus("Request completed.", "ready");
}

async function sendOpenAiPrompt() {
  const payload = buildOpenAiPayload();

  if (!payload.prompt) {
    throw new Error("Enter a prompt before sending the OpenAI request.");
  }

  elements.requestOutput.textContent = JSON.stringify(
    {
      endpointUrl: "/api/ask",
      body: payload
    },
    null,
    2
  );
  elements.curlOutput.textContent = [
    'curl -sS -X POST "http://127.0.0.1:3000/api/ask" \\',
    '  -H "Content-Type: application/json" \\',
    `  --data-raw '${JSON.stringify(payload, null, 2).replaceAll("'", "'\"'\"'")}'`
  ].join("\n");
  setStatus("Sending request...", "running");

  const response = await fetch("/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(parsed?.error || `OpenAI request failed with ${response.status}`);
  }

  elements.responseOutput.textContent = JSON.stringify(parsed, null, 2);
  setStatus("Request completed.", "ready");
}

function updateProviderUi() {
  const usingTeamGpt = elements.provider.value === "teamgpt";
  const nextDefaultModel = usingTeamGpt
    ? DEFAULT_MODELS.teamgpt
    : DEFAULT_MODELS.openai;
  const currentModel = elements.model.value.trim();
  const knownDefaults = new Set(Object.values(DEFAULT_MODELS));

  if (!currentModel || knownDefaults.has(currentModel)) {
    elements.model.value = nextDefaultModel;
  }

  elements.fetchAuth.disabled = !usingTeamGpt;
  elements.jwtToken.disabled = !usingTeamGpt;
  elements.appId.disabled = !usingTeamGpt;
  elements.environment.disabled = !usingTeamGpt;
  elements.threadId.disabled = !usingTeamGpt;
  elements.endpointPath.disabled = !usingTeamGpt;
}

elements.runTest.addEventListener("click", () => {
  const route =
    elements.provider.value === "teamgpt" ? sendTeamGptPrompt : sendOpenAiPrompt;

  route().catch((error) => {
    elements.responseOutput.textContent = error instanceof Error ? error.message : String(error);
    setStatus(error instanceof Error ? error.message : String(error), "error");
  });
});

elements.fetchAuth.addEventListener("click", () => {
  fetchTeamGptAuth().catch((error) => {
    elements.responseOutput.textContent = error instanceof Error ? error.message : String(error);
    setStatus(error instanceof Error ? error.message : String(error), "error");
  });
});

elements.provider.addEventListener("change", updateProviderUi);

updateProviderUi();
setStatus("Waiting for input.", "ready");
fetchTeamGptAuth().catch((error) => {
  elements.responseOutput.textContent = error instanceof Error ? error.message : String(error);
  setStatus(error instanceof Error ? error.message : String(error), "error");
});
