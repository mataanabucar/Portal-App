# Portal Visualizer Handout

## Purpose

This repo is a local Benchmark portal work-queue visualizer.

- The backend is an Express app in `src/server/`.
- The frontend is a static dashboard in `public/`.
- The same app can run in a browser or inside an Electron shell.

## Current State

As of May 26, 2026:

- `npm run dev` is the browser debugging entrypoint.
- `npm run dev:desktop` rebuilds and launches the Electron shell.
- `npm start` and `npm run desktop` launch the desktop shell.
- The server is intended to run on `http://127.0.0.1:3000`.
- The dashboard uses cache-first local rendering. It loads the last saved dashboard snapshot from browser storage and only fetches fresh portal data when `Refresh queue` is clicked.

## Correct Local Commands

For browser debugging:

```powershell
npm run dev
```

This should open:

```text
http://127.0.0.1:3000
```

Other useful commands:

```powershell
npm run dev -- --no-open
npm run server:dev
npm run dev:desktop
npm run smoke
```

## Important Browser Gotcha

If the dashboard shows `Failed to fetch`, the most likely problem is that the page was opened from the wrong origin.

Use:

```text
http://127.0.0.1:3000
```

Do not:

- open `public/index.html` directly
- run the frontend from another static server
- assume the Electron launcher behavior matches the browser dev flow

`public/app.js` was updated so browser-side network failures now show a more useful message and keep any successful `/api/health` diagnostics visible.

## Verified Behavior

On May 26, 2026, the following were verified locally:

- `GET /api/health` returned `200`
- `POST /api/dashboard` returned `200`
- a browser refresh from `http://127.0.0.1:3000` completed successfully

That strongly suggests the earlier generic `Failed to fetch` error was an origin or launch-path issue rather than a broken backend route.

## Portal Runtime Notes

The current runtime configuration observed from `/api/health` was:

- portal mode: `cookie-html`
- target: `https://tools.benchmarkdigital.com/gsportal/index_old.cfm`
- cached cookie file: `.local-auth/portal-cookie-cache.json`
- browser-backed portal loads now seed the same shared cookie resume cache before falling back to disk
- browser executable: Chrome Beta
- browser profile strategy: mirrored Chrome Beta profile under `.local-browser/`
- OpenAI summarizer enabled
- OpenAI parser enabled
- model: `gpt-5.4-mini`

## Recent Changes

The most relevant recent changes for follow-up work:

1. `npm run dev` was changed from launching Electron to launching the browser dev flow through `scripts/launch-browser-dev.js`.
2. `npm run dev:desktop` was added as the explicit Electron rebuild-and-launch path.
3. Browser diagnostics were improved so refresh failures preserve health output and explain the likely wrong-origin problem.
4. The dashboard remains cache-first and only refreshes portal data on manual action.

## Key Files

- `package.json`
- `README.md`
- `scripts/launch-browser-dev.js`
- `scripts/launch-desktop-shell.js`
- `public/index.html`
- `public/app.js`
- `src/server/index.js`
- `src/server/app.js`
- `src/server/config/env.js`
- `notes/2026-05-22-portal-visualizer-log.md`

## If Claude Needs To Continue Debugging

Start with:

1. `npm run dev`
2. open `http://127.0.0.1:3000`
3. click `Refresh queue`
4. inspect `/api/health` and `/api/dashboard`
5. confirm the page origin before assuming a backend bug

If the issue reproduces in the browser:

- inspect network requests for `/api/health` and `/api/dashboard`
- inspect console errors
- verify the server is still running in the terminal
- check whether the page is actually being served from `127.0.0.1:3000`

## Notes

- The Electron app itself works.
- The main debugging request in this session was to make browser-based debugging the default dev workflow.
- A running browser test confirmed the current browser flow works when launched from the correct local URL.
