/**
 * Microsoft Graph auth client.
 *
 * Handles OAuth2 token flows:
 *   - Interactive authorization-code flow (opens browser → local redirect listener)
 *   - Refresh-token flow (silent renewal)
 *   - Client-credentials flow (app-only, no user)
 *
 * Token storage is the caller's responsibility — this module is stateless.
 */

import http from "node:http";
import { URL } from "node:url";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { decodeTokenClaims, getTokenScopes, getTokenRoles } from "./tokenUtils.js";

// ---------------------------------------------------------------------------
// Authorization URL builder
// ---------------------------------------------------------------------------

/**
 * Build the Microsoft authorization URL to redirect the user to.
 *
 * @param {object} opts
 * @param {string}   opts.tenantId
 * @param {string}   opts.clientId
 * @param {string}   opts.redirectUri
 * @param {string[]} opts.scopes
 * @param {string}   [opts.state]   Defaults to a random UUID
 * @returns {{ url: string, state: string }}
 */
export function buildAuthorizationUrl({ tenantId, clientId, redirectUri, scopes, state }) {
  const resolvedState = state ?? crypto.randomUUID();
  const scope = _normalizeScopes(scopes);

  const url =
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(resolvedState)}`;

  return { url, state: resolvedState };
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for tokens (delegated flow).
 *
 * @param {object} opts
 * @param {string}   opts.tenantId
 * @param {string}   opts.clientId
 * @param {string}   opts.clientSecret
 * @param {string}   opts.redirectUri
 * @param {string[]} opts.scopes
 * @param {string}   opts.code      Auth code from the redirect callback
 * @returns {Promise<TokenSet>}
 */
export async function exchangeCodeForToken({ tenantId, clientId, clientSecret, redirectUri, scopes, code }) {
  const scope = _normalizeScopes(scopes);

  return _postToken(tenantId, new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "authorization_code",
    redirect_uri:  redirectUri,
    scope,
    code,
  }));
}

// ---------------------------------------------------------------------------
// Refresh token flow
// ---------------------------------------------------------------------------

/**
 * Use a refresh token to silently obtain a new access token.
 * Requires `offline_access` scope to have been granted originally.
 *
 * @param {object} opts
 * @param {string}   opts.tenantId
 * @param {string}   opts.clientId
 * @param {string}   opts.clientSecret
 * @param {string[]} opts.scopes
 * @param {string}   opts.refreshToken
 * @returns {Promise<TokenSet>}
 */
export async function refreshAccessToken({ tenantId, clientId, clientSecret, scopes, refreshToken }) {
  const scope = _normalizeScopes(scopes);

  return _postToken(tenantId, new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "refresh_token",
    scope,
    refresh_token: refreshToken,
  }));
}

// ---------------------------------------------------------------------------
// Client credentials flow (app-only)
// ---------------------------------------------------------------------------

/**
 * Obtain an app-only token using client credentials.
 * Use this only when you need to act without a signed-in user.
 *
 * NOTE: /me endpoints do NOT work with app-only tokens.
 * Use /users/{userIdOrUpn} instead.
 *
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.clientId
 * @param {string} opts.clientSecret
 * @returns {Promise<TokenSet>}
 */
export async function acquireAppToken({ tenantId, clientId, clientSecret }) {
  return _postToken(tenantId, new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "client_credentials",
    scope:         "https://graph.microsoft.com/.default",
  }));
}

// ---------------------------------------------------------------------------
// Interactive browser flow (wraps buildAuthorizationUrl + exchangeCodeForToken)
// ---------------------------------------------------------------------------

/**
 * Full interactive OAuth2 flow.
 *
 * Opens the system browser for Microsoft login, spins up a one-shot HTTP
 * listener on the redirectUri port, waits for the redirect, then exchanges
 * the code for tokens.
 *
 * @param {object} cfg
 * @param {string}   cfg.tenantId
 * @param {string}   cfg.clientId
 * @param {string}   cfg.clientSecret
 * @param {string}   cfg.redirectUri   Must match the Azure app registration
 * @param {string[]} cfg.scopes
 * @returns {Promise<TokenSet>}
 */
export async function acquireTokenInteractive(cfg) {
  const { tenantId, clientId, clientSecret, redirectUri, scopes } = cfg;
  const { url: authUrl, state } = buildAuthorizationUrl({ tenantId, clientId, redirectUri, scopes });

  const code = await _listenForCode(redirectUri, authUrl, state);
  return exchangeCodeForToken({ tenantId, clientId, clientSecret, redirectUri, scopes, code });
}

// ---------------------------------------------------------------------------
// Token inspection re-exports (convenience)
// ---------------------------------------------------------------------------

export { decodeTokenClaims, getTokenScopes, getTokenRoles };

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a pre-configured auth client bound to a specific app registration.
 *
 * @param {object} cfg  { tenantId, clientId, clientSecret, redirectUri, scopes }
 */
export function createAuthClient(cfg) {
  return {
    buildAuthorizationUrl: (extra) => buildAuthorizationUrl({ ...cfg, ...extra }),
    exchangeCodeForToken:  (code)  => exchangeCodeForToken({ ...cfg, code }),
    refreshAccessToken:    (refreshToken) => refreshAccessToken({ ...cfg, refreshToken }),
    acquireAppToken:       ()      => acquireAppToken(cfg),
    acquireTokenInteractive: ()    => acquireTokenInteractive(cfg),
    decodeTokenClaims,
    getTokenScopes,
    getTokenRoles,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function _postToken(tenantId, body) {
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const json = await response.json();

  if (!response.ok) {
    const msg = json?.error_description ?? json?.error ?? "Token request failed";
    const err = new Error(msg);
    err.name = "GraphAuthError";
    err.status = response.status;
    err.details = json;
    throw err;
  }

  return {
    accessToken:  json.access_token,
    refreshToken: json.refresh_token ?? null,
    idToken:      json.id_token ?? null,
    expiresIn:    json.expires_in,
    expiresAt:    Date.now() + json.expires_in * 1000,
    scope:        json.scope,
  };
}

/**
 * Spin up a one-shot HTTP listener, open the browser at authUrl, and wait
 * for the OAuth redirect to deliver a code.
 */
function _listenForCode(redirectUri, authUrl, expectedState) {
  const { port, pathname } = new URL(redirectUri);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const incoming = new URL(req.url, redirectUri);
      if (incoming.pathname !== pathname) { res.end(); return; }

      const code    = incoming.searchParams.get("code");
      const state   = incoming.searchParams.get("state");
      const errDesc = incoming.searchParams.get("error_description");

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Authentication complete — you can close this tab.");
      server.close();

      if (errDesc)            return reject(new Error(`Auth error: ${errDesc}`));
      if (state !== expectedState) return reject(new Error("State mismatch — possible CSRF"));
      if (!code)              return reject(new Error("No authorization code in redirect"));
      resolve(code);
    });

    server.listen(Number(port), () => {
      console.log(`[graph] Waiting for OAuth redirect on port ${port}...`);
      const cmd =
        process.platform === "win32"  ? `start "" "${authUrl}"` :
        process.platform === "darwin" ? `open "${authUrl}"` :
                                        `xdg-open "${authUrl}"`;
      exec(cmd);
    });

    server.on("error", reject);
  });
}

function _normalizeScopes(scopes) {
  const base = ["openid", "offline_access"];
  const merged = [...new Set([...base, ...scopes])];
  return merged.join(" ");
}

/**
 * @typedef {object} TokenSet
 * @property {string}      accessToken
 * @property {string|null} refreshToken
 * @property {string|null} idToken
 * @property {number}      expiresIn   Seconds until expiry
 * @property {number}      expiresAt   Absolute expiry as Date.now() timestamp
 * @property {string}      scope       Space-separated granted scopes
 */
