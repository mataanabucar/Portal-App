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

export interface RequiredScopes {
  any: string[];
  all: string[];
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
  // Delegated-scope gating computed server-side from the signed-in token.
  requiredScopes?: RequiredScopes;
  enabled?: boolean;
  missingScopes?: string[];
}

export interface CatalogService {
  key: string;
  label: string;
  description: string;
  functions: CatalogFunction[];
}

export interface CatalogResponse {
  ok: boolean;
  authenticated?: boolean;
  includeUnavailable?: boolean;
  hint?: string;
  services: CatalogService[];
  generatedAt: string;
}

export interface CapabilityFunctionRef {
  service: string;
  functionName: string;
  mutation: boolean;
  requiredScopes: RequiredScopes | null;
  missingScopes?: string[];
  hidden?: boolean;
}

export interface CapabilityTokenSummary {
  present: boolean;
  tokenType: "delegated" | "application" | null;
  appId: string | null;
  appDisplayName: string | null;
  aud: string | null;
  tid: string | null;
  upn: string | null;
  name: string | null;
  exp: number | null;
  expiresAt: string | null;
}

export interface CapabilitiesResponse {
  ok: boolean;
  authenticated: boolean;
  tokenType: "delegated" | "application" | null;
  configClientId: string | null;
  requestedScopes: string[];
  generatedAt: string;
  manifest: { appId: string | null; displayName: string | null };
  tokenSource: "runtime" | "decodedTokenFile" | "none";
  token: CapabilityTokenSummary;
  decodedContextToken: CapabilityTokenSummary;
  identityMatch: boolean;
  grantedDelegatedScopes: string[];
  expandedDelegatedScopes: string[];
  oidcScopes: string[];
  ignoredScopes: string[];
  grantedRoles: string[];
  enabledFunctions: CapabilityFunctionRef[];
  disabledFunctions: CapabilityFunctionRef[];
  counts: { enabled: number; disabled: number };
  warnings: string[];
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
  appId?: string | null;
  appDisplayName?: string | null;
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
  configClientId?: string | null;
  identityMatch?: boolean | null;
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
