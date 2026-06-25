const SHARED_REPO_BASELINE = Object.freeze([
  "code.gensuite.com/pm/library/cfc",
  "code.gensuite.com/pm/library/customtags",
  "code.gensuite.com/pm/extensions",
]);

export const RESEARCH_REPO_PREFIXES = Object.freeze([
  "code.gensuite.com/pm/",
  "code.benchmarkddev.com/bmd/",
]);

export const APPLICATION_ROUTING_INSTRUCTION =
  "Use app identity profiles to resolve shorthand and route repo/code searches.";

export const APPLICATION_DISAMBIGUATION_RULES = Object.freeze([
  "Audit Assistant != ATS",
  "SAFER != ATS",
  "Project Calendar != Compliance Calendar",
  "Applicant Tracking System != Action Tracking System",
  "Risk Manager maps to SAFER when China, WH Chem, WHC, risk record, risk assessment, SAFER, or exported-action context is present",
]);

export const APPLICATION_CATALOG = Object.freeze([
  {
    id: "ats",
    appid: 3,
    application: "Action Tracking System",
    canonicalName: "Action Tracking System",
    repo: "audit",
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
    aliases: [
      "Action Tracking System",
      "Audit Tracking System",
      "ATS",
      "ats",
      "audit",
      "action tracking",
      "actiontracking system",
      "action tracker",
      "ats application",
      "ats module",
      "ats action",
      "open an ats action",
      "actions in ats",
      "findings in ats",
      "export to ats",
      "integration with action tracking system",
      "ats pdf export",
      "ats reports",
      "ats metrics report",
      "action tracking system genboard",
      "@PXO Action Tracking System Ops",
      "pxo action tracking system ops",
      "actiontrackingsystem.services",
      "actiontrackingsystem services",
      "corrective action system",
      "corrective action tracker",
    ],
    shortname: "ATS",
    AppAbr: "ats",
    intentTerms: [
      "action",
      "action item",
      "assigned action",
      "finding",
      "follow-up",
      "closure",
      "closure due date",
      "closed past due",
      "open actions",
      "open findings",
      "actions taken to-date",
      "audfinding",
      "audaction",
      "audit.cfm",
      "corrective action",
      "export",
      "pdf export",
      "reports",
      "metrics report",
      "genboard",
    ],
    exclusionTerms: [
      "Audit Assistant",
      "AA",
      "auditAssistant",
      "Audit Planner",
      "SAFER",
      "risk manager",
      "Applicant Tracking System",
      "applicant",
      "candidate",
      "resume",
      "hiring",
      "recruiter",
    ],
    strongAliases: [
      "action tracking system",
      "audit tracking system",
      "action tracking",
      "action tracker",
      "corrective action system",
      "corrective action tracker",
    ],
    weakAliases: [
      "ats",
      "audit",
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
    appid: 4,
    application: "Compliance Calendar",
    canonicalName: "Compliance Calendar",
    repo: "calendar",
    repoHint: "calendar",
    primaryRepo: "code.gensuite.com/pm/calendar",
    repoSearchOrder: [
      "code.gensuite.com/pm/calendar",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "apps/calendar/",
    ],
    aliases: [
      "Compliance Calendar",
      "CC",
      "cc",
      "calendar",
      "Calndr",
      "calendar task",
      "compliance task",
      "task reminder",
      "cc task",
      "restoring cc task",
      "CC_DELTA",
      "cc delta",
      "CC_WaterTech",
      "cc watertech",
      "CC_<env>.dbo.task",
      "cc env dbo task",
      "/ehs/calendar/",
      "ehs calendar",
      "calendar/action_batchUpload",
      "calendar action batchupload",
      "@PXO Compliance Calendar Ops",
      "pxo compliance calendar ops",
      "@Product Compliance Calendar Experts",
      "product compliance calendar experts",
      "compliance calendar data mining",
      "application error compliance calendar",
      "timeout compliance calendar",
    ],
    shortname: "Calndr",
    AppAbr: "cc",
    intentTerms: [
      "task",
      "task reminder",
      "subtask reminder",
      "task notification",
      "pending closure verification",
      "upcoming and past due tasks",
      "past due",
      "due date",
      "recurring",
      "reminder",
      "calendar.cfm",
      "task.cfm",
      "updatecalrem",
      "ExternalCalendar",
      "Outlook",
      "compliance obligation",
      "restore task",
      "data mining",
      "system alert",
      "application error",
      "timeout",
    ],
    exclusionTerms: [
      "Project Calendar",
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
    appid: 177,
    application: "Audit Assistant",
    canonicalName: "Audit Assistant",
    repo: "auditAssistant",
    repoHint: "auditassistant",
    primaryRepo: "code.gensuite.com/pm/auditassistant",
    repoSearchOrder: [
      "code.gensuite.com/pm/auditassistant",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "apps/auditAssistant/",
    ],
    aliases: [
      "Audit Assistant",
      "AA",
      "auditAssistant",
      "audit room",
      "audit observations",
      "audit observation",
      "add audit room",
      "create audit room",
      "AA_ltbAuditType",
      "aa_ltbaudittype",
      "aa ltbaudittype",
      "Audit Planner-to-Audit Assistant flow",
      "audit planner to audit assistant flow",
      "Reg Assistant AI",
      "reg assistant ai",
    ],
    shortname: "AA",
    AppAbr: "AA",
    intentTerms: [
      "assistant",
      "audit room",
      "observation",
      "observations",
      "view_audit_room",
      "view_observations",
      "aa.cfm",
      "export",
      "playbook",
      "audit type values",
      "audit execution",
      "perform audit",
      "conduct audit",
      "capture findings",
    ],
    exclusionTerms: [
      "Action Tracking System",
      "Audit Tracking System",
      "ATS",
      "SAFER",
      "Audit Planner",
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
  {
    id: "audit-planner",
    appid: 153,
    application: "Audit Planner",
    canonicalName: "Audit Planner",
    repo: "bla",
    repoHint: "bla",
    primaryRepo: "code.gensuite.com/pm/bla",
    repoSearchOrder: [
      "code.gensuite.com/pm/bla",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "apps/bla/",
    ],
    aliases: [
      "Audit Planner",
      "AP",
      "ap",
      "bla",
      "BLA",
      "Audit Panner",
      "bla/planview.cfm",
      "BLA_Planner",
      "BLA_ltbAuditType",
      "BLA_ltbArea",
      "BLA_ltbCertifications",
      "BLA_Tools",
      "Auditor Pro",
      "Audit Type",
    ],
    shortname: "Audit Planner",
    AppAbr: "ap",
    intentTerms: [
      "audit planning",
      "audit planner",
      "planning",
      "audit schedule",
      "audit program",
      "audit lead",
      "plan view",
      "planview.cfm",
      "audit type setup",
      "auditor",
    ],
    exclusionTerms: [
      "Action Tracking System",
      "Audit Tracking System",
      "ATS",
      "Audit Assistant",
      "SAFER",
    ],
    strongAliases: [
      "audit planner",
      "audit planning",
    ],
    weakAliases: [
      "ap",
      "bla",
      "planning",
    ],
    starterTerms: [
      "Audit Planner",
      "audit planning",
      "schedule",
    ],
  },
  {
    id: "safer",
    appid: 301,
    application: "SAFER",
    canonicalName: "SAFER",
    repo: "audit/extensions/safer",
    repoHint: "safer",
    primaryRepo: "code.gensuite.com/pm/audit",
    repoSearchOrder: [
      "code.gensuite.com/pm/audit",
      ...SHARED_REPO_BASELINE,
    ],
    pathPrefixes: [
      "extensions/safer/",
      "audit/extensions/safer/",
      "apps/safer/",
    ],
    aliases: [
      "SAFER",
      "safer",
      "risk manager",
      "risk manager homepage",
      "actions exported from risk manager",
      "WHC SAFER",
      "WH Chem SAFER",
      "safer.cfc",
      "riskassessmentView.cfm",
      "risk assessment",
      "risk record",
    ],
    shortname: "SAFER",
    AppAbr: "safer",
    intentTerms: [
      "risk manager",
      "risk",
      "safer",
      "audit/extensions/safer",
      "extensions/safer",
      "china",
      "wh chem",
      "whc",
      "hazard",
      "riskassessmentview",
      "exported actions",
    ],
    exclusionTerms: [
      "Action Tracking System",
      "Audit Tracking System",
      "ATS",
      "Audit Assistant",
      "Audit Planner",
    ],
    strongAliases: [
      "safer",
      "risk manager",
    ],
    weakAliases: [
      "risk",
    ],
    starterTerms: [
      "SAFER",
      "risk manager",
      "extensions/safer",
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
  const allText = [applicationText, combinedText].join("\n");

  for (const app of APPLICATION_CATALOG) {
    if (isBlockedByApplicantTrackingContext(app, allText)) {
      continue;
    }

    const hasApplicationLineExclusion = matchesAny(applicationText, app.exclusionTerms);
    const hasSpecificApplicationIdentity = matchesAny(applicationText, [
      app.application,
      app.canonicalName,
      app.shortname,
      app.AppAbr,
    ]);

    if (hasApplicationLineExclusion && !hasSpecificApplicationIdentity) {
      continue;
    }

    const matchedAliases = new Set();
    const matchedExclusions = new Set();
    let score = 0;

    score += scoreAliases(applicationText, app.aliases, 8, matchedAliases);
    score += scoreAliases(applicationText, [app.shortname, app.AppAbr], 6, matchedAliases);
    score += scoreAliases(applicationText, app.strongAliases, 8, matchedAliases);
    score += scoreAliases(applicationText, app.weakAliases, 5, matchedAliases);
    score += scoreAliases(applicationText, app.intentTerms, 4, matchedAliases);
    score += scoreAliases(combinedText, app.aliases, 3, matchedAliases);
    score += scoreAliases(combinedText, [app.shortname, app.AppAbr], 3, matchedAliases);
    score += scoreAliases(combinedText, app.strongAliases, 3, matchedAliases);
    score += scoreAliases(combinedText, app.weakAliases, 1, matchedAliases);
    score += scoreAliases(combinedText, app.intentTerms, 1, matchedAliases);
    score -= scoreAliases(applicationText, app.exclusionTerms, 10, matchedExclusions);
    score -= scoreAliases(combinedText, app.exclusionTerms, 4, matchedExclusions);

    if (score <= 0) continue;

    const candidate = {
      ...app,
      score,
      matchedAliases: [...matchedAliases],
      matchedExclusions: [...matchedExclusions],
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

function matchesAny(text, phrases = []) {
  if (!text) return false;
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

function isBlockedByApplicantTrackingContext(app, text) {
  if (app.id !== "ats") return false;

  const hasApplicantTrackingSignal = matchesAny(text, [
    "Applicant Tracking System",
    "applicant",
    "candidate",
    "resume",
    "hiring",
    "recruiter",
  ]);

  if (!hasApplicantTrackingSignal) return false;

  return !matchesAny(text, [
    "Action Tracking System",
    "Audit Tracking System",
    "action item",
    "actions in ats",
    "finding",
    "findings in ats",
    "corrective action",
    "export to ats",
    "audfinding",
    "audaction",
    "audit.cfm",
  ]);
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
