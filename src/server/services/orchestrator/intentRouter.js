// Deterministic intent router. It identifies the primary information source,
// explicit post-processing, and context-dependent transformation requests.
// Pure functions only — no service imports or I/O.

export const ROUTES = Object.freeze({
  SUMMARY_TEXT: "summary_text",
  ACTION_ITEMS: "action_items",
  SUMMARY_CONVERSATION: "summary_conversation",
  CONTEXT_TRANSFORM: "context_transform",
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
const HISTORY_REFS =
  /\b(this|that|it|the last (?:answer|response|result)|the previous (?:answer|response|result)|above|what you (?:just )?(?:said|found|returned)|those findings|these findings|the KB (?:answer|response|result))\b/i;
const GRAPH_TERMS =
  /\b(e-?mails?|inbox|outlook|mailbox|unread|calendar|meetings?|appointments?|invites?|teams (?:chat|message)s?|chat messages?|my (?:mail|schedule|agenda)|who am i|my profile|my account|microsoft graph|graph search)\b/i;
const CODE_TERMS =
  /\b(code(?:base)?|repo(?:sitor(?:y|ies))?|source (?:code|files?)|where is .{0,60}(?:implemented|defined|handled)|functions?|endpoints?|stack traces?|sourcebot|\.cf[mc]\b|implementation|debug (?:the )?code)\b/i;
const RESEARCH_TERMS =
  /\b(research|investigate|deep dive|root cause|latest on|current status|what'?s new with|cross[- ]?reference|correlate|compare (?:the )?(?:code|implementation).{0,30}(?:docs?|kb|policy))\b/i;
const DOCS_TERMS =
  /\b(docs?|documentation|knowledge base|kb\b|polic(?:y|ies)|procedures?|guides?|architecture|aris|genny ?studio|how (?:do|does|to) .{0,60}(?:work|use|configure|set ?up)|org charts?|rosters?|who is in|members? of|reports? to|super groups?|group lead|team lead|flow ?charts?|workflows?|diagrams?)\b/i;
const TEAMGPT_TERMS = /\b(team\s*gpt|run .{0,40} through team\s*gpt|use team\s*gpt)\b/i;
const TRANSFORM_VERBS =
  /\b(turn|convert|rewrite|rework|transform|draft|create|write|generate|provide|give me|build|format|polish|adapt)\b/i;
const TOOL_PROMPT_TERMS =
  /\b(?:sourcebot|genny ?studio|knowledge base|kb|team\s*gpt|microsoft graph|graph)\s+(?:search\s+)?prompt\b|\bprompt\s+(?:for|to use (?:with|in)|that (?:i|we) can use (?:with|in))\s+(?:sourcebot|genny ?studio|the knowledge base|kb|team\s*gpt|microsoft graph|graph)\b/i;
const CONTEXT_SEARCH_VERBS =
  /\b(search|find|look up|look for|query|investigate|check|run|use)\b/i;
const CONTEXT_SEARCH_REFS =
  /\b(?:use|using|based on|from|related to|about|regarding|with)\s+(?:this|that|it|the last (?:answer|response|result)|the previous (?:answer|response|result)|the answer above|the response above|what you (?:just )?(?:said|found|returned)|those findings|these findings|those results|these results|that answer|that response|that result)\b|\b(?:the last (?:answer|response|result)|the previous (?:answer|response|result)|what you (?:just )?(?:said|found|returned)|those findings|these findings|those results|these results)\b/i;
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
  const hasAssistantHistory = hasUsableAssistantHistory(history);
  const providedText = detectProvidedText(text);

  // R1: summarize pasted/provided text.
  if (SUMMARY_VERBS.test(text) && providedText) {
    return result(ROUTES.SUMMARY_TEXT, matched(text, SUMMARY_VERBS), providedText, text);
  }

  // R2: action items / follow-ups from pasted text.
  if (ACTION_ITEM_TERMS.test(text) && providedText) {
    return result(ROUTES.ACTION_ITEMS, matched(text, ACTION_ITEM_TERMS), providedText, text);
  }

  // R3: summarize this conversation.
  if (SUMMARY_VERBS.test(text) && CONVERSATION_REFS.test(text) && hasHistory) {
    return result(
      ROUTES.SUMMARY_CONVERSATION,
      [...matched(text, SUMMARY_VERBS), ...matched(text, CONVERSATION_REFS)],
      null,
      text
    );
  }

  // R4: create a prompt for another tool or transform the prior answer. This
  // must run before CODE because "Sourcebot prompt" names the output target;
  // it is not itself a literal Sourcebot search request.
  const transformIntent = classifyContextTransform(text, hasAssistantHistory);
  if (transformIntent) {
    const routed = result(
      ROUTES.CONTEXT_TRANSFORM,
      transformIntent.matchedKeywords,
      null,
      text
    );
    routed.transformIntent = transformIntent;
    return routed;
  }

  // R5: explicit multi-source code + KB investigation.
  if (
    (RESEARCH_TERMS.test(text) || /\b(compare|cross[- ]?reference|correlate)\b/i.test(text)) &&
    CODE_TERMS.test(text) &&
    DOCS_TERMS.test(text)
  ) {
    const routed = result(ROUTES.RESEARCH, matched(text, RESEARCH_TERMS), null, text);
    routed.postProcess = detectPostProcess(text);
    return routed;
  }

  // R6: Microsoft 365 / Graph.
  if (GRAPH_TERMS.test(text)) {
    const routed = result(ROUTES.GRAPH, matched(text, GRAPH_TERMS), null, text);
    routed.graphIntent = classifyGraphIntent(text);
    routed.postProcess = detectPostProcess(text);
    if (shouldDeriveContextQuery(text, hasAssistantHistory)) {
      routed.contextQuery = { target: "microsoft_graph" };
    }
    return routed;
  }

  // R7: code / repo / Sourcebot.
  if (CODE_TERMS.test(text)) {
    const routed = result(ROUTES.CODE, matched(text, CODE_TERMS), null, text);
    routed.postProcess = detectPostProcess(text);
    if (shouldDeriveContextQuery(text, hasAssistantHistory)) {
      routed.contextQuery = { target: "sourcebot" };
    }
    return routed;
  }

  // R8: research-style investigation or attached item context.
  if (RESEARCH_TERMS.test(text) || (typeof itemContext === "string" && itemContext.trim())) {
    const routed = result(ROUTES.RESEARCH, matched(text, RESEARCH_TERMS), null, text);
    routed.postProcess = detectPostProcess(text);
    return routed;
  }

  // R9: docs / GennyStudio / KB.
  if (DOCS_TERMS.test(text)) {
    const routed = result(ROUTES.DOCS_KB, matched(text, DOCS_TERMS), null, text);
    routed.postProcess = detectPostProcess(text);
    if (shouldDeriveContextQuery(text, hasAssistantHistory)) {
      routed.contextQuery = { target: "gennystudio" };
    }
    return routed;
  }

  // R10: a follow-up transformation that did not explicitly name a tool.
  if (hasAssistantHistory && HISTORY_REFS.test(text) && TRANSFORM_VERBS.test(text)) {
    const routed = result(
      ROUTES.CONTEXT_TRANSFORM,
      [...matched(text, HISTORY_REFS), ...matched(text, TRANSFORM_VERBS)],
      null,
      text
    );
    routed.transformIntent = {
      kind: "transform_context",
      target: "text",
      useHistory: true,
      matchedKeywords: routed.matchedKeywords
    };
    return routed;
  }

  // R11: fallback — GennyStudio/KB first.
  return result(ROUTES.DOCS_KB, [], null, text);
}

function classifyContextTransform(text, hasAssistantHistory) {
  const toolPrompt = TOOL_PROMPT_TERMS.test(text);
  if (toolPrompt) {
    const target = detectToolTarget(text);
    return {
      kind: "tool_prompt",
      target,
      useHistory: hasAssistantHistory,
      matchedKeywords: [
        ...matched(text, TOOL_PROMPT_TERMS),
        ...matched(text, HISTORY_REFS),
        ...matched(text, TRANSFORM_VERBS)
      ]
    };
  }

  if (
    hasAssistantHistory &&
    TEAMGPT_TERMS.test(text) &&
    (HISTORY_REFS.test(text) || TRANSFORM_VERBS.test(text) || SUMMARY_VERBS.test(text))
  ) {
    return {
      kind: SUMMARY_VERBS.test(text) ? "summarize_context" : "transform_context",
      target: "text",
      useHistory: true,
      matchedKeywords: [
        ...matched(text, TEAMGPT_TERMS),
        ...matched(text, HISTORY_REFS),
        ...matched(text, TRANSFORM_VERBS)
      ]
    };
  }

  return null;
}

function detectToolTarget(text) {
  if (/\bsourcebot\b/i.test(text)) return "sourcebot";
  if (/\bgenny ?studio\b/i.test(text)) return "gennystudio";
  if (/\bknowledge base\b|\bkb\b/i.test(text)) return "knowledge_base";
  if (/\bteam\s*gpt\b/i.test(text)) return "teamgpt";
  if (/\bmicrosoft graph\b|\bgraph\b/i.test(text)) return "microsoft_graph";
  return "tool";
}

function detectPostProcess(text) {
  if (ACTION_ITEM_TERMS.test(text)) {
    return { kind: "action_items" };
  }
  if (SUMMARY_VERBS.test(text)) {
    return { kind: "summary" };
  }
  if (TEAMGPT_TERMS.test(text)) {
    return { kind: "synthesize" };
  }
  return null;
}

function shouldDeriveContextQuery(text, hasAssistantHistory) {
  return (
    hasAssistantHistory &&
    CONTEXT_SEARCH_VERBS.test(text) &&
    CONTEXT_SEARCH_REFS.test(text)
  );
}

function hasUsableAssistantHistory(history) {
  return (Array.isArray(history) ? history : []).some(
    (message) =>
      message?.role === "assistant" &&
      typeof message.content === "string" &&
      message.content.trim()
  );
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

function buildResidualQuery(text) {
  return text
    .replace(/\b(search|find|look for|show me|get|list|any|the|my|please|summari[sz]e|summary|recap)\b/gi, " ")
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
    matchedKeywords: [...new Set((matchedKeywords || []).filter(Boolean))],
    providedText,
    residualPrompt: providedText ? providedText.instruction : prompt
  };
}
