import { GraphError } from "../../server/services/graph/index.js";
import { ValidationError } from "./fieldParsers.js";

export function buildResultSummary(entry, data) {
  if (data === undefined) {
    return `${entry.label} completed without a response body.`;
  }

  if (Array.isArray(data)) {
    return `${entry.label} returned ${data.length} item${data.length === 1 ? "" : "s"}.`;
  }

  if (data?.binary === true) {
    return `${entry.label} returned binary metadata (${data.contentType || "unknown type"}, ${formatByteSize(data.sizeBytes)}).`;
  }

  return `${entry.label} completed successfully.`;
}

export function countResultItems(data) {
  return Array.isArray(data) ? data.length : null;
}

export function buildGraphTesterError(error) {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      code: error.code || error.name,
      message: error.message,
      requestId: null,
      hint: "Correct the invalid form input and run the test again.",
    };
  }

  if (error instanceof GraphError) {
    return {
      status: error.status || 500,
      code: error.graphCode || "GraphRequestFailed",
      message: error.graphMessage || error.message,
      requestId: error.requestId || null,
      hint: buildErrorHint(error.status, error.graphCode),
    };
  }

  const status = error?.statusCode || error?.status || 500;
  const code = error?.code || error?.name || "GraphTesterError";

  return {
    status,
    code,
    message: error?.message || "The Graph tester request failed.",
    requestId: error?.requestId || null,
    hint: error?.hint || buildErrorHint(status, code),
  };
}

function buildErrorHint(status, code) {
  if (status === 400) {
    return "Check the requested function inputs and try again.";
  }

  if (status === 401) {
    return "Log in again. The stored Graph session is missing, expired, or invalid.";
  }

  if (status === 403) {
    return "Missing permission or admin consent may be required.";
  }

  if (status === 404) {
    return "The target item was not found or the signed-in user cannot access it.";
  }

  if (status === 429) {
    return "Graph throttled the request. Wait briefly and retry.";
  }

  if (status >= 500) {
    return "Graph or the local tester hit a server-side error. Retry after a short wait.";
  }

  if (String(code).toLowerCase().includes("permission")) {
    return "Verify the Azure app registration scopes and granted consent.";
  }

  return "Review the function inputs and Graph permissions, then retry.";
}

function formatByteSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
