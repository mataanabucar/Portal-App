import fs from "node:fs";
import path from "node:path";
import {
  closeBrowserSession,
  closePage,
  closeSiblingBlankPages,
  createBrowserSession,
  shouldRecreateSession
} from "../portal/browserSession.js";
import { isMicrosoftLoginPage } from "../portal/htmlPortalPipeline.js";

const DEFAULT_TEAMGPT_PAGE_URL =
  "https://tools.benchmarkdigital.com/gsportal/genai/index.cfm";
const DEFAULT_TOKEN_CACHE_FILE = ".local-auth/teamgpt-token.json";

export function createTeamGptAuthService(config) {
  const cacheFile = config.teamGptTokenCacheFile || DEFAULT_TOKEN_CACHE_FILE;
  let cachedToken = readCachedToken(cacheFile);
  let authPage = null;
  let sessionPromise = null;
  let sessionMode = "";
  let disposed = false;

  return {
    describe() {
      return {
        pageUrl: resolveTeamGptPageUrl(config)
      };
    },

    async getJwtToken() {
      if (disposed) {
        throw new Error("TeamGPT auth service has been disposed.");
      }

      if (cachedToken?.jwtToken && isJwtStillValid(cachedToken.jwtToken, cachedToken.savedAt)) {
        return { jwtToken: cachedToken.jwtToken, pageUrl: cachedToken.pageUrl };
      }

      if (hasInteractiveSession()) {
        return fetchJwtToken({
          headless: false,
          interactive: true
        });
      }

      if (!config.playwrightConnectToExisting) {
        const backgroundToken = await fetchJwtToken({
          headless: true,
          interactive: false
        });

        if (backgroundToken) {
          return backgroundToken;
        }

        await resetSession();
      }

      return fetchJwtToken({
        headless: false,
        interactive: true
      });
    },

    async dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      await closePage(authPage);
      authPage = null;
      await resetSession();
    }
  };

  async function getSession({ headless }) {
    const nextSessionMode = config.playwrightConnectToExisting
      ? "connected"
      : headless
        ? "headless"
        : "interactive";

    if (sessionPromise && sessionMode && sessionMode !== nextSessionMode) {
      await resetSession();
    }

    if (sessionPromise) {
      return sessionPromise;
    }

    sessionMode = nextSessionMode;
    sessionPromise = createTrackedSession(
      config.playwrightConnectToExisting
        ? config
        : { ...config, playwrightHeadless: headless }
    );
    return sessionPromise;
  }

  async function resetSession() {
    authPage = null;
    sessionMode = "";

    if (!sessionPromise) {
      return;
    }

    const currentSessionPromise = sessionPromise;
    sessionPromise = null;
    const session = await currentSessionPromise.catch(() => null);
    await closeBrowserSession(session);
  }

  function createTrackedSession(browserConfig) {
    const createdSessionPromise = createBrowserSession(browserConfig);

    createdSessionPromise
      .then((session) => {
        const clearSession = () => {
          if (sessionPromise === createdSessionPromise) {
            sessionPromise = null;
            sessionMode = "";
          }

          authPage = null;
        };

        session.context.on("close", clearSession);

        if (session.type === "connected") {
          session.browser.on("disconnected", clearSession);
        }
      })
      .catch(() => {
        if (sessionPromise === createdSessionPromise) {
          sessionPromise = null;
          sessionMode = "";
        }
      });

    return createdSessionPromise;
  }

  function hasInteractiveSession() {
    return Boolean(authPage) || (Boolean(sessionPromise) && sessionMode === "interactive");
  }

  async function fetchJwtToken({ headless, interactive }) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const session = await getSession({ headless });
      let page = null;
      let keepOpen = false;

      try {
        page = await session.context.newPage();
        page.setDefaultNavigationTimeout(config.playwrightNavigationTimeoutMs);
        await page.bringToFront().catch(() => undefined);
        await page.goto(resolveTeamGptPageUrl(config), {
          waitUntil: "domcontentloaded",
          timeout: config.playwrightNavigationTimeoutMs
        });

        await page
          .waitForLoadState("networkidle", {
            timeout: config.playwrightNavigationTimeoutMs
          })
          .catch(() => undefined);

        const html = await page.content();
        const finalUrl = page.url();

        if (isMicrosoftLoginPage({ url: finalUrl, html })) {
          if (!interactive) {
            return null;
          }

          keepOpen = true;
          authPage = page;
          await closeSiblingBlankPages(session.context, page);
          await page.bringToFront().catch(() => undefined);

          throw new Error(
            "Browser session reached the TeamGPT sign-in page. Complete sign-in in the opened browser window, then retry."
          );
        }

        const jwtToken = await waitForJwtToken(page, config.playwrightNavigationTimeoutMs);

        if (!jwtToken) {
          throw new Error(
            "TeamGPT page loaded, but no JWT token was found on the page."
          );
        }

        if (authPage && authPage !== page) {
          await closePage(authPage);
          authPage = null;
        }

        const savedAt = new Date().toISOString();
        cachedToken = { jwtToken, pageUrl: finalUrl, savedAt };
        writeCachedToken(cacheFile, cachedToken);
        return { jwtToken, pageUrl: finalUrl };
      } catch (error) {
        if (!keepOpen && authPage === page) {
          authPage = null;
        }

        if (shouldRecreateSession(error) && attempt === 0) {
          await resetSession();
          continue;
        }

        throw error;
      } finally {
        if (!keepOpen) {
          await closePage(page);
        }
      }
    }

    throw new Error("TeamGPT auth fetch failed unexpectedly.");
  }
}

async function waitForJwtToken(page, timeoutMs) {
  const effectiveTimeout = Math.min(timeoutMs, 15000);

  try {
    await page.waitForFunction(
      () => {
        const token =
          globalThis?.GSP?.aiconfig?.jwtToken ||
          globalThis?.jwtToken ||
          "";
        return typeof token === "string" && token.trim().length > 0;
      },
      { timeout: effectiveTimeout }
    );
  } catch {
    return extractJwtTokenFromPage(page);
  }

  return extractJwtTokenFromPage(page);
}

async function extractJwtTokenFromPage(page) {
  const evaluatedToken = await page.evaluate(() => {
    const candidates = [
      globalThis?.GSP?.aiconfig?.jwtToken,
      globalThis?.jwtToken
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return "";
  });

  if (evaluatedToken) {
    return evaluatedToken;
  }

  const html = await page.content();
  const regexPatterns = [
    /GSP\.aiconfig\.jwtToken\s*=\s*["']([^"']+)["']/i,
    /\bjwtToken\s*=\s*["']([^"']+)["']/i
  ];

  for (const pattern of regexPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function resolveTeamGptPageUrl(config) {
  return typeof config?.teamGptPageUrl === "string" && config.teamGptPageUrl.trim()
    ? config.teamGptPageUrl.trim()
    : DEFAULT_TEAMGPT_PAGE_URL;
}

function readCachedToken(cacheFile) {
  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    if (typeof data?.jwtToken === "string" && data.jwtToken) {
      return {
        jwtToken: data.jwtToken,
        pageUrl: data.pageUrl || "",
        savedAt: data.savedAt || ""
      };
    }
  } catch {
    // Missing or corrupt — treat as no cached token
  }
  return null;
}

function writeCachedToken(cacheFile, { jwtToken, pageUrl, savedAt }) {
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ jwtToken, pageUrl, savedAt }, null, 2),
      "utf8"
    );
  } catch {
    // Non-fatal — cache write failure does not break the auth flow
  }
}

function isJwtStillValid(token, savedAt, bufferMs = 300_000) {
  // Try to decode the standard JWT exp claim first
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      );
      if (typeof payload.exp === "number") {
        return Date.now() < payload.exp * 1000 - bufferMs;
      }
    }
  } catch {
    // Fall through to TTL fallback
  }

  // Fallback: treat the token as valid for 4 hours from when it was saved
  if (savedAt) {
    const saved = new Date(savedAt).getTime();
    return !Number.isNaN(saved) && Date.now() < saved + 4 * 60 * 60 * 1000 - bufferMs;
  }

  return false;
}
