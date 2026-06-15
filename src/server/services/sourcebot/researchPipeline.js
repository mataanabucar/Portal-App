import OpenAI from "openai";

const BMD_REPO_PREFIX = "code.benchmarkddev.com/bmd/";
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
  let openai = null;
  try {
    if (config.openAiEnabled && config.openAiApiKey) {
      openai = new OpenAI({ apiKey: config.openAiApiKey });
    }
  } catch (e) {
    console.error("[research-pipeline] OpenAI init failed:", e.message);
  }
  const model = config.openAiModel || "gpt-4o-mini";

  // ── Step 1: Extract search intent ────────────────────────────────────────
  const intent = openai
    ? await extractIntent(openai, model, itemContext, userQuery)
    : extractIntentSimple(itemContext, userQuery);

  trail.push({
    tool: "intent",
    summary: `Primary search: "${intent.primarySearchTerm}" | Repo hint: "${intent.repoHint}"`,
  });

  // ── Step 2: Discover relevant repos ──────────────────────────────────────
  let relevantRepos = [];
  try {
    const repos = await sourcebotService.listRepos({ query: intent.repoHint, perPage: 20 });
    relevantRepos = repos.filter((r) => r.name && r.name.startsWith(BMD_REPO_PREFIX));
    trail.push({
      tool: "list_repos",
      summary: `Repo search "${intent.repoHint}" → ${repos.length} repos total, ${relevantRepos.length} bmd repos`,
    });
  } catch (e) {
    trail.push({ tool: "list_repos", summary: `Repo discovery failed: ${e.message}` });
  }

  // ── Step 3: Broad code search (no snippets — find candidate files cheaply) ──
  let broadFiles = [];
  try {
    const broad = await sourcebotService.searchCode({
      query: intent.primarySearchTerm,
      includeCodeSnippets: false,
      maxTokens: 10000,
    });
    broadFiles = broad.files;
    trail.push({
      tool: "search_code",
      summary: `Broad search "${intent.primarySearchTerm}" → ${broad.totalFiles} matches, ${broadFiles.length} shown`,
    });
  } catch (e) {
    trail.push({ tool: "search_code", summary: `Broad search failed: ${e.message}` });
  }

  // ── Step 4: Rank candidates ───────────────────────────────────────────────
  const candidates = rankCandidates(broadFiles, relevantRepos);

  // ── Step 5: Focused search with snippets on top candidates ───────────────
  const evidenceBlocks = [];

  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const focused = await sourcebotService.searchCode({
        query: intent.primarySearchTerm,
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
            summary: `Focused: ${candidate.repository}/${candidate.fileName} → ${file.chunks.length} snippet(s)`,
          });
        }
      }
    } catch {
      // skip — continue with remaining candidates
    }
    if (evidenceBlocks.length >= MAX_EVIDENCE_BLOCKS) break;
  }

  // ── Step 6: Fallback terms if evidence is still sparse ───────────────────
  if (evidenceBlocks.length === 0 && intent.fallbackTerms?.length) {
    for (const term of intent.fallbackTerms.slice(0, 3)) {
      try {
        const fallback = await sourcebotService.searchCode({
          query: term,
          includeCodeSnippets: true,
          maxTokens: 8000,
        });
        if (fallback.files.length > 0) {
          const f = fallback.files[0];
          if (f.chunks.length > 0) {
            evidenceBlocks.push({
              repo: f.repository,
              path: f.fileName,
              webUrl: f.webUrl,
              language: f.language,
              snippets: f.chunks.join("\n---\n"),
            });
            trail.push({
              tool: "search_code",
              summary: `Fallback "${term}" → ${fallback.files.length} file(s)`,
            });
          }
        }
        if (evidenceBlocks.length >= 2) break;
      } catch {
        // continue
      }
    }
  }

  // ── Step 7: Synthesize answer ─────────────────────────────────────────────
  let answer;
  if (evidenceBlocks.length === 0) {
    answer =
      `No matching code was found for "${intent.primarySearchTerm}" in the Benchmark Digital codebase.\n\n` +
      `Search terms tried: ${[intent.primarySearchTerm, ...(intent.fallbackTerms ?? [])].join(", ")}.\n\n` +
      `Try narrowing the question to a specific feature name, form field, file name, or ColdFusion template.`;
  } else if (openai) {
    try {
      answer = await synthesizeAnswer(openai, model, {
        itemContext,
        userQuery,
        messages,
        evidenceBlocks,
      });
    } catch (synthError) {
      console.error("[research-pipeline] synthesizeAnswer failed:", synthError.message);
      answer = buildPlainAnswer(evidenceBlocks, intent.primarySearchTerm);
    }
  } else {
    answer = buildPlainAnswer(evidenceBlocks, intent.primarySearchTerm);
  }

  return { answer, retrievalTrail: trail, chatUrl: null };
}

// ── Intent extraction ─────────────────────────────────────────────────────────

async function extractIntent(openai, model, itemContext, userQuery) {
  const instructions = [
    "You are a code search assistant for Benchmark Digital, a cloud-based EHS software platform built on ColdFusion.",
    "Extract search terms from a portal support item and user question.",
    "Return ONLY valid JSON with no markdown, no explanation.",
    'Shape: { "repoHint": "...", "primarySearchTerm": "...", "fallbackTerms": ["..."] }',
    "repoHint: 1-2 word keyword for repo search (e.g. 'audit', 'training', 'incident', 'action', 'form'). Extract from Application field if present.",
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
  const appMatch = itemContext.match(/^Application:\s*(.+)$/m);
  const repoHint = appMatch ? appMatch[1].trim().toLowerCase().split(/\s+/)[0] : "";
  return {
    repoHint,
    primarySearchTerm: userQuery.slice(0, 80),
    fallbackTerms: [],
  };
}

function extractApplicationName(itemContext) {
  const m = itemContext.match(/^Application:\s*(.+)$/m);
  return m ? m[1].trim().toLowerCase().split(/\s+/)[0] : "";
}

// ── Candidate ranking ─────────────────────────────────────────────────────────

function rankCandidates(files, relevantRepos) {
  const relevantRepoNames = new Set(relevantRepos.map((r) => r.name));

  return files
    .map((file) => {
      let score = 0;
      if (relevantRepoNames.has(file.repository)) score += 10;
      const ext = file.fileName.split(".").pop()?.toLowerCase() ?? "";
      if (["cfm", "cfc", "js", "vue", "ts"].includes(ext)) score += 3;
      if (["html", "css", "json", "xml"].includes(ext)) score += 1;
      return { ...file, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

async function synthesizeAnswer(openai, model, { itemContext, userQuery, messages, evidenceBlocks }) {
  const instructions = [
    "You are a technical assistant helping resolve Benchmark Digital portal support items.",
    "The Benchmark Digital product is a ColdFusion-based EHS software platform.",
    "Answer the user's question based ONLY on the code evidence retrieved from the Benchmark Digital codebase.",
    "Include specific file paths and repo references for every claim.",
    "If evidence is insufficient, say so clearly and suggest what else to search for.",
    "Do not guess or make up information not present in the evidence.",
    "Format your response clearly: use short paragraphs, bullet points, and code blocks where helpful.",
  ].join(" ");

  const evidenceText = evidenceBlocks
    .map(
      (b, i) =>
        `### Evidence ${i + 1}: ${b.repo}/${b.path}\nURL: ${b.webUrl}\nLanguage: ${b.language}\n\n${b.snippets}`
    )
    .join("\n\n---\n\n");

  const historyText = messages.length > 0
    ? "\n\nPrevious conversation:\n" +
      messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")
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
  for (const b of evidenceBlocks) {
    lines.push(`**${b.repo}/${b.path}** (${b.language})`);
    lines.push(`URL: ${b.webUrl}`);
    if (b.snippets) {
      lines.push("```");
      lines.push(b.snippets.slice(0, 800));
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}
