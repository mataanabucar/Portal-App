import { KEY_DETAIL_LABELS } from "./portalSummaryNormalizer.js";

const KEY_DETAIL_ROWS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      value: { type: "string" }
    },
    required: ["label", "value"]
  }
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          generatedAt: { type: "string" },
          status: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              tone: {
                type: "string",
                enum: ["blocked", "warning", "active", "ready", "neutral"]
              }
            },
            required: ["label", "tone"]
          },
          priority: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              tone: {
                type: "string",
                enum: ["normal", "high", "low", "unknown"]
              }
            },
            required: ["label", "tone"]
          },
          due: {
            type: "object",
            additionalProperties: false,
            properties: {
              date: { type: "string" },
              relative: { type: "string" },
              tone: {
                type: "string",
                enum: ["normal", "soon", "overdue", "unknown"]
              }
            },
            required: ["date", "relative", "tone"]
          },
          nextAction: { type: "string" },
          summary: { type: "string" },
          deliverable: { type: "string" },
          blockersOpenQuestions: {
            type: "array",
            items: { type: "string" }
          },
          urgency: { type: "string" },
          keyDetails: KEY_DETAIL_ROWS_SCHEMA,
          requestHistorySignals: { type: "string" },
          confidence: {
            type: "object",
            additionalProperties: false,
            properties: {
              level: {
                type: "string",
                enum: ["High", "Medium", "Low"]
              },
              reason: { type: "string" }
            },
            required: ["level", "reason"]
          },
          footer: {
            type: "object",
            additionalProperties: false,
            properties: {
              requested: { type: "string" },
              lastUpdated: { type: "string" }
            },
            required: ["requested", "lastUpdated"]
          }
        },
        required: [
          "title",
          "generatedAt",
          "status",
          "priority",
          "due",
          "nextAction",
          "summary",
          "deliverable",
          "blockersOpenQuestions",
          "urgency",
          "keyDetails",
          "requestHistorySignals",
          "confidence",
          "footer"
        ]
      }
    }
  },
  required: ["items"]
};

const SYSTEM_PROMPT = [
  "You are an AI analyst reviewing internal customer request pages from a support and action portal.",
  "The input contains one or more extracted portal records.",
  "Create exactly one response item for each visible request record in the same order as the input records.",
  "Use only the provided page content.",
  "Do not invent missing values, internal behavior, root causes, or recommendations not supported by the page.",
  "Avoid repeating the same information across sections.",
  "Keep wording operational, concise, and useful for support triage.",
  "The title must be a concise case title, not a sentence, and must not start with the requester's name.",
  "Preserve important exact terms such as system names, report names, reference values, IDs, and field names.",
  "Use request history only when it adds new context, blockers, or investigation progress.",
  "Email Context, when present, contains the most recent email in the item's thread and may include follow-up details, service team notes, or requester updates not visible in the portal record — incorporate this context into the summary, next action, blockers, and key details as appropriate.",
  "Identify urgency only from visible evidence such as due date, request age, priority, SLA warnings, elapsed-time messages, status, or queue indicators.",
  "If something is unclear or missing, say so briefly.",
  `Return valid JSON only. For each item, include keyDetails using this fixed label set in this exact order: ${KEY_DETAIL_LABELS.join(", ")}.`,
  'If a key detail value is unavailable, use "Not visible".',
  "If generatedAt is not visible in the portal data, leave it as an empty string because the application will stamp the real generation time."
].join(" ");

export function buildPortalParserRequest({ model, originalText, testchat, focus }) {
  const instructions = buildPortalParserInstructions({ testchat, focus });

  return testchat
    ? {
        model,
        store: false,
        instructions,
        input: originalText
      }
    : {
        model,
        store: false,
        instructions,
        input: originalText,
        text: {
          format: {
            type: "json_schema",
            name: "portal_visualizer_ai_summary_v1",
            strict: true,
            schema: RESPONSE_SCHEMA
          }
        }
      };
}

export function buildPortalParserInstructions({ testchat, focus }) {
  const focusLine = normalizeFocus(focus)
    ? `Focus especially on this request context: ${normalizeFocus(focus)}.`
    : "Focus on the most urgent, blocked, and actionable work.";

  return testchat
    ? [
        "You review internal portal request data for a single user.",
        "Return a concise plain-text analysis.",
        "Call out asks, deliverables, blockers, urgency, and the clearest next step.",
        focusLine
      ].join(" ")
    : [SYSTEM_PROMPT, focusLine].join(" ");
}

export { RESPONSE_SCHEMA };

function normalizeFocus(focus) {
  return typeof focus === "string" && focus.trim() ? focus.trim() : null;
}
