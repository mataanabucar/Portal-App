# Deterministic Orchestrator

The default engine behind `/api/ask` and `/api/assistant/chat`
(`ASK_PROVIDER=orchestrator`, `ASSISTANT_MODEL_MODE=orchestrator`). It routes
each question with a pure keyword router — no local or cloud reasoning model
chooses tools — and fans out to the org's hosted capabilities.

## Routing rules (ordered, first match wins)

Evaluated against the latest user message (`src/server/services/orchestrator/intentRouter.js`):

| # | Route | Trigger | Provider |
| --- | --- | --- | --- |
| R1 | `summary_text` | summarize/recap/tl;dr/key points AND pasted text detected | TeamGPT `summarizeText` |
| R2 | `action_items` | action items/follow-ups/next steps/to-dos AND pasted text | TeamGPT `extractActionItems` / `parseFollowUps` |
| R3 | `summary_conversation` | summarize verb + "this conversation/our chat/so far" + history | TeamGPT `summarizeConversation` |
| R4 | `graph` | email/inbox/outlook/unread/calendar/meeting/Teams chat/my profile | Microsoft Graph (read-only) |
| R5 | `code` | code/repo/source/function/endpoint/"where is X implemented" | Sourcebot `searchCode` |
| R6 | `research` | research/investigate/root cause/deep dive OR itemContext attached | Research pipeline (unchanged) |
| R7/R8 | `docs_kb` | docs/KB/policy/how-does-X-work — and the fallback for everything else | GennyStudio `aris_search` (raw KB fallback) |

Every response starts its `toolTrace` with an `intent_router` entry recording
the route, matched keywords, and (for graph) the sub-intent.

When GennyStudio is unavailable or returns nothing, the `docs_kb` route falls
back to a raw KB search scoped with `KB_UPLOAD_MARKER` (default `mjabmllm`) —
the marker present in every document the user uploads to the KB — so fallback
results come from the user's own uploads rather than the whole org KB. Set
`KB_UPLOAD_MARKER=` (empty) to disable the scoping.

## Graph route is read-only

`graphProvider.js` maps sub-intents (recent/unread/search emails, calendar
view, chat search, profile) onto allowlisted read-only catalog functions via
the shared `runGraphFunction` runner (`src/server/services/assistant/graphFunctionRunner.js`
— same validation and audit logging as the legacy assistant). Mutation-style
requests (send/reply/delete/schedule/...) get guidance text and never propose
or execute anything. Legacy chat mode's proposedActions + confirm flow is
untouched.

## Response contract

Both routes keep their legacy fields and add `blocks`, `sources`, `toolTrace`,
`provider`, `route`. Block shapes live in
`src/server/services/orchestrator/responseBlocks.js`; the frontend renderer is
`frontend/src/components/assistant/ResponseBlocks.tsx`.

- `/api/ask` → `{enabled, provider, model, reason, prompt, answer, debug, blocks, sources, toolTrace, route}`
- `/api/assistant/chat` → `{ok, content, answer, blocks, sources, proposedActions, toolTrace, provider, route, model, modelMode}`

## OpenAI usage policy

Allowed:
- Realtime speech I/O (`/api/realtime/session`); the Realtime model speaks a
  compressed version of the orchestrator's `orchestrate_assistant_request`
  tool result (full blocks go to the UI).
- `ORCHESTRATOR_OPENAI_CLARIFY_ENABLED=true` (default off): one clarifying
  question when nothing matched any route keyword.
- `ORCHESTRATOR_OPENAI_FALLBACK_ENABLED=true` (default off): general-chat
  answer only when the fallback route AND GennyStudio AND KB all came up empty.

Prohibited:
- OpenAI as the default KB answer engine, router, or summarizer.
- Re-summarizing GennyStudio `aris_search` output with OpenAI (its text is
  always used verbatim).
- OpenAI summaries/action items when TeamGPT is available.

## Legacy local Ollama/RAG

Archived behind `LEGACY_LOCAL_RAG_ENABLED=true` — see
`docs/local-rag-assistant.md`. Without the flag, env-derived
`ASSISTANT_MODEL_MODE=local` / `ASSISTANT_EMBEDDING_MODE=local` /
`ASK_PROVIDER=local` are coerced to `orchestrator`/`disabled` with a console
warning, no Ollama client is constructed, and docsKb/codeKb are disabled stubs.

## Auth

TeamGPT, GennyStudio, and KB all share ONE Playwright-scraped genai-proxy JWT
from `teamGptAuthService` (`.local-auth/teamgpt-token.json`). Check it with
`GET /api/teamgpt/auth`. Graph needs a cached sign-in
(`npm run graph-tester`). Sourcebot needs `SOURCEBOT_HOST` + `SOURCEBOT_API_KEY`.

## Testing

- `npm run test:orchestrator` — offline, mock-based: router rule table +
  response contract + degradation paths.
- `./scripts/test-orchestrator.ps1 -Action <ask|askTeamgpt|askLocal|chat|chatSummary|chatActions|graphAsk|research|modelStatus>`
  — against a running server (`npm run server:dev`).
