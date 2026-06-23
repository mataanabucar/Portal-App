const SHARED_REPO_BASELINE = Object.freeze([
  "code.gensuite.com/pm/library/cfc",
  "code.gensuite.com/pm/library/customtags",
  "code.gensuite.com/pm/extensions",
]);

export const RESEARCH_REPO_PREFIXES = Object.freeze([
  "code.gensuite.com/pm/",
  "code.benchmarkddev.com/bmd/",
]);

export const APPLICATION_CATALOG = Object.freeze([
  {
    id: "ats",
    canonicalName: "Action Tracking System",
    repoHint: "audit",
    primaryRepo: "code.gensuite.com/pm/audit",
    repoSearchOrder: [
      "code.gensuite.com/pm/audit",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "apps/ats/",
      "atsintegration/",
    ],
    strongAliases: [
      "action tracking system",
      "action tracking",
      "action tracker",
      "corrective action system",
      "corrective action tracker",
    ],
    weakAliases: [
      "ats",
      "closure verification",
      "open actions",
      "open findings",
    ],
    starterTerms: [
      "audfinding",
      "audaction",
      "audit.cfm",
      "Action Tracking System",
      "closure verification",
      "finding",
    ],
  },
  {
    id: "calendar",
    canonicalName: "Compliance Calendar",
    repoHint: "calendar",
    primaryRepo: "code.gensuite.com/pm/calendar",
    repoSearchOrder: [
      "code.gensuite.com/pm/calendar",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "apps/calendar/",
    ],
    strongAliases: [
      "compliance calendar",
      "calendar task",
      "compliance task",
      "task reminder",
    ],
    weakAliases: [
      "calendar",
      "past due notice",
      "auto close out",
      "auto close-out",
    ],
    starterTerms: [
      "calendar.cfm",
      "task.cfm",
      "updatecalrem",
      "Compliance Calendar",
      "task reminder",
      "past due notice",
    ],
  },
  {
    id: "audit-assistant",
    canonicalName: "Audit Assistant",
    repoHint: "auditassistant",
    primaryRepo: "code.gensuite.com/pm/auditassistant",
    repoSearchOrder: [
      "code.gensuite.com/pm/auditassistant",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "apps/auditAssistant/",
    ],
    strongAliases: [
      "audit assistant",
      "audit room",
      "audit observations",
      "audit observation",
    ],
    weakAliases: [
      "aa",
      "observation",
      "observations",
    ],
    starterTerms: [
      "aa.cfm",
      "view_audit_room",
      "view_observations",
      "Audit Assistant",
      "Audit Room",
      "Observation",
    ],
  },
]);

export function resolveApplicationContext({
  itemContext = "",
  userQuery = "",
  messages = [],
} = {}) {
  const applicationText = extractContextLine(itemContext, "Application");
  const titleText = extractContextLine(itemContext, "Title");
  const summaryText = extractContextLine(itemContext, "Summary");
  const nextActionText = extractContextLine(itemContext, "Next Action");
  const combinedText = [
    titleText,
    summaryText,
    nextActionText,
    userQuery,
    ...messages.map((message) => message?.content ?? ""),
  ].join("\n");

  let bestMatch = null;

  for (const app of APPLICATION_CATALOG) {
    const matchedAliases = new Set();
    let score = 0;

    score += scoreAliases(applicationText, app.strongAliases, 8, matchedAliases);
    score += scoreAliases(applicationText, app.weakAliases, 5, matchedAliases);
    score += scoreAliases(combinedText, app.strongAliases, 3, matchedAliases);
    score += scoreAliases(combinedText, app.weakAliases, 1, matchedAliases);

    if (score === 0) continue;

    const candidate = {
      ...app,
      score,
      matchedAliases: [...matchedAliases],
    };

    if (!bestMatch || candidate.score > bestMatch.score) {
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

function extractContextLine(itemContext, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = itemContext.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
}

function scoreAliases(text, aliases, weight, matchedAliases) {
  if (!text) return 0;

  let score = 0;
  for (const alias of aliases) {
    if (hasPhrase(text, alias)) {
      matchedAliases.add(alias);
      score += weight;
    }
  }
  return score;
}

function hasPhrase(text, phrase) {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  return normalizedText.includes(` ${normalizedPhrase} `);
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
