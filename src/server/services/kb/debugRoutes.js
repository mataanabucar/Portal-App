import { extractBearerToken } from "./index.js";

const KB_HELPER_DEFINITIONS = Object.freeze([
  { path: "getTypes", method: "getType", paramKeys: [] },
  { path: "getContent", method: "getContent", paramKeys: ["contentid"] },
  { path: "getRecentContent", method: "getRecentContent", paramKeys: [] },
  { path: "getFavoriteContent", method: "getFavoriteContent", paramKeys: [] },
  { path: "findContentByTitle", method: "findContentByTitle", paramKeys: ["title"] },
  { path: "getTags", method: "getTag", paramKeys: [] },
  { path: "getTagsByType", method: "getTagsOfTagType", paramKeys: ["tagtypeid"] },
  { path: "getHistory", method: "getHistory", paramKeys: ["contentid"] },
  { path: "getBinder", method: "getBinder", paramKeys: ["binderid"] },
  { path: "getBinderContents", method: "getPopulatedBinder", paramKeys: ["binderID"] },
  { path: "getBinderPermissions", method: "getBinderPermissions", paramKeys: ["binderid"] },
  { path: "getBinderSection", method: "getBinderSection", paramKeys: ["sectionID"] },
  {
    path: "getBinderFolderPath",
    method: "getBinderFolderPath",
    paramKeys: ["binderid", "sectionid"],
  },
  {
    path: "getBinderIdsForContent",
    method: "getBinderIdsForContentId",
    paramKeys: ["contentid"],
  },
  { path: "getBindersByOrg", method: "getBindersByOrgId", paramKeys: ["orgid"] },
  { path: "listBinders", method: "getBinders", paramKeys: [] },
  { path: "getUserBinders", method: "getUserBinders", paramKeys: [] },
]);

export function registerKbDebugRoutes(app, kbService) {
  const prefixes = ["/kb", "/api/kb"];

  for (const prefix of prefixes) {
    app.get(prefix, (request, response) => {
      response.json({
        ok: true,
        service: "kb-readonly-debug",
        ...kbService.describe(),
        endpoints: [
          `${prefix}/debug?method=getType`,
          `${prefix}/searchContent?query=ColdFusion&limit=10`,
          ...KB_HELPER_DEFINITIONS.map((definition) => `${prefix}/${definition.path}`),
        ],
      });
    });

    app.get(`${prefix}/debug`, async (request, response, next) => {
      try {
        const method = normalizeScalar(request.query.method);
        if (!method) {
          const error = new Error("method is required.");
          error.statusCode = 400;
          throw error;
        }

        const params = omitKeys(request.query, ["method"]);
        const result = await kbService.callDetailed(method, params, {
          authToken: extractBearerToken(request.headers.authorization),
        });

        response.json({
          ok: true,
          helper: "debug",
          method: result.method,
          url: result.url,
          warning: result.warning,
          data: result.data,
        });
      } catch (error) {
        next(error);
      }
    });

    app.get(`${prefix}/searchContent`, async (request, response, next) => {
      try {
        const result = await kbService.searchContentDetailed(
          {
            query: normalizeScalar(request.query.query),
            limit: normalizeScalar(request.query.limit),
            start: normalizeScalar(request.query.start),
            tags: request.query.tags,
            pillars: request.query.pillars,
            users: request.query.users,
            owners: request.query.owners,
            binderids: request.query.binderids,
          },
          {
            authToken: extractBearerToken(request.headers.authorization),
          }
        );

        response.json({
          ok: true,
          helper: "searchContent",
          method: result.method,
          url: result.url,
          warning:
            result.warning ||
            "searchContent uses GET for now. Long queries or many filters may exceed URL length limits.",
          data: result.data,
        });
      } catch (error) {
        next(error);
      }
    });

    for (const definition of KB_HELPER_DEFINITIONS) {
      app.get(`${prefix}/${definition.path}`, async (request, response, next) => {
        try {
          const result = await kbService.callDetailed(
            definition.method,
            pickParams(request.query, definition.paramKeys),
            {
              authToken: extractBearerToken(request.headers.authorization),
            }
          );

          response.json({
            ok: true,
            helper: definition.path,
            method: result.method,
            url: result.url,
            warning: result.warning,
            data: result.data,
          });
        } catch (error) {
          next(error);
        }
      });
    }
  }
}

function pickParams(query, keys) {
  const params = {};
  for (const key of keys) {
    const value = normalizeScalar(query?.[key]);
    if (value) {
      params[key] = value;
    }
  }
  return params;
}

function omitKeys(query, keysToSkip) {
  const params = {};
  const skip = new Set(keysToSkip);

  for (const [key, value] of Object.entries(query || {})) {
    if (skip.has(key)) continue;
    const normalized = normalizeScalar(value);
    if (normalized) {
      params[key] = normalized;
    }
  }

  return params;
}

function normalizeScalar(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join("|");
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}
