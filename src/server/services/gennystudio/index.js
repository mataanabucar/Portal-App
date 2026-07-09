import { randomUUID } from "node:crypto";

// Genny Studio "gstudio invoke" client. Calls the generic agent-invoke route
// on the genai proxy (POST {baseUrl}/gstudio/invoke/{agentRef}) with a JSON
// body of { prompt, session_id }. Auth is a JWT the proxy already validates
// for all /gstudio/* routes; we reuse whatever token teamGptAuthService has
// cached rather than minting one ourselves (that minting — encodeToken(...)
// with companyid/businessid/userid/etc — currently happens server-side in
// ColdFusion's gennystudiochat.cfm, not in this app).
//
// Response shape from the proxy is unconfirmed as of writing — this parser
// is a tolerant best-effort covering the shapes seen from the sibling
// bedrock/converse route (see teamgpt/client.js) plus a plain-JSON fallback.
// Verify against a real call and tighten extractResponseText/session id
// lookup once the actual payload is known.

export function createGennyStudioService(config, { teamGptAuthService } = {}) {
  const baseUrl = normalizeText(config?.gennyStudioBaseUrl) || "https://genai-proxy-na.benchmarkdigital.com";
  const agentRef = normalizeText(config?.gennyStudioAgentRef) || "aris_search";
  const requestTimeoutMs = Number.parseInt(
    String(config?.gennyStudioRequestTimeoutMs || config?.requestTimeoutMs || 20000),
    10
  );

  function describe() {
    return {
      enabled: Boolean(baseUrl && agentRef && teamGptAuthService),
      baseUrl,
      agentRef,
      authConfigured: Boolean(teamGptAuthService),
      requestTimeoutMs,
    };
  }

  async function resolveAuthToken(overrideToken) {
    const explicitToken = extractBearerToken(overrideToken);
    if (explicitToken && isJwtShaped(explicitToken)) {
      return explicitToken;
    }

    if (teamGptAuthService?.getJwtToken) {
      const authPayload = await teamGptAuthService.getJwtToken();
      const jwtToken = extractBearerToken(authPayload?.jwtToken);
      if (jwtToken && isJwtShaped(jwtToken)) {
        return jwtToken;
      }
    }

    return explicitToken || "";
  }

  async function invoke(args = {}, options = {}) {
    const prompt = normalizeText(args.prompt);
    if (!prompt) {
      throw createGennyStudioError("prompt is required.", 400);
    }

    if (!baseUrl) {
      throw createGennyStudioError("Genny Studio base URL is not configured.", 503);
    }

    const resolvedAgentRef = normalizeText(args.agentRef) || agentRef;
    const authToken = await resolveAuthToken(options.authToken);
    if (!authToken) {
      throw createGennyStudioError(
        "Genny Studio authorization token is unavailable (no cached TeamGPT/genai-proxy JWT).",
        401
      );
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/gstudio/invoke/${encodeURIComponent(resolvedAgentRef)}`;
    const sessionId = normalizeText(args.sessionId) || randomUUID();
    const body = { prompt, session_id: sessionId };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const normalizedError =
        error?.name === "AbortError"
          ? createGennyStudioError("Genny Studio request timed out.", 504)
          : createGennyStudioError(error?.message || "Genny Studio request failed unexpectedly.", 502);
      throw normalizedError;
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await response.text();
    if (!response.ok) {
      throw createGennyStudioError(
        `Genny Studio request failed with ${response.status} ${response.statusText}. ${rawText.slice(0, 200)}`.trim(),
        response.status || 502
      );
    }

    const parsed = parseGennyStudioResponse(rawText);
    const headerSessionId = normalizeText(
      response.headers.get("gs-gstudio-session-id") || response.headers.get("x-session-id")
    );

    return {
      agentRef: resolvedAgentRef,
      url,
      sessionId: parsed.sessionId || headerSessionId || sessionId,
      text: parsed.text,
      rawText,
      parsedBody: parsed.body,
    };
  }

  return { describe, invoke };
}

function parseGennyStudioResponse(rawText) {
  const trimmed = typeof rawText === "string" ? rawText.trim() : "";
  if (!trimmed) {
    return { text: "", body: null, sessionId: "" };
  }

  const jsonBody = tryParseJson(trimmed);
  if (jsonBody) {
    return {
      text: extractResponseText(jsonBody),
      body: jsonBody,
      sessionId: extractSessionId(jsonBody),
    };
  }

  // aris_search streams SSE: `data: {"type":"text","content":"chunk","seq":N}`.
  // Each event is a token/word fragment, so "text" events must be
  // concatenated directly (no separator) — joining with "\n" like the
  // bedrock/converse parser below does would insert a newline between every
  // word. Any other event type (e.g. a final "done"/metadata event) falls
  // back to the generic extractor and is joined more conservatively.
  const events = [];
  let textDeltaBuffer = "";
  const fallbackSegments = [];
  let sessionId = "";

  for (const line of trimmed.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("data:")) continue;

    const data = trimmedLine.slice(5).trim();
    if (!data || data === "[DONE]") continue;

    const parsed = tryParseJson(data);
    if (!parsed) {
      fallbackSegments.push(data);
      continue;
    }

    events.push(parsed);
    sessionId = sessionId || extractSessionId(parsed);

    if (parsed.type === "text" && typeof parsed.content === "string") {
      textDeltaBuffer += parsed.content;
      continue;
    }

    const text = extractResponseText(parsed);
    if (text) fallbackSegments.push(text);
  }

  if (textDeltaBuffer.trim()) {
    return { text: textDeltaBuffer.trim(), body: events, sessionId };
  }

  if (fallbackSegments.length > 0) {
    return { text: dedupeJoin(fallbackSegments), body: events, sessionId };
  }

  return { text: trimmed, body: null, sessionId: "" };
}

function extractResponseText(payload) {
  const candidates = [
    payload?.response,
    payload?.answer,
    payload?.output_text,
    payload?.outputText,
    payload?.completion,
    payload?.text,
    // aris_search's SSE "text" events carry a plain string here; a
    // non-streaming single-shot JSON reply might use the same key.
    typeof payload?.content === "string" ? payload.content : "",
    joinContentText(payload?.output?.message?.content),
    joinContentText(payload?.message?.content),
    joinContentText(payload?.output?.content),
    joinContentText(payload?.content),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }

  return "";
}

function joinContentText(content) {
  if (!Array.isArray(content)) return "";

  const segments = [];
  for (const part of content) {
    if (typeof part === "string") {
      segments.push(part);
      continue;
    }
    if (part && typeof part === "object") {
      if (typeof part.text === "string") segments.push(part.text);
      else if (typeof part.outputText === "string") segments.push(part.outputText);
    }
  }

  return dedupeJoin(segments);
}

function dedupeJoin(values) {
  const normalized = [];
  for (const value of values) {
    const trimmed = normalizeText(value);
    if (!trimmed) continue;
    if (normalized[normalized.length - 1] === trimmed) continue;
    normalized.push(trimmed);
  }
  return normalized.join("\n").trim();
}

function extractSessionId(payload) {
  return normalizeText(
    payload?.session_id ||
      payload?.sessionId ||
      payload?.ThreadID ||
      payload?.threadId ||
      payload?.output?.session_id
  );
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractBearerToken(value) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const text = normalizeText(normalized);
  if (!text) return "";
  return text.toLowerCase().startsWith("bearer ") ? text.slice(7).trim() : text;
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

function createGennyStudioError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
