/**
 * RAG / local-LLM health check.
 *
 * Checks, independently:
 *   - Chat model provider (Ollama local or cloud) reachability
 *   - Embedding provider reachability
 *   - Native Ollama /api/tags model-availability (when either is in local mode)
 *   - A live embedding round-trip (actually calls the embedding model once)
 *
 * Usage: npm run rag:health
 * Exit code 0 = everything configured is healthy. Exit code 1 = something
 * that's supposed to be enabled isn't working — see the printed reason.
 */

import "../src/loadEnv.js";
import { buildConfig } from "../src/server/config/env.js";
import { createModelProvider } from "../src/server/services/ai/modelProvider.js";
import { createEmbeddingProvider } from "../src/server/services/ai/embeddingProvider.js";
import { toNativeOllamaBase, checkOllamaSetup } from "../src/server/services/ai/ollamaNative.js";

async function main() {
  const config = buildConfig();
  let ok = true;

  console.log("=== Chat model ===");
  const modelProvider = createModelProvider(config);
  const modelStatus = await modelProvider.describe();
  console.log(JSON.stringify(modelStatus, null, 2));
  if (!modelStatus.enabled || modelStatus.reachable === false) ok = false;

  console.log("\n=== Embedding model ===");
  const embeddingProvider = createEmbeddingProvider(config);
  const embeddingStatus = await embeddingProvider.describe();
  console.log(JSON.stringify(embeddingStatus, null, 2));
  if (!embeddingStatus.enabled || embeddingStatus.reachable === false) ok = false;

  const anyLocal = modelStatus.mode === "local" || embeddingStatus.mode === "local";
  if (anyLocal) {
    console.log("\n=== Native Ollama (/api/tags) ===");
    const nativeBaseUrl = toNativeOllamaBase(
      modelStatus.mode === "local" ? config.localLlmBaseUrl : config.localEmbeddingBaseUrl
    );
    const nativeStatus = await checkOllamaSetup({
      chatModel: modelStatus.mode === "local" ? config.localLlmModel : null,
      embeddingModel: embeddingStatus.mode === "local" ? config.localEmbeddingModel : null,
      nativeBaseUrl,
    });
    console.log(JSON.stringify(nativeStatus, null, 2));
    if (!nativeStatus.reachable) {
      console.error(`Could not reach Ollama's native API at ${nativeBaseUrl}. Is "ollama serve" running?`);
      ok = false;
    } else {
      if (nativeStatus.chatModel && !nativeStatus.chatModel.installed) {
        console.error(`Chat model "${nativeStatus.chatModel.name}" is not pulled. Run: ollama pull ${nativeStatus.chatModel.name}`);
        ok = false;
      }
      if (nativeStatus.embeddingModel && !nativeStatus.embeddingModel.installed) {
        console.error(`Embedding model "${nativeStatus.embeddingModel.name}" is not pulled. Run: ollama pull ${nativeStatus.embeddingModel.name}`);
        ok = false;
      }
    }
  }

  if (embeddingStatus.enabled) {
    console.log("\n=== Embedding round-trip ===");
    try {
      const response = await embeddingProvider.client.embeddings.create({
        model: embeddingProvider.model,
        input: ["health check probe"],
      });
      const dims = response.data?.[0]?.embedding?.length ?? 0;
      if (dims > 0) {
        console.log(`OK: embedded a test string into a ${dims}-dimension vector.`);
      } else {
        console.error("Embedding call returned no vector.");
        ok = false;
      }
    } catch (error) {
      console.error("Embedding call failed:", error.message);
      ok = false;
    }
  }

  console.log(`\n${ok ? "PASS" : "FAIL"}: rag:health`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  console.error("rag:health crashed:", error);
  process.exitCode = 1;
});
