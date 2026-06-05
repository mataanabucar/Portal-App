import OpenAI from "openai";
import { createAskService } from "./ask.js";
import { createDisabledSummarizer } from "./disabledSummarizer.js";
import { createPortalParser } from "./portalParser.js";

export function createSummarizer(config) {
  if (!config.openAiEnabled || !config.openAiApiKey) {
    return createDisabledSummarizer(config);
  }

  const client = new OpenAI({ apiKey: config.openAiApiKey });

  return {
    describe() {
      return {
        enabled: true,
        model: config.openAiModel
      };
    },

    async summarize(snapshot, focus) {
      const response = await client.responses.create({
        model: config.openAiModel,
        store: false,
        instructions: buildInstructions(focus),
        input: snapshot.summaryInput
      });

      return {
        enabled: true,
        model: config.openAiModel,
        reason: null,
        suggestedFocus: normalizeFocus(focus),
        summary: response.output_text
      };
    }
  };
}

export { createPortalParser };
export { createAskService };

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
