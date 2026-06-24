import OpenAI from "openai";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadDocChunks } from "./loader.js";
import { buildStore, search } from "./vectorStore.js";

const DOCS_DIR = fileURLToPath(new URL("../../../../docs/", import.meta.url));
const TOP_K = 5;

export function createDocsKbService(config) {
  const openAiClient = buildOpenAiClient(config);

  if (!openAiClient) {
    return {
      describe: () => ({ enabled: false, reason: "OpenAI API key not configured (needed for embeddings)." }),
      search: async () => [],
      reload: async () => {},
    };
  }

  const cacheFile = join(DOCS_DIR, ".embeddings-cache.json");
  let store = null;

  async function ensureStore() {
    if (store !== null) return;
    try {
      const chunks = await loadDocChunks(DOCS_DIR);
      if (chunks.length === 0) {
        store = [];
        return;
      }
      store = await buildStore(chunks, openAiClient, cacheFile);
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
      const resp = await openAiClient.embeddings.create({
        model: "text-embedding-3-small",
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
      };
    },
    search: searchDocs,
    async reload() {
      store = null;
      await ensureStore();
    },
  };
}

function buildOpenAiClient(config) {
  try {
    if (config.openAiApiKey) {
      return new OpenAI({ apiKey: config.openAiApiKey });
    }
  } catch (error) {
    console.error("[docsKb] OpenAI init failed:", error.message);
  }
  return null;
}
