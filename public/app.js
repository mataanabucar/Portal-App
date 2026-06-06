import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  Hash,
  History,
  Info,
  Link2,
  Monitor,
  Paperclip,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Tags,
  TriangleAlert,
  User,
  createIcons
} from "/vendor/lucide/lucide.mjs";

const lucideIcons = {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  Hash,
  History,
  Info,
  Link2,
  Monitor,
  Paperclip,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Tags,
  TriangleAlert,
  User
};

const elements = {
  boardMeta: document.querySelector("#board-meta"),
  dashboardRefresh: document.querySelector("#refresh-dashboard"),
  dataAge: document.querySelector("#data-age"),
  health: document.querySelector("#health-output"),
  healthCurl: document.querySelector("#health-curl"),
  heroLede: document.querySelector("#hero-lede"),
  includeSummary: document.querySelector("#include-summary"),
  dashboardCurl: document.querySelector("#dashboard-curl"),
  parser: document.querySelector("#parser-output"),
  parserRequest: document.querySelector("#parser-request-output"),
  parserCurl: document.querySelector("#parser-curl"),
  parserFocus: document.querySelector("#parser-focus-text"),
  parserTestchat: document.querySelector("#parser-testchat"),
  prioritySpotlight: document.querySelector("#priority-spotlight"),
  snapshot: document.querySelector("#snapshot-output"),
  snapshotCurl: document.querySelector("#snapshot-curl"),
  statBlocked: document.querySelector("#stat-blocked"),
  statMode: document.querySelector("#stat-mode"),
  statTotal: document.querySelector("#stat-total"),
  statUrgent: document.querySelector("#stat-urgent"),
  status: document.querySelector("#status-output"),
  statusPill: document.querySelector("#status-pill"),
  summary: document.querySelector("#summary-output"),
  todoBoard: document.querySelector("#todo-board"),
  focus: document.querySelector("#focus-text")
};

const DASHBOARD_CACHE_KEY = "portal-visualizer.dashboard-cache.v1";
const FRESHNESS_TICK_MS = 60_000;
const refreshButtonLabel = elements.dashboardRefresh?.textContent?.trim() || "Refresh queue";

const defaultValues = {
  includeSummary: true,
  parserTestchat: false,
  focus:
    "Tell me what I need to do today, what is being asked of me, what deliverables are implied, and which requests are most urgent.",
  parserFocus:
    "For each visible request, extract the main ask, expected deliverable, blockers or missing information, urgency, and the clearest next step without guessing hidden values."
};

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

let currentViewState = null;

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
  } catch (error) {
    throw new Error(buildNetworkFailureMessage(path, error));
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function buildNetworkFailureMessage(path, error) {
  const currentOrigin =
    window.location.protocol === "file:"
      ? window.location.href
      : window.location.origin;

  return [
    `Could not reach ${path}.`,
    `Current page origin: ${currentOrigin}.`,
    "Open the app from the local server URL (usually http://127.0.0.1:3000) and keep the dev server running."
  ].join(" ");
}

function setStatusPill(message, state = "idle") {
  elements.statusPill.textContent = message;
  elements.statusPill.dataset.state = state;
}

function setLoadingState(isLoading) {
  document.body.dataset.loading = isLoading ? "true" : "false";
  elements.dashboardRefresh.disabled = isLoading;
  elements.dashboardRefresh.textContent = isLoading
    ? "Refreshing..."
    : refreshButtonLabel;
  elements.todoBoard.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function format(value) {
  return JSON.stringify(value, null, 2);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function buildHealthFallbackPayload(error) {
  return {
    ok: false,
    error: getErrorMessage(error),
    now: new Date().toISOString()
  };
}

function applyDefaults() {
  elements.includeSummary.checked = defaultValues.includeSummary;
  elements.parserTestchat.checked = defaultValues.parserTestchat;
  elements.focus.value = defaultValues.focus;
  elements.parserFocus.value = defaultValues.parserFocus;
}

function applySavedControls(controls = {}) {
  elements.includeSummary.checked =
    typeof controls.includeSummary === "boolean"
      ? controls.includeSummary
      : defaultValues.includeSummary;
  elements.parserTestchat.checked =
    typeof controls.parserTestchat === "boolean"
      ? controls.parserTestchat
      : defaultValues.parserTestchat;
  elements.focus.value =
    typeof controls.focus === "string" ? controls.focus : defaultValues.focus;
  elements.parserFocus.value =
    typeof controls.parserFocus === "string"
      ? controls.parserFocus
      : defaultValues.parserFocus;
}

function readCurrentControls() {
  return {
    includeSummary: elements.includeSummary.checked,
    parserTestchat: elements.parserTestchat.checked,
    focus: elements.focus.value,
    parserFocus: elements.parserFocus.value
  };
}

function renderDashboard(payload, healthPayload, options = {}) {
  const diagnosticsControls = cloneControls(options.controls || readCurrentControls());
  const summaryMarkup = renderSummary(payload.summary, elements.focus.value.trim());
  const todoItems = buildTodoItems(payload);
  const blockedCount = todoItems.filter((item) => item.blockers.length > 0).length;
  const urgentCount = todoItems.filter((item) =>
    ["critical", "high"].includes(item.urgency)
  ).length;

  currentViewState = {
    cachedAt: options.cachedAt || new Date().toISOString(),
    controls: diagnosticsControls,
    healthPayload,
    payload
  };

  elements.summary.innerHTML = summaryMarkup;
  elements.snapshot.textContent = format(payload.snapshot);
  elements.parserRequest.textContent = payload.parser?.request
    ? format(payload.parser.request)
    : "No parser payload was returned.";
  elements.parser.textContent = format(stripParserRequest(payload.parser) || {});
  elements.health.textContent = format(healthPayload);
  elements.statTotal.textContent = String(todoItems.length);
  elements.statUrgent.textContent = String(urgentCount);
  elements.statBlocked.textContent = String(blockedCount);
  if (elements.statMode) {
    elements.statMode.textContent = formatParserMode(payload.parser.mode);
  }
  elements.heroLede.textContent = buildHeroLede(todoItems, payload.summary, payload.parser);

  renderTodoBoard(todoItems, payload.parser);
  updateDiagnosticsCurlCommands(diagnosticsControls);
  refreshFreshnessIndicators();
}

function buildTodoItems(payload) {
  const snapshotRecords = Array.isArray(payload.snapshot?.records)
    ? payload.snapshot.records
    : [];

  if (
    payload.parser?.mode === "structured" &&
    Array.isArray(payload.parser?.parsed?.items) &&
    payload.parser.parsed.items.length === snapshotRecords.length &&
    payload.parser.parsed.items.length > 0
  ) {
    return buildStructuredTodoItems(payload.parser.parsed.items, snapshotRecords);
  }

  return snapshotRecords.map((record) => normalizeSnapshotTodo(record));
}

function buildStructuredTodoItems(parsedItems, snapshotRecords) {
  if (snapshotRecords.length === 0) {
    return parsedItems.map((item, index) => normalizeParsedTodo(item, null, index));
  }

  return snapshotRecords.map((record, index) =>
    normalizeParsedTodo(parsedItems[index], record, index)
  );
}

function normalizeParsedTodo(item = {}, snapshotRecord = null, index = 0) {
  const snapshotTodo = snapshotRecord ? normalizeSnapshotTodo(snapshotRecord) : null;
  const parsedBlockers = normalizeBlockers(item.blockersOpenQuestions);
  const fallbackBlockers = snapshotTodo?.blockers || [];
  const dueDate =
    item?.due?.date ||
    readKeyDetailValue(item?.keyDetails, "Due Date") ||
    snapshotTodo?.dueDate ||
    "";
  const application =
    readKeyDetailValue(item?.keyDetails, "Application") ||
    snapshotTodo?.application ||
    "";
  const requester =
    readKeyDetailValue(item?.keyDetails, "Requester") ||
    snapshotTodo?.requester ||
    "";
  const owner =
    readKeyDetailValue(item?.keyDetails, "Assigned Lead") ||
    snapshotTodo?.owner ||
    "";
  const hasParsedContent = item && typeof item === "object" && Object.keys(item).length > 0;

  return {
    cardKind: "ai-summary",
    index,
    id:
      snapshotTodo?.id ||
      readKeyDetailValue(item?.keyDetails, "Related Action Item") ||
      readKeyDetailValue(item?.keyDetails, "Request ID") ||
      "",
    href: snapshotRecord?.href || snapshotTodo?.href || "",
    title: resolveDisplayTitle({
      parsedTitle: item.title,
      parsedSummary: item.summary,
      snapshotTitle: snapshotTodo?.title
    }),
    urgency: inferAiSummaryUrgency(item, dueDate, snapshotTodo?.urgency),
    dueDate,
    requester,
    application,
    owner,
    nextAction:
      normalizeText(item.nextAction) ||
      snapshotTodo?.nextAction ||
      "Review this request and determine the next step.",
    summary: normalizeText(item.summary) || snapshotTodo?.summary || "",
    blockers: parsedBlockers.length > 0 ? parsedBlockers : fallbackBlockers,
    generatedAt: normalizeText(item.generatedAt),
    status: {
      label: normalizeText(item?.status?.label),
      tone: normalizeAiStatusTone(item?.status?.tone)
    },
    priority: {
      label: normalizeText(item?.priority?.label),
      tone: normalizeAiPriorityTone(item?.priority?.tone)
    },
    due: {
      date: dueDate,
      relative:
        normalizeText(item?.due?.relative) || formatDueDateDistanceLabel(dueDate),
      tone: normalizeAiDueTone(item?.due?.tone, dueDate)
    },
    deliverable: normalizeText(item.deliverable),
    blockersOpenQuestions: parsedBlockers.length > 0 ? parsedBlockers : fallbackBlockers,
    urgencyText: normalizeText(item.urgency),
    keyDetails: normalizeKeyDetails(item.keyDetails, snapshotRecord, snapshotTodo, dueDate),
    requestHistorySignals: normalizeText(item.requestHistorySignals),
    confidence: {
      level: normalizeAiConfidenceLevel(item?.confidence?.level),
      reason: normalizeText(item?.confidence?.reason)
    },
    footer: {
      requested: normalizeText(item?.footer?.requested),
      lastUpdated: normalizeText(item?.footer?.lastUpdated)
    },
    source: hasParsedContent ? "parsed" : "snapshot"
  };
}

function normalizeSnapshotTodo(record) {
  const fallbackDueDate = extractDueDateFromRecord(record);

  return {
    cardKind: "snapshot",
    id: record.id || "",
    href: record.href || "",
    title: record.title || "Untitled request",
    urgency: inferUrgencyFromSnapshot(record),
    nextAction: record.detailPageContent
      ? "Review the request details and decide the owner response."
      : "Review the request detail and determine the owner action.",
    summary: record.detail || "",
    dueDate: record.dueDate || fallbackDueDate || "",
    requester: extractRequester(record.detail || ""),
    application: extractApplication(record.detail || ""),
    owner: record.owner || "",
    blockers: record.detailPageError ? [record.detailPageError] : [],
    confidence: null,
    source: "snapshot"
  };
}

function normalizeBlockers(value) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((blocker) => normalizeText(blocker))
            .filter(Boolean)
        )
      )
    : [];
}

function normalizeKeyDetails(value, snapshotRecord, snapshotTodo, dueDate) {
  const incomingValues = new Map();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const label = normalizeText(entry?.label);

      if (!KEY_DETAIL_LABELS.includes(label) || incomingValues.has(label)) {
        continue;
      }

      incomingValues.set(label, normalizeIncomingKeyDetailValue(entry?.value));
    }
  }

  return KEY_DETAIL_LABELS.map((label) => ({
    label,
    value:
      incomingValues.get(label) ||
      readSnapshotKeyDetailValue(label, snapshotRecord, snapshotTodo, dueDate) ||
      "Not visible"
  }));
}

function normalizeIncomingKeyDetailValue(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.toLowerCase() === "not visible" ? "" : normalizedValue;
}

function readSnapshotKeyDetailValue(label, snapshotRecord = {}, snapshotTodo = {}, dueDate = "") {
  const detailPageContent = normalizeText(snapshotRecord?.detailPageContent);
  const requestId =
    extractRequestIdFromText(detailPageContent || snapshotRecord?.title || "") ||
    extractRequestIdFromText(snapshotTodo?.title || "");
  const priorityRisk = buildPriorityRiskFallback(snapshotRecord);

  if (label === "Request ID") {
    return requestId;
  }

  if (label === "Related Action Item") {
    return normalizeText(snapshotRecord?.issueItem || snapshotTodo?.id);
  }

  if (label === "Requester") {
    return normalizeText(snapshotTodo?.requester);
  }

  if (label === "Application") {
    return normalizeText(snapshotRecord?.application || snapshotTodo?.application);
  }

  if (label === "Business / Customer") {
    return normalizeText(snapshotRecord?.business);
  }

  if (label === "Request Type") {
    return extractPortalLabeledValue(detailPageContent, "Request Type", [
      "Request Origin",
      "Application",
      "Business"
    ]);
  }

  if (label === "Origin") {
    return extractPortalLabeledValue(detailPageContent, "Request Origin", [
      "Response Type",
      "Application",
      "Business"
    ]);
  }

  if (label === "Assigned Lead") {
    return normalizeText(snapshotRecord?.owner || snapshotTodo?.owner);
  }

  if (label === "Due Date") {
    return normalizeText(dueDate || snapshotRecord?.dueDate || snapshotTodo?.dueDate);
  }

  if (label === "Priority / Risk") {
    return priorityRisk;
  }

  return "";
}

function readKeyDetailValue(keyDetails, label) {
  const entry = Array.isArray(keyDetails)
    ? keyDetails.find((item) => item?.label === label)
    : null;

  return normalizeIncomingKeyDetailValue(entry?.value);
}

function buildPriorityRiskFallback(record = {}) {
  const priority = normalizeText(record?.priority);
  const riskLevel = extractPortalLabeledValue(
    normalizeText(record?.detailPageContent),
    "Risk Level",
    ["Request Origin", "Response Type", "Application"]
  );

  if (priority && riskLevel) {
    return `${priority} / ${riskLevel}`;
  }

  return priority || riskLevel;
}

function extractRequestIdFromText(value) {
  const normalizedValue = normalizeText(value);
  const hashMatch = normalizedValue.match(/#(\d{4,})/);

  if (hashMatch?.[1]) {
    return hashMatch[1];
  }

  const requestMatch = normalizedValue.match(/\bRequest ID\s+(\d{4,})/i);
  return requestMatch?.[1] || "";
}

function extractPortalLabeledValue(value, label, nextLabels) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  const safeLabel = escapeRegex(label);
  const safeNextLabels = Array.isArray(nextLabels)
    ? nextLabels.map((entry) => escapeRegex(entry)).join("|")
    : "";
  const pattern = safeNextLabels
    ? new RegExp(`${safeLabel}\\s+(.+?)(?=\\s+(?:${safeNextLabels})\\b|$)`, "i")
    : new RegExp(`${safeLabel}\\s+(.+)$`, "i");

  return normalizeText(normalizedValue.match(pattern)?.[1]);
}

function normalizeAiStatusTone(value) {
  const normalizedValue = normalizeText(value).toLowerCase();
  return ["blocked", "warning", "active", "ready", "neutral"].includes(normalizedValue)
    ? normalizedValue
    : "neutral";
}

function normalizeAiPriorityTone(value) {
  const normalizedValue = normalizeText(value).toLowerCase();
  return ["normal", "high", "low", "unknown"].includes(normalizedValue)
    ? normalizedValue
    : "unknown";
}

function normalizeAiDueTone(value, dueDate) {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (["normal", "soon", "overdue", "unknown"].includes(normalizedValue)) {
    return normalizedValue;
  }

  const dayDifference = getDueDateDayDifference(dueDate);

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

function normalizeAiConfidenceLevel(value) {
  const normalizedValue = normalizeText(value);
  return ["High", "Medium", "Low"].includes(normalizedValue) ? normalizedValue : "";
}

function inferAiSummaryUrgency(item, dueDate, fallbackUrgency) {
  const dueTone = normalizeAiDueTone(item?.due?.tone, dueDate);
  const priorityTone = normalizeAiPriorityTone(item?.priority?.tone);
  const statusTone = normalizeAiStatusTone(item?.status?.tone);

  if (dueTone === "overdue") {
    return "critical";
  }

  if (
    dueTone === "soon" ||
    priorityTone === "high" ||
    statusTone === "blocked" ||
    normalizeBlockers(item?.blockersOpenQuestions).length > 0
  ) {
    return "high";
  }

  if (priorityTone === "low") {
    return "low";
  }

  return normalizeUrgency(fallbackUrgency);
}

function resolveDisplayTitle({ parsedTitle, parsedSummary, snapshotTitle }) {
  const normalizedParsedTitle = normalizeText(parsedTitle);

  if (normalizedParsedTitle && !isGenericPortalTitle(normalizedParsedTitle)) {
    return normalizedParsedTitle;
  }

  const summaryTitle = buildSummaryTitle(parsedSummary);

  if (summaryTitle) {
    return summaryTitle;
  }

  const normalizedSnapshotTitle = normalizeText(snapshotTitle);

  if (normalizedSnapshotTitle) {
    return normalizedSnapshotTitle;
  }

  return "Untitled request";
}

function buildSummaryTitle(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  const firstSentenceMatch = normalizedValue.match(/^(.+?[.!?])(?:\s|$)/);
  const candidateTitle = normalizeText(firstSentenceMatch?.[1] || normalizedValue);
  return clipText(candidateTitle.replace(/[.!?]+$/, ""), 88);
}

function isGenericPortalTitle(value) {
  const normalizedValue = normalizeText(value).toLowerCase();

  return (
    /^help me!?\s*#\d+\b/.test(normalizedValue) ||
    /^customer request\b/.test(normalizedValue) ||
    /^record\s+\d+\b/.test(normalizedValue)
  );
}

function renderPrioritySpotlight(items, parser) {
  void items;
  void parser;
}

function renderTodoBoard(items, parser) {
  if (items.length === 0) {
    elements.todoBoard.innerHTML = `
      <article class="todo-empty">
        <h3>No to-dos yet</h3>
        <p>${
          parser.mode === "testchat"
            ? "Turn off parser test chat mode when you want the strongest structured task cards."
            : "No actionable items were returned from the portal snapshot."
        }</p>
      </article>
    `;
    renderLucideIcons(elements.todoBoard);
    return;
  }

  elements.todoBoard.innerHTML = items
    .map((item, index) =>
      item.cardKind === "ai-summary"
        ? buildAiSummaryCard(item, index)
        : buildSnapshotTodoCard(item, index)
    )
    .join("");

  renderLucideIcons(elements.todoBoard);
}

function buildAiSummaryCard(item, index) {
  const sections = buildAiSummarySections(item);

  return `
    <article
      class="todo-card ai-summary-card ${index === 0 ? "is-leading" : ""}"
      data-ai-card
      data-urgency="${escapeHtml(item.urgency)}"
    >
      <header class="ai-summary-card__header">
        <div class="ai-summary-card__brand">
          <span class="ai-summary-card__brand-mark" data-lucide="sparkles"></span>
          <div>
            <p class="ai-summary-card__brand-label">AI Summary</p>
            <p class="ai-summary-card__brand-note">Generated summary of this customer request</p>
          </div>
        </div>
        <div class="ai-summary-card__header-meta">
          <p class="ai-summary-card__generated">
            <span class="ai-summary-card__generated-icon" data-lucide="clock-3"></span>
            <span>${escapeHtml(formatGeneratedAtLabel(item.generatedAt))}</span>
          </p>
          <button
            class="ai-summary-card__regenerate"
            type="button"
            data-ai-regenerate
            aria-label="Regenerate AI summary"
          >
            <span data-lucide="refresh-cw"></span>
            <span>Regenerate</span>
          </button>
        </div>
      </header>
      <div class="ai-summary-card__body-grid">
        <div class="ai-summary-card__left">
          <section class="ai-summary-card__title-panel">
            <div class="ai-summary-card__title-icon">
              <span data-lucide="search-check"></span>
            </div>
            <div class="ai-summary-card__title-copy">
              <h3>${escapeHtml(item.title)}</h3>
              <div class="ai-summary-card__pill-row">
                ${buildAiStatusPill(item.status)}
                ${buildAiPriorityPill(item.priority)}
                ${buildAiDuePill(item)}
              </div>
            </div>
          </section>
          ${sections.left.join("")}
        </div>
        <div class="ai-summary-card__right">
          ${buildAiKeyDetailsPanel(item.keyDetails)}
          ${sections.right.join("")}
        </div>
      </div>
      ${buildAiSummaryFooter(item, index)}
    </article>
  `;
}

function buildAiSummaryExpandedId(item, index) {
  const safeId = normalizeText(item.id || `task-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `ai-summary-${safeId || index + 1}`;
}

function buildAiStatusPill(status) {
  const label = normalizeText(status?.label);

  if (!label) {
    return "";
  }

  return `
    <span class="ai-status-pill" data-tone="${escapeHtml(status.tone || "neutral")}">
      ${status.tone === "blocked" ? '<span data-lucide="triangle-alert"></span>' : ""}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function buildAiPriorityPill(priority) {
  const label = normalizeText(priority?.label);

  if (!label) {
    return "";
  }

  return `
    <span class="ai-status-pill ai-status-pill--priority" data-tone="${escapeHtml(
      priority.tone || "unknown"
    )}">
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function buildAiDuePill(item) {
  const dueDateValue = item?.due?.date || item?.dueDate;
  const dueDateLabel = formatDueDateBadgeLabel(dueDateValue);

  if (!dueDateLabel) {
    return "";
  }

  const dueState = getDueDateState(dueDateValue);
  const dueUrgency = resolveDueBadgeUrgency(dueDateValue, item?.urgency);
  const relativeLabel =
    normalizeText(item?.due?.relative) || formatDueDateDistanceLabel(dueDateValue);

  return `
    <span class="due-badge urgency-badge${dueState === "today" ? " is-due-today" : ""}" data-urgency="${escapeHtml(
      dueUrgency
    )}" data-due-state="${escapeHtml(dueState)}">
      <span class="due-badge__icon" data-lucide="calendar-days"></span>
      <span class="due-badge__date">Due: ${escapeHtml(dueDateLabel)}</span>
      <span class="due-badge__distance">(${escapeHtml(relativeLabel)})</span>
    </span>
  `;
}

function buildAiSummaryBlockerPreview(blockers) {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    return "";
  }

  return `
    <div class="ai-summary-card__blocker-preview">
      <p class="ai-summary-card__preview-label">Blockers</p>
      <p class="ai-summary-card__preview-text">${escapeHtml(
        clipText(blockers.join(" "), 160)
      )}</p>
    </div>
  `;
}

function buildAiSummarySections(item) {
  const distinctText = [];
  const left = [];
  const right = [];

  left.push(
    buildAiSummarySection({
      kind: "next-action",
      label: "Next Action",
      icon: "arrow-right",
      body: item.nextAction
    })
  );
  trackDistinctText(distinctText, item.nextAction);

  const summaryText = getDistinctText(item.summary, distinctText);

  if (summaryText) {
    left.push(
      buildAiSummarySection({
        kind: "summary",
        label: "Summary",
        icon: "file-text",
        body: summaryText
      })
    );
    trackDistinctText(distinctText, summaryText);
  }

  const deliverableText = getDistinctText(item.deliverable, distinctText);

  if (deliverableText) {
    left.push(
      buildAiSummarySection({
        kind: "deliverable",
        label: "Deliverable",
        icon: "badge-check",
        body: deliverableText
      })
    );
    trackDistinctText(distinctText, deliverableText);
  }

  if (Array.isArray(item.blockersOpenQuestions) && item.blockersOpenQuestions.length > 0) {
    left.push(buildAiBlockersSection(item.blockersOpenQuestions));
    item.blockersOpenQuestions.forEach((entry) => trackDistinctText(distinctText, entry));
  }

  const urgencyText = getDistinctText(item.urgencyText, distinctText);

  if (urgencyText) {
    left.push(
      buildAiSummarySection({
        kind: "urgency",
        label: "Urgency",
        icon: "clock-3",
        body: urgencyText
      })
    );
  }

  const historyText = getDistinctText(item.requestHistorySignals, distinctText);

  if (historyText) {
    right.push(
      buildAiSummarySection({
        kind: "history",
        label: "Request History Signals",
        icon: "history",
        body: historyText,
        compact: true
      })
    );
  }

  const confidenceMarkup = buildAiConfidencePanel(item.confidence);

  if (confidenceMarkup) {
    right.push(confidenceMarkup);
  }

  return { left, right };
}

function buildAiSummarySection({ kind, label, icon, body, compact = false }) {
  const normalizedBody = normalizeText(body);

  if (!normalizedBody) {
    return "";
  }

  return `
    <section class="ai-summary-section ai-summary-section--${escapeHtml(
      kind
    )}${compact ? " is-compact" : ""}">
      <div class="ai-summary-section__icon">
        <span data-lucide="${escapeHtml(icon)}"></span>
      </div>
      <div class="ai-summary-section__copy">
        <p class="ai-summary-section__label">${escapeHtml(label)}</p>
        <p class="ai-summary-section__body">${escapeHtml(normalizedBody)}</p>
      </div>
    </section>
  `;
}

function buildAiBlockersSection(blockers) {
  return `
    <section class="ai-summary-section ai-summary-section--blockers">
      <div class="ai-summary-section__icon">
        <span data-lucide="triangle-alert"></span>
      </div>
      <div class="ai-summary-section__copy">
        <p class="ai-summary-section__label">Blockers / Open Questions</p>
        <ul class="ai-summary-list">
          ${blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}

function buildAiKeyDetailsPanel(keyDetails) {
  return `
    <section class="ai-key-details-panel">
      <div class="ai-key-details-panel__head">
        <p class="ai-summary-section__label">Key Details</p>
        <span class="ai-key-details-panel__icon" data-lucide="info"></span>
      </div>
      <div class="ai-key-details-panel__rows">
        ${keyDetails.map((entry) => buildAiKeyDetailsRow(entry)).join("")}
      </div>
    </section>
  `;
}

function buildAiKeyDetailsRow(entry) {
  const iconName = resolveKeyDetailIcon(entry.label);
  const isMissing = normalizeText(entry.value) === "Not visible";

  return `
    <div class="ai-key-details-row">
      <div class="ai-key-details-row__label">
        <span class="ai-key-details-row__icon" data-lucide="${escapeHtml(iconName)}"></span>
        <span>${escapeHtml(entry.label)}</span>
      </div>
      <div class="ai-key-details-row__value${isMissing ? " is-missing" : ""}">
        ${escapeHtml(entry.value)}
      </div>
    </div>
  `;
}

function resolveKeyDetailIcon(label) {
  if (label === "Request ID") {
    return "hash";
  }

  if (label === "Related Action Item") {
    return "link-2";
  }

  if (label === "Requester" || label === "Assigned Lead") {
    return "user";
  }

  if (label === "Application") {
    return "monitor";
  }

  if (label === "Business / Customer") {
    return "building-2";
  }

  if (label === "Origin") {
    return "globe";
  }

  if (label === "Due Date") {
    return "calendar-days";
  }

  if (label === "Priority / Risk") {
    return "flag";
  }

  if (label === "Attachments") {
    return "paperclip";
  }

  if (label === "References / Fields") {
    return "tags";
  }

  return "file-text";
}

function buildAiConfidencePanel(confidence) {
  const level = normalizeAiConfidenceLevel(confidence?.level);
  const reason = normalizeText(confidence?.reason);

  if (!level && !reason) {
    return "";
  }

  return `
    <section class="ai-summary-section ai-summary-section--confidence is-compact">
      <div class="ai-summary-section__icon">
        <span data-lucide="shield-check"></span>
      </div>
      <div class="ai-summary-section__copy">
        <div class="ai-summary-section__heading-row">
          <p class="ai-summary-section__label">Confidence</p>
          ${level ? `<span class="ai-confidence-pill" data-level="${escapeHtml(level.toLowerCase())}">${escapeHtml(level)}</span>` : ""}
        </div>
        ${reason ? `<p class="ai-summary-section__body">${escapeHtml(reason)}</p>` : ""}
      </div>
    </section>
  `;
}

function buildAiSummaryFooter(item, index) {
  const footerParts = [];

  if (normalizeText(item?.footer?.requested)) {
    footerParts.push(`Requested: ${item.footer.requested}`);
  }

  if (normalizeText(item?.footer?.lastUpdated)) {
    footerParts.push(`Last Updated: ${item.footer.lastUpdated}`);
  }

  return `
    <footer class="ai-summary-footer">
      <p class="ai-summary-footer__meta">${escapeHtml(footerParts.join(" | ") || buildTaskLabel(item, index))}</p>
      ${buildTaskActions(item, index, "ai-summary-footer__actions", true)}
    </footer>
  `;
}

function getDistinctText(candidate, existingTexts) {
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedCandidate) {
    return "";
  }

  const normalizedNeedle = normalizedCandidate.toLowerCase();
  const duplicate = existingTexts.some((entry) => {
    const normalizedEntry = normalizeText(entry).toLowerCase();

    if (!normalizedEntry) {
      return false;
    }

    return (
      normalizedEntry === normalizedNeedle ||
      normalizedEntry.includes(normalizedNeedle) ||
      normalizedNeedle.includes(normalizedEntry)
    );
  });

  return duplicate ? "" : normalizedCandidate;
}

function trackDistinctText(existingTexts, value) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue) {
    existingTexts.push(normalizedValue);
  }
}

function buildSnapshotTodoCard(item, index) {
  const summaryParts = splitLongText(
    item.summary || "No summary was extracted for this item.",
    200
  );
  const blockersMarkup = buildBlockerCallout(item.blockers);
  const detailsMarkup = summaryParts.full
    ? `
      <details class="todo-details">
        <summary>More context</summary>
        <p>${escapeHtml(summaryParts.full)}</p>
      </details>
    `
    : "";
  const confidenceText =
    item.source === "snapshot" ? "Portal snapshot fallback" : "Confidence not available";

  return `
    <article class="todo-card dashboard-sheen-card ${index === 0 ? "is-leading" : ""}" data-urgency="${escapeHtml(item.urgency)}">
      <span class="dashboard-sheen-card__glint" aria-hidden="true"></span>
      <div class="todo-card-top">
        <span class="todo-rank">${escapeHtml(index === 0 ? "Up next" : "In queue")}</span>
        <div class="todo-card-header">
          ${buildDueBadge(item)}
          <span class="urgency-badge" data-urgency="${escapeHtml(item.urgency)}">${escapeHtml(formatUrgencyLabel(item.urgency))}</span>
        </div>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="todo-next-label">Next action</p>
      <p class="todo-next">${escapeHtml(item.nextAction)}</p>
      <p class="todo-summary">${escapeHtml(summaryParts.preview)}</p>
      <div class="todo-chip-row">
        ${buildMetaChips(item)}
      </div>
      ${blockersMarkup}
      ${detailsMarkup}
      <div class="todo-footer">
        ${buildTaskActions(item, index, "todo-footer-actions")}
        <div class="todo-footer-meta">
          <p class="todo-confidence">${escapeHtml(confidenceText)}</p>
          ${buildFooterStatusMarkup(item)}
        </div>
      </div>
    </article>
  `;
}

function buildTaskActions(item, index, className, showFullRequestLabel = false) {
  const openLink = item.href
    ? `
      <a class="todo-open-link" href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">
        ${showFullRequestLabel ? '<span>View Full Request</span><span data-lucide="external-link"></span>' : "Open"}
      </a>
    `
    : "";

  return `
    <div class="${className}">
      <span class="todo-id">${escapeHtml(buildTaskLabel(item, index))}</span>
      ${openLink}
    </div>
  `;
}

function buildMetaChips(item) {
  const metaTokens = [
    item.requester ? `Requester: ${item.requester}` : "",
    item.application ? `App: ${item.application}` : "",
    item.owner ? `Owner: ${item.owner}` : ""
  ].filter(Boolean);

  if (metaTokens.length === 0) {
    return '<span class="meta-chip">Metadata unavailable</span>';
  }

  return metaTokens
    .map((token) => `<span class="meta-chip">${escapeHtml(token)}</span>`)
    .join("");
}

function buildBlockerCallout(blockers) {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    return "";
  }

  return `
    <div class="blocker-callout">
      <p class="todo-section-label">Blocked or needs input</p>
      <ul class="todo-list">
        ${blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function buildTaskLabel(item, index) {
  if (item.id) {
    return item.id;
  }

  return `Task ${index + 1}`;
}

function buildFooterStatus(item) {
  if (item.blockers.length > 0) {
    return "Needs blocker resolution";
  }

  return "";
}

function buildFooterStatusMarkup(item) {
  const statusText = buildFooterStatus(item);

  return statusText
    ? `<p class="todo-status">${escapeHtml(statusText)}</p>`
    : "";
}

function formatGeneratedAtLabel(value) {
  const parsedDate = value ? new Date(value) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return "Generated just now";
  }

  return `Generated ${parsedDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function renderLucideIcons(root) {
  if (!root) {
    return;
  }

  createIcons({
    icons: lucideIcons,
    root,
    attrs: {
      width: "18",
      height: "18",
      strokeWidth: "1.9"
    }
  });
}

function buildHeroLede(todoItems, summary, parser) {
  if (todoItems.length === 0) {
    return "No actionable portal items were returned for this refresh.";
  }

  const leadItem = todoItems[0];
  const parts = [`${todoItems.length} open request${todoItems.length === 1 ? "" : "s"} total.`];

  if (leadItem?.dueDate) {
    parts.push(`First due ${leadItem.dueDate}.`);
  }

  return parts.join(" ");
}

function buildBoardMeta(snapshot, parser, freshness) {
  const parts = [`${snapshot.recordCount || 0} item${snapshot.recordCount === 1 ? "" : "s"}`];

  if (freshness.ageLabel) {
    parts.push(`age ${freshness.ageLabel}`);
  }

  if (snapshot.fetchedAt) {
    parts.push(`updated ${formatTime(snapshot.fetchedAt)}`);
  }

  return parts.join(" | ");
}

function splitLongText(value, maxLength) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return {
      preview: "No summary was extracted for this item.",
      full: ""
    };
  }

  if (normalizedValue.length <= maxLength) {
    return {
      preview: normalizedValue,
      full: ""
    };
  }

  const breakIndex = findBreakIndex(normalizedValue, maxLength);

  return {
    preview: `${normalizedValue.slice(0, breakIndex).trim()}...`,
    full: normalizedValue
  };
}

function stripMarkdown(value) {
  return normalizeText(
    String(value || "")
      .replace(/^\-\s*/, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
  );
}

function findBreakIndex(value, maxLength) {
  const breakpoint = value.lastIndexOf(" ", maxLength);
  return breakpoint > maxLength * 0.65 ? breakpoint : maxLength;
}

function normalizeUrgency(value) {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["critical", "high", "normal", "low"].includes(normalizedValue)
    ? normalizedValue
    : "normal";
}

function inferUrgencyFromSnapshot(record) {
  const detail = `${record.title || ""} ${record.detail || ""}`.toLowerCase();

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

function compareTodoItems(left, right) {
  const leftDueDate = parseDueDateValue(left.dueDate);
  const rightDueDate = parseDueDateValue(right.dueDate);

  if (leftDueDate !== null && rightDueDate !== null && leftDueDate !== rightDueDate) {
    return leftDueDate - rightDueDate;
  }

  if (leftDueDate !== null && rightDueDate === null) {
    return -1;
  }

  if (leftDueDate === null && rightDueDate !== null) {
    return 1;
  }

  const taskIdComparison = compareTaskIds(left.id, right.id);

  if (taskIdComparison !== 0) {
    return taskIdComparison;
  }

  const urgencyComparison = compareUrgency(left.urgency, right.urgency);

  if (urgencyComparison !== 0) {
    return urgencyComparison;
  }

  return (left.title || "").localeCompare(right.title || "", undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function compareUrgency(leftUrgency, rightUrgency) {
  const urgencyOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  return (urgencyOrder[leftUrgency] ?? 9) - (urgencyOrder[rightUrgency] ?? 9);
}

function compareTaskIds(leftId, rightId) {
  const leftNumericId = parseTaskIdNumber(leftId);
  const rightNumericId = parseTaskIdNumber(rightId);

  if (leftNumericId !== null && rightNumericId !== null && leftNumericId !== rightNumericId) {
    return leftNumericId - rightNumericId;
  }

  if (leftNumericId !== null && rightNumericId === null) {
    return -1;
  }

  if (leftNumericId === null && rightNumericId !== null) {
    return 1;
  }

  const normalizedLeftId = normalizeText(leftId);
  const normalizedRightId = normalizeText(rightId);

  if (!normalizedLeftId && !normalizedRightId) {
    return 0;
  }

  if (!normalizedLeftId) {
    return 1;
  }

  if (!normalizedRightId) {
    return -1;
  }

  return normalizedLeftId.localeCompare(normalizedRightId, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function parseTaskIdNumber(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  const digitsMatch = normalizedValue.match(/\d+/g);

  if (!digitsMatch) {
    return null;
  }

  const parsedValue = Number.parseInt(digitsMatch.join(""), 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseDueDateValue(value) {
  const normalizedValue = normalizeDueDateText(value);

  if (!normalizedValue) {
    return null;
  }

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const slashMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return Date.UTC(normalizeShortYear(Number(year)), Number(month) - 1, Number(day));
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

function getMonthIndex(label) {
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

  return monthIndexes[label.toLowerCase()] ?? null;
}

function extractRequester(detail) {
  const match = detail.match(/\d{2}-[A-Za-z]{3}-\d{2}\s+([^0-9].*?)\s+[A-Z][A-Za-z0-9 ]+\s+Ext\./);
  return match?.[1]?.trim() || "";
}

function extractApplication(detail) {
  const match = detail.match(/\d{2}-[A-Za-z]{3}-\d{2}\s+.*?\s+([A-Z][A-Za-z0-9 ]+?)\s+Ext\./);
  return match?.[1]?.trim() || "";
}

function extractDueDateFromRecord(record = {}) {
  return (
    extractDueDateFromDetailPage(record.detailPageContent || "") ||
    extractDueDateFromDetailText(record.detail || "")
  );
}

function extractDueDateFromDetailPage(value) {
  const match = normalizeText(value).match(/Due Date\s+(\d{1,2}-[A-Za-z]{3}-\d{2,4})/i);
  return match?.[1] || "";
}

function extractDueDateFromDetailText(value) {
  const match = normalizeText(value).match(
    /(?:[A-Za-z]{3},\s*)?(\d{1,2}-[A-Za-z]{3}-\d{2,4})(?=Due in\s+\d+\s+day(?:\(s\)|s)?)/i
  );
  return match?.[1] || "";
}

function formatTime(timestamp) {
  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return timestamp;
  }

  return parsedDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatParserMode(value) {
  if (!value) {
    return "-";
  }

  return value === "testchat" ? "Test chat" : capitalize(value);
}

function formatUrgencyLabel(value) {
  const normalizedValue = normalizeUrgency(value);
  return normalizedValue === "critical" ? "Do now" : capitalize(normalizedValue);
}

function buildDueBadge(item) {
  const dueDateLabel = formatDueDateBadgeLabel(item?.dueDate);
  const dueState = getDueDateState(item?.dueDate);

  if (!dueDateLabel) {
    return "";
  }

  return `
    <span class="due-badge urgency-badge${dueState === "today" ? " is-due-today" : ""}" data-urgency="${escapeHtml(
      resolveDueBadgeUrgency(item?.dueDate, item?.urgency)
    )}" data-due-state="${escapeHtml(dueState)}">
      <span class="due-badge__date">Due: ${escapeHtml(dueDateLabel)}</span>
      <span class="due-badge__distance">${escapeHtml(
        formatDueDateDistanceLabel(item?.dueDate)
      )}</span>
    </span>
  `;
}

function formatDueDateBadgeLabel(value) {
  const normalizedValue = normalizeDueDateText(value);

  if (!normalizedValue) {
    return "";
  }

  const parsedValue = parseDueDateValue(normalizedValue);

  if (parsedValue === null) {
    return normalizedValue;
  }

  return formatUtcDateLabel(parsedValue);
}

function formatDueDateDistanceLabel(value) {
  const parsedValue = parseDueDateValue(value);

  if (parsedValue === null) {
    return "Due date set";
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDifference = Math.round((parsedValue - todayUtc) / 86_400_000);

  if (dayDifference === 0) {
    return "Due today";
  }

  if (dayDifference > 0) {
    return `In ${dayDifference} day(s)`;
  }

  return `${Math.abs(dayDifference)} day(s) overdue`;
}

function resolveDueBadgeUrgency(dueDate, urgency) {
  const dayDifference = getDueDateDayDifference(dueDate);

  if (dayDifference === null) {
    return normalizeUrgency(urgency);
  }

  if (dayDifference <= 0) {
    return "critical";
  }

  if (dayDifference <= 7) {
    return "high";
  }

  if (dayDifference <= 21) {
    return "normal";
  }

  return "low";
}

function getDueDateState(value) {
  const dayDifference = getDueDateDayDifference(value);

  if (dayDifference === null) {
    return "none";
  }

  if (dayDifference === 0) {
    return "today";
  }

  if (dayDifference < 0) {
    return "overdue";
  }

  return "scheduled";
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

function formatUtcDateLabel(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  return `${day}-${monthLabels[date.getUTCMonth()]}-${year}`;
}

function normalizeDueDateText(value) {
  return normalizeText(value)
    .replace(/^due:\s*/i, "")
    .replace(/^[A-Za-z]{3},\s*/, "");
}

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function clipText(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSummary(summary, focusText = "") {
  const normalizedFocus = normalizeText(summary?.suggestedFocus || focusText);
  const focusMarkup = normalizedFocus
    ? `
      <section class="summary-focus-card" aria-label="Current focus">
        <p class="summary-focus-label">Focus</p>
        <p class="summary-focus-text">${escapeHtml(normalizedFocus)}</p>
      </section>
    `
    : "";

  if (!summary) {
    return `
      ${focusMarkup}
      <p class="summary-empty">Brief was skipped for this refresh.</p>
    `;
  }

  if (summary.enabled === false) {
    return `
      ${focusMarkup}
      <p class="summary-note">Detailed brief is unavailable in this session.</p>
      <div class="summary-body">
        <p class="summary-paragraph">Your queue still loaded successfully. Use the top priority and task cards below to work from the current snapshot.</p>
      </div>
    `;
  }

  const bodyMarkup = summary.summary
    ? formatSummaryBody(summary.summary)
    : '<p class="summary-empty">No summary text was returned.</p>';

  return `
    ${focusMarkup}
    <div class="summary-body">
      ${bodyMarkup}
    </div>
  `;
}

function formatSummaryBody(value) {
  const lines = String(value || "").split("\n");
  const blocks = [];
  let listItems = [];

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      flushSummaryList(blocks, listItems);
      listItems = [];
      continue;
    }

    const isBullet = trimmedLine.startsWith("- ");
    const isSubBullet = rawLine.startsWith("  -") || rawLine.startsWith("\t-");

    if (isBullet) {
      listItems.push({
        text: trimmedLine.slice(2),
        isSubBullet
      });
      continue;
    }

    flushSummaryList(blocks, listItems);
    listItems = [];
    blocks.push(`<p class="summary-paragraph">${formatInlineSummary(trimmedLine)}</p>`);
  }

  flushSummaryList(blocks, listItems);

  return blocks.join("");
}

function flushSummaryList(blocks, listItems) {
  if (listItems.length === 0) {
    return;
  }

  blocks.push(`
    <ul class="summary-list">
      ${listItems
        .map(
          (item) => `
            <li class="summary-item ${item.isSubBullet ? "is-sub" : ""}">
              ${formatInlineSummary(item.text)}
            </li>
          `
        )
        .join("")}
    </ul>
  `);
}

function formatInlineSummary(value) {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isDashboardCacheRecord(value) {
  return Boolean(value?.payload?.snapshot && value?.healthPayload);
}

function buildDashboardCacheRecord(payload, healthPayload) {
  return {
    cachedAt: new Date().toISOString(),
    healthPayload,
    payload,
    controls: readCurrentControls()
  };
}

function writeDashboardCacheToLocalStorage(cacheRecord) {
  try {
    localStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify(cacheRecord)
    );
  } catch (error) {
    throw new Error(`browser cache save failed: ${error.message}`);
  }
}

function readDashboardCacheFromLocalStorage() {
  try {
    const rawValue = localStorage.getItem(DASHBOARD_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!isDashboardCacheRecord(parsedValue)) {
      return null;
    }

    return parsedValue;
  } catch (error) {
    return null;
  }
}

async function readDashboardCacheFromServer() {
  try {
    const cachedValue = await request("/api/dashboard/cache");
    return isDashboardCacheRecord(cachedValue) ? cachedValue : null;
  } catch {
    return null;
  }
}

async function readDashboardCache() {
  const serverCachedValue = await readDashboardCacheFromServer();

  if (serverCachedValue) {
    try {
      writeDashboardCacheToLocalStorage(serverCachedValue);
    } catch {
      // Disk-backed cache is the primary restore path for the desktop shell.
    }

    return serverCachedValue;
  }

  return readDashboardCacheFromLocalStorage();
}

async function saveDashboardCache(payload, healthPayload) {
  const cacheRecord = buildDashboardCacheRecord(payload, healthPayload);
  const saveErrors = [];

  try {
    writeDashboardCacheToLocalStorage(cacheRecord);
  } catch (error) {
    saveErrors.push(error.message);
  }

  try {
    await request("/api/dashboard/cache", {
      method: "POST",
      body: JSON.stringify(cacheRecord)
    });
  } catch (error) {
    saveErrors.push(`desktop cache save failed: ${error.message}`);
  }

  return {
    cacheRecord,
    saveError: saveErrors.join(" ")
  };
}

function clearDashboardUi() {
  currentViewState = null;
  elements.summary.innerHTML =
    '<p class="summary-empty">No saved summary yet. Refresh the queue to fetch and store one.</p>';
  elements.snapshot.textContent = "No saved portal snapshot yet.";
  elements.parserRequest.textContent = "No saved parser payload yet.";
  elements.parser.textContent = "No saved parser response yet.";
  elements.health.textContent = "No saved health response yet.";
  updateDiagnosticsCurlCommands(readCurrentControls());
  elements.statTotal.textContent = "0";
  elements.statUrgent.textContent = "0";
  elements.statBlocked.textContent = "0";
  if (elements.statMode) {
    elements.statMode.textContent = "-";
  }
  elements.boardMeta.textContent = "No saved snapshot yet.";
  elements.heroLede.textContent =
    "Refresh the queue to load the latest items for today.";
  elements.prioritySpotlight.dataset.urgency = "normal";
  elements.prioritySpotlight.innerHTML = `
    <p class="section-kicker">Do This First</p>
    <h2>No saved queue yet</h2>
    <p class="priority-next">Click Refresh queue to pull the portal, save the latest dashboard JSON locally on this device, and pin it here for the next time you open the app.</p>
    <p class="priority-support">Until you refresh, the app will stay on your last saved snapshot instead of requesting new portal data automatically.</p>
  `;
  elements.todoBoard.innerHTML = `
    <article class="todo-empty">
      <h3>No saved queue yet</h3>
      <p>Refresh the queue once to fetch the portal snapshot, store it locally on this device, and render it here on future page loads.</p>
    </article>
  `;
}

async function renderCachedDashboardOnStartup() {
  const cachedValue = await readDashboardCache();

  if (!cachedValue) {
    clearDashboardUi();
    elements.dataAge.textContent =
      "No saved snapshot yet. Refresh the queue to fetch and store one.";
    setStatus("Waiting for your first manual refresh.");
    setStatusPill("No data", "empty");
    return;
  }

  applySavedControls(cachedValue.controls);
  renderDashboard(cachedValue.payload, cachedValue.healthPayload, {
    cachedAt: cachedValue.cachedAt,
    controls: cachedValue.controls || readCurrentControls()
  });
  setStatus("Showing the last saved dashboard snapshot.");
}

function getCurrentFreshness() {
  if (!currentViewState?.payload?.snapshot) {
    return {
      ageLabel: "",
      guidance: "No saved snapshot yet.",
      state: "empty",
      statusLabel: "No data"
    };
  }

  const timestamp =
    currentViewState.payload.snapshot.fetchedAt || currentViewState.cachedAt || null;
  const parsedDate = timestamp ? new Date(timestamp) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return {
      ageLabel: "unknown age",
      guidance: "Saved snapshot age is unavailable.",
      state: "aging",
      statusLabel: "Saved"
    };
  }

  const ageMs = Math.max(0, Date.now() - parsedDate.getTime());
  const ageMinutes = Math.floor(ageMs / 60_000);
  const ageLabel = formatAgeLabel(ageMinutes);

  if (ageMinutes < 15) {
    return {
      ageLabel,
      guidance:
        ageMinutes < 1
          ? "Current saved snapshot was refreshed just now."
          : `Current saved snapshot is ${ageLabel}.`,
      state: "fresh",
      statusLabel: "Fresh"
    };
  }

  if (ageMinutes < 60) {
    return {
      ageLabel,
      guidance: `Current saved snapshot is ${ageLabel}. Refresh soon if you want a newer portal read.`,
      state: "aging",
      statusLabel: "Aging"
    };
  }

  if (ageMinutes < 240) {
    return {
      ageLabel,
      guidance: `Current saved snapshot is ${ageLabel}. Refresh before acting on time-sensitive requests.`,
      state: "stale",
      statusLabel: "Stale"
    };
  }

  return {
    ageLabel,
    guidance: `Current saved snapshot is ${ageLabel}. Refresh before trusting this queue.`,
    state: "old",
    statusLabel: "Old"
  };
}

function formatAgeLabel(ageMinutes) {
  if (ageMinutes < 1) {
    return "just now";
  }

  if (ageMinutes < 60) {
    return `${ageMinutes}m old`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;

  if (minutes === 0) {
    return `${hours}h old`;
  }

  return `${hours}h ${minutes}m old`;
}

function refreshFreshnessIndicators(customMessage = "") {
  if (!currentViewState) {
    return;
  }

  const freshness = getCurrentFreshness();
  const { payload } = currentViewState;

  elements.boardMeta.textContent = buildBoardMeta(
    payload.snapshot,
    payload.parser,
    freshness
  );
  elements.dataAge.textContent = customMessage || freshness.guidance;
  setStatusPill(freshness.statusLabel, freshness.state);
}

function buildRefreshFailureMessage(errorMessage) {
  const freshness = getCurrentFreshness();
  return `Refresh failed. Still showing the saved snapshot from ${freshness.ageLabel}. ${errorMessage}`;
}

async function loadDashboard() {
  const requestControls = cloneControls(readCurrentControls());
  setStatus("Refreshing dashboard from the portal...");
  setStatusPill("Refreshing", "loading");

  const [dashboardResult, healthResult] = await Promise.allSettled([
    request("/api/dashboard", {
      method: "POST",
      body: JSON.stringify({
        includeSummary: requestControls.includeSummary,
        focus: requestControls.focus.trim(),
        parserFocus: requestControls.parserFocus.trim(),
        parserTestchat: requestControls.parserTestchat
      })
    }),
    request("/api/health")
  ]);

  const healthPayload =
    healthResult.status === "fulfilled"
      ? healthResult.value
      : buildHealthFallbackPayload(healthResult.reason);

  elements.health.textContent = format(healthPayload);

  if (dashboardResult.status !== "fulfilled") {
    throw dashboardResult.reason;
  }

  const dashboardPayload = dashboardResult.value;

  const { saveError } = await saveDashboardCache(dashboardPayload, healthPayload);
  renderDashboard(dashboardPayload, healthPayload, {
    controls: requestControls
  });
  setStatus(
    saveError
      ? `Dashboard refreshed, but cache persistence is degraded: ${saveError}`
      : "Dashboard refreshed and saved for the next launch."
  );
}

function updateDiagnosticsCurlCommands(controls = readCurrentControls()) {
  const diagnosticsControls = cloneControls(controls);

  elements.healthCurl.textContent = buildHealthCurlCommand();
  elements.parserCurl.textContent = buildParserCurlCommand(diagnosticsControls);
  elements.snapshotCurl.textContent = buildSnapshotCurlCommand();
  elements.dashboardCurl.textContent = buildDashboardCurlCommand(diagnosticsControls);
}

function buildHealthCurlCommand() {
  return buildCurlCommand({
    method: "GET",
    path: "/api/health"
  });
}

function buildParserCurlCommand(controls) {
  return buildCurlCommand({
    method: "POST",
    path: "/api/portal/parse",
    body: {
      focus: controls.parserFocus.trim(),
      testchat: controls.parserTestchat
    }
  });
}

function buildSnapshotCurlCommand() {
  return buildCurlCommand({
    method: "POST",
    path: "/api/portal/preview",
    body: {
      includeSummary: false
    }
  });
}

function buildDashboardCurlCommand(controls) {
  return buildCurlCommand({
    method: "POST",
    path: "/api/dashboard",
    body: {
      includeSummary: controls.includeSummary,
      focus: controls.focus.trim(),
      parserFocus: controls.parserFocus.trim(),
      parserTestchat: controls.parserTestchat
    }
  });
}

function stripParserRequest(parser) {
  if (!parser || typeof parser !== "object") {
    return parser;
  }

  const { request, ...parserWithoutRequest } = parser;
  return parserWithoutRequest;
}

function buildCurlCommand({ method, path, body }) {
  const url = `${resolveApiBaseUrl()}${path}`;

  if (method === "GET") {
    return `curl -sS "${url}"`;
  }

  const rawBody = JSON.stringify(body, null, 2);
  const escapedBody = escapeCurlBody(rawBody);

  return [
    `curl -sS -X ${method} "${url}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  --data-raw '${escapedBody}'`
  ].join("\n");
}

function resolveApiBaseUrl() {
  if (window.location.protocol === "file:") {
    return "http://127.0.0.1:3000";
  }

  return window.location.origin;
}

function escapeCurlBody(value) {
  return String(value || "").replaceAll("'", "'\"'\"'");
}

function cloneControls(controls = {}) {
  return {
    includeSummary: controls.includeSummary === true,
    parserTestchat: controls.parserTestchat === true,
    focus: typeof controls.focus === "string" ? controls.focus : "",
    parserFocus: typeof controls.parserFocus === "string" ? controls.parserFocus : ""
  };
}

function renderDashboardError(message) {
  elements.heroLede.textContent = message;
  elements.prioritySpotlight.dataset.urgency = "critical";
  elements.prioritySpotlight.innerHTML = `
    <p class="section-kicker">Do This First</p>
    <h2>Attention needed</h2>
    <p class="priority-next">${escapeHtml(message)}</p>
    <p class="priority-support">Open Diagnostics if you need to inspect the health check, parser output, or raw portal snapshot.</p>
  `;
  elements.todoBoard.innerHTML = `
    <article class="todo-empty">
      <h3>Attention needed</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function handleTodoBoardClick(event) {
  const regenerateBtn = event.target.closest("[data-ai-regenerate]");

  if (regenerateBtn) {
    handleAction(loadDashboard);
    return;
  }

  const toggle = event.target.closest("[data-ai-toggle]");

  if (!toggle) {
    return;
  }

  const card = toggle.closest("[data-ai-card]");

  if (!card) {
    return;
  }

  const expandedPanel = card.querySelector(".ai-summary-card__expanded");
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  const nextExpandedState = !isExpanded;

  toggle.setAttribute("aria-expanded", nextExpandedState ? "true" : "false");
  toggle.querySelector("span")?.replaceChildren(
    document.createTextNode(nextExpandedState ? "Collapse" : "Expand")
  );
  card.dataset.expanded = nextExpandedState ? "true" : "false";

  if (expandedPanel) {
    expandedPanel.hidden = !nextExpandedState;
  }
}

async function handleAction(action) {
  setLoadingState(true);

  try {
    await action();
  } catch (error) {
    if (currentViewState) {
      const failureMessage = buildRefreshFailureMessage(error.message);
      setStatus(failureMessage);
      refreshFreshnessIndicators(failureMessage);
    } else {
      setStatus(error.message);
      setStatusPill("Needs attention", "error");
      renderDashboardError(error.message);
      elements.dataAge.textContent =
        "No saved snapshot is available yet. Refresh again after the portal issue is resolved.";
    }
  } finally {
    setLoadingState(false);
  }
}

elements.dashboardRefresh.addEventListener("click", () => {
  handleAction(loadDashboard);
});

elements.todoBoard.addEventListener("click", handleTodoBoardClick);

async function initializeApp() {
  applyDefaults();
  updateDiagnosticsCurlCommands(readCurrentControls());
  await renderCachedDashboardOnStartup();
  setInterval(() => {
    refreshFreshnessIndicators();
  }, FRESHNESS_TICK_MS);
}

void initializeApp();
