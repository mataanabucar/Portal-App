import { buildPortalParserInput } from "./portalParserInput.js";

const RESPONSE_VERSION = "2026-06-portal-parse-v4";

export function createDisabledPortalParser(config, options = {}) {
  const provider = resolveProvider(options.provider || config.parserProvider);
  const model = resolveModel(config, provider);
  const reason =
    provider === "teamgpt"
      ? "TeamGPT parser is not available. Verify TeamGPT page access and local browser auth."
      : config.openAiApiKey
        ? "Enable OPENAI_ENABLED=true to use the portal parser."
        : "Set OPENAI_API_KEY and OPENAI_ENABLED=true to use the portal parser.";

  return {
    describe() {
      return {
        enabled: false,
        provider,
        model,
        reason,
        testchatAllowed: isTestchatAllowed(config, provider)
      };
    },

    async parseSnapshot(snapshot, options = {}) {
      const originalText = buildPortalParserInput(snapshot);
      const testchat = isTestchatEnabled(config, provider, options.testchat);

      return testchat
        ? {
            enabled: false,
            provider,
            model,
            mode: "testchat",
            testchat: true,
            reason,
            originalText,
            responseText:
              provider === "teamgpt"
                ? "TeamGPT parser is disabled. Verify TeamGPT page access and cached local auth before testing raw parser output."
                : "Portal parser is disabled. Enable OPENAI_ENABLED=true and set OPENAI_API_KEY to inspect raw test chat output.",
            debug: buildDebugObject(provider, model, "testchat")
          }
        : {
            enabled: false,
            provider,
            model,
            mode: "structured",
            testchat: false,
            reason,
            originalText,
            parsed: { items: [] },
            debug: buildDebugObject(provider, model, "structured")
          };
    }
  };
}

function buildDebugObject(provider, model, mode) {
  return {
    provider,
    endpoint: "/api/portal/parse",
    mode,
    model,
    responseVersion: RESPONSE_VERSION
  };
}

function isTestchatEnabled(config, provider, requestedTestchat) {
  return isTestchatAllowed(config, provider) && requestedTestchat === true;
}

function isTestchatAllowed(config, provider) {
  return provider === "teamgpt" ? true : config.openAiAllowTestchat;
}

function resolveProvider(value) {
  return value === "openai" ? "openai" : "teamgpt";
}

function resolveModel(config, provider) {
  return provider === "teamgpt"
    ? config.teamGptParserModel || config.teamGptModel
    : config.openAiModel;
}
