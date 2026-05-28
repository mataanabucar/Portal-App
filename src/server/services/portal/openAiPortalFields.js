const FIELD_SPECS = [
  {
    key: "Application",
    start: "Application",
    end: ["TT_GEL Sync request?", "Business", "Resources", "Stage |"],
    maxChars: 240
  },
  {
    key: "Business",
    start: "Business",
    end: ["Resources", "Business Instance Links", "Stage |", "Due Date"],
    maxChars: 280
  },
  {
    key: "Due Date",
    start: "Due Date",
    end: ["Request Details", "Assigned Lead"],
    maxChars: 80
  },
  {
    key: "Request Details",
    start: "Request Details",
    end: ["Assigned Lead", "Quick Hit Team", "Request History"],
    maxChars: 2400
  },
  {
    key: "Assigned Lead",
    start: "Assigned Lead",
    end: ["Quick Hit Team", "Request History", "Attachments", "Comments"],
    maxChars: 320
  },
  {
    key: "Request History",
    start: "Request History",
    end: ["Internal Notes", "Attachments", "Comments", "Close Request"],
    maxChars: 2400
  }
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
  if (record.openAiFields && typeof record.openAiFields === "object") {
    return sanitizeOpenAiFields(record.openAiFields, record);
  }

  return sanitizeOpenAiFields(
    extractOpenAiPortalFieldsFromText(
      record.detailPageFullContent || record.detailPageContent || ""
    ),
    record
  );
}

export function extractOpenAiPortalFieldsFromText(content) {
  const normalizedContent = normalizeText(content);

  return FIELD_SPECS.reduce((fields, spec) => {
    fields[spec.key] = extractFieldValue(normalizedContent, spec);
    return fields;
  }, {});
}

function sanitizeOpenAiFields(fields, record) {
  const normalizedFields = Object.fromEntries(
    FIELD_SPECS.map((spec) => [spec.key, normalizeText(fields?.[spec.key])])
  );

  if (!normalizedFields["Assigned Lead"]) {
    normalizedFields["Assigned Lead"] = normalizeText(record?.owner);
  }

  if (!normalizedFields["Due Date"]) {
    normalizedFields["Due Date"] = normalizeText(record?.dueDate);
  }

  if (!normalizedFields["Request Details"]) {
    normalizedFields["Request Details"] = clipText(record?.detail, 2400);
  }

  return normalizedFields;
}

function extractFieldValue(content, spec) {
  if (!content) {
    return "";
  }

  const startIndex = findLabelIndex(content, spec.start);

  if (startIndex < 0) {
    return "";
  }

  const afterLabelIndex = startIndex + spec.start.length;
  const rawValue = content.slice(afterLabelIndex);
  const endIndex = findNearestLabelIndex(rawValue, spec.end);
  const value = endIndex >= 0 ? rawValue.slice(0, endIndex) : rawValue;

  return cleanExtractedValue(value, spec.maxChars);
}

function findLabelIndex(content, label) {
  const exactIndex = content.indexOf(label);

  if (exactIndex >= 0) {
    return exactIndex;
  }

  return content.toLowerCase().indexOf(label.toLowerCase());
}

function findNearestLabelIndex(content, labels) {
  const indexes = labels
    .map((label) => findLabelIndex(content, label))
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function cleanExtractedValue(value, maxChars) {
  const normalizedValue = normalizeText(value)
    .replace(/^[|:,\-\s]+/, "")
    .replace(/[|:,\-\s]+$/, "");

  return clipText(normalizedValue, maxChars);
}

function clipText(value, maxChars) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > maxChars
    ? `${normalizedValue.slice(0, maxChars)}...`
    : normalizedValue;
}

function hasOpenAiFieldValue(record) {
  return Object.values(record).some((value) => normalizeText(value));
}

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
