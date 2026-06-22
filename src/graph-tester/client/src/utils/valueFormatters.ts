// Pure presentation helpers ported from the original vanilla tester so the
// rendered output stays identical. No Graph or business logic here.

export function formatDateTime(value: unknown): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value as string);
  return Number.isNaN(parsed.valueOf()) ? String(value) : parsed.toLocaleString();
}

export function formatBytes(bytes: unknown): string {
  if (!Number.isFinite(bytes)) {
    return "Unknown size";
  }

  const value = bytes as number;
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatValueForCell(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function toDisplayLabel(key: string): string {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

export function trimPath(filePath: unknown): string {
  if (!filePath) {
    return "None";
  }
  const normalized = String(filePath).replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts.slice(Math.max(parts.length - 2, 0)).join("/");
}

export function stripHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCommaSeparatedValues(value: unknown): string[] {
  if (!value) {
    return [];
  }
  return String(value)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function formatSelectPickerSummary(
  selectedKnownCount: number,
  totalCount: number,
  customCount: number,
): string {
  if (selectedKnownCount === 0 && customCount === 0) {
    return `No fields selected (${totalCount} available)`;
  }
  if (customCount === 0) {
    return `${selectedKnownCount} of ${totalCount} fields selected`;
  }
  return `${selectedKnownCount} of ${totalCount} fields selected, ${customCount} custom`;
}

export function isScalarLike(value: unknown): boolean {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

export function hasUsableValue(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

// Mirrors the original DOMParser-based sanitizer so mail HTML bodies can be
// rendered with v-html without exposing scripts or event handlers.
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

  return documentNode.body.innerHTML || "No body content available.";
}
