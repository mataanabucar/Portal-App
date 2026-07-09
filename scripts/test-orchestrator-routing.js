// Mock-based orchestrator tests. No live services required.
// Part 1: pure intent-router rule table.
// Part 2: orchestrator contract with injected mock providers.
// Output style matches scripts/smoke-test.js: "Label: <bool>" lines, exit 1 on
// any failure.

import { routeIntent, ROUTES } from "../src/server/services/orchestrator/intentRouter.js";
import { createOrchestrator } from "../src/server/services/orchestrator/index.js";
import { buildConfig } from "../src/server/config/env.js";

const results = [];

function check(label, actual) {
  const pass = Boolean(actual);
  results.push(pass);
  console.log(`${label}: ${pass}`);
  if (!pass) {
    console.log(`  (got: ${JSON.stringify(actual)})`);
  }
}

function checkRoute(label, input, expectedRoute, expectedGraphKind) {
  const routed = routeIntent(input);
  let pass = routed.route === expectedRoute;
  if (pass && expectedGraphKind) {
    pass = routed.graphIntent?.kind === expectedGraphKind;
  }
  results.push(pass);
  console.log(`${label}: ${pass}`);
  if (!pass) {
    console.log(
      `  (expected ${expectedRoute}${expectedGraphKind ? "/" + expectedGraphKind : ""}, got ${routed.route}${routed.graphIntent ? "/" + routed.graphIntent.kind : ""})`
    );
  }
}

console.log("== Part 1: intent router rule table ==");

const longPastedText =
  "Team sync notes. " +
  "We agreed the deployment window moves to Thursday. Priya owns the rollback runbook. " +
  "Marcus will confirm the SSL cert renewal with IT before Wednesday. QA signoff is pending on the invoice module. ".repeat(3);

checkRoute(
  "summary of pasted text -> summary_text",
  { prompt: `Summarize the notes below:\n${longPastedText}` },
  ROUTES.SUMMARY_TEXT
);

checkRoute(
  "action items from pasted text -> action_items",
  { prompt: `Extract the action items from the following:\n${longPastedText}` },
  ROUTES.ACTION_ITEMS
);

checkRoute(
  "summarize this conversation (with history) -> summary_conversation",
  {
    prompt: "Can you summarize our conversation so far?",
    history: [
      { role: "user", content: "how does the audit module work" },
      { role: "assistant", content: "It works like this..." }
    ]
  },
  ROUTES.SUMMARY_CONVERSATION
);

checkRoute(
  "summarize conversation without history falls through",
  { prompt: "Can you summarize our conversation so far?", history: [] },
  ROUTES.DOCS_KB
);

checkRoute(
  "recent emails -> graph/recent_emails",
  { prompt: "any new emails?" },
  ROUTES.GRAPH,
  "recent_emails"
);

checkRoute(
  "unread -> graph/unread_emails",
  { prompt: "do I have unread email in my inbox" },
  ROUTES.GRAPH,
  "unread_emails"
);

checkRoute(
  "email search -> graph/search_emails",
  { prompt: "find the email from Priya about invoices" },
  ROUTES.GRAPH,
  "search_emails"
);

checkRoute(
  "mutation ask -> graph/mutation_guidance",
  { prompt: "send an email to Bob about the outage" },
  ROUTES.GRAPH,
  "mutation_guidance"
);

checkRoute(
  "calendar -> graph/calendar_view",
  { prompt: "what meetings do I have today" },
  ROUTES.GRAPH,
  "calendar_view"
);

checkRoute(
  "profile -> graph/profile",
  { prompt: "who am I signed in as" },
  ROUTES.GRAPH,
  "profile"
);

checkRoute(
  "code question -> code",
  { prompt: "where is the audit save endpoint implemented" },
  ROUTES.CODE
);

checkRoute(
  "research question -> research",
  { prompt: "research why the ATS export fails intermittently" },
  ROUTES.RESEARCH
);

checkRoute(
  "itemContext forces research",
  { prompt: "what is going on with this one", itemContext: "Item 123: export failure" },
  ROUTES.RESEARCH
);

checkRoute(
  "docs question -> docs_kb",
  { prompt: "how does the SAFER permit workflow work" },
  ROUTES.DOCS_KB
);

checkRoute(
  "summarize the deployment policy (no pasted text) -> docs_kb",
  { prompt: "summarize the deployment policy" },
  ROUTES.DOCS_KB
);

checkRoute(
  "generic fallback -> docs_kb",
  { prompt: "hello there" },
  ROUTES.DOCS_KB
);

checkRoute(
  "roster question -> docs_kb",
  { prompt: "who is in super group a?" },
  ROUTES.DOCS_KB
);

checkRoute(
  "flow chart request -> docs_kb",
  { prompt: "can you show me super group a flow chart?" },
  ROUTES.DOCS_KB
);

{
  const routed = routeIntent({ prompt: "who is in super group a?" });
  check(
    "roster question matches keywords (not ambiguous fallback)",
    routed.matchedKeywords.length > 0
  );
}

{
  const routed = routeIntent({ prompt: "any new emails?" });
  check(
    "graph route carries matchedKeywords",
    Array.isArray(routed.matchedKeywords) && routed.matchedKeywords.length > 0
  );
}

console.log("\n== Part 2: orchestrator contract (mock services) ==");

const GSTUDIO_TEXT =
  "Super Group A has 17 members led by the platform team. This is the verbatim aris_search answer.";

const mockGennyStudio = {
  describe: () => ({ enabled: true, agentRef: "aris_search" }),
  invoke: async () => ({
    agentRef: "aris_search",
    sessionId: "sess-123",
    text: GSTUDIO_TEXT
  })
};

const mockKbService = {
  describe: () => ({ enabled: false })
};

const throwingGraphAuth = {
  getAccessToken: async () => {
    const error = new Error("No cached Graph token.");
    error.statusCode = 401;
    throw error;
  }
};

const mockTeamGptTasks = {
  describe: () => ({ provider: "teamgpt" }),
  summarizeText: async ({ text }) => ({
    text: `SUMMARY(${text.length} chars)`,
    model: "mock-model"
  }),
  summarizeConversation: async ({ messages }) => ({
    text: `CONVO SUMMARY(${messages.length} messages)`,
    model: "mock-model"
  }),
  // Simulates TeamGPT returning garbage instead of JSON.
  extractActionItems: async () => ({
    items: null,
    rawText: "Sure! Here are some tasks I noticed...",
    model: "mock-model",
    warning: "TeamGPT returned unparseable JSON for action-item extraction."
  }),
  parseFollowUps: async () => ({
    items: [{ title: "Confirm SSL cert", owner: "Marcus" }],
    rawText: "{}",
    model: "mock-model"
  })
};

const config = buildConfig({
  askProvider: "orchestrator",
  assistantModelMode: "orchestrator",
  openAiApiKey: "",
  orchestratorOpenAiFallbackEnabled: false,
  orchestratorOpenAiClarifyEnabled: false
});

const orchestrator = createOrchestrator(config, {
  gennyStudioService: mockGennyStudio,
  sourcebotService: { enabled: false, describe: () => ({ enabled: false }) },
  kbService: mockKbService,
  graphAuth: throwingGraphAuth,
  docsKbService: { describe: () => ({ enabled: false }) },
  teamGptAuthService: null,
  pendingActionStore: null,
  teamGptTasks: mockTeamGptTasks
});

{
  const res = await orchestrator.ask({ prompt: "how does the SAFER permit workflow work" });
  check("contract: answer === content", res.answer === res.content && res.answer.length > 0);
  check("contract: blocks is non-empty array", Array.isArray(res.blocks) && res.blocks.length > 0);
  check("contract: toolTrace[0] is intent_router", res.toolTrace?.[0]?.tool === "intent_router");
  check("contract: provider is gennystudio", res.provider === "gennystudio");
  check("contract: route is docs_kb", res.route === "docs_kb");
  check("gstudio text used verbatim (no re-synthesis)", res.answer === GSTUDIO_TEXT);
  check("gstudio session id in debug", res.debug?.gstudioSessionId === "sess-123");
  check("contract: sources normalized with kb type", res.sources?.[0]?.type === "kb");
}

{
  const res = await orchestrator.ask({ prompt: "any new emails?" });
  check("graph without token: sign-in guidance text", /sign in/i.test(res.answer));
  check("graph without token: no proposedActions leak", !("proposedActions" in res));
  check("graph route reported", res.route === "graph");
}

{
  const res = await orchestrator.ask({ prompt: "send an email to Bob about the outage" });
  check("graph mutation ask: guidance, nothing proposed", /explicit confirmation/i.test(res.answer));
}

{
  const longText = "Notes: ".concat("Priya owns rollback. Marcus checks certs. ".repeat(20));
  const res = await orchestrator.ask({ prompt: `Summarize the notes below:\n${longText}` });
  check("summary routes to teamgpt provider", res.provider === "teamgpt");
  check("summary block emitted", res.blocks?.some((b) => b.type === "summary"));
}

{
  const longText = "Notes: ".concat("Priya owns rollback. Marcus checks certs. ".repeat(20));
  const res = await orchestrator.ask({
    prompt: `Extract the action items from the following:\n${longText}`
  });
  check("bad-JSON action items degrade to text + warning trace",
    res.provider === "teamgpt" &&
    res.blocks?.every((b) => b.type === "text") &&
    res.toolTrace?.some((t) => /warning/.test(t.resultSummary || "")));
}

{
  // Code route with sourcebot disabled degrades to gennystudio.
  const res = await orchestrator.ask({ prompt: "where is the audit save endpoint implemented" });
  check("code route degrades to gennystudio when sourcebot disabled",
    res.provider === "gennystudio" &&
    res.toolTrace?.some((t) => /degraded/.test(t.resultSummary || "")));
}

{
  const res = await orchestrator.ask({ prompt: "" });
  check("empty prompt yields invalid route", res.route === "invalid");
}

{
  // KB fallback scopes the search with the upload marker (KB_UPLOAD_MARKER).
  let capturedQuery = "";
  const markerKbService = {
    describe: () => ({ enabled: true, authConfigured: true }),
    searchContentDetailed: async ({ query }) => {
      capturedQuery = query;
      return { data: [] };
    }
  };
  const fallbackOrchestrator = createOrchestrator(
    buildConfig({
      askProvider: "orchestrator",
      assistantModelMode: "orchestrator",
      kbUploadMarker: "mjabmllm",
      openAiApiKey: "",
      orchestratorOpenAiFallbackEnabled: false,
      orchestratorOpenAiClarifyEnabled: false
    }),
    {
      gennyStudioService: { describe: () => ({ enabled: false }) },
      sourcebotService: { enabled: false, describe: () => ({ enabled: false }) },
      kbService: markerKbService,
      graphAuth: null,
      docsKbService: { describe: () => ({ enabled: false }) },
      teamGptAuthService: null,
      pendingActionStore: null,
      teamGptTasks: mockTeamGptTasks
    }
  );
  await fallbackOrchestrator.ask({ prompt: "what does my uploaded onboarding doc say" });
  check(
    "KB fallback query includes upload marker",
    capturedQuery.startsWith("mjabmllm ") && capturedQuery.includes("onboarding")
  );
}

const failures = results.filter((r) => !r).length;
console.log(`\n${results.length - failures}/${results.length} checks passed`);
if (failures > 0) {
  process.exit(1);
}
