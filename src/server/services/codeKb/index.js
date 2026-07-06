import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadCodeChunks } from "./loader.js";
import { buildStore, search } from "../docsKb/vectorStore.js";
import { createEmbeddingProvider } from "../ai/embeddingProvider.js";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const TOP_K = 6;

export function createCodeKbService(config) {
  const embeddingProvider = createEmbeddingProvider(config);

  if (!embeddingProvider.enabled) {
    return {
      describe: () => ({ enabled: false, reason: "Embeddings are not configured (see ASSISTANT_EMBEDDING_MODE)." }),
      search: async () => [],
      reload: async () => {},
    };
  }

  // Deliberately outside docs/ (which is tracked in git) — the code cache is
  // large and must stay local-only.
  const cacheFile = join(REPO_ROOT, ".local-state/code-embeddings-cache.json");
  let store = null;

  async function ensureStore() {
    if (store !== null) return;
    try {
      const chunks = await loadCodeChunks(REPO_ROOT);
      if (chunks.length === 0) {
        store = [];
        return;
      }
      store = await buildStore(chunks, embeddingProvider.client, cacheFile, embeddingProvider.model);
      const fileCount = new Set(store.map((c) => c.docPath)).size;
      console.log(`[codeKb] Indexed ${store.length} chunks from ${fileCount} file(s).`);
    } catch (error) {
      console.error("[codeKb] Store build failed:", error.message);
      store = [];
    }
  }

  async function searchCode(query) {
    await ensureStore();
    if (!store?.length) return [];
    try {
      const resp = await embeddingProvider.client.embeddings.create({
        model: embeddingProvider.model,
        input: [query],
      });
      return search(store, resp.data[0].embedding, TOP_K).map((chunk) => ({
        type: "code",
        title: chunk.docPath,
        path: chunk.docPath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        snippet: chunk.text.slice(0, 600),
      }));
    } catch (error) {
      console.error("[codeKb] Search failed:", error.message);
      return [];
    }
  }

  return {
    describe() {
      return {
        enabled: true,
        repoRoot: REPO_ROOT,
        fileCount: store ? new Set(store.map((c) => c.docPath)).size : null,
        chunkCount: store?.length ?? null,
        embeddingMode: embeddingProvider.mode,
        embeddingModel: embeddingProvider.model,
      };
    },
    search: searchCode,
    async reload() {
      store = null;
      await ensureStore();
    },
  };
}
