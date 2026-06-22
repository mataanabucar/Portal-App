// Shape mirrors what the Express catalog/session/run endpoints return.
// These are UI-facing types only; the server remains the source of truth.

export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "textarea"
  | "json"
  | "datetime-local";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldSample {
  label: string;
  value: unknown;
}

export interface CatalogField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  rows?: number;
  options?: SelectOption[];
  defaultValue?: unknown;
  parseMode?: string;
  samples?: FieldSample[];
  // Present on $select fields enriched by the server's select metadata.
  pickerOptions?: SelectOption[];
  recommendedValues?: string[];
}

export interface CatalogFunction {
  service: string;
  functionName: string;
  label: string;
  description: string;
  serviceLabel: string;
  serviceDescription: string;
  mutation: boolean;
  warnings: string[];
  fields: CatalogField[];
  defaults: Record<string, unknown>;
  samplePayloads: Record<string, FieldSample[]>;
  outputHint: string;
  requiredFields: string[];
}

export interface CatalogService {
  key: string;
  label: string;
  description: string;
  functions: CatalogFunction[];
}

export interface CatalogResponse {
  ok: boolean;
  services: CatalogService[];
  generatedAt: string;
}

export interface HealthResponse {
  ok: boolean;
  app: string;
  now: string;
  config: {
    host: string;
    port: number;
    origin: string;
    redirectUri: string;
    authConfigured: boolean;
    autoLoginOnStartup: boolean;
    tokenCacheFile: string;
    scopes: string[];
  };
}

export interface SessionClaims {
  oid: string | null;
  tid: string | null;
  name: string | null;
  preferredUsername: string | null;
}

export interface SessionResponse {
  ok: boolean;
  authenticated: boolean;
  authConfigured: boolean;
  redirectUri?: string;
  scopes?: string[];
  loginPath?: string;
  logoutPath?: string;
  autoLoginOnStartup?: boolean;
  tokenCacheFile?: string;
  tokenCachePresent?: boolean;
  authInProgress?: boolean;
  authReason?: string | null;
  lastAuthMethod?: string;
  lastAuthAt?: string | null;
  expired?: boolean;
  hint?: string;
  tokenType?: "delegated" | "application";
  grantedScopes?: string[];
  grantedRoles?: string[];
  expiresAt?: string | null;
  claims?: SessionClaims;
}

export interface RunResultMeta {
  count: number | null;
  timestamp: string;
  durationMs: number;
}

export interface RunSuccess {
  ok: true;
  service: string;
  functionName: string;
  input: Record<string, unknown>;
  data: unknown;
  summary: string;
  meta: RunResultMeta;
}

export interface GraphTesterErrorPayload {
  status: number;
  code: string;
  message: string;
  requestId: string | null;
  hint: string;
}

export interface RunFailure {
  ok: false;
  error: GraphTesterErrorPayload;
}

export type RunResponse = RunSuccess | RunFailure;

// Thrown by the API layer; carries the server's structured error when present.
export class GraphTesterRequestError extends Error {
  status: number;
  code: string;
  payload: GraphTesterErrorPayload;

  constructor(payload: GraphTesterErrorPayload) {
    super(payload.message);
    this.name = "GraphTesterRequestError";
    this.status = payload.status;
    this.code = payload.code;
    this.payload = payload;
  }
}
