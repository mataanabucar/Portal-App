import OpenAI from "openai";

// Embedding mode is independent of the chat model mode (ASSISTANT_MODEL_MODE) so
// any combination works: local chat + cloud embeddings, cloud chat + local
// embeddings, etc. Both local (Ollama) and cloud (OpenAI) embedding calls use
// the same OpenAI SDK `embeddings.create` shape.

const REACHABILITY_TIMEOUT_MS = 3000;

export function createEmbeddingProvider(config) {
  const mode = config.assistantEmbeddingMode === "local" ? "local" : "cloud";

  if (mode === "local") {
    const baseUrl = config.localEmbeddingBaseUrl;
    const model = config.localEmbeddingModel;
    const client = new OpenAI({ apiKey: config.localEmbeddingApiKey || "ollama", baseURL: baseUrl });

    return {
      mode,
      model,
      client,
      enabled: true,
      async describe() {
        const reachable = await checkReachable(baseUrl, model);
        return {
          mode,
          provider: "ollama",
          model,
          baseUrl,
          enabled: true,
          reachable,
          reason: reachable
            ? null
            : `Could not reach Ollama at ${baseUrl}, or the embedding model "${model}" isn't pulled yet. Confirm Ollama is running (ollama serve) and run: ollama pull ${model}.`,
        };
      },
    };
  }

  const apiKey = config.cloudEmbeddingApiKey || config.openAiApiKey || "";
  const model = config.cloudEmbeddingModel;
  const client = apiKey ? new OpenAI({ apiKey }) : null;

  return {
    mode,
    model,
    client,
    enabled: Boolean(client),
    async describe() {
      const enabled = Boolean(client);
      return {
        mode,
        provider: config.cloudEmbeddingProvider || "openai",
        model,
        enabled,
        reachable: null,
        reason: enabled
          ? null
          : "Set CLOUD_EMBEDDING_API_KEY (or OPENAI_API_KEY) to enable cloud embeddings.",
      };
    },
  };
}

async function checkReachable(baseUrl, model) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return false;
    if (!model) return true;
    const body = await response.json().catch(() => null);
    const ids = Array.isArray(body?.data) ? body.data.map((entry) => entry.id) : [];
    return modelIsListed(model, ids);
  } catch {
    return false;
  }
}

// Ollama's /v1/models lists tagged names (e.g. "nomic-embed-text:latest") but
// users configure and call the untagged name ("nomic-embed-text"), which
// inference resolves fine. Match tolerantly on the implicit ":latest" tag so a
// pulled model isn't falsely reported unreachable.
function modelIsListed(model, ids) {
  const withLatest = model.includes(":") ? model : `${model}:latest`;
  return ids.some((id) => id === model || id === withLatest);
}
