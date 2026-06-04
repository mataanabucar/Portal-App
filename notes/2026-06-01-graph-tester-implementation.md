# Graph Tester Implementation

## Overview

Implemented a standalone Microsoft Graph tester app in this repo.

- separate runtime under `src/graph-tester/`
- separate browser launcher via `scripts/launch-graph-tester.js`
- reuses the existing Graph service layer only
- keeps tokens and secrets server-side in a local cache file under `.local-auth/`

## Main changes

### Backend

- added a dedicated tester config builder with separate host, port, redirect URI fallback, startup auto-login, and token cache file handling
- added a shared Graph function catalog and allowlist that covers every current Graph service export
- added a Graph auth store for OAuth state, token persistence, refresh-token renewal, startup browser login, and safe auth-status payloads
- added standalone routes for health, catalog, session, login, redirect, logout, and function execution

### Frontend

- added a standalone HTML/CSS/JS tester UI
- renders service and function selectors from the live catalog endpoint
- builds forms dynamically from field metadata
- shows mutation warnings and requires explicit confirmation for mutating functions
- renders readable result cards, tables, key-value summaries, and raw JSON

### Repo updates

- added `npm run graph-tester` and `npm run graph-tester:dev`
- added `scripts/manual-graph-oauth.ps1` to run the interactive auth-code flow manually and write a tester-compatible token cache file
- updated `.env.example` with Graph tester env vars
- updated `README.md` with standalone Graph tester setup and usage notes

## Verification run

Validated locally with ephemeral-port startup checks.

- standalone tester `/` returned HTML
- `/api/health` returned `app: "graph-tester"`
- `/api/graph-tester/session` returned unauthenticated state before login
- `/api/graph-tester/catalog` returned all 7 service groups
- unsupported function calls were rejected by the allowlist
- mutation calls were rejected when confirmation was missing
- invalid JSON payloads were rejected before execution
- protected calls returned a 401 login hint when no token was stored
- the original portal server still started and answered `/api/health`

## Notes

- live OAuth login and real Graph function execution still require the local Azure app registration and an interactive sign-in
- the tester now auto-attempts browser login at startup when no valid cached token can be reused
- the existing CLI Graph test script remains separate and still uses `GRAPH_REDIRECT_URI`
- `GRAPH_CLIENT_SECRET` is now treated as the shared global secret source: docs point to a Windows user environment variable, the manual PowerShell OAuth script reads that variable directly, and Graph auth error messages now reference that env var explicitly
- the standalone tester no longer falls back to `GRAPH_REDIRECT_URI`; it now defaults to `http://localhost:3069/auth/redirect` on its own port so OAuth callbacks cannot be sent to an unrelated listener on another port
- added friendly lookup support in the tester for user, chat, and message references so operators can search or target items by person name, chat topic/participant, or message subject instead of copying opaque IDs
