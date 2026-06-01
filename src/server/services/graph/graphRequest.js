/**
 * Shared Graph API request helper.
 *
 * All service modules call this — never call fetch() directly from a service.
 */

import { buildGraphError } from "./graphErrors.js";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

// How long to wait before retrying after a 429/5xx when no Retry-After header
const DEFAULT_RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {"GET"|"POST"|"PATCH"|"DELETE"} opts.method
 * @param {string}  opts.path        e.g. "/me" or "/me/messages"
 * @param {string}  opts.token       Bearer access token
 * @param {object}  [opts.query]     OData / Graph query params
 * @param {unknown} [opts.body]      Request body (JSON-serialized automatically)
 * @param {object}  [opts.headers]   Extra headers merged over defaults
 * @param {boolean} [opts.binary]    When true, returns raw Response instead of parsed JSON
 * @returns {Promise<any>}
 */
export async function graphRequest({ method, path, token, query, body, headers = {}, binary = false }) {
  const url = _buildUrl(path, query);

  const reqHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
  }

  let attempt = 0;

  while (true) {
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.ok) {
      if (binary) return response;
      if (response.status === 204) return undefined;
      return response.json();
    }

    const err = await buildGraphError(response);

    // Only retry on throttle / transient server errors
    if (err.isRetryable() && attempt < MAX_RETRIES) {
      const retryAfterSec = Number(response.headers.get("Retry-After") ?? 0);
      const delay = retryAfterSec > 0 ? retryAfterSec * 1000 : DEFAULT_RETRY_DELAY_MS * (attempt + 1);
      attempt++;
      await _sleep(delay);
      continue;
    }

    throw err;
  }
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Fetch all pages of a Graph collection endpoint.
 *
 * @param {object} firstRequestOpts  Same shape as graphRequest opts
 * @returns {Promise<any[]>}         Merged array of all `value` items
 */
export async function graphGetAllPages(firstRequestOpts) {
  const all = [];
  let current = await graphRequest(firstRequestOpts);

  while (true) {
    if (Array.isArray(current?.value)) {
      all.push(...current.value);
    }

    const nextLink = current?.["@odata.nextLink"];
    if (!nextLink) break;

    // nextLink is already a full URL — pass it via path override
    current = await graphRequest({
      method: "GET",
      path: nextLink,
      token: firstRequestOpts.token,
      headers: firstRequestOpts.headers,
    });
  }

  return all;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function _buildUrl(path, query) {
  // If the path is already a full URL (e.g. nextLink), use it directly
  const base = path.startsWith("http") ? path : `${GRAPH_BASE_URL}${path}`;
  const url = new URL(base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
