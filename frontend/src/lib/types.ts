// Types mirror the real Express backend payloads. Verified against:
//   src/server/services/ai/portalSummaryNormalizer.js  (parsed item shape)
//   src/server/services/portal/htmlPortalPipeline.js    (snapshot record shape)
//   src/server/app.js                                    (endpoint payloads)
//
// IMPORTANT: parsed items DO NOT carry id / href. Those live on the parallel
// snapshot.records[i] and are merged in by lib/merge.ts (ported from app.js).

export type StatusTone = "blocked" | "warning" | "active" | "ready" | "neutral";
export type PriorityTone = "normal" | "high" | "low" | "unknown";
export type DueTone = "normal" | "soon" | "overdue" | "unknown";
export type ConfidenceLevel = "High" | "Medium" | "Low" | "";
export type UrgencyLevel = "critical" | "high" | "normal" | "low";
export type ParserMode = "structured" | "testchat";

export interface KeyDetailRow {
  label: string;
  value: string; // "Not visible" when the AI/snapshot couldn't supply it
}

// The 12 fixed key-detail labels, in order (KEY_DETAIL_LABELS in the backend).
export const KEY_DETAIL_LABELS = [
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
  "References / Fields",
] as const;

// ── Parsed item exactly as the normalizer emits it ──────────────────────────
export interface ParsedPortalItem {
  title: string;
  generatedAt: string; // ISO 8601
  status: { label: string; tone: StatusTone };
  priority: { label: string; tone: PriorityTone };
  due: { date: string; relative: string; tone: DueTone };
  nextAction: string;
  summary: string;
  deliverable: string;
  blockersOpenQuestions: string[];
  urgency: string; // free-text urgency note from the model
  keyDetails: KeyDetailRow[];
  requestHistorySignals: string;
  confidence: { level: ConfidenceLevel; reason: string };
  footer: { requested: string; lastUpdated: string };
}

// ── Snapshot record (subset of fields the merge consumes) ───────────────────
export interface PortalRecord {
  id?: string;
  href?: string;
  title?: string;
  status?: string;
  owner?: string;
  priority?: string;
  dueDate?: string;
  detail?: string;
  detailPageContent?: string;
  detailPageError?: string;
  application?: string;
  business?: string;
  issueItem?: string;
  [key: string]: unknown;
}

export interface PortalMetrics {
  statusCounts: Record<string, number>;
  ownerCounts: Record<string, number>;
  totalRecords: number;
}

export interface PortalSnapshot {
  source: string;
  target: string;
  title: string;
  fetchedAt: string;
  recordCount: number;
  metrics: PortalMetrics;
  records: PortalRecord[];
  rawPreview: string;
}

export interface SummaryResult {
  enabled: boolean;
  provider?: string;
  model: string;
  reason: string | null;
  suggestedFocus: string | null;
  summary: string;
  trace?: {
    provider: string;
    model: string;
    endpoint?: string | null;
    instructions: string;
    input: string;
    inputLength: number;
  } | null;
}

export interface ParserResult {
  enabled: boolean;
  model: string;
  mode: ParserMode;
  testchat: boolean;
  reason: string | null;
  originalText: string;
  parsed?: { items: ParsedPortalItem[] };
  responseText?: string; // only when testchat === true
  debug: {
    requestId: string;
    openaiResponseId: string | null;
    endpoint: string;
    mode: ParserMode;
    model: string;
    responseVersion: string;
  };
}

export interface DashboardResponse {
  snapshot: PortalSnapshot;
  summary: SummaryResult | null;
  parser: ParserResult;
}

export interface DashboardCacheRecord {
  cachedAt: string;
  healthPayload: HealthResponse;
  payload: DashboardResponse;
  controls?: {
    includeSummary?: boolean;
    parserTestchat?: boolean;
    focus?: string;
    parserFocus?: string;
  };
}

export interface DashboardRequest {
  includeSummary?: boolean;
  focus?: string;
  parserFocus?: string;
  parserTestchat?: boolean;
  parserProvider?: "teamgpt" | "openai";
  model?: string;
}

export interface HealthResponse {
  ok: boolean;
  config: {
    port: number;
    portal: { mode: string; target: string | null; dataPath?: string | null };
    summarizer: {
      enabled: boolean;
      provider?: string;
      model: string;
      reason?: string | null;
    };
    parser: {
      enabled: boolean;
      provider?: string;
      model: string;
      reason?: string | null;
      testchatAllowed: boolean;
    };
    ask: {
      enabled: boolean;
      provider?: string;
      model: string;
      reason?: string | null;
    };
  };
  testing: { usingTesterConfig: boolean };
  now: string;
}

// ── MS Graph email context ───────────────────────────────────────────────────
export interface ItemEmailFrom {
  name: string | null;
  address: string;
}

export interface ItemEmailResult {
  messageId: string;
  subject: string;
  from: ItemEmailFrom | null;
  receivedDateTime: string | null;
  conversationId: string | null;
  body: { contentType: "html" | "text"; content: string };
}

export interface ItemEmailRequest {
  requestId?: string;
  relatedActionItem?: string;
}

// ── The merged, UI-ready card model (output of lib/merge.ts) ────────────────
// This is what the AI Summary components actually render.
export interface DashboardCardItem {
  cardKind: "ai-summary" | "snapshot";
  index: number;
  id: string;
  href: string;
  title: string;
  urgency: UrgencyLevel; // card-level tone, derived (not the model's free text)
  generatedAt: string;
  status: { label: string; tone: StatusTone };
  priority: { label: string; tone: PriorityTone };
  due: { date: string; relative: string; tone: DueTone };
  nextAction: string;
  summary: string;
  deliverable: string;
  blockersOpenQuestions: string[];
  urgencyText: string; // the model's free-text urgency note
  keyDetails: KeyDetailRow[];
  requestHistorySignals: string;
  confidence: { level: ConfidenceLevel; reason: string };
  footer: { requested: string; lastUpdated: string };
  source: "parsed" | "snapshot";
}

// Sourcebot research chat
export interface ResearchMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ResearchRequest {
  query: string;
  messages: ResearchMessage[];
  itemContext: string;
}

export interface RetrievalStep {
  tool: "intent" | "list_repos" | "search_code" | "read_file";
  summary: string;
}

export interface ResearchResponse {
  ok: true;
  answer: string;
  chatUrl: string | null;
  retrievalTrail?: RetrievalStep[];
}
