import OpenAI from "openai";

// Both local (Ollama) and cloud (OpenAI) chat calls go through the Chat
// Completions API, not the newer OpenAI Responses API used by ask.js/summarizer.
// Ollama's OpenAI-compat layer only implements Chat Completions, and using the
// same wire format for both providers means the tool-calling loop below is
// identical code regardless of which one is active.

const REACHABILITY_TIMEOUT_MS = 3000;

export function createModelProvider(config) {
  const mode = config.assistantModelMode === "local" ? "local" : "cloud";
  const defaultMaxToolRounds = Number.isFinite(config.assistantMaxToolRounds)
    ? config.assistantMaxToolRounds
    : 4;

  const local = {
    baseUrl: config.localLlmBaseUrl,
    model: config.localLlmModel,
    apiKey: config.localLlmApiKey || "ollama",
  };

  const cloudApiKey = config.cloudLlmApiKey || config.openAiApiKey || "";
  const cloud = {
    provider: config.cloudLlmProvider || "openai",
    model: config.cloudLlmModel || config.openAiModel,
    apiKey: cloudApiKey,
  };

  function buildClient() {
    if (mode === "local") {
      return new OpenAI({ apiKey: local.apiKey, baseURL: local.baseUrl });
    }
    if (!cloud.apiKey) return null;
    return new OpenAI({ apiKey: cloud.apiKey });
  }

  const activeModel = mode === "local" ? local.model : cloud.model;

  return {
    mode,
    provider: mode === "local" ? "ollama" : cloud.provider,
    model: activeModel,
    baseUrl: mode === "local" ? local.baseUrl : null,

    async describe() {
      if (mode === "local") {
        const reachable = await checkReachable(local.baseUrl, local.model);
        return {
          mode,
          provider: "ollama",
          model: local.model,
          baseUrl: local.baseUrl,
          enabled: true,
          reachable,
          reason: reachable
            ? null
            : `Could not reach Ollama at ${local.baseUrl}, or the model "${local.model}" isn't pulled yet. Confirm Ollama is running (ollama serve) and run: ollama pull ${local.model}.`,
        };
      }

      const enabled = Boolean(cloud.apiKey);
      return {
        mode,
        provider: cloud.provider,
        model: cloud.model,
        enabled,
        reachable: null,
        reason: enabled
          ? null
          : "Set CLOUD_LLM_API_KEY (or OPENAI_API_KEY) to enable cloud assistant chat.",
      };
    },

    async runToolLoop({ systemPrompt, messages, tools = [], executeToolCall, maxToolRounds }) {
      const client = buildClient();
      if (!client) {
        return {
          content:
            mode === "local"
              ? "Local assistant model is not configured."
              : "Cloud assistant model is not configured. Set CLOUD_LLM_API_KEY or OPENAI_API_KEY.",
          sources: [],
          proposedActions: [],
          toolTrace: [],
          model: activeModel,
          modelMode: mode,
        };
      }

      const rounds = Number.isFinite(maxToolRounds) ? maxToolRounds : defaultMaxToolRounds;
      return runChatToolLoop({
        client,
        model: activeModel,
        modelMode: mode,
        systemPrompt,
        messages,
        tools,
        executeToolCall,
        maxToolRounds: rounds,
      });
    },
  };
}

async function runChatToolLoop({
  client,
  model,
  modelMode,
  systemPrompt,
  messages,
  tools,
  executeToolCall,
  maxToolRounds,
}) {
  const toolTrace = [];
  const sources = [];
  const proposedActions = [];

  const chatMessages = [{ role: "system", content: systemPrompt }, ...messages];

  const openAiTools = tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  for (let round = 0; round < maxToolRounds; round += 1) {
    let response;
    try {
      response = await client.chat.completions.create({
        model,
        messages: chatMessages,
        tools: openAiTools.length ? openAiTools : undefined,
        tool_choice: openAiTools.length ? "auto" : undefined,
      });
    } catch (error) {
      throw buildModelCallError(error, { modelMode, model });
    }

    const message = response.choices?.[0]?.message;
    if (!message) {
      throw new Error("Model returned no message.");
    }

    const nativeToolCalls = message.tool_calls || [];
    let toolCalls = nativeToolCalls;
    if (!toolCalls.length) {
      // Some local models (llama3.2, qwen2.5-coder via Ollama) sometimes print
      // a tool-call-shaped JSON object as plain assistant content instead of
      // emitting a structured tool_calls entry. Recover only that narrow case:
      // the entire content is one JSON object naming a tool from the active
      // tool list. Anything else returns as normal content.
      const fallbackCall = extractContentToolCall(message.content, tools, round);
      if (!fallbackCall) {
        return {
          content: message.content || "",
          sources,
          proposedActions,
          toolTrace,
          model,
          modelMode,
        };
      }
      toolCalls = [fallbackCall];
    }

    chatMessages.push({
      role: "assistant",
      // In the fallback case the content WAS the (fake) tool call — echoing it
      // back would teach the model to keep printing JSON, so drop it.
      content: nativeToolCalls.length ? message.content || null : null,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name || "";
      const args = safeParseJson(toolCall.function?.arguments);

      let outcome;
      try {
        outcome = await executeToolCall(toolName, args);
      } catch (error) {
        outcome = { error: error?.message || "Tool execution failed." };
      }

      if (outcome?.proposedAction) proposedActions.push(outcome.proposedAction);
      if (Array.isArray(outcome?.sources)) sources.push(...outcome.sources);

      toolTrace.push({
        tool: toolName,
        args: redactArgsForTrace(args),
        resultSummary: summarizeOutcome(outcome),
      });

      chatMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(
          outcome?.error
            ? { error: outcome.error }
            : outcome?.proposedAction
              ? { proposedAction: outcome.proposedAction }
              : (outcome?.result ?? {})
        ),
      });
    }
  }

  return {
    content:
      "I reached the tool-call limit for this turn before finishing. Please narrow the question or try again.",
    sources,
    proposedActions,
    toolTrace,
    model,
    modelMode,
  };
}

// OpenAI SDK connection errors (ECONNREFUSED etc.) surface as a generic
// "Connection error." with no statusCode, which — left uncaught — falls
// through to Express's default error handler as an opaque 500. Wrap it in a
// clear, mode-aware message with a proper statusCode instead.
function buildModelCallError(error, { modelMode, model }) {
  const isConnectionIssue =
    error?.code === "ECONNREFUSED" ||
    error?.cause?.code === "ECONNREFUSED" ||
    /connection error/i.test(error?.message || "");

  if (modelMode === "local" && isConnectionIssue) {
    const wrapped = new Error(
      `Could not reach the local Ollama model "${model}". Confirm Ollama is running (ollama serve) and the model is pulled (ollama pull ${model}).`
    );
    wrapped.statusCode = 502;
    return wrapped;
  }

  const wrapped = new Error(error?.message || "The assistant model request failed.");
  wrapped.statusCode = Number(error?.status) || 502;
  return wrapped;
}

// Narrow recovery for local models that print a tool call as plain content
// instead of a structured tool_calls entry. Accepts only: the whole content
// (optionally inside one ``` fence) parsing as a single JSON object shaped
// like {"name": "<known tool>", "parameters"|"arguments"|"args": {...}} or the
// same nested under a "function" key. The tool name must be in the active
// tools array — this is deliberately NOT a general JSON executor. Returns a
// synthesized Chat Completions tool_call, or null to fall through to normal
// content handling.
function extractContentToolCall(content, tools, round) {
  if (typeof content !== "string") return null;
  let text = content.trim();

  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  if (!text.startsWith("{") || !text.endsWith("}")) return null;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const candidate =
    typeof parsed.name === "string"
      ? parsed
      : parsed.function &&
          typeof parsed.function === "object" &&
          typeof parsed.function.name === "string"
        ? parsed.function
        : null;
  if (!candidate) return null;

  const name = candidate.name.trim();
  if (!tools.some((tool) => tool.name === name)) return null;

  const rawArgs = candidate.parameters ?? candidate.arguments ?? candidate.args;
  let args;
  if (rawArgs === undefined || rawArgs === null) {
    args = {};
  } else if (typeof rawArgs === "object" && !Array.isArray(rawArgs)) {
    args = rawArgs;
  } else if (typeof rawArgs === "string") {
    // Some models stringify the args object. Reject anything that doesn't
    // parse cleanly to an object rather than executing with guessed args.
    try {
      const parsedArgs = JSON.parse(rawArgs);
      if (!parsedArgs || typeof parsedArgs !== "object" || Array.isArray(parsedArgs)) return null;
      args = parsedArgs;
    } catch {
      return null;
    }
  } else {
    return null;
  }

  return {
    id: `content_fallback_${round}`,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

function safeParseJson(text) {
  if (typeof text !== "string" || !text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function summarizeOutcome(outcome) {
  if (outcome?.error) return `error: ${outcome.error}`;
  if (outcome?.proposedAction) return "proposed action (awaiting confirmation)";
  if (Array.isArray(outcome?.result)) return `${outcome.result.length} result(s)`;
  if (outcome?.result && typeof outcome.result === "object") return "ok";
  return "ok";
}

// Tool-trace args are logged/returned for debugging; keep them from ever
// carrying anything that looks like a token, key, or credential.
function redactArgsForTrace(args) {
  if (!args || typeof args !== "object") return {};
  const SENSITIVE_KEY_PATTERN = /token|secret|password|apikey|api_key|authorization/i;
  const redacted = {};
  for (const [key, value] of Object.entries(args)) {
    redacted[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : value;
  }
  return redacted;
}

async function checkReachable(baseUrl, model) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return false;
    if (!model) return true;
    const body = await response.json().catch(() => null);
    const ids = Array.isArray(body?.data) ? body.data.map((entry) => entry.id) : [];
    return modelIsListed(model, ids);
  } catch {
    return false;
  }
}

// Ollama's /v1/models lists tagged names (e.g. "llama3.2:3b") but a user may
// configure an untagged name that inference resolves via the implicit
// ":latest" tag. Match tolerantly so a pulled model isn't falsely reported
// unreachable.
function modelIsListed(model, ids) {
  const withLatest = model.includes(":") ? model : `${model}:latest`;
  return ids.some((id) => id === model || id === withLatest);
}
