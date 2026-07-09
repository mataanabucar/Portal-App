import { readFile, writeFile } from "node:fs/promises";

const CACHE_VERSION = 2;
const MIN_SIMILARITY = 0.2;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

// `embeddingClient`/`embeddingModel` let the caller point this at either the
// cloud OpenAI embeddings endpoint or a local Ollama endpoint (both speak the
// same `embeddings.create` shape via the OpenAI SDK). The model name is folded
// into the cache key so switching providers/models invalidates stale vectors
// instead of silently mixing embedding spaces.
//
// `label` is just a log prefix (e.g. "docsKb", "codeKb", "golden") so
// concurrent callers' progress output is distinguishable — it has no effect
// on caching or behavior.
export async function buildStore(chunks, embeddingClient, cacheFile, embeddingModel = DEFAULT_EMBEDDING_MODEL, { label = "vectorStore" } = {}) {
  const filesHash = computeFilesHash(chunks, embeddingModel);
  const cached = await loadCache(cacheFile);

  if (cached?.filesHash === filesHash) {
    const embMap = new Map(cached.entries.map((e) => [e.id, e.embedding]));
    return chunks
      .map((chunk) => ({ ...chunk, embedding: embMap.get(chunk.id) }))
      .filter((c) => c.embedding);
  }

  // No cache hit — every chunk needs a fresh embedding call. This is silent
  // and can look "stuck" on local Ollama (CPU inference + one-time model
  // load), so log progress per batch rather than waiting on one big call.
  console.log(`[${label}] Cache miss — embedding ${chunks.length} chunk(s) with "${embeddingModel}". First run on a local model can take a while (includes one-time model load).`);
  const startedAt = Date.now();

  const texts = chunks.map((c) => `${c.heading}\n\n${c.text}`);
  const embeddings = await embedBatch(embeddingClient, texts, embeddingModel, label);
  const store = chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] }));

  console.log(`[${label}] Finished embedding ${chunks.length} chunk(s) in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`);

  await saveCache(cacheFile, {
    version: CACHE_VERSION,
    filesHash,
    entries: store.map(({ id, embedding }) => ({ id, embedding })),
  });

  return store;
}

export function search(store, queryEmbedding, topK = 5) {
  return store
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((entry) => entry.score >= MIN_SIMILARITY)
    .map((entry) => entry.chunk);
}

// Small batch size on purpose: this trades a few extra HTTP round trips for
// frequent, visible progress. A single 100-item batch against a CPU-bound
// local Ollama model can take minutes with zero feedback — 10-item batches
// mean at least a log line every few seconds instead of one silent await.
async function embedBatch(client, texts, model = DEFAULT_EMBEDDING_MODEL, label = "vectorStore") {
  const BATCH = 10;
  const results = [];
  const totalBatches = Math.max(1, Math.ceil(texts.length / BATCH));

  for (let i = 0; i < texts.length; i += BATCH) {
    const batchNumber = Math.floor(i / BATCH) + 1;
    const batchStartedAt = Date.now();
    const response = await client.embeddings.create({
      model,
      input: texts.slice(i, i + BATCH),
    });
    results.push(...response.data.map((item) => item.embedding));
    const batchMs = Date.now() - batchStartedAt;
    console.log(`[${label}] Embedded batch ${batchNumber}/${totalBatches} — ${results.length}/${texts.length} chunk(s) done (${batchMs}ms).`);
  }
  return results;
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

function computeFilesHash(chunks, embeddingModel) {
  const pairs = [...new Map(chunks.map((c) => [c.docPath, c.mtime])).entries()]
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({ model: embeddingModel, pairs });
}

async function loadCache(cacheFile) {
  try {
    const data = JSON.parse(await readFile(cacheFile, "utf8"));
    return data?.version === CACHE_VERSION ? data : null;
  } catch {
    return null;
  }
}

async function saveCache(cacheFile, data) {
  try {
    await writeFile(cacheFile, JSON.stringify(data), "utf8");
  } catch (error) {
    console.warn("[docsKb] Cache write failed:", error.message);
  }
}
