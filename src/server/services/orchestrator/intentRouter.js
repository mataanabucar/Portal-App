// Deterministic keyword intent router. Pure functions only — no I/O, no
// service imports — so routing is unit-testable and never depends on a model.
//
// routeIntent({ prompt, history, itemContext }) → {
//   route, matchedKeywords, providedText, residualPrompt, graphIntent?
// }

export const ROUTES = Object.freeze({
  SUMMARY_TEXT: "summary_text",
  ACTION_ITEMS: "action_items",
  SUMMARY_CONVERSATION: "summary_conversation",
  GRAPH: "graph",
  CODE: "code",
  RESEARCH: "research",
  DOCS_KB: "docs_kb"
});

const SUMMARY_VERBS = /\b(summari[sz]e|summary|recap|tl;?dr|condense|key points|key takeaways)\b/i;
const ACTION_ITEM_TERMS =
  /\b(action items?|follow[- ]?ups?|next steps|to-?dos?|extract (?:the )?tasks?|deliverables|owners? and (?:due )?dates?)\b/i;
const CONVERSATION_REFS =
  /\b(this (?:conversation|chat|thread)|our (?:conversation|chat|discussion)|so far|above|what we(?:'ve| have) discussed)\b/i;
const GRAPH_TERMS =
  /\b(e-?mails?|inbox|outlook|mailbox|unread|calendar|meetings?|appointments?|invites?|teams (?:chat|message)s?|chat messages?|my (?:mail|schedule|agenda)|who am i|my profile|my account)\b/i;
const CODE_TERMS =
  /\b(code(?:base)?|repo(?:sitor(?:y|ies))?|source (?:code|files?)|where is .{0,60}(?:implemented|defined|handled)|functions?|endpoints?|stack traces?|sourcebot|\.cf[mc]\b|implementation|debug (?:the )?code)\b/i;
const RESEARCH_TERMS =
  /\b(research|investigate|deep dive|root cause|latest on|current status|what'?s new with)\b/i;
const DOCS_TERMS =
  /\b(docs?|documentation|knowledge base|kb\b|polic(?:y|ies)|procedures?|guides?|architecture|aris|how (?:do|does|to) .{0,60}(?:work|use|configure|set ?up)|org charts?|rosters?|who is in|members? of|reports? to|super groups?|group lead|team lead|flow ?charts?|workflows?|diagrams?)\b/i;

const PROVIDED_TEXT_VERBS =
  /\b(summari[sz]e|recap|condense|extract|parse|list|pull out|identify)\b/i;
const MUTATION_VERBS =
  /\b(send|reply|forward|delete|move|create|schedule|cancel|post|update|set up|add|remove|archive)\b/i;

export function detectProvidedText(prompt) {
  const text = typeof prompt === "string" ? prompt : "";
  const fenceIndex = text.indexOf("```");
  if (fenceIndex !== -1) {
    return {
      instruction: text.slice(0, fenceIndex).trim(),
      body: text.slice(fenceIndex).replace(/```/g, "").trim()
    };
  }
  const head = text.slice(0, 120);
  if (PROVIDED_TEXT_VERBS.test(head)) {
    const markerMatch = text.match(/(?::|---|\bbelow\b|\bfollowing\b)/i);
    if (markerMatch && text.length - markerMatch.index > 200) {
      const splitAt = markerMatch.index + markerMatch[0].length;
      return {
        instruction: text.slice(0, splitAt).trim(),
        body: text.slice(splitAt).trim()
      };
    }
    if (text.length > 600) {
      return { instruction: head.trim(), body: text.trim() };
    }
  }
  return null;
}

export function routeIntent({ prompt, history = [], itemContext = "" } = {}) {
  const text = typeof prompt === "string" ? prompt.trim() : "";
  const hasHistory = Array.isArray(history) && history.length > 0;
  const providedText = detectProvidedText(text);

  // R1: summarize pasted/provided text
  if (SUMMARY_VERBS.test(text) && providedText) {
    return result(ROUTES.SUMMARY_TEXT, matched(text, SUMMARY_VERBS), providedText, text);
  }

  // R2: action items / follow-ups from provided text
  if (ACTION_ITEM_TERMS.test(text) && providedText) {
    return result(ROUTES.ACTION_ITEMS, matched(text, ACTION_ITEM_TERMS), providedText, text);
  }

  // R3: summarize this conversation
  if (SUMMARY_VERBS.test(text) && CONVERSATION_REFS.test(text) && hasHistory) {
    return result(
      ROUTES.SUMMARY_CONVERSATION,
      [...matched(text, SUMMARY_VERBS), ...matched(text, CONVERSATION_REFS)],
      null,
      text
    );
  }

  // R4: Microsoft 365 / Graph
  if (GRAPH_TERMS.test(text)) {
    const routed = result(ROUTES.GRAPH, matched(text, GRAPH_TERMS), null, text);
    routed.graphIntent = classifyGraphIntent(text);
    return routed;
  }

  // R5: code / repo / source
  if (CODE_TERMS.test(text)) {
    return result(ROUTES.CODE, matched(text, CODE_TERMS), null, text);
  }

  // R6: research-style investigation (or an item context is attached)
  if (RESEARCH_TERMS.test(text) || (typeof itemContext === "string" && itemContext.trim())) {
    return result(ROUTES.RESEARCH, matched(text, RESEARCH_TERMS), null, text);
  }

  // R7: docs / KB keywords
  if (DOCS_TERMS.test(text)) {
    return result(ROUTES.DOCS_KB, matched(text, DOCS_TERMS), null, text);
  }

  // R8: fallback — GennyStudio/KB first, never TeamGPT for general questions
  return result(ROUTES.DOCS_KB, [], null, text);
}

const MAIL_WORDS = /\b(e-?mails?|inbox|mailbox|outlook|messages?|mail)\b/i;
const CALENDAR_WORDS = /\b(calendar|meetings?|appointments?|invites?|schedule|agenda)\b/i;
const TEAMS_WORDS = /\b(teams (?:chat|message)s?|chat messages?|teams)\b/i;
const PROFILE_WORDS = /\b(who am i|my profile|my account)\b/i;

export function classifyGraphIntent(prompt) {
  const text = typeof prompt === "string" ? prompt : "";

  if (MUTATION_VERBS.test(text)) {
    return { kind: "mutation_guidance" };
  }
  if (PROFILE_WORDS.test(text)) {
    return { kind: "profile" };
  }
  if (/\bunread\b/i.test(text)) {
    return { kind: "unread_emails", limit: extractLimit(text, 10) };
  }
  if (MAIL_WORDS.test(text)) {
    if (/\b(latest|recent|new(?:est)?|last)\b/i.test(text)) {
      const isSingle = /\blast\b/i.test(text) && !/\blast (?:few|\d)/i.test(text);
      return { kind: "recent_emails", limit: isSingle ? 1 : extractLimit(text, 10) };
    }
    if (/\b(search|find|from|about|regarding|mentioning)\b/i.test(text)) {
      return { kind: "search_emails", query: buildResidualQuery(text), limit: extractLimit(text, 10) };
    }
    return { kind: "recent_emails", limit: extractLimit(text, 10) };
  }
  if (CALENDAR_WORDS.test(text)) {
    return { kind: "calendar_view", window: extractCalendarWindow(text) };
  }
  if (TEAMS_WORDS.test(text)) {
    return { kind: "search_chats", query: buildResidualQuery(text) };
  }
  return { kind: "capabilities_help" };
}

function extractCalendarWindow(text) {
  if (/\btomorrow\b/i.test(text)) return "tomorrow";
  if (/\b(this |next )?week\b/i.test(text)) return "week";
  if (/\btoday\b/i.test(text)) return "today";
  return "upcoming";
}

function extractLimit(text, fallback) {
  const match = text.match(/\b(?:top|last|latest|first)\s+(\d{1,2})\b/i);
  if (match) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && value > 0) {
      return Math.min(value, 25);
    }
  }
  return fallback;
}

// Strip common instruction scaffolding so search-style intents get a cleaner
// query ("find the email from Priya about invoices" → "Priya about invoices").
function buildResidualQuery(text) {
  return text
    .replace(/\b(search|find|look for|show me|get|list|any|the|my|please)\b/gi, " ")
    .replace(/\b(e-?mails?|inbox|mailbox|outlook|messages?|mail|teams|chats?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function matched(text, pattern) {
  const match = text.match(pattern);
  return match ? [match[0].toLowerCase()] : [];
}

function result(route, matchedKeywords, providedText, prompt) {
  return {
    route,
    matchedKeywords,
    providedText,
    residualPrompt: providedText ? providedText.instruction : prompt
  };
}
