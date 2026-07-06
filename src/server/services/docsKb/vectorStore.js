import { readFile, writeFile } from "node:fs/promises";

const CACHE_VERSION = 2;
const MIN_SIMILARITY = 0.2;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

// `embeddingClient`/`embeddingModel` let the caller point this at either the
// cloud OpenAI embeddings endpoint or a local Ollama endpoint (both speak the
// same `embeddings.create` shape via the OpenAI SDK). The model name is folded
// into the cache key so switching providers/models invalidates stale vectors
// instead of silently mixing embedding spaces.
export async function buildStore(chunks, embeddingClient, cacheFile, embeddingModel = DEFAULT_EMBEDDING_MODEL) {
  const filesHash = computeFilesHash(chunks, embeddingModel);
  const cached = await loadCache(cacheFile);

  if (cached?.filesHash === filesHash) {
    const embMap = new Map(cached.entries.map((e) => [e.id, e.embedding]));
    return chunks
      .map((chunk) => ({ ...chunk, embedding: embMap.get(chunk.id) }))
      .filter((c) => c.embedding);
  }

  const texts = chunks.map((c) => `${c.heading}\n\n${c.text}`);
  const embeddings = await embedBatch(embeddingClient, texts, embeddingModel);
  const store = chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] }));

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

async function embedBatch(client, texts, model = DEFAULT_EMBEDDING_MODEL) {
  const BATCH = 100;
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const response = await client.embeddings.create({
      model,
      input: texts.slice(i, i + BATCH),
    });
    results.push(...response.data.map((item) => item.embedding));
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
