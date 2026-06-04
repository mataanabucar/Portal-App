import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createAuthClient,
  decodeTokenClaims,
  getTokenRoles,
  getTokenScopes,
  isDelegatedToken,
  isTokenExpired,
  refreshAccessToken,
} from "../../server/services/graph/index.js";

export function hasGraphTesterAuthConfig(config) {
  return Boolean(
    config.graphTenantId &&
      config.graphClientId &&
      config.graphClientSecret &&
      config.graphRedirectUri
  );
}

export function createGraphTesterAuthStore(config) {
  const authClient = createAuthClient({
    tenantId: config.graphTenantId,
    clientId: config.graphClientId,
    clientSecret: config.graphClientSecret,
    redirectUri: config.graphRedirectUri,
    scopes: config.graphScopes,
  });

  let tokenSet = null;
  let tokenCacheLoaded = false;
  let tokenCachePresent = false;
  let lastAuthMethod = "none";
  let lastAuthAt = null;
  let lastError = "";
  let pendingAuth = null;

  return {
    bootstrap,
    buildStatusPayload,
    beginAuthorizationRequest,
    completeAuthorizationRequest,
    clearStoredAuth,
    getAccessToken,
  };

  async function bootstrap() {
    if (!hasGraphTesterAuthConfig(config)) {
      lastError =
        "Graph auth is not configured. Set the tenant, client, secret, and redirect URI values.";
      return null;
    }

    await hydrateTokenSetFromDisk();

    if (tokenSet?.accessToken && !isTokenExpired(tokenSet.accessToken)) {
      lastAuthMethod = "cache";
      lastAuthAt = new Date().toISOString();
      return tokenSet;
    }

    if (tokenSet?.refreshToken) {
      try {
        return await refreshStoredToken("refresh");
      } catch (error) {
        lastError = error.message;
      }
    }

    if (config.autoLoginOnStartup) {
      void startInteractiveAuth("startup").catch((error) => {
        lastError = error.message;
      });
    }

    return null;
  }

  async function buildStatusPayload() {
    await hydrateTokenSetFromDisk();

    if (tokenSet?.accessToken && isTokenExpired(tokenSet.accessToken) && tokenSet.refreshToken) {
      try {
        await refreshStoredToken("refresh");
      } catch (error) {
        lastError = error.message;
      }
    }

    if (!tokenSet?.accessToken || isTokenExpired(tokenSet.accessToken, 0)) {
      return {
        ok: true,
        authenticated: false,
        authConfigured: hasGraphTesterAuthConfig(config),
        redirectUri: config.graphRedirectUri,
        scopes: config.graphScopes,
        loginPath: "/auth/login",
        logoutPath: "/api/graph-tester/logout",
        autoLoginOnStartup: config.autoLoginOnStartup,
        tokenCacheFile: config.tokenCacheFile,
        tokenCachePresent,
        authInProgress: Boolean(pendingAuth),
        authReason: pendingAuth?.reason || null,
        lastAuthMethod,
        lastAuthAt,
        expired: Boolean(tokenSet?.accessToken),
        hint: pendingAuth
          ? "Browser login is in progress. Complete the Microsoft sign-in flow that the tester opened."
          : lastError ||
            (tokenSet?.accessToken
              ? "The saved Graph token is expired. Use Login to get a new one."
              : "No persisted Graph token is currently available."),
      };
    }

    const claims = decodeTokenClaims(tokenSet.accessToken) || {};
    const delegated = isDelegatedToken(tokenSet.accessToken);
    const grantedScopes = delegated
      ? getTokenScopes(tokenSet.accessToken)
      : tokenSet.scope?.split(" ").filter(Boolean) || [];
    const grantedRoles = delegated ? [] : getTokenRoles(tokenSet.accessToken);
    const expiresAt =
      tokenSet.expiresAt || (claims.exp ? claims.exp * 1000 : null);

    return {
      ok: true,
      authenticated: true,
      authConfigured: hasGraphTesterAuthConfig(config),
      redirectUri: config.graphRedirectUri,
      scopes: config.graphScopes,
      tokenType: delegated ? "delegated" : "application",
      grantedScopes,
      grantedRoles,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      expired: isTokenExpired(tokenSet.accessToken, 0),
      autoLoginOnStartup: config.autoLoginOnStartup,
      tokenCacheFile: config.tokenCacheFile,
      tokenCachePresent,
      authInProgress: Boolean(pendingAuth),
      authReason: pendingAuth?.reason || null,
      lastAuthMethod,
      lastAuthAt,
      claims: {
        oid: claims.oid || null,
        tid: claims.tid || null,
        name: claims.name || null,
        preferredUsername:
          claims.preferred_username || claims.upn || claims.unique_name || null,
      },
    };
  }

  function beginAuthorizationRequest(reason = "manual") {
    if (!hasGraphTesterAuthConfig(config)) {
      throw buildAuthError(
        "Graph auth is not configured. Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, the GRAPH_CLIENT_SECRET environment variable, and a redirect URI.",
        "GraphAuthConfigMissing",
        500
      );
    }

    if (pendingAuth) {
      return {
        url: pendingAuth.url,
        state: pendingAuth.state,
      };
    }

    const { url, state } = authClient.buildAuthorizationUrl();
    pendingAuth = createPendingAuthRequest({ reason, url, state });
    lastError = "";
    return { url, state };
  }

  async function completeAuthorizationRequest(query = {}) {
    if (!pendingAuth) {
      throw buildAuthError(
        "No Graph login is waiting for a callback. Start the login flow again.",
        "GraphAuthStateMissing",
        400
      );
    }

    const {
      code = "",
      error: authError = "",
      error_description: authErrorDescription = "",
      state = "",
    } = query;

    if (authError) {
      const error = buildAuthError(
        authErrorDescription || String(authError),
        "GraphAuthRedirectError",
        400
      );
      rejectPendingAuth(error);
      throw error;
    }

    if (!code) {
      const error = buildAuthError(
        "No authorization code was returned.",
        "GraphAuthRedirectError",
        400
      );
      rejectPendingAuth(error);
      throw error;
    }

    if (state !== pendingAuth.state) {
      const error = buildAuthError(
        "OAuth state mismatch. Start the login flow again.",
        "GraphAuthStateMismatch",
        403
      );
      rejectPendingAuth(error);
      throw error;
    }

    try {
      const receivedTokenSet = await authClient.exchangeCodeForToken(String(code));
      await saveTokenSet(receivedTokenSet, "interactive");
      resolvePendingAuth(receivedTokenSet);
      return receivedTokenSet;
    } catch (error) {
      rejectPendingAuth(error);
      throw error;
    }
  }

  async function clearStoredAuth() {
    tokenSet = null;
    tokenCachePresent = false;
    lastAuthMethod = "cleared";
    lastAuthAt = new Date().toISOString();
    lastError = "";

    if (pendingAuth) {
      rejectPendingAuth(
        buildAuthError(
          "Graph login was cancelled because the saved token was cleared.",
          "GraphAuthCancelled",
          400
        )
      );
    }

    try {
      await fs.unlink(config.tokenCacheFile);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  async function getAccessToken() {
    await hydrateTokenSetFromDisk();

    if (pendingAuth) {
      const pendingTokenSet = await pendingAuth.promise;
      return pendingTokenSet.accessToken;
    }

    if (!tokenSet?.accessToken) {
      throw buildAuthError(
        "No persisted Graph token is available. Use Login to start the OAuth flow.",
        "GraphAuthRequired",
        401
      );
    }

    if (!isTokenExpired(tokenSet.accessToken)) {
      return tokenSet.accessToken;
    }

    if (tokenSet.refreshToken) {
      try {
        const refreshedTokenSet = await refreshStoredToken("refresh");
        return refreshedTokenSet.accessToken;
      } catch (error) {
        lastError = error.message;
      }
    }

    const reauthenticatedTokenSet = await startInteractiveAuth("expired");
    return reauthenticatedTokenSet.accessToken;
  }

  async function hydrateTokenSetFromDisk() {
    if (tokenCacheLoaded) {
      return tokenSet;
    }

    tokenCacheLoaded = true;

    try {
      const rawValue = await fs.readFile(config.tokenCacheFile, "utf-8");
      const parsedValue = JSON.parse(rawValue);

      tokenSet =
        parsedValue && typeof parsedValue.accessToken === "string"
          ? parsedValue
          : null;
      tokenCachePresent = Boolean(tokenSet);
    } catch (error) {
      if (error.code === "ENOENT") {
        tokenSet = null;
        tokenCachePresent = false;
        return null;
      }

      tokenSet = null;
      tokenCachePresent = false;
      lastError = `Could not read the token cache file: ${error.message}`;
    }

    return tokenSet;
  }

  async function refreshStoredToken(method) {
    if (!tokenSet?.refreshToken) {
      throw buildAuthError(
        "The stored Graph token has no refresh token. Login is required again.",
        "GraphRefreshUnavailable",
        401
      );
    }

    const refreshedTokenSet = await refreshAccessToken({
      tenantId: config.graphTenantId,
      clientId: config.graphClientId,
      clientSecret: config.graphClientSecret,
      scopes: config.graphScopes,
      refreshToken: tokenSet.refreshToken,
    });

    await saveTokenSet(refreshedTokenSet, method);
    return refreshedTokenSet;
  }

  async function saveTokenSet(nextTokenSet, method) {
    tokenSet = nextTokenSet;
    tokenCacheLoaded = true;
    tokenCachePresent = true;
    lastAuthMethod = method;
    lastAuthAt = new Date().toISOString();
    lastError = "";

    await fs.mkdir(path.dirname(config.tokenCacheFile), { recursive: true });
    await fs.writeFile(
      config.tokenCacheFile,
      JSON.stringify(nextTokenSet, null, 2),
      "utf-8"
    );
  }

  async function startInteractiveAuth(reason) {
    const requestAlreadyPending = Boolean(pendingAuth);
    const { url } = beginAuthorizationRequest(reason);
    if (!requestAlreadyPending) {
      openBrowser(url);
    }
    return pendingAuth.promise;
  }

  function resolvePendingAuth(resolvedTokenSet) {
    if (!pendingAuth) {
      return;
    }

    pendingAuth.resolve(resolvedTokenSet);
    pendingAuth = null;
  }

  function rejectPendingAuth(error) {
    if (!pendingAuth) {
      return;
    }

    lastError = error.message || String(error);
    pendingAuth.reject(error);
    pendingAuth = null;
  }
}

function createPendingAuthRequest({ reason, url, state }) {
  const pendingAuth = {
    reason,
    startedAt: new Date().toISOString(),
    state,
    url,
  };

  pendingAuth.promise = new Promise((resolve, reject) => {
    pendingAuth.resolve = resolve;
    pendingAuth.reject = reject;
  });
  pendingAuth.promise.catch(() => undefined);

  return pendingAuth;
}

function buildAuthError(message, code, statusCode) {
  const error = new Error(message);
  error.name = "GraphTesterAuthError";
  error.code = code;
  error.statusCode = statusCode;
  error.hint = "Complete the Microsoft login flow or retry the tester login.";
  return error;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  const openCommand = process.platform === "darwin" ? "open" : "xdg-open";

  spawn(openCommand, [url], {
    detached: true,
    stdio: "ignore",
  }).unref();
}
