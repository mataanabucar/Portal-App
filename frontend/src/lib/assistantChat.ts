// Client for the text assistant (local/cloud-switchable, tool-calling) backend
// added in src/server/services/assistant/. Separate from realtimeAssistant.ts,
// which drives the voice-only OpenAI Realtime dock — that path is cloud-only,
// this one works with either a local Ollama model or a cloud model.

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantSource {
  type: "app_doc" | "code";
  title: string;
  path: string;
  heading?: string;
  startLine?: number;
  endLine?: number;
  snippet: string;
}

export interface AssistantProposedAction {
  id: string;
  service: string;
  functionName: string;
  label: string;
  summary: string;
  status: "pending" | "confirmed" | "canceled" | "failed" | "expired";
}

export interface AssistantToolTraceEntry {
  tool: string;
  args: Record<string, unknown>;
  resultSummary: string;
}

export interface AssistantChatResponse {
  ok: boolean;
  content: string;
  sources: AssistantSource[];
  proposedActions: AssistantProposedAction[];
  toolTrace: AssistantToolTraceEntry[];
  model: string;
  modelMode: "local" | "cloud";
  error?: string;
}

export interface AssistantCapability {
  capability: string;
  service: string;
  enabled: boolean;
  missingScopes: string[];
  reason: string | null;
}

export interface AssistantCapabilitiesResponse {
  ok: boolean;
  capabilities: AssistantCapability[];
  error?: string;
}

export interface AssistantProviderStatus {
  mode: "local" | "cloud";
  provider: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
  reachable: boolean | null;
  reason: string | null;
}

export interface AssistantEmbeddingStatus {
  enabled: boolean;
  mode: string | null;
  model: string | null;
}

export interface AssistantModelStatusResponse {
  ok: boolean;
  chat: AssistantProviderStatus;
  embeddings: { docs: AssistantEmbeddingStatus; code: AssistantEmbeddingStatus };
  error?: string;
}

export interface AssistantActionResult {
  ok: boolean;
  result?: unknown;
  action?: AssistantProposedAction;
  error?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  return data;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  return data;
}

export const assistantChat = {
  sendMessage: (messages: AssistantChatMessage[]) =>
    post<AssistantChatResponse>("/api/assistant/chat", { messages }),
  confirmAction: (id: string) =>
    post<AssistantActionResult>(`/api/assistant/actions/${encodeURIComponent(id)}/confirm`, {}),
  cancelAction: (id: string) =>
    post<AssistantActionResult>(`/api/assistant/actions/${encodeURIComponent(id)}/cancel`, {}),
  getCapabilities: () => get<AssistantCapabilitiesResponse>("/api/assistant/capabilities"),
  getModelStatus: () => get<AssistantModelStatusResponse>("/api/assistant/model-status"),
};
