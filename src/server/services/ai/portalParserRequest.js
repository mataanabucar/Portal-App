const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          requester: { type: "string" },
          application: { type: "string" },
          owner: { type: "string" },
          dueDate: { type: "string" },
          urgency: {
            type: "string",
            enum: ["low", "normal", "high", "critical"]
          },
          summary: { type: "string" },
          nextAction: { type: "string" },
          blockers: {
            type: "array",
            items: { type: "string" }
          },
          confidence: { type: "number" }
        },
        required: [
          "id",
          "title",
          "requester",
          "application",
          "owner",
          "dueDate",
          "urgency",
          "summary",
          "nextAction",
          "blockers",
          "confidence"
        ]
      }
    }
  },
  required: ["overview", "items"]
};

const SYSTEM_PROMPT = [
  "You review internal portal request data for a single user.",
  "Return only JSON that matches the provided schema.",
  "Create exactly one item for each visible request record in the same order as the input records.",
  "Use only information visible in the provided portal data.",
  "Do not guess values that are hidden, unavailable, or not present.",
  "If a field is unknown, return an empty string.",
  "Do not invent request IDs, titles, owners, or dates when they are not visible.",
  "Write overview as a short queue-level brief that highlights the most urgent work and common blockers.",
  "Write each summary as a concise factual description of the main ask, expected deliverable, and any relevant business or request-history context.",
  "Write nextAction as one short practical sentence for the assigned lead.",
  "Keep blockers limited to explicit blockers, dependencies, or missing information visible in the record.",
  "Set urgency only from visible due dates, request wording, risk language, and visible blockers.",
  "Lower confidence when key details are missing, unclear, or only weakly implied."
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
            name: "portal_visualizer_parse_v1",
            strict: true,
            schema: RESPONSE_SCHEMA
          }
        }
      };
}

export function buildPortalParserInstructions({ testchat, focus }) {
  const focusLine = normalizeFocus(focus)
    ? `Focus especially on this request: ${normalizeFocus(focus)}.`
    : "Focus on the most urgent, actionable, and blocked work.";

  return testchat
    ? [
        "You review internal portal request data for a single user.",
        "Return a concise plain-text analysis.",
        "Call out asks, deliverables, blockers, and urgency.",
        focusLine
      ].join(" ")
    : [SYSTEM_PROMPT, focusLine].join(" ");
}

export { RESPONSE_SCHEMA };

function normalizeFocus(focus) {
  return typeof focus === "string" && focus.trim() ? focus.trim() : null;
}
