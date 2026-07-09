import { fileURLToPath } from "node:url";
import { isAbsolute, join } from "node:path";
import { loadDocChunks } from "./loader.js";
import { buildStore, search } from "./vectorStore.js";
import { createEmbeddingProvider } from "../ai/embeddingProvider.js";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const DEFAULT_DOCS_DIR = join(REPO_ROOT, "docs/");
const LOCAL_STATE_DIR = fileURLToPath(new URL("../../../../.local-state/", import.meta.url));

// DOCS_KB_PATH lets docsKb index a different folder than the repo's docs/
// default — absolute, or relative to the repo root. Empty/unset preserves
// today's behavior exactly.
function resolveDocsDir(config) {
  const override = typeof config?.docsKbPath === "string" ? config.docsKbPath.trim() : "";
  if (!override) return DEFAULT_DOCS_DIR;
  const resolved = isAbsolute(override) ? override : join(REPO_ROOT, override);
  return resolved.endsWith("/") ? resolved : `${resolved}/`;
}
// The legacy cache path is a git-TRACKED file committed with vectors from this
// exact cloud model. Any other embedding model must cache elsewhere, or every
// mode switch silently overwrites the committed cache and re-embeds all docs
// on each fresh server start.
const COMMITTED_CACHE_MODEL = "text-embedding-3-small";
const TOP_K = 5;

export function createDocsKbService(config) {
  const embeddingProvider = createEmbeddingProvider(config);
  const docsDir = resolveDocsDir(config);
  const usingDefaultDocsDir = docsDir === DEFAULT_DOCS_DIR;

  if (!embeddingProvider.enabled) {
    return {
      describe: () => ({ enabled: false, reason: "Embeddings are not configured (see ASSISTANT_EMBEDDING_MODE)." }),
      search: async () => [],
      reload: async () => {},
    };
  }

  // The committed git-tracked cache is specific to the default docs/ folder
  // at the default cloud model — a custom DOCS_KB_PATH always caches locally
  // instead, same as any non-default embedding model.
  const cacheFile =
    usingDefaultDocsDir && embeddingProvider.mode === "cloud" && embeddingProvider.model === COMMITTED_CACHE_MODEL
      ? join(docsDir, ".embeddings-cache.json")
      : join(LOCAL_STATE_DIR, `docs-embeddings-cache.${slugifyModel(embeddingProvider.model)}.json`);
  let store = null;

  async function ensureStore() {
    if (store !== null) return;
    try {
      const chunks = await loadDocChunks(docsDir);
      if (chunks.length === 0) {
        store = [];
        return;
      }
      store = await buildStore(chunks, embeddingProvider.client, cacheFile, embeddingProvider.model, { label: "docsKb" });
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
        docsDir,
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
