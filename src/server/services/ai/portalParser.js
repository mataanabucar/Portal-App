import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { createDisabledPortalParser } from "./disabledPortalParser.js";
import { buildPortalParserInput } from "./portalParserInput.js";
import { buildPortalParserRequest } from "./portalParserRequest.js";
import { normalizePortalSummaryBatch } from "./portalSummaryNormalizer.js";

const RESPONSE_VERSION = "2026-06-portal-parse-v3";

export function createPortalParser(config) {
  if (!config.openAiEnabled || !config.openAiApiKey) {
    return createDisabledPortalParser(config);
  }

  const client = new OpenAI({ apiKey: config.openAiApiKey });

  return {
    describe() {
      return {
        enabled: true,
        model: config.openAiModel,
        reason: null,
        testchatAllowed: config.openAiAllowTestchat
      };
    },

    async parseSnapshot(snapshot, options = {}) {
      const requestId = randomUUID();
      const originalText = buildPortalParserInput(snapshot);
      const model = resolveModel(config, options.model);
      const testchat = isTestchatEnabled(config, options.testchat);
      const request = buildPortalParserRequest({
        model,
        originalText,
        testchat,
        focus: options.focus
      });
      const response = await client.responses.create(request, { maxRetries: 0 });

      assertCompleted(response);
      const generatedAt = new Date().toISOString();

      return testchat
        ? {
            enabled: true,
            model,
            mode: "testchat",
            testchat: true,
            reason: null,
            originalText,
            request,
            responseText: response.output_text,
            debug: buildDebugObject({
              requestId,
              model,
              mode: "testchat",
              openaiResponseId: response.id
            })
          }
        : {
            enabled: true,
            model,
            mode: "structured",
            testchat: false,
            reason: null,
            originalText,
            request,
            parsed: normalizePortalSummaryBatch(
              parseStructuredOutput(response.output_text),
              snapshot,
              generatedAt
            ),
            debug: buildDebugObject({
              requestId,
              model,
              mode: "structured",
              openaiResponseId: response.id
            })
      };
    }
  };
}

function buildDebugObject({ requestId, model, mode, openaiResponseId }) {
  return {
    requestId,
    openaiResponseId: typeof openaiResponseId === "string" ? openaiResponseId : null,
    endpoint: "/api/portal/parse",
    mode,
    model,
    responseVersion: RESPONSE_VERSION
  };
}

function parseStructuredOutput(outputText) {
  try {
    return JSON.parse(outputText);
  } catch (error) {
    const parseError = new Error("Portal parser returned invalid JSON.");
    parseError.statusCode = 502;
    throw parseError;
  }
}

function resolveModel(config, requestedModel) {
  return typeof requestedModel === "string" && requestedModel.trim()
    ? requestedModel.trim()
    : config.openAiModel;
}

function isTestchatEnabled(config, requestedTestchat) {
  return config.openAiAllowTestchat && requestedTestchat === true;
}

function assertCompleted(response) {
  if (!response.status || response.status === "completed") {
    return;
  }

  const error = new Error(`OpenAI response status: ${response.status}.`);
  error.statusCode = 502;
  throw error;
}
