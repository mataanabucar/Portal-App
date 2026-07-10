# Deterministic Orchestrator — Archive Ollama/Local RAG Defaults

## Overview

Replaced the local Ollama/RAG assistant defaults with a deterministic
keyword-routed orchestrator that fans out to GennyStudio/KB (`aris_search`),
TeamGPT (summaries/action items), Sourcebot (code search), Microsoft Graph
(read-only M365 lookups), and the existing research pipeline. Local
Ollama/local embedding RAG is archived behind `LEGACY_LOCAL_RAG_ENABLED=true`.
Both `/api/ask` and `/api/assistant/chat` now default to the orchestrator and
return a structured `blocks` contract (additive — all legacy fields kept).
OpenAI is speech-I/O only by default (two off-by-default hooks: fallback +
clarify).

## Files changed

New:
- `src/server/services/orchestrator/responseBlocks.js` — shared block contract helpers
- `src/server/services/orchestrator/intentRouter.js` — pure keyword router (R1–R8) + graph sub-intents
- `src/server/services/orchestrator/index.js` — createOrchestrator (routing, degradation, OpenAI policy hooks)
- `src/server/services/orchestrator/providers/gennyStudioKbProvider.js`
- `src/server/services/orchestrator/providers/sourcebotProvider.js`
- `src/server/services/orchestrator/providers/graphProvider.js` — read-only; mutations → guidance text
- `src/server/services/orchestrator/providers/teamGptProvider.js`
- `src/server/services/orchestrator/providers/researchProvider.js`
- `src/server/services/teamgpt/tasks.js` — summarizeText/summarizeConversation/extractActionItems/parseFollowUps
- `src/server/services/assistant/graphFunctionRunner.js` — runGraphFunction + audit log extracted from controller.js
- `src/server/services/disabledStubs.js` — disabled docsKb/codeKb stand-ins
- `frontend/src/components/assistant/ResponseBlocks.tsx` — block renderer (no dangerouslySetInnerHTML)
- `scripts/test-orchestrator-routing.js` — offline mock test suite (34 checks)
- `scripts/test-orchestrator.ps1` — curl.exe endpoint matrix vs a running server
- `docs/orchestrator.md`

Modified:
- `src/server/config/env.js` — orchestrator/disabled modes (new defaults), `LEGACY_LOCAL_RAG_ENABLED`, local-mode coercion (env-derived only; programmatic overrides exempt), optional `TEAMGPT_SUMMARY_*`/`TEAMGPT_ACTION_*`, `ORCHESTRATOR_OPENAI_FALLBACK/CLARIFY_ENABLED`
- `src/server/index.js` — docsKb/codeKb behind embedding mode (stubs otherwise), no modelProvider in orchestrator mode, orchestrator wired into createApp
- `src/server/app.js` — buildAskPayload orchestrator/local-archived branches + additive fields; `/api/assistant/chat` orchestrator mode (no Graph sign-in needed for non-Graph routes); model-status orchestrator shape; `orchestrate_assistant_request` added to REALTIME_TOOLS
- `src/server/services/assistant/controller.js` — imports runGraphFunction/logAction from graphFunctionRunner.js (behavior identical)
- `package.json` — `rag:*` → `legacy:rag:*`; added `test:orchestrator`
- `.env.example` — orchestrator defaults, LEGACY block, SOURCEBOT_* lines added
- `frontend/src/lib/assistantChat.ts` — ResponseBlock union; widened source types + modelMode
- `frontend/src/components/assistant/AssistantChatPanel.tsx` — blocks rendering; orchestrator status chip
- `frontend/src/hooks/useRealtimeAssistant.ts` — orchestrate_assistant_request runner + speakable-answer compressor
- `README.md`, `docs/local-rag-assistant.md` — legacy banner + new architecture docs

## Change summary

- Router rules (first match): summary/action-items over pasted text → TeamGPT;
  conversation summary → TeamGPT; mail/calendar/Teams/profile → Graph
  (read-only catalog calls via the shared runner; mutation verbs get guidance
  text, nothing proposed); code → Sourcebot searchCode; research/itemContext →
  research pipeline; docs/KB + fallback → GennyStudio `aris_search` with raw-KB
  fallback. `aris_search` text is always used verbatim (never re-summarized).
- `/api/ask` keeps `enabled/provider/model/reason/prompt/answer/debug`;
  `/api/assistant/chat` keeps `ok/content/sources/proposedActions/toolTrace/
  model/modelMode`; both add `blocks/sources/toolTrace/provider/route`.
  Explicit `provider` in the request body still bypasses the orchestrator.
- `ASK_PROVIDER=local`/`ASSISTANT_MODEL_MODE=local`/`ASSISTANT_EMBEDDING_MODE=local`
  from env are coerced (console warning) unless `LEGACY_LOCAL_RAG_ENABLED=true`.
- KB fallback searches are scoped with `KB_UPLOAD_MARKER` (default
  `mjabmllm` — the marker present in every doc the user uploads to the KB),
  so fallback hits come from the user's uploads, not the whole org KB.
  Config: `kbUploadMarker` in env.js; used in
  `gennyStudioKbProvider.js` `runKbFallback`; empty string disables.

## Validation

- `node --check` on every touched server file — pass.
- `npm run test:orchestrator` — 35/35 (router rule table; contract keys;
  KB-fallback marker scoping;
  aris_search verbatim pass-through; graph sign-in degradation; mutation
  guidance; bad-JSON TeamGPT degradation; sourcebot-disabled degradation).
- `npm run smoke` — all checks pass except "Disabled parser fallback shape OK:
  false", which was verified pre-existing by running the same suite on a clean
  HEAD worktree (fails there too; unrelated parser shape issue).
- `npm --prefix frontend run build` — compiled + TypeScript clean.
- Live server checks (server on :3000, real .env with cached Graph + TeamGPT
  tokens), all via `scripts/test-orchestrator.ps1`:
  - `modelStatus` → `chat.mode:"orchestrator"`, all providers reported.
  - `askLocal` → archived reason, `enabled:false`, `route:"legacy_local"`.
  - chat "send an email to Bob" → mutation guidance, `proposedActions:[]`.
  - `graphAsk` → real inbox (10 emails) via `mail.listInboxMessages`, table block.
  - chat "how does the audit module work" → real `aris_search` answer passed
    through verbatim (`gstudio_invoke` trace, kb source, sessionId in debug).
  - `chatSummary` → TeamGPT summary block; `chatActions` → 4 structured action
    items with owners/dueDates.
  - `ask` default → `provider:gennystudio route:docs_kb debug.mode:orchestrator`.
  - `research` → all legacy keys present (report/codeFindings/kbFindings/
    docsFindings/retrievalTrail/gstudioSessionId/chatUrl).
- Note: root `node_modules` was accidentally emptied during a temp-worktree
  cleanup mid-session and restored with `npm install` (202 packages, lockfile
  unchanged). No repo source files were affected.

## Follow-up

- Pre-existing smoke failure "Disabled parser fallback shape OK" (parser
  fallback returns a shape with `overview`/non-empty items) — unrelated to
  this change, worth a separate look.
- Optional vision/image understanding for user screenshots (allowed by the
  OpenAI policy) not implemented — no upload path exists in the chat panel yet.
- Portal parser transient failure ("Portal parser returned invalid JSON",
  502s the whole dashboard): diagnosed as a pre-existing TeamGPT model
  formatting flake in `src/server/services/ai/portalParser.js`
  `parseStructuredOutput` — reproduced healthy on both mock and live paths
  afterward. Proposed (not yet implemented): retry-once on invalid JSON +
  degrade `/api/dashboard` to `parser:{error}` instead of 502.

## Addendum (same session): research markdown + mermaid rendering

- `frontend/src/components/research/ResearchModal.tsx` — Genny Studio
  (`aris_search`) findings (`finding.language === "Genny Studio"`) now render
  through the existing `MarkdownBody` (formatted prose) instead of the
  monospace `<pre>`; code/KB findings unchanged. `MarkdownBody` also renders
  ```mermaid fences as live diagrams (and skips the `<pre>` wrapper for them).
- `frontend/src/components/MermaidDiagram.tsx` (new) — lazy-imports `mermaid`
  (keeps it out of the main bundle), `securityLevel: "strict"`, dark theme,
  renders to inline SVG with a raw-source fallback on parse errors. The
  injected SVG comes from mermaid's own sanitized renderer.
- `frontend/src/components/assistant/ResponseBlocks.tsx` — text blocks now
  detect ```mermaid fences and render them as diagrams (`TextWithDiagrams`).
- `mermaid` added to `frontend/package.json` (it was only in the root package,
  unreachable from the Next app).
- Validation: `npm --prefix frontend run build` — compiled + TypeScript clean
  after each change.

## Addendum 2 (same session): Super Group A voice failure — fixes

Diagnosis: voice ask "super group a flow chart" failed twice — (1) the
Realtime instructions never mentioned `orchestrate_assistant_request` or
org-structure questions, so the model answered from its own knowledge;
(2) plain "super group a" ranks poorly against the whole org KB (671 hits,
unrelated top hit) while the user's upload (contentid 3614, title "mjabmllm",
the org CSV) matches the marker search at 0.85. Verified via
`/api/kb/searchContent`.

Fixes:
- `src/server/app.js` `buildRealtimeAssistantInstructions` — internal docs +
  org-structure questions (org charts, rosters, Super Groups, scopes,
  policies) now steer to `orchestrate_assistant_request`; explicit "Super
  Groups are NOT Microsoft 365 groups" rule (mirrors the legacy text-chat
  prompt); flow-chart/diagram guidance. Applies on next voice session connect.
- `gennyStudioKbProvider.js` `buildPrompt` — appends a hint telling
  aris_search to search for the `KB_UPLOAD_MARKER` when the direct search
  finds nothing.
- `intentRouter.js` DOCS_TERMS — added org-structure/diagram keywords
  (org chart, roster, "who is in", "members of", "reports to", super group,
  group/team lead, flow chart, workflow, diagram) so these aren't ambiguous
  fallbacks.
- `orchestrator/index.js` — clarify hook no longer pre-empts the KB: both
  OpenAI hooks (clarify preferred over fallback) now run ONLY after the
  fallback-route KB answer came back empty. (Found live: user had
  ORCHESTRATOR_OPENAI_CLARIFY_ENABLED=true and "who is in super group a?"
  was intercepted by OpenAI clarify before GennyStudio ran.)
- `frontend/src/components/assistant/ResponseBlocks.tsx` — text blocks now
  render as markdown (react-markdown + remark-gfm, JSX-only output) so KB
  answers show headings/tables/links as formatted HTML in the chat panel;
  ```mermaid fences render as diagrams inside markdown too.

Validation: `npm run test:orchestrator` 38/38; live: "who is in super group
a?" → gennystudio/docs_kb, full 32-person roster; "can you show me super
group a flow chart?" → gennystudio/docs_kb org+app breakdown.
`npm --prefix frontend run build` clean.

Follow-up: upload `docs/Super_Group_A_App_Context_Package/Super_Group_A_Mermaid_Diagrams.mmd`
into the KB (marked mjabmllm) so diagram requests return actual ```mermaid
fences the UI now renders; KB MCP server currently unauthenticated (login
redirect) so this needs a manual upload or a re-auth.

## Addendum 3 (same session): start-all.bat

Added `start-all.bat` — one-shot full startup: frees ports (3000/3011/3069/
3070), runs `npm install` in root and frontend when node_modules is missing
(guards against the mid-session wipe), checks for the Graph sign-in cache and
offers a one-time `npm run graph-tester` login (15s prompt, defaults to skip)
when absent, then `npm run dev` (backend + frontend + browser). Complements
the existing `dev.bat` (ports + dev only) by adding the dep-install and Graph
auth guards. Graph tokens auto-refresh after the first sign-in; TeamGPT/Genny/
KB share a JWT scraped on demand — no bat step needed.

Validation: ran a stubbed copy (taskkill + npm stubbed out) — all
file-existence branches, the port loop, and the path to `npm run dev`
evaluated correctly; confirmed `.local-auth/graph-tester-token.json` is
currently present. Did not run start-all.bat live (its port-kill would
terminate the user's active dev server).

## Addendum 4 (same session): Genny Assistant dock refinement pass

Corrections to the two-pane dock redesign after user testing (frontend only):

- `frontend/src/components/assistant/RealtimeAssistantDock.tsx`
  - Header rebuilt as two mockup-matching flex rows of h-11 pills (row 1:
    VOICE|TEXT · status · persona preset · MIC CLEANUP; row 2: Start session ·
    Stop (only while speaking) · Mute · Clear log · CONCISE|DETAILED ·
    Citations). Stacked "Persona"/"Response length" labels removed.
  - MIC CLEANUP toggle now fills cyan when open (same active styling as the
    response-length segments).
  - Mic cleanup panel moved out of the header into an absolutely-positioned
    overlay (right-aligned, own max-height + scroll) so opening it never
    resizes the conversation or overflows the modal.
  - Conversation is now the modal's single scroll region (`conversationRef`,
    flex-1): EmailConfirmation/error/log all live inside it; the voice log's
    nested scroll box was removed and `AssistantChatPanel` renders `embedded`.
  - Autoscroll fixed: was force-jumping to the bottom every frame because the
    mic meter re-renders the dock ~60fps and the effect was keyed on a
    rebuilt-array identity. Now `voiceTimeline`/`suggestedActions` are
    `useMemo`ed, the effect keys on a stable content signal
    (`buildTimelineSignal`), and it only sticks to bottom when the user is
    already near it (`onScroll` + `isNearBottomRef`, 80px threshold).
  - `VoiceConversationLog` wrapped in `React.memo` (stable entries) so mic
    frames skip the conversation subtree entirely.
  - Suggested actions compacted per the user's manual DOM tweak: wrapper
    `px-2 py-2`, section `p-1`, header row `px-3`; collapsed helper text
    removed. Dead `TopSettingsBar`/`PanelSection` components deleted.
  - Stop button added to the collapsed quick bar too.
- `frontend/src/lib/realtimeAssistant.ts` — client `cancelResponse()` sends
  `response.cancel` over the data channel (interrupts speech generation;
  already-buffered audio may finish its last moment).
- `frontend/src/hooks/useRealtimeAssistant.ts` — `stopResponse()` wraps
  `cancelResponse` and flips `speaking` → `listening`; returned by the hook.
- `frontend/src/components/assistant/AssistantChatPanel.tsx` — new `embedded`
  prop: parent owns the single scroll region + autoscroll; panel renders
  bubbles directly (standalone behavior unchanged).
- `frontend/src/components/MermaidDiagram.tsx` — `React.memo` on `code` so
  rendered SVGs don't churn on mic-meter frames.

Validation: `npm --prefix frontend run build` — compiled + TypeScript clean.
Manual checks still to run in the browser: scroll-up stays put while the bot
streams, mic overlay doesn't shift layout, Stop interrupts speech, top bar
matches the mockup.
