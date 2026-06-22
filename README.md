# Portal Visualizer Desktop Shell

This project is now designed to run primarily as a local Electron desktop shell, not as a browser-tab app.

The shell still uses the same backend routes and frontend code internally, but normal use should be through the desktop window:

1. Pull portal data from a configurable source.
2. Normalize it into a predictable snapshot.
3. Optionally send that snapshot to OpenAI for summarization.
4. Show the result in a self-contained local app shell.

## Why this shape

The first goal is not a polished dashboard. The first goal is confidence that a local app can reliably:

- connect to the portal,
- extract useful data,
- keep the extraction code isolated from presentation code, and
- summarize internal details only when explicitly enabled.

That is why the app is backend-first with a thin frontend, wrapped in a desktop shell for day-to-day use.

## Current connector modes

- `mock`: returns sample records so the full pipeline can be tested immediately.
- `http-json`: fetches JSON from a portal endpoint or internal API.
- `http-html`: fetches an HTML page and extracts content with CSS selectors.
- `cookie-html`: runs `http-html` in the background with a saved cookie cache, and only opens a browser window again when those cookies expire and must be refreshed.
- `browser-html`: opens the portal in a real local browser profile and extracts authenticated content from the rendered page.

For your Benchmark portal use case, `cookie-html` is now the practical default because it keeps normal dashboard refreshes silent and background-only while still giving the app a recovery path when auth expires.

## Quick start

```powershell
copy .env.example .env
npm install
npm start
```

Or double-click:

```text
Launch Portal Visualizer.cmd
```

Normal use should stay in the Electron window. Opening `http://127.0.0.1:3000` in a browser is now a debugging-only fallback, not the primary workflow.

## Primary mode

The primary supported mode is the Electron shell.

### Why this mode

- no browser-tab workflow in normal use
- no installer required for the unpacked shell
- internal app traffic is loopback-only on `127.0.0.1`
- no inbound LAN exposure for the embedded app server
- current UI and backend behavior stay intact

### Launch from the working folder

Fastest path for daily local use:

What it does:

- if a current unpacked shell is missing or stale, the launcher rebuilds it automatically
- if the project root contains `.env`, the launcher mirrors it next to the unpacked shell before startup
- it then launches the unpacked native shell from `dist\win-unpacked\Portal Visualizer.exe`
- the desktop app starts the existing local server inside the shell and loads it in the native window
- writable runtime data stays under the Electron user-data folder
- the last successful dashboard refresh is persisted under `.local-state/dashboard-cache.json` in that runtime area, so reopening the shell restores the same queue until you click `Refresh queue`

Double-click:

```text
Launch Portal Visualizer.cmd
```

Terminal command:

```powershell
npm start
```

For active local editing in the desktop shell, use:

```powershell
npm run dev:desktop
```

### Portable shell output

If you want a self-contained portable folder instead of running from source:

```powershell
npm run pack:win
```

This produces:

```text
dist\win-unpacked\
```

That unpacked folder is the most direct portable shell option for local use without an installer.

### Build Windows executable targets

From a terminal:

```powershell
npm run dist:win
```

Or by double-clicking:

```text
Build Portal Visualizer EXE.cmd
```

Build output is written to:

```text
dist\
```

Two Windows targets are configured:

- `nsis`: standard installer
- `portable`: portable executable

### Desktop shell `.env` behavior

In development, the Electron shell reads `.env` from the project root.

When packaged, the desktop app looks for `.env` in this order:

1. next to the packaged `.exe`
2. the Electron user-data directory

That keeps secrets and portal configuration outside the packaged app bundle while still allowing a double-click launch.

## Environment setup

### Basic

Set `PORTAL_SOURCE_MODE=mock` to validate the app without any real portal dependency.

Optional local dashboard persistence path:

```env
DASHBOARD_CACHE_FILE=.local-state/dashboard-cache.json
```

### JSON endpoint mode

Use this when the portal already exposes a JSON endpoint:

```env
PORTAL_SOURCE_MODE=http-json
PORTAL_TARGET_URL=https://your-portal.example.com/api/items
PORTAL_HEADERS_JSON={"Accept":"application/json"}
PORTAL_DATA_PATH=items
```

### HTML page mode

Use this when the portal is server-rendered and you need to scrape visible page content:

```env
PORTAL_SOURCE_MODE=http-html
PORTAL_TARGET_URL=https://your-portal.example.com/worklist
PORTAL_COOKIE=your_session_cookie_here
PORTAL_ITEM_SELECTOR=table tbody tr
PORTAL_TITLE_SELECTOR=td:nth-child(1)
PORTAL_STATUS_SELECTOR=td:nth-child(2)
PORTAL_DETAIL_SELECTOR=td:nth-child(3)
```

### Linked request-table mode

Use this when the landing page is a table of requests and each row links to a detail page:

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

This mode matches the live portal structure discovered in Chrome DevTools on May 22, 2026:

- the main page is `index_old.cfm`
- that landing page may first return an auto-submitting redirect form through `login/internaloredirect.cfm`
- the active Customer Requests list is inside an iframe whose `src` contains `todolist`
- each request row includes links such as `?editid=` and `?itemhm=`

The extractor first fetches the outer page, follows that auto-submit redirect form when present, then fetches the request-list iframe, and optionally follows the request links for deeper text.

### Background cookie-backed mode

Use this when you want normal dashboard refreshes to run in the background without opening a separate automation browser each time:

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

How it behaves:

- the app first checks the in-memory shared cookie cache, then the saved cookie header from `PORTAL_COOKIE_CACHE_FILE`
- if the cookie cache is still valid, no browser window opens
- if the cookie cache is missing or expired, the app opens a browser window to refresh auth
- once that browser session reaches the portal again, the app recaptures cookies, refreshes the shared cache, and returns to background fetches on later refreshes
- the cookie cache is stored locally under `.local-auth` and is not meant for source control

### Browser-backed authenticated mode

Use this when you want the app to reuse the same authenticated Chrome Beta data you already use:

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

How it behaves:

- the app treats your normal Chrome Beta `User Data` folder as the source profile
- before launch, it mirrors that profile into a local automation-safe copy under `.local-browser`
- your signed-in Chrome session is reused if that source profile already has portal access
- Chrome Beta should be fully closed first so the profile mirror is copied from a stable source
- if Microsoft sign-in appears, complete login in that browser window and retry the portal preview request
- `npm run open:portal-profile` now opens the same profile path from `.env`
- successful portal loads also seed the shared cookie cache, so a later `cookie-html` run can resume without reopening the browser

### Shared cookie resume flow

Use this when you want one browser-backed sign-in to feed later background refreshes:

- the running server keeps the latest portal cookie snapshot in a process-global cache
- the same snapshot is mirrored to `.local-auth/portal-cookie-cache.json`
- `browser-html` seeds that cache after a successful authenticated portal load
- `cookie-html` checks the shared cache first, then the on-disk cache, and only opens a browser again if both are missing or expired

### Attach to your existing Chrome Beta session

Use this when you want the app to reuse the browser session you already keep logged in:

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

How it behaves:

- you open Chrome Beta yourself and keep your normal logged-in session
- the app reads the active CDP port from `DevToolsActivePort`
- Playwright attaches to that running browser instead of launching its own separate profile

This avoids the unsupported path of automating the default Chrome profile directly.

In practice, if your normal Chrome Beta profile does not expose a live CDP socket, the mirrored local launch above is the reliable option.

## Authentication note

Your target page currently redirects to Microsoft login when accessed without an authenticated browser session or cookie.

The recommended local backend path is now:

- use `cookie-html` so the app can run silently in the background with a saved cookie cache, and only ask for browser sign-in again when that cache expires.

Fallback options:

- provide `PORTAL_COOKIE` from an authenticated portal session, or
- use `browser-html` if you want every fetch to come from a live browser session instead of a background cookie cache.

If the app is redirected to Microsoft login, it now returns an explicit auth error instead of silently parsing the sign-in page.

## OpenAI summary

OpenAI summarization is opt-in:

```env
OPENAI_ENABLED=true
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_ALLOW_TESTCHAT=true
```

The app sends `store: false` on OpenAI requests so portal data is not stored by default.

## Portal parser

The local app now also exposes `POST /api/portal/parse`.

This uses the live portal snapshot as model input and supports two modes:

- structured mode: sends the portal snapshot through a JSON-schema parser and returns normalized request items
- `testchat` mode: bypasses the parser schema and returns raw assistant text so you can inspect how the model is reading the portal data

Example request:

```json
{
  "focus": "Extract the concrete asks and next actions for each request.",
  "testchat": true
}
```

Example response shape:

```json
{
  "snapshot": {
    "recordCount": 2
  },
  "parser": {
    "mode": "testchat",
    "responseText": "..."
  }
}
```

The browser prototype exposes this through the `Run portal parser` button and the `Use parser test chat mode` checkbox.

## Standalone Graph Tester

The repo now also includes a separate browser-launched Microsoft Graph tester.

This is intentionally isolated from the main portal server, Electron shell, and `public/` dashboard UI. It reuses only the Graph service layer under `src/server/services/graph/`.

### What it is for

- manual testing of the current Graph service functions
- inspecting Graph responses in a readable UI
- trying OData filters and query options without exposing secrets to the browser
- resolving people, chats, and mailbox items by human-friendly names such as person names, chat topics, participant names, and message subjects
- safely gating mutations behind an explicit confirmation checkbox

### Required environment values

Set the normal Graph app registration values:

```env
GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_SCOPES=User.Read Mail.Read Calendars.Read Chat.Read People.Read MailboxSettings.ReadWrite offline_access
```

Use `GRAPH_CLIENT_SECRET` as a Windows user environment variable so every launcher and script can reuse the same secret:

```powershell
[Environment]::SetEnvironmentVariable("GRAPH_CLIENT_SECRET", "<secret>", "User")
$env:GRAPH_CLIENT_SECRET
```

Leave `GRAPH_CLIENT_SECRET=` blank in `.env` when you use the global variable.

Keep `GRAPH_REDIRECT_URI` for the existing CLI script flow in `scripts/test-graph-api.js`.

The standalone tester uses separate host and port settings plus a persisted token cache:

```env
GRAPH_TESTER_HOST=127.0.0.1
GRAPH_TESTER_PORT=3069
GRAPH_TESTER_REDIRECT_URI=
GRAPH_TESTER_TOKEN_CACHE_FILE=.local-auth/graph-tester-token.json
GRAPH_TESTER_AUTO_LOGIN_ON_STARTUP=true
```

- if `GRAPH_TESTER_REDIRECT_URI` is blank, the tester uses `http://localhost:3069/auth/redirect` based on its own port
- the standalone tester no longer falls back to `GRAPH_REDIRECT_URI`; that redirect can belong to a different script or app
- `GRAPH_TESTER_TOKEN_CACHE_FILE` stores the server-side token set locally so the tester can survive restarts
- `GRAPH_TESTER_AUTO_LOGIN_ON_STARTUP=true` makes the tester automatically open Microsoft login at startup when no valid cached token is available
- `scripts/manual-graph-oauth.ps1` now reads `GRAPH_CLIENT_SECRET` from the saved Windows environment variable and fails fast if that variable is missing

### Azure redirect registration

Register the redirect URI that the tester will actually use in the Azure app registration.

Examples:

```text
http://localhost:3069/auth/redirect
http://127.0.0.1:3069/auth/redirect
```

### Start the tester

Normal launch:

```powershell
npm run graph-tester
```

Watch mode:

```powershell
npm run graph-tester:dev
```

Then open:

```text
http://127.0.0.1:3069
```

### Auth and security notes

- on startup, the tester loads the cached token set from `GRAPH_TESTER_TOKEN_CACHE_FILE`
- if the access token is expired and a refresh token is present, the tester silently refreshes and rewrites the cache file
- if no valid token can be reused, the tester automatically opens the Microsoft login flow at startup when `GRAPH_TESTER_AUTO_LOGIN_ON_STARTUP=true`
- the login button can be used later to force a fresh interactive OAuth flow
- tokens, refresh tokens, id tokens, and `GRAPH_CLIENT_SECRET` stay server-side only
- the persisted token cache file is local-only and already covered by `.gitignore` through `.local-auth/`
- the UI only receives safe token metadata such as auth state, scope list, and expiry
- mutating functions require the confirmation checkbox before the request can run
- `Mail.Send` is still not implemented or exposed through the tester

## Development and debugging

Normal use should stay in Electron.

Use these only when you intentionally need development or debugging behavior:

```powershell
npm run dev
npm run dev:desktop
npm run server
npm run server:dev
```

- `npm run dev`: starts the local server in watch mode and opens `http://127.0.0.1:3000` in your default browser for debugging
- `npm run dev:desktop`: rebuilds the unpacked Electron shell from current source and launches it
- `npm run server`: runs only the local API/static server
- `npm run server:dev`: runs the server in watch mode for backend-only debugging

If you run a server-only script, the browser fallback URL is:

```text
http://127.0.0.1:3000
```

## Scripts

```powershell
npm run dev
npm run dev:desktop
npm run start
npm run desktop
npm run server
npm run server:dev
npm run graph-tester
npm run graph-tester:dev
npm run pack:win
npm run dist:win
npm run bundle:localhost
npm run smoke
```

`npm run smoke` now validates mock mode, raw HTML mode, iframe mode, cookie-backed mode, and browser-backed mode when a local Chrome-family browser is available.

`npm run bundle:localhost` creates a smaller browser-based shareable ZIP under `dist/localhost-shareable/` that runs the app on localhost with Node.js instead of Electron.

## File layout

```text
public/                  Dashboard frontend loaded inside the Electron shell
scripts/                 Smoke test
src/server/config/       Env parsing
src/server/routes/       HTTP endpoints
src/server/services/ai/  Summary providers
src/server/services/portal/ Portal data providers
```

## Next step after this prototype

Once you know the real portal page or endpoint you want, the next step is to replace the generic connector config with a portal-specific extractor and then build the actual dashboard UI on top of the normalized snapshot shape.
