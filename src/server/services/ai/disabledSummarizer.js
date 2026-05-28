export function createDisabledSummarizer(config) {
  const reason = config.openAiApiKey
    ? "Enable OPENAI_ENABLED=true to use summaries."
    : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use summaries.";

  return {
    describe() {
      return {
        enabled: false,
        model: config.openAiModel,
        reason
      };
    },

    async summarize(snapshot, focus) {
      return {
        enabled: false,
        model: config.openAiModel,
        reason,
        suggestedFocus: normalizeFocus(focus),
        summary:
          "Summarization is disabled. The portal snapshot loaded successfully."
      };
    }
  };
}

function normalizeFocus(focus) {
  return typeof focus === "string" && focus.trim() ? focus.trim() : null;
}
