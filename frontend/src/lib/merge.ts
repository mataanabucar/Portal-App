// Ported from public/app.js — the snapshot + parsed-item merge that the vanilla
// frontend performs before rendering. The backend normalizer already fills
// keyDetails / due / status / priority / confidence / footer with snapshot
// fallbacks, so this layer focuses on what app.js derives client-side:
//   - pairing each parsed item with its parallel snapshot record (id / href)
//   - resolving a human display title (with summary / snapshot fallbacks)
//   - deriving the card-level urgency tone
//   - mapping the model's free-text `urgency` onto `urgencyText`
//   - a pure-snapshot fallback path when parser output isn't usable
//
// Source references are noted as app.js:<line> from the original file.

import type {
  DashboardCardItem,
  DashboardResponse,
  KeyDetailRow,
  ParsedPortalItem,
  PortalRecord,
  PriorityTone,
  StatusTone,
  DueTone,
  ConfidenceLevel,
  UrgencyLevel,
} from "./types";
import { KEY_DETAIL_LABELS } from "./types";

const STATUS_TONES: StatusTone[] = [
  "blocked",
  "warning",
  "active",
  "ready",
  "neutral",
];
const PRIORITY_TONES: PriorityTone[] = ["normal", "high", "low", "unknown"];
const DUE_TONES: DueTone[] = ["normal", "soon", "overdue", "unknown"];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["High", "Medium", "Low"];
const URGENCY_LEVELS: UrgencyLevel[] = ["critical", "high", "normal", "low"];

// ── Entry point (app.js:248 buildTodoItems) ─────────────────────────────────
export function buildCardItems(payload: DashboardResponse): DashboardCardItem[] {
  const snapshotRecords = Array.isArray(payload.snapshot?.records)
    ? payload.snapshot.records
    : [];

  const parsedItems = payload.parser?.parsed?.items;

  if (
    payload.parser?.mode === "structured" &&
    Array.isArray(parsedItems) &&
    parsedItems.length === snapshotRecords.length &&
    parsedItems.length > 0
  ) {
    return buildStructuredCardItems(parsedItems, snapshotRecords);
  }

  return snapshotRecords.map((record, index) =>
    normalizeSnapshotCard(record, index)
  );
}

// app.js:265 buildStructuredTodoItems
function buildStructuredCardItems(
  parsedItems: ParsedPortalItem[],
  snapshotRecords: PortalRecord[]
): DashboardCardItem[] {
  if (snapshotRecords.length === 0) {
    return parsedItems.map((item, index) =>
      normalizeParsedCard(item, null, index)
    );
  }

  return snapshotRecords.map((record, index) =>
    normalizeParsedCard(parsedItems[index], record, index)
  );
}

// app.js:275 normalizeParsedTodo
function normalizeParsedCard(
  item: Partial<ParsedPortalItem> = {},
  snapshotRecord: PortalRecord | null = null,
  index = 0
): DashboardCardItem {
  const snapshotCard = snapshotRecord
    ? normalizeSnapshotCard(snapshotRecord, index)
    : null;
  const parsedBlockers = normalizeBlockers(item.blockersOpenQuestions);
  const fallbackBlockers = snapshotCard?.blockersOpenQuestions ?? [];

  const dueDate =
    item?.due?.date ||
    readKeyDetailValue(item?.keyDetails, "Due Date") ||
    snapshotCard?.due.date ||
    "";

  const requester =
    readKeyDetailValue(item?.keyDetails, "Requester") ||
    readSnapshotDetail(snapshotRecord, "requester") ||
    "";
  const owner =
    readKeyDetailValue(item?.keyDetails, "Assigned Lead") ||
    String(snapshotRecord?.owner ?? "");
  const application =
    readKeyDetailValue(item?.keyDetails, "Application") ||
    String(snapshotRecord?.application ?? "");

  const hasParsedContent =
    item && typeof item === "object" && Object.keys(item).length > 0;

  const blockers =
    parsedBlockers.length > 0 ? parsedBlockers : fallbackBlockers;

  return {
    cardKind: "ai-summary",
    index,
    id:
      snapshotCard?.id ||
      readKeyDetailValue(item?.keyDetails, "Related Action Item") ||
      readKeyDetailValue(item?.keyDetails, "Request ID") ||
      "",
    href: String(snapshotRecord?.href ?? snapshotCard?.href ?? ""),
    title: resolveDisplayTitle({
      parsedTitle: item.title,
      parsedSummary: item.summary,
      snapshotTitle: snapshotCard?.title,
    }),
    urgency: inferAiSummaryUrgency(item, dueDate, snapshotCard?.urgency),
    generatedAt: normalizeText(item.generatedAt),
    status: {
      label: normalizeText(item?.status?.label),
      tone: normalizeStatusTone(item?.status?.tone),
    },
    priority: {
      label: normalizeText(item?.priority?.label),
      tone: normalizePriorityTone(item?.priority?.tone),
    },
    due: {
      date: dueDate,
      relative:
        normalizeText(item?.due?.relative) || formatDueDistanceLabel(dueDate),
      tone: normalizeDueTone(item?.due?.tone, dueDate),
    },
    nextAction:
      normalizeText(item.nextAction) ||
      snapshotCard?.nextAction ||
      "Review this request and determine the next step.",
    summary: normalizeText(item.summary) || snapshotCard?.summary || "",
    deliverable: normalizeText(item.deliverable),
    blockersOpenQuestions: blockers,
    urgencyText: normalizeText(item.urgency),
    keyDetails: normalizeKeyDetails(item.keyDetails, {
      snapshotRecord,
      requester,
      owner,
      application,
      dueDate,
    }),
    requestHistorySignals: normalizeText(item.requestHistorySignals),
    confidence: {
      level: normalizeConfidenceLevel(item?.confidence?.level),
      reason: normalizeText(item?.confidence?.reason),
    },
    footer: {
      requested: normalizeText(item?.footer?.requested),
      lastUpdated: normalizeText(item?.footer?.lastUpdated),
    },
    source: hasParsedContent ? "parsed" : "snapshot",
  };
}

// app.js:355 normalizeSnapshotTodo (fallback when parser output is unusable)
function normalizeSnapshotCard(
  record: PortalRecord,
  index = 0
): DashboardCardItem {
  const detail = String(record?.detail ?? "");
  const dueDate = String(record?.dueDate ?? extractDueDateFromRecord(record));
  const requester = extractRequester(detail);
  const application =
    String(record?.application ?? "") || extractApplication(detail);
  const blockers = record?.detailPageError
    ? [String(record.detailPageError)]
    : [];

  return {
    cardKind: "snapshot",
    index,
    id: String(record?.id ?? ""),
    href: String(record?.href ?? ""),
    title: String(record?.title ?? "Untitled request"),
    urgency: inferUrgencyFromSnapshot(record),
    generatedAt: "",
    status: { label: "", tone: "neutral" },
    priority: { label: "", tone: "unknown" },
    due: {
      date: dueDate,
      relative: formatDueDistanceLabel(dueDate),
      tone: normalizeDueTone(undefined, dueDate),
    },
    nextAction: record?.detailPageContent
      ? "Review the request details and decide the owner response."
      : "Review the request detail and determine the owner action.",
    summary: detail,
    deliverable: "",
    blockersOpenQuestions: blockers,
    urgencyText: "",
    keyDetails: normalizeKeyDetails([], {
      snapshotRecord: record,
      requester,
      owner: String(record?.owner ?? ""),
      application,
      dueDate,
    }),
    requestHistorySignals: "",
    confidence: { level: "", reason: "" },
    footer: { requested: "", lastUpdated: "" },
    source: "snapshot",
  };
}

// ── Key details (app.js:390 normalizeKeyDetails) ────────────────────────────
interface SnapshotKeyContext {
  snapshotRecord: PortalRecord | null;
  requester: string;
  owner: string;
  application: string;
  dueDate: string;
}

function normalizeKeyDetails(
  value: KeyDetailRow[] | undefined,
  ctx: SnapshotKeyContext
): KeyDetailRow[] {
  const incoming = new Map<string, string>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const label = normalizeText(entry?.label);
      if (!KEY_DETAIL_LABELS.includes(label as never) || incoming.has(label)) {
        continue;
      }
      incoming.set(label, normalizeIncomingKeyDetailValue(entry?.value));
    }
  }

  return KEY_DETAIL_LABELS.map((label) => ({
    label,
    value:
      incoming.get(label) || readSnapshotKeyDetailValue(label, ctx) || "Not visible",
  }));
}

// app.js:424 readSnapshotKeyDetailValue (trimmed to fields the snapshot supplies)
function readSnapshotKeyDetailValue(
  label: string,
  ctx: SnapshotKeyContext
): string {
  const record = ctx.snapshotRecord ?? {};
  const detailPageContent = normalizeText(record?.detailPageContent as string);

  switch (label) {
    case "Request ID":
      return (
        extractRequestIdFromText(detailPageContent) ||
        extractRequestIdFromText(String(record?.title ?? ""))
      );
    case "Related Action Item":
      return normalizeText(String(record?.issueItem ?? record?.id ?? ""));
    case "Requester":
      return normalizeText(ctx.requester);
    case "Application":
      return normalizeText(ctx.application);
    case "Business / Customer":
      return normalizeText(String(record?.business ?? ""));
    case "Request Type":
      return extractLabeledValue(detailPageContent, "Request Type", [
        "Request Origin",
        "Application",
        "Business",
      ]);
    case "Origin":
      return extractLabeledValue(detailPageContent, "Request Origin", [
        "Response Type",
        "Application",
        "Business",
      ]);
    case "Assigned Lead":
      return normalizeText(ctx.owner);
    case "Due Date":
      return normalizeText(ctx.dueDate || String(record?.dueDate ?? ""));
    case "Priority / Risk":
      return buildPriorityRiskFallback(record, detailPageContent);
    default:
      return "";
  }
}

function normalizeIncomingKeyDetailValue(value: unknown): string {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  return normalized.toLowerCase() === "not visible" ? "" : normalized;
}

function readKeyDetailValue(
  keyDetails: KeyDetailRow[] | undefined,
  label: string
): string {
  const entry = Array.isArray(keyDetails)
    ? keyDetails.find((item) => item?.label === label)
    : null;
  return normalizeIncomingKeyDetailValue(entry?.value);
}

// ── Title resolution (app.js:603 resolveDisplayTitle) ───────────────────────
function resolveDisplayTitle({
  parsedTitle,
  parsedSummary,
  snapshotTitle,
}: {
  parsedTitle?: string;
  parsedSummary?: string;
  snapshotTitle?: string;
}): string {
  const normalizedParsed = normalizeText(parsedTitle);
  if (normalizedParsed && !isGenericPortalTitle(normalizedParsed)) {
    return normalizedParsed;
  }

  const summaryTitle = buildSummaryTitle(parsedSummary);
  if (summaryTitle) return summaryTitle;

  const normalizedSnapshot = normalizeText(snapshotTitle);
  if (normalizedSnapshot) return normalizedSnapshot;

  return "Untitled request";
}

function buildSummaryTitle(value?: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const firstSentence = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  const candidate = normalizeText(firstSentence?.[1] || normalized);
  return clipText(candidate.replace(/[.!?]+$/, ""), 88);
}

function isGenericPortalTitle(value: string): boolean {
  const v = normalizeText(value).toLowerCase();
  return (
    /^help me!?\s*#\d+\b/.test(v) ||
    /^customer request\b/.test(v) ||
    /^record\s+\d+\b/.test(v)
  );
}

// ── Urgency (app.js:578 / 1314 / 1307) ──────────────────────────────────────
function inferAiSummaryUrgency(
  item: Partial<ParsedPortalItem>,
  dueDate: string,
  fallbackUrgency: UrgencyLevel | undefined
): UrgencyLevel {
  const dueTone = normalizeDueTone(item?.due?.tone, dueDate);
  const priorityTone = normalizePriorityTone(item?.priority?.tone);
  const statusTone = normalizeStatusTone(item?.status?.tone);

  if (dueTone === "overdue") return "critical";
  if (
    dueTone === "soon" ||
    priorityTone === "high" ||
    statusTone === "blocked" ||
    normalizeBlockers(item?.blockersOpenQuestions).length > 0
  ) {
    return "high";
  }
  if (priorityTone === "low") return "low";
  return normalizeUrgency(fallbackUrgency);
}

function inferUrgencyFromSnapshot(record: PortalRecord): UrgencyLevel {
  const detail = `${record?.title ?? ""} ${record?.detail ?? ""}`.toLowerCase();
  if (detail.includes("due in 1 day") || detail.includes("due in 2 day")) {
    return "critical";
  }
  if (
    detail.includes("due in") ||
    detail.includes("at risk") ||
    detail.includes("urgent") ||
    detail.includes("requires review")
  ) {
    return "high";
  }
  return "normal";
}

function normalizeUrgency(value: unknown): UrgencyLevel {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (URGENCY_LEVELS as string[]).includes(v)
    ? (v as UrgencyLevel)
    : "normal";
}

// ── Tone normalizers (app.js:535 / 542 / 549 / 573) ─────────────────────────
function normalizeStatusTone(value: unknown): StatusTone {
  const v = normalizeText(value).toLowerCase();
  return (STATUS_TONES as string[]).includes(v)
    ? (v as StatusTone)
    : "neutral";
}

function normalizePriorityTone(value: unknown): PriorityTone {
  const v = normalizeText(value).toLowerCase();
  return (PRIORITY_TONES as string[]).includes(v)
    ? (v as PriorityTone)
    : "unknown";
}

function normalizeDueTone(value: unknown, dueDate: string): DueTone {
  const v = normalizeText(value).toLowerCase();
  if ((DUE_TONES as string[]).includes(v)) return v as DueTone;

  const diff = getDueDateDayDifference(dueDate);
  if (diff === null) return "unknown";
  if (diff <= 0) return "overdue";
  if (diff <= 7) return "soon";
  return "normal";
}

function normalizeConfidenceLevel(value: unknown): ConfidenceLevel {
  const v = normalizeText(value);
  return (CONFIDENCE_LEVELS as string[]).includes(v)
    ? (v as ConfidenceLevel)
    : "";
}

function normalizeBlockers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((b) => normalizeText(b)).filter(Boolean))
  );
}

// ── Date helpers (app.js:1576 / 414 / 426) ──────────────────────────────────
function formatDueDistanceLabel(value: string): string {
  const parsed = parseDueDateValue(value);
  if (parsed === null) return value ? "Due date set" : "";
  const diff = dayDifferenceFromUtc(parsed);
  if (diff === 0) return "Due today";
  if (diff > 0) return `In ${diff} day(s)`;
  return `${Math.abs(diff)} day(s) overdue`;
}

function getDueDateDayDifference(value: string): number | null {
  const parsed = parseDueDateValue(value);
  if (parsed === null) return null;
  return dayDifferenceFromUtc(parsed);
}

function dayDifferenceFromUtc(parsedUtc: number): number {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parsedUtc - todayUtc) / 86_400_000);
}

function parseDueDateValue(value: string): number | null {
  const normalized = normalizeText(value)
    .replace(/^due:\s*/i, "")
    .replace(/^[A-Za-z]{3},\s*/, "");
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const monthMatch = normalized.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (monthMatch) {
    const [, day, monthLabel, year] = monthMatch;
    const monthIndex = getMonthIndex(monthLabel);
    if (monthIndex !== null) {
      return Date.UTC(normalizeShortYear(Number(year)), monthIndex, Number(day));
    }
  }

  const fallback = Date.parse(normalized);
  return Number.isNaN(fallback) ? null : fallback;
}

function normalizeShortYear(value: number): number {
  return value < 100 ? 2000 + value : value;
}

function getMonthIndex(value: string): number | null {
  const months: Record<string, number> = {
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
    dec: 11,
  };
  const idx = months[String(value || "").toLowerCase()];
  return idx === undefined ? null : idx;
}

function extractDueDateFromRecord(record: PortalRecord = {}): string {
  return (
    extractLabeledDate(String(record?.detailPageContent ?? ""), "Due Date") ||
    extractDueDateFromDetailText(String(record?.detail ?? ""))
  );
}

function extractLabeledDate(value: string, label: string): string {
  const match = normalizeText(value).match(
    new RegExp(`${label}\\s+(\\d{1,2}-[A-Za-z]{3}-\\d{2,4})`, "i")
  );
  return match?.[1] || "";
}

function extractDueDateFromDetailText(value: string): string {
  const match = normalizeText(value).match(
    /(?:[A-Za-z]{3},\s*)?(\d{1,2}-[A-Za-z]{3}-\d{2,4})(?=Due in\s+\d+\s+day(?:\(s\)|s)?)/i
  );
  return match?.[1] || "";
}

// ── Text extraction (app.js:1485 / 1490 / 309 / 332) ────────────────────────
function extractRequester(detail: string): string {
  const match = detail.match(
    /\d{2}-[A-Za-z]{3}-\d{2}\s+([^0-9].*?)\s+[A-Z][A-Za-z0-9 ]+\s+Ext\./
  );
  return match?.[1]?.trim() || "";
}

function extractApplication(detail: string): string {
  const match = detail.match(
    /\d{2}-[A-Za-z]{3}-\d{2}\s+.*?\s+([A-Z][A-Za-z0-9 ]+?)\s+Ext\./
  );
  return match?.[1]?.trim() || "";
}

function extractRequestIdFromText(text: string): string {
  const match = normalizeText(text).match(/#(\d{4,})/);
  return match?.[1] || "";
}

function extractLabeledValue(
  content: string,
  label: string,
  nextLabels: string[]
): string {
  const normalized = normalizeText(content);
  if (!normalized) return "";
  const safeLabel = escapeRegex(label);
  const safeNext = nextLabels.map(escapeRegex).join("|");
  const pattern = safeNext
    ? new RegExp(`${safeLabel}\\s+(.+?)(?=\\s+(?:${safeNext})\\b|$)`, "i")
    : new RegExp(`${safeLabel}\\s+(.+)$`, "i");
  return normalizeText(normalized.match(pattern)?.[1]);
}

function buildPriorityRiskFallback(
  record: PortalRecord,
  detailPageContent: string
): string {
  const priority = normalizeText(String(record?.priority ?? ""));
  const riskLevel = extractLabeledValue(detailPageContent, "Risk Level", [
    "Request Origin",
    "Response Type",
    "Application",
  ]);
  if (priority && riskLevel) return `${priority} / ${riskLevel}`;
  return priority || riskLevel;
}

function readSnapshotDetail(
  record: PortalRecord | null,
  field: "requester"
): string {
  if (!record) return "";
  if (field === "requester") {
    return extractRequester(String(record?.detail ?? ""));
  }
  return "";
}

// ── Primitives ──────────────────────────────────────────────────────────────
function clipText(value: string, maxLength: number): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeRegex(value: string): string {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
