import OpenAI from "openai";
import { collectKbResearch } from "../kb/research.js";
import { createTeamGptClient } from "../teamgpt/client.js";
import {
  APPLICATION_DISAMBIGUATION_RULES,
  APPLICATION_ROUTING_INSTRUCTION,
  RESEARCH_REPO_PREFIXES,
  resolveApplicationContext,
} from "./applicationCatalog.js";

const MAX_EVIDENCE_BLOCKS = 4;
const MAX_CANDIDATES = 3;

export async function runResearchPipeline({
  sourcebotService,
  kbService,
  docsKbService,
  config,
  itemContext,
  userQuery,
  messages = [],
  teamGptAuthService,
  kbAuthToken = "",
}) {
  const trail = [];
  const applicationMatch = resolveApplicationContext({
    itemContext,
    userQuery,
    messages,
  });

  const openai = createOpenAiClient(config);
  const teamGptClient = createTeamGptClient(config, teamGptAuthService);
  const model = config.openAiModel || "gpt-4o-mini";

  const intent = openai
    ? await extractIntent(openai, model, itemContext, userQuery)
    : extractIntentSimple(itemContext, userQuery);
  const normalizedIntent = normalizeIntent(intent, {
    itemContext,
    userQuery,
    applicationMatch,
  });

  trail.push({
    tool: "intent",
    summary:
      `Primary search: "${normalizedIntent.primarySearchTerm}" | Repo hint: "${normalizedIntent.repoHint}"` +
      (applicationMatch
        ? ` | App: ${applicationMatch.appid} ${applicationMatch.canonicalName} -> ${applicationMatch.repoSearchOrder.join(", ")}`
        : ""),
  });

  const [sourcebotResearch, kbResearch, docsChunks] = await Promise.all([
    collectSourcebotResearch({
      sourcebotService,
      intent: normalizedIntent,
      applicationMatch,
    }),
    collectKbResearch({
      kbService,
      itemContext,
      primarySearchTerm: normalizedIntent.primarySearchTerm,
      fallbackTerms: normalizedIntent.fallbackTerms,
      kbAuthToken,
    }),
    collectDocsResearch(normalizedIntent.primarySearchTerm, docsKbService),
  ]);

  trail.push(...sourcebotResearch.trail, ...kbResearch.trail);

  const evidenceBlocks = [
    ...sourcebotResearch.evidenceBlocks,
    ...kbResearch.evidenceBlocks,
  ];

  // Surface the evidence directly so the UI can render distinct tabs.
  const codeFindings = sourcebotResearch.evidenceBlocks.map(toFinding);
  const kbFindings = kbResearch.evidenceBlocks.map(toFinding);
  const docsFindings = docsChunks.map(toFinding);
  const recommendedSearches = mergeTerms(
    [normalizedIntent.primarySearchTerm],
    normalizedIntent.fallbackTerms
  );

  if (docsChunks.length > 0) {
    trail.push({ tool: "docs", summary: `Docs search: ${docsChunks.length} relevant chunk(s) from internal documentation.` });
  }

  let report;
  if (evidenceBlocks.length === 0 && docsFindings.length === 0) {
    report = buildNoEvidenceReport(normalizedIntent, recommendedSearches);
  } else if (teamGptClient) {
    const totalBlocks = evidenceBlocks.length + docsFindings.length;
    try {
      report = await synthesizeReportWithTeamGpt(teamGptClient, config, {
        itemContext,
        userQuery,
        messages,
        evidenceBlocks,
        docsFindings,
        applicationMatch,
      });
      trail.push({
        tool: "synthesize",
        summary: `Synthesized ${totalBlocks} evidence block(s) into a structured report with TeamGPT.`,
      });
    } catch (error) {
      console.error("[research-pipeline] TeamGPT synthesis failed:", error.message);
      report = openai
        ? await synthesizeReportWithOpenAi(openai, model, {
            itemContext,
            userQuery,
            messages,
            evidenceBlocks,
            docsFindings,
            applicationMatch,
          }).catch(() => buildFallbackReport(evidenceBlocks, normalizedIntent))
        : buildFallbackReport(evidenceBlocks, normalizedIntent);
    }
  } else if (openai) {
    const totalBlocks = evidenceBlocks.length + docsFindings.length;
    try {
      report = await synthesizeReportWithOpenAi(openai, model, {
        itemContext,
        userQuery,
        messages,
        evidenceBlocks,
        docsFindings,
        applicationMatch,
      });
      trail.push({
        tool: "synthesize",
        summary: `Synthesized ${totalBlocks} evidence block(s) into a structured report with OpenAI.`,
      });
    } catch (error) {
      console.error("[research-pipeline] OpenAI synthesis failed:", error.message);
      report = buildFallbackReport(evidenceBlocks, normalizedIntent);
    }
  } else {
    report = buildFallbackReport(evidenceBlocks, normalizedIntent);
  }

  // recommendedSearches is deterministic (from intent), not LLM-authored.
  report.recommendedSearches = recommendedSearches;

  return {
    report,
    codeFindings,
    kbFindings,
    docsFindings,
    retrievalTrail: trail,
    chatUrl: sourcebotResearch.chatUrl || null,
  };
}

function toFinding(block) {
  return {
    label: block.label,
    location: block.location,
    webUrl: block.webUrl || null,
    language: block.language || null,
    snippets: block.snippets || "",
  };
}

async function collectDocsResearch(query, docsKbService) {
  if (!docsKbService) return [];
  try {
    const chunks = await docsKbService.search(query);
    return chunks.map((chunk) => ({
      label: chunk.heading,
      location: chunk.docPath,
      webUrl: null,
      language: "markdown",
      snippets: chunk.text,
    }));
  } catch (error) {
    console.warn("[research-pipeline] Docs search failed:", error.message);
    return [];
  }
}

async function collectSourcebotResearch({ sourcebotService, intent, applicationMatch }) {
  const trail = [];
  const evidenceBlocks = [];

  if (!sourcebotService?.enabled) {
    trail.push({
      tool: "search_code",
      summary: "Sourcebot search skipped because Sourcebot is not configured in this local server.",
    });
    return { trail, evidenceBlocks, chatUrl: null };
  }

  let relevantRepos = [];
  try {
    relevantRepos = mergeRepos(
      applicationMatch?.repoSearchOrder.map((name) => ({ name })) ?? []
    );

    const repos = intent.repoHint
      ? await sourcebotService.listRepos({ query: intent.repoHint, perPage: 20 })
      : [];
    const discoveredRepos = repos
      .filter((repo) => isSupportedRepo(repo.name))
      .filter((repo) => {
        if (!applicationMatch) return true;
        return applicationMatch.repoSearchOrder.includes(repo.name);
      });

    relevantRepos = mergeRepos(relevantRepos, discoveredRepos);
    trail.push({
      tool: "list_repos",
      summary:
        intent.repoHint
          ? `Repo search "${intent.repoHint}" -> ${repos.length} repos total, ${discoveredRepos.length} supported repos, ${relevantRepos.length} selected`
          : `Using catalog repos only -> ${relevantRepos.length} selected`,
    });
  } catch (error) {
    trail.push({
      tool: "list_repos",
      summary: `Repo discovery failed: ${error.message}`,
    });
  }

  let broadFiles = [];
  try {
    const scopedRepos = relevantRepos.map((repo) => repo.name);
    const broad = await sourcebotService.searchCode({
      query: intent.primarySearchTerm,
      filterByRepos: scopedRepos,
      includeCodeSnippets: false,
      maxTokens: 10000,
    });
    broadFiles = broad.files;
    trail.push({
      tool: "search_code",
      summary:
        `Broad search "${intent.primarySearchTerm}"` +
        (scopedRepos.length ? ` in ${scopedRepos.join(", ")}` : "") +
        ` -> ${broad.totalFiles} matches, ${broadFiles.length} shown`,
    });

    if (broadFiles.length === 0 && scopedRepos.length > 0) {
      const fallbackBroad = await sourcebotService.searchCode({
        query: intent.primarySearchTerm,
        includeCodeSnippets: false,
        maxTokens: 10000,
      });
      broadFiles = fallbackBroad.files;
      trail.push({
        tool: "search_code",
        summary:
          `Broad fallback "${intent.primarySearchTerm}" without repo filter` +
          ` -> ${fallbackBroad.totalFiles} matches, ${broadFiles.length} shown`,
      });
    }
  } catch (error) {
    trail.push({
      tool: "search_code",
      summary: `Broad search failed: ${error.message}`,
    });
  }

  const candidates = rankCandidates(
    broadFiles,
    relevantRepos,
    applicationMatch?.pathPrefixes ?? []
  );

  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const focused = await sourcebotService.searchCode({
        query: intent.primarySearchTerm,
        filterByRepos: [candidate.repository],
        filterByFilepaths: [candidate.fileName],
        includeCodeSnippets: true,
        maxTokens: 12000,
      });

      if (focused.files.length === 0) {
        continue;
      }

      const file = focused.files[0];
      if (file.chunks.length === 0) {
        continue;
      }

      evidenceBlocks.push({
        source: "sourcebot",
        label: `${candidate.repository}/${candidate.fileName}`,
        location: `${candidate.repository}/${candidate.fileName}`,
        webUrl: candidate.webUrl,
        language: candidate.language,
        snippets: file.chunks.join("\n---\n"),
      });
      trail.push({
        tool: "search_code",
        summary: `Focused: ${candidate.repository}/${candidate.fileName} -> ${file.chunks.length} snippet(s)`,
      });
    } catch {
      // Continue with remaining candidates.
    }

    if (evidenceBlocks.length >= MAX_EVIDENCE_BLOCKS) break;
  }

  if (evidenceBlocks.length === 0 && intent.fallbackTerms.length > 0) {
    const scopedRepos = relevantRepos.map((repo) => repo.name);
    for (const term of intent.fallbackTerms.slice(0, 4)) {
      try {
        const fallback = await sourcebotService.searchCode({
          query: term,
          filterByRepos: scopedRepos,
          includeCodeSnippets: true,
          maxTokens: 8000,
        });
        if (fallback.files.length === 0) {
          continue;
        }

        const file = fallback.files[0];
        if (file.chunks.length === 0) {
          continue;
        }

        evidenceBlocks.push({
          source: "sourcebot",
          label: `${file.repository}/${file.fileName}`,
          location: `${file.repository}/${file.fileName}`,
          webUrl: file.webUrl,
          language: file.language,
          snippets: file.chunks.join("\n---\n"),
        });
        trail.push({
          tool: "search_code",
          summary: `Fallback "${term}" -> ${fallback.files.length} file(s)`,
        });
        if (evidenceBlocks.length >= 2) break;
      } catch {
        // Continue with remaining fallback terms.
      }
    }
  }

  return {
    trail,
    evidenceBlocks,
    chatUrl: null,
  };
}

async function extractIntent(openai, model, itemContext, userQuery) {
  const instructions = [
    "You are a code search assistant for Benchmark Digital, a cloud-based EHS software platform built on ColdFusion.",
    "Extract search terms from a portal support item and user question.",
    APPLICATION_ROUTING_INSTRUCTION,
    `Negative app rules: ${APPLICATION_DISAMBIGUATION_RULES.join("; ")}.`,
    "Return only valid JSON with no markdown and no explanation.",
    'Shape: { "repoHint": "...", "primarySearchTerm": "...", "fallbackTerms": ["..."] }',
    "repoHint: 1-2 word keyword for repo search. Prefer the real repo-family keyword from the Application field when available.",
    "primarySearchTerm: the most specific filename, template name, form field name, or ColdFusion function to search for first.",
    "fallbackTerms: 2-4 alternative terms in order of decreasing specificity.",
  ].join(" ");

  const input = `Item context:\n${itemContext}\n\nUser question:\n${userQuery}`;

  try {
    const response = await openai.responses.create({
      model,
      store: false,
      instructions,
      input,
    });
    const text = response.output_text?.trim() ?? "";
    const parsed = JSON.parse(text);

    return {
      repoHint: String(parsed.repoHint ?? "").trim() || extractApplicationName(itemContext),
      primarySearchTerm: String(parsed.primarySearchTerm ?? "").trim() || userQuery,
      fallbackTerms: Array.isArray(parsed.fallbackTerms) ? parsed.fallbackTerms.map(String) : [],
    };
  } catch {
    return extractIntentSimple(itemContext, userQuery);
  }
}

function extractIntentSimple(itemContext, userQuery) {
  const applicationName = extractContextLine(itemContext, "Application");
  const repoHint = applicationName ? applicationName.toLowerCase().split(/\s+/)[0] : "";

  return {
    repoHint,
    primarySearchTerm: extractContextLine(itemContext, "Title") || userQuery.slice(0, 80),
    fallbackTerms: [],
  };
}

function extractApplicationName(itemContext) {
  const applicationName = extractContextLine(itemContext, "Application");
  return applicationName ? applicationName.toLowerCase().split(/\s+/)[0] : "";
}

function rankCandidates(files, relevantRepos, pathPrefixes = []) {
  const repoOrder = new Map(
    relevantRepos.map((repo, index) => [repo.name, Math.max(0, 12 - index * 2)])
  );

  return files
    .map((file) => {
      let score = repoOrder.get(file.repository) ?? 0;
      const ext = file.fileName.split(".").pop()?.toLowerCase() ?? "";

      if (pathPrefixes.some((prefix) => file.fileName.startsWith(prefix))) score += 4;
      if (["cfm", "cfc", "js", "vue", "ts"].includes(ext)) score += 3;
      if (["html", "css", "json", "xml"].includes(ext)) score += 1;

      return { ...file, score };
    })
    .sort((a, b) => b.score - a.score);
}

async function synthesizeReportWithTeamGpt(teamGptClient, config, { itemContext, userQuery, messages, evidenceBlocks, docsFindings = [], applicationMatch = null }) {
  const response = await teamGptClient.completeText({
    instructions: buildSynthesisInstructions(applicationMatch),
    prompt: buildSynthesisInput({ itemContext, userQuery, messages, evidenceBlocks, docsFindings }),
    model: config.teamGptModel,
    wordLimit: 1200,
    tone: "Professional + Straightforward",
    format: "plain_text",
    temperature: 0.2,
  });

  const parsed = parseReportJson(response.text);
  if (!parsed) {
    throw new Error("TeamGPT did not return parseable report JSON.");
  }
  return normalizeReport(parsed);
}

async function synthesizeReportWithOpenAi(openai, model, { itemContext, userQuery, messages, evidenceBlocks, docsFindings = [], applicationMatch = null }) {
  const response = await openai.responses.create({
    model,
    store: false,
    instructions: buildSynthesisInstructions(applicationMatch),
    input: buildSynthesisInput({ itemContext, userQuery, messages, evidenceBlocks, docsFindings }),
  });

  const parsed = parseReportJson(response.output_text);
  if (!parsed) {
    throw new Error("OpenAI did not return parseable report JSON.");
  }
  return normalizeReport(parsed);
}

function buildSynthesisInstructions(applicationMatch = null) {
  return [
    "You are a technical assistant helping resolve Benchmark Digital portal support items.",
    "You will receive code evidence from Sourcebot, documentation evidence from the internal Knowledge Base, and excerpts from internal technical documentation files.",
    "",
    APPLICATION_ROUTING_INSTRUCTION,
    "App identity profile schema: appid, application, repo, aliases, shortname, AppAbr, intentTerms, exclusionTerms.",
    `Negative app rules: ${APPLICATION_DISAMBIGUATION_RULES.join("; ")}.`,
    buildMatchedApplicationInstruction(applicationMatch),
    "",
    "Answer ONLY from the supplied evidence. Do not invent implementation details or KB content.",
    "Return your answer as STRICT JSON only — no markdown, no code fences, no prose outside the JSON object.",
    "Use exactly this shape:",
    "{",
    '  "quickTake": { "issue": "one sentence stating the problem", "whatWeKnow": "one sentence on what the evidence confirms", "nextStep": "one sentence on the recommended next action" },',
    '  "summaryOfIssue": "2-4 sentence plain-text summary of the issue and context",',
    '  "whatWeFound": ["concise bullet of a concrete finding from the evidence", "..."],',
    '  "whatIsMissing": ["concise bullet describing a specific gap or unknown", "..."],',
    '  "confidence": { "level": "Low" | "Medium" | "High", "criticalGaps": <integer count of whatIsMissing items that block resolution>, "reason": "short justification" },',
    '  "actionItems": [ { "task": "imperative action", "owner": "Engineer" | "Customer POC" | "Product", "status": "Not started" } ]',
    "}",
    "Cite code claims with repo/path references and KB claims with content titles or content IDs inside the relevant bullets when visible.",
    "Keep every field concise and action-oriented. Provide 2-5 items for whatWeFound, whatIsMissing, and actionItems.",
  ].join("\n");
}

function buildMatchedApplicationInstruction(applicationMatch) {
  if (!applicationMatch) {
    return "No app identity profile was confidently matched. Use only supplied evidence and avoid assuming ATS, Calendar, Audit Assistant, Audit Planner, or SAFER.";
  }

  const profile = {
    appid: applicationMatch.appid,
    application: applicationMatch.application,
    repo: applicationMatch.repo,
    aliases: applicationMatch.aliases,
    shortname: applicationMatch.shortname,
    AppAbr: applicationMatch.AppAbr,
    intentTerms: applicationMatch.intentTerms,
    exclusionTerms: applicationMatch.exclusionTerms,
  };

  return [
    "Matched app identity profile:",
    JSON.stringify(profile),
    "Frame findings, gaps, and next steps in this app's real terms when the evidence supports it. Never invent setup vars, columns, or files not present in the evidence.",
  ].join("\n");
}

// Extract a JSON object from a model reply that may be wrapped in code fences or prose.
function parseReportJson(text) {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return null;

  const withoutFences = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const candidates = [withoutFences];
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(withoutFences.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function normalizeReport(parsed) {
  const quickTake = parsed.quickTake && typeof parsed.quickTake === "object" ? parsed.quickTake : {};
  const confidence = parsed.confidence && typeof parsed.confidence === "object" ? parsed.confidence : {};
  const level = ["Low", "Medium", "High"].includes(confidence.level) ? confidence.level : "Low";

  const whatIsMissing = toStringArray(parsed.whatIsMissing);
  const criticalGaps = Number.isInteger(confidence.criticalGaps)
    ? confidence.criticalGaps
    : whatIsMissing.length;

  return {
    quickTake: {
      issue: normalizeString(quickTake.issue),
      whatWeKnow: normalizeString(quickTake.whatWeKnow),
      nextStep: normalizeString(quickTake.nextStep),
    },
    summaryOfIssue: normalizeString(parsed.summaryOfIssue),
    whatWeFound: toStringArray(parsed.whatWeFound),
    whatIsMissing,
    recommendedSearches: [], // filled in deterministically by the caller
    confidence: {
      level,
      criticalGaps,
      reason: normalizeString(confidence.reason),
    },
    actionItems: toActionItems(parsed.actionItems),
  };
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeString(typeof entry === "string" ? entry : entry?.text ?? entry?.value))
    .filter(Boolean)
    .slice(0, 8);
}

function toActionItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const task = normalizeString(entry.task);
      if (!task) return null;
      return {
        task,
        owner: normalizeString(entry.owner) || "Engineer",
        status: normalizeString(entry.status) || "Not started",
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildSynthesisInput({ itemContext, userQuery, messages, evidenceBlocks, docsFindings = [] }) {
  const historyText =
    messages.length > 0
      ? "\n\nPrevious conversation:\n" +
        messages.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`).join("\n\n")
      : "";

  const evidenceText = evidenceBlocks
    .map((block, index) => {
      return [
        `### Evidence ${index + 1}: ${block.source.toUpperCase()}`,
        `Label: ${block.label}`,
        `Location: ${block.location}`,
        block.webUrl ? `URL: ${block.webUrl}` : "",
        block.language ? `Language: ${block.language}` : "",
        "",
        block.snippets,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  const docsText = docsFindings.length > 0
    ? docsFindings
        .map((chunk, index) => [
          `### Doc ${index + 1}: ${chunk.label}`,
          `File: ${chunk.location}`,
          "",
          chunk.snippets,
        ].join("\n"))
        .join("\n\n---\n\n")
    : "";

  return [
    `Portal item context:\n${itemContext}`,
    historyText,
    evidenceBlocks.length > 0 ? `\nEvidence:\n${evidenceText}` : "",
    docsText ? `\nInternal Documentation:\n${docsText}` : "",
    `\nUser question:\n${userQuery}`,
  ].filter(Boolean).join("\n");
}

// Deterministic structured report when no LLM is available or JSON parsing fails.
function buildFallbackReport(evidenceBlocks, intent) {
  const codeCount = evidenceBlocks.filter((block) => block.source === "sourcebot").length;
  const kbCount = evidenceBlocks.filter((block) => block.source === "kb").length;
  const searchTerm = intent.primarySearchTerm;

  const whatWeFound = evidenceBlocks.map((block) => {
    const sourceLabel = block.source === "kb" ? "Knowledge Base" : "Code";
    const evidence = block.snippets ? ` — ${truncateForPlainText(block.snippets)}` : "";
    return `${sourceLabel}: ${block.label}${evidence}`;
  });

  return {
    quickTake: {
      issue: `Investigating "${searchTerm}".`,
      whatWeKnow: `${evidenceBlocks.length} evidence block(s) found (${codeCount} code, ${kbCount} KB).`,
      nextStep: "Review the Code Findings and KB Findings tabs, then narrow the search if needed.",
    },
    summaryOfIssue: `Automated synthesis was unavailable, so this is the raw evidence collected for "${searchTerm}".`,
    whatWeFound,
    whatIsMissing: [
      "An AI-synthesized assessment (the language model was unavailable or returned an unparseable response).",
    ],
    recommendedSearches: [],
    confidence: {
      level: "Low",
      criticalGaps: 1,
      reason: "Report assembled from raw evidence without AI synthesis.",
    },
    actionItems: [],
  };
}

function buildNoEvidenceReport(intent, recommendedSearches) {
  const termsTried = [intent.primarySearchTerm, ...intent.fallbackTerms].filter(Boolean).join(", ");
  return {
    quickTake: {
      issue: `No matching code or Knowledge Base evidence was found for "${intent.primarySearchTerm}".`,
      whatWeKnow: "Searches returned no usable evidence.",
      nextStep: "Narrow the question to a specific feature, form field, file name, KB title, or ColdFusion template.",
    },
    summaryOfIssue: `No code or KB evidence matched the search terms (${termsTried || "none derived"}).`,
    whatWeFound: [],
    whatIsMissing: [
      "Any code evidence from the target repositories.",
      "Any Knowledge Base article matching the search terms.",
    ],
    recommendedSearches: recommendedSearches ?? [],
    confidence: {
      level: "Low",
      criticalGaps: 2,
      reason: "No evidence retrieved.",
    },
    actionItems: [],
  };
}

function normalizeIntent(intent, { itemContext, userQuery, applicationMatch }) {
  const derivedPrimaryTerm = derivePrimarySearchTerm(itemContext, applicationMatch, userQuery);
  const primarySearchTerm = isGenericSearchTerm(intent.primarySearchTerm, userQuery)
    ? derivedPrimaryTerm
    : cleanPhrase(intent.primarySearchTerm);

  return {
    repoHint: applicationMatch?.repoHint || String(intent.repoHint ?? "").trim(),
    primarySearchTerm,
    fallbackTerms: mergeTerms(
      intent.fallbackTerms,
      applicationMatch?.starterTerms ?? [],
      buildContextFallbackTerms(itemContext, primarySearchTerm)
    ).filter((term) => term !== primarySearchTerm),
  };
}

function derivePrimarySearchTerm(itemContext, applicationMatch, userQuery) {
  const references = extractContextLine(itemContext, "References / Fields");
  const relatedAction = extractContextLine(itemContext, "Related Action Item");
  const title = extractContextLine(itemContext, "Title");
  const summary = extractContextLine(itemContext, "Summary");

  return firstUsefulPhrase(
    references,
    relatedAction,
    title,
    summary,
    applicationMatch?.starterTerms?.[0],
    userQuery
  );
}

function buildContextFallbackTerms(itemContext, primarySearchTerm) {
  return [
    extractContextLine(itemContext, "Title"),
    extractContextLine(itemContext, "References / Fields"),
    extractContextLine(itemContext, "Request Type"),
  ]
    .map((value) => cleanPhrase(value))
    .filter(Boolean)
    .filter((value) => value !== primarySearchTerm);
}

function isGenericSearchTerm(term, userQuery) {
  const value = String(term ?? "").trim();
  if (!value) return true;

  const normalizedValue = value.toLowerCase();
  const normalizedUserQuery = String(userQuery ?? "").trim().toLowerCase();

  if (value.length > 100) return true;
  if (normalizedUserQuery && normalizedValue === normalizedUserQuery) return true;
  if (normalizedValue.includes("research this portal item")) return true;
  if (normalizedValue.includes("help me understand how to resolve it")) return true;
  if (normalizedValue.includes("find relevant code")) return true;

  return false;
}

function mergeRepos(...groups) {
  const seen = new Set();
  const merged = [];

  for (const group of groups) {
    for (const repo of group ?? []) {
      const name = repo?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      merged.push(repo);
    }
  }

  return merged;
}

function mergeTerms(...groups) {
  const seen = new Set();
  const merged = [];

  for (const group of groups) {
    for (const term of group ?? []) {
      const cleaned = cleanPhrase(term);
      if (!cleaned) continue;

      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      merged.push(cleaned);
    }
  }

  return merged.slice(0, 6);
}

function firstUsefulPhrase(...values) {
  for (const value of values) {
    const cleaned = cleanPhrase(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function cleanPhrase(value) {
  if (!value) return "";

  const candidate = String(value)
    .split(/[\n;|]/)
    .map((part) => part.trim())
    .find(Boolean) ?? "";

  return candidate
    .replace(/\s+/g, " ")
    .replace(/^not visible$/i, "")
    .trim()
    .slice(0, 80);
}

function extractContextLine(itemContext, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = itemContext.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
}

function isSupportedRepo(repoName) {
  return RESEARCH_REPO_PREFIXES.some((prefix) => repoName?.startsWith(prefix));
}

function createOpenAiClient(config) {
  try {
    if (config.openAiEnabled && config.openAiApiKey) {
      return new OpenAI({ apiKey: config.openAiApiKey });
    }
  } catch (error) {
    console.error("[research-pipeline] OpenAI init failed:", error.message);
  }
  return null;
}

function truncateForPlainText(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > 260 ? `${normalized.slice(0, 257)}...` : normalized;
}
