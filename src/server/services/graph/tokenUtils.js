/**
 * Token inspection helpers.
 *
 * All functions work on raw JWT strings — they do NOT verify signatures.
 * Signature verification happens at the Microsoft login server, not here.
 */

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

/**
 * Decode the payload section of a JWT without verifying the signature.
 * Returns null if the token is malformed.
 */
export function decodeTokenClaims(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "==".slice((payload.length + 2) % 4 - 2);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scope / role inspection
// ---------------------------------------------------------------------------

/**
 * Returns the granted scopes from the `scp` claim (delegated tokens).
 * @returns {string[]}
 */
export function getTokenScopes(token) {
  const claims = decodeTokenClaims(token);
  if (!claims?.scp) return [];
  return claims.scp.split(" ").filter(Boolean);
}

/**
 * Returns the app roles from the `roles` claim (application tokens).
 * @returns {string[]}
 */
export function getTokenRoles(token) {
  const claims = decodeTokenClaims(token);
  if (!Array.isArray(claims?.roles)) return [];
  return claims.roles;
}

/**
 * Check whether a delegated token contains a specific scope.
 */
export function hasScope(token, scope) {
  return getTokenScopes(token).includes(scope);
}

/**
 * Returns true if this looks like a delegated (user) token — has `scp` claim.
 */
export function isDelegatedToken(token) {
  const claims = decodeTokenClaims(token);
  return typeof claims?.scp === "string";
}

/**
 * Returns true if the token is expired based on the `exp` claim.
 * Builds in a 60-second grace window to avoid racing the expiry.
 */
export function isTokenExpired(token, graceSeconds = 60) {
  const claims = decodeTokenClaims(token);
  if (!claims?.exp) return true;
  return Date.now() / 1000 > claims.exp - graceSeconds;
}
