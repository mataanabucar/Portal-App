import * as cheerio from "cheerio";
import { extractOpenAiPortalFieldsFromText } from "./openAiPortalFields.js";

export async function runHtmlPortalPipeline({
  config,
  source,
  targetUrl,
  fetchHtmlPage
}) {
  const initialOuterPage = await fetchHtmlPage(targetUrl, "HTML");
  assertNotMicrosoftLoginPage(initialOuterPage);

  const outerPage = await followAutoRedirectForms({
    page: initialOuterPage,
    fetchHtmlPage
  });
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
    normalizedUrl.includes("authna.benchmarkdigital.com") ||
    normalizedUrl.includes("/auth/realms/benchmarkteam/") ||
    normalizedHtml.includes("sign in to your account") ||
    normalizedHtml.includes("sign in to benchmarkteam")
  );
}

export function assertNotMicrosoftLoginPage(page) {
  if (isMicrosoftLoginPage(page)) {
    throw buildSignInRedirectError();
  }
}

export function buildSignInRedirectError() {
  return new Error(
    "Portal request redirected to sign-in. Provide an authenticated PORTAL_COOKIE or use browser-html mode."
  );
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

async function followAutoRedirectForms({ page, fetchHtmlPage }) {
  let currentPage = page;

  for (let idxRedirect = 0; idxRedirect < 3; idxRedirect += 1) {
    const redirectRequest = buildAutoRedirectRequest(currentPage);

    if (!redirectRequest) {
      return currentPage;
    }

    currentPage = await fetchHtmlPage(
      redirectRequest.url,
      "HTML redirect form",
      redirectRequest.request
    );
    assertNotMicrosoftLoginPage(currentPage);
  }

  return currentPage;
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
  const rawHref = selectHref(row, config.portalLinkSelector);
  const href = resolveHref(baseUrl, rawHref);
  const id = resolveRecordId({
    href,
    rawIdText: selectText(row, config.portalLinkSelector),
    index
  });

  return {
    id,
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

function resolveRecordId({ href, rawIdText, index }) {
  const editId = extractEditIdFromHref(href);

  if (editId) {
    return editId;
  }

  const visibleId = extractNumericId(rawIdText);

  if (visibleId) {
    return visibleId;
  }

  const pathId = extractPathIdFromHref(href);

  if (pathId) {
    return pathId;
  }

  return `row-${index + 1}`;
}

function extractEditIdFromHref(href) {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href);
    return (
      normalizeText(url.searchParams.get("EditID")) ||
      normalizeText(url.searchParams.get("editid"))
    );
  } catch (error) {
    const match = href.match(/[?&]editid=(\d+)/i);
    return match?.[1] || "";
  }
}

function extractNumericId(value) {
  const normalizedValue = normalizeText(value);
  return /^\d{4,}$/.test(normalizedValue) ? normalizedValue : "";
}

function extractPathIdFromHref(href) {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    return normalizeText(pathSegments.at(-1));
  } catch (error) {
    const pathMatch = href.match(/\/([^/?#]+)(?:[?#]|$)/);
    return normalizeText(pathMatch?.[1] || "");
  }
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

function buildAutoRedirectRequest(page) {
  const $ = cheerio.load(page.html);
  const form = $("#redirectForm").first();
  const action = form.attr("action") || "";
  const method = normalizeMethod(form.attr("method") || "GET");

  if (!form.length || !action || !hasAutoSubmitScript($)) {
    return null;
  }

  const formData = buildFormData($, form, page.finalUrl);
  const actionUrl = resolveHref(page.finalUrl, action);

  if (!actionUrl) {
    return null;
  }

  if (method === "GET") {
    const url = new URL(actionUrl);

    for (const [name, value] of formData.entries()) {
      url.searchParams.append(name, value);
    }

    return {
      url: url.toString(),
      request: {
        method
      }
    };
  }

  if (method === "POST") {
    return {
      url: actionUrl,
      request: {
        method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      }
    };
  }

  return null;
}

function hasAutoSubmitScript($) {
  return $("script")
    .toArray()
    .some((element) => /submit\s*\(/i.test($(element).html() || ""));
}

function buildFormData($, form, currentUrl) {
  const formData = new URLSearchParams();

  form.find("input, textarea, select").each((_idxField, element) => {
    const field = $(element);
    const name = field.attr("name");

    if (!name) {
      return;
    }

    const value = resolveFormFieldValue(field, element, currentUrl);
    formData.append(name, value);
  });

  return formData;
}

function resolveFormFieldValue(field, element, currentUrl) {
  const tagName = String(element?.tagName || element?.name || "").toLowerCase();
  const type = String(field.attr("type") || "").toLowerCase();
  const fieldId = String(field.attr("id") || "").toLowerCase();
  const fieldName = String(field.attr("name") || "").toLowerCase();

  if ((type === "checkbox" || type === "radio") && !field.attr("checked")) {
    return "";
  }

  if (tagName === "textarea") {
    return field.text() || "";
  }

  if (tagName === "select") {
    const selectedOption = field.find("option[selected]").first();
    const option = selectedOption.length
      ? selectedOption
      : field.find("option").first();

    return option.attr("value") || option.text() || "";
  }

  const value = field.attr("value") || "";

  if (!value && (fieldId === "currenturl" || fieldName === "currenturl")) {
    return currentUrl;
  }

  return value;
}

function normalizeMethod(value) {
  return String(value || "GET").trim().toUpperCase();
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
