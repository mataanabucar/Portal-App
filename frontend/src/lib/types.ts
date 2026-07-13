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
    tone?: string | null;
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
    summaryTone?: string;
  };
}

export interface DashboardRequest {
  includeSummary?: boolean;
  focus?: string;
  summaryTone?: string;
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
  tool: string;
  summary: string;
}

// A single piece of evidence — code (Sourcebot) or KB article.
export interface ResearchFinding {
  label: string;
  location: string;
  webUrl: string | null;
  language: string | null;
  snippets: string;
}

export interface ResearchActionItem {
  task: string;
  owner: string;
  status: string;
}

export interface ResearchConfidence {
  level: "Low" | "Medium" | "High";
  criticalGaps: number;
  reason: string;
}

export interface ResearchQuickTake {
  issue: string;
  whatWeKnow: string;
  nextStep: string;
}

// The structured, tabbed report the UI renders.
export interface ResearchReport {
  quickTake: ResearchQuickTake;
  summaryOfIssue: string;
  whatWeFound: string[];
  whatIsMissing: string[];
  recommendedSearches: string[];
  confidence: ResearchConfidence;
  actionItems: ResearchActionItem[];
}

export interface ResearchResponse {
  ok: true;
  report: ResearchReport;
  codeFindings: ResearchFinding[];
  kbFindings: ResearchFinding[];
  docsFindings: ResearchFinding[];
  chatUrl: string | null;
  retrievalTrail?: RetrievalStep[];
}

// ── Executive Day Organizer (/api/briefing/day) ────────────────────────────

export interface BriefingSource {
  id: string;
  type: "calendar" | "email" | "teams";
  title: string;
  time: string;
  from: string;
  webLink: string;
}

// Stage 1 retained item. Field names come from the prefilter prompt's JSON
// schema (snake_case); only the ones the UI renders are typed here.
export interface BriefingRetainedItem {
  source?: string;
  id: string;
  title?: string;
  subject?: string;
  chat_or_channel?: string;
  summary?: string;
  why_retained?: string;
  required_user_action?: string;
  start_time?: string;
  received_time?: string;
  message_time?: string;
  sender?: string;
  organizer?: string;
  automated_sender_exception_reason?: string;
  tags?: string[];
  priority_score?: number;
  web_link?: string;
}

export interface BriefingPrefilter {
  prefilter_summary: Record<string, unknown>;
  retained_calendar_events: BriefingRetainedItem[];
  retained_emails: BriefingRetainedItem[];
  retained_teams_messages: BriefingRetainedItem[];
  possible_duplicates_or_related_threads: Record<string, unknown>[];
  focus_application_highlights: Record<string, unknown>[];
  candidate_focus_blocks: Record<string, unknown>[];
  assumptions_or_gaps: Record<string, unknown>[];
}

export interface DayBriefingRequest {
  userContext?: string;
}

export interface DayBriefingResponse {
  ok: true;
  briefingMarkdown: string;
  prefilter: BriefingPrefilter;
  sources: BriefingSource[];
  meta: {
    provider: string;
    models: { stage1: string; stage2: string };
    window: {
      date: string;
      timezone: string;
      calendarStart: string;
      calendarEnd: string;
      emailAndChatsSince: string;
    };
    counts: {
      calendarFetched: number;
      emailsFetched: number;
      teamsFetched: number;
      retained: number;
      droppedUnknownIds: number;
    };
    sourceFailures: { source: string; error: string }[];
    timings: { fetchMs: number; stage1Ms: number; stage2Ms: number };
  };
}
