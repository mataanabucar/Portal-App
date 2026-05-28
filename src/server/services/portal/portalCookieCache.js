import fs from "node:fs";
import path from "node:path";

const DEFAULT_COOKIE_FILE = ".local-auth/portal-cookie-cache.json";
const COOKIE_CACHE_STORE_KEY = Symbol.for(
  "portal.visualizer.cookie-cache-store"
);

function getCookieCacheStore() {
  if (!globalThis[COOKIE_CACHE_STORE_KEY]) {
    globalThis[COOKIE_CACHE_STORE_KEY] = new Map();
  }

  return globalThis[COOKIE_CACHE_STORE_KEY];
}

export function resolvePortalCookieCachePath(rawPath = "") {
  const inputPath = rawPath || DEFAULT_COOKIE_FILE;
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
}

export function readPortalCookieCache(rawPath = "") {
  const filePath = resolvePortalCookieCachePath(rawPath);
  const store = getCookieCacheStore();
  const cachedValue = store.get(filePath) || null;

  if (!fs.existsSync(filePath)) {
    return cachedValue;
  }

  try {
    const parsedValue = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (
      typeof parsedValue?.cookieHeader === "string" &&
      parsedValue.cookieHeader
    ) {
      const normalizedValue = { ...parsedValue, filePath };
      store.set(filePath, normalizedValue);
      return normalizedValue;
    }

    return cachedValue;
  } catch {
    return cachedValue;
  }
}

export function clearPortalCookieCache(rawPath = "") {
  const filePath = resolvePortalCookieCachePath(rawPath);
  getCookieCacheStore().delete(filePath);
}

export function writePortalCookieCache(rawPath = "", payload = {}) {
  const filePath = resolvePortalCookieCachePath(rawPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const cookieHeader = String(payload.cookieHeader || "").trim();

  if (!cookieHeader) {
    throw new Error("Cookie cache write requested without a cookie header.");
  }

  const normalizedPayload = {
    savedAt: payload.savedAt || new Date().toISOString(),
    targetUrl: payload.targetUrl || "",
    sourceMode: payload.sourceMode || "",
    cookieHeader,
    cookies: normalizeCookieEntries(payload.cookies)
  };

  const cacheRecord = { ...normalizedPayload, filePath };
  getCookieCacheStore().set(filePath, cacheRecord);
  fs.writeFileSync(filePath, JSON.stringify(normalizedPayload, null, 2), "utf8");
  return cacheRecord;
}

export async function capturePortalCookieCache(
  session,
  targetUrl,
  rawPath = "",
  payload = {}
) {
  if (!session?.context || !targetUrl) {
    return null;
  }

  const cookies = await session.context.cookies([targetUrl]);
  const cookieHeader = buildCookieHeader(cookies);

  if (!cookieHeader) {
    return null;
  }

  try {
    return writePortalCookieCache(rawPath, {
      ...payload,
      targetUrl,
      cookieHeader,
      cookies
    });
  } catch (error) {
    const cachedValue = readPortalCookieCache(rawPath);

    return (
      cachedValue || {
        filePath: resolvePortalCookieCachePath(rawPath),
        savedAt: payload.savedAt || new Date().toISOString(),
        targetUrl,
        sourceMode: payload.sourceMode || "",
        cookieHeader,
        cookies: normalizeCookieEntries(cookies),
        writeError: error.message
      }
    );
  }
}

export function buildCookieHeader(cookies = []) {
  const normalizedPairs = cookies
    .filter((cookie) => cookie?.name && typeof cookie.value === "string")
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  return normalizedPairs.join("; ");
}

function normalizeCookieEntries(cookies = []) {
  return Array.isArray(cookies)
    ? cookies.map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly === true,
        secure: cookie.secure === true,
        sameSite: cookie.sameSite || ""
      }))
    : [];
}
