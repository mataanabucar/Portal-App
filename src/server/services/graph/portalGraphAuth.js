import fs from "node:fs/promises";
import path from "node:path";
import { isTokenExpired, refreshAccessToken } from "./index.js";

/**
 * Lightweight Graph auth accessor for the main portal server.
 *
 * Reads the persisted token cache written by the graph-tester and refreshes it
 * when the access token is expired. Does NOT implement the OAuth login flow —
 * the user authenticates once via the graph-tester UI and this module reuses
 * the cached token.
 */
export function createPortalGraphAuth(config) {
  const cacheFile = path.resolve(
    process.cwd(),
    config.graphTokenCacheFile || ".local-auth/graph-tester-token.json"
  );

  async function getAccessToken() {
    let tokenSet;

    try {
      const raw = await fs.readFile(cacheFile, "utf-8");
      tokenSet = JSON.parse(raw);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw buildAuthError(
          "No Graph token cache found. Log in once via the graph-tester UI.",
          "GraphTokenCacheMissing",
          401
        );
      }
      throw error;
    }

    if (!tokenSet?.accessToken) {
      throw buildAuthError(
        "Graph token cache is empty or invalid. Log in via the graph-tester UI.",
        "GraphTokenInvalid",
        401
      );
    }

    if (!isTokenExpired(tokenSet.accessToken)) {
      return tokenSet.accessToken;
    }

    if (
      tokenSet.refreshToken &&
      config.graphTenantId &&
      config.graphClientId &&
      config.graphClientSecret
    ) {
      const refreshed = await refreshAccessToken({
        tenantId: config.graphTenantId,
        clientId: config.graphClientId,
        clientSecret: config.graphClientSecret,
        scopes: config.graphScopes,
        refreshToken: tokenSet.refreshToken,
      });

      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, JSON.stringify(refreshed, null, 2), "utf-8");
      return refreshed.accessToken;
    }

    throw buildAuthError(
      "Graph token is expired and cannot be refreshed. Log in via the graph-tester UI.",
      "GraphTokenExpired",
      401
    );
  }

  return { getAccessToken };
}

function buildAuthError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
