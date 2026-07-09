// Thin wrapper around Ollama's *native* REST API (as opposed to the
// OpenAI-compatible shim at {baseUrl}/v1 that modelProvider.js and
// embeddingProvider.js use for the live chat/embedding call path).
//
// This module exists purely for health-checking and ad-hoc verification:
// "is Ollama actually running, and are the models we've configured actually
// pulled?" The OpenAI-compat /v1/models endpoint answers a similar question,
// but native /api/tags is what `ollama list` itself uses and is the more
// direct source of truth. Nothing in the live assistant/embedding path
// depends on this file — it's safe to ignore or remove without affecting
// chat or RAG search.
//
// Native API reference (unauthenticated, localhost-only by default):
//   GET  /api/tags                  -> { models: [{ name, size, digest, ... }] }
//   POST /api/embed { model, input } -> { embeddings: [[...]] }

const REQUEST_TIMEOUT_MS = 5000;

// LOCAL_LLM_BASE_URL / LOCAL_EMBEDDING_BASE_URL are configured as the
// OpenAI-compat root (".../v1"). Strip that suffix to get Ollama's native
// root. If some other shape is configured, fall back to it unchanged.
export function toNativeOllamaBase(compatBaseUrl) {
  const trimmed = String(compatBaseUrl || "").replace(/\/+$/, "");
  return trimmed.replace(/\/v1$/i, "") || "http://localhost:11434";
}

export async function listInstalledModels(nativeBaseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${nativeBaseUrl.replace(/\/+$/, "")}/api/tags`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, models: [], error: `GET /api/tags failed with ${response.status}` };
    }
    const body = await response.json().catch(() => null);
    const models = Array.isArray(body?.models) ? body.models.map((m) => m.name) : [];
    return { ok: true, models, error: null };
  } catch (error) {
    return {
      ok: false,
      models: [],
      error: error?.name === "AbortError" ? "Timed out reaching Ollama." : error?.message || "Request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Ollama's tags list carries explicit tags (e.g. "llama3.2:3b") but a
// configured model name may omit the tag and rely on the implicit ":latest".
export function isModelInstalled(modelName, installedModels) {
  const name = String(modelName || "").trim();
  if (!name) return false;
  const withLatest = name.includes(":") ? name : `${name}:latest`;
  return installedModels.some((id) => id === name || id === withLatest);
}

// Native embedding call, independent of the OpenAI-compat path used at
// runtime. Useful for verification scripts that want to sanity-check raw
// Ollama output without going through the openai SDK's request/response
// mapping. `input` may be a single string or an array of strings.
export async function nativeEmbed(nativeBaseUrl, model, input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${nativeBaseUrl.replace(/\/+$/, "")}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input }),
      signal: controller.signal,
    });
    const rawText = await response.text();
    if (!response.ok) {
      throw new Error(`POST /api/embed failed with ${response.status}: ${rawText.slice(0, 200)}`);
    }
    const body = JSON.parse(rawText);
    const embeddings = Array.isArray(body?.embeddings) ? body.embeddings : [];
    return { embeddings, model: body?.model || model };
  } finally {
    clearTimeout(timeout);
  }
}

// Combined check used by rag:health — reachability + whether the specific
// chat and embedding models the app is configured to use are pulled.
export async function checkOllamaSetup({ chatModel, embeddingModel, nativeBaseUrl }) {
  const { ok, models, error } = await listInstalledModels(nativeBaseUrl);
  return {
    reachable: ok,
    baseUrl: nativeBaseUrl,
    installedModels: models,
    error,
    chatModel: chatModel
      ? { name: chatModel, installed: ok ? isModelInstalled(chatModel, models) : false }
      : null,
    embeddingModel: embeddingModel
      ? { name: embeddingModel, installed: ok ? isModelInstalled(embeddingModel, models) : false }
      : null,
  };
}
