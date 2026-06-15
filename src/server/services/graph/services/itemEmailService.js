/**
 * Item email lookup service.
 *
 * Finds the most recent email in a conversation thread related to a portal
 * item, matching by Request ID and/or Related Action Item number.
 *
 * Required scopes: Mail.Read
 *
 * Search strategy (two-pass):
 *   Pass 1 — full-text search by each ID value to collect candidate messages
 *            and their conversation IDs.
 *   Pass 2 — filter by conversationId, ordered by receivedDateTime desc, to
 *            get the newest message in the thread with its full body.
 */

import { graphRequest } from "../graphRequest.js";

const SEARCH_SELECT = "id,subject,from,receivedDateTime,conversationId";
const FULL_SELECT = "id,subject,from,receivedDateTime,body,conversationId";

/**
 * Find the most recent email related to a portal item.
 *
 * @param {string} token  Bearer access token (Mail.Read scope required)
 * @param {{ requestId?: string, relatedActionItem?: string }} ids
 * @returns {Promise<ItemEmailResult | null>}
 */
export async function findItemEmail(token, { requestId, relatedActionItem } = {}) {
  const terms = deduplicateTerms([requestId, relatedActionItem]);

  if (terms.length === 0) return null;

  // Pass 1: search for each term and collect all candidate messages.
  const candidates = await collectCandidates(token, terms);

  if (candidates.length === 0) return null;

  // Sort by date descending and pick the best match — prefer messages whose
  // subject contains one of the search terms, then fall back to most recent.
  candidates.sort((a, b) => compareReceivedDateTime(b, a));

  const bestMatch =
    candidates.find((m) => subjectContainsAnyTerm(m.subject, terms)) ||
    candidates[0];

  // Pass 2: get the newest message in the conversation thread (full body).
  const threadHead = await fetchNewestInThread(token, bestMatch.conversationId, bestMatch.id);

  if (!threadHead) return null;

  return serializeMessage(threadHead);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function collectCandidates(token, terms) {
  const seen = new Set();
  const results = [];

  for (const term of terms) {
    let messages;

    try {
      const data = await graphRequest({
        method: "GET",
        path: "/me/messages",
        token,
        query: {
          $search: `"${term}"`,
          $top: 10,
          $select: SEARCH_SELECT,
        },
        headers: { ConsistencyLevel: "eventual" },
      });
      messages = data?.value ?? [];
    } catch {
      // Partial failure for one term should not block the other.
      messages = [];
    }

    for (const msg of messages) {
      if (msg.id && !seen.has(msg.id)) {
        seen.add(msg.id);
        results.push(msg);
      }
    }
  }

  return results;
}

async function fetchNewestInThread(token, conversationId, fallbackMessageId) {
  if (conversationId) {
    try {
      const data = await graphRequest({
        method: "GET",
        path: "/me/messages",
        token,
        query: {
          $filter: `conversationId eq '${conversationId}'`,
          $orderby: "receivedDateTime desc",
          $top: 1,
          $select: FULL_SELECT,
        },
      });
      const msg = data?.value?.[0];
      if (msg) return msg;
    } catch {
      // Fall through to direct fetch.
    }
  }

  // Fallback: fetch the best-match message directly with full body.
  try {
    return await graphRequest({
      method: "GET",
      path: `/me/messages/${fallbackMessageId}`,
      token,
      query: { $select: FULL_SELECT },
    });
  } catch {
    return null;
  }
}

function serializeMessage(msg) {
  const emailAddress = msg.from?.emailAddress;

  return {
    messageId: msg.id || "",
    subject: msg.subject || "",
    from: emailAddress
      ? { name: emailAddress.name || null, address: emailAddress.address || "" }
      : null,
    receivedDateTime: msg.receivedDateTime || null,
    conversationId: msg.conversationId || null,
    body: {
      contentType: msg.body?.contentType || "text",
      content: msg.body?.content || "",
    },
  };
}

function deduplicateTerms(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized && normalized.toLowerCase() !== "not visible" && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function subjectContainsAnyTerm(subject, terms) {
  if (!subject) return false;
  const lower = subject.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

function compareReceivedDateTime(a, b) {
  const ta = a.receivedDateTime ? new Date(a.receivedDateTime).getTime() : 0;
  const tb = b.receivedDateTime ? new Date(b.receivedDateTime).getTime() : 0;
  return ta - tb;
}
