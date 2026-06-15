import OpenAI from "openai";
import { createDisabledSummarizer } from "./disabledSummarizer.js";
import { createAskService } from "./ask.js";
import { createPortalParser } from "./portalParser.js";
import { createEmailContextSummarizer } from "./emailContextSummarizer.js";
import { createTeamGptClient } from "../teamgpt/client.js";

export function createSummarizer(config, { teamGptAuthService } = {}) {
  const openAiClient =
    config.openAiEnabled && config.openAiApiKey
      ? new OpenAI({ apiKey: config.openAiApiKey })
      : null;
  const teamGptClient = createTeamGptClient(config, teamGptAuthService);

  return {
    describe() {
      const provider = resolveProvider(config.summaryProvider);
      const enabled = isProviderEnabled(provider, openAiClient, teamGptClient);
      return {
        enabled,
        provider,
        model: resolveModel(config, provider),
        reason: enabled ? null : buildDisabledReason(config, provider)
      };
    },

    async summarize(snapshot, focus, options = {}) {
      const provider = resolveProvider(options.provider || config.summaryProvider);

      if (provider === "teamgpt") {
        return summarizeWithTeamGpt(config, teamGptClient, snapshot, focus);
      }

      if (!openAiClient) {
        return createDisabledSummarizer(config).summarize(snapshot, focus);
      }

      return summarizeWithOpenAi(config, openAiClient, snapshot, focus);
    }
  };
}

async function summarizeWithOpenAi(config, client, snapshot, focus) {
  const instructions = buildInstructions(focus);
  const trace = buildSummaryTrace({
    provider: "openai",
    model: config.openAiModel,
    instructions,
    input: snapshot.summaryInput
  });
  const response = await client.responses.create({
    model: config.openAiModel,
    store: false,
    instructions,
    input: snapshot.summaryInput
  });

  return {
    enabled: true,
    provider: "openai",
    model: config.openAiModel,
    reason: null,
    suggestedFocus: normalizeFocus(focus),
    summary: response.output_text,
    trace
  };
}

async function summarizeWithTeamGpt(config, teamGptClient, snapshot, focus) {
  const instructions = buildInstructions(focus);
  const trace = buildSummaryTrace({
    provider: "teamgpt",
    model: config.teamGptModel,
    instructions,
    input: snapshot.summaryInput,
    endpoint: config.teamGptEndpointUrl
  });

  if (!teamGptClient) {
    return buildTeamGptFailureSummary(
      config,
      focus,
      "TeamGPT client is not available.",
      trace
    );
  }

  try {
    const response = await teamGptClient.completeText({
      instructions,
      prompt: snapshot.summaryInput,
      model: config.teamGptModel,
      wordLimit: 900,
      tone: "Professional + Straightforward",
      format: "plain_text",
      temperature: 0.2
    });

    return {
      enabled: true,
      provider: "teamgpt",
      model: response.model,
      reason: null,
      suggestedFocus: normalizeFocus(focus),
      summary: response.text,
      trace
    };
  } catch (error) {
    return buildTeamGptFailureSummary(config, focus, error?.message, trace);
  }
}

export { createPortalParser };
export { createAskService };
export { createEmailContextSummarizer };

function buildInstructions(focus) {
  const focusLine = normalizeFocus(focus)
    ? `Focus especially on this request: ${normalizeFocus(focus)}.`
    : "Focus on what is operationally important, urgent, or unusual.";

  return [
    "You summarize internal portal data for a single user.",
    "Return a concise action-oriented summary with short bullets in plain text.",
    "Call out urgency, risk, counts, and owners when visible.",
    focusLine
  ].join(" ");
}

function normalizeFocus(focus) {
  return typeof focus === "string" && focus.trim() ? focus.trim() : null;
}

function resolveProvider(value) {
  return value === "openai" ? "openai" : "teamgpt";
}

function resolveModel(config, provider) {
  return provider === "teamgpt" ? config.teamGptModel : config.openAiModel;
}

function isProviderEnabled(provider, openAiClient, teamGptClient) {
  return provider === "teamgpt" ? Boolean(teamGptClient) : Boolean(openAiClient);
}

function buildDisabledReason(config, provider) {
  if (provider === "teamgpt") {
    return "TeamGPT is not available. Verify TeamGPT page access and local browser auth.";
  }

  return config.openAiApiKey
    ? "Enable OPENAI_ENABLED=true to use OpenAI summaries."
    : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use OpenAI summaries.";
}

function buildTeamGptFailureSummary(config, focus, reason, trace = null) {
  return {
    enabled: false,
    provider: "teamgpt",
    model: config.teamGptModel,
    reason:
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : "TeamGPT summarization is unavailable right now.",
    suggestedFocus: normalizeFocus(focus),
    summary:
      "TeamGPT summarization is unavailable right now. The portal snapshot loaded successfully.",
    trace
  };
}

function buildSummaryTrace({ provider, model, instructions, input, endpoint = "" }) {
  return {
    provider,
    model,
    endpoint: endpoint || null,
    instructions,
    input,
    inputLength: typeof input === "string" ? input.length : 0
  };
}
