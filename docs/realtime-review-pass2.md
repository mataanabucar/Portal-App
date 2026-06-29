# Realtime Assistant — Codex Fix Pass 2

**Branch:** `realtime-interaction-attempt`
**Status:** Claude reviewed Codex's implementation. Architecture, backend route, session config (incl. `output_modalities: ["audio"]` — confirmed correct GA field), tool schemas, dispatch wiring, security, and mic teardown all passed. `npm --prefix frontend run build`, `node --check`, and `npm run smoke` are green.

This document is the handoff for Codex's next pass. **All changes are confined to `frontend/src/lib/realtimeAssistant.ts` unless noted otherwise.**

---

## Verified correct — do not change
- Backend route `POST /api/realtime/session` (route-scoped `express.text` parser, no body-parser conflict).
- Session config: `type:"realtime"`, `output_modalities:["audio"]`, `audio.input.transcription`, `audio.input.turn_detection:semantic_vad`, `audio.output.voice`, `tools`, `tool_choice`, `max_output_tokens`, conditional `reasoning.effort`.
- Safety identifier (deterministic hostname hash), `OPENAI_API_KEY` never sent to the browser, error path logs status only.
- Tool dispatch in the hook → existing `/api/*` routes; `/api/ask` payload shape (`answer`/`enabled`/`provider`/`model`) matches.
- `useEffectEvent` is available in React 19.2.4 (build compiles).
- `disconnect()` stops all mic tracks, closes pc/dc, detaches audio; hook disconnects on unmount.

---

## Fix 1 — Streaming transcript only shows the latest fragment (medium, UX)

**Problem:** `response.output_audio_transcript.delta`, `response.output_text.delta`, and `conversation.item.input_audio_transcription.delta` carry **incremental** chunks. The hook's `upsertRealtimeMessage` replaces the message by `itemId`, so mid-stream the dock flashes single fragments instead of the building sentence (it only corrects on `.done`).

**Do:** Accumulate deltas per `item_id` in the client.
- Add a buffer: `const transcriptBuffers = new Map<string, string>();` near the other client state.
- On a **delta** event: append the raw delta (`event.delta`, fall back to `event.text`) to the buffer for that `itemId`, then emit the **cumulative** text with `done:false`.
- On the matching **`.done` / `.completed`** event: emit the authoritative full text (`event.transcript`, fall back to the buffer) with `done:true`, then delete that buffer entry.
- Clear the whole buffer in `disconnect()`.

These delta events all include a stable `item_id`, so keyed accumulation is safe. The hook's replace-by-`itemId` logic then renders correctly with **no hook changes**.

---

## Fix 2 — Parallel tool calls send overlapping `response.create` (medium, edge)

**Problem:** `sendToolResult()` emits `function_call_output` **and** `response.create` per call. If the model emits two tool calls in one turn, the second `response.create` fires while the first response is still active → "conversation already has an active response" error.

**Do:**
- Split `sendToolResult()` into `sendFunctionCallOutput()` (sends the `function_call_output` item only) and a separate `response.create` trigger.
- Send `response.create` **only when `toolCallsInFlight` returns to 0** — call this from `processToolCall`'s `finally` block (guard on data channel being open).
- Change the `response.done` fallback loop to start every `processToolCall` **before** awaiting (push the promises, then `await Promise.all(...)`) so the in-flight counter spans the whole batch.

Single-tool behavior is unchanged (counter hits 0 → one `response.create`).

---

## Fix 3 — Streamed function-args buffer is dead (low)

**Problem:** `streamedFunctionArgs` is accumulated in `accumulateFunctionArgs` but never read.

**Do:** In the `response.function_call_arguments.done` case, use it as a fallback:
```ts
argumentsText: readFunctionArgs(event) || streamedFunctionArgs.get(callId) || ""
```

---

## Runtime check — no code change unless it fails

Dashboard context is injected as `conversation.item.create` with `role:"system"` (in `sendContextUpdate`). Confirm the GA Realtime API accepts **system-role** conversation items during the live mic test. If it rejects them, switch that single call to `role:"user"` (keep the existing context prefix).

---

## Validation — run before handing back

- [ ] `npm --prefix frontend run build` — compiles clean
- [ ] `node --check src/server/app.js`
- [ ] `npm run smoke`
- [ ] **Live mic test** (needs `OPENAI_REALTIME_ENABLED=true` + valid `OPENAI_API_KEY`):
  - [ ] Connect → mic permission prompt + audio reply
  - [ ] "What should I work on first?" answers from queue context
  - [ ] Trigger `get_queue_snapshot` / `research_item` / `refresh_queue` (active-tool indicator shows)
  - [ ] Deny mic permission → dock shows error, app does not crash
  - [ ] Disconnect → mic indicator off, all tracks stopped
  - [ ] Streaming transcript now builds smoothly (validates Fix 1)
  - [ ] System-role context accepted (validates the runtime check)

---

## Deliverables back from Codex
- Code changes only (expected: `frontend/src/lib/realtimeAssistant.ts`; plus `sendContextUpdate` role only if the runtime check fails).
- Note any Realtime event names/payload fields adjusted to match live OpenAI docs.
- Confirm all validation checks above.
