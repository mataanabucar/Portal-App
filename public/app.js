const elements = {
  boardMeta: document.querySelector("#board-meta"),
  dashboardRefresh: document.querySelector("#refresh-dashboard"),
  dataAge: document.querySelector("#data-age"),
  health: document.querySelector("#health-output"),
  heroLede: document.querySelector("#hero-lede"),
  includeSummary: document.querySelector("#include-summary"),
  parser: document.querySelector("#parser-output"),
  parserFocus: document.querySelector("#parser-focus-text"),
  parserTestchat: document.querySelector("#parser-testchat"),
  prioritySpotlight: document.querySelector("#priority-spotlight"),
  snapshot: document.querySelector("#snapshot-output"),
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
    "Extract each request into structured fields with requester, application, urgency, summary, next action, blockers, and due date."
};

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

function renderDashboard(payload, healthPayload, options = {}) {
  const summaryMarkup = renderSummary(payload.summary, elements.focus.value.trim());
  const todoItems = buildTodoItems(payload);
  const blockedCount = todoItems.filter((item) => item.blockers.length > 0).length;
  const urgentCount = todoItems.filter((item) =>
    ["critical", "high"].includes(item.urgency)
  ).length;

  currentViewState = {
    cachedAt: options.cachedAt || new Date().toISOString(),
    healthPayload,
    payload
  };

  elements.summary.innerHTML = summaryMarkup;
  elements.snapshot.textContent = format(payload.snapshot);
  elements.parser.textContent = format(payload.parser);
  elements.health.textContent = format(healthPayload);
  elements.statTotal.textContent = String(todoItems.length);
  elements.statUrgent.textContent = String(urgentCount);
  elements.statBlocked.textContent = String(blockedCount);
  if (elements.statMode) {
    elements.statMode.textContent = formatParserMode(payload.parser.mode);
  }
  elements.heroLede.textContent = buildHeroLede(todoItems, payload.summary, payload.parser);

  renderPrioritySpotlight(todoItems, payload.parser);
  renderTodoBoard(todoItems, payload.parser);
  refreshFreshnessIndicators();
}

function buildTodoItems(payload) {
  if (
    payload.parser?.mode === "structured" &&
    Array.isArray(payload.parser?.parsed?.items) &&
    payload.parser.parsed.items.length > 0
  ) {
    return payload.parser.parsed.items
      .map((item) => normalizeParsedTodo(item))
      .sort(compareTodoItems);
  }

  return Array.isArray(payload.snapshot?.records)
    ? payload.snapshot.records
        .map((record) => normalizeSnapshotTodo(record))
        .sort(compareTodoItems)
    : [];
}

function normalizeParsedTodo(item) {
  return {
    id: item.id || "",
    title: item.title || "Untitled request",
    urgency: normalizeUrgency(item.urgency),
    nextAction: item.nextAction || "Review this request and determine the next step.",
    summary: item.summary || "",
    dueDate: item.dueDate || "",
    requester: item.requester || "",
    application: item.application || "",
    owner: item.owner || "",
    blockers: Array.isArray(item.blockers)
      ? item.blockers.filter((blocker) => typeof blocker === "string" && blocker.trim())
      : [],
    confidence: Number.isFinite(item.confidence) ? item.confidence : null,
    source: "parsed"
  };
}

function normalizeSnapshotTodo(record) {
  return {
    id: record.id || "",
    title: record.title || "Untitled request",
    urgency: inferUrgencyFromSnapshot(record),
    nextAction: record.detailPageContent
      ? "Review the request details and decide the owner response."
      : "Review the request detail and determine the owner action.",
    summary: record.detail || "",
    dueDate: record.dueDate || "",
    requester: extractRequester(record.detail || ""),
    application: extractApplication(record.detail || ""),
    owner: record.owner || "",
    blockers: record.detailPageError ? [record.detailPageError] : [],
    confidence: null,
    source: "snapshot"
  };
}

function renderPrioritySpotlight(items, parser) {
  if (items.length === 0) {
    elements.prioritySpotlight.dataset.urgency = "normal";
    elements.prioritySpotlight.innerHTML = `
      <p class="section-kicker">Do This First</p>
      <h2>No active priority yet</h2>
      <p class="priority-next">${
        parser.mode === "testchat"
          ? "Snapshot cards are available, but structured parser guidance is reduced while test chat mode is active."
          : "When portal items are returned, the first move will land here as a quick priority note."
      }</p>
      <p class="priority-support">Refresh the queue or review diagnostics if the result looks incomplete.</p>
    `;
    return;
  }

  const leadItem = items[0];
  const blockerPreview = leadItem.blockers[0]
    ? clipText(leadItem.blockers[0], 120)
    : "";

  elements.prioritySpotlight.dataset.urgency = leadItem.urgency;
  elements.prioritySpotlight.innerHTML = `
    <div class="priority-top">
      <div>
        <p class="section-kicker">Do This First</p>
        <h2>${escapeHtml(leadItem.title)}</h2>
      </div>
      <div class="priority-badges">
        <span class="urgency-badge" data-urgency="${escapeHtml(leadItem.urgency)}">${escapeHtml(formatUrgencyLabel(leadItem.urgency))}</span>
        <span class="todo-id">${escapeHtml(buildTaskLabel(leadItem, 0))}</span>
      </div>
    </div>
    <p class="todo-next-label">Start with</p>
    <p class="priority-next">${escapeHtml(leadItem.nextAction)}</p>
    <p class="priority-support">${escapeHtml(buildPriorityReason(leadItem))}</p>
    <div class="todo-chip-row">
      ${buildMetaChips(leadItem)}
    </div>
    ${
      blockerPreview
        ? `<p class="priority-blocker-inline">${escapeHtml(blockerPreview)}</p>`
        : ""
    }
  `;
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
    return;
  }

  elements.todoBoard.innerHTML = items
    .map((item, index) => {
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
        typeof item.confidence === "number"
          ? `Confidence ${Math.round(item.confidence * 100)}%`
          : item.source === "snapshot"
            ? "Portal snapshot fallback"
            : "Confidence not available";

      return `
        <article class="todo-card dashboard-sheen-card ${index === 0 ? "is-leading" : ""}" data-urgency="${escapeHtml(item.urgency)}">
          <span class="dashboard-sheen-card__glint" aria-hidden="true"></span>
          <div class="todo-card-top">
            <span class="todo-rank">${escapeHtml(index === 0 ? "Up next" : "In queue")}</span>
            <div class="todo-card-header">
              <span class="urgency-badge" data-urgency="${escapeHtml(item.urgency)}">${escapeHtml(formatUrgencyLabel(item.urgency))}</span>
              <span class="todo-id">${escapeHtml(buildTaskLabel(item, index))}</span>
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
            <p class="todo-confidence">${escapeHtml(confidenceText)}</p>
            <p class="todo-status">${escapeHtml(buildFooterStatus(item))}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function buildMetaChips(item) {
  const metaTokens = [
    item.requester ? `Requester: ${item.requester}` : "",
    item.application ? `App: ${item.application}` : "",
    item.owner ? `Owner: ${item.owner}` : "",
    item.dueDate ? `Due: ${item.dueDate}` : ""
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

function buildPriorityFooter(item) {
  const parts = [buildFooterStatus(item)];

  if (item.blockers.length > 0) {
    parts.push("Blocked items are surfaced inline below.");
  } else {
    parts.push("No blockers were surfaced for this task.");
  }

  return parts.join(" ");
}

function buildPriorityReason(item) {
  if (item.blockers.length > 0) {
    return "It rises first because it is blocked and needs follow-up before the rest of the queue can move.";
  }

  if (item.dueDate) {
    return `It carries the earliest due date in today's queue.`;
  }

  return "It is the clearest first move in today's queue.";
}

function buildFooterStatus(item) {
  if (item.dueDate) {
    return `Due ${item.dueDate}`;
  }

  if (item.blockers.length > 0) {
    return "Needs blocker resolution";
  }

  return "Needs review";
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

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function clipText(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function saveDashboardCache(payload, healthPayload) {
  try {
    localStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        healthPayload,
        payload
      })
    );
  } catch (error) {
    setStatus(`Dashboard loaded, but local save failed: ${error.message}`);
  }
}

function readDashboardCache() {
  try {
    const rawValue = localStorage.getItem(DASHBOARD_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue?.payload?.snapshot || !parsedValue?.healthPayload) {
      return null;
    }

    return parsedValue;
  } catch (error) {
    return null;
  }
}

function clearDashboardUi() {
  currentViewState = null;
  elements.summary.innerHTML =
    '<p class="summary-empty">No saved summary yet. Refresh the queue to fetch and store one.</p>';
  elements.snapshot.textContent = "No saved portal snapshot yet.";
  elements.parser.textContent = "No saved parser response yet.";
  elements.health.textContent = "No saved health response yet.";
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
    <p class="priority-next">Click Refresh queue to pull the portal, save the latest dashboard JSON locally, and pin it here for the next time you open the app.</p>
    <p class="priority-support">Until you refresh, the app will stay on your last saved snapshot instead of requesting new portal data automatically.</p>
  `;
  elements.todoBoard.innerHTML = `
    <article class="todo-empty">
      <h3>No saved queue yet</h3>
      <p>Refresh the queue once to fetch the portal snapshot, store it locally in this browser, and render it here on future page loads.</p>
    </article>
  `;
}

function renderCachedDashboardOnStartup() {
  const cachedValue = readDashboardCache();

  if (!cachedValue) {
    clearDashboardUi();
    elements.dataAge.textContent =
      "No saved snapshot yet. Refresh the queue to fetch and store one.";
    setStatus("Waiting for your first manual refresh.");
    setStatusPill("No data", "empty");
    return;
  }

  renderDashboard(cachedValue.payload, cachedValue.healthPayload, {
    cachedAt: cachedValue.cachedAt
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
  setStatus("Refreshing dashboard from the portal...");
  setStatusPill("Refreshing", "loading");

  const [dashboardResult, healthResult] = await Promise.allSettled([
    request("/api/dashboard", {
      method: "POST",
      body: JSON.stringify({
        includeSummary: elements.includeSummary.checked,
        focus: elements.focus.value.trim(),
        parserFocus: elements.parserFocus.value.trim(),
        parserTestchat: elements.parserTestchat.checked
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

  saveDashboardCache(dashboardPayload, healthPayload);
  renderDashboard(dashboardPayload, healthPayload);
  setStatus("Dashboard refreshed and saved locally.");
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

applyDefaults();
renderCachedDashboardOnStartup();
setInterval(() => {
  refreshFreshnessIndicators();
}, FRESHNESS_TICK_MS);
