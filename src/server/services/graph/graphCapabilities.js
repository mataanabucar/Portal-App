/**
 * Graph capability module.
 *
 * Maps delegated token scopes to enabled catalog functions so the app only
 * requests, displays, and runs Graph functions the signed-in token actually
 * supports. Works purely on claims/scope strings — no network calls and no
 * token material is ever returned, only claim metadata.
 *
 * The portal app identity comes from the app-registration manifest
 * (GRAPH_CLIENT_ID). Tokens minted for other clients (Graph Explorer,
 * One Outlook Web, ...) are diagnostics-only and must never gate features.
 */

/**
 * Default requested scopes for the portal app.
 *
 * `https://graph.microsoft.com/.default` requests EVERY delegated Graph
 * permission the tenant has approved for this app registration — the token's
 * scp claim then carries the full approved set (mail incl. shared, calendar,
 * contacts, tasks, notes, chat, channel posts, ...), and newly approved
 * permissions flow in automatically without editing this list.
 *
 * Do NOT enumerate individual Graph scopes here: this tenant approves scopes
 * per app, and requesting even one unapproved scope (Files.*, Directory.*,
 * ...) makes token refresh fail with AADSTS65001. Function availability is
 * gated by the token's actual scp claim, never by this request list.
 */
export const DEFAULT_GRAPH_SCOPES =
  "openid profile email offline_access https://graph.microsoft.com/.default";

// OIDC scopes are not Graph permissions; they never gate functions.
const OIDC_SCOPES = new Set(["openid", "profile", "email", "offline_access"]);

// Internal/first-party Microsoft scopes that must be ignored (or reported
// separately) — they show up in Graph Explorer / Outlook Web tokens.
const IGNORED_SCOPE_MATCHERS = [
  (scope) => scope.includes("-Internal"),
  (scope) => scope.endsWith(".Sdp"),
  (scope) => scope.startsWith("OWA."),
  (scope) => scope.startsWith("OutlookService."),
  (scope) => scope.startsWith("OutlookCopilot"),
  (scope) => scope.startsWith("EAS."),
  (scope) => scope.startsWith("DWEngine"),
  (scope) => scope.startsWith("Collab-Internal"),
  (scope) => scope.startsWith("ConnectedAccount-Internal"),
  (scope) => scope.startsWith("Premium-Internal"),
  (scope) => scope === "Privilege.OpenAsSystem",
  (scope) => scope.startsWith("SubstrateSearch-Internal"),
  (scope) => scope.startsWith("TailoredExperiences-Internal"),
  (scope) => scope.startsWith("Signals-Internal"),
  // No verified public Graph endpoint is implemented for ShortNotes.
  (scope) => scope.startsWith("ShortNotes."),
];

// ReadWrite delegated scopes imply their read-only counterparts.
const IMPLIED_SCOPES = {
  "Mail.ReadWrite": ["Mail.Read", "Mail.ReadBasic"],
  "Mail.Read": ["Mail.ReadBasic"],
  "Calendars.ReadWrite": ["Calendars.Read", "Calendars.ReadBasic"],
  "Calendars.Read": ["Calendars.ReadBasic"],
  "Tasks.ReadWrite": ["Tasks.Read"],
  "Contacts.ReadWrite": ["Contacts.Read"],
  "People.ReadWrite": ["People.Read"],
  "User.ReadWrite": ["User.Read"],
  "Chat.ReadWrite": ["Chat.Read", "Chat.ReadBasic"],
  "Chat.Read": ["Chat.ReadBasic"],
  "Mail.ReadWrite.Shared": ["Mail.Read.Shared"],
  "Calendars.ReadWrite.Shared": ["Calendars.Read.Shared"],
  "Notes.ReadWrite": ["Notes.Read"],
  "Notes.ReadWrite.All": ["Notes.Read.All"],
};

// ---------------------------------------------------------------------------
// Token / claims parsing
// ---------------------------------------------------------------------------

/**
 * Parse a decoded-JWT text file with the rough shape
 *   { header JSON }.{ payload JSON }.[Signature]
 * The file is NOT valid JSON, so extract the top-level {...} blocks by brace
 * matching. Returns { header, claims } (either may be null).
 */
export function parseDecodedTokenFile(rawText) {
  if (typeof rawText !== "string" || rawText.trim() === "") {
    return { header: null, claims: null };
  }

  const blocks = extractJsonObjects(rawText, 2);
  const header = blocks[0] ?? null;
  const claims = blocks[1] ?? blocks[0] ?? null;

  // Single-block files are treated as the payload, not the header.
  return blocks.length === 1 ? { header: null, claims } : { header, claims };
}

/**
 * Accepts a raw JWT string, decoded-token file text, a JSON claims string, or
 * an already-parsed claims object. Returns the payload claims or null.
 */
export function getClaimsFromRawJwtOrDecodedFile(input) {
  if (input == null) return null;

  if (typeof input === "object") {
    // Allow either raw claims or the { header, claims } wrapper.
    return input.claims && typeof input.claims === "object" ? input.claims : input;
  }

  if (typeof input !== "string") return null;
  const text = input.trim();
  if (text === "") return null;

  // Raw JWT: three base64url segments, no braces.
  if (!text.includes("{") && text.split(".").length >= 2) {
    return decodeJwtPayload(text);
  }

  // Plain claims JSON.
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    // Fall through to the decoded-file parser.
  }

  return parseDecodedTokenFile(text).claims;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "==".slice((payload.length + 2) % 4 - 2);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

function extractJsonObjects(text, maxBlocks = Infinity) {
  const blocks = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length && blocks.length < maxBlocks; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          blocks.push(JSON.parse(text.slice(start, index + 1)));
        } catch {
          // Skip malformed blocks instead of failing the whole file.
        }
        start = -1;
      }
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Scope extraction / classification
// ---------------------------------------------------------------------------

/**
 * Delegated scopes come only from the `scp` claim of a user token. App-only
 * roles are never treated as delegated scopes.
 * @returns {string[]}
 */
export function getDelegatedScopesFromClaims(claims) {
  if (!claims || typeof claims.scp !== "string") return [];
  return claims.scp.split(/\s+/).filter(Boolean);
}

/** App-only roles from the `roles` claim. @returns {string[]} */
export function getAppRolesFromClaims(claims) {
  if (!claims || !Array.isArray(claims.roles)) return [];
  return claims.roles.filter((role) => typeof role === "string");
}

function isIgnoredScope(scope) {
  return IGNORED_SCOPE_MATCHERS.some((matches) => matches(scope));
}

/**
 * Split scopes into usable delegated Graph scopes vs ignored internal ones.
 * @returns {{ delegated: string[], oidc: string[], ignored: string[] }}
 */
export function classifyScopes(scopes = []) {
  const delegated = [];
  const oidc = [];
  const ignored = [];

  for (const scope of dedupeScopes(scopes)) {
    if (isIgnoredScope(scope)) {
      ignored.push(scope);
    } else if (OIDC_SCOPES.has(scope)) {
      oidc.push(scope);
    } else {
      delegated.push(scope);
    }
  }

  return { delegated, oidc, ignored };
}

/**
 * Clean a requested-scope list: trim, dedupe, and drop internal Microsoft
 * scopes that must never be requested by this app.
 * @returns {string[]}
 */
export function sanitizeGraphScopes(scopes = []) {
  return dedupeScopes(scopes).filter((scope) => !isIgnoredScope(scope));
}

/**
 * Expand ReadWrite-style scopes into the read scopes they imply so entries can
 * be gated on the weakest sufficient permission.
 * @returns {string[]}
 */
export function expandImpliedDelegatedScopes(scopes = []) {
  const expanded = new Set(dedupeScopes(scopes));

  let changed = true;
  while (changed) {
    changed = false;
    for (const scope of [...expanded]) {
      for (const implied of IMPLIED_SCOPES[scope] || []) {
        if (!expanded.has(implied)) {
          expanded.add(implied);
          changed = true;
        }
      }
    }
  }

  return [...expanded];
}

export function hasAnyScope(grantedScopes = [], requiredScopes = []) {
  if (!requiredScopes.length) return true;
  const granted = new Set(expandImpliedDelegatedScopes(grantedScopes));
  return requiredScopes.some((scope) => granted.has(scope));
}

export function hasAllScopes(grantedScopes = [], requiredScopes = []) {
  if (!requiredScopes.length) return true;
  const granted = new Set(expandImpliedDelegatedScopes(grantedScopes));
  return requiredScopes.every((scope) => granted.has(scope));
}

// ---------------------------------------------------------------------------
// Function gating
// ---------------------------------------------------------------------------

/**
 * A catalog entry is enabled when the granted delegated scopes satisfy its
 * requiredScopes ({ any: [...], all: [...] }). Entries without declared scope
 * requirements are disabled — every runnable function must be gated.
 */
export function isFunctionEnabled(entry, grantedScopes = []) {
  if (!entry || entry.hidden) return false;

  const required = entry.requiredScopes;
  if (!required || typeof required !== "object") return false;

  return (
    hasAnyScope(grantedScopes, required.any || []) &&
    hasAllScopes(grantedScopes, required.all || [])
  );
}

/**
 * Scopes that would still be needed before the entry becomes enabled.
 * @returns {string[]}
 */
export function getMissingScopes(entry, grantedScopes = []) {
  const required = entry?.requiredScopes;
  if (!required || typeof required !== "object") return [];

  const granted = new Set(expandImpliedDelegatedScopes(grantedScopes));
  const missing = [];

  const anyScopes = required.any || [];
  if (anyScopes.length && !anyScopes.some((scope) => granted.has(scope))) {
    missing.push(...anyScopes);
  }
  for (const scope of required.all || []) {
    if (!granted.has(scope)) missing.push(scope);
  }

  return [...new Set(missing)];
}

// ---------------------------------------------------------------------------
// Capability report
// ---------------------------------------------------------------------------

/**
 * Build a full capability report for diagnostics.
 *
 * @param {object} input
 * @param {object|null} input.manifest             App-registration manifest JSON.
 * @param {object|null} input.decodedTokenClaims   Claims from filesforcontext/decodedToken.json (diagnostics only).
 * @param {object|null} input.currentTokenClaims   Claims from the runtime token produced by this app's login flow.
 * @param {Array}       input.catalog              Flat catalog entries with requiredScopes metadata.
 */
export function buildCapabilityReport({
  manifest = null,
  decodedTokenClaims = null,
  currentTokenClaims = null,
  catalog = [],
} = {}) {
  const manifestAppId = manifest?.appId || null;
  const manifestDisplayName = manifest?.displayName || null;

  // Prefer the runtime token; the decoded context token is diagnostics only.
  const activeClaims = currentTokenClaims || decodedTokenClaims || null;
  const activeTokenSource = currentTokenClaims
    ? "runtime"
    : decodedTokenClaims
      ? "decodedTokenFile"
      : "none";

  const tokenSummary = summarizeTokenClaims(activeClaims);
  const decodedTokenSummary = summarizeTokenClaims(decodedTokenClaims);
  const scopeClasses = classifyScopes(getDelegatedScopesFromClaims(activeClaims));
  const grantedDelegatedScopes = scopeClasses.delegated;
  const expandedDelegatedScopes = expandImpliedDelegatedScopes(grantedDelegatedScopes);
  const grantedRoles = getAppRolesFromClaims(activeClaims);

  const enabledFunctions = [];
  const disabledFunctions = [];

  for (const entry of catalog) {
    const item = {
      service: entry.service,
      functionName: entry.functionName,
      mutation: Boolean(entry.mutation),
      requiredScopes: entry.requiredScopes || null,
    };

    if (entry.hidden) {
      disabledFunctions.push({ ...item, hidden: true, missingScopes: [] });
    } else if (isFunctionEnabled(entry, grantedDelegatedScopes)) {
      enabledFunctions.push(item);
    } else {
      disabledFunctions.push({
        ...item,
        missingScopes: getMissingScopes(entry, grantedDelegatedScopes),
      });
    }
  }

  const identityMatch =
    Boolean(manifestAppId) &&
    Boolean(tokenSummary.appId) &&
    tokenSummary.appId === manifestAppId;

  const warnings = [];
  if (tokenSummary.appId && manifestAppId && !identityMatch) {
    warnings.push(
      `Token appid/azp (${tokenSummary.appId}, "${tokenSummary.appDisplayName || "unknown"}") ` +
        `does not match the manifest appId (${manifestAppId}, "${manifestDisplayName || "unknown"}"). ` +
        "This token was NOT issued to the portal app; use it for diagnostics only."
    );
  }
  if (activeTokenSource === "decodedTokenFile") {
    warnings.push(
      "No runtime token was available — capabilities were computed from the decoded context token, " +
        "which does not prove the portal app's runtime access."
    );
  }
  if (grantedRoles.length) {
    warnings.push(
      "App-only roles are present on the token but are never treated as delegated scopes."
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    manifest: { appId: manifestAppId, displayName: manifestDisplayName },
    tokenSource: activeTokenSource,
    token: tokenSummary,
    decodedContextToken: decodedTokenSummary,
    identityMatch,
    grantedDelegatedScopes,
    expandedDelegatedScopes,
    oidcScopes: scopeClasses.oidc,
    ignoredScopes: scopeClasses.ignored,
    grantedRoles,
    enabledFunctions,
    disabledFunctions,
    counts: {
      enabled: enabledFunctions.length,
      disabled: disabledFunctions.length,
    },
    warnings,
  };
}

/** Claim metadata only — never echoes token material. */
export function summarizeTokenClaims(claims) {
  if (!claims || typeof claims !== "object") {
    return {
      present: false,
      tokenType: null,
      appId: null,
      appDisplayName: null,
      aud: null,
      tid: null,
      upn: null,
      name: null,
      exp: null,
      expiresAt: null,
    };
  }

  return {
    present: true,
    tokenType: typeof claims.scp === "string" ? "delegated" : "application",
    appId: claims.appid || claims.azp || null,
    appDisplayName: claims.app_displayname || null,
    aud: claims.aud || null,
    tid: claims.tid || null,
    upn: claims.upn || claims.unique_name || claims.preferred_username || null,
    name: claims.name || null,
    exp: claims.exp || null,
    expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
  };
}

function dedupeScopes(scopes) {
  const list = Array.isArray(scopes)
    ? scopes
    : typeof scopes === "string"
      ? scopes.split(/\s+/)
      : [];

  return [...new Set(list.map((scope) => String(scope).trim()).filter(Boolean))];
}
