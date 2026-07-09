/**
 * Ad-hoc CLI for the grounded retrieval flow against the REAL docs index
 * (DOCS_KB_PATH / docs/), for manual poking outside the assistant chat UI.
 *
 * Usage: npm run rag:ask -- "How does the KB research pipeline work?"
 */

import "../src/loadEnv.js";
import { buildConfig } from "../src/server/config/env.js";
import { createDocsKbService } from "../src/server/services/docsKb/index.js";
import { createEmbeddingProvider } from "../src/server/services/ai/embeddingProvider.js";
import { createModelProvider } from "../src/server/services/ai/modelProvider.js";
import { buildStore } from "../src/server/services/docsKb/vectorStore.js";
import { loadDocChunks } from "../src/server/services/docsKb/loader.js";
import { buildGroundedAnswer } from "../src/server/services/docsKb/groundedAsk.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error('Usage: npm run rag:ask -- "your question"');
    process.exitCode = 1;
    return;
  }

  const config = buildConfig();
  const embeddingProvider = createEmbeddingProvider(config);
  if (!embeddingProvider.enabled) {
    console.error("Embeddings are not enabled. Check ASSISTANT_EMBEDDING_MODE.");
    process.exitCode = 1;
    return;
  }

  const modelProvider = createModelProvider(config);
  const modelStatus = await modelProvider.describe();
  if (!modelStatus.enabled) {
    console.error("Chat model is not enabled:", modelStatus.reason);
    process.exitCode = 1;
    return;
  }

  // Reuse docsKbService only to resolve the configured docs directory the
  // same way the live app does; build the store directly here so we have
  // access to the raw chunk array buildGroundedAnswer needs.
  const docsKbStatus = createDocsKbService(config).describe();
  if (!docsKbStatus.enabled) {
    console.error("docsKb is disabled:", docsKbStatus.reason);
    process.exitCode = 1;
    return;
  }

  const chunks = await loadDocChunks(docsKbStatus.docsDir);
  if (chunks.length === 0) {
    console.error(`No document chunks found under ${docsKbStatus.docsDir}.`);
    process.exitCode = 1;
    return;
  }

  const cacheFile = path.join(REPO_ROOT, ".local-state", `docs-embeddings-cache.${slugify(embeddingProvider.model)}.json`);
  const store = await buildStore(chunks, embeddingProvider.client, cacheFile, embeddingProvider.model, { label: "rag:ask" });

  console.log(`Q: ${query}\n`);
  const result = await buildGroundedAnswer({ query, store, embeddingProvider, modelProvider, topK: 5 });

  console.log(result.answer);
  console.log("\n--- Citations ---");
  if (result.citations.length === 0) {
    console.log("(none)");
  } else {
    for (const citation of result.citations) {
      console.log(`- ${citation.id}  (${citation.docPath}${citation.heading ? ` — ${citation.heading}` : ""})`);
    }
  }
  console.log(`\nAbstained: ${result.abstained}`);
}

function slugify(model) {
  return String(model || "unknown").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

main().catch((error) => {
  console.error("rag:ask failed:", error.message);
  process.exitCode = 1;
});
