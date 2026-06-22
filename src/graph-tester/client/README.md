# Graph Tester — Vue 3 client

UI-only Vue 3 + Vite frontend for the standalone Microsoft Graph Tester. All
auth, token storage, Microsoft Graph calls, catalog generation, and validation
stay in the Express server under `src/graph-tester/` — this client only renders
what those endpoints return.

## Endpoints consumed (see `src/api/graphTesterApi.ts`)

- `GET  /api/health`
- `GET  /api/graph-tester/catalog`
- `GET  /api/graph-tester/session`
- `POST /api/graph-tester/logout`
- `POST /api/graph-tester/run`
- `GET  /auth/login` (full-page navigation; OAuth round-trip is server-driven)

## Development

Run two processes:

```bash
# 1. The Express Graph Tester API (port 3069 by default)
npm run graph-tester            # from the repo root

# 2. The Vite dev server (port 5173) — proxies /api and /auth to Express
npm run graph-tester:client     # from the repo root
```

Open http://localhost:5173. Vite proxies `/api` and `/auth` to the Express
origin (override with `GRAPH_TESTER_PROXY_TARGET`).

> Login note: the Microsoft redirect URI is registered against the Express
> origin (`http://localhost:3069/auth/redirect`), so completing a sign-in lands
> on the Express port. The token is stored server-side; switching back to the
> Vite tab triggers a session refresh (on window focus) and the UI shows the
> authenticated state. Startup auto-login opens its own browser window.

## Production build

```bash
npm run graph-tester:client:build   # from the repo root -> client/dist
```

When `client/dist/index.html` exists, the Express server serves the built Vue
app at `/` (with an SPA fallback) instead of the legacy `public/` assets. No
rebuild of the server is needed — restart it after building the client.
