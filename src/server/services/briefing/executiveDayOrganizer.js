// Executive Day Organizer: two-stage briefing pipeline over Microsoft Graph
// data. Stage 1 (prefilter) turns raw calendar/email/Teams items into strict
// JSON; Stage 2 turns that JSON — and nothing else — into the final executive
// briefing markdown. Graph source IDs are preserved end-to-end: every ID the
// model returns is validated against the fetched items, and webLinks are
// re-joined server-side so links can never be hallucinated.

import OpenAI from "openai";
import { createTeamGptClient } from "../teamgpt/client.js";
import { extractJsonObject } from "../teamgpt/tasks.js";
import { getMyCalendarView } from "../graph/services/calendarService.js";
import {
  listInboxMessages,
  listUnreadMessages,
} from "../graph/services/mailService.js";
import { listRecentChatMessages } from "../graph/services/teamsChatService.js";
import {
  STAGE1_PREFILTER_TEMPLATE,
  STAGE2_ORGANIZER_TEMPLATE,
  renderTemplate,
  buildUserContext,
} from "./prompts.js";

const EMAIL_SELECT =
  "id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,importance,webLink";
// Teams chats excluded from the briefing before Stage 1 ever sees them
// (case-insensitive exact topic match). "Escalate an issue!" is an ambient
// support channel whose name alone trips the prefilter's escalation rules.
const EXCLUDED_CHAT_TOPICS = new Set(["escalate an issue!"]);
// Emails whose subject contains any of these (case-insensitive substring) are
// dropped before Stage 1. "Team Action Item" reminder blasts (e.g.
// "<NEED UPDATE!> Team Action Item: …") come from human assignees so the
// automated-sender rule misses them, and they get elevated by the ATS/
// Compliance focus rules — user asked to keep them out of the triage entirely.
const EXCLUDED_EMAIL_SUBJECT_PATTERNS = ["team action item"];
const CALENDAR_TOP = 50;
const INBOX_TOP = 30;
const UNREAD_TOP = 20;
const CHAT_LIMIT = 40;
const PREVIEW_CHARS = 300;
const STAGE1_WORD_LIMIT = 3000;
const STAGE2_WORD_LIMIT = 1200;
const JSON_RETRY_REMINDER =
  "\n\nREMINDER: Your previous answer was not valid JSON. Respond with VALID JSON only, exactly matching the schema above — no prose, no code fences.";

export function createExecutiveDayOrganizer(config, { teamGptAuthService } = {}) {
  const openAiClient =
    config.openAiEnabled && config.openAiApiKey
      ? new OpenAI({ apiKey: config.openAiApiKey })
      : null;
  const teamGptClient = createTeamGptClient(config, teamGptAuthService);
  const provider = config.briefingProvider === "openai" ? "openai" : "teamgpt";

  function assertProviderAvailable() {
    if (provider === "teamgpt" && !teamGptClient) {
      throw httpError(
        "TeamGPT is not available for the day organizer. Verify TeamGPT page access and local browser auth, or set BRIEFING_PROVIDER=openai.",
        503
      );
    }
    if (provider === "openai" && !openAiClient) {
      throw httpError(
        "OpenAI is not enabled for the day organizer. Set OPENAI_API_KEY and OPENAI_ENABLED=true, or set BRIEFING_PROVIDER=teamgpt.",
        503
      );
    }
  }

  async function runStage({ prompt, wordLimit, endpointUrl, model }) {
    if (provider === "teamgpt") {
      const result = await teamGptClient.completeText({
        prompt,
        endpointUrl,
        model,
        wordLimit,
        temperature: 0.2,
        format: "plain_text",
      });
      return { text: result.text || "", model: result.model };
    }
    const response = await openAiClient.responses.create({
      model: config.openAiModel,
      store: false,
      input: prompt,
    });
    return { text: response.output_text || "", model: config.openAiModel };
  }

  const stage1Transport =
    provider === "teamgpt"
      ? {
          endpointUrl: config.teamGptParserEndpointUrl || config.teamGptEndpointUrl,
          model: config.teamGptParserModel || config.teamGptModel,
        }
      : {};
  const stage2Transport =
    provider === "teamgpt"
      ? {
          endpointUrl: config.teamGptSummaryEndpointUrl || config.teamGptEndpointUrl,
          model: config.teamGptSummaryModel || config.teamGptModel,
        }
      : {};

  return {
    describe() {
      return {
        provider,
        model:
          provider === "teamgpt"
            ? stage2Transport.model || config.teamGptModel
            : config.openAiModel,
      };
    },

    async generateBriefing({ token, userContext = "" } = {}) {
      assertProviderAvailable();

      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const todayDate = formatTodayDate(now);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // ── Fetch raw Graph data (each source degrades independently) ─────────
      const fetchStarted = Date.now();
      const [calendarResult, inboxResult, unreadResult, chatsResult] =
        await Promise.allSettled([
          getMyCalendarView(token, toLocalIso(startOfDay), toLocalIso(endOfDay), {
            top: CALENDAR_TOP,
          }),
          listInboxMessages(token, {
            top: INBOX_TOP,
            select: EMAIL_SELECT,
            orderby: "receivedDateTime desc",
          }),
          listUnreadMessages(token, { top: UNREAD_TOP, select: EMAIL_SELECT }),
          listRecentChatMessages(token, { sinceIso, limit: CHAT_LIMIT }),
        ]);
      const fetchMs = Date.now() - fetchStarted;

      const sourceFailures = [];
      const rawEvents = settledValue(calendarResult, "calendar", sourceFailures) || [];
      const rawInbox = settledValue(inboxResult, "email", sourceFailures) || [];
      const rawUnread = settledValue(unreadResult, "unread email", sourceFailures) || [];
      const rawChats = settledValue(chatsResult, "teams", sourceFailures) || [];

      if (
        calendarResult.status === "rejected" &&
        inboxResult.status === "rejected" &&
        chatsResult.status === "rejected"
      ) {
        throw httpError(
          `Could not fetch any Microsoft 365 data (calendar, email, and Teams all failed). First error: ${sourceFailures[0]?.error || "unknown"}`,
          502
        );
      }

      // ── Normalize + build the source-ID map ───────────────────────────────
      // Items are sent to the LLM with short surrogate IDs (cal-1, em-3, tm-2):
      // real Graph IDs are ~150-char base64 blobs the model reliably mangles
      // when re-quoting them. The map resolves surrogates back to the real
      // Graph ID + webLink after validation, so true source IDs survive the
      // pipeline without ever passing through the model.
      const sourceMap = new Map();

      const events = rawEvents
        .filter((event) => event?.id && !event.isCancelled)
        .map((event, index) => normalizeEvent(event, `cal-${index + 1}`, sourceMap));

      const seenEmailIds = new Set();
      const conversationKeys = new Map();
      const emails = [];
      for (const message of [...rawInbox, ...rawUnread]) {
        if (!message?.id || seenEmailIds.has(message.id)) continue;
        // Inbox list covers the last 24h window; unread messages are kept
        // regardless of age.
        const receivedTime = message.receivedDateTime
          ? new Date(message.receivedDateTime).toISOString()
          : "";
        if (message.isRead && receivedTime && receivedTime < sinceIso) continue;
        const subjectLc = String(message.subject ?? "").toLowerCase();
        if (EXCLUDED_EMAIL_SUBJECT_PATTERNS.some((p) => subjectLc.includes(p))) {
          continue;
        }
        seenEmailIds.add(message.id);
        emails.push(
          normalizeEmail(message, `em-${emails.length + 1}`, conversationKeys, sourceMap)
        );
      }

      const chats = rawChats
        .filter((message) => message?.id && message?.chatId)
        .filter(
          (message) =>
            !EXCLUDED_CHAT_TOPICS.has(String(message.topic ?? "").trim().toLowerCase())
        )
        .map((message, index) =>
          normalizeChatMessage(message, `tm-${index + 1}`, sourceMap)
        );

      const contextText = buildUserContext(userContext) || "None.";

      // ── Stage 1: prefilter (never skipped) ────────────────────────────────
      const stage1Prompt = renderTemplate(STAGE1_PREFILTER_TEMPLATE, {
        TODAY_DATE: todayDate,
        USER_TIMEZONE: timezone,
        RAW_CALENDAR_EVENTS: JSON.stringify(events),
        RAW_EMAIL_MESSAGES: JSON.stringify(emails),
        RAW_TEAMS_MESSAGES: JSON.stringify(chats),
        USER_CONTEXT: contextText,
      });

      const stage1Started = Date.now();
      let stage1Response = await runStage({
        prompt: stage1Prompt,
        wordLimit: STAGE1_WORD_LIMIT,
        ...stage1Transport,
      });
      let stage1Parsed = extractJsonObject(stage1Response.text);
      if (!stage1Parsed) {
        stage1Response = await runStage({
          prompt: stage1Prompt + JSON_RETRY_REMINDER,
          wordLimit: STAGE1_WORD_LIMIT,
          ...stage1Transport,
        });
        stage1Parsed = extractJsonObject(stage1Response.text);
      }
      const stage1Ms = Date.now() - stage1Started;
      if (!stage1Parsed) {
        throw httpError(
          "Stage 1 (prefilter) returned unparseable JSON twice — briefing aborted.",
          502
        );
      }

      const { prefilter, droppedIds } = validateStage1(stage1Parsed, sourceMap);

      // ── Stage 2: executive briefing from the validated Stage 1 JSON only ──
      const stage2Prompt = renderTemplate(STAGE2_ORGANIZER_TEMPLATE, {
        TODAY_DATE: todayDate,
        USER_TIMEZONE: timezone,
        PREFILTERED_M365_JSON: JSON.stringify(prefilter),
        USER_CONTEXT: contextText,
      });

      const stage2Started = Date.now();
      const stage2Response = await runStage({
        prompt: stage2Prompt,
        wordLimit: STAGE2_WORD_LIMIT,
        ...stage2Transport,
      });
      const stage2Ms = Date.now() - stage2Started;
      const briefingMarkdown = (stage2Response.text || "").trim();
      if (!briefingMarkdown) {
        throw httpError("Stage 2 (organizer) returned an empty briefing.", 502);
      }

      // ── Swap surrogates back to real Graph IDs + webLinks ─────────────────
      restoreGraphIds(prefilter, sourceMap);
      const sources = [...sourceMap.values()].map(({ graphId, ...info }) => ({
        id: graphId,
        ...info,
      }));

      return {
        briefingMarkdown,
        prefilter,
        sources,
        meta: {
          provider,
          models: { stage1: stage1Response.model, stage2: stage2Response.model },
          window: {
            date: todayDate,
            timezone,
            calendarStart: toLocalIso(startOfDay),
            calendarEnd: toLocalIso(endOfDay),
            emailAndChatsSince: sinceIso,
          },
          counts: {
            calendarFetched: events.length,
            emailsFetched: emails.length,
            teamsFetched: chats.length,
            retained: countRetained(prefilter),
            droppedUnknownIds: droppedIds.length,
          },
          sourceFailures,
          timings: { fetchMs, stage1Ms, stage2Ms },
        },
      };
    },
  };
}

// ── Normalizers (compact items sent to Stage 1; webLinks stay server-side) ──

function normalizeEvent(event, surrogateId, sourceMap) {
  const organizer =
    event.organizer?.emailAddress?.name ||
    event.organizer?.emailAddress?.address ||
    "";
  const attendeeNames = (Array.isArray(event.attendees) ? event.attendees : [])
    .map((a) => a?.emailAddress?.name || a?.emailAddress?.address || "")
    .filter(Boolean);
  const attendees =
    attendeeNames.length > 8
      ? [...attendeeNames.slice(0, 8), `+${attendeeNames.length - 8} more`]
      : attendeeNames;

  sourceMap.set(surrogateId, {
    graphId: event.id,
    type: "calendar",
    title: event.subject || "(no subject)",
    time: event.start?.dateTime || "",
    from: organizer,
    webLink: event.webLink || "",
  });

  return {
    source: "calendar",
    id: surrogateId,
    title: event.subject || "(no subject)",
    start_time: event.start?.dateTime || "",
    end_time: event.end?.dateTime || "",
    time_zone: event.start?.timeZone || "",
    is_all_day: Boolean(event.isAllDay),
    organizer,
    attendees,
    location: event.location?.displayName || "",
    importance: event.importance || "",
    body_preview: trimText(event.bodyPreview),
  };
}

function normalizeEmail(message, surrogateId, conversationKeys, sourceMap) {
  const senderAddress = message.from?.emailAddress?.address || "";
  const sender = message.from?.emailAddress?.name || senderAddress;
  const recipients = (Array.isArray(message.toRecipients) ? message.toRecipients : [])
    .map((r) => r?.emailAddress?.name || r?.emailAddress?.address || "")
    .filter(Boolean)
    .slice(0, 5);

  // Conversation IDs are surrogated too (c-1, c-2, …): the model only needs
  // them to group messages from the same thread.
  let conversationKey = "";
  if (message.conversationId) {
    if (!conversationKeys.has(message.conversationId)) {
      conversationKeys.set(message.conversationId, `c-${conversationKeys.size + 1}`);
    }
    conversationKey = conversationKeys.get(message.conversationId);
  }

  sourceMap.set(surrogateId, {
    graphId: message.id,
    type: "email",
    title: message.subject || "(no subject)",
    time: message.receivedDateTime || "",
    from: sender,
    webLink: message.webLink || "",
  });

  return {
    source: "email",
    id: surrogateId,
    conversation_id: conversationKey,
    subject: message.subject || "(no subject)",
    sender,
    // The display name often hides the address ("Gensuite Sender (GE Company)",
    // "GS Exception"), and the prompt's automated-sender guardrail keys on
    // <no-reply-sender@benchmarkdigital.com> — so the address rides along.
    sender_address: senderAddress,
    recipients,
    received_time: message.receivedDateTime || "",
    is_read: Boolean(message.isRead),
    importance: message.importance || "",
    body_preview: trimText(message.bodyPreview),
  };
}

function normalizeChatMessage(message, surrogateId, sourceMap) {
  // Chat message IDs are only unique within a chat, so the stored Graph ID is
  // the chatId::messageId composite — both halves are needed for the deep link.
  const topic = message.topic || "(direct chat)";

  sourceMap.set(surrogateId, {
    graphId: `${message.chatId}::${message.id}`,
    type: "teams",
    title: topic,
    time: message.date || "",
    from: message.from || "",
    webLink: `https://teams.microsoft.com/l/message/${encodeURIComponent(message.chatId)}/${encodeURIComponent(message.id)}`,
  });

  return {
    source: "teams",
    id: surrogateId,
    chat_or_channel: topic,
    sender: message.from || "",
    message_time: message.date || "",
    snippet: trimText(message.snippet),
  };
}

// ── Stage 1 validation: drop IDs the model invented, keep the rest intact ──

function validateStage1(parsed, sourceMap) {
  const droppedIds = [];
  const keepKnown = (ids) => {
    const list = (Array.isArray(ids) ? ids : []).map(String);
    const known = list.filter((id) => sourceMap.has(id));
    droppedIds.push(...list.filter((id) => !sourceMap.has(id)));
    return known;
  };
  const keepItems = (items) =>
    (Array.isArray(items) ? items : []).filter((item) => {
      if (!item || typeof item !== "object" || !item.id) return false;
      if (sourceMap.has(String(item.id))) return true;
      droppedIds.push(String(item.id));
      return false;
    });

  const prefilter = {
    prefilter_summary:
      parsed.prefilter_summary && typeof parsed.prefilter_summary === "object"
        ? parsed.prefilter_summary
        : {},
    retained_calendar_events: keepItems(parsed.retained_calendar_events),
    retained_emails: keepItems(parsed.retained_emails),
    retained_teams_messages: keepItems(parsed.retained_teams_messages),
    possible_duplicates_or_related_threads: (Array.isArray(
      parsed.possible_duplicates_or_related_threads
    )
      ? parsed.possible_duplicates_or_related_threads
      : []
    )
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const relatedIds = keepKnown(entry.related_item_ids);
        if (relatedIds.length === 0) return null;
        const primary = String(entry.recommended_primary_item_id ?? "");
        return {
          ...entry,
          related_item_ids: relatedIds,
          recommended_primary_item_id: sourceMap.has(primary) ? primary : "",
        };
      })
      .filter(Boolean),
    focus_application_highlights: (Array.isArray(parsed.focus_application_highlights)
      ? parsed.focus_application_highlights
      : []
    )
      .map((entry) =>
        entry && typeof entry === "object"
          ? { ...entry, related_item_ids: keepKnown(entry.related_item_ids) }
          : null
      )
      .filter(Boolean),
    candidate_focus_blocks: Array.isArray(parsed.candidate_focus_blocks)
      ? parsed.candidate_focus_blocks.filter((b) => b && typeof b === "object")
      : [],
    assumptions_or_gaps: Array.isArray(parsed.assumptions_or_gaps)
      ? parsed.assumptions_or_gaps.filter((g) => g && typeof g === "object")
      : [],
  };

  return { prefilter, droppedIds };
}

// Replace validated surrogate IDs with the real Graph IDs (and webLinks) so
// the API response preserves genuine Microsoft Graph source IDs end-to-end.
function restoreGraphIds(prefilter, sourceMap) {
  const toGraphId = (value) => {
    const info = sourceMap.get(String(value));
    return info ? info.graphId : String(value);
  };

  for (const list of [
    prefilter.retained_calendar_events,
    prefilter.retained_emails,
    prefilter.retained_teams_messages,
  ]) {
    for (const item of list) {
      const info = sourceMap.get(String(item.id));
      if (info) {
        item.id = info.graphId;
        if (info.webLink) {
          item.web_link = info.webLink;
        }
      }
    }
  }

  for (const entry of prefilter.possible_duplicates_or_related_threads) {
    entry.related_item_ids = entry.related_item_ids.map(toGraphId);
    if (entry.recommended_primary_item_id) {
      entry.recommended_primary_item_id = toGraphId(entry.recommended_primary_item_id);
    }
  }
  for (const entry of prefilter.focus_application_highlights) {
    entry.related_item_ids = entry.related_item_ids.map(toGraphId);
  }
}

function countRetained(prefilter) {
  return (
    prefilter.retained_calendar_events.length +
    prefilter.retained_emails.length +
    prefilter.retained_teams_messages.length
  );
}

// ── Small helpers ───────────────────────────────────────────────────────────

function settledValue(result, source, failures) {
  if (result.status === "fulfilled") {
    return result.value;
  }
  failures.push({
    source,
    error:
      result.reason?.graphMessage ||
      result.reason?.message ||
      "Graph request failed.",
  });
  return null;
}

function trimText(value, max = PREVIEW_CHARS) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatTodayDate(now) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
}

// ISO 8601 with the server's local UTC offset, so the calendarView window is
// unambiguous regardless of the Prefer-timezone header.
function toLocalIso(date) {
  const pad = (n) => String(Math.trunc(Math.abs(n))).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)}`
  );
}

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
