import {
  isMicrosoftLoginPage,
  runHtmlPortalPipeline
} from "./htmlPortalPipeline.js";
import {
  closeBrowserSession,
  closePage,
  closeSiblingBlankPages,
  createBrowserSession,
  describeBrowserSession,
  shouldRecreateSession
} from "./browserSession.js";
import {
  capturePortalCookieCache,
  readPortalCookieCache,
  resolvePortalCookieCachePath
} from "./portalCookieCache.js";

export function createPlaywrightHtmlPortalSource(config) {
  assertSupportedMethod(config.portalMethod);

  let authPage = null;
  let sessionPromise = null;
  let disposed = false;

  return {
    describe() {
      const cachedCookie = readPortalCookieCache(config.portalCookieCacheFile);

      return {
        mode: "browser-html",
        target: config.portalTargetUrl || null,
        ...describeBrowserSession(config),
        cookieCachePath: resolvePortalCookieCachePath(
          config.portalCookieCacheFile
        ),
        cachedCookieSavedAt: cachedCookie?.savedAt || null,
        hasCachedCookie: Boolean(cachedCookie?.cookieHeader),
        followDetailLinks: config.portalFollowDetailLinks
      };
    },

    async fetch() {
      if (disposed) {
        throw new Error("Browser-backed portal source has been disposed.");
      }

      return runHtmlPortalPipeline({
        config,
        source: "browser-html",
        targetUrl: config.portalTargetUrl,
        fetchHtmlPage
      });
    },

    async dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      await closePage(authPage);
      authPage = null;

      if (!sessionPromise) {
        return;
      }

      const session = await sessionPromise.catch(() => null);
      sessionPromise = null;

      if (!session) {
        return;
      }

      await closeBrowserSession(session);
    }
  };

  async function fetchHtmlPage(url, label, methodOverride) {
    const method = methodOverride || config.portalMethod;

    if (method !== "GET" && method !== "HEAD") {
      throw new Error("browser-html mode currently supports GET requests only.");
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const session = await getSession();
      let page = null;
      let keepOpen = false;

      try {
        page = await acquirePage(session);
        page.setDefaultNavigationTimeout(config.playwrightNavigationTimeoutMs);
        await page.bringToFront().catch(() => undefined);
        await page.goto(url, {
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
            "Browser session reached Microsoft login. Complete sign-in in the opened browser window, then retry."
          );
        }

        if (label === "HTML") {
          await seedPortalCookieCache(session);
        }

        return { html, finalUrl };
      } catch (error) {
        if (!keepOpen && authPage === page) {
          authPage = null;
        }

        if (shouldRecreateSession(error) && attempt === 0) {
          await resetSession();
          continue;
        }

        throw new Error(`${label} browser request failed: ${error.message}`);
      } finally {
        if (!keepOpen) {
          await closePage(page);
        }
      }
    }
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

  async function seedPortalCookieCache(session) {
    try {
      await capturePortalCookieCache(
        session,
        config.portalTargetUrl,
        config.portalCookieCacheFile,
        {
          sourceMode: "browser-html"
          }
      );
    } catch {
      return;
    }
  }
}

async function acquirePage(session) {
  return session.context.newPage();
}

function assertSupportedMethod(method) {
  if (method !== "GET" && method !== "HEAD") {
    throw new Error("browser-html mode only supports GET requests.");
  }
}
