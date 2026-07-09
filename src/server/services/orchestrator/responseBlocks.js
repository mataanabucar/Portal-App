// Shared structured response contract for the deterministic orchestrator.
// Pure helpers only — no service imports, no I/O.
//
// Block shapes:
//   { type: "text",    text }
//   { type: "summary", title, text }
//   { type: "table",   title?, columns: [string], rows: [[cell, ...]] }
//   { type: "actions", items: [{ title, owner?, dueDate?, priority?, status?, sourceText? }] }
//   { type: "sources", sources: [NormalizedSource] }
//   { type: "image",   url, alt? }   // url must pass isSafeImageUrl
//   { type: "chart",   title, table: { columns, rows } }  // renderer falls back to table
//
// NormalizedSource:
//   { type, title, path, heading?, startLine?, endLine?, snippet }
//   type: "app_doc" | "code" | "kb" | "gstudio" | "graph" | "teamgpt" | "research"

export function textBlock(text) {
  return { type: "text", text: toText(text) };
}

export function summaryBlock({ title, text }) {
  return { type: "summary", title: toText(title) || "Summary", text: toText(text) };
}

export function tableBlock({ title, columns, rows }) {
  return {
    type: "table",
    title: toText(title) || undefined,
    columns: Array.isArray(columns) ? columns.map((c) => toText(c)) : [],
    rows: Array.isArray(rows)
      ? rows.map((row) => (Array.isArray(row) ? row.map((cell) => toText(cell)) : []))
      : []
  };
}

export function actionsBlock(items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map(normalizeActionItem)
    .filter(Boolean);
  return { type: "actions", items: normalized };
}

export function normalizeActionItem(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const title = toText(raw.title ?? raw.task ?? raw.item);
  if (!title) {
    return null;
  }
  const item = { title };
  const owner = toText(raw.owner ?? raw.assignee);
  const dueDate = toText(raw.dueDate ?? raw.due_date ?? raw.due);
  const priority = toText(raw.priority);
  const status = toText(raw.status);
  const sourceText = toText(raw.sourceText ?? raw.source_text ?? raw.source);
  if (owner) item.owner = owner;
  if (dueDate) item.dueDate = dueDate;
  if (priority) item.priority = priority;
  if (status) item.status = status;
  if (sourceText) item.sourceText = sourceText;
  return item;
}

export function sourcesBlock(sources) {
  return {
    type: "sources",
    sources: (Array.isArray(sources) ? sources : []).map(normalizeSource)
  };
}

export function imageBlock({ url, alt }) {
  const safeUrl = toText(url);
  if (!isSafeImageUrl(safeUrl)) {
    return null;
  }
  return { type: "image", url: safeUrl, alt: toText(alt) || "Image" };
}

export function chartBlock({ title, columns, rows }) {
  return {
    type: "chart",
    title: toText(title) || "Chart",
    table: tableBlock({ columns, rows })
  };
}

// Only plain http(s) URLs or app-relative paths ("/x", not protocol-relative
// "//host"). Blocks data:, javascript:, file:, etc.
export function isSafeImageUrl(url) {
  if (typeof url !== "string" || !url) {
    return false;
  }
  if (/^https?:\/\//i.test(url)) {
    return true;
  }
  return url.startsWith("/") && !url.startsWith("//");
}

const SOURCE_TYPES = new Set([
  "app_doc",
  "code",
  "kb",
  "gstudio",
  "graph",
  "teamgpt",
  "research"
]);

export function normalizeSource(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const type = SOURCE_TYPES.has(source.type) ? source.type : "kb";
  const normalized = {
    type,
    title: toText(source.title) || toText(source.path) || type,
    path: toText(source.path),
    snippet: toText(source.snippet)
  };
  if (source.heading) normalized.heading = toText(source.heading);
  if (Number.isFinite(source.startLine)) normalized.startLine = source.startLine;
  if (Number.isFinite(source.endLine)) normalized.endLine = source.endLine;
  if (Number.isFinite(source.id) || typeof source.id === "string") {
    normalized.id = source.id;
  }
  return normalized;
}

export function buildOrchestratorResponse({
  route,
  provider,
  answer,
  blocks = [],
  sources = [],
  toolTrace = [],
  model = null,
  debug = null
}) {
  const text = typeof answer === "string" ? answer.trim() : "";
  const finalBlocks =
    Array.isArray(blocks) && blocks.length > 0
      ? blocks.filter(Boolean)
      : text
        ? [textBlock(text)]
        : [];
  return {
    answer: text,
    content: text,
    blocks: finalBlocks,
    sources: (Array.isArray(sources) ? sources : []).map(normalizeSource),
    toolTrace: Array.isArray(toolTrace) ? toolTrace : [],
    provider: toText(provider),
    route: toText(route),
    model,
    debug
  };
}

function toText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}
