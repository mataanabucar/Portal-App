import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { createTeamGptClient } from "../teamgpt/client.js";

const RESPONSE_VERSION = "2026-06-ask-v1";

export function createAskService(config, { teamGptAuthService } = {}) {
  const openAiClient =
    config.openAiEnabled && config.openAiApiKey
      ? new OpenAI({ apiKey: config.openAiApiKey })
      : null;
  const localClient =
    config.localLlmBaseUrl && config.localLlmModel
      ? new OpenAI({
          apiKey: config.localLlmApiKey || "ollama",
          baseURL: config.localLlmBaseUrl
        })
      : null;
  const teamGptClient = createTeamGptClient(config, teamGptAuthService);

  return {
    describe() {
      const provider = resolveProvider(config.askProvider);
      const enabled = isProviderEnabled(provider, {
        localClient,
        openAiClient,
        teamGptClient
      });
      return {
        enabled,
        provider,
        model: resolveModel(config, "", provider),
        reason: enabled ? null : buildDisabledReason(config, provider)
      };
    },

    async ask(prompt, options = {}) {
      const requestId = randomUUID();
      const normalizedPrompt = normalizePrompt(prompt);
      const provider = resolveProvider(options.provider || config.askProvider);
      const model = resolveModel(config, options.model, provider);

      if (provider === "local") {
        if (!localClient) {
          return buildDisabledAskResult({
            config,
            prompt: normalizedPrompt,
            model,
            provider,
            requestId
          });
        }

        const response = await localClient.chat.completions.create({
          model,
          messages: [
            { role: "system", content: buildInstructions() },
            { role: "user", content: normalizedPrompt }
          ],
          temperature: 0.2
        });
        const answer = response.choices?.[0]?.message?.content?.trim() ?? "";

        return {
          enabled: true,
          provider,
          model,
          reason: null,
          prompt: normalizedPrompt,
          answer,
          debug: buildDebugObject({
            requestId,
            model,
            provider,
            openaiResponseId: response.id,
            threadId: ""
          })
        };
      }

      if (provider === "teamgpt") {
        if (!teamGptClient) {
          return buildDisabledAskResult({
            config,
            prompt: normalizedPrompt,
            model,
            provider,
            requestId
          });
        }

        const response = await teamGptClient.completeText({
          instructions: buildInstructions(),
          prompt: normalizedPrompt,
          model,
          wordLimit: normalizePositiveNumber(options.wordLimit, 1200),
          tone: normalizePrompt(options.tone) || "Professional + Straightforward",
          format: "plain_text",
          temperature: 0.2,
          threadId: normalizePrompt(options.threadId)
        });

        return {
          enabled: true,
          provider,
          model,
          reason: null,
          prompt: normalizedPrompt,
          answer: response.text,
          debug: buildDebugObject({
            requestId,
            model,
            provider,
            openaiResponseId: null,
            threadId: response.threadId
          })
        };
      }

      if (!openAiClient) {
        return buildDisabledAskResult({
          config,
          prompt: normalizedPrompt,
          model,
          provider,
          requestId
        });
      }

      const response = await openAiClient.responses.create({
        model,
        store: false,
        instructions: buildInstructions(),
        input: normalizedPrompt
      });

      assertCompleted(response);

      return {
        enabled: true,
        provider,
        model,
        reason: null,
        prompt: normalizedPrompt,
        answer: response.output_text,
        debug: buildDebugObject({
          requestId,
          model,
          provider,
          openaiResponseId: response.id,
          threadId: ""
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

function buildDebugObject({ requestId, model, provider, openaiResponseId, threadId }) {
  return {
    requestId,
    provider,
    openaiResponseId: typeof openaiResponseId === "string" ? openaiResponseId : null,
    endpoint: "/api/ask",
    mode: "direct",
    model,
    responseVersion: RESPONSE_VERSION,
    threadId: typeof threadId === "string" ? threadId : ""
  };
}

function normalizePrompt(prompt) {
  return typeof prompt === "string" ? prompt.trim() : "";
}

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveModel(config, requestedModel, provider) {
  if (typeof requestedModel === "string" && requestedModel.trim()) {
    return requestedModel.trim();
  }

  if (provider === "local") {
    return config.localLlmModel;
  }

  return provider === "teamgpt" ? config.teamGptModel : config.openAiModel;
}

function assertCompleted(response) {
  if (!response.status || response.status === "completed") {
    return;
  }

  const error = new Error(`OpenAI response status: ${response.status}.`);
  error.statusCode = 502;
  throw error;
}

function resolveProvider(value) {
  if (value === "local") {
    return "local";
  }
  return value === "openai" ? "openai" : "teamgpt";
}

function isProviderEnabled(provider, { localClient, openAiClient, teamGptClient }) {
  if (provider === "local") {
    return Boolean(localClient);
  }
  return provider === "teamgpt" ? Boolean(teamGptClient) : Boolean(openAiClient);
}

function buildDisabledReason(config, provider) {
  if (provider === "local") {
    return `Set LOCAL_LLM_BASE_URL and LOCAL_LLM_MODEL, start Ollama, and pull the model "${config.localLlmModel}".`;
  }

  if (provider === "teamgpt") {
    return "TeamGPT is not available. Verify TeamGPT page access and local browser auth.";
  }

  return config.openAiApiKey
    ? "Enable OPENAI_ENABLED=true to use OpenAI for /api/ask."
    : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use OpenAI for /api/ask.";
}

function buildDisabledAskResult({ config, prompt, model, provider, requestId }) {
  const reason = buildDisabledReason(config, provider);
  const providerLabel =
    provider === "local" ? "local LLM" : provider === "teamgpt" ? "TeamGPT" : "OpenAI";

  return {
    enabled: false,
    provider,
    model,
    reason,
    prompt,
    answer: `Ask endpoint is disabled for ${providerLabel}. ${reason}`,
    debug: buildDebugObject({
      requestId,
      model,
      provider,
      openaiResponseId: null,
      threadId: ""
    })
  };
}
