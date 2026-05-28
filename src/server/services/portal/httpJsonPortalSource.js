import { getByPath } from "./getByPath.js";

export function createHttpJsonPortalSource(config) {
  return {
    describe() {
      return {
        mode: "http-json",
        target: config.portalTargetUrl || null,
        dataPath: config.portalDataPath || null
      };
    },

    async fetch() {
      assertTargetUrl(config);

      const response = await fetch(config.portalTargetUrl, {
        method: config.portalMethod,
        headers: buildHeaders(config),
        body: shouldSendBody(config.portalMethod)
          ? JSON.stringify(config.portalBody)
          : undefined,
        signal: AbortSignal.timeout(config.requestTimeoutMs)
      });

      await assertSuccess(response);
      const payload = await response.json();
      const selected = getByPath(payload, config.portalDataPath);
      const records = toRecords(selected, config.portalMaxItems);

      return {
        source: "http-json",
        target: config.portalTargetUrl,
        title: "Portal JSON snapshot",
        records,
        raw: buildRawPreview(selected)
      };
    }
  };
}

function toRecords(value, maxItems) {
  const list = Array.isArray(value) ? value : [value];
  return list.slice(0, maxItems).map((entry, index) => normalizeRecord(entry, index));
}

function normalizeRecord(entry, index) {
  if (entry === null || entry === undefined) {
    return { id: `record-${index + 1}`, detail: "null" };
  }

  if (typeof entry !== "object") {
    return { id: `record-${index + 1}`, detail: String(entry) };
  }

  return { id: `record-${index + 1}`, ...entry };
}

function buildRawPreview(value) {
  const text = value === undefined ? "undefined" : JSON.stringify(value, null, 2);
  return String(text).slice(0, 8000);
}

function buildHeaders(config) {
  const baseHeaders = {
    Accept: "application/json",
    ...config.portalHeaders
  };

  if (!shouldSendBody(config.portalMethod)) {
    return config.portalCookie
      ? { ...baseHeaders, Cookie: config.portalCookie }
      : baseHeaders;
  }

  const headers = {
    "Content-Type": "application/json",
    ...baseHeaders
  };

  return config.portalCookie ? { ...headers, Cookie: config.portalCookie } : headers;
}

function shouldSendBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function assertTargetUrl(config) {
  if (!config.portalTargetUrl) {
    throw new Error("PORTAL_TARGET_URL is required for http-json mode.");
  }
}

async function assertSuccess(response) {
  if (response.ok) {
    return;
  }

  const detail = await response.text();
  throw new Error(
    `JSON portal request failed with ${response.status}: ${detail.slice(0, 400)}`
  );
}
