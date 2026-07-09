# Portal Visualizer Localhost App

Portal Visualizer is a browser-based localhost app for reviewing Benchmark portal work queue data, enriching it with local services, and using optional AI/Graph helpers.

The app runs as two local services:

- Express backend on `http://127.0.0.1:3000`
- Next.js frontend on `http://localhost:3011`

## Quick Start

```powershell
copy .env.example .env
npm install
npm --prefix frontend install
npm run dev
```

`npm run dev` starts the backend in watch mode, starts the frontend dev server, and opens the browser when the backend is ready.

## Common Commands

```powershell
npm run dev
npm run server
npm run server:dev
npm run graph-tester
npm run graph-tester:dev
npm run graph-tester:client
npm run graph-tester:client:build
npm run graph:capabilities
npm run bundle:localhost
npm run smoke
```

- `npm run dev`: starts backend watch mode plus the Next frontend dev server.
- `npm run server`: starts only the backend.
- `npm run server:dev`: starts only the backend with `node --watch`.
- `npm run graph-tester`: starts the standalone Microsoft Graph tester.
- `npm run graph-tester:dev`: starts the Graph tester with `node --watch`.
- `npm run graph-tester:client`: starts the separate Graph tester client package.
- `npm run graph-tester:client:build`: builds the separate Graph tester client.
- `npm run graph:capabilities`: prints the current Graph capability report.
- `npm run bundle:localhost`: builds a shareable localhost ZIP.
- `npm run smoke`: runs the backend smoke scenarios.

## Ports

| Service | Default URL | Notes |
| --- | --- | --- |
| Backend | `http://127.0.0.1:3000` | Express API and portal connectors |
| Frontend | `http://localhost:3011` | Next.js app that proxies `/api/*` |
| Graph Tester | `http://127.0.0.1:3069` | Standalone Microsoft Graph tester |

The frontend proxies API calls through `frontend/src/app/api/[...path]/route.ts`. Set `BACKEND_URL` only when the backend is running somewhere other than `http://127.0.0.1:3000`.

## Project Layout

```text
frontend/                  Next.js frontend
public/                    Legacy browser dashboard assets
scripts/                   Local launchers, smoke tests, bundle builder
src/server/                Express backend, API routes, services
src/graph-tester/          Standalone Microsoft Graph tester
docs/                      Local app and system documentation
resources/                 Runtime support assets
```

## Configuration

The repo root `.env` is the source of truth for local development.

Start from:

```powershell
copy .env.example .env
```

### Portal Connector Modes

- `mock`: returns sample records so the full pipeline can be tested without a live portal.
- `http-json`: fetches JSON from a portal endpoint or internal API.
- `http-html`: fetches an HTML page and extracts content with CSS selectors.
- `cookie-html`: fetches authenticated HTML using a saved cookie cache and only opens a browser when auth must be refreshed.
- `browser-html`: opens or attaches to a real local browser profile and extracts authenticated rendered content.

### Basic Validation

```env
PORTAL_SOURCE_MODE=mock
DASHBOARD_CACHE_FILE=.local-state/dashboard-cache.json
```

### JSON Endpoint Mode

```env
PORTAL_SOURCE_MODE=http-json
PORTAL_TARGET_URL=https://your-portal.example.com/api/items
PORTAL_HEADERS_JSON={"Accept":"application/json"}
PORTAL_DATA_PATH=items
```

### HTML Page Mode

```env
PORTAL_SOURCE_MODE=http-html
PORTAL_TARGET_URL=https://your-portal.example.com/worklist
PORTAL_COOKIE=your_session_cookie_here
PORTAL_ITEM_SELECTOR=table tbody tr
PORTAL_TITLE_SELECTOR=td:nth-child(1)
PORTAL_STATUS_SELECTOR=td:nth-child(2)
PORTAL_DETAIL_SELECTOR=td:nth-child(3)
```

### Linked Request Table Mode

```env
PORTAL_SOURCE_MODE=http-html
PORTAL_TARGET_URL=https://tools.benchmarkdigital.com/gsportal/index_old.cfm
PORTAL_COOKIE=your_authenticated_cookie_here
PORTAL_FRAME_SELECTOR=iframe[src*="todolist"]
PORTAL_ITEM_SELECTOR=tr:has(a[href*="editid="])
PORTAL_LINK_SELECTOR=a[href*="editid="]
PORTAL_TITLE_SELECTOR=a[href*="itemhm"]
PORTAL_FOLLOW_DETAIL_LINKS=true
PORTAL_MAX_DETAIL_PAGES=10
PORTAL_DETAIL_CONTENT_SELECTOR=body
```

### Background Cookie Mode

```env
PORTAL_SOURCE_MODE=cookie-html
PORTAL_TARGET_URL=https://tools.benchmarkdigital.com/gsportal/index_old.cfm
PORTAL_COOKIE_CACHE_FILE=.local-auth/portal-cookie-cache.json
PORTAL_FRAME_SELECTOR=iframe[src*="todolist"]
PORTAL_ITEM_SELECTOR=tr:has(a[href*="editid="])
PORTAL_LINK_SELECTOR=a[href*="editid="]
PORTAL_TITLE_SELECTOR=a[href*="itemhm"]
PORTAL_FOLLOW_DETAIL_LINKS=true
PORTAL_DETAIL_CONTENT_SELECTOR=body
PLAYWRIGHT_EXECUTABLE_PATH=C:\Users\700000347\AppData\Local\Google\Chrome Beta\Application\chrome.exe
PLAYWRIGHT_USER_DATA_DIR=C:\Users\700000347\AppData\Local\Google\Chrome Beta\User Data
PLAYWRIGHT_HEADLESS=false
```

The backend checks the in-memory cookie cache first, then `PORTAL_COOKIE_CACHE_FILE`. If both are missing or expired, it opens a local browser to refresh auth and writes the refreshed cookie snapshot under `.local-auth`.

### Browser-Backed Authenticated Mode

```env
PORTAL_SOURCE_MODE=browser-html
PORTAL_TARGET_URL=https://tools.benchmarkdigital.com/gsportal/index_old.cfm
PORTAL_FRAME_SELECTOR=iframe[src*="todolist"]
PORTAL_ITEM_SELECTOR=tr:has(a[href*="editid="])
PORTAL_LINK_SELECTOR=a[href*="editid="]
PORTAL_TITLE_SELECTOR=a[href*="itemhm"]
PORTAL_FOLLOW_DETAIL_LINKS=true
PORTAL_DETAIL_CONTENT_SELECTOR=body
PLAYWRIGHT_EXECUTABLE_PATH=C:\Users\700000347\AppData\Local\Google\Chrome Beta\Application\chrome.exe
PLAYWRIGHT_USER_DATA_DIR=C:\Users\700000347\AppData\Local\Google\Chrome Beta\User Data
PLAYWRIGHT_HEADLESS=false
```

`npm run open:portal-profile` opens the profile path configured in `.env`.

### Attach To Existing Chrome Beta Session

```env
PORTAL_SOURCE_MODE=browser-html
PORTAL_TARGET_URL=https://tools.benchmarkdigital.com/gsportal/index_old.cfm
PORTAL_FRAME_SELECTOR=iframe[src*="todolist"]
PORTAL_ITEM_SELECTOR=tr:has(a[href*="editid="])
PORTAL_LINK_SELECTOR=a[href*="editid="]
PORTAL_TITLE_SELECTOR=a[href*="itemhm"]
PORTAL_FOLLOW_DETAIL_LINKS=true
PLAYWRIGHT_EXECUTABLE_PATH=C:\Users\700000347\AppData\Local\Google\Chrome Beta\Application\chrome.exe
PLAYWRIGHT_CONNECT_TO_EXISTING=true
PLAYWRIGHT_DEVTOOLS_ACTIVE_PORT_FILE=C:\Users\700000347\AppData\Local\Google\Chrome Beta\User Data\DevToolsActivePort
PLAYWRIGHT_HEADLESS=false
```

This uses the running browser's CDP socket instead of launching another profile. If the browser does not expose a CDP socket, use the mirrored local launch mode above.

## AI Providers

The app has separate AI paths. Do not assume one setting controls all model traffic.

- `/api/ask` uses `ASK_PROVIDER`.
- `/api/assistant/chat` uses `ASSISTANT_MODEL_MODE`.
- Parser and summary behavior use their own provider settings in `src/server/config/env.js`.

Local assistant defaults:

```env
ASK_PROVIDER=local
ASSISTANT_MODEL_MODE=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama3.2:3b
LOCAL_LLM_API_KEY=ollama
```

OpenAI summary is opt-in:

```env
OPENAI_ENABLED=true
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_ALLOW_TESTCHAT=true
```

OpenAI requests use `store: false` where supported.

## Portal Parser

The backend exposes `POST /api/portal/parse`.

This uses the live portal snapshot as model input and supports:

- structured mode: sends the portal snapshot through a JSON-schema parser and returns normalized request items
- `testchat` mode: bypasses the parser schema and returns raw assistant text

Example:

```json
{
  "focus": "Extract the concrete asks and next actions for each request.",
  "testchat": true
}
```

## Microsoft Graph Tester

The standalone Graph tester is used for Microsoft 365 auth and API testing. It reuses the Graph service layer under `src/server/services/graph/`.

Required Graph app values:

```env
GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_SCOPES=User.Read Mail.Read Calendars.Read Chat.Read People.Read MailboxSettings.ReadWrite offline_access
```

Optional tester settings:

```env
GRAPH_TESTER_HOST=127.0.0.1
GRAPH_TESTER_PORT=3069
GRAPH_TESTER_REDIRECT_URI=
GRAPH_TESTER_TOKEN_CACHE_FILE=.local-auth/graph-tester-token.json
GRAPH_TESTER_AUTO_LOGIN_ON_STARTUP=true
```

If `GRAPH_TESTER_REDIRECT_URI` is blank, the tester uses `http://localhost:3069/auth/redirect`.

Start it with:

```powershell
npm run graph-tester
```

Then open:

```text
http://127.0.0.1:3069
```

Auth notes:

- The tester stores tokens under `.local-auth/graph-tester-token.json`.
- Token secrets stay server-side.
- The UI receives safe token metadata only.
- If `GRAPH_SCOPES` changes, delete `.local-auth/graph-tester-token.json` and sign in again.
- Mutating Graph functions require explicit confirmation in the tester UI.

## Localhost Shareable Bundle

Build a ZIP that runs the app on localhost with Node.js:

```powershell
npm run bundle:localhost
```

Output:

```text
dist\localhost-shareable\Portal Visualizer Localhost Standalone.zip
```

The bundle includes the backend runtime, built frontend output, production dependencies, Graph tester runtime, launchers, and the root `.env`.

## Validation

Use these checks before handing off changes:

```powershell
node --check scripts/build-localhost-shareable-bundle.js
npm --prefix frontend run lint
npm run smoke
```

For a live run:

```powershell
npm run dev
```

Open:

```text
http://localhost:3011
```
