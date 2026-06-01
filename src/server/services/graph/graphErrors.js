// ---------------------------------------------------------------------------
// Graph API error classes
// ---------------------------------------------------------------------------

export class GraphError extends Error {
  constructor(message, { status, statusText, graphCode, graphMessage, requestId, rawBody } = {}) {
    super(message);
    this.name = "GraphError";
    this.status = status;
    this.statusText = statusText;
    this.graphCode = graphCode;
    this.graphMessage = graphMessage;
    this.requestId = requestId;
    this.rawBody = rawBody;
  }

  isUnauthorized() { return this.status === 401; }
  isForbidden()    { return this.status === 403; }
  isNotFound()     { return this.status === 404; }
  isThrottled()    { return this.status === 429; }
  isServerError()  { return this.status >= 500; }
  isRetryable()    { return this.status === 429 || this.status === 502 || this.status === 503 || this.status === 504; }
}

export async function buildGraphError(response) {
  let rawBody = "";
  let parsed = null;

  try {
    rawBody = await response.text();
    parsed = JSON.parse(rawBody);
  } catch {
    // keep rawBody as-is
  }

  const graphCode    = parsed?.error?.code    ?? null;
  const graphMessage = parsed?.error?.message ?? null;
  const requestId    = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? null;

  return new GraphError(
    `Graph ${response.status} on ${response.url}: ${graphMessage ?? rawBody.slice(0, 120)}`,
    { status: response.status, statusText: response.statusText, graphCode, graphMessage, requestId, rawBody }
  );
}
