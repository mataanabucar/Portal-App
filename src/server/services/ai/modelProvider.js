import OpenAI from "openai";

export function createModelProvider(config) {
  const defaultMaxToolRounds = Number.isFinite(config.assistantMaxToolRounds)
    ? config.assistantMaxToolRounds
    : 4;
  const provider = config.cloudLlmProvider || "openai";
  const model = config.cloudLlmModel || config.openAiModel;
  const apiKey = config.cloudLlmApiKey || config.openAiApiKey || "";
  const client = apiKey ? new OpenAI({ apiKey }) : null;

  return {
    mode: "cloud",
    provider,
    model,
    baseUrl: null,

    async describe() {
      const enabled = Boolean(client && model);
      return {
        mode: "cloud",
        provider,
        model,
        enabled,
        reachable: null,
        reason: enabled
          ? null
          : "Set CLOUD_LLM_API_KEY (or OPENAI_API_KEY) and CLOUD_LLM_MODEL (or OPENAI_MODEL) to enable cloud assistant chat.",
      };
    },

    async runToolLoop({ systemPrompt, messages, tools = [], executeToolCall, maxToolRounds }) {
      if (!client || !model) {
        return {
          content:
            "Cloud assistant model is not configured. Set CLOUD_LLM_API_KEY or OPENAI_API_KEY and select a model.",
          sources: [],
          proposedActions: [],
          toolTrace: [],
          model: model || "",
          modelMode: "cloud",
        };
      }

      return runChatToolLoop({
        client,
        model,
        systemPrompt,
        messages,
        tools,
        executeToolCall,
        maxToolRounds: Number.isFinite(maxToolRounds) ? maxToolRounds : defaultMaxToolRounds,
      });
    },
  };
}

async function runChatToolLoop({
  client,
  model,
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
      const wrapped = new Error(error?.message || "The cloud assistant model request failed.");
      wrapped.statusCode = Number(error?.status) || 502;
      throw wrapped;
    }

    const message = response.choices?.[0]?.message;
    if (!message) {
      const error = new Error("Model returned no message.");
      error.statusCode = 502;
      throw error;
    }

    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    if (toolCalls.length === 0) {
      return {
        content: message.content || "",
        sources,
        proposedActions,
        toolTrace,
        model,
        modelMode: "cloud",
      };
    }

    chatMessages.push({
      role: "assistant",
      content: message.content || null,
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
    modelMode: "cloud",
  };
}

function safeParseJson(text) {
  if (typeof text !== "string" || !text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
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

function redactArgsForTrace(args) {
  if (!args || typeof args !== "object") return {};
  const sensitiveKeyPattern = /token|secret|password|apikey|api_key|authorization/i;
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : value,
    ])
  );
}
