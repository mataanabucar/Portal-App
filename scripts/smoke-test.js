import { startServer } from "../src/server/index.js";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { detectBrowserExecutablePath } from "../src/server/services/portal/browserExecutable.js";
import {
  clearPortalCookieCache,
  readPortalCookieCache
} from "../src/server/services/portal/portalCookieCache.js";

const ALLOWED_OPENAI_RECORD_KEYS = [
  "Application",
  "Business",
  "Due Date",
  "Request Details",
  "Assigned Lead",
  "Request History"
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

    console.log("Page served:", page.includes("Portal Visualizer"));
    console.log("Health OK:", health.ok === true);
    console.log("Portal mode:", health.config.portal.mode);
    console.log("Record count:", preview.snapshot.recordCount);
    console.log(
      "Parser route OK:",
      parser.snapshot.recordCount === 3 && parser.parser.mode === "testchat"
    );
    console.log(
      "Dashboard route OK:",
      dashboard.snapshot.recordCount === 3 &&
        dashboard.parser.mode === "structured"
    );
    console.log(
      "OpenAI payload fields OK:",
      hasOnlyAllowedOpenAiFields(parserPayload)
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
        parsed: {
          items: [
            {
              id: "REQ-1",
              title: "Persist last dashboard state",
              urgency: "high",
              nextAction: "Restore the saved dashboard cache on startup.",
              blockers: []
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
        cachedDashboard?.controls?.focus === "Tell me what matters today."
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
      "Assigned lead from DevItem OK:",
      preview.snapshot.records[0]?.owner === "Avery Quinn" &&
        parserPayload.Records[0]?.["Assigned Lead"] === "Avery Quinn"
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
      "Iframe assigned lead from DevItem OK:",
      preview.snapshot.records[1]?.owner === "Morgan Lee" &&
        parserPayload.Records[1]?.["Assigned Lead"] === "Morgan Lee"
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
      "Browser assigned lead from DevItem OK:",
      preview.snapshot.records[0]?.owner === "Avery Quinn" &&
        parserPayload.Records[0]?.["Assigned Lead"] === "Avery Quinn"
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
  const assignedLead = title === "Request A-118" ? "Morgan Lee" : "Avery Quinn";

  return `
    <html>
      <body>
        <h1>${title}</h1>
        <input id="DevItem" value="${assignedLead}" />
        <section id="request-detail">${detail}</section>
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
