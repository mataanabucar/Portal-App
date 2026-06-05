const STRING_FIELDS = [
  "portalSourceMode",
  "portalTargetUrl",
  "portalMethod",
  "dashboardCacheFile",
  "portalCookie",
  "portalCookieCacheFile",
  "portalDataPath",
  "portalContentSelector",
  "portalFrameSelector",
  "portalItemSelector",
  "portalLinkSelector",
  "portalTitleSelector",
  "portalDetailSelector",
  "portalStatusSelector",
  "portalOwnerSelector",
  "portalPrioritySelector",
  "portalDateSelector",
  "portalDetailContentSelector",
  "portalDetailTitleSelector",
  "playwrightExecutablePath",
  "playwrightUserDataDir",
  "playwrightCdpEndpoint",
  "playwrightDevToolsActivePortFile",
  "openAiApiKey",
  "openAiModel"
];

const NUMBER_FIELDS = [
  "requestTimeoutMs",
  "portalMaxItems",
  "portalMaxDetailPages",
  "portalDetailMaxChars",
  "playwrightNavigationTimeoutMs"
];

const BOOLEAN_FIELDS = [
  "portalFollowDetailLinks",
  "playwrightConnectToExisting",
  "playwrightHeadless",
  "openAiEnabled",
  "openAiAllowTestchat"
];

const JSON_FIELDS = [
  "portalHeaders",
  "portalBody"
];

export function normalizeTesterConfig(rawConfig = {}) {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return {};
  }

  const normalizedConfig = {};

  for (const field of STRING_FIELDS) {
    const normalizedValue = normalizeOptionalString(rawConfig[field]);

    if (normalizedValue !== undefined) {
      normalizedConfig[field] = normalizedValue;
    }
  }

  for (const field of NUMBER_FIELDS) {
    const normalizedValue = normalizeOptionalNumber(rawConfig[field], field);

    if (normalizedValue !== undefined) {
      normalizedConfig[field] = normalizedValue;
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    const normalizedValue = normalizeOptionalBoolean(rawConfig[field], field);

    if (normalizedValue !== undefined) {
      normalizedConfig[field] = normalizedValue;
    }
  }

  for (const field of JSON_FIELDS) {
    const normalizedValue = normalizeOptionalJson(rawConfig[field], field);

    if (normalizedValue !== undefined) {
      normalizedConfig[field] = normalizedValue;
    }
  }

  return normalizedConfig;
}

export function parseTesterConfigQuery(rawValue = "") {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return normalizeTesterConfig(parsedValue);
  } catch (error) {
    const parseError = new Error("Invalid testerConfig query JSON.");
    parseError.statusCode = 400;
    throw parseError;
  }
}

export function hasTesterConfigOverrides(configOverrides = {}) {
  return Object.keys(configOverrides).length > 0;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalizedValue = String(value);
  return normalizedValue.trim() ? normalizedValue : undefined;
}

function normalizeOptionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    const error = new Error(`Invalid numeric tester config for ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
}

function normalizeOptionalBoolean(value, fieldName) {
  if (value === undefined || value === null || value === "" || value === "inherit") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  const error = new Error(`Invalid boolean tester config for ${fieldName}.`);
  error.statusCode = 400;
  throw error;
}

function normalizeOptionalJson(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    const error = new Error(`Invalid JSON tester config for ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      const error = new Error(
        `${fieldName} tester config must be a JSON object.`
      );
      error.statusCode = 400;
      throw error;
    }

    return parsedValue;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const parseError = new Error(`Invalid JSON tester config for ${fieldName}.`);
    parseError.statusCode = 400;
    throw parseError;
  }
}
