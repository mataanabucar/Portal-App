const SOURCEBOT_CLIENT_SOURCE = "portal-app";

// Escapes special regex/zoekt characters in a filter value (repo name, file path, etc.)
function escapeZoekt(str) {
  return str.replace(/[|\\{}()[\]^$+*?.\-]/g, "\\$&");
}

// Builds a zoekt query string from a human search term + optional filters.
// Matches the @sourcebot/mcp convention: wrap term in double quotes,
// append filter clauses.
function buildZoektQuery({ term, filterByRepos = [], filterByFilepaths = [], filterByLanguages = [], ref } = {}) {
  const escaped = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  let query = `"${escaped}"`;

  if (filterByRepos.length > 0) {
    query += ` (repo:${filterByRepos.map(escapeZoekt).join(" or repo:")})`;
  }
  if (filterByLanguages.length > 0) {
    query += ` (lang:${filterByLanguages.join(" or lang:")})`;
  }
  if (filterByFilepaths.length > 0) {
    query += ` (file:${filterByFilepaths.map(escapeZoekt).join(" or file:")})`;
  }
  if (ref) {
    query += ` (rev:${ref})`;
  }
  return query;
}

export function createSourcebotService(config) {
  const { sourcebotHost, sourcebotApiKey } = config;
  const enabled = Boolean(sourcebotHost && sourcebotApiKey);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Sourcebot-Client-Source": SOURCEBOT_CLIENT_SOURCE,
      "X-Sourcebot-Api-Key": sourcebotApiKey,
    };
  }

  function throwSourcebotError(status, text) {
    const error = new Error(`Sourcebot error ${status}: ${text}`);
    error.statusCode = status >= 500 ? 502 : status;
    throw error;
  }

  async function checkEnabled() {
    if (!enabled) {
      const error = new Error("Sourcebot is not configured.");
      error.statusCode = 503;
      throw error;
    }
  }

  function describe() {
    return { enabled };
  }

  // POST /api/chat/blocking — AI agent answer (requires LLM configured in Sourcebot)
  async function askCodebase({ query, repos }) {
    await checkEnabled();
    const body = { query };
    if (repos?.length) body.repos = repos;

    const response = await fetch(`${sourcebotHost}/api/chat/blocking`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throwSourcebotError(response.status, text);
    }

    const data = await response.json();
    return {
      answer: data.answer ?? "",
      chatUrl: data.chatUrl ?? null,
    };
  }

  // GET /api/repos — list indexed repositories
  async function listRepos({ query, perPage = 20, sort = "name", direction = "asc" } = {}) {
    await checkEnabled();
    const url = new URL(`${sourcebotHost}/api/repos`);
    if (query) url.searchParams.set("query", query);
    url.searchParams.set("perPage", String(perPage));
    url.searchParams.set("sort", sort);
    url.searchParams.set("direction", direction);

    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throwSourcebotError(response.status, text);
    }

    const repos = await response.json();
    return Array.isArray(repos) ? repos : [];
  }

  // POST /api/search — zoekt code search
  // Returns: { files: [{ fileName, webUrl, repository, language, chunks }], totalFiles }
  async function searchCode({
    query,
    filterByRepos = [],
    filterByFilepaths = [],
    filterByLanguages = [],
    caseSensitive = false,
    includeCodeSnippets = false,
    ref,
    maxTokens = 10000,
  } = {}) {
    await checkEnabled();

    const zoektQuery = buildZoektQuery({ term: query, filterByRepos, filterByFilepaths, filterByLanguages, ref });

    const body = {
      query: zoektQuery,
      matches: 10000,
      contextLines: includeCodeSnippets ? 5 : 0,
      isCaseSensitivityEnabled: caseSensitive,
      isRegexEnabled: false,
    };

    const response = await fetch(`${sourcebotHost}/api/search`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throwSourcebotError(response.status, text);
    }

    const data = await response.json();
    const allFiles = data.files ?? [];

    // Apply token budget — trim results to stay under approximate token count
    let totalTokens = 0;
    const files = [];
    for (const file of allFiles) {
      const chunks = includeCodeSnippets ? (file.chunks ?? []).map((c) => c.content) : [];
      const entry = {
        fileName: file.fileName?.text ?? "",
        webUrl: file.webUrl ?? "",
        repository: file.repository ?? "",
        language: file.language ?? "",
        chunks,
      };
      const approxTokens = JSON.stringify(entry).length / 4;
      if (files.length > 0 && totalTokens + approxTokens > maxTokens) break;
      totalTokens += approxTokens;
      files.push(entry);
    }

    return { files, totalFiles: allFiles.length };
  }

  // GET /api/source — read a specific file
  async function readFile({ repo, path, ref } = {}) {
    await checkEnabled();
    const url = new URL(`${sourcebotHost}/api/source`);
    url.searchParams.set("repo", repo);
    url.searchParams.set("path", path);
    if (ref) url.searchParams.set("ref", ref);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Sourcebot-Client-Source": SOURCEBOT_CLIENT_SOURCE,
        "X-Sourcebot-Api-Key": sourcebotApiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throwSourcebotError(response.status, text);
    }

    const data = await response.json();
    return {
      source: data.source ?? "",
      language: data.language ?? "",
      path: data.path ?? path,
      repo: data.repo ?? repo,
      webUrl: data.webUrl ?? "",
    };
  }

  return { enabled, describe, askCodebase, listRepos, searchCode, readFile };
}
