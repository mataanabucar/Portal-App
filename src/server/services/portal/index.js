import { createHttpHtmlPortalSource } from "./httpHtmlPortalSource.js";
import { createHttpJsonPortalSource } from "./httpJsonPortalSource.js";
import { createMockPortalSource } from "./mockPortalSource.js";
import { buildOpenAiPortalPayload } from "./openAiPortalFields.js";
import { createCookieHtmlPortalSource } from "./cookieHtmlPortalSource.js";
import { createPlaywrightHtmlPortalSource } from "./playwrightHtmlPortalSource.js";

export function createPortalService(config) {
  const source = selectSource(config);

  return {
    describe() {
      return source.describe();
    },

    async fetchSnapshot() {
      const payload = await source.fetch();
      return normalizeSnapshot(payload);
    },

    toClientSnapshot(snapshot) {
      const { summaryInput, ...clientSnapshot } = snapshot;
      return {
        ...clientSnapshot,
        records: Array.isArray(clientSnapshot.records)
          ? clientSnapshot.records.map(stripClientOnlyRecordFields)
          : []
      };
    },

    async dispose() {
      if (typeof source.dispose === "function") {
        await source.dispose();
      }
    }
  };
}

function selectSource(config) {
  const sources = {
    mock: createMockPortalSource(config),
    "http-json": createHttpJsonPortalSource(config),
    "http-html": createHttpHtmlPortalSource(config),
    "cookie-html": createCookieHtmlPortalSource(config),
    "browser-html": createPlaywrightHtmlPortalSource(config)
  };

  const source = sources[config.portalSourceMode];

  if (!source) {
    throw new Error(`Unsupported PORTAL_SOURCE_MODE: ${config.portalSourceMode}`);
  }

  return source;
}

function normalizeSnapshot(payload) {
  const records = Array.isArray(payload.records) ? payload.records : [];
  const metrics = buildMetrics(records);

  return {
    source: payload.source,
    target: payload.target,
    title: payload.title,
    fetchedAt: new Date().toISOString(),
    recordCount: records.length,
    metrics,
    records,
    rawPreview: payload.raw,
    summaryInput: buildSummaryInput(records)
  };
}

function buildMetrics(records) {
  return {
    statusCounts: countValues(records, "status"),
    ownerCounts: countValues(records, "owner"),
    totalRecords: records.length
  };
}

function countValues(records, field) {
  return records.reduce((counts, record) => {
    const value = record?.[field];

    if (!value) {
      return counts;
    }

    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function buildSummaryInput(records) {
  return JSON.stringify(buildOpenAiPortalPayload(records), null, 2);
}

function stripClientOnlyRecordFields(record) {
  const { detailPageFullContent, openAiFields, ...clientRecord } = record || {};
  return clientRecord;
}
