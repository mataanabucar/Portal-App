import {
  buildSignInRedirectError,
  isMicrosoftLoginPage,
  runHtmlPortalPipeline
} from "./htmlPortalPipeline.js";

export function createHttpHtmlPortalSource(config) {
  return {
    describe() {
      return {
        mode: "http-html",
        target: config.portalTargetUrl || null,
        followDetailLinks: config.portalFollowDetailLinks
      };
    },

    async fetch() {
      assertTargetUrl(config);
      return runHtmlPortalPipeline({
        config,
        source: "http-html",
        targetUrl: config.portalTargetUrl,
        fetchHtmlPage: (url, label, methodOverride) =>
          fetchHtml(url, config, label, methodOverride)
      });
    }
  };
}

function buildHeadersForRequest(config, method, requestHeaders) {
  const headers = { ...config.portalHeaders, ...requestHeaders };

  if (shouldSendBody(method) && !hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = "application/json";
  }

  return config.portalCookie ? { ...headers, Cookie: config.portalCookie } : headers;
}

function shouldSendBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function assertTargetUrl(config) {
  if (!config.portalTargetUrl) {
    throw new Error("PORTAL_TARGET_URL is required for http-html mode.");
  }
}

async function fetchHtml(url, config, label, methodOverride) {
  const request = buildRequest(config, methodOverride);
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

function buildRequest(config, requestOverride) {
  if (
    requestOverride &&
    typeof requestOverride === "object" &&
    !Array.isArray(requestOverride)
  ) {
    const method = normalizeMethod(requestOverride.method || config.portalMethod);

    return {
      method,
      headers: buildHeadersForRequest(config, method, requestOverride.headers || {}),
      body:
        requestOverride.body ??
        (shouldSendBody(method) ? JSON.stringify(config.portalBody) : undefined)
    };
  }

  const method = normalizeMethod(requestOverride || config.portalMethod);

  return {
    method,
    headers: buildHeadersForRequest(config, method, {}),
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
