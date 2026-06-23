const DEFAULT_KB_ENDPOINT = "https://tools.benchmarkdigital.com/kb/callKBX.cfm";
const DEFAULT_SEARCH_ROWS = 10;
const DEFAULT_SEARCH_START = 0;
const URL_WARNING_LENGTH = 1800;

export function createKbService(config, { teamGptAuthService } = {}) {
  const endpoint = normalizeText(config.kbEndpoint) || DEFAULT_KB_ENDPOINT;
  const defaultAuthToken = extractBearerToken(config.kbAuthToken);
  const requestTimeoutMs = Number.parseInt(
    String(config.kbRequestTimeoutMs || config.requestTimeoutMs || 20000),
    10
  );

  function describe() {
    return {
      enabled: Boolean(endpoint),
      endpoint,
      authConfigured: Boolean(defaultAuthToken && isJwtShaped(defaultAuthToken)) || Boolean(teamGptAuthService),
      researchEnabled:
        Boolean(endpoint) &&
        (Boolean(defaultAuthToken && isJwtShaped(defaultAuthToken)) || Boolean(teamGptAuthService)),
      requestTimeoutMs,
    };
  }

  async function callDetailed(method, params = {}, options = {}) {
    if (!endpoint) {
      throw createKbError("KB endpoint is not configured.", 503);
    }

    const normalizedMethod = normalizeText(method);
    if (!normalizedMethod) {
      throw createKbError("KB method is required.", 400);
    }

    const authToken = await resolveAuthToken(options.authToken);
    if (!authToken) {
      throw createKbError(
        "KB authorization token is required. Set KB_AUTH_TOKEN or send Authorization: Bearer <JWT>.",
        401
      );
    }

    const url = new URL(endpoint);
    url.searchParams.set("method", normalizedMethod);

    for (const [key, value] of Object.entries(params)) {
      const normalizedValue = normalizeQueryValue(value);
      if (normalizedValue === "") continue;
      url.searchParams.set(key, normalizedValue);
    }

    const warning =
      normalizedMethod === "searchAsAgent" && url.toString().length > URL_WARNING_LENGTH
        ? `GET search URL is ${url.toString().length} characters and may exceed browser or proxy limits.`
        : null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      const normalizedError =
        error?.name === "AbortError"
          ? createKbError("KB request timed out.", 504)
          : createKbError(error?.message || "KB request failed unexpectedly.", 502);
      throw normalizedError;
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await response.text();
    if (!response.ok) {
      throw createKbError(
        `KB request failed with ${response.status} ${response.statusText}. ${rawText.slice(0, 200)}`.trim(),
        response.status || 502
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html") || rawText.trim().startsWith("<")) {
      throw createKbError(
        "Received HTML instead of JSON. Likely auth redirect or expired KB session.",
        401
      );
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw createKbError(
        `Failed to parse KB JSON response. ${rawText.slice(0, 200)}`.trim(),
        502
      );
    }

    if (json?.success === false) {
      throw createKbError(resolveKbFailureMessage(json), 502);
    }

    return {
      method: normalizedMethod,
      url: url.toString(),
      warning,
      data: json?.data ?? json,
    };
  }

  async function kbGet(method, params = {}, options = {}) {
    const result = await callDetailed(method, params, options);
    return result.data;
  }

  async function searchContentDetailed(args = {}, options = {}) {
    const query = normalizeText(args.query);
    if (!query) {
      throw createKbError("query is required.", 400);
    }

    const params = {
      query: Buffer.from(query, "utf8").toString("base64"),
      rows: normalizePositiveInteger(args.limit, DEFAULT_SEARCH_ROWS),
      start: normalizeNonNegativeInteger(args.start, DEFAULT_SEARCH_START),
    };

    const optionalFilters = ["tags", "pillars", "users", "owners", "binderids"];
    for (const key of optionalFilters) {
      const normalizedValue = normalizePipeList(args[key]);
      if (normalizedValue) {
        params[key] = normalizedValue;
      }
    }

    return callDetailed("searchAsAgent", params, options);
  }

  async function searchContent(args = {}, options = {}) {
    const result = await searchContentDetailed(args, options);
    return result.data;
  }

  return {
    describe,
    callDetailed,
    kbGet,
    getTypes(options = {}) {
      return kbGet("getType", {}, options);
    },
    getContent(args = {}, options = {}) {
      return kbGet("getContent", pickArgs(args, ["contentid"]), options);
    },
    getRecentContent(options = {}) {
      return kbGet("getRecentContent", {}, options);
    },
    getFavoriteContent(options = {}) {
      return kbGet("getFavoriteContent", {}, options);
    },
    findContentByTitle(args = {}, options = {}) {
      return kbGet("findContentByTitle", pickArgs(args, ["title"]), options);
    },
    getTags(options = {}) {
      return kbGet("getTag", {}, options);
    },
    getTagsByType(args = {}, options = {}) {
      return kbGet("getTagsOfTagType", pickArgs(args, ["tagtypeid"]), options);
    },
    getHistory(args = {}, options = {}) {
      return kbGet("getHistory", pickArgs(args, ["contentid"]), options);
    },
    getBinder(args = {}, options = {}) {
      return kbGet("getBinder", pickArgs(args, ["binderid"]), options);
    },
    getBinderContents(args = {}, options = {}) {
      return kbGet("getPopulatedBinder", pickArgs(args, ["binderID"]), options);
    },
    getBinderPermissions(args = {}, options = {}) {
      return kbGet("getBinderPermissions", pickArgs(args, ["binderid"]), options);
    },
    getBinderSection(args = {}, options = {}) {
      return kbGet("getBinderSection", pickArgs(args, ["sectionID"]), options);
    },
    getBinderFolderPath(args = {}, options = {}) {
      return kbGet(
        "getBinderFolderPath",
        pickArgs(args, ["binderid", "sectionid"]),
        options
      );
    },
    getBinderIdsForContent(args = {}, options = {}) {
      return kbGet("getBinderIdsForContentId", pickArgs(args, ["contentid"]), options);
    },
    getBindersByOrg(args = {}, options = {}) {
      return kbGet("getBindersByOrgId", pickArgs(args, ["orgid"]), options);
    },
    listBinders(options = {}) {
      return kbGet("getBinders", {}, options);
    },
    getUserBinders(options = {}) {
      return kbGet("getUserBinders", {}, options);
    },
    searchContentDetailed,
    searchContent,
  };

  async function resolveAuthToken(overrideToken) {
    const explicitToken = extractBearerToken(overrideToken);
    if (explicitToken && isJwtShaped(explicitToken)) {
      return explicitToken;
    }

    if (defaultAuthToken && isJwtShaped(defaultAuthToken)) {
      return defaultAuthToken;
    }

    if (teamGptAuthService?.getJwtToken) {
      const authPayload = await teamGptAuthService.getJwtToken();
      const jwtToken = extractBearerToken(authPayload?.jwtToken);
      if (jwtToken && isJwtShaped(jwtToken)) {
        return jwtToken;
      }
    }

    return explicitToken || defaultAuthToken || "";
  }
}

export function extractBearerToken(value) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const text = normalizeText(normalized);
  if (!text) return "";
  return text.toLowerCase().startsWith("bearer ") ? text.slice(7).trim() : text;
}

export function normalizeKbRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const columns = data.COLUMNS || data.columns;
  const rows = data.DATA || data.data;

  if (Array.isArray(columns) && Array.isArray(rows)) {
    return rows.map((row) => {
      const result = {};
      columns.forEach((column, index) => {
        result[column] = Array.isArray(row) ? row[index] : undefined;
      });
      return result;
    });
  }

  return [];
}

export function normalizeKbSearchHits(data) {
  const searchRoot = data?.Filecontent || data?.filecontent || data;
  const hits = searchRoot?.hits?.hits;
  if (!Array.isArray(hits)) {
    return [];
  }

  return hits.map((hit) => {
    const source = hit?._source || hit?.fields || hit || {};
    const contentId = firstDefined(
      source.originid,
      source.contentid,
      source.contentID,
      hit?._id
    );

    return {
      contentid: contentId,
      title: firstDefined(source.title, source.name, `Content ${contentId || ""}`),
      excerpt: buildExcerpt(
        firstDefined(source.content, source.summary, source.description, "")
      ),
      binderids: normalizePipeList(source.binderids),
      tags: normalizePipeList(source.tags),
      owners: normalizePipeList(source.ownerid || source.owners),
      lastmodified: firstDefined(source.lastmodified, source.modifieddate, source.updatedate, ""),
      score: hit?._score ?? null,
      raw: hit,
    };
  });
}

export function buildKbContentUrl(contentId) {
  const normalized = normalizeText(contentId);
  return normalized
    ? `https://tools.benchmarkdigital.com/kb/#content/${encodeURIComponent(normalized)}`
    : "";
}

function pickArgs(source, keys) {
  const result = {};
  for (const key of keys) {
    const normalizedValue = normalizeQueryValue(source?.[key]);
    if (normalizedValue !== "") {
      result[key] = normalizedValue;
    }
  }
  return result;
}

function normalizeQueryValue(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean).join("|");
  }
  return normalizeText(value);
}

function normalizePipeList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean).join("|");
  }

  const text = normalizeText(value);
  if (!text) return "";
  return text
    .split(/[|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("|");
}

function normalizePositiveInteger(value, fallback) {
  const normalized = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const normalized = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function resolveKbFailureMessage(payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return JSON.stringify(payload.errors);
  }

  return normalizeText(payload?.message) || "KB request failed.";
}

function createKbError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isJwtShaped(value) {
  const token = normalizeText(value);
  return token.split(".").length === 3;
}

function normalizeText(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : "";
}

function firstDefined(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return "";
}

function buildExcerpt(value) {
  const normalized = normalizeText(value).replace(/\s+/g, " ");
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}
