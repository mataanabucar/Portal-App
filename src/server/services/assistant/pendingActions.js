import { randomUUID } from "node:crypto";

// Store interface the controller depends on. The first implementation is
// in-memory with TTL expiry (fine for a single local server instance today);
// swapping to file- or SQL-backed storage later only means writing a new
// implementation of this same interface, not touching controller.js.
//   proposeAction({ service, functionName, args, summary }) -> pendingAction
//   getAction(id) -> pendingAction | null
//   confirmAction(id, executor) -> { ok, result } | { ok:false, error }
//   cancelAction(id) -> pendingAction | null
//   listActions() -> pendingAction[]

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function createInMemoryPendingActionStore({ ttlMs = DEFAULT_TTL_MS } = {}) {
  const actions = new Map();

  function sweepExpired() {
    const now = Date.now();
    for (const [id, action] of actions) {
      if (action.status === "pending" && now - action.createdAtMs > ttlMs) {
        action.status = "expired";
      }
    }
  }

  return {
    proposeAction({ service, functionName, args, summary }) {
      sweepExpired();
      const id = randomUUID();
      const action = {
        id,
        service,
        functionName,
        args,
        summary,
        status: "pending",
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        resolvedAt: null,
      };
      actions.set(id, action);
      return { ...action };
    },

    getAction(id) {
      sweepExpired();
      const action = actions.get(id);
      return action ? { ...action } : null;
    },

    async confirmAction(id, executor) {
      sweepExpired();
      const action = actions.get(id);
      if (!action) return { ok: false, error: "Unknown or expired action." };
      if (action.status !== "pending") {
        return { ok: false, error: `Action is already ${action.status}.` };
      }

      try {
        const result = await executor(action);
        action.status = "confirmed";
        action.resolvedAt = new Date().toISOString();
        return { ok: true, result, action: { ...action } };
      } catch (error) {
        action.status = "failed";
        action.resolvedAt = new Date().toISOString();
        action.error = error?.message || "Action execution failed.";
        return { ok: false, error: action.error, action: { ...action } };
      }
    },

    cancelAction(id) {
      sweepExpired();
      const action = actions.get(id);
      if (!action) return null;
      if (action.status === "pending") {
        action.status = "canceled";
        action.resolvedAt = new Date().toISOString();
      }
      return { ...action };
    },

    listActions() {
      sweepExpired();
      return [...actions.values()].map((action) => ({ ...action }));
    },
  };
}

// Human-readable summaries so the UI never has to render raw JSON for a
// mutation. Keyed by "service.functionName"; falls back to a generic
// label + key/value listing for anything not explicitly templated.
const SUMMARY_TEMPLATES = {
  "mail.sendMail": (args) => summarizeEmail("Send email", args),
  "mail.sendDraftMessage": (args) => summarizeEmail("Send email", args),
  "mail.createDraftMessage": (args) => summarizeEmail("Create email draft", args),
  "mail.replyToMessage": (args) => summarizeEmail("Reply to email", args),
  "mail.moveMessage": (args) => `Move message ${args.messageId || "(unknown id)"} to folder "${args.destinationId || args.folder || "?"}".`,
  "mail.deleteMessage": (args) => `Delete message ${args.messageId || "(unknown id)"} permanently.`,
  "calendar.createEvent": (args) => summarizeCalendarEvent("Create calendar event", args),
  "calendar.updateEvent": (args) => summarizeCalendarEvent("Update calendar event", args),
  "calendar.deleteEvent": (args) => `Delete calendar event "${args.eventId || "(unknown id)"}".`,
  "teamsChat.sendChatMessage": (args) => `Send Teams chat message to chat ${args.chatId || "(unknown chat)"}:\n"${truncate(args.body || args.content || "", 300)}"`,
  "teamsChannel.sendChannelMessage": (args) => `Post to Teams channel ${args.channelId || "(unknown channel)"}:\n"${truncate(args.body || args.content || "", 300)}"`,
  "teamsChannel.sendChannelReply": (args) => `Reply in Teams channel thread:\n"${truncate(args.body || args.content || "", 300)}"`,
  "tasks.createTask": (args) => `Create task "${args.title || "(untitled)"}".`,
  "tasks.completeTask": (args) => `Mark task ${args.taskId || "(unknown id)"} complete.`,
};

export function buildActionSummary(service, functionName, args, label) {
  const key = `${service}.${functionName}`;
  const template = SUMMARY_TEMPLATES[key];
  if (template) {
    try {
      return template(args || {});
    } catch {
      // fall through to generic summary
    }
  }
  return buildGenericSummary(label || key, args);
}

function summarizeEmail(action, args) {
  const to = normalizeAddressList(args.to);
  const cc = normalizeAddressList(args.cc);
  const lines = [
    `${action}${to.length ? ` to ${to.join(", ")}` : ""}.`,
    to.length ? `Recipients: ${to.join(", ")}` : null,
    cc.length ? `CC: ${cc.join(", ")}` : null,
    args.subject ? `Subject: ${args.subject}` : null,
    args.body ? `Body preview: ${truncate(args.body, 300)}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function summarizeCalendarEvent(action, args) {
  const lines = [
    `${action}${args.subject ? `: "${args.subject}"` : ""}.`,
    args.start ? `Start: ${args.start}` : null,
    args.end ? `End: ${args.end}` : null,
    args.attendees ? `Attendees: ${normalizeAddressList(args.attendees).join(", ")}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function buildGenericSummary(label, args) {
  const entries = Object.entries(args || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${truncate(typeof value === "string" ? value : JSON.stringify(value), 200)}`);
  return entries.length
    ? `This will run "${label}" with:\n${entries.join("\n")}`
    : `This will run "${label}".`;
}

function normalizeAddressList(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function truncate(text, max) {
  const str = String(text || "");
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
