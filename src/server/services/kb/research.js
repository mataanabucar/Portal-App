import {
  buildKbContentUrl,
  normalizeKbRows,
  normalizeKbSearchHits,
} from "./index.js";

const MAX_KB_EVIDENCE_BLOCKS = 3;

export async function collectKbResearch({
  kbService,
  itemContext,
  primarySearchTerm,
  fallbackTerms = [],
  kbAuthToken,
}) {
  const trail = [];
  const evidenceBlocks = [];

  if (!kbService) {
    trail.push({
      tool: "kb_search",
      summary: "Knowledge Base service is unavailable in this server build.",
    });
    return { trail, evidenceBlocks };
  }

  const kbStatus = kbService.describe();
  if (!kbStatus.enabled) {
    trail.push({
      tool: "kb_search",
      summary: "Knowledge Base service is disabled because the endpoint is not configured.",
    });
    return { trail, evidenceBlocks };
  }

  const authToken = normalizeText(kbAuthToken);
  if (!kbStatus.authConfigured && !authToken) {
    trail.push({
      tool: "kb_search",
      summary: "Knowledge Base search skipped because KB_AUTH_TOKEN is not configured for server-side research.",
    });
    return { trail, evidenceBlocks };
  }

  const title = extractContextLine(itemContext, "Title");
  const options = authToken ? { authToken } : {};

  const tasks = [];
  if (title) {
    tasks.push({
      kind: "title",
      term: title,
      promise: kbService.callDetailed("findContentByTitle", { title }, options),
    });
  }

  if (primarySearchTerm) {
    tasks.push({
      kind: "search",
      term: primarySearchTerm,
      promise: kbService.searchContentDetailed(
        {
          query: primarySearchTerm,
          limit: 5,
          start: 0,
        },
        options
      ),
    });
  }

  const settledTasks = await Promise.allSettled(tasks.map((task) => task.promise));
  for (let index = 0; index < settledTasks.length; index += 1) {
    const task = tasks[index];
    const result = settledTasks[index];

    if (result.status === "rejected") {
      trail.push({
        tool: task.kind === "title" ? "kb_debug" : "kb_search",
        summary: `KB ${task.kind} "${task.term}" failed: ${result.reason?.message || result.reason}`,
      });
      continue;
    }

    if (task.kind === "title") {
      const rows = normalizeKbRows(result.value.data);
      trail.push({
        tool: "kb_debug",
        summary: `KB title lookup "${task.term}" -> ${rows.length} match(es)`,
      });

      if (rows.length > 0) {
        evidenceBlocks.push({
          source: "kb",
          label: `KB title match: ${task.term}`,
          location: "findContentByTitle",
          webUrl: buildKbContentUrl(getContentId(rows[0])),
          language: "Knowledge Base",
          snippets: formatKbTitleRows(rows),
        });
      }
      continue;
    }

    const hits = normalizeKbSearchHits(result.value.data);
    trail.push({
      tool: "kb_search",
      summary:
        `KB search "${task.term}" -> ${hits.length} hit(s)` +
        (result.value.warning ? ` | ${result.value.warning}` : ""),
    });

    if (hits.length > 0) {
      evidenceBlocks.push({
        source: "kb",
        label: `KB search: ${task.term}`,
        location: "searchAsAgent",
        webUrl: buildKbContentUrl(hits[0]?.contentid),
        language: "Knowledge Base",
        snippets: formatKbSearchHits(hits),
      });
    }
  }

  if (evidenceBlocks.length === 0) {
    for (const fallbackTerm of fallbackTerms.slice(0, 2)) {
      try {
        const fallback = await kbService.searchContentDetailed(
          {
            query: fallbackTerm,
            limit: 5,
            start: 0,
          },
          options
        );
        const hits = normalizeKbSearchHits(fallback.data);
        trail.push({
          tool: "kb_search",
          summary:
            `KB fallback "${fallbackTerm}" -> ${hits.length} hit(s)` +
            (fallback.warning ? ` | ${fallback.warning}` : ""),
        });
        if (hits.length > 0) {
          evidenceBlocks.push({
            source: "kb",
            label: `KB fallback search: ${fallbackTerm}`,
            location: "searchAsAgent",
            webUrl: buildKbContentUrl(hits[0]?.contentid),
            language: "Knowledge Base",
            snippets: formatKbSearchHits(hits),
          });
          break;
        }
      } catch (error) {
        trail.push({
          tool: "kb_search",
          summary: `KB fallback "${fallbackTerm}" failed: ${error.message}`,
        });
      }
    }
  }

  return {
    trail,
    evidenceBlocks: evidenceBlocks.slice(0, MAX_KB_EVIDENCE_BLOCKS),
  };
}

function formatKbTitleRows(rows) {
  return rows
    .slice(0, 3)
    .map((row) => {
      const contentId = getContentId(row);
      const title = pickField(row, ["title", "TITLE"]) || `Content ${contentId}`;
      const excerpt = buildExcerpt(
        pickField(row, ["summary", "SUMMARY", "content", "CONTENT", "description", "DESCRIPTION"])
      );
      const url = buildKbContentUrl(contentId);

      return [
        `- ${title} (contentid: ${contentId || "unknown"})`,
        url ? `  URL: ${url}` : "",
        excerpt ? `  Excerpt: ${excerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function formatKbSearchHits(hits) {
  return hits
    .slice(0, 3)
    .map((hit) => {
      const url = buildKbContentUrl(hit.contentid);
      return [
        `- ${hit.title || "Untitled"} (contentid: ${hit.contentid || "unknown"})`,
        url ? `  URL: ${url}` : "",
        hit.lastmodified ? `  Last Modified: ${hit.lastmodified}` : "",
        hit.binderids ? `  Binder IDs: ${hit.binderids}` : "",
        hit.excerpt ? `  Excerpt: ${hit.excerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function getContentId(row) {
  return pickField(row, ["contentid", "CONTENTID", "originid", "ORIGINID"]);
}

function pickField(row, keys) {
  for (const key of keys) {
    const normalized = normalizeText(row?.[key]);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function extractContextLine(itemContext, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = itemContext.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
}

function normalizeText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function buildExcerpt(value) {
  const normalized = normalizeText(value).replace(/\s+/g, " ");
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}
