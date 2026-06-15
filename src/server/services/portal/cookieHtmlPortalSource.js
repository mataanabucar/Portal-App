import { runHtmlPortalPipeline } from "./htmlPortalPipeline.js";
import {
  closeBrowserSession,
  closePage,
  closeSiblingBlankPages,
  createBrowserSession,
  describeBrowserSession,
  shouldRecreateSession
} from "./browserSession.js";
import {
  buildSignInRedirectError,
  isMicrosoftLoginPage
} from "./htmlPortalPipeline.js";
import {
  capturePortalCookieCache,
  readPortalCookieCache,
  resolvePortalCookieCachePath
} from "./portalCookieCache.js";

export function createCookieHtmlPortalSource(config) {
  assertSupportedMethod(config.portalMethod);

  let authPage = null;
  let sessionPromise = null;
  let sessionMode = "";
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
    if (hasInteractiveSession()) {
      return refreshCookieHeaderWithBrowser({
        headless: false,
        interactive: true
      });
    }

    if (!config.playwrightConnectToExisting) {
      const backgroundCookieHeader = await refreshCookieHeaderWithBrowser({
        headless: true,
        interactive: false
      });

      if (backgroundCookieHeader) {
        return backgroundCookieHeader;
      }

      await resetSession();
    }

    return refreshCookieHeaderWithBrowser({
      headless: false,
      interactive: true
    });
  }

  async function refreshCookieHeaderWithBrowser({ headless, interactive }) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const session = await getSession({ headless });
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
          if (!interactive) {
            return "";
          }

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

  function createTrackedSession() {
    const createdSessionPromise = createBrowserSession(config);

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
}

function buildHeadersForRequest(config, cookieHeader, method, requestHeaders) {
  const headers = { ...config.portalHeaders, ...requestHeaders };

  if (shouldSendBody(method) && !hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = "application/json";
  }

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
    message.includes("redirected to sign-in") ||
    message.includes("request failed with 401") ||
    message.includes("request failed with 403")
  );
}

function normalizeCookieHeader(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchHtml(url, config, label, methodOverride, cookieHeader) {
  const request = buildRequest(config, methodOverride, cookieHeader);
  const response = await fetch(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
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

function buildRequest(config, requestOverride, cookieHeader) {
  if (
    requestOverride &&
    typeof requestOverride === "object" &&
    !Array.isArray(requestOverride)
  ) {
    const method = normalizeMethod(requestOverride.method || config.portalMethod);

    return {
      method,
      headers: buildHeadersForRequest(
        config,
        cookieHeader,
        method,
        requestOverride.headers || {}
      ),
      body:
        requestOverride.body ??
        (shouldSendBody(method) ? JSON.stringify(config.portalBody) : undefined)
    };
  }

  const method = normalizeMethod(requestOverride || config.portalMethod);

  return {
    method,
    headers: buildHeadersForRequest(config, cookieHeader, method, {}),
    body: shouldSendBody(method) ? JSON.stringify(config.portalBody) : undefined
  };
}

function hasHeader(headers, name) {
  const normalizedName = name.toLowerCase();
  return Object.keys(headers).some(
    (headerName) => headerName.toLowerCase() === normalizedName
  );
}

function normalizeMethod(value) {
  return String(value || "GET").trim().toUpperCase();
}

async function assertSuccess(response, label) {
  if (response.ok) {
    return;
  }

  const detail = await response.text();

  if (isMicrosoftLoginPage({ url: response.url, html: detail })) {
    throw buildSignInRedirectError();
  }

  throw new Error(
    `${label} portal request failed with ${response.status}: ${detail.slice(0, 400)}`
  );
}
