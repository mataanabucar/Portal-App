import { randomUUID } from "node:crypto";
import OpenAI from "openai";

const RESPONSE_VERSION = "2026-06-ask-v1";

export function createAskService(config) {
  if (!config.openAiEnabled || !config.openAiApiKey) {
    return createDisabledAskService(config);
  }

  const client = new OpenAI({ apiKey: config.openAiApiKey });

  return {
    describe() {
      return {
        enabled: true,
        model: config.openAiModel,
        reason: null
      };
    },

    async ask(prompt, options = {}) {
      const requestId = randomUUID();
      const normalizedPrompt = normalizePrompt(prompt);
      const model = resolveModel(config, options.model);
      const response = await client.responses.create({
        model,
        store: false,
        instructions: buildInstructions(),
        input: normalizedPrompt
      });

      assertCompleted(response);

      return {
        enabled: true,
        model,
        reason: null,
        prompt: normalizedPrompt,
        answer: response.output_text,
        debug: buildDebugObject({
          requestId,
          model,
          openaiResponseId: response.id
        })
      };
    }
  };
}

function createDisabledAskService(config) {
  const reason = config.openAiApiKey
    ? "Enable OPENAI_ENABLED=true to use /api/ask."
    : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use /api/ask.";

  return {
    describe() {
      return {
        enabled: false,
        model: config.openAiModel,
        reason
      };
    },

    async ask(prompt, options = {}) {
      const normalizedPrompt = normalizePrompt(prompt);
      const model = resolveModel(config, options.model);

      return {
        enabled: false,
        model,
        reason,
        prompt: normalizedPrompt,
        answer:
          "Ask endpoint is disabled. Enable OPENAI_ENABLED=true and set OPENAI_API_KEY to call OpenAI.",
        debug: buildDebugObject({
          requestId: randomUUID(),
          model,
          openaiResponseId: null
        })
      };
    }
  };
}

function buildInstructions() {
  return [
    "Answer the user's question directly and concisely.",
    "If multiple questions are asked, answer each one in order.",
    "Use plain text and avoid unnecessary framing.",
    "If the answer is uncertain or time-sensitive, say so plainly."
  ].join(" ");
}

function buildDebugObject({ requestId, model, openaiResponseId }) {
  return {
    requestId,
    openaiResponseId: typeof openaiResponseId === "string" ? openaiResponseId : null,
    endpoint: "/api/ask",
    mode: "direct",
    model,
    responseVersion: RESPONSE_VERSION
  };
}

function normalizePrompt(prompt) {
  return typeof prompt === "string" ? prompt.trim() : "";
}

function resolveModel(config, requestedModel) {
  return typeof requestedModel === "string" && requestedModel.trim()
    ? requestedModel.trim()
    : config.openAiModel;
}

function assertCompleted(response) {
  if (!response.status || response.status === "completed") {
    return;
  }

  const error = new Error(`OpenAI response status: ${response.status}.`);
  error.statusCode = 502;
  throw error;
}
