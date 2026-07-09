/**
 * Golden retrieval + acceptance test suite.
 *
 * Builds an ISOLATED index from rag-tests/golden-corpus/ (never touches the
 * real docs/ index or its cache — uses its own cache file under
 * .local-state/golden-embeddings-cache.<model>.json) and runs every query in
 * rag-tests/golden-queries.json against it.
 *
 * Two layers of checks:
 *   1. Retrieval metrics (embeddings only, no chat model needed): Hit@k,
 *      Recall@k, MRR, nDCG@k over queries that have an expectedChunkId.
 *   2. Acceptance checks (requires the chat model too, via buildGroundedAnswer):
 *      citation presence, distractor resistance, missing-evidence abstention.
 *
 * If the chat model is unreachable, layer 1 still runs and reports; layer 2
 * checks are marked SKIPPED rather than failing the whole run, so this is
 * still useful as a pure retrieval sanity check when Ollama isn't running.
 *
 * Usage: npm run rag:golden-test
 * Exit code 0 = all runnable checks passed. Exit code 1 = a hard failure
 * (retrieval miss on the golden set, or a failed acceptance check).
 */

import "../src/loadEnv.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "../src/server/config/env.js";
import { loadDocChunks } from "../src/server/services/docsKb/loader.js";
import { buildStore, search } from "../src/server/services/docsKb/vectorStore.js";
import { buildGroundedAnswer } from "../src/server/services/docsKb/groundedAsk.js";
import { createEmbeddingProvider } from "../src/server/services/ai/embeddingProvider.js";
import { createModelProvider } from "../src/server/services/ai/modelProvider.js";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const GOLDEN_CORPUS_DIR = path.join(REPO_ROOT, "rag-tests", "golden-corpus/");
const GOLDEN_QUERIES_FILE = path.join(REPO_ROOT, "rag-tests", "golden-queries.json");
const TOP_K = 3;

// ---- Pure metric helpers (exported for unit testing without Ollama) ----

// rank is 1-based position of the expected id in the ranked hit list, or 0
// if not found within the returned hits.
export function rankOf(expectedId, hitIds) {
  const index = hitIds.indexOf(expectedId);
  return index === -1 ? 0 : index + 1;
}

export function hitAtK(rank) {
  return rank > 0 ? 1 : 0;
}

// Golden set has exactly one relevant chunk per query, so recall@k reduces
// to the same 0/1 as hit@k here — kept as a separate named metric for
// clarity/parity with the spec, and so it generalizes if multi-relevant
// queries are added later.
export function recallAtK(rank) {
  return hitAtK(rank);
}

export function reciprocalRank(rank) {
  return rank > 0 ? 1 / rank : 0;
}

// nDCG@k for a single relevant item: ideal DCG (relevant at rank 1) is 1, so
// nDCG reduces to DCG itself.
export function ndcgAtK(rank) {
  return rank > 0 ? 1 / Math.log2(rank + 1) : 0;
}

export function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ---- Test run ----

async function main() {
  const { queries } = JSON.parse(await readFile(GOLDEN_QUERIES_FILE, "utf8"));

  const config = buildConfig();
  const embeddingProvider = createEmbeddingProvider(config);
  const embeddingStatus = await embeddingProvider.describe();
  console.log("Embedding provider:", JSON.stringify(embeddingStatus));

  if (!embeddingProvider.enabled) {
    console.error("FAIL: embeddings are not enabled — cannot run any part of the golden test.");
    process.exitCode = 1;
    return;
  }

  const chunks = await loadDocChunks(GOLDEN_CORPUS_DIR);
  console.log(`Golden corpus: ${chunks.length} chunk(s) from rag-tests/golden-corpus/`);
  if (chunks.length === 0) {
    console.error("FAIL: golden corpus produced zero chunks — check rag-tests/golden-corpus/.");
    process.exitCode = 1;
    return;
  }

  const cacheFile = path.join(
    REPO_ROOT,
    ".local-state",
    `golden-embeddings-cache.${slugify(embeddingProvider.model)}.json`
  );

  let store;
  try {
    store = await buildStore(chunks, embeddingProvider.client, cacheFile, embeddingProvider.model, { label: "golden" });
  } catch (error) {
    console.error("FAIL: could not build the golden index (embedding call failed):", error.message);
    process.exitCode = 1;
    return;
  }

  let hardFailure = false;
  const retrievalRows = [];
  const acceptanceResults = [];
  let modelProvider = null;
  let modelReachable = null;

  for (const q of queries) {
    let hits = [];
    let rank = 0;
    try {
      const embedResp = await embeddingProvider.client.embeddings.create({
        model: embeddingProvider.model,
        input: [q.query],
      });
      hits = search(store, embedResp.data[0].embedding, TOP_K);
      rank = q.expectedChunkId ? rankOf(q.expectedChunkId, hits.map((h) => h.id)) : 0;
    } catch (error) {
      console.error(`Retrieval failed for ${q.id}:`, error.message);
      hardFailure = true;
      continue;
    }

    if (q.expectedChunkId) {
      retrievalRows.push({
        id: q.id,
        type: q.type,
        rank,
        hit: hitAtK(rank),
        recall: recallAtK(rank),
        rr: reciprocalRank(rank),
        ndcg: ndcgAtK(rank),
      });
      if (!hitAtK(rank)) {
        console.error(`FAIL [retrieval] ${q.id}: expected "${q.expectedChunkId}" not found in top-${TOP_K} (got: ${hits.map((h) => h.id).join(", ") || "none"}).`);
        hardFailure = true;
      }
    } else if (q.type === "missing_evidence") {
      // Retrieval-level abstention signal: nothing should clear the vector
      // store's own similarity floor for a question with no matching doc.
      console.log(`[retrieval] ${q.id}: top hits = ${hits.map((h) => h.id).join(", ") || "(none — correct)"}`);
    }

    if (!q.requiresLlm) continue;

    if (modelReachable === null) {
      modelProvider = createModelProvider(config);
      const modelStatus = await modelProvider.describe();
      modelReachable = modelStatus.enabled && modelStatus.reachable !== false;
      if (!modelReachable) {
        console.warn(`\nSKIPPING all requiresLlm acceptance checks — chat model unavailable (${modelStatus.reason || "not reachable"}).`);
      }
    }
    if (!modelReachable) {
      acceptanceResults.push({ id: q.id, status: "SKIPPED" });
      continue;
    }

    try {
      const answer = await buildGroundedAnswer({ query: q.query, store, embeddingProvider, modelProvider, topK: TOP_K });
      const checkResult = evaluateAcceptance(q, answer);
      acceptanceResults.push({ id: q.id, status: checkResult.pass ? "PASS" : "FAIL", detail: checkResult.detail, answer: answer.answer });
      if (!checkResult.pass) {
        hardFailure = true;
        console.error(`FAIL [acceptance] ${q.id}: ${checkResult.detail}`);
      }
    } catch (error) {
      acceptanceResults.push({ id: q.id, status: "FAIL", detail: error.message });
      hardFailure = true;
      console.error(`FAIL [acceptance] ${q.id}: grounded answer call failed: ${error.message}`);
    }
  }

  console.log("\n=== Retrieval metrics (over queries with an expected chunk) ===");
  console.log(`Hit@${TOP_K}:    ${(average(retrievalRows.map((r) => r.hit)) * 100).toFixed(0)}%`);
  console.log(`Recall@${TOP_K}: ${(average(retrievalRows.map((r) => r.recall)) * 100).toFixed(0)}%`);
  console.log(`MRR:        ${average(retrievalRows.map((r) => r.rr)).toFixed(3)}`);
  console.log(`nDCG@${TOP_K}:   ${average(retrievalRows.map((r) => r.ndcg)).toFixed(3)}`);

  console.log("\n=== Acceptance checks ===");
  if (acceptanceResults.length === 0) {
    console.log("(none — no requiresLlm queries ran)");
  }
  for (const r of acceptanceResults) {
    console.log(`${r.status.padEnd(8)} ${r.id}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const citationRate = average(
    acceptanceResults
      .filter((r) => r.status !== "SKIPPED" && typeof r.answer === "string")
      .map((r) => (/\[\d+\]/.test(r.answer) ? 1 : 0))
  );
  console.log(`\nCitation rate (answers containing a [n] marker): ${(citationRate * 100).toFixed(0)}%`);

  console.log(`\n${hardFailure ? "FAIL" : "PASS"}: rag:golden-test`);
  process.exitCode = hardFailure ? 1 : 0;
}

function evaluateAcceptance(q, answer) {
  if (q.mustAbstain) {
    return answer.abstained
      ? { pass: true }
      : { pass: false, detail: `expected abstention, got: "${truncate(answer.answer)}"` };
  }

  if (Array.isArray(q.mustContain)) {
    for (const phrase of q.mustContain) {
      if (!answer.answer.toLowerCase().includes(phrase.toLowerCase())) {
        return { pass: false, detail: `answer missing required phrase "${phrase}": "${truncate(answer.answer)}"` };
      }
    }
  }

  if (Array.isArray(q.mustNotContain)) {
    for (const phrase of q.mustNotContain) {
      if (answer.answer.toLowerCase().includes(phrase.toLowerCase())) {
        return { pass: false, detail: `answer contains forbidden phrase "${phrase}": "${truncate(answer.answer)}"` };
      }
    }
  }

  if (q.mustCiteChunk) {
    const cited = answer.evidenceUsed.includes(q.expectedChunkId) && /\[\d+\]/.test(answer.answer);
    if (!cited) {
      return { pass: false, detail: `answer did not cite a [n] marker backed by "${q.expectedChunkId}": "${truncate(answer.answer)}"` };
    }
  }

  return { pass: true };
}

function truncate(text, max = 160) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function slugify(model) {
  return String(model || "unknown").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((error) => {
    console.error("rag:golden-test crashed:", error);
    process.exitCode = 1;
  });
}
