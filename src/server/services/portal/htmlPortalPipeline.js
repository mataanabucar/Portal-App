import * as cheerio from "cheerio";
import { extractOpenAiPortalFieldsFromText } from "./openAiPortalFields.js";

export async function runHtmlPortalPipeline({
  config,
  source,
  targetUrl,
  fetchHtmlPage
}) {
  const outerPage = await fetchHtmlPage(targetUrl, "HTML");
  assertNotMicrosoftLoginPage(outerPage);

  const extractionTarget = await resolveExtractionTarget({
    config,
    outerPage,
    fetchHtmlPage
  });

  let records = extractRecords({
    config,
    html: extractionTarget.html,
    baseUrl: extractionTarget.baseUrl
  });

  if (config.portalFollowDetailLinks) {
    records = await enrichRecordsWithDetailPages({
      config,
      records,
      fetchHtmlPage
    });
  }

  return {
    source,
    target: extractionTarget.baseUrl,
    title: extractionTarget.title,
    records,
    raw: buildRawPreview(extractionTarget.html)
  };
}

export function isMicrosoftLoginPage({ url, html }) {
  const normalizedUrl = normalizeText(url).toLowerCase();
  const normalizedHtml = normalizeText(html).toLowerCase();

  return (
    normalizedUrl.includes("login.microsoftonline.com") ||
    normalizedHtml.includes("sign in to your account")
  );
}

export function assertNotMicrosoftLoginPage(page) {
  if (isMicrosoftLoginPage(page)) {
    throw new Error(
      "Portal request redirected to Microsoft login. Provide an authenticated PORTAL_COOKIE or use browser-html mode."
    );
  }
}

async function resolveExtractionTarget({ config, outerPage, fetchHtmlPage }) {
  if (!config.portalFrameSelector) {
    return {
      title: "Portal HTML snapshot",
      html: outerPage.html,
      baseUrl: outerPage.finalUrl
    };
  }

  const $ = cheerio.load(outerPage.html);
  const frameElement = $(config.portalFrameSelector).first();
  const frameSrc = frameElement.attr("src");

  if (!frameSrc) {
    throw new Error(
      `No iframe src found for PORTAL_FRAME_SELECTOR: ${config.portalFrameSelector}`
    );
  }

  const resolvedFrameUrl = resolveHref(outerPage.finalUrl, frameSrc);
  const framePage = await fetchHtmlPage(resolvedFrameUrl, "HTML iframe", "GET");
  assertNotMicrosoftLoginPage(framePage);

  return {
    title: "Portal HTML iframe snapshot",
    html: framePage.html,
    baseUrl: framePage.finalUrl
  };
}

function extractRecords({ config, html, baseUrl }) {
  const $ = cheerio.load(html);
  removeNonContentNodes($);

  if (!config.portalItemSelector) {
    const content = sanitizeExtractedText(
      $(config.portalContentSelector).first().text()
    );
    return [
      {
        title: "Page content",
        detail: content.slice(0, 4000)
      }
    ];
  }

  return $(config.portalItemSelector)
    .slice(0, config.portalMaxItems)
    .toArray()
    .map((element, index) => buildRecord({ $, config, element, index, baseUrl }))
    .filter((record) => record.detail || record.title);
}

function buildRecord({ $, config, element, index, baseUrl }) {
  const row = $(element);
  const title = selectText(row, config.portalTitleSelector);
  const detail =
    selectText(row, config.portalDetailSelector) || sanitizeExtractedText(row.text());
  const status = selectText(row, config.portalStatusSelector);
  const href = resolveHref(baseUrl, selectHref(row, config.portalLinkSelector));

  return {
    id: `row-${index + 1}`,
    title: title || selectText(row, "a") || `Record ${index + 1}`,
    status,
    owner: selectText(row, config.portalOwnerSelector),
    priority: selectText(row, config.portalPrioritySelector),
    dueDate: selectText(row, config.portalDateSelector),
    detail,
    href
  };
}

async function enrichRecordsWithDetailPages({ config, records, fetchHtmlPage }) {
  const detailLimit = Math.min(config.portalMaxDetailPages, records.length);
  const enrichedRecords = [...records];

  for (let index = 0; index < detailLimit; index += 1) {
    const record = enrichedRecords[index];

    if (!record?.href) {
      continue;
    }

    try {
      const detailPageResponse = await fetchHtmlPage(
        record.href,
        "Detail page",
        "GET"
      );
      assertNotMicrosoftLoginPage(detailPageResponse);

      const detailPage = extractDetailPage({
        config,
        html: detailPageResponse.html,
        fallbackTitle: record.title
      });

      enrichedRecords[index] = {
        ...record,
        href: detailPageResponse.finalUrl,
        detailPageTitle: detailPage.title,
        detailPageContent: detailPage.content,
        detailPageFullContent: detailPage.fullContent,
        owner: detailPage.assignedLead || record.owner,
        openAiFields: detailPage.openAiFields
      };
    } catch (error) {
      enrichedRecords[index] = {
        ...record,
        detailPageError: error.message
      };
    }
  }

  return enrichedRecords;
}

function extractDetailPage({ config, html, fallbackTitle }) {
  const $ = cheerio.load(html);
  removeNonContentNodes($);
  const assignedLead = selectFormValue($, "#DevItem");
  const title =
    selectDocumentText($, config.portalDetailTitleSelector) ||
    sanitizeExtractedText($("h1").first().text()) ||
    sanitizeExtractedText($("title").first().text()) ||
    fallbackTitle;

  const fullContent =
    selectDocumentText($, config.portalDetailContentSelector) ||
    sanitizeExtractedText($("body").text());
  const openAiFields = extractOpenAiPortalFieldsFromText(fullContent);

  if (assignedLead) {
    openAiFields["Assigned Lead"] = assignedLead;
  }

  return {
    title,
    content: fullContent.slice(0, config.portalDetailMaxChars),
    fullContent,
    assignedLead,
    openAiFields
  };
}

function selectText(row, selector) {
  return selector ? sanitizeExtractedText(row.find(selector).first().text()) : "";
}

function selectHref(row, selector) {
  if (selector) {
    return row.find(selector).first().attr("href") || null;
  }

  return row.find("a").first().attr("href") || null;
}

function selectDocumentText($, selector) {
  return selector ? sanitizeExtractedText($(selector).first().text()) : "";
}

function selectFormValue($, selector) {
  if (!selector) {
    return "";
  }

  const field = $(selector).first();

  if (!field.length) {
    return "";
  }

  const value = typeof field.val === "function" ? field.val() : null;

  if (typeof value === "string") {
    return sanitizeExtractedText(value);
  }

  if (Array.isArray(value) && value.length > 0) {
    return sanitizeExtractedText(value.join(", "));
  }

  return sanitizeExtractedText(field.attr("value") || "");
}

function resolveHref(baseUrl, href) {
  if (!href) {
    return null;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch (error) {
    return href;
  }
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildRawPreview(html) {
  const $ = cheerio.load(html);
  removeNonContentNodes($);

  return sanitizeExtractedText($("body").text() || $.root().text()).slice(0, 8000);
}

function removeNonContentNodes($) {
  $("script, style, noscript, template").remove();
}

function sanitizeExtractedText(value) {
  return redactSensitiveText(normalizeText(value));
}

function redactSensitiveText(value) {
  return value
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[REDACTED_SECRET]");
}
