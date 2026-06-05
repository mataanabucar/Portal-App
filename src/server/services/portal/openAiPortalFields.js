const FIELD_SPECS = [
  ["ID", "id"],
  ["Title", "title"],
  ["Status", "status"],
  ["Priority", "priority"],
  ["Due Date", "dueDate"],
  ["Owner", "owner"],
  ["Application", "application"],
  ["Business", "business"],
  ["IssueItem", "issueItem"],
  ["Detail", "detail"],
  ["Request History", "requestHistory"]
];

export function buildOpenAiPortalPayload(records) {
  return {
    Records: Array.isArray(records)
      ? records
          .map((record) => extractOpenAiPortalFields(record))
          .filter((record) => hasOpenAiFieldValue(record))
      : []
  };
}

export function extractOpenAiPortalFields(record = {}) {
  return Object.fromEntries(
    FIELD_SPECS.map(([label, field]) => [label, normalizeFieldValue(record?.[field], field)])
  );
}

function hasOpenAiFieldValue(record) {
  return Object.values(record).some((value) => normalizeText(value));
}

function normalizeFieldValue(value, field) {
  if (field === "detail") {
    return clipText(value, 1200);
  }

  return normalizeText(value);
}

function clipText(value, maxChars) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > maxChars
    ? `${normalizedValue.slice(0, maxChars)}...`
    : normalizedValue;
}

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
