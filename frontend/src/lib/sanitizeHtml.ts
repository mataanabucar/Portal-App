"use client";

const BAMBOO_IMAGE_HOST_RE = /^https?:\/\/images\d+\.bamboohr\.com\//i;
const BAMBOO_IMAGE_PROXY_ENDPOINT = "/api/assistant/bamboo-image";

export function sanitizeHtmlContent(html: unknown): string {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(String(html ?? ""), "text/html");
  const disallowedTags = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
    "base",
  ]);

  for (const element of Array.from(documentNode.body.querySelectorAll("*"))) {
    if (disallowedTags.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        (attributeName === "href" ||
          attributeName === "src" ||
          attributeName === "xlink:href" ||
          attributeName === "action" ||
          attributeName === "formaction") &&
        /^(?:javascript|vbscript):/i.test(attributeValue)
      ) {
        element.removeAttribute(attribute.name);
      }
    }

    // Signed BambooHR photo URLs need the server proxy (it supplies the
    // referer and cookie the CDN expects), so route them through it.
    if (element.tagName.toLowerCase() === "img") {
      const src = (element.getAttribute("src") || "").trim();
      if (BAMBOO_IMAGE_HOST_RE.test(src)) {
        element.setAttribute(
          "src",
          `${BAMBOO_IMAGE_PROXY_ENDPOINT}?url=${encodeURIComponent(src)}`
        );
      }
    }
  }

  return documentNode.body.innerHTML || "";
}

export function looksLikeHtmlContent(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("<")) {
    return false;
  }

  return /<\/?[a-z][\s\S]*>/i.test(trimmed);
}
