import { getClientCatalog } from "../../../graph-tester/catalog/graphTesterCatalog.js";

/**
 * The tool list sent to the model is intentionally small and fixed —
 * list_graph_functions + run_graph_function, mirroring the existing voice
 * assistant's REALTIME_TOOLS pattern (app.js) — rather than one tool per
 * Graph catalog entry. A capability-gated token can have 100+ enabled
 * functions; sending that many tool schemas is unreliable for local models
 * (confirmed by testing: qwen2.5-coder:7b hallucinated a tool call when given
 * 100+ tools, but discovers/calls correctly through this 2-tool indirection).
 * Cloud models handle either shape fine, so one shape is used for both.
 */
export function buildAssistantTools({ grantedScopes = [], docsKbEnabled = false, codeKbEnabled = false } = {}) {
  const tools = [
    {
      name: "list_graph_functions",
      kind: "graph_list",
      description:
        "List Microsoft Graph functions the signed-in account currently supports (mail, calendar, Teams chat/channel, tasks, OneNote, contacts, files, profile). Returns each function's service, name, description, whether it mutates data, and its argument fields. Call this first to discover the right service/functionName and required fields before calling run_graph_function.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", description: "Optional filter, e.g. mail, calendar, teamsChat, teamsChannel, tasks, onenote, contacts, files, profile." },
          search: { type: "string", description: "Optional keyword to filter by function name or description." },
        },
        required: [],
        additionalProperties: false,
      },
      mutation: false,
      safety: "read",
      confirmationRequired: false,
    },
    {
      name: "run_graph_function",
      kind: "graph_run",
      description:
        "Run one Microsoft Graph function returned by list_graph_functions, using the signed-in account. Read-only functions run immediately. Functions that mutate data (send/reply/move/delete mail, create/update/delete calendar events, post chat/channel messages, create/complete tasks, etc.) are never executed directly here — calling one only stages a proposed action for the user to confirm or cancel.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", description: "The service key from list_graph_functions, e.g. mail, calendar, tasks." },
          functionName: { type: "string", description: "The functionName from list_graph_functions, e.g. listEvents, sendMail, completeTask." },
          args: {
            type: "object",
            description: "Arguments for the function, matching the fields list_graph_functions reported for it.",
            additionalProperties: true,
          },
        },
        required: ["service", "functionName"],
        additionalProperties: false,
      },
      mutation: false, // the tool call itself never mutates; run_graph_function only proposes mutations
      safety: "read",
      confirmationRequired: false,
    },
  ];

  if (docsKbEnabled) {
    tools.push({
      name: "search_docs",
      kind: "docs",
      description:
        "Search the app's documentation knowledge base (architecture, schemas, design notes) for relevant excerpts. Use this for questions about how the app's own systems are built.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "What to look up in the documentation." } },
        required: ["query"],
        additionalProperties: false,
      },
      mutation: false,
      safety: "read",
      confirmationRequired: false,
    });
  }

  if (codeKbEnabled) {
    tools.push({
      name: "search_code",
      kind: "code",
      description:
        "Search the app's own source code (backend + frontend) for where a feature, route, or function is implemented. Use this for 'where is X implemented' / 'what file controls Y' questions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to look up, e.g. a feature name, route path, or function name." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      mutation: false,
      safety: "read",
      confirmationRequired: false,
    });
  }

  return tools;
}

/**
 * Compact, capability-filtered Graph function catalog for the
 * list_graph_functions tool result — same underlying data
 * /api/assistant/graph/functions already returns to the voice assistant.
 */
export function buildGraphFunctionCatalog(grantedScopes = [], { service = "", search = "" } = {}) {
  const serviceFilter = typeof service === "string" ? service.trim() : "";
  const searchFilter = typeof search === "string" ? search.trim().toLowerCase() : "";

  return getClientCatalog(grantedScopes)
    .filter((svc) => !serviceFilter || svc.key === serviceFilter)
    .map((svc) => ({
      service: svc.key,
      label: svc.label,
      description: svc.description,
      functions: svc.functions
        .filter(
          (entry) =>
            !searchFilter ||
            entry.functionName.toLowerCase().includes(searchFilter) ||
            entry.label.toLowerCase().includes(searchFilter) ||
            entry.description.toLowerCase().includes(searchFilter)
        )
        .map((entry) => ({
          functionName: entry.functionName,
          label: entry.label,
          description: entry.description,
          mutation: entry.mutation,
          requiredFields: entry.requiredFields,
          fields: entry.fields.map((field) => ({
            name: field.name,
            type: field.type,
            required: Boolean(field.required),
            description: field.description || field.placeholder || "",
          })),
        })),
    }))
    .filter((svc) => svc.functions.length > 0);
}
