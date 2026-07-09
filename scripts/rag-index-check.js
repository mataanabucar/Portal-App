/**
 * Builds/loads the real docsKb index (whatever DOCS_KB_PATH / docs/ contains)
 * and reports chunk count, doc count, and embedding vector dimensions.
 *
 * This actually calls the configured embedding model for any new/changed
 * chunks (respecting docsKb's existing cache — a repeat run with no doc
 * changes is fast and re-embeds nothing).
 *
 * Usage: npm run rag:index-check
 */

import "../src/loadEnv.js";
import { buildConfig } from "../src/server/config/env.js";
import { createDocsKbService } from "../src/server/services/docsKb/index.js";
import { createEmbeddingProvider } from "../src/server/services/ai/embeddingProvider.js";

async function main() {
  const config = buildConfig();

  const embeddingProvider = createEmbeddingProvider(config);
  const embeddingStatus = await embeddingProvider.describe();
  console.log("Embedding provider:", JSON.stringify(embeddingStatus, null, 2));

  if (!embeddingProvider.enabled) {
    console.error("Embeddings are not enabled — check ASSISTANT_EMBEDDING_MODE / LOCAL_EMBEDDING_* / CLOUD_EMBEDDING_*.");
    process.exitCode = 1;
    return;
  }

  const docsKbService = createDocsKbService(config);
  const initialStatus = docsKbService.describe();
  if (!initialStatus.enabled) {
    console.error("docsKb is disabled:", initialStatus.reason);
    process.exitCode = 1;
    return;
  }

  console.log(`\nIndexing from: ${initialStatus.docsDir}`);
  console.log("(First run / cache miss embeds every chunk — watch for \"[docsKb] Embedded batch...\" lines below. No output for a long stretch with a local model usually means Ollama is still loading the model, not that this is stuck.)");
  const startedAt = Date.now();
  await docsKbService.reload();
  const elapsedMs = Date.now() - startedAt;

  const status = docsKbService.describe();
  console.log(`Doc count: ${status.docCount}`);
  console.log(`Chunk count: ${status.chunkCount}`);
  console.log(`Elapsed: ${elapsedMs}ms`);

  if (!status.chunkCount) {
    console.error("No chunks were indexed. Check DOCS_KB_PATH or the docs/ folder contents (.md/.csv/.txt only).");
    process.exitCode = 1;
    return;
  }

  try {
    const probe = await embeddingProvider.client.embeddings.create({
      model: embeddingProvider.model,
      input: ["dimension probe"],
    });
    const dims = probe.data?.[0]?.embedding?.length ?? 0;
    console.log(`Embedding model "${embeddingProvider.model}" produces ${dims}-dimension vectors.`);
    if (!dims) {
      console.error("Embedding probe returned no vector.");
      process.exitCode = 1;
      return;
    }
  } catch (error) {
    console.error("Embedding probe failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: rag:index-check");
}

main().catch((error) => {
  console.error("rag:index-check crashed:", error);
  process.exitCode = 1;
});
