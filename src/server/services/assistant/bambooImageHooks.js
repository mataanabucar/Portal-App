import http from "node:http";
import https from "node:https";

const BAMBOO_IMAGE_HOST_RE = /^images\d+\.bamboohr\.com$/i;
const BAMBOO_IMAGE_PLACEHOLDER_URL =
  "https://resources.bamboohr.com/images/photo_person_160x160.png";
const BAMBOO_IMAGE_PLACEHOLDER_RE =
  /^https:\/\/resources\.bamboohr\.com\/images\/photo_person_160x160\.png$/i;
const BAMBOO_IMAGE_URL_RE = /https:\/\/images\d+\.bamboohr\.com\/[^\s"'<>`)\]]+/gi;
const BAMBOO_IMAGE_PROMPT_RE =
  /\b(image|images|photo|photos|picture|pictures|headshot|headshots|avatar|avatars)\b/i;
const BAMBOO_IMAGE_HINT =
  'If the user wants BambooHR photos or images, include the real Bamboo image URLs where the images belong. Preserve each complete signed GET URL exactly as provided, including every query parameter such as Policy, Signature, and Key-Pair-Id; never shorten a photo URL to its path or strip its query string. Prefer HTML <img src="..."> markup or direct image URLs over placeholders, descriptions, or pseudo-code. Use the existing generic placeholder only when the source says that no personal photo is available.';
const DEFAULT_BAMBOO_IMAGE_REFERER = "https://benchmarkgensuite.bamboohr.com/";
const DEFAULT_BAMBOO_IMAGE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
const DEFAULT_BAMBOO_IMAGE_ACCEPT =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

export function createAssistantBambooImageHooks(config = {}) {
  const requestTimeoutMs = Number.parseInt(
    String(config?.bambooImageRequestTimeoutMs || config?.requestTimeoutMs || 20000),
    10
  );
  const cookie = normalizeText(config?.bambooImageCookie);
  const referer = normalizeText(config?.bambooImageReferer) || DEFAULT_BAMBOO_IMAGE_REFERER;
  const userAgent = normalizeText(config?.bambooImageUserAgent) || DEFAULT_BAMBOO_IMAGE_USER_AGENT;

  function describe() {
    return {
      enabled: true,
      timeoutMs: requestTimeoutMs,
      hasCookie: Boolean(cookie),
      referer,
    };
  }

  function augmentPrompt(prompt) {
    const cleanPrompt = normalizeText(prompt);
    if (!cleanPrompt || !looksLikeImagePrompt(cleanPrompt)) {
      return cleanPrompt;
    }
    if (cleanPrompt.includes(BAMBOO_IMAGE_HINT)) {
      return cleanPrompt;
    }
    return `${cleanPrompt}\n\n${BAMBOO_IMAGE_HINT}`;
  }

  function rewriteAssistantPayload({ prompt = "", payload = {} }) {
    const cleanPrompt = normalizeText(prompt);
    const originalAnswer = toText(payload.answer ?? payload.content);
    const originalContent = toText(payload.content ?? payload.answer);
    const originalBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
    const discoveredImageUrls = uniqueValues([
      ...extractBambooImageUrls(originalAnswer),
      ...extractBambooImageUrls(originalContent),
      ...collectBambooImageUrlsFromBlocks(originalBlocks),
    ]);

    const rewrittenBlocks = originalBlocks.map((block) =>
      rewriteResponseBlock(block, discoveredImageUrls)
    );
    const rewrittenAnswer = convertInlineImageTagsToMarkdown(
      rewriteBambooUrlsInText(originalAnswer, discoveredImageUrls)
    );
    const rewrittenContent = convertInlineImageTagsToMarkdown(
      rewriteBambooUrlsInText(originalContent, discoveredImageUrls)
    );
    const alreadyVisualizesImages =
      rewrittenBlocks.some((block) => block?.type === "image") ||
      rewrittenBlocks.some(
        (block) =>
          (block?.type === "text" || block?.type === "summary") &&
          containsVisualImageMarkup(block.text)
      ) ||
      containsVisualImageMarkup(rewrittenAnswer) ||
      containsVisualImageMarkup(rewrittenContent);

    if (looksLikeImagePrompt(cleanPrompt) && !alreadyVisualizesImages && discoveredImageUrls.length > 0) {
      for (const imageUrl of discoveredImageUrls) {
        rewrittenBlocks.push({
          type: "image",
          url: buildProxyUrl(imageUrl),
          alt: "BambooHR image",
        });
      }
    }

    return {
      ...payload,
      answer: rewrittenAnswer,
      content: rewrittenContent,
      blocks: rewrittenBlocks,
    };
  }

  async function fetchImage(requestedUrl) {
    const normalizedUrl = normalizeBambooImageUrl(requestedUrl);
    if (!normalizedUrl) {
      throw createBambooImageError("A Bamboo image URL is required.", 400);
    }

    if (!isBambooImageUrl(normalizedUrl)) {
      throw createBambooImageError("Only BambooHR image URLs are allowed.", 400);
    }

    let upstreamResult = await fetchUpstreamImage(normalizedUrl);

    // Bare employee paths can be present when the source omits BambooHR's
    // signed query string. Keep the chart image valid by using the same
    // placeholder the source uses when that photo cannot be retrieved.
    if (
      (upstreamResult.statusCode < 200 || upstreamResult.statusCode >= 300) &&
      isBambooEmployeeImageUrl(normalizedUrl)
    ) {
      upstreamResult = await fetchUpstreamImage(BAMBOO_IMAGE_PLACEHOLDER_URL);
    }

    if (upstreamResult.statusCode < 200 || upstreamResult.statusCode >= 300) {
      const detail = bufferToText(upstreamResult.buffer);
      throw createBambooImageError(
        `Bamboo image request failed with ${upstreamResult.statusCode} ${upstreamResult.statusText}. ${detail.slice(0, 160)}`.trim(),
        upstreamResult.statusCode || 502
      );
    }

    return buildImageResult(upstreamResult);
  }

  async function fetchPlaceholder() {
    const upstreamResult = await fetchUpstreamImage(BAMBOO_IMAGE_PLACEHOLDER_URL);
    if (upstreamResult.statusCode < 200 || upstreamResult.statusCode >= 300) {
      throw createBambooImageError(
        `Bamboo image placeholder request failed with ${upstreamResult.statusCode} ${upstreamResult.statusText}.`,
        upstreamResult.statusCode || 502
      );
    }

    return buildImageResult(upstreamResult);
  }

  async function fetchUpstreamImage(url) {
    const headers = buildFetchHeaders({ cookie, referer, userAgent });
    try {
      return await fetchWithNodeFetch(url, {
        headers,
        timeoutMs: requestTimeoutMs,
      });
    } catch (error) {
      console.warn(
        "[assistant-bamboo-image] fetch() failed, retrying with TLS-relaxed request:",
        error?.message || error
      );
      try {
        return await fetchWithHttpsFallback(url, {
          headers,
          timeoutMs: requestTimeoutMs,
          rejectUnauthorized: false,
        });
      } catch (fallbackError) {
        const reason =
          fallbackError?.message || error?.message || "Bamboo image request failed.";
        throw createBambooImageError(reason, 502);
      }
    }
  }

  function buildImageResult(upstreamResult) {
    const contentType = resolveImageContentType(
      upstreamResult.headers["content-type"],
      upstreamResult.buffer
    );
    if (!contentType) {
      throw createBambooImageError(
        "Bamboo image request did not return an image.",
        502
      );
    }

    return {
      buffer: upstreamResult.buffer,
      contentType,
      cacheControl: upstreamResult.headers["cache-control"] || "private, max-age=300",
      etag: upstreamResult.headers.etag || "",
      lastModified: upstreamResult.headers["last-modified"] || "",
      contentLength: upstreamResult.buffer.length,
    };
  }

  return {
    describe,
    augmentPrompt,
    rewriteAssistantPayload,
    fetchImage,
    fetchPlaceholder,
  };
}

export function augmentPromptForBambooImages(prompt) {
  const cleanPrompt = normalizeText(prompt);
  if (!cleanPrompt || !looksLikeImagePrompt(cleanPrompt) || cleanPrompt.includes(BAMBOO_IMAGE_HINT)) {
    return cleanPrompt;
  }
  return `${cleanPrompt}\n\n${BAMBOO_IMAGE_HINT}`;
}

function rewriteResponseBlock(block, discoveredImageUrls) {
  if (!block || typeof block !== "object") {
    return block;
  }

  switch (block.type) {
    case "text":
    case "summary":
      return {
        ...block,
        text: convertInlineImageTagsToMarkdown(
          rewriteBambooUrlsInText(block.text, discoveredImageUrls)
        ),
      };
    case "table":
      return {
        ...block,
        title: rewriteBambooUrlsInText(block.title),
        rows: Array.isArray(block.rows)
          ? block.rows.map((row) =>
              Array.isArray(row)
                ? row.map((cell) => rewriteBambooUrlsInText(cell, discoveredImageUrls))
                : row
            )
          : block.rows,
      };
    case "chart":
      return block?.table
        ? {
            ...block,
            title: rewriteBambooUrlsInText(block.title),
            table: rewriteResponseBlock(block.table, discoveredImageUrls),
          }
        : {
            ...block,
            title: rewriteBambooUrlsInText(block.title),
          };
    case "image":
      return isBambooImageUrl(block.url)
        ? {
            ...block,
            url: buildProxyUrl(block.url),
          }
        : block;
    default:
      return block;
  }
}

function buildFetchHeaders({ cookie, referer, userAgent }) {
  const headers = {
    Accept: DEFAULT_BAMBOO_IMAGE_ACCEPT,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: referer,
    "User-Agent": userAgent,
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}

async function fetchWithNodeFetch(url, { headers, timeoutMs }) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return {
    statusCode: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

function fetchWithHttpsFallback(
  url,
  { headers, timeoutMs, rejectUnauthorized, redirectsRemaining = 3 }
) {
  const parsedUrl = new URL(url);
  const requestImpl = parsedUrl.protocol === "http:" ? http.request : https.request;

  return new Promise((resolve, reject) => {
    const request = requestImpl(
      parsedUrl,
      {
        method: "GET",
        headers,
        rejectUnauthorized,
      },
      (response) => {
        const statusCode = Number(response.statusCode || 0);
        const location = normalizeText(response.headers.location);
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          location &&
          redirectsRemaining > 0
        ) {
          response.resume();
          const nextUrl = new URL(location, parsedUrl).toString();
          fetchWithHttpsFallback(nextUrl, {
            headers,
            timeoutMs,
            rejectUnauthorized,
            redirectsRemaining: redirectsRemaining - 1,
          }).then(resolve, reject);
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            statusCode,
            statusText: normalizeText(response.statusMessage) || "OK",
            headers: normalizeNodeHeaders(response.headers),
            buffer: Buffer.concat(chunks),
          });
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Bamboo image request timed out."));
    });
    request.on("error", reject);
    request.end();
  });
}

function rewriteBambooUrlsInText(value, discoveredImageUrls = []) {
  if (typeof value !== "string" || !value) {
    return toText(value);
  }

  const seen = new Set(discoveredImageUrls.map((entry) => normalizeBambooImageUrl(entry)));
  return value.replace(BAMBOO_IMAGE_URL_RE, (match) => {
    const normalizedUrl = normalizeBambooImageUrl(match);
    if (!normalizedUrl) {
      return match;
    }
    seen.add(normalizedUrl);
    return buildProxyUrl(normalizedUrl);
  });
}

function extractBambooImageUrls(value) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  const matches = [];
  for (const match of value.matchAll(BAMBOO_IMAGE_URL_RE)) {
    const normalizedUrl = normalizeBambooImageUrl(match[0]);
    if (normalizedUrl && isBambooImageUrl(normalizedUrl)) {
      matches.push(normalizedUrl);
    }
  }
  return uniqueValues(matches);
}

function collectBambooImageUrlsFromBlocks(blocks) {
  const discovered = [];

  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (!block || typeof block !== "object") {
      continue;
    }

    if (block.type === "text" || block.type === "summary") {
      discovered.push(...extractBambooImageUrls(block.text));
      continue;
    }

    if (block.type === "table") {
      discovered.push(...extractBambooImageUrls(block.title));
      for (const row of Array.isArray(block.rows) ? block.rows : []) {
        for (const cell of Array.isArray(row) ? row : []) {
          discovered.push(...extractBambooImageUrls(cell));
        }
      }
      continue;
    }

    if (block.type === "chart") {
      discovered.push(...extractBambooImageUrls(block.title));
      discovered.push(...collectBambooImageUrlsFromBlocks(block.table ? [block.table] : []));
      continue;
    }

    if (block.type === "image" && isBambooImageUrl(block.url)) {
      discovered.push(normalizeBambooImageUrl(block.url));
    }
  }

  return uniqueValues(discovered);
}

function buildProxyUrl(rawUrl) {
  const normalizedUrl = normalizeBambooImageUrl(rawUrl);
  return isBambooImageUrl(normalizedUrl)
    ? `/api/assistant/bamboo-image?url=${encodeURIComponent(normalizedUrl)}`
    : toText(rawUrl);
}

function normalizeBambooImageUrl(value) {
  const normalized = normalizeText(value).replace(/&amp;/gi, "&");
  // Mermaid/Markdown responses can leave a closing code-fence backtick
  // attached to the signed URL. It is not part of BambooHR's signature.
  return normalized.replace(/(?:%60|`)+$/gi, "");
}

function resolveImageContentType(rawContentType, buffer) {
  const headerContentType = normalizeText(rawContentType).split(";", 1)[0].toLowerCase();
  if (headerContentType.startsWith("image/")) {
    return headerContentType;
  }

  if (buffer?.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer?.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buffer?.length >= 6 && buffer.subarray(0, 6).toString("ascii").match(/^GIF8/)) {
    return "image/gif";
  }
  if (
    buffer?.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  const textPrefix = buffer?.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  if (textPrefix?.startsWith("<svg") || (textPrefix?.startsWith("<?xml") && textPrefix.includes("<svg"))) {
    return "image/svg+xml";
  }

  return "";
}

function isBambooImageUrl(value) {
  return isBambooEmployeeImageUrl(value) || BAMBOO_IMAGE_PLACEHOLDER_RE.test(value);
}

function isBambooEmployeeImageUrl(value) {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      BAMBOO_IMAGE_HOST_RE.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function looksLikeImagePrompt(prompt) {
  return BAMBOO_IMAGE_PROMPT_RE.test(prompt);
}

const INLINE_IMAGE_TAG_RE = /<img\b[^>]*>(?:\s*<\/img\s*>)?/gi;
const SKIP_CODE_SEGMENT_RE = /```[\s\S]*?(?:```|$)|`[^`\n]*`/g;
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(/;

// Bare inline <img> markup cannot render inside the frontend's markdown text,
// so convert each tag to markdown image syntax in place. That keeps a photo
// next to the name it belongs to instead of collecting photos at the end.
function convertInlineImageTagsToMarkdown(value) {
  const text = toText(value);
  if (!text || !/<img\b/i.test(text)) {
    return text;
  }

  // Leave code fences and inline code spans untouched: ```html fences render
  // through the frontend HTML preview and other code is displayed literally.
  let result = "";
  let lastIndex = 0;
  for (const segment of text.matchAll(SKIP_CODE_SEGMENT_RE)) {
    const index = segment.index ?? 0;
    result += replaceInlineImageTags(text.slice(lastIndex, index));
    result += segment[0];
    lastIndex = index + segment[0].length;
  }
  result += replaceInlineImageTags(text.slice(lastIndex));
  return result;
}

function replaceInlineImageTags(segment) {
  return segment.replace(INLINE_IMAGE_TAG_RE, (tag) => {
    const imageUrl = resolveInlineImageUrl(readImageTagAttribute(tag, "src"));
    if (!imageUrl) {
      return "";
    }
    const alt = (readImageTagAttribute(tag, "alt") || "BambooHR image").replace(
      /[[\]]/g,
      " "
    );
    return `![${alt}](<${imageUrl}>)`;
  });
}

function readImageTagAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i")
  );
  return normalizeText(match?.[1] ?? match?.[2] ?? match?.[3]);
}

function resolveInlineImageUrl(value) {
  const decoded = normalizeText(value).replace(/&amp;/gi, "&");
  if (!decoded) {
    return "";
  }
  if (isBambooImageUrl(decoded)) {
    return buildProxyUrl(decoded);
  }
  if (/^https?:\/\//i.test(decoded)) {
    return decoded;
  }
  if (decoded.startsWith("/") && !decoded.startsWith("//")) {
    return decoded;
  }
  return "";
}

function containsVisualImageMarkup(value) {
  return (
    typeof value === "string" &&
    (MARKDOWN_IMAGE_RE.test(value) || value.includes("```html"))
  );
}

function uniqueValues(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function normalizeText(value) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function toText(value) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function createBambooImageError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeNodeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(", ");
      continue;
    }
    if (typeof value === "string") {
      normalized[key.toLowerCase()] = value;
    }
  }
  return normalized;
}

function bufferToText(buffer) {
  if (!buffer || buffer.length === 0) {
    return "";
  }

  return buffer.toString("utf8");
}
