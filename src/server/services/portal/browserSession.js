import { chromium } from "playwright-core";
import {
  detectBrowserExecutablePath,
  resolveBrowserCdpEndpoint,
  resolveDevToolsActivePortFile
} from "./browserExecutable.js";
import {
  prepareBrowserProfile,
  resolveBrowserProfilePaths
} from "./browserProfile.js";

export function describeBrowserSession(config) {
  const profilePaths = config.playwrightConnectToExisting
    ? null
    : resolveBrowserProfilePaths(config);
  const cdpEndpoint = config.playwrightConnectToExisting
    ? resolveBrowserCdpEndpoint({
        explicitEndpoint: config.playwrightCdpEndpoint,
        activePortFile: config.playwrightDevToolsActivePortFile,
        explicitExecutablePath: config.playwrightExecutablePath
      })
    : null;

  return {
    executablePath:
      detectBrowserExecutablePath(config.playwrightExecutablePath) || null,
    connectToExisting: config.playwrightConnectToExisting,
    cdpEndpoint,
    devToolsActivePortFile: config.playwrightConnectToExisting
      ? resolveDevToolsActivePortFile(
          config.playwrightDevToolsActivePortFile,
          config.playwrightExecutablePath
        )
      : null,
    userDataDir: config.playwrightConnectToExisting
      ? null
      : profilePaths?.launchUserDataDir || null,
    sourceUserDataDir: profilePaths?.sourceUserDataDir || null,
    mirroredDefaultProfile: profilePaths?.mirrorsDefaultProfile === true,
    headless: config.playwrightHeadless
  };
}

export async function createBrowserSession(config) {
  if (config.playwrightConnectToExisting) {
    return connectToExistingBrowser(config);
  }

  return launchContext(config);
}

export async function closeBrowserSession(session) {
  if (!session) {
    return;
  }

  if (session.type === "persistent") {
    await session.context.close().catch(() => undefined);
    return;
  }

  await session.browser.close().catch(() => undefined);
}

export async function closePage(page) {
  if (!page) {
    return;
  }

  await page.close().catch(() => undefined);
}

export async function closeSiblingBlankPages(context, activePage) {
  const blankPages = context
    .pages()
    .filter((page) => page !== activePage && page.url() === "about:blank");

  await Promise.all(blankPages.map((page) => closePage(page)));
}

export function shouldRecreateSession(error) {
  const message = String(error?.message || error).toLowerCase();

  return (
    message.includes("target page, context or browser has been closed") ||
    message.includes("browser has been closed") ||
    message.includes("context has been closed")
  );
}

async function launchContext(config) {
  const executablePath = detectBrowserExecutablePath(
    config.playwrightExecutablePath
  );

  if (!executablePath) {
    throw new Error(
      "No supported browser executable was found. Set PLAYWRIGHT_EXECUTABLE_PATH to Chrome or Chrome Beta."
    );
  }

  const profilePaths = prepareBrowserProfile(config);
  const userDataDir = profilePaths.launchUserDataDir;

  let context;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: config.playwrightHeadless,
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1100 },
      args: [
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });
  } catch (error) {
    const message = String(error?.message || error);

    if (message.includes("Opening in existing browser session")) {
      throw new Error(
        `Chrome Beta profile is already in use at ${userDataDir}. Close all Chrome Beta windows that use this profile, then retry.`
      );
    }

    if (
      message.includes(
        "DevTools remote debugging requires a non-default data directory"
      )
    ) {
      throw new Error(
        "Chrome blocked DevTools against the default profile. Retry with Chrome Beta fully closed so the app can launch its mirrored automation profile."
      );
    }

    throw error;
  }

  return {
    type: "persistent",
    context
  };
}

async function connectToExistingBrowser(config) {
  const endpoint = resolveBrowserCdpEndpoint({
    explicitEndpoint: config.playwrightCdpEndpoint,
    activePortFile: config.playwrightDevToolsActivePortFile,
    explicitExecutablePath: config.playwrightExecutablePath
  });

  if (!endpoint) {
    throw new Error(
      "No CDP endpoint was found. Open Chrome Beta with remote debugging enabled, or set PLAYWRIGHT_CDP_ENDPOINT."
    );
  }

  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0] || (await browser.newContext());

  return {
    type: "connected",
    browser,
    context
  };
}
