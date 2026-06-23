import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { createTeamGptClient } from "../teamgpt/client.js";
import { createDisabledPortalParser } from "./disabledPortalParser.js";
import { buildPortalParserInput } from "./portalParserInput.js";
import {
  RESPONSE_SCHEMA,
  buildPortalParserInstructions,
  buildPortalParserRequest
} from "./portalParserRequest.js";
import { normalizePortalSummaryBatch } from "./portalSummaryNormalizer.js";

const RESPONSE_VERSION = "2026-06-portal-parse-v4";
const TEAMGPT_PARSER_TONE = "Professional + Straightforward";
const TEAMGPT_PARSER_WORD_LIMIT = 2500;
const TEAMGPT_TESTCHAT_WORD_LIMIT = 1600;
const TEAMGPT_PARSER_ADDITIONAL_FIELDS = {
  large_context_model: "on",
  extended_thinking: "on",
  rememberConvo: "off",
  enterIsSend: "on"
};

export function createPortalParser(config, { teamGptAuthService } = {}) {
  const openAiClient =
    config.openAiEnabled && config.openAiApiKey
      ? new OpenAI({ apiKey: config.openAiApiKey })
      : null;
  const teamGptClient = createTeamGptClient(config, teamGptAuthService);

  return {
    describe() {
      const provider = resolveProvider(config.parserProvider);
      const enabled = isProviderEnabled(provider, openAiClient, teamGptClient);

      return {
        enabled,
        provider,
        model: resolveModel(config, provider),
        reason: enabled ? null : buildDisabledReason(config, provider),
        testchatAllowed: isTestchatAllowed(config, provider)
      };
    },

    async parseSnapshot(snapshot, options = {}) {
      const provider = resolveProvider(options.provider || config.parserProvider);

      if (provider === "teamgpt") {
        if (!teamGptClient) {
          return createDisabledPortalParser(config, { provider }).parseSnapshot(
            snapshot,
            options
          );
        }

        return parseWithTeamGpt(config, teamGptClient, snapshot, options);
      }

      if (!openAiClient) {
        return createDisabledPortalParser(config, { provider }).parseSnapshot(
          snapshot,
          options
        );
      }

      return parseWithOpenAi(config, openAiClient, snapshot, options);
    }
  };
}

async function parseWithOpenAi(config, client, snapshot, options) {
  const requestId = randomUUID();
  const originalText = buildPortalParserInput(snapshot);
  const model = resolveModel(config, "openai", options.model);
  const testchat = isTestchatEnabled(config, "openai", options.testchat);
  const request = buildPortalParserRequest({
    model,
    originalText,
    testchat,
    focus: options.focus,
    tone: options.tone
  });
  const response = await client.responses.create(request, { maxRetries: 0 });

  assertCompleted(response);
  const generatedAt = new Date().toISOString();

  return testchat
    ? {
        enabled: true,
        provider: "openai",
        model,
        mode: "testchat",
        testchat: true,
        reason: null,
        originalText,
        responseText: response.output_text,
        debug: buildDebugObject({
          provider: "openai",
          requestId,
          model,
          mode: "testchat",
          responseId: response.id
        })
      }
    : {
        enabled: true,
        provider: "openai",
        model,
        mode: "structured",
        testchat: false,
        reason: null,
        originalText,
        parsed: normalizePortalSummaryBatch(
          parseStructuredOutput(response.output_text),
          snapshot,
          generatedAt
        ),
        debug: buildDebugObject({
          provider: "openai",
          requestId,
          model,
          mode: "structured",
          responseId: response.id
        })
      };
}

async function parseWithTeamGpt(config, client, snapshot, options) {
  const requestId = randomUUID();
  const originalText = buildPortalParserInput(snapshot);
  const model = resolveModel(config, "teamgpt", options.model);
  const testchat = isTestchatEnabled(config, "teamgpt", options.testchat);
  const instructions = testchat
    ? buildPortalParserInstructions({
        testchat: true,
        focus: options.focus,
        tone: options.tone
      })
    : buildTeamGptStructuredInstructions(options.focus, options.tone);
  const response = await client.completeText({
    endpointUrl: resolveTeamGptParserEndpointUrl(config),
    instructions,
    prompt: originalText,
    model,
    wordLimit: testchat ? TEAMGPT_TESTCHAT_WORD_LIMIT : TEAMGPT_PARSER_WORD_LIMIT,
    tone: resolveParserTone(options.tone),
    format: "any",
    temperature: 0,
    additionalModelRequestFields: TEAMGPT_PARSER_ADDITIONAL_FIELDS
  });
  const generatedAt = new Date().toISOString();

  return testchat
    ? {
        enabled: true,
        provider: "teamgpt",
        model: response.model,
        mode: "testchat",
        testchat: true,
        reason: null,
        originalText,
        responseText: response.text,
        debug: buildDebugObject({
          provider: "teamgpt",
          requestId,
          model: response.model,
          mode: "testchat",
          responseId: response.threadId,
          endpointUrl: response.endpointUrl
        })
      }
    : {
        enabled: true,
        provider: "teamgpt",
        model: response.model,
        mode: "structured",
        testchat: false,
        reason: null,
        originalText,
        parsed: normalizePortalSummaryBatch(
          parseStructuredOutput(response.text || response.rawText),
          snapshot,
          generatedAt
        ),
        debug: buildDebugObject({
          provider: "teamgpt",
          requestId,
          model: response.model,
          mode: "structured",
          responseId: response.threadId,
          endpointUrl: response.endpointUrl
        })
      };
}

function buildDebugObject({
  provider,
  requestId,
  model,
  mode,
  responseId,
  endpointUrl = null
}) {
  return {
    provider,
    requestId,
    responseId: typeof responseId === "string" ? responseId : null,
    endpoint: "/api/portal/parse",
    providerEndpoint: endpointUrl,
    mode,
    model,
    responseVersion: RESPONSE_VERSION
  };
}

function parseStructuredOutput(outputText) {
  const parsed = tryParseJson(outputText) || tryParseJson(stripMarkdownFence(outputText));

  if (parsed) {
    return parsed;
  }

  const extractedJson = extractJSONObject(outputText);
  if (extractedJson) {
    const extractedParsed = tryParseJson(extractedJson);
    if (extractedParsed) {
      return extractedParsed;
    }
  }

  const parseError = new Error("Portal parser returned invalid JSON.");
  parseError.statusCode = 502;
  throw parseError;
}

function buildTeamGptStructuredInstructions(focus, tone) {
  const baseInstructions = buildPortalParserInstructions({
    testchat: false,
    focus,
    tone
  });

  return [
    baseInstructions,
    "Return JSON only.",
    "Do not wrap the JSON in markdown fences.",
    'Do not add commentary before or after the JSON.',
    'The top-level response must be exactly one object with the key "items".',
    `The JSON must satisfy this schema exactly: ${JSON.stringify(RESPONSE_SCHEMA)}`
  ].join(" ");
}

function stripMarkdownFence(value) {
  const normalized = normalizeText(value);
  if (!normalized.startsWith("```")) {
    return normalized;
  }

  const match = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() || normalized;
}

function extractJSONObject(value) {
  const normalized = normalizeText(value);
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return "";
  }

  return normalized.slice(firstBrace, lastBrace + 1);
}

function tryParseJson(value) {
  try {
    return JSON.parse(normalizeText(value));
  } catch {
    return null;
  }
}

function resolveProvider(value) {
  return value === "openai" ? "openai" : "teamgpt";
}

function resolveModel(config, provider, requestedModel) {
  if (typeof requestedModel === "string" && requestedModel.trim()) {
    return requestedModel.trim();
  }

  return provider === "teamgpt"
    ? config.teamGptParserModel || config.teamGptModel
    : config.openAiModel;
}

function resolveTeamGptParserEndpointUrl(config) {
  const endpointUrl =
    typeof config.teamGptParserEndpointUrl === "string"
      ? config.teamGptParserEndpointUrl.trim()
      : "";

  if (endpointUrl) {
    return endpointUrl;
  }

  return String(config.teamGptEndpointUrl || "").replace(
    /stream=true/i,
    "stream=false"
  );
}

function isProviderEnabled(provider, openAiClient, teamGptClient) {
  return provider === "teamgpt" ? Boolean(teamGptClient) : Boolean(openAiClient);
}

function buildDisabledReason(config, provider) {
  if (provider === "teamgpt") {
    return "TeamGPT parser is not available. Verify TeamGPT page access and local browser auth.";
  }

  return config.openAiApiKey
    ? "Enable OPENAI_ENABLED=true to use the portal parser."
    : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use the portal parser.";
}

function isTestchatEnabled(config, provider, requestedTestchat) {
  return isTestchatAllowed(config, provider) && requestedTestchat === true;
}

function isTestchatAllowed(config, provider) {
  return provider === "teamgpt" ? true : config.openAiAllowTestchat;
}

function assertCompleted(response) {
  if (!response.status || response.status === "completed") {
    return;
  }

  const error = new Error(`OpenAI response status: ${response.status}.`);
  error.statusCode = 502;
  throw error;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveParserTone(value) {
  return normalizeText(value) || TEAMGPT_PARSER_TONE;
}
