import { runHtmlPortalPipeline } from "./htmlPortalPipeline.js";

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

function buildHeaders(config) {
  const headers = shouldSendBody(config.portalMethod)
    ? { "Content-Type": "application/json", ...config.portalHeaders }
    : config.portalHeaders;

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
  const method = methodOverride || config.portalMethod;
  const response = await fetch(url, {
    method,
    headers: buildHeaders(config),
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
