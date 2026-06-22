import {
  GraphTesterRequestError,
  type CatalogResponse,
  type GraphTesterErrorPayload,
  type HealthResponse,
  type RunResponse,
  type RunSuccess,
  type SessionResponse,
} from "@/types";

// Thin wrapper over the existing Express endpoints. No Graph logic lives here —
// every call hits the local server, which owns auth, tokens, and validation.
// In dev these paths are proxied to the Express origin (see vite.config.ts);
// in production the client is served from the same origin as the API.

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : {};

  if (!response.ok) {
    throw new GraphTesterRequestError(toErrorPayload(payload, response.status, text));
  }

  return payload as T;
}

function safeParseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function toErrorPayload(
  payload: Record<string, unknown>,
  status: number,
  fallbackText: string,
): GraphTesterErrorPayload {
  const serverError = (payload?.error ?? null) as Partial<GraphTesterErrorPayload> | string | null;

  if (serverError && typeof serverError === "object") {
    return {
      status: serverError.status ?? status,
      code: serverError.code ?? "RequestFailed",
      message: serverError.message ?? `Request failed with ${status}`,
      requestId: serverError.requestId ?? null,
      hint: serverError.hint ?? "Review the request and retry.",
    };
  }

  const message =
    (typeof serverError === "string" && serverError) ||
    (typeof payload?.message === "string" && payload.message) ||
    fallbackText ||
    `Request failed with ${status}`;

  return {
    status,
    code: "RequestFailed",
    message,
    requestId: null,
    hint: "Review the request and retry.",
  };
}

export const graphTesterApi = {
  getHealth(): Promise<HealthResponse> {
    return requestJson<HealthResponse>("/api/health");
  },

  getCatalog(): Promise<CatalogResponse> {
    return requestJson<CatalogResponse>("/api/graph-tester/catalog");
  },

  getSession(): Promise<SessionResponse> {
    return requestJson<SessionResponse>("/api/graph-tester/session");
  },

  logout(): Promise<{ ok: boolean; loggedOutAt: string }> {
    return requestJson("/api/graph-tester/logout", { method: "POST" });
  },

  run(body: {
    service: string;
    functionName: string;
    args: Record<string, unknown>;
    confirmMutation: boolean;
  }): Promise<RunSuccess> {
    // The run endpoint returns 200 with { ok: true, ... } on success and a
    // non-2xx with { ok: false, error } on failure — requestJson maps the
    // latter to GraphTesterRequestError, so callers only see the success shape.
    return requestJson<RunResponse>("/api/graph-tester/run", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((payload) => {
      if (!payload.ok) {
        throw new GraphTesterRequestError(payload.error);
      }
      return payload;
    });
  },

  // Full-page navigation to the server-driven OAuth flow. Tokens never touch
  // the client; the server persists them and /api/graph-tester/session reports
  // status afterward.
  beginLogin(): void {
    window.location.assign("/auth/login");
  },
};
