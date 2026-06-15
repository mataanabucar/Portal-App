import type {
  DashboardCacheRecord,
  DashboardRequest,
  DashboardResponse,
  HealthResponse,
  ItemEmailRequest,
  ItemEmailResult,
  ResearchRequest,
  ResearchResponse,
} from "./types";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: res.statusText }) as { error?: string });
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<HealthResponse>("/api/health"),
  dashboard: (req: DashboardRequest = {}) =>
    post<DashboardResponse>("/api/dashboard", req),
  dashboardCache: () => get<DashboardCacheRecord | null>("/api/dashboard/cache"),
  saveDashboardCache: (payload: DashboardCacheRecord) =>
    post<DashboardCacheRecord>("/api/dashboard/cache", payload),
  itemEmail: (req: ItemEmailRequest) =>
    post<{ ok: true; email: ItemEmailResult | null }>("/api/item/email", req),
  research: (req: ResearchRequest) =>
    post<ResearchResponse>("/api/item/research", req),
};
