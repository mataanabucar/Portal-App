import { startServer } from "../src/server/index.js";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { detectBrowserExecutablePath } from "../src/server/services/portal/browserExecutable.js";
import { buildOpenAiPortalPayload } from "../src/server/services/portal/openAiPortalFields.js";
import {
  clearPortalCookieCache,
  readPortalCookieCache
} from "../src/server/services/portal/portalCookieCache.js";

const ALLOWED_OPENAI_RECORD_KEYS = [
  "Application",
  "ID",
  "Business",
  "Due Date",
  "Detail",
  "Email Context",
  "IssueItem",
  "Owner",
  "Priority",
  "Request History",
  "Status",
  "Title"
];

async function run() {
  await runMockScenario();
  await runDashboardCachePersistenceScenario();
  await runLinkedHtmlScenario();
  await runIframeHtmlScenario();
  await runAutoRedirectFormScenario();
  await runCookieHtmlScenario();
  await runExpiredCookieAutoRefreshScenario();
  await runBrowserHtmlScenario();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.text();
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function runMockScenario() {
  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "mock",
    askProvider: "openai",
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const page = await fetchText(baseUrl);
    const health = await fetchJson(`${baseUrl}/api/health`);
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });
    const parser = await fetchJson(`${baseUrl}/api/portal/parse`, {
      method: "POST",
      body: JSON.stringify({
        focus: "List the main asks.",
        testchat: true
      })
    });
    const ask = await fetchJson(`${baseUrl}/api/ask`, {
      method: "POST",
      body: JSON.stringify({
        prompt: "What is the capital of Arizona? And what is the population?"
      })
    });
    const dashboard = await fetchJson(`${baseUrl}/api/dashboard`, {
      method: "POST",
      body: JSON.stringify({
        includeSummary: false,
        focus: "What matters today?",
        parserFocus: "Extract urgency and next action.",
        parserTestchat: false
      })
    });
    const parserPayload = JSON.parse(parser.parser.originalText);
    const privacyProbe = buildOpenAiPortalPayload([
      {
        id: "SAFE-1",
        title: "Safe title",
        status: "Open",
        owner: "Taylor",
        priority: "High",
        dueDate: "2026-06-30",
        detail: "Safe row summary",
        detailPageContent: "never-send-this",
        detailPageFullContent: "never-send-this-either"
      }
    ]);

    console.log("Page served:", page.includes("Portal Visualizer"));
    console.log("Health OK:", health.ok === true);
    console.log("Portal mode:", health.config.portal.mode);
    console.log("Record count:", preview.snapshot.recordCount);
    console.log(
      "Parser route OK:",
      parser.snapshot.recordCount === 3 && parser.parser.mode === "testchat"
    );
    console.log(
      "Parser request removed from response:",
      !Object.prototype.hasOwnProperty.call(parser.parser || {}, "request") &&
        typeof parser.parser.originalText === "string" &&
        parser.parser.originalText.length > 0
    );
    console.log(
      "Ask route OK:",
      ask.enabled === false &&
        ask.debug?.endpoint === "/api/ask" &&
        ask.debug?.mode === "direct"
    );
    console.log(
      "Dashboard route OK:",
      dashboard.snapshot.recordCount === 3 &&
        dashboard.parser.mode === "structured"
    );
    console.log(
      "Dashboard parser request removed from response:",
      !Object.prototype.hasOwnProperty.call(dashboard.parser || {}, "request") &&
        typeof dashboard.parser.originalText === "string" &&
        dashboard.parser.originalText.length > 0
    );
    console.log(
      "Disabled parser fallback shape OK:",
      Array.isArray(dashboard.parser.parsed?.items) &&
        dashboard.parser.parsed.items.length === 0 &&
        !Object.prototype.hasOwnProperty.call(dashboard.parser.parsed || {}, "overview")
    );
    console.log(
      "Dashboard record link retained:",
      dashboard.snapshot.records[0]?.id === "A-102" &&
        dashboard.snapshot.records[0]?.href ===
          "https://portal.example.test/request/A-102"
    );
    console.log(
      "Parser response version OK:",
      parser.parser.debug?.responseVersion === "2026-06-portal-parse-v4" &&
        dashboard.parser.debug?.responseVersion === "2026-06-portal-parse-v4"
    );
    console.log(
      "OpenAI payload fields OK:",
      hasOnlyAllowedOpenAiFields(parserPayload)
    );
    console.log(
      "OpenAI payload excludes transport-only fields:",
      !Object.prototype.hasOwnProperty.call(parserPayload.Records[0] || {}, "Href") &&
        !Object.prototype.hasOwnProperty.call(parserPayload.Records[0] || {}, "Requester")
    );
    console.log(
      "OpenAI payload excludes detail-page bodies:",
      !JSON.stringify(privacyProbe).includes("never-send-this") &&
        !JSON.stringify(privacyProbe).includes("never-send-this-either")
    );
  } finally {
    await dispose();
    await closeServer(server);
  }
}

async function runDashboardCachePersistenceScenario() {
  const dashboardCachePath = path.resolve(
    process.cwd(),
    ".local-state",
    "smoke-dashboard-cache.json"
  );
  const cachePayload = {
    cachedAt: "2026-06-02T12:00:00.000Z",
    healthPayload: {
      ok: true,
      config: {
        port: 0
      },
      now: "2026-06-02T12:00:00.000Z"
    },
    payload: {
      snapshot: {
        source: "mock",
        fetchedAt: "2026-06-02T12:00:00.000Z",
        recordCount: 1,
        records: [
          {
            id: "REQ-1",
            href: "https://portal.example.test/request/REQ-1",
            title: "Persist last dashboard state"
          }
        ]
      },
      summary: {
        enabled: true,
        summary: "Keep the current dashboard visible after relaunch."
      },
      parser: {
        mode: "structured",
        originalText: "{\"Records\":[]}",
        parsed: {
          items: [
            {
              title: "Persist last dashboard state",
              generatedAt: "2026-06-02T12:00:00.000Z",
              status: {
                label: "Needs investigation",
                tone: "warning"
              },
              priority: {
                label: "Normal Priority",
                tone: "normal"
              },
              due: {
                date: "11-Jun-26",
                relative: "In 9 day(s)",
                tone: "normal"
              },
              nextAction: "Restore the saved dashboard cache on startup.",
              summary: "Keep the current dashboard visible after relaunch.",
              deliverable: "Persist the latest parsed request state for the next launch.",
              blockersOpenQuestions: [],
              urgency: "Saved dashboard cache should remain available after restart.",
              keyDetails: [
                { label: "Request ID", value: "226263" },
                { label: "Related Action Item", value: "REQ-1" },
                { label: "Requester", value: "Not visible" },
                { label: "Application", value: "Portal Visualizer" },
                { label: "Business / Customer", value: "Not visible" },
                { label: "Request Type", value: "Not visible" },
                { label: "Origin", value: "Not visible" },
                { label: "Assigned Lead", value: "Not visible" },
                { label: "Due Date", value: "11-Jun-26" },
                { label: "Priority / Risk", value: "Normal / Not visible" },
                { label: "Attachments", value: "Not visible" },
                { label: "References / Fields", value: "dashboard cache" }
              ],
              requestHistorySignals: "No prior dashboard snapshot should be lost on restart.",
              confidence: {
                level: "High",
                reason: "The cached dashboard payload already contains the needed queue state."
              },
              footer: {
                requested: "02-Jun-2026 12:00",
                lastUpdated: "02-Jun-2026 12:00"
              }
            }
          ]
        }
      }
    },
    controls: {
      includeSummary: true,
      parserTestchat: false,
      focus: "Tell me what matters today.",
      parserFocus: "Extract urgency and next action."
    }
  };

  fs.rmSync(dashboardCachePath, { force: true });

  const firstHandle = startServer({
    port: 0,
    portalSourceMode: "mock",
    openAiEnabled: false,
    openAiApiKey: "",
    dashboardCacheFile: dashboardCachePath
  });

  try {
    await firstHandle.ready;

    const address = firstHandle.server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    await fetchJson(`${baseUrl}/api/dashboard/cache`, {
      method: "POST",
      body: JSON.stringify(cachePayload)
    });
  } finally {
    await firstHandle.dispose();
    await closeServer(firstHandle.server);
  }

  const secondHandle = startServer({
    port: 0,
    portalSourceMode: "mock",
    openAiEnabled: false,
    openAiApiKey: "",
    dashboardCacheFile: dashboardCachePath
  });

  try {
    await secondHandle.ready;

    const address = secondHandle.server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const cachedDashboard = await fetchJson(`${baseUrl}/api/dashboard/cache`);

    console.log(
      "Dashboard cache survives restart:",
      cachedDashboard?.payload?.snapshot?.recordCount === 1 &&
        cachedDashboard?.controls?.focus === "Tell me what matters today." &&
        cachedDashboard?.payload?.parser?.originalText ===
          "{\"Records\":[]}" &&
        cachedDashboard?.payload?.snapshot?.records?.[0]?.href ===
          "https://portal.example.test/request/REQ-1"
    );
  } finally {
    await secondHandle.dispose();
    await closeServer(secondHandle.server);
    fs.rmSync(dashboardCachePath, { force: true });
  }
}

async function runLinkedHtmlScenario() {
  const fauxPortal = await startFauxPortalServer();
  const portalUrl = `http://127.0.0.1:${fauxPortal.port}/requests`;

  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "http-html",
    portalTargetUrl: portalUrl,
    portalFrameSelector: "",
    portalItemSelector: "table tbody tr",
    portalLinkSelector: "td:nth-child(1) a",
    portalTitleSelector: "td:nth-child(1) a",
    portalStatusSelector: "td:nth-child(2)",
    portalDetailSelector: "td:nth-child(3)",
    portalOwnerSelector: "td:nth-child(4)",
    portalDateSelector: "td:nth-child(5)",
    portalFollowDetailLinks: true,
    portalMaxDetailPages: 2,
    portalDetailContentSelector: "#request-detail",
    portalDetailTitleSelector: "h1",
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });
    const parser = await fetchJson(`${baseUrl}/api/portal/parse`, {
      method: "POST",
      body: JSON.stringify({ focus: "Check assigned lead." })
    });
    const parserPayload = JSON.parse(parser.parser.originalText);

    console.log("HTML crawl mode:", preview.snapshot.source === "http-html");
    console.log(
      "Detail crawl OK:",
      preview.snapshot.records[0]?.detailPageTitle === "Request A-102" &&
        preview.snapshot.records[0]?.detailPageContent ===
          "Corrective action evidence still missing."
    );
    console.log(
      "Detail payload extraction OK:",
      preview.snapshot.records[0]?.application === "Action Tracking System" &&
        preview.snapshot.records[0]?.business === "Goodyear EHS" &&
        preview.snapshot.records[0]?.issueItem === "1229030" &&
        preview.snapshot.records[0]?.owner === "Avery Quinn" &&
        preview.snapshot.records[0]?.requestHistory?.includes(
          "1. Updated By Avery Quinn"
        ) &&
        parserPayload.Records[0]?.Owner === "Avery Quinn" &&
        parserPayload.Records[0]?.IssueItem === "1229030" &&
        parserPayload.Records[0]?.["Request History"]?.includes(
          "1. Updated By Avery Quinn"
        ) &&
        !parserPayload.Records[0]?.["Request History"]?.includes(
          "Request History Effort"
        )
    );
    console.log(
      "Detail link retained in client snapshot:",
      preview.snapshot.records[0]?.id === "A-102" &&
        preview.snapshot.records[0]?.href ===
        `http://127.0.0.1:${fauxPortal.port}/request/A-102`
    );
  } finally {
    await dispose();
    await closeServer(server);
    await closeServer(fauxPortal.server);
  }
}

async function runIframeHtmlScenario() {
  const fauxPortal = await startFauxPortalServer();
  const portalUrl = `http://127.0.0.1:${fauxPortal.port}/portal`;

  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "http-html",
    portalTargetUrl: portalUrl,
    portalFrameSelector: "iframe[src*='todolist']",
    portalItemSelector: "tr:has(a[href*='editid='])",
    portalLinkSelector: "a[href*='editid=']",
    portalTitleSelector: "a[href*='request/']",
    portalFollowDetailLinks: true,
    portalMaxDetailPages: 2,
    portalDetailContentSelector: "#request-detail",
    portalDetailTitleSelector: "h1",
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });
    const parser = await fetchJson(`${baseUrl}/api/portal/parse`, {
      method: "POST",
      body: JSON.stringify({ focus: "Check assigned lead." })
    });
    const parserPayload = JSON.parse(parser.parser.originalText);

    console.log(
      "Iframe crawl OK:",
      preview.snapshot.target.includes("/requests-frame?todolist=1") &&
        preview.snapshot.records[1]?.detailPageTitle === "Request A-118"
    );
    console.log(
      "Iframe detail payload extraction OK:",
      preview.snapshot.records[1]?.application === "Novolex Audit Assistant" &&
        preview.snapshot.records[1]?.business === "Novolex" &&
        preview.snapshot.records[1]?.issueItem === "1232413" &&
        preview.snapshot.records[1]?.owner === "Morgan Lee" &&
        parserPayload.Records[1]?.Owner === "Morgan Lee" &&
        parserPayload.Records[1]?.IssueItem === "1232413"
    );
    console.log(
      "Iframe action item IDs retained:",
      preview.snapshot.records[0]?.id === "1229030" &&
        preview.snapshot.records[1]?.id === "1232413"
    );
  } finally {
    await dispose();
    await closeServer(server);
    await closeServer(fauxPortal.server);
  }
}

async function runAutoRedirectFormScenario() {
  const fauxPortal = await startFauxPortalServer();
  const portalUrl = `http://127.0.0.1:${fauxPortal.port}/redirect-portal`;

  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "http-html",
    portalTargetUrl: portalUrl,
    portalFrameSelector: "iframe[src*='todolist']",
    portalItemSelector: "tr:has(a[href*='editid='])",
    portalLinkSelector: "a[href*='editid=']",
    portalTitleSelector: "a[href*='request/']",
    portalFollowDetailLinks: true,
    portalMaxDetailPages: 2,
    portalDetailContentSelector: "#request-detail",
    portalDetailTitleSelector: "h1",
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });

    console.log(
      "Auto-post redirect crawl OK:",
      preview.snapshot.target.includes("/requests-frame?todolist=1") &&
        preview.snapshot.records[0]?.detailPageTitle === "Request A-102"
    );
  } finally {
    await dispose();
    await closeServer(server);
    await closeServer(fauxPortal.server);
  }
}

async function runBrowserHtmlScenario() {
  const executablePath = detectBrowserExecutablePath();

  if (!executablePath) {
    console.log("Browser crawl skipped: no local browser executable detected.");
    return;
  }

  const fauxPortal = await startFauxPortalServer();
  const browserProfilePath = path.resolve(
    process.cwd(),
    ".local-browser",
    "smoke-browser-profile"
  );
  const browserCookieCachePath = path.resolve(
    process.cwd(),
    ".local-auth",
    "smoke-browser-cookie-cache.json"
  );

  fs.rmSync(browserProfilePath, { force: true, recursive: true });
  fs.rmSync(browserCookieCachePath, { force: true });
  clearPortalCookieCache(browserCookieCachePath);

  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "browser-html",
    portalTargetUrl: `http://127.0.0.1:${fauxPortal.port}/cookie-portal`,
    portalFrameSelector: "iframe[src*='todolist']",
    portalItemSelector: "tr:has(a[href*='editid='])",
    portalLinkSelector: "a[href*='editid=']",
    portalTitleSelector: "td:nth-child(2) a",
    portalDetailSelector: "td:nth-child(4)",
    portalDateSelector: "td:nth-child(5)",
    portalOwnerSelector: "td:nth-child(6)",
    portalFollowDetailLinks: true,
    portalMaxDetailPages: 2,
    portalDetailContentSelector: "#request-detail",
    portalDetailTitleSelector: "h1",
    portalCookieCacheFile: browserCookieCachePath,
    playwrightExecutablePath: executablePath,
    playwrightUserDataDir: browserProfilePath,
    playwrightConnectToExisting: false,
    playwrightHeadless: true,
    playwrightNavigationTimeoutMs: 30000,
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });
    const parser = await fetchJson(`${baseUrl}/api/portal/parse`, {
      method: "POST",
      body: JSON.stringify({ focus: "Check assigned lead." })
    });
    const parserPayload = JSON.parse(parser.parser.originalText);

    console.log(
      "Browser crawl OK:",
      preview.snapshot.source === "browser-html" &&
        preview.snapshot.records[0]?.detailPageTitle === "Request A-102" &&
        preview.snapshot.records[0]?.detailPageContent ===
          "Corrective action evidence still missing."
    );
    console.log(
      "Browser detail payload extraction OK:",
      preview.snapshot.records[0]?.application === "Action Tracking System" &&
        preview.snapshot.records[0]?.business === "Goodyear EHS" &&
        preview.snapshot.records[0]?.issueItem === "1229030" &&
        preview.snapshot.records[0]?.owner === "Avery Quinn" &&
        parserPayload.Records[0]?.Owner === "Avery Quinn" &&
        parserPayload.Records[0]?.IssueItem === "1229030"
    );
    console.log(
      "Browser action item ID retained:",
      preview.snapshot.records[0]?.id === "1229030"
    );
    const cachedCookie = readPortalCookieCache(browserCookieCachePath);
    console.log(
      "Browser cookie cache seeded:",
      cachedCookie?.cookieHeader?.includes("PortalAuth=valid") === true &&
        cachedCookie?.sourceMode === "browser-html"
    );
  } finally {
    await dispose();
    await closeServer(server);
    await closeServer(fauxPortal.server);
    fs.rmSync(browserProfilePath, { force: true, recursive: true });
    fs.rmSync(browserCookieCachePath, { force: true });
    clearPortalCookieCache(browserCookieCachePath);
  }
}

async function runCookieHtmlScenario() {
  const executablePath = detectBrowserExecutablePath();

  if (!executablePath) {
    console.log("Cookie-backed crawl skipped: no local browser executable detected.");
    return;
  }

  const fauxPortal = await startFauxPortalServer();
  const cookieCachePath = path.resolve(
    process.cwd(),
    ".local-auth",
    "smoke-portal-cookie-cache.json"
  );
  fs.rmSync(cookieCachePath, { force: true });
  clearPortalCookieCache(cookieCachePath);

  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "cookie-html",
    portalTargetUrl: `http://127.0.0.1:${fauxPortal.port}/cookie-portal`,
    portalCookieCacheFile: cookieCachePath,
    portalFrameSelector: "iframe[src*='cookie-todolist']",
    portalItemSelector: "tr:has(a[href*='editid='])",
    portalLinkSelector: "a[href*='editid=']",
    portalTitleSelector: "td:nth-child(2) a",
    portalDetailSelector: "td:nth-child(4)",
    portalDateSelector: "td:nth-child(5)",
    portalOwnerSelector: "td:nth-child(6)",
    portalFollowDetailLinks: true,
    portalMaxDetailPages: 2,
    portalDetailContentSelector: "#request-detail",
    portalDetailTitleSelector: "h1",
    playwrightExecutablePath: executablePath,
    playwrightUserDataDir: path.resolve(
      process.cwd(),
      ".local-browser",
      "smoke-cookie-profile"
    ),
    playwrightConnectToExisting: false,
    playwrightHeadless: true,
    playwrightNavigationTimeoutMs: 30000,
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });

    console.log(
      "Cookie-backed crawl OK:",
      preview.snapshot.source === "cookie-html" &&
        preview.snapshot.records[0]?.detailPageTitle === "Request A-102"
    );
    const cachedCookie = readPortalCookieCache(cookieCachePath);
    console.log(
      "Cookie cache file created:",
      fs.existsSync(cookieCachePath) &&
        cachedCookie?.cookieHeader?.includes("PortalAuth=valid") === true &&
        cachedCookie?.sourceMode === "cookie-html"
    );
  } finally {
    await dispose();
    await closeServer(server);
    await closeServer(fauxPortal.server);
    fs.rmSync(cookieCachePath, { force: true });
    clearPortalCookieCache(cookieCachePath);
    fs.rmSync(
      path.resolve(process.cwd(), ".local-browser", "smoke-cookie-profile"),
      { force: true, recursive: true }
    );
  }
}

async function runExpiredCookieAutoRefreshScenario() {
  const executablePath = detectBrowserExecutablePath();

  if (!executablePath) {
    console.log(
      "Expired-cookie auto-refresh crawl skipped: no local browser executable detected."
    );
    return;
  }

  const fauxPortal = await startFauxPortalServer();
  const cookieCachePath = path.resolve(
    process.cwd(),
    ".local-auth",
    "smoke-expired-portal-cookie-cache.json"
  );
  const profilePath = path.resolve(
    process.cwd(),
    ".local-browser",
    "smoke-expired-cookie-profile"
  );

  fs.rmSync(cookieCachePath, { force: true });
  clearPortalCookieCache(cookieCachePath);
  fs.mkdirSync(path.dirname(cookieCachePath), { recursive: true });
  fs.writeFileSync(
    cookieCachePath,
    JSON.stringify(
      {
        savedAt: "2026-06-04T15:00:00.000Z",
        targetUrl: `http://127.0.0.1:${fauxPortal.port}/cookie-redirect-portal`,
        sourceMode: "cookie-html",
        cookieHeader: "PortalAuth=stale",
        cookies: []
      },
      null,
      2
    )
  );

  const { server, ready, dispose } = startServer({
    port: 0,
    portalSourceMode: "cookie-html",
    portalTargetUrl: `http://127.0.0.1:${fauxPortal.port}/cookie-redirect-portal`,
    portalCookieCacheFile: cookieCachePath,
    portalFrameSelector: "iframe[src*='cookie-todolist']",
    portalItemSelector: "tr:has(a[href*='editid='])",
    portalLinkSelector: "a[href*='editid=']",
    portalTitleSelector: "td:nth-child(2) a",
    portalDetailSelector: "td:nth-child(4)",
    portalDateSelector: "td:nth-child(5)",
    portalOwnerSelector: "td:nth-child(6)",
    portalFollowDetailLinks: true,
    portalMaxDetailPages: 2,
    portalDetailContentSelector: "#request-detail",
    portalDetailTitleSelector: "h1",
    playwrightExecutablePath: executablePath,
    playwrightUserDataDir: profilePath,
    playwrightConnectToExisting: false,
    playwrightHeadless: true,
    playwrightNavigationTimeoutMs: 30000,
    openAiEnabled: false,
    openAiApiKey: ""
  });

  try {
    await ready;

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const preview = await fetchJson(`${baseUrl}/api/portal/preview`, {
      method: "POST",
      body: JSON.stringify({ includeSummary: false })
    });

    console.log(
      "Expired-cookie auto-refresh OK:",
      preview.snapshot.source === "cookie-html" &&
        preview.snapshot.records[0]?.detailPageTitle === "Request A-102"
    );
    const cachedCookie = readPortalCookieCache(cookieCachePath);
    console.log(
      "Expired-cookie cache recovered:",
      cachedCookie?.cookieHeader?.includes("PortalAuth=valid") === true &&
        cachedCookie?.sourceMode === "cookie-html"
    );
  } finally {
    await dispose();
    await closeServer(server);
    await closeServer(fauxPortal.server);
    fs.rmSync(cookieCachePath, { force: true });
    clearPortalCookieCache(cookieCachePath);
    fs.rmSync(profilePath, { force: true, recursive: true });
  }
}

async function startFauxPortalServer() {
  const server = http.createServer((request, response) => {
    if (request.url === "/redirect-portal") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildAutoRedirectPortalPage());
      return;
    }

    if (request.url === "/portal") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildOuterPortalPage());
      return;
    }

    if (
      request.url?.startsWith("/internaloredirect-cookie") &&
      request.method === "POST"
    ) {
      if (!request.headers.cookie?.includes("PortalAuth=valid")) {
        response.writeHead(400, { "Content-Type": "text/html" });
        response.end(buildBenchmarkTeamSignInPage());
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildCookieOuterPortalPage());
      return;
    }

    if (
      request.url?.startsWith("/internaloredirect") &&
      request.method === "POST"
    ) {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildOuterPortalPage());
      return;
    }

    if (request.url === "/cookie-portal") {
      response.writeHead(200, {
        "Content-Type": "text/html",
        "Set-Cookie": "PortalAuth=valid; Path=/; HttpOnly"
      });
      response.end(buildCookieOuterPortalPage());
      return;
    }

    if (request.url === "/cookie-redirect-portal") {
      response.writeHead(200, {
        "Content-Type": "text/html",
        "Set-Cookie": "PortalAuth=valid; Path=/; HttpOnly"
      });
      response.end(buildCookieRedirectPortalPage());
      return;
    }

    if (request.url === "/requests") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildRequestListPage());
      return;
    }

    if (request.url?.startsWith("/requests-frame")) {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildIframeListPage());
      return;
    }

    if (request.url?.startsWith("/cookie-requests-frame")) {
      if (!request.headers.cookie?.includes("PortalAuth=valid")) {
        response.writeHead(302, {
          Location:
            "https://login.microsoftonline.com/mock/oauth2/v2.0/authorize"
        });
        response.end();
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildCookieIframeListPage());
      return;
    }

    if (request.url?.startsWith("/request/A-102")) {
      if (
        request.url.includes("cookie=1") &&
        !request.headers.cookie?.includes("PortalAuth=valid")
      ) {
        response.writeHead(302, {
          Location:
            "https://login.microsoftonline.com/mock/oauth2/v2.0/authorize"
        });
        response.end();
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildDetailPage("Request A-102", "Corrective action evidence still missing."));
      return;
    }

    if (request.url?.startsWith("/request/A-118")) {
      if (
        request.url.includes("cookie=1") &&
        !request.headers.cookie?.includes("PortalAuth=valid")
      ) {
        response.writeHead(302, {
          Location:
            "https://login.microsoftonline.com/mock/oauth2/v2.0/authorize"
        });
        response.end();
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(buildDetailPage("Request A-118", "Supplier documentation is incomplete."));
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return { server, port };
}

function buildOuterPortalPage() {
  return `
    <html>
      <body>
        <h1>Benchmark Portal</h1>
        <iframe src="/requests-frame?todolist=1" title="To-Do List Items"></iframe>
      </body>
    </html>
  `;
}

function buildAutoRedirectPortalPage() {
  return `
    <html>
      <body>
        <form
          id="redirectForm"
          method="post"
          action="/internaloredirect"
        >
          <input type="hidden" id="currenturl" name="currenturl" value="" />
          <input type="hidden" name="cookiepath" value="/gsportal" />
        </form>
        <script>
          document.getElementById('redirectForm').submit();
        </script>
      </body>
    </html>
  `;
}

function buildCookieOuterPortalPage() {
  return `
    <html>
      <body>
        <h1>Benchmark Portal</h1>
        <iframe src="/cookie-requests-frame?cookie-todolist=1" title="To-Do List Items"></iframe>
      </body>
    </html>
  `;
}

function buildCookieRedirectPortalPage() {
  return `
    <html>
      <body>
        <form
          id="redirectForm"
          method="post"
          action="/internaloredirect-cookie"
        >
          <input type="hidden" id="currenturl" name="currenturl" value="" />
          <input type="hidden" name="cookiepath" value="/gsportal" />
        </form>
        <script>
          document.getElementById('redirectForm').submit();
        </script>
      </body>
    </html>
  `;
}

function buildBenchmarkTeamSignInPage() {
  return `
    <!DOCTYPE html>
    <html class="login-pf">
      <head>
        <meta charset="utf-8" />
        <title>Sign in to benchmarkteam</title>
      </head>
      <body>
        <main>
          <h1>Sign in to benchmarkteam</h1>
        </main>
      </body>
    </html>
  `;
}

function buildRequestListPage() {
  return `
    <html>
      <body>
        <table>
          <tbody>
            <tr>
              <td><a href="/request/A-102">Site inspection follow-up</a></td>
              <td>Open</td>
              <td>Waiting on evidence</td>
              <td>Jordan</td>
              <td>2026-05-24</td>
            </tr>
            <tr>
              <td><a href="/request/A-118">Supplier audit prep</a></td>
              <td>At Risk</td>
              <td>Missing portal packet documents</td>
              <td>Taylor</td>
              <td>2026-05-29</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function buildIframeListPage() {
  return `
    <html>
      <body>
        <table>
          <tbody>
            <tr>
              <td><a href="/request/A-102?editid=1229030">1229030</a></td>
              <td><a href="/request/A-102">Help Me! #201270</a></td>
              <td>Sensience Action Tracking System</td>
              <td>Update the risk categories available in Action Tracking System.</td>
              <td>Sun, 31-May-26</td>
              <td>Mataan Abucar</td>
              <td>Last: 20-May-26 Due: 23-May-26</td>
            </tr>
            <tr>
              <td><a href="/request/A-118?editid=1232413">1232413</a></td>
              <td><a href="/request/A-118">Help Me! #290955</a></td>
              <td>Novolex Audit Assistant</td>
              <td>Logging on behalf of John following a support call.</td>
              <td>Sat, 20-Jun-26</td>
              <td>Mataan Abucar</td>
              <td>Last: 21-May-26 Due: 24-May-26</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function buildCookieIframeListPage() {
  return `
    <html>
      <body>
        <table>
          <tbody>
            <tr>
              <td><a href="/request/A-102?editid=1229030&cookie=1">1229030</a></td>
              <td><a href="/request/A-102?cookie=1">Help Me! #201270</a></td>
              <td>Sensience Action Tracking System</td>
              <td>Update the risk categories available in Action Tracking System.</td>
              <td>Sun, 31-May-26</td>
              <td>Mataan Abucar</td>
              <td>Last: 20-May-26 Due: 23-May-26</td>
            </tr>
            <tr>
              <td><a href="/request/A-118?editid=1232413&cookie=1">1232413</a></td>
              <td><a href="/request/A-118?cookie=1">Help Me! #290955</a></td>
              <td>Novolex Audit Assistant</td>
              <td>Logging on behalf of John following a support call.</td>
              <td>Sat, 20-Jun-26</td>
              <td>Mataan Abucar</td>
              <td>Last: 21-May-26 Due: 24-May-26</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function buildDetailPage(title, detail) {
  const detailFixture =
    title === "Request A-118"
      ? {
          application: "Novolex Audit Assistant",
          business: "Novolex",
          businessDisplay:
            "Novolex - Business ID: 2001<br>(GSUSE1SQLAG08 - CC_Novolex)",
          assignedLead: "Morgan Lee",
          issueItem: "1232413",
          historyRows: [
            {
              sequence: "1.",
              message:
                "Updated By Morgan Lee\nWed 29-May-2026 09:15 AM US/ET\n\nSupplier documentation is incomplete.",
              effort: "0.50"
            },
            {
              sequence: "2.",
              message:
                "Updated By John Example\nTue 28-May-2026 04:10 PM US/ET\n\nFollowing up after the support call.",
              effort: "0.08"
            }
          ]
        }
      : {
          application: "Action Tracking System",
          business: "Goodyear EHS",
          businessDisplay:
            "Goodyear EHS - Business ID: 1995<br>(GSUSE1SQLAG05 - CC_Goodyear)",
          assignedLead: "Avery Quinn",
          issueItem: "1229030",
          historyRows: [
            {
              sequence: "1.",
              message:
                "Updated By Avery Quinn\nTue 02-Jun-2026 01:22 PM US/ET\n\nCorrective action evidence still missing.",
              effort: "0.08"
            },
            {
              sequence: "2.",
              message:
                "Updated By Jordan Smith\nTue 02-Jun-2026 08:43 AM US/ET\n\nWaiting on evidence from Plant 4.",
              effort: "0.50"
            }
          ]
        };

  return `
    <html>
      <body>
        <h1>${title}</h1>
        <div class="form-group">
          <label class="col-sm-3 control-label">Application</label>
          <div class="col-sm-6">
            <p class="form-control-static">${detailFixture.application}</p>
            <input type="hidden" name="AppItem" id="AppItem" value="${detailFixture.application}" data-appid="3" />
          </div>
        </div>
        <div class="form-group">
          <label class="col-sm-3 control-label">Business</label>
          <div class="col-sm-6">
            <p class="form-control-static">${detailFixture.businessDisplay}</p>
            <input type="hidden" name="BusItem" id="BusItem" value="${detailFixture.business}" />
          </div>
        </div>
        <input type="hidden" name="EditID" id="EditID" value="${detailFixture.issueItem}" />
        <select name="DevItem" id="DevItem" class="form-control input-sm chosen-required" style="display: none;">
          <option value="">Select Lead...</option>
          <option value="Avery Quinn"${detailFixture.assignedLead === "Avery Quinn" ? ' selected=""' : ""}>Avery Quinn</option>
          <option value="Morgan Lee"${detailFixture.assignedLead === "Morgan Lee" ? ' selected=""' : ""}>Morgan Lee</option>
        </select>
        <section id="request-detail">${detail}</section>
        <table id="aihistory">
          <tr>
            <td>Request History</td>
            <td>Effort</td>
          </tr>
          ${detailFixture.historyRows
            .map(
              (row) => `
                <tr>
                  <td>${row.sequence}</td>
                  <td>${row.message}</td>
                  <td>${row.effort}</td>
                </tr>
              `
            )
            .join("")}
        </table>
        <script>
          const jwtToken = "eyJmock.payload.signature";
          const jwtTokenKey = "0123456789ABCDEF0123456789ABCDEF";
        </script>
      </body>
    </html>
  `;
}

function hasOnlyAllowedOpenAiFields(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (JSON.stringify(Object.keys(payload).sort()) !== JSON.stringify(["Records"])) {
    return false;
  }

  if (!Array.isArray(payload.Records)) {
    return false;
  }

  return payload.Records.every((record) => {
    if (!record || typeof record !== "object") {
      return false;
    }

    const keys = Object.keys(record).sort();
    const allowedKeys = [...ALLOWED_OPENAI_RECORD_KEYS].sort();

    return JSON.stringify(keys) === JSON.stringify(allowedKeys);
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
