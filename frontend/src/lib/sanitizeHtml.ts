"use client";

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
