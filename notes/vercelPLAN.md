# Phase 1: Standalone Vercel Parser App

## Summary
- Build a fully isolated Next.js TypeScript API-only app at `vercel/portal-ai-parser-api/` that calls OpenAI directly with the official `openai` package and the Responses API.
- Do not integrate it into the current Portal App yet: no main-app route swap, no main-app env wiring, no UI changes, and no root `package.json` script changes in this phase.
- Make the sub-app deployable by `npx vercel` from its own folder only, with no GitHub repo creation or GitHub connection.

## Implementation Changes
- Create the requested subfolder files, plus a minimal `app/layout.tsx` because Next App Router requires a root layout even for an API-only app.
- Keep the sub-app self-contained: no imports from outside `vercel/portal-ai-parser-api`.
- Add sub-app scripts for `dev`, `build`, `start`, `typecheck`, `deploy`, and `prod`. Set local dev to port `3010` so it does not collide with the main Portal App on `3000`.
- `GET /api/health`:
  - Return a small JSON health payload such as `ok`, `app`, `now`, `openAiConfigured`, and `modelDefault`.
  - Do not expose secrets.
- `POST /api/portal/parse`:
  - Read the raw request body as text first, reject bodies over `3,800,000` characters with `413`, then parse JSON.
  - Validate `body.requests` is present and an array; return `400` for malformed JSON or invalid shape.
  - Accept optional `focus` and optional `model`; if `model` is absent, use `process.env.OPENAI_MODEL || "gpt-5.4"`.
  - Never log raw portal payload text.
  - Call OpenAI exactly once per batch with `store: false`.
  - Use strict JSON schema output for the model response.
- Request payload contract for this phase:
  - `requests[]` items should be plain JSON objects with these fields: `id`, `title`, `requester`, `assignedLead`, `dueDate`, `portalUrl`, `application`, `business`, `statusText`, `requestDetails`, `requestHistory`.
  - All fields are strings; `requests` is required; `focus` and `model` are optional strings.
- Response contract:
  - Return `{ ok: true, model, result }`.
  - `result.summary` includes `total`, `urgentCount`, `blockedCount`, `overdueCount`, `oldestDueDate`, `topConcerns[]`, `recommendedFocus`.
  - `result.requests[]` includes `id`, `title`, `requester`, `assignedLead`, `dueDate`, `urgency`, `status`, `ask`, `deliverables[]`, `blockers[]`, `nextAction`, `confidence`, `portalUrl`.
- Internal model/output design:
  - Have the model return one analysis item per input request in the same order.
  - Compute `summary.total`, `urgentCount`, `blockedCount`, `overdueCount`, and `oldestDueDate` server-side from the final request list so counts always match the returned items.
  - Use the model for `topConcerns`, `recommendedFocus`, and per-request analysis fields like `urgency`, `status`, `ask`, `deliverables`, `blockers`, `nextAction`, and `confidence`.
- Documentation:
  - Add `.env.example` with `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.4`.
  - Add a sub-app `README.md` with install, local run, preview deploy, production deploy, Vercel env setup, and exact sample `curl` or `Invoke-RestMethod` calls for both routes.
  - Add a short repo note under `notes/` for this standalone build phase.

## Test Plan
- In `vercel/portal-ai-parser-api/`, run `npm install`, `npm run build`, and `npm run typecheck`.
- Run the sub-app locally and verify:
  - `GET /api/health` returns `200`.
  - `POST /api/portal/parse` with a valid sample batch returns `200` and the strict result shape.
  - Oversized body returns `413`.
  - Missing or non-array `requests` returns `400`.
  - Invalid JSON returns `400`.
- Verify one-batch behavior by keeping the route implementation to a single `client.responses.create(...)` call per request.
- Confirm Vercel CLI deployment works from `vercel/portal-ai-parser-api/` with `npx vercel` and `npx vercel --prod`, without any GitHub integration step.

## Deferred To Phase 2
- Main Portal App integration.
- Root-level scripts `vercel-api:dev`, `vercel-api:deploy`, and `vercel-api:prod`.
- Main-app env vars such as a deployed parser URL.
- Local proxy wiring from `/api/dashboard` and `/api/portal/parse` to the deployed Vercel endpoint.
- Removing or replacing the current parser test-chat control in the dashboard UI.

## Assumptions
- This phase is intentionally standalone so you can refine prompt/schema behavior before touching the main app.
- The target OpenAI project has access to `gpt-5.4`; if not, set `OPENAI_MODEL` to an allowed model without changing code.
- `confidence` should be a numeric `0..1` value in the strict schema.
- `oldestDueDate` should preserve the original date string from the oldest parseable due date; return an empty string if none are parseable.

## References
- Next.js App Router route handlers: https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware
- Next.js root layout requirement: https://nextjs.org/docs/app/building-your-application/routing/defining-routes
- OpenAI Responses API structured JSON output: https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses
