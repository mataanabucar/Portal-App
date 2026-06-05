const KEY_DETAIL_LABELS = [
  "Request ID",
  "Related Action Item",
  "Requester",
  "Application",
  "Business / Customer",
  "Request Type",
  "Origin",
  "Assigned Lead",
  "Due Date",
  "Priority / Risk",
  "Attachments",
  "References / Fields"
];

const KEY_DETAIL_FALLBACK_FIELDS = {
  "Request ID": "requestId",
  "Related Action Item": "relatedActionItem",
  Requester: "requester",
  Application: "application",
  "Business / Customer": "business",
  "Request Type": "requestType",
  Origin: "origin",
  "Assigned Lead": "assignedLead",
  "Due Date": "dueDate",
  "Priority / Risk": "priorityRisk",
  Attachments: "attachments",
  "References / Fields": "referencesFields"
};

const STATUS_TONES = new Set(["blocked", "warning", "active", "ready", "neutral"]);
const PRIORITY_TONES = new Set(["normal", "high", "low", "unknown"]);
const DUE_TONES = new Set(["normal", "soon", "overdue", "unknown"]);
const CONFIDENCE_LEVELS = new Set(["High", "Medium", "Low"]);

export { KEY_DETAIL_LABELS };

export function normalizePortalSummaryBatch(parsedValue, snapshot, generatedAt) {
  const snapshotRecords = Array.isArray(snapshot?.records) ? snapshot.records : [];
  const rawItems = Array.isArray(parsedValue?.items) ? parsedValue.items : [];

  if (snapshotRecords.length > 0 && rawItems.length !== snapshotRecords.length) {
    return { items: [] };
  }

  const items = snapshotRecords.length > 0
    ? snapshotRecords.map((record, index) =>
        normalizePortalSummaryItem(rawItems[index] || {}, record, generatedAt)
      )
    : rawItems.map((item) => normalizePortalSummaryItem(item, null, generatedAt));

  return { items };
}

function normalizePortalSummaryItem(item, snapshotRecord, generatedAt) {
  const snapshotContext = buildSnapshotContext(snapshotRecord);
  const blockersOpenQuestions = normalizeStringArray(item?.blockersOpenQuestions);
  const keyDetails = normalizeKeyDetails(item?.keyDetails, snapshotContext);
  const dueDate =
    normalizeText(item?.due?.date) || readKeyDetailValue(keyDetails, "Due Date");
  const dueTone = normalizeTone(
    item?.due?.tone,
    DUE_TONES,
    inferDueTone(dueDate)
  );
  const requested =
    normalizeText(item?.footer?.requested) || snapshotContext.requested;
  const lastUpdated =
    normalizeText(item?.footer?.lastUpdated) || snapshotContext.lastUpdated;
  const statusTone = normalizeTone(
    item?.status?.tone,
    STATUS_TONES,
    blockersOpenQuestions.length > 0 ? "blocked" : "neutral"
  );
  const priorityTone = normalizeTone(item?.priority?.tone, PRIORITY_TONES, "unknown");

  return {
    title: normalizeText(item?.title),
    generatedAt: normalizeGeneratedAt(generatedAt),
    status: {
      label: normalizeText(item?.status?.label) || fallbackStatusLabel(statusTone),
      tone: statusTone
    },
    priority: {
      label:
        normalizeText(item?.priority?.label) || fallbackPriorityLabel(priorityTone),
      tone: priorityTone
    },
    due: {
      date: dueDate,
      relative: normalizeText(item?.due?.relative) || buildRelativeDueLabel(dueDate),
      tone: dueTone
    },
    nextAction: normalizeText(item?.nextAction),
    summary: normalizeText(item?.summary),
    deliverable: normalizeText(item?.deliverable),
    blockersOpenQuestions,
    urgency: normalizeText(item?.urgency),
    keyDetails,
    requestHistorySignals: normalizeText(item?.requestHistorySignals),
    confidence: {
      level: normalizeConfidenceLevel(item?.confidence?.level),
      reason: normalizeText(item?.confidence?.reason)
    },
    footer: {
      requested,
      lastUpdated
    }
  };
}

function normalizeKeyDetails(value, snapshotContext) {
  const incomingValues = new Map();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const label = normalizeKeyDetailLabel(entry?.label);

      if (!label || incomingValues.has(label)) {
        continue;
      }

      incomingValues.set(label, normalizeText(entry?.value));
    }
  }

  return KEY_DETAIL_LABELS.map((label) => {
    const incomingValue = normalizeIncomingKeyDetailValue(incomingValues.get(label));
    const fallbackField = KEY_DETAIL_FALLBACK_FIELDS[label];
    const fallbackValue = normalizeText(snapshotContext[fallbackField]);

    return {
      label,
      value: incomingValue || fallbackValue || "Not visible"
    };
  });
}

function normalizeIncomingKeyDetailValue(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.toLowerCase() === "not visible" ? "" : normalizedValue;
}

function buildSnapshotContext(record = {}) {
  const detailText = normalizeText(record?.detail);
  const detailPageText = normalizeText(record?.detailPageContent);
  const requestHistory = normalizeText(record?.requestHistory);

  return {
    requestId:
      extractRequestId(record?.title, detailPageText) ||
      extractRequestId(detailText, detailPageText),
    relatedActionItem: normalizeText(record?.issueItem || record?.id),
    requester: extractRequester(detailPageText, detailText),
    application:
      normalizeText(record?.application) ||
      extractLabeledValue(detailPageText, "Application", [
        "Business",
        "Resources",
        "Stage",
        "Due Date"
      ]),
    business:
      normalizeText(record?.business) ||
      extractLabeledValue(detailPageText, "Business", [
        "Resources",
        "Stage",
        "Due Date"
      ]),
    requestType: extractLabeledValue(detailPageText, "Request Type", [
      "Pre-Proposal",
      "Request Evaluation",
      "Requires Customer Data Updates",
      "Risk Level",
      "Request Origin"
    ]),
    origin: extractLabeledValue(detailPageText, "Request Origin", [
      "Response Type",
      "Application",
      "Business"
    ]),
    assignedLead: normalizeText(record?.owner),
    dueDate:
      normalizeText(record?.dueDate) ||
      extractLabeledValue(detailPageText, "Due Date", [
        "Request Details",
        "Assigned Lead"
      ]),
    priorityRisk: buildPriorityRiskValue(record, detailPageText),
    attachments: "",
    referencesFields: "",
    requested: extractRequestedDate(detailPageText, detailText),
    lastUpdated: extractLastUpdated(detailText, requestHistory)
  };
}

function normalizeGeneratedAt(value) {
  const parsedValue = value ? new Date(value) : null;
  return !parsedValue || Number.isNaN(parsedValue.getTime())
    ? new Date().toISOString()
    : parsedValue.toISOString();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenValues = new Set();

  return value
    .map((entry) => normalizeText(entry))
    .filter((entry) => {
      if (!entry || seenValues.has(entry.toLowerCase())) {
        return false;
      }

      seenValues.add(entry.toLowerCase());
      return true;
    });
}

function normalizeTone(value, allowedValues, fallbackValue) {
  const normalizedValue = normalizeText(value).toLowerCase();
  return allowedValues.has(normalizedValue) ? normalizedValue : fallbackValue;
}

function normalizeConfidenceLevel(value) {
  const normalizedValue = normalizeText(value);
  return CONFIDENCE_LEVELS.has(normalizedValue) ? normalizedValue : "";
}

function normalizeKeyDetailLabel(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  return KEY_DETAIL_LABELS.find(
    (label) => label.toLowerCase() === normalizedValue.toLowerCase()
  ) || "";
}

function readKeyDetailValue(keyDetails, label) {
  const entry = Array.isArray(keyDetails)
    ? keyDetails.find((item) => item?.label === label)
    : null;

  return entry?.value === "Not visible" ? "" : normalizeText(entry?.value);
}

function fallbackStatusLabel(tone) {
  if (tone === "blocked") {
    return "Blocked";
  }

  if (tone === "warning") {
    return "Needs attention";
  }

  if (tone === "active") {
    return "In progress";
  }

  if (tone === "ready") {
    return "Ready";
  }

  return "";
}

function fallbackPriorityLabel(tone) {
  if (tone === "normal") {
    return "Normal Priority";
  }

  if (tone === "high") {
    return "High Priority";
  }

  if (tone === "low") {
    return "Low Priority";
  }

  return "";
}

function buildPriorityRiskValue(record, detailPageText) {
  const priority = normalizeText(record?.priority);
  const riskLevel = extractLabeledValue(detailPageText, "Risk Level", [
    "Request Origin",
    "Response Type",
    "Application"
  ]);

  if (priority && riskLevel) {
    return `${priority} / ${riskLevel}`;
  }

  return priority || riskLevel;
}

function extractRequestId(primaryText, fallbackText) {
  const match = `${normalizeText(primaryText)} ${normalizeText(fallbackText)}`.match(
    /#(\d{4,})/
  );
  return match?.[1] || "";
}

function extractRequester(detailPageText, detailText) {
  const detailPageMatch = detailPageText.match(
    /Requester\s+(.+?)\s+\d{2}-[A-Za-z]{3}-\d{4}(?:\s+\d{2}:\d{2})?/i
  );

  if (detailPageMatch?.[1]) {
    return normalizeText(detailPageMatch[1]);
  }

  const detailMatch = detailText.match(
    /\d{2}-[A-Za-z]{3}-\d{2}\s+(.+?)\s+[A-Z][A-Za-z0-9 ]+\s+Ext\./
  );

  return normalizeText(detailMatch?.[1]);
}

function extractLabeledValue(content, label, nextLabels) {
  const normalizedContent = normalizeText(content);

  if (!normalizedContent) {
    return "";
  }

  const safeLabel = escapeRegex(label);
  const safeNextLabels = nextLabels.map((entry) => escapeRegex(entry)).join("|");
  const pattern = safeNextLabels
    ? new RegExp(
        `${safeLabel}\\s+(.+?)(?=\\s+(?:${safeNextLabels})\\b|$)`,
        "i"
      )
    : new RegExp(`${safeLabel}\\s+(.+)$`, "i");

  return normalizeText(normalizedContent.match(pattern)?.[1]);
}

function extractRequestedDate(detailPageText, detailText) {
  const detailPageMatch = detailPageText.match(
    /Requester\s+.+?\s+(\d{2}-[A-Za-z]{3}-\d{4}(?:\s+\d{2}:\d{2})?)/i
  );

  if (detailPageMatch?.[1]) {
    return normalizeText(detailPageMatch[1]);
  }

  const detailMatch = detailText.match(/\b(\d{2}-[A-Za-z]{3}-\d{2,4})\b/);
  return normalizeText(detailMatch?.[1]);
}

function extractLastUpdated(detailText, requestHistoryText) {
  const detailMatch = detailText.match(/Last:\s*(\d{2}-[A-Za-z]{3}-\d{2,4})/i);

  if (detailMatch?.[1]) {
    return normalizeText(detailMatch[1]);
  }

  const historyMatch = requestHistoryText.match(
    /\b(\d{2}-[A-Za-z]{3}-\d{4}(?:\s+\d{2}:\d{2}\s+[AP]M\s+US\/ET)?)\b/
  );

  return normalizeText(historyMatch?.[1]);
}

function inferDueTone(value) {
  const dayDifference = getDueDateDayDifference(value);

  if (dayDifference === null) {
    return "unknown";
  }

  if (dayDifference <= 0) {
    return "overdue";
  }

  if (dayDifference <= 7) {
    return "soon";
  }

  return "normal";
}

function buildRelativeDueLabel(value) {
  const dayDifference = getDueDateDayDifference(value);

  if (dayDifference === null) {
    return "";
  }

  if (dayDifference === 0) {
    return "Due today";
  }

  if (dayDifference > 0) {
    return `In ${dayDifference} day(s)`;
  }

  return `${Math.abs(dayDifference)} day(s) overdue`;
}

function getDueDateDayDifference(value) {
  const parsedValue = parseDueDateValue(value);

  if (parsedValue === null) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parsedValue - todayUtc) / 86_400_000);
}

function parseDueDateValue(value) {
  const normalizedValue = normalizeText(value)
    .replace(/^due:\s*/i, "")
    .replace(/^[A-Za-z]{3},\s*/, "");

  if (!normalizedValue) {
    return null;
  }

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const monthMatch = normalizedValue.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);

  if (monthMatch) {
    const [, day, monthLabel, year] = monthMatch;
    const monthIndex = getMonthIndex(monthLabel);

    if (monthIndex !== null) {
      return Date.UTC(normalizeShortYear(Number(year)), monthIndex, Number(day));
    }
  }

  const fallbackValue = Date.parse(normalizedValue);
  return Number.isNaN(fallbackValue) ? null : fallbackValue;
}

function normalizeShortYear(value) {
  return value < 100 ? 2000 + value : value;
}

function getMonthIndex(value) {
  const monthIndexes = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11
  };

  return monthIndexes[String(value || "").toLowerCase()] ?? null;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
