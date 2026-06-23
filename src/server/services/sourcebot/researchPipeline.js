import OpenAI from "openai";
import {
  RESEARCH_REPO_PREFIXES,
  resolveApplicationContext,
} from "./applicationCatalog.js";

const MAX_EVIDENCE_BLOCKS = 4;
const MAX_CANDIDATES = 3;

export async function runResearchPipeline({
  sourcebotService,
  config,
  itemContext,
  userQuery,
  messages = [],
}) {
  const trail = [];
  const applicationMatch = resolveApplicationContext({
    itemContext,
    userQuery,
    messages,
  });

  let openai = null;
  try {
    if (config.openAiEnabled && config.openAiApiKey) {
      openai = new OpenAI({ apiKey: config.openAiApiKey });
    }
  } catch (error) {
    console.error("[research-pipeline] OpenAI init failed:", error.message);
  }

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
        ? ` | App: ${applicationMatch.canonicalName} -> ${applicationMatch.repoSearchOrder.join(", ")}`
        : ""),
  });

  let relevantRepos = [];
  try {
    relevantRepos = mergeRepos(
      applicationMatch?.repoSearchOrder.map((name) => ({ name })) ?? []
    );

    const repos = normalizedIntent.repoHint
      ? await sourcebotService.listRepos({ query: normalizedIntent.repoHint, perPage: 20 })
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
        normalizedIntent.repoHint
          ? `Repo search "${normalizedIntent.repoHint}" -> ${repos.length} repos total, ${discoveredRepos.length} supported repos, ${relevantRepos.length} selected`
          : `Using catalog repos only -> ${relevantRepos.length} selected`,
    });
  } catch (error) {
    trail.push({ tool: "list_repos", summary: `Repo discovery failed: ${error.message}` });
  }

  let broadFiles = [];
  try {
    const scopedRepos = relevantRepos.map((repo) => repo.name);
    const broad = await sourcebotService.searchCode({
      query: normalizedIntent.primarySearchTerm,
      filterByRepos: scopedRepos,
      includeCodeSnippets: false,
      maxTokens: 10000,
    });
    broadFiles = broad.files;
    trail.push({
      tool: "search_code",
      summary:
        `Broad search "${normalizedIntent.primarySearchTerm}"` +
        (scopedRepos.length ? ` in ${scopedRepos.join(", ")}` : "") +
        ` -> ${broad.totalFiles} matches, ${broadFiles.length} shown`,
    });

    if (broadFiles.length === 0 && scopedRepos.length > 0) {
      const unscoped = await sourcebotService.searchCode({
        query: normalizedIntent.primarySearchTerm,
        includeCodeSnippets: false,
        maxTokens: 10000,
      });
      broadFiles = unscoped.files;
      trail.push({
        tool: "search_code",
        summary:
          `Broad fallback "${normalizedIntent.primarySearchTerm}" without repo filter` +
          ` -> ${unscoped.totalFiles} matches, ${broadFiles.length} shown`,
      });
    }
  } catch (error) {
    trail.push({ tool: "search_code", summary: `Broad search failed: ${error.message}` });
  }

  const candidates = rankCandidates(
    broadFiles,
    relevantRepos,
    applicationMatch?.pathPrefixes ?? []
  );

  const evidenceBlocks = [];

  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const focused = await sourcebotService.searchCode({
        query: normalizedIntent.primarySearchTerm,
        filterByRepos: [candidate.repository],
        filterByFilepaths: [candidate.fileName],
        includeCodeSnippets: true,
        maxTokens: 12000,
      });
      if (focused.files.length > 0) {
        const file = focused.files[0];
        if (file.chunks.length > 0) {
          evidenceBlocks.push({
            repo: candidate.repository,
            path: candidate.fileName,
            webUrl: candidate.webUrl,
            language: candidate.language,
            snippets: file.chunks.join("\n---\n"),
          });
          trail.push({
            tool: "search_code",
            summary: `Focused: ${candidate.repository}/${candidate.fileName} -> ${file.chunks.length} snippet(s)`,
          });
        }
      }
    } catch {
      // Continue with remaining candidates.
    }

    if (evidenceBlocks.length >= MAX_EVIDENCE_BLOCKS) break;
  }

  if (evidenceBlocks.length === 0 && normalizedIntent.fallbackTerms.length > 0) {
    const scopedRepos = relevantRepos.map((repo) => repo.name);

    for (const term of normalizedIntent.fallbackTerms.slice(0, 4)) {
      try {
        const fallback = await sourcebotService.searchCode({
          query: term,
          filterByRepos: scopedRepos,
          includeCodeSnippets: true,
          maxTokens: 8000,
        });
        if (fallback.files.length > 0) {
          const file = fallback.files[0];
          if (file.chunks.length > 0) {
            evidenceBlocks.push({
              repo: file.repository,
              path: file.fileName,
              webUrl: file.webUrl,
              language: file.language,
              snippets: file.chunks.join("\n---\n"),
            });
            trail.push({
              tool: "search_code",
              summary: `Fallback "${term}" -> ${fallback.files.length} file(s)`,
            });
          }
        }
        if (evidenceBlocks.length >= 2) break;
      } catch {
        // Continue with remaining fallback terms.
      }
    }
  }

  let answer;
  if (evidenceBlocks.length === 0) {
    answer =
      `No matching code was found for "${normalizedIntent.primarySearchTerm}" in the Benchmark Digital codebase.\n\n` +
      `Search terms tried: ${[normalizedIntent.primarySearchTerm, ...normalizedIntent.fallbackTerms].join(", ")}.\n\n` +
      "Try narrowing the question to a specific feature name, form field, file name, or ColdFusion template.";
  } else if (openai) {
    try {
      answer = await synthesizeAnswer(openai, model, {
        itemContext,
        userQuery,
        messages,
        evidenceBlocks,
      });
    } catch (error) {
      console.error("[research-pipeline] synthesizeAnswer failed:", error.message);
      answer = buildPlainAnswer(evidenceBlocks, normalizedIntent.primarySearchTerm);
    }
  } else {
    answer = buildPlainAnswer(evidenceBlocks, normalizedIntent.primarySearchTerm);
  }

  return { answer, retrievalTrail: trail, chatUrl: null };
}

async function extractIntent(openai, model, itemContext, userQuery) {
  const instructions = [
    "You are a code search assistant for Benchmark Digital, a cloud-based EHS software platform built on ColdFusion.",
    "Extract search terms from a portal support item and user question.",
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

async function synthesizeAnswer(openai, model, { itemContext, userQuery, messages, evidenceBlocks }) {
  const instructions = [
    "You are a technical assistant helping resolve Benchmark Digital portal support items.",
    "The Benchmark Digital product is a ColdFusion-based EHS software platform.",
    "Answer the user's question based only on the code evidence retrieved from the Benchmark Digital codebase.",
    "Include specific file paths and repo references for every claim.",
    "If evidence is insufficient, say so clearly and suggest what else to search for.",
    "Do not guess or make up information not present in the evidence.",
    "Format your response clearly with short paragraphs, bullets, and code blocks where helpful.",
  ].join(" ");

  const evidenceText = evidenceBlocks
    .map(
      (block, index) =>
        `### Evidence ${index + 1}: ${block.repo}/${block.path}\nURL: ${block.webUrl}\nLanguage: ${block.language}\n\n${block.snippets}`
    )
    .join("\n\n---\n\n");

  const historyText = messages.length > 0
    ? "\n\nPrevious conversation:\n" +
      messages.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`).join("\n\n")
    : "";

  const input = [
    `Portal item context:\n${itemContext}`,
    historyText,
    `\nCode evidence from codebase:\n${evidenceText}`,
    `\nUser question:\n${userQuery}`,
  ].join("\n");

  const response = await openai.responses.create({
    model,
    store: false,
    instructions,
    input,
  });

  return response.output_text ?? "Unable to synthesize an answer from the retrieved evidence.";
}

function buildPlainAnswer(evidenceBlocks, searchTerm) {
  const lines = [`Found ${evidenceBlocks.length} relevant file(s) for "${searchTerm}":\n`];

  for (const block of evidenceBlocks) {
    lines.push(`**${block.repo}/${block.path}** (${block.language})`);
    lines.push(`URL: ${block.webUrl}`);
    if (block.snippets) {
      lines.push("```");
      lines.push(block.snippets.slice(0, 800));
      lines.push("```");
    }
    lines.push("");
  }

  return lines.join("\n");
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
