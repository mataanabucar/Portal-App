import { runHtmlPortalPipeline } from "./htmlPortalPipeline.js";
import {
  closeBrowserSession,
  closePage,
  closeSiblingBlankPages,
  createBrowserSession,
  describeBrowserSession,
  shouldRecreateSession
} from "./browserSession.js";
import { isMicrosoftLoginPage } from "./htmlPortalPipeline.js";
import {
  capturePortalCookieCache,
  readPortalCookieCache,
  resolvePortalCookieCachePath
} from "./portalCookieCache.js";

export function createCookieHtmlPortalSource(config) {
  assertSupportedMethod(config.portalMethod);

  let authPage = null;
  let sessionPromise = null;
  let disposed = false;
  const cookieCachePath = resolvePortalCookieCachePath(config.portalCookieCacheFile);

  return {
    describe() {
      const cachedCookie = readPortalCookieCache(config.portalCookieCacheFile);

      return {
        mode: "cookie-html",
        target: config.portalTargetUrl || null,
        cookieCachePath,
        cachedCookieSavedAt: cachedCookie?.savedAt || null,
        hasCachedCookie: Boolean(cachedCookie?.cookieHeader),
        browser: describeBrowserSession(config),
        followDetailLinks: config.portalFollowDetailLinks
      };
    },

    async fetch() {
      if (disposed) {
        throw new Error("Cookie-backed portal source has been disposed.");
      }

      const configuredCookieHeader = normalizeCookieHeader(config.portalCookie);
      const cachedCookieHeader = normalizeCookieHeader(
        readPortalCookieCache(config.portalCookieCacheFile)?.cookieHeader
      );
      const cookieHeader = configuredCookieHeader || cachedCookieHeader;

      if (cookieHeader) {
        try {
          return await fetchWithCookieHeader(cookieHeader);
        } catch (error) {
          if (!shouldRefreshCookies(error)) {
            throw error;
          }
        }
      }

      const refreshedCookieHeader = await refreshCookieHeader();
      return fetchWithCookieHeader(refreshedCookieHeader);
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

  async function fetchWithCookieHeader(cookieHeader) {
    return runHtmlPortalPipeline({
      config,
      source: "cookie-html",
      targetUrl: config.portalTargetUrl,
      fetchHtmlPage: (url, label, methodOverride) =>
        fetchHtml(url, config, label, methodOverride, cookieHeader)
    });
  }

  async function refreshCookieHeader() {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const session = await getSession();
      let page = null;
      let keepOpen = false;

      try {
        page = await session.context.newPage();
        page.setDefaultNavigationTimeout(config.playwrightNavigationTimeoutMs);
        await page.bringToFront().catch(() => undefined);
        await page.goto(config.portalTargetUrl, {
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
          keepOpen = true;
          authPage = page;
          await closeSiblingBlankPages(session.context, page);
          await page.bringToFront().catch(() => undefined);

          throw new Error(
            "Saved portal cookies are missing or expired. Complete sign-in in the opened browser window, then click Refresh queue again."
          );
        }

        const cachedCookie = await capturePortalCookieCache(
          session,
          config.portalTargetUrl,
          config.portalCookieCacheFile,
          {
            sourceMode: "cookie-html"
          }
        );
        const cookieHeader = cachedCookie?.cookieHeader || "";

        if (!cookieHeader) {
          throw new Error(
            "Authenticated portal page loaded, but no reusable cookies were captured."
          );
        }

        if (authPage && authPage !== page) {
          await closePage(authPage);
          authPage = null;
        }

        await resetSession();
        return cookieHeader;
      } catch (error) {
        if (!keepOpen && authPage === page) {
          authPage = null;
        }

        if (shouldRecreateSession(error) && attempt === 0) {
          await resetSession();
          continue;
        }

        throw new Error(`Portal cookie refresh failed: ${error.message}`);
      } finally {
        if (!keepOpen) {
          await closePage(page);
        }
      }
    }

    throw new Error("Portal cookie refresh failed unexpectedly.");
  }

  async function getSession() {
    if (sessionPromise) {
      return sessionPromise;
    }

    sessionPromise = createTrackedSession(config);
    return sessionPromise;
  }

  async function resetSession() {
    authPage = null;

    if (!sessionPromise) {
      return;
    }

    const currentSessionPromise = sessionPromise;
    sessionPromise = null;
    const session = await currentSessionPromise.catch(() => null);
    await closeBrowserSession(session);
  }

  function createTrackedSession() {
    const createdSessionPromise = createBrowserSession(config);

    createdSessionPromise
      .then((session) => {
        const clearSession = () => {
          if (sessionPromise === createdSessionPromise) {
            sessionPromise = null;
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
        }
      });

    return createdSessionPromise;
  }
}

function buildHeaders(config, cookieHeader) {
  const headers = shouldSendBody(config.portalMethod)
    ? { "Content-Type": "application/json", ...config.portalHeaders }
    : config.portalHeaders;

  return cookieHeader ? { ...headers, Cookie: cookieHeader } : headers;
}

function shouldSendBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function assertSupportedMethod(method) {
  if (method !== "GET" && method !== "HEAD") {
    throw new Error("cookie-html mode only supports GET requests.");
  }
}

function shouldRefreshCookies(error) {
  const message = String(error?.message || error).toLowerCase();

  return (
    message.includes("redirected to microsoft login") ||
    message.includes("request failed with 401") ||
    message.includes("request failed with 403")
  );
}

function normalizeCookieHeader(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchHtml(url, config, label, methodOverride, cookieHeader) {
  const method = methodOverride || config.portalMethod;
  const response = await fetch(url, {
    method,
    headers: buildHeaders(config, cookieHeader),
    body: shouldSendBody(method)
      ? JSON.stringify(config.portalBody)
      : undefined,
    signal: AbortSignal.timeout(config.requestTimeoutMs),
    redirect: "follow"
  });

  await assertSuccess(response, label);
  const html = await response.text();

  return {
    html,
    finalUrl: response.url
  };
}

async function assertSuccess(response, label) {
  if (response.ok) {
    return;
  }

  const detail = await response.text();
  throw new Error(
    `${label} portal request failed with ${response.status}: ${detail.slice(0, 400)}`
  );
}
