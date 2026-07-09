# Local Ollama + RAG Assistant

> **LEGACY — archived 2026-07.** The default assistant path is now the
> deterministic orchestrator (`src/server/services/orchestrator/`), which
> routes questions to GennyStudio/KB, TeamGPT, Sourcebot, Microsoft Graph, or
> the research pipeline without any local model. Everything below only applies
> when `LEGACY_LOCAL_RAG_ENABLED=true` is set in `.env` (plus
> `ASSISTANT_MODEL_MODE=local` and/or `ASSISTANT_EMBEDDING_MODE=local|cloud`).
> The `rag:*` npm scripts referenced in this doc are now named `legacy:rag:*`.

This app can run its assistant chat and document/code search entirely offline
against a local [Ollama](https://ollama.com) install. This doc explains how
the pieces fit together and how to operate them.

## Three layers

1. **Ollama runtime/model configuration** — `src/server/services/ai/modelProvider.js`
   (chat) and `src/server/services/ai/embeddingProvider.js` (embeddings). Both
   talk to Ollama through its OpenAI-compatible endpoint
   (`LOCAL_LLM_BASE_URL` / `LOCAL_EMBEDDING_BASE_URL`, default
   `http://localhost:11434/v1`) using the `openai` SDK — this is what lets the
   exact same tool-calling code work against local Ollama or a cloud provider
   by just swapping the base URL and API key. `src/server/services/ai/ollamaNative.js`
   additionally talks to Ollama's *native* API (`/api/tags`) purely for health
   checks — it confirms Ollama is actually running and that the configured
   models are pulled, which the OpenAI-compat `/v1/models` endpoint can't
   always tell you precisely.

2. **Retrieval/index layer** — `src/server/services/docsKb/` (project
   documents) and `src/server/services/codeKb/` (this repo's own source
   code). **Adding a document never touches the model weights.** Documents are
   loaded, chunked, embedded, and stored as vectors; nothing is fine-tuned or
   retrained. Concretely:
   - `docsKb/loader.js` reads `.md` (chunked by heading), `.csv` (chunked by
     row group), and `.txt` (chunked by paragraph, packed up to ~1500 chars)
     files, attaching per-chunk metadata: `id` (stable chunk id, e.g.
     `some-doc.md#a-heading`), `docPath` (source path relative to the docs
     root), `filename`, `heading`, `mtime` (source file's last-modified time —
     acts as the version marker), and `ingestTime` (when this ingestion pass
     ran).
   - `docsKb/vectorStore.js` embeds each chunk, stores `{...chunk, embedding}`
     in a flat in-memory array, and persists it to a JSON cache file keyed by
     a hash of `{model, [docPath, mtime] pairs}` — so it re-embeds only files
     that are new or changed, or everything if you switch embedding models.
     Search is exact (no ANN/ index approximation): cosine similarity scored
     against every stored vector, sorted, top-k returned, with a similarity
     floor (`MIN_SIMILARITY = 0.2`) so unrelated chunks aren't returned just
     because they're the "least bad" match.
   - `codeKb/loader.js` does the same over `src/server` + `frontend/src`
     (fixed-size sliding-window chunks, with a secret-pattern scanner that
     skips anything that looks like a credential).

3. **Grounded assistant prompt + verification layer** —
   `src/server/services/docsKb/groundedAsk.js` implements the retrieval flow:
   embed the question → retrieve top-k chunks → build a compact evidence
   bundle → call the chat model with a strict grounding prompt → return the
   answer plus citations. The prompt contract:
   > You are a retrieval-grounded assistant. Use only the provided evidence to
   > answer the user's question. If the evidence is insufficient, say so
   > explicitly ("Insufficient evidence in retrieved documents"). Cite
   > supporting source ids for factual claims. If sources conflict, explain
   > the conflict instead of guessing.

   The interactive assistant chat (`assistant/controller.js`, used by
   `/api/assistant/chat`) is a separate, broader multi-tool agent (it also
   handles Microsoft Graph actions) — its `search_docs`/`search_code` tools
   use the same underlying `docsKb`/`codeKb` search, and its system prompt
   carries the same "cite ids, say insufficient evidence, flag conflicts"
   rule when those tools are used, but it is not restricted to *only*
   answering from retrieval the way `groundedAsk`/`rag:ask` are.

## Ingesting documents

Drop `.md`, `.csv`, or `.txt` files anywhere under the docs directory
(default: `docs/`; override with `DOCS_KB_PATH=/absolute/or/relative/path` in
`.env`). No restart-and-reindex step is required for the live app — the
index is built lazily on first search and cached; to force a rebuild without
restarting the server, call the docs KB's `reload()` (used internally, or via
`npm run rag:index-check`, which always reloads).

## Rebuilding the index

```
npm run rag:index-check
```

This loads every supported file under the configured docs directory,
(re)embeds anything new or changed, and reports doc count, chunk count, and
embedding vector dimensions. Delete the relevant cache file under
`.local-state/docs-embeddings-cache.*.json` (or `docs/.embeddings-cache.json`
for the default cloud model) to force a full re-embed from scratch.

## Verification scripts

| Command | Checks |
|---|---|
| `npm run rag:health` | Chat + embedding model reachability, native Ollama `/api/tags` model availability, one live embedding call |
| `npm run rag:index-check` | Real docs index build: chunk/doc counts, embedding dimensions |
| `npm run rag:golden-test` | Retrieval metrics + acceptance tests against `rag-tests/golden-corpus/` (isolated from the real index) |
| `npm run rag:ask -- "question"` | Ad-hoc grounded question against the real docs index |

All four are plain Node scripts, so `npm run <script>` works the same in
PowerShell, cmd, or bash — no `.ps1` files needed.

## Interpreting `rag:golden-test` output

- **Hit@k / Recall@k** — for the golden set (one relevant chunk per query),
  these are equivalent: did the expected chunk appear in the top-k results?
  Should be 100% — the golden corpus is deliberately small and unambiguous,
  so any miss indicates a real regression in chunking, embeddings, or the
  similarity threshold, not a "hard query."
- **MRR** (mean reciprocal rank) — how high the expected chunk ranked, not
  just whether it appeared. 1.0 means it was always the #1 result.
- **nDCG@k** — same idea as MRR, weighted so a rank-1 hit counts fully and a
  rank-3 hit less; also 1.0 in the ideal case for this single-relevant-item
  golden set.
- **Citation rate** — fraction of LLM-graded answers containing a `[n]`
  citation marker back to a retrieved source.
- **Acceptance checks** (PASS/FAIL/SKIPPED per query) — SKIPPED means the
  chat model wasn't reachable when the script ran (retrieval metrics above
  still ran and are valid); PASS/FAIL are hard checks: paraphrase still
  retrieves the right chunk, a distractor instruction embedded in the user's
  own question doesn't override the retrieved evidence, and a
  missing-evidence question causes an explicit abstention rather than a
  guess from model memory.

A non-zero exit code from `rag:golden-test` means at least one hard check
failed — treat it like any other failing test, not just a warning.

## Changing the chat or embedding model

Chat model (local): set `LOCAL_LLM_MODEL` in `.env` to any model you've
pulled (`ollama pull <model>`), e.g. `LOCAL_LLM_MODEL=qwen2.5:7b`.
Embedding model (local): set `LOCAL_EMBEDDING_MODEL` similarly, e.g.
`LOCAL_EMBEDDING_MODEL=mxbai-embed-large`. Switching the embedding model
invalidates the vector cache automatically (the cache key includes the model
name), so the next search/rebuild re-embeds everything under the new model —
run `npm run rag:index-check` right after switching to do that rebuild
up front instead of on the next live search.

`ASSISTANT_MODEL_MODE=local|cloud` and `ASSISTANT_EMBEDDING_MODE=local|cloud`
are independent — you can mix, e.g. local chat with cloud embeddings.

## Notes on scope

- Vector search is exact/flat (cosine similarity over an in-memory array),
  not an approximate index (no FAISS or similar) — appropriate for the
  corpus sizes here and keeps this dependency-free and fully offline. If the
  corpus grows large enough that flat search becomes a bottleneck, swap the
  implementation inside `docsKb/vectorStore.js`'s `search()` without changing
  any caller.
- Nothing here requires Docker or admin rights; the only external dependency
  is Ollama itself running locally (`ollama serve`).
