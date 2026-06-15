# Claude Prompt: Sourcebot MCP Workflow Integration

You are evaluating and improving a Sourcebot-backed code intelligence workflow for an application.

The goal is to integrate a workflow similar to a Sourcebot MCP agent that can:
- Discover relevant repositories.
- Search code globally.
- Read exact files.
- Search within selected repositories and file paths.
- Follow companion files, callers, callees, routes, JavaScript, CFCs, and templates.
- Produce grounded, evidence-based answers without relying on memory or local files.

Use the code snippets below as the baseline design. Evaluate the design, identify issues, improve the architecture, and produce runnable implementation guidance.

---

## Observed Sourcebot MCP Pattern

The Sourcebot MCP workflow follows this sequence:

1. Use `list_repos` to discover candidate repositories.
2. Use broad `search_code` without snippets to find candidate files cheaply.
3. Select the best repo/path candidate.
4. Use `read_file` for exact known files.
5. Use filtered `search_code` with snippets for focused evidence.
6. Retry failed exact searches with broader structural terms.
7. Search companion files and related symbols.
8. Synthesize an answer from retrieved evidence only.

---

## Example Sourcebot Calls

### Repo discovery

```json
{
  "tool": "sourcebot.list_repos",
  "input": {
    "query": "audit",
    "perPage": 20,
    "sort": "name",
    "direction": "asc"
  }
}
```

### Broad code search

```json
{
  "tool": "sourcebot.search_code",
  "input": {
    "query": "audfinding.cfm",
    "includeCodeSnippets": false,
    "maxTokens": 10000
  }
}
```

### Exact file read

```json
{
  "tool": "sourcebot.read_file",
  "input": {
    "repo": "code.gensuite.com/pm/audit",
    "path": "js/audfinding.js",
    "ref": "master"
  }
}
```

### Focused code search inside a repo/file

```json
{
  "tool": "sourcebot.search_code",
  "input": {
    "query": "request.ATSFindingName",
    "filterByRepos": ["code.gensuite.com/pm/audit"],
    "filterByFilepaths": ["audfinding.cfm"],
    "includeCodeSnippets": true,
    "maxTokens": 12000
  }
}
```

---

## TypeScript Integration Sketch

```ts
const repos = await sourcebot.listRepos({
  query: inferredRepoHint,
  perPage: 20,
  sort: "name",
  direction: "asc",
});
```

```ts
const candidates = await sourcebot.searchCode({
  query: userMentionedFileOrSymbol,
  includeCodeSnippets: false,
  maxTokens: 10000,
});
```

```ts
const file = await sourcebot.readFile({
  repo: selectedRepo,
  path: selectedPath,
  ref: selectedBranch,
});
```

```ts
const snippets = await sourcebot.searchCode({
  query: focusedTerm,
  filterByRepos: [repo],
  filterByFilepaths: [path],
  includeCodeSnippets: true,
  maxTokens: 12000,
});
```

---

## Query Fallback Strategy

When exact searches fail, do not conclude the code is absent. Legacy systems often:
- Build text dynamically.
- Use translated labels.
- Concatenate variable names.
- Hide behavior in includes.
- Move logic to companion JavaScript, CFCs, handlers, or templates.

Use a fallback query plan:

```ts
const queryPlan = [
  exactUserTerm,
  unquotedUserTerm,
  likelyVariableName,
  likelyFunctionName,
  UITextWithoutInterpolation,
  structuralMarker,
  relatedEndpointOrCompanionFile,
];
```

---

## End-to-End Workflow Function

```ts
type SourcebotContext = {
  repo: string;
  branch: string;
  path: string;
  language?: string;
  snippets: Array<{
    query: string;
    code: string;
    url: string;
  }>;
};

async function answerCodeQuestion(userQuestion: string) {
  const intent = await parseCodeIntent(userQuestion);

  const repos = await sourcebot.listRepos({
    query: intent.repoHint ?? intent.domainHint,
    perPage: 20,
    sort: "name",
    direction: "asc",
  });

  const broadHits = await sourcebot.searchCode({
    query: intent.primarySearchTerm,
    includeCodeSnippets: false,
    maxTokens: 10000,
  });

  const selected = rankCandidates(broadHits, repos, intent);

  const focusedSnippets = [];

  for (const q of buildFollowupQueries(intent, selected)) {
    const result = await sourcebot.searchCode({
      query: q,
      filterByRepos: [selected.repo],
      filterByFilepaths: [selected.path],
      includeCodeSnippets: true,
      maxTokens: 12000,
    });

    focusedSnippets.push({ query: q, result });
  }

  const companionFiles = inferCompanionFiles(selected.path, focusedSnippets);

  for (const file of companionFiles) {
    focusedSnippets.push(
      await sourcebot.readFile({
        repo: selected.repo,
        path: file,
        ref: selected.branch,
      })
    );
  }

  return synthesizeAnswer(userQuestion, focusedSnippets);
}
```

---

## Retrieval Trail Type

Store every retrieval step so the UI can show how the answer was produced.

```ts
type RetrievalStep = {
  tool: "list_repos" | "search_code" | "read_file";
  input: unknown;
  outputSummary: string;
  selectedBecause?: string;
};
```

---

## Suggested App Modes

| Mode | Sourcebot Behavior |
|---|---|
| Find file | `search_code` with snippets off |
| Explain file | `read_file` if small, otherwise targeted `search_code` snippets |
| Trace behavior | Search route/file, then callers, included files, companion JS/CFCs |
| Find save path | Search form action, submit button, endpoint names, DAO/service calls |
| Debug issue | Search error text, function names, config flags, related templates |
| Sourcebot-only answer | Disable local index/memory and require every claim to link to Sourcebot evidence |

---

## Requirements for Claude

Please evaluate this design and produce:

1. A more robust architecture for integrating Sourcebot into an app.
2. TypeScript interfaces for the Sourcebot client.
3. A ranking strategy for choosing candidate repos/files.
4. A retry strategy for failed searches.
5. A retrieval-trail data model suitable for UI display.
6. Guardrails to prevent hallucinated answers.
7. A runnable skeleton implementation.
8. Suggested tests or mocks for Sourcebot calls.
9. Recommendations for token budgeting and snippet selection.
10. Any security considerations, especially around repo access, logs, and user-visible source snippets.

Important constraints:
- Do not rely on model memory.
- Do not assume local filesystem access.
- Treat Sourcebot as the source of truth.
- Every final answer generated by the app should be traceable to Sourcebot retrieval steps.
- Prefer focused searches over full-file reads for very large files.
- Show the retrieval trail to users.
- If evidence is insufficient, say so instead of guessing.
