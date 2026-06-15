# Local Auth Workflow Reference

This document explains how the Portal Visualizer app creates, stores, refreshes, and reuses local auth so the same pattern can be reused in other apps.

It covers:
- Portal auth via reusable browser cookies
- TeamGPT auth via a cached JWT pulled from the TeamGPT page
- Microsoft Graph auth via a cached OAuth token set
- Browser profile handling for local desktop apps
- The `.env` variables used to control the workflow

## Design goal

The pattern used in this app is:

1. Try local cached auth first.
2. If cached auth is stale, try a silent background refresh.
3. Only open a visible browser window if sign-in is actually required.
4. Persist the refreshed auth locally so the next launch can reuse it.

That is the main behavior you want to copy into other apps.

## Local auth artifacts

The app uses these local files:

- `.local-auth/portal-cookie-cache.json`
  - Reusable portal cookies for queue access
- `.local-auth/teamgpt-token.json`
  - Cached TeamGPT JWT
- `.local-auth/graph-tester-token.json`
  - Cached Microsoft Graph OAuth token set
- `.local-browser/...`
  - Playwright browser profile or mirrored browser profile

These are all filesystem-backed. That is important because desktop relaunches and changing localhost ports make browser-only storage unreliable for this use case.

## Important Electron packaging behavior

In the packaged desktop app, the Electron main process changes the working directory to the app user-data directory.

That means relative cache paths like:

- `.local-auth/teamgpt-token.json`
- `.local-auth/portal-cookie-cache.json`
- `.local-auth/graph-tester-token.json`

resolve under the packaged app's user-data folder, not under the repo root.

The packaged app also looks for `.env` in this order:

1. next to the packaged executable
2. in the Electron user-data directory
3. two levels above the executable
4. the initial launch working directory

This is why the app can keep per-user local auth state cleanly on each machine.

## Auth flow 1: Portal cookies

Used for:
- loading the portal queue in `cookie-html` mode

Main files:
- `src/server/services/portal/cookieHtmlPortalSource.js`
- `src/server/services/portal/portalCookieCache.js`

How it works:

1. On queue fetch, the app checks for:
   - `PORTAL_COOKIE` from `.env`
   - or a cached cookie header from `.local-auth/portal-cookie-cache.json`
2. If one exists, it tries the portal request with that cookie.
3. If the request fails with a sign-in style response like `401`, `403`, or Microsoft login redirect, it tries to refresh cookies.
4. Cookie refresh uses Playwright with the local browser profile.
5. It first tries a hidden browser session when possible.
6. If hidden refresh still lands on Microsoft sign-in, it opens an interactive browser window and keeps it open for the user to finish login.
7. Once authenticated, it captures cookies from the browser context and writes them back to `.local-auth/portal-cookie-cache.json`.

What is stored:

- `savedAt`
- `targetUrl`
- `sourceMode`
- `cookieHeader`
- normalized cookie metadata

Why this pattern is reusable:

- it avoids asking the user to sign in every launch
- it keeps the app independent from copying raw browser cookies manually
- it lets the app recover automatically when cookies expire

## Auth flow 2: TeamGPT JWT

Used for:
- TeamGPT summary requests
- TeamGPT `/api/ask` requests when provider is `teamgpt`

Main files:
- `src/server/services/teamgpt/auth.js`
- `src/server/services/teamgpt/client.js`

How it works:

1. The app reads `.local-auth/teamgpt-token.json`.
2. If the JWT is still valid, it uses it immediately.
3. Validity check:
   - first tries JWT `exp`
   - if unavailable, falls back to a saved-time TTL window
4. If the token is stale or missing, the app opens the TeamGPT page in Playwright.
5. It first tries a hidden browser session when not using `connect-to-existing`.
6. If the page loads already authenticated, it reads:
   - `GSP.aiconfig.jwtToken`
   - or `jwtToken`
7. It writes the new token to `.local-auth/teamgpt-token.json`.
8. If the page lands on Microsoft sign-in instead, it opens an interactive browser window and waits for the user to complete sign-in.

What is stored:

- `jwtToken`
- `pageUrl`
- `savedAt`

Key idea to reuse:

If the target system exposes a page-scoped bearer token in JavaScript, you can:

1. automate page open
2. read the token from the page
3. cache it locally
4. retry silently on next run

This is the same pattern to reuse for any internal tool where the browser session already knows who the user is.

## Auth flow 3: Microsoft Graph OAuth token set

Used for:
- Graph-backed email and Teams features

Main files:
- `src/graph-tester/utils/graphSession.js`
- `src/server/services/graph/portalGraphAuth.js`

How it works:

There are two layers:

### A. Initial login and token creation

The Graph Tester app performs the real OAuth flow.

1. The tester builds the Microsoft authorize URL.
2. It opens the system browser.
3. The user signs in to Microsoft.
4. The tester receives the auth code on the local redirect URI.
5. It exchanges the code for a token set.
6. It writes the token set to `.local-auth/graph-tester-token.json`.

Stored token fields typically include:

- `accessToken`
- `refreshToken`
- `scope`
- `expiresAt`

### B. Reuse in the main app

The main app does not repeat the OAuth login flow itself.

Instead:

1. it reads `.local-auth/graph-tester-token.json`
2. if `accessToken` is still valid, it uses it
3. if expired and `refreshToken` exists, it refreshes the token silently
4. it writes the refreshed token set back to the same file
5. if no cached token exists or refresh is impossible, it tells the user to log in once via Graph Tester

Why this is reusable:

- keep the complex OAuth login flow in a dedicated helper app or helper route
- let the main app consume only the local cached token file
- this reduces login friction in the main app

## Browser session and profile pattern

Main files:
- `src/server/services/portal/browserSession.js`
- `src/server/services/portal/browserProfile.js`

How it works:

The app supports two browser strategies:

### 1. Launch a persistent Playwright browser context

Used when:
- `PLAYWRIGHT_CONNECT_TO_EXISTING=false`

Behavior:

- launches Chrome or Chrome Beta directly
- uses a persistent user-data directory
- can run headless or visible

### 2. Connect to an already-running browser over CDP

Used when:
- `PLAYWRIGHT_CONNECT_TO_EXISTING=true`

Behavior:

- attaches to an existing Chrome session via DevTools/CDP
- useful when you want to share an already-authenticated browser session

### Mirrored default-profile handling

If the configured browser user-data dir matches the browser's real default profile, the app does not automate that profile directly.

Instead it mirrors a subset into:

- `.local-browser/chrome-beta-user-data-mirror`

This avoids Chrome locking and DevTools restrictions on the live default profile.

That mirroring behavior is worth reusing in other desktop/browser automation apps.

## When a browser window should open

The desired behavior, and the one this app now uses, is:

- no browser window if cached auth is still good
- no browser window if cached auth can be refreshed silently in background
- visible browser window only when the background attempt reaches a real sign-in page

That rule is implemented for:

- TeamGPT auth
- portal cookie refresh
- browser-backed portal fetch modes

## Recommended reusable architecture for other apps

If you want to reuse this workflow, keep the same layering:

### 1. Config layer

Create a `buildConfig()` that reads:

- service URLs
- browser settings
- auth cache paths
- OAuth settings

### 2. Local cache reader/writer per auth type

Create one small module per auth artifact:

- cookie cache
- JWT cache
- OAuth token cache

Each should:

- read from disk
- validate shape
- write normalized records
- tolerate missing files

### 3. Service-specific auth module

For each system, create one auth service that follows:

1. read local cache
2. validate
3. attempt silent refresh
4. fall back to visible login only when required
5. persist updated cache

### 4. Consumer modules should not own login

Examples:

- Graph consumer should just call `getAccessToken()`
- TeamGPT consumer should just call `getJwtToken()`
- portal fetcher should just call `getCookieHeader()` or equivalent

The consumer should not manage sign-in UI itself.

## `.env` variables used by this app

Below is the current auth-related and browser-related environment set used by Portal Visualizer.

### Core server

```env
SERVER_HOST=127.0.0.1
PORT=3000
REQUEST_TIMEOUT_MS=20000
```

### Portal queue source and request settings

```env
PORTAL_SOURCE_MODE=cookie-html
PORTAL_TARGET_URL=https://tools.benchmarkdigital.com/gsportal/index_old.cfm
PORTAL_METHOD=GET
PORTAL_HEADERS_JSON={}
PORTAL_BODY_JSON={}
PORTAL_DATA_PATH=
PORTAL_CONTENT_SELECTOR=body
PORTAL_FRAME_SELECTOR=iframe[src*="todolist"]
PORTAL_ITEM_SELECTOR=tr:has(a[href*="editid="])
PORTAL_LINK_SELECTOR=a[href*="editid="]
PORTAL_TITLE_SELECTOR=a[href*="itemhm"]
PORTAL_DETAIL_SELECTOR=
PORTAL_STATUS_SELECTOR=
PORTAL_OWNER_SELECTOR=
PORTAL_PRIORITY_SELECTOR=
PORTAL_DATE_SELECTOR=
PORTAL_MAX_ITEMS=25
PORTAL_FOLLOW_DETAIL_LINKS=true
PORTAL_MAX_DETAIL_PAGES=10
PORTAL_DETAIL_CONTENT_SELECTOR=body
PORTAL_DETAIL_TITLE_SELECTOR=
PORTAL_DETAIL_MAX_CHARS=4000
```

### Portal cookie auth

```env
PORTAL_COOKIE=
PORTAL_COOKIE_CACHE_FILE=.local-auth/portal-cookie-cache.json
```

Notes:

- `PORTAL_COOKIE` is an optional direct override
- `PORTAL_COOKIE_CACHE_FILE` is the reusable local cookie cache file

### Browser automation and local session reuse

```env
PLAYWRIGHT_EXECUTABLE_PATH=C:\Users\700000347\AppData\Local\Google\Chrome Beta\Application\chrome.exe
PLAYWRIGHT_USER_DATA_DIR=C:\Users\700000347\AppData\Local\Google\Chrome Beta\User Data
PLAYWRIGHT_CONNECT_TO_EXISTING=false
PLAYWRIGHT_CDP_ENDPOINT=
PLAYWRIGHT_DEVTOOLS_ACTIVE_PORT_FILE=
PLAYWRIGHT_HEADLESS=false
PLAYWRIGHT_NAVIGATION_TIMEOUT_MS=30000
```

Notes:

- `PLAYWRIGHT_HEADLESS=false` is the base config, but the app can still force hidden auth attempts for background refresh
- `PLAYWRIGHT_CONNECT_TO_EXISTING=true` changes behavior significantly and expects an existing debug-enabled browser session

### TeamGPT

```env
SUMMARY_PROVIDER=teamgpt
ASK_PROVIDER=teamgpt
TEAMGPT_PAGE_URL=https://tools.benchmarkdigital.com/gsportal/genai/index.cfm
TEAMGPT_ENDPOINT_URL=https://genai-proxy-na.benchmarkdigital.com/bedrock/converse/chat/teamgpt-ask-anything-bedrock?stream=true
TEAMGPT_APP_ID=9225
TEAMGPT_ENVIRONMENT=prod
TEAMGPT_MODEL=anthropic.claude-haiku-4-5-20251001-v1:0
TEAMGPT_TOKEN_CACHE_FILE=.local-auth/teamgpt-token.json
```

### OpenAI

```env
OPENAI_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_ALLOW_TESTCHAT=true
```

Notes:

- OpenAI does not use local browser auth in this app
- it is direct API-key auth

### Microsoft Graph / Azure AD

```env
GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_REDIRECT_URI=http://localhost:3069/auth/redirect
GRAPH_SCOPES=User.Read Mail.Read Calendars.Read offline_access
GRAPH_TOKEN_CACHE_FILE=.local-auth/graph-tester-token.json
```

Notes:

- the Graph Tester uses these values to create and refresh the OAuth token set
- the main app reuses `GRAPH_TOKEN_CACHE_FILE`

### Dashboard persistence

Not auth, but related to local state reuse:

```env
DASHBOARD_CACHE_FILE=.local-state/dashboard-cache.json
```

## Copy-forward checklist for a new app

When reusing this in another app:

1. Decide what local auth artifacts you need:
   - cookies
   - page JWT
   - OAuth token set
2. Create dedicated cache files under:
   - `.local-auth/`
3. Use Playwright persistent context for session reuse.
4. If using the default Chrome profile, mirror it instead of automating it directly.
5. Always try:
   - cached auth
   - hidden refresh
   - visible login last
6. Keep the login UI in one auth module, not scattered across consumers.
7. In Electron packaging, make sure you understand where `process.cwd()` points.
8. Keep cache file paths configurable from `.env`.

## Recommended file layout to copy

```text
src/
  services/
    auth/
      cookieCache.js
      jwtCache.js
      oauthTokenCache.js
      portalAuth.js
      teamGptAuth.js
      graphAuth.js
    browser/
      browserSession.js
      browserProfile.js
.local-auth/
.local-browser/
.local-state/
```

## Short version

If you only want the pattern in one sentence:

Store auth on disk, reuse it first, refresh it silently with a real browser session when possible, and only open visible login when silent refresh proves the user is no longer signed in.
