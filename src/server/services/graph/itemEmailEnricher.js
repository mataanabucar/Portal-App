/**
 * Enriches snapshot records with email context from MS Graph.
 *
 * For each record that has a recognizable numeric ID, the most recent email
 * in the matching thread is fetched and formatted as plain text, then stored
 * on the record as `emailContext`. Records that have no matching email, or
 * for which the lookup fails, are returned unchanged.
 *
 * This is intentionally best-effort: a failed lookup for one record never
 * blocks the others and never surfaces as an error to the caller.
 */

import { findItemEmail } from "./services/itemEmailService.js";

/**
 * @param {string} token  Valid Graph access token (Mail.Read scope)
 * @param {object[]} records  Snapshot records array
 * @param {{ summarize?: (text: string) => Promise<string> }} [options]
 * @returns {Promise<object[]>}
 */
export async function enrichRecordsWithEmail(token, records, { summarize } = {}) {
  if (!Array.isArray(records) || records.length === 0) return records;

  return Promise.all(
    records.map(async (record) => {
      const ids = extractEmailSearchIds(record);
      if (!ids.requestId && !ids.relatedActionItem) return record;

      try {
        const emailResult = await findItemEmail(token, ids);
        if (!emailResult) return record;

        const rawContext = formatEmailContext(emailResult);
        const emailContext = summarize
          ? await summarize(rawContext).catch(() => rawContext)
          : rawContext;

        return { ...record, emailContext };
      } catch {
        return record;
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function extractEmailSearchIds(record) {
  // Numeric ID from title — e.g. "#1232413" or "Action Item 1232413"
  const titleMatch = String(record?.title || "").match(/\b(\d{4,})\b/);
  const requestId = titleMatch?.[1] || "";

  // relatedActionItem from the issueItem or id field
  const relatedActionItem = String(record?.issueItem || record?.id || "").trim();

  return { requestId, relatedActionItem };
}

function formatEmailContext(email) {
  const from = [email.from?.name, email.from?.address].filter(Boolean).join(" ");
  const date = email.receivedDateTime
    ? new Date(email.receivedDateTime).toLocaleString("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";
  const bodyText =
    email.body.contentType === "html"
      ? stripHtml(email.body.content)
      : email.body.content;

  return clipText(
    [
      from && `From: ${from}`,
      date && `Received: ${date}`,
      email.subject && `Subject: ${email.subject}`,
      "",
      bodyText,
    ]
      .filter((s) => s !== undefined)
      .join("\n"),
    2500
  );
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clipText(value, maxChars) {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}
