import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadDocChunks } from "./loader.js";
import { buildStore, search } from "./vectorStore.js";
import { createEmbeddingProvider } from "../ai/embeddingProvider.js";

const DOCS_DIR = fileURLToPath(new URL("../../../../docs/", import.meta.url));
const LOCAL_STATE_DIR = fileURLToPath(new URL("../../../../.local-state/", import.meta.url));
// The legacy cache path is a git-TRACKED file committed with vectors from this
// exact cloud model. Any other embedding model must cache elsewhere, or every
// mode switch silently overwrites the committed cache and re-embeds all docs
// on each fresh server start.
const COMMITTED_CACHE_MODEL = "text-embedding-3-small";
const TOP_K = 5;

export function createDocsKbService(config) {
  const embeddingProvider = createEmbeddingProvider(config);

  if (!embeddingProvider.enabled) {
    return {
      describe: () => ({ enabled: false, reason: "Embeddings are not configured (see ASSISTANT_EMBEDDING_MODE)." }),
      search: async () => [],
      reload: async () => {},
    };
  }

  const cacheFile =
    embeddingProvider.mode === "cloud" && embeddingProvider.model === COMMITTED_CACHE_MODEL
      ? join(DOCS_DIR, ".embeddings-cache.json")
      : join(LOCAL_STATE_DIR, `docs-embeddings-cache.${slugifyModel(embeddingProvider.model)}.json`);
  let store = null;

  async function ensureStore() {
    if (store !== null) return;
    try {
      const chunks = await loadDocChunks(DOCS_DIR);
      if (chunks.length === 0) {
        store = [];
        return;
      }
      store = await buildStore(chunks, embeddingProvider.client, cacheFile, embeddingProvider.model);
      const docCount = new Set(store.map((c) => c.docPath)).size;
      console.log(`[docsKb] Indexed ${store.length} chunks from ${docCount} doc(s).`);
    } catch (error) {
      console.error("[docsKb] Store build failed:", error.message);
      store = [];
    }
  }

  async function searchDocs(query) {
    await ensureStore();
    if (!store?.length) return [];
    try {
      const resp = await embeddingProvider.client.embeddings.create({
        model: embeddingProvider.model,
        input: [query],
      });
      return search(store, resp.data[0].embedding, TOP_K);
    } catch (error) {
      console.error("[docsKb] Search failed:", error.message);
      return [];
    }
  }

  return {
    describe() {
      return {
        enabled: true,
        docsDir: DOCS_DIR,
        docCount: store ? new Set(store.map((c) => c.docPath)).size : null,
        chunkCount: store?.length ?? null,
        embeddingMode: embeddingProvider.mode,
        embeddingModel: embeddingProvider.model,
      };
    },
    search: searchDocs,
    async reload() {
      store = null;
      await ensureStore();
    },
  };
}

function slugifyModel(model) {
  return String(model || "unknown").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}
