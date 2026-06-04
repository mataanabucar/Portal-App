import fs from "node:fs";
import path from "node:path";

const DEFAULT_DASHBOARD_CACHE_FILE = ".local-state/dashboard-cache.json";
const DASHBOARD_CACHE_STORE_KEY = Symbol.for(
  "portal.visualizer.dashboard-cache-store"
);

function getDashboardCacheStore() {
  if (!globalThis[DASHBOARD_CACHE_STORE_KEY]) {
    globalThis[DASHBOARD_CACHE_STORE_KEY] = new Map();
  }

  return globalThis[DASHBOARD_CACHE_STORE_KEY];
}

export function resolveDashboardCachePath(rawPath = "") {
  const inputPath = rawPath || DEFAULT_DASHBOARD_CACHE_FILE;
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
}

export function readDashboardCache(rawPath = "") {
  const filePath = resolveDashboardCachePath(rawPath);
  const store = getDashboardCacheStore();
  const cachedValue = store.get(filePath) || null;

  if (!fs.existsSync(filePath)) {
    return cachedValue;
  }

  try {
    const parsedValue = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const normalizedValue = normalizeDashboardCacheRecord(parsedValue);

    if (!normalizedValue) {
      return cachedValue;
    }

    store.set(filePath, normalizedValue);
    return normalizedValue;
  } catch {
    return cachedValue;
  }
}

export function writeDashboardCache(rawPath = "", payload = {}) {
  const filePath = resolveDashboardCachePath(rawPath);
  const normalizedPayload = normalizeDashboardCacheRecord(payload);

  if (!normalizedPayload) {
    throw new Error(
      "Dashboard cache write requested without a valid dashboard payload."
    );
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  getDashboardCacheStore().set(filePath, normalizedPayload);
  fs.writeFileSync(filePath, JSON.stringify(normalizedPayload, null, 2), "utf8");
  return normalizedPayload;
}

function normalizeDashboardCacheRecord(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (!value.payload?.snapshot || !value.healthPayload) {
    return null;
  }

  const normalizedControls = normalizeDashboardControls(value.controls);

  return {
    cachedAt: normalizeTimestamp(value.cachedAt),
    healthPayload: value.healthPayload,
    payload: value.payload,
    ...(normalizedControls ? { controls: normalizedControls } : {})
  };
}

function normalizeDashboardControls(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const normalizedValue = {};

  if (typeof value.includeSummary === "boolean") {
    normalizedValue.includeSummary = value.includeSummary;
  }

  if (typeof value.parserTestchat === "boolean") {
    normalizedValue.parserTestchat = value.parserTestchat;
  }

  if (typeof value.focus === "string") {
    normalizedValue.focus = value.focus;
  }

  if (typeof value.parserFocus === "string") {
    normalizedValue.parserFocus = value.parserFocus;
  }

  return Object.keys(normalizedValue).length > 0 ? normalizedValue : null;
}

function normalizeTimestamp(value) {
  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime())
    ? new Date().toISOString()
    : parsedValue.toISOString();
}
