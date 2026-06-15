import { buildPortalParserInput } from "./portalParserInput.js";

const RESPONSE_VERSION = "2026-06-portal-parse-v3";

export function createDisabledPortalParser(config) {
  const reason = config.openAiApiKey
    ? "Enable OPENAI_ENABLED=true to use the portal parser."
    : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use the portal parser.";

  return {
    describe() {
      return {
        enabled: false,
        model: config.openAiModel,
        reason,
        testchatAllowed: config.openAiAllowTestchat
      };
    },

    async parseSnapshot(snapshot, options = {}) {
      const originalText = buildPortalParserInput(snapshot);
      const testchat = isTestchatEnabled(config, options.testchat);

      return testchat
        ? {
            enabled: false,
            model: config.openAiModel,
            mode: "testchat",
            testchat: true,
            reason,
            originalText,
            responseText:
              "Portal parser is disabled. Enable OPENAI_ENABLED=true and set OPENAI_API_KEY to inspect raw test chat output.",
            debug: buildDebugObject(config, "testchat")
          }
        : {
            enabled: false,
            model: config.openAiModel,
            mode: "structured",
            testchat: false,
            reason,
            originalText,
            parsed: { items: [] },
            debug: buildDebugObject(config, "structured")
          };
    }
  };
}

function buildDebugObject(config, mode) {
  return {
    endpoint: "/api/portal/parse",
    mode,
    model: config.openAiModel,
    responseVersion: RESPONSE_VERSION
  };
}

function isTestchatEnabled(config, requestedTestchat) {
  return config.openAiAllowTestchat && requestedTestchat === true;
}
