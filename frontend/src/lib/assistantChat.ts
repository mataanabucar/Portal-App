// Client for the text assistant (local/cloud-switchable, tool-calling) backend
// added in src/server/services/assistant/. Separate from realtimeAssistant.ts,
// which drives the voice-only OpenAI Realtime dock — that path is cloud-only,
// this one works with either a local Ollama model or a cloud model.

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantSource {
  type: "app_doc" | "code" | "kb" | "gstudio" | "graph" | "teamgpt" | "research";
  title: string;
  path: string;
  heading?: string;
  startLine?: number;
  endLine?: number;
  snippet: string;
}

// Structured response blocks emitted by the deterministic orchestrator
// (src/server/services/orchestrator/responseBlocks.js). Rendered by
// components/assistant/ResponseBlocks.tsx.
export interface TextBlock {
  type: "text";
  text: string;
}

export interface SummaryBlock {
  type: "summary";
  title: string;
  text: string;
}

export interface TableBlockData {
  type: "table";
  title?: string;
  columns: string[];
  rows: string[][];
}

export interface ActionItemData {
  title: string;
  owner?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  sourceText?: string;
}

export interface ActionsBlock {
  type: "actions";
  items: ActionItemData[];
}

export interface SourcesBlock {
  type: "sources";
  sources: AssistantSource[];
}

export interface ImageBlock {
  type: "image";
  url: string;
  alt?: string;
}

export interface ChartBlock {
  type: "chart";
  title: string;
  table?: TableBlockData;
}

export type ResponseBlock =
  | TextBlock
  | SummaryBlock
  | TableBlockData
  | ActionsBlock
  | SourcesBlock
  | ImageBlock
  | ChartBlock;

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
  answer?: string;
  blocks?: ResponseBlock[];
  sources: AssistantSource[];
  proposedActions: AssistantProposedAction[];
  toolTrace: AssistantToolTraceEntry[];
  provider?: string;
  route?: string;
  model: string;
  modelMode: "local" | "cloud" | "orchestrator";
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
  mode: "local" | "cloud" | "orchestrator";
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
