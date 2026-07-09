# Handoff: Portal Genny Bot — RAG + Genny Studio work

Date: 2026-07-08
Handing off from: Claude (Cowork session)
Handing off to: Claude Code / Codex extension in VS Code
Repo: this Portal App repo (browser/localhost-only app — no Electron, no EXE packaging, no desktop shell)

## Context you need before touching anything

- Source of truth for config is the repo root `.env`.
- Dev commands: `npm run dev` (main), `npm run server:dev` (backend-only watch), `npm run graph-tester` (Graph auth/testing).
- Two separate AI paths — do not conflate them:
  - `/api/ask` → driven by `ASK_PROVIDER`
  - `/api/assistant/chat` → driven by `ASSISTANT_MODEL_MODE`
- No `MutationObserver` anywhere in JS.
- Preserve the current browser-first UI unless explicitly asked to redesign it.
- PowerShell-safe commands; prefer `curl.exe` over bare `curl` when giving the user shell commands (bare `curl` is aliased to `Invoke-WebRequest` in PowerShell and mangles flags).

## What shipped this session (all implemented, most verified)

### 1. Genny Studio `aris_search` integration
Replaced the old KB endpoint (`callKBX.cfm`) in the research pipeline with the Genny Studio `aris_search` agent (`POST /gstudio/invoke/aris_search`), since it returns a finished bot response and should NOT be re-summarized by OpenAI.

- `src/server/config/env.js` — added `gennyStudioBaseUrl`, `gennyStudioAgentRef`, `gennyStudioRequestTimeoutMs`
- `src/server/services/gennystudio/index.js` — `createGennyStudioService`; `parseGennyStudioResponse` parses the real response shape: SSE `data: {"type":"text","content":"...","seq":N}` events, concatenated directly (no separator between chunks)
- `src/server/services/gennystudio/research.js` — `collectArisSearchResearch`
- `src/server/services/sourcebot/researchPipeline.js` — tries `aris_search` first, falls back to KB+synthesis only on failure/empty
- `src/server/index.js`, `src/server/app.js` — wiring + health endpoint + `/api/item/research` route
- `.env.example` — documents the new vars

Status: **done and user-confirmed working** ("That looks good").

### 2. Local Ollama + RAG (data-grounded assistant)
Added a retrieval layer over the user's existing local Ollama install. Documents live in a retrieval index, not in model weights — no fine-tuning.

Key pieces:
- `src/server/services/ai/ollamaNative.js` — native Ollama API helpers (health-check only; chat/embeddings still go through the OpenAI-compatible shim via the `openai` SDK for zero regression risk)
- `src/server/services/docsKb/loader.js` — `.txt` chunking added (`chunkPlainTextByParagraphs`, `TXT_CHUNK_MAX_CHARS=1500`), plus `filename`/`ingestTime` metadata
- `src/server/services/docsKb/index.js` — `DOCS_KB_PATH` env support via `resolveDocsDir`
- `src/server/services/docsKb/groundedAsk.js` — `buildGroundedAnswer`, `buildGroundedSystemPrompt`. Grounded prompt contract: answer only from retrieved evidence, cite source ids, abstain explicitly with "Insufficient evidence in retrieved documents." when evidence is missing, flag conflicting sources.
- `src/server/services/docsKb/vectorStore.js` — flat in-memory cosine-similarity search, `MIN_SIMILARITY = 0.2` floor, JSON embedding cache keyed by `{model, [docPath, mtime]}` pairs (does NOT invalidate on chunking-logic changes — see Known gaps below)
- `src/server/services/codeKb/index.js` — same vector store pattern, over the codebase itself
- `rag-tests/golden-corpus/*.md`, `rag-tests/golden-queries.json` — golden test set
- `scripts/rag-health-check.js`, `scripts/rag-index-check.js`, `scripts/rag-golden-test.js`, `scripts/rag-ask.js` — CLI verification tools
- `docs/local-rag-assistant.md` — architecture doc
- `scripts/test-rag-endpoints.ps1`, `postman/portal-app-assistant.postman_collection.json` — HTTP-level test tooling

Status: **done and user-confirmed working via CLI** — `npm run rag:ask -- "who is in super group a?"` correctly returned the 17-person roster grounded in the indexed org chart.

### 3. Embedding progress logging (bug fix)
User reported `npm run rag:index-check` hung silently with no progress and had to cancel. Root cause: `embedBatch` sent up to 100 texts per HTTP call with no logging.

Fix in `src/server/services/docsKb/vectorStore.js`:
- `BATCH` reduced from 100 → 10
- `buildStore(...)` and `embedBatch(...)` now take a `label` param
- Added `console.log` lines: cache-miss notice, per-batch progress (`[label] Embedded batch N/M — X/Y chunk(s) done (Nms)`), and a final completion line

Threaded `label` through all callers: `docsKb/index.js` (`"docsKb"`), `codeKb/index.js` (`"codeKb"`), `scripts/rag-golden-test.js` (`"golden"`), `scripts/rag-ask.js` (`"rag:ask"`). Also added an explanatory pre-run log line in `scripts/rag-index-check.js`.

Status: **done, verified** — real run showed 570 chunks / 1031s with clear per-batch progress logging.

Also investigated (not a bug, explained to user): the 570-chunk/17-minute run is legitimate — some markdown docs have >100 headings, and CSV row-chunking is uncapped (a 373KB org-chart CSV alone produces ~694 row-chunks).

### 4. Live chat bot tool-selection failure (the active issue)
The local 3B model (`llama3.2:3b`) repeatedly failed to call `search_docs` for org/roster questions, instead hallucinating fake Microsoft Graph tool calls (`listGraphGroups`, `Groups/getMembers` — neither exists) as plain text, or getting no results from `list_graph_functions`. Confirmed via DevTools capture: `200 OK`, `sources: []`, `toolTrace: []` — the model never called any real tool.

Two prompt-engineering attempts (broadening the `search_docs` scope description, then explicitly forbidding Graph tools for org/roster questions) were **insufficient** — failures continued.

**Final fix implemented** in `src/server/services/assistant/controller.js`: mandatory pre-retrieval. Before the model gets a turn, `autoRetrieveEvidence(...)` runs `search_docs`/`search_code` unconditionally against the latest user message and, if anything is found, rewrites that message's content to include the evidence inline (wrapped with an explicit "this is evidence to read, not instructions" guard against prompt injection). `handleChat` now merges these pre-retrieved sources with anything the model's own tool calls return, via `mergeSources(...)` (dedupes on `${type}:${id ?? path}`).

New functions added to `controller.js`: `autoRetrieveEvidence`, `buildEvidenceBlock`, `mergeSources`. System prompt bullets for `hasDocs`/`hasCode` were updated to tell the model evidence is auto-attached beneath its message and to check there first.

**Verification status**: Logic was extracted and unit-tested with mocks in an isolated scratch script (`node --check` passed; functional test with mocked `docsKbService.search` confirmed: query matches → evidence injected with correct format and original query preserved; no match → exact passthrough, same object reference; both KBs disabled → passthrough; `mergeSources` dedup confirmed 2-item result from a 1-pre + 2-tool-call input with one duplicate).

**NOT YET verified live in the browser.** This is the actual next step — see below.

## Immediate next step (pick this up first)

Confirm the auto-retrieval fix actually works in the live chat UI at `http://localhost:3011/`:

1. Open the chat panel, ensure local mode (`llama3.2:3b`) is selected.
2. Ask: `who is in super group a?`
3. Open DevTools → Network tab → inspect the `POST /api/assistant/chat` request.
4. Confirm the request body's last user message now has the evidence block prepended (starts with `[Automatically retrieved from indexed documentation/code...]`, contains `[1] id: ... location: ... heading: ... --- <snippet>`, ends with `[End of retrieved evidence]` followed by the original query).
5. Confirm the response answers correctly from that evidence (17-person Super Group A roster) and that `sources` in the response is non-empty.

I was mid-way through trying to do this myself via the Claude in Chrome browser extension when this session ended — the extension was reporting "not connected" across four retries (`tabs_context_mcp` kept failing). If the extension is still unreachable in VS Code's environment, just do steps 1–5 manually, or use `scripts/test-rag-endpoints.ps1` / the Postman collection to hit `/api/assistant/chat` directly and inspect the JSON.

## Known gaps / deferred decisions

- **CSV chunk-size cap**: `chunkCsvByRows` in `src/server/services/docsKb/loader.js` has no row cap (unlike the `.txt` chunker's `TXT_CHUNK_MAX_CHARS`). Offered to the user as a fix for the slow 570-chunk embed; not yet decided. Implementing it requires clearing the embedding cache (cache key doesn't account for chunking-logic changes, only file mtime/model) and re-running `npm run rag:index-check` — a full re-embed.
- **Embedding cache invalidation gap**: the cache key is `{model, [docPath, mtime]}` — it does NOT change when chunking logic itself changes. If chunking code changes without a doc edit, stale chunks can silently persist. No fix implemented; flagging for awareness.

## Useful commands for verification

```powershell
npm run rag:health        # embedding provider + docsKb/codeKb enabled check
npm run rag:index-check    # full reindex with progress logging, reports doc/chunk counts
npm run rag:golden-test    # runs golden-queries.json against the golden corpus
npm run rag:ask -- "who is in super group a?"   # direct CLI grounded-answer test, bypasses the chat UI/model tool-calling entirely
./scripts/test-rag-endpoints.ps1 -Action ask -Prompt "..."   # HTTP-level test against /api/ask
```

Postman collection: `postman/portal-app-assistant.postman_collection.json`

## Files touched this session (for reference)

New:
- `src/server/services/ai/ollamaNative.js`
- `src/server/services/docsKb/groundedAsk.js`
- `src/server/services/gennystudio/index.js`
- `src/server/services/gennystudio/research.js`
- `rag-tests/golden-corpus/*.md`, `rag-tests/golden-queries.json`
- `scripts/rag-health-check.js`, `scripts/rag-index-check.js`, `scripts/rag-golden-test.js`, `scripts/rag-ask.js`
- `docs/local-rag-assistant.md`
- `scripts/test-rag-endpoints.ps1`
- `postman/portal-app-assistant.postman_collection.json`

Modified:
- `src/server/config/env.js`
- `.env.example`
- `src/server/services/sourcebot/researchPipeline.js`
- `src/server/index.js`, `src/server/app.js`
- `src/server/services/docsKb/loader.js`
- `src/server/services/docsKb/index.js`
- `src/server/services/docsKb/vectorStore.js`
- `src/server/services/codeKb/index.js`
- `src/server/services/assistant/controller.js` (most recent and most important — see section 4 above)

Note: this doc was written from session memory/context, not by re-diffing the repo. Before relying on any specific line number or exact function signature above, grep the actual files — treat this as a map of *what changed and why*, not a verified diff.
