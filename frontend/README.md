# Portal Visualizer — Frontend (Next.js)

Next.js 16 (App Router) + TypeScript + Tailwind v4 + lucide-react + SWR.
Replaces the vanilla `public/` frontend. The existing Express backend is
unchanged — this app proxies `/api/*` to it.

## Ports

| Service            | Port | Notes                                  |
| ------------------ | ---- | -------------------------------------- |
| Express backend    | 3000 | `npm run server` from the repo root    |
| Next.js frontend   | 3011 | `npm run dev` in this folder           |

`/api/*` requests are proxied to `BACKEND_URL` (default `http://localhost:3000`,
set in `.env.local`), so the frontend port can change freely without touching
any API code.

## Getting Started

```bash
# Terminal 1 — backend (repo root)
npm run server

# Terminal 2 — frontend (this folder)
npm run dev
```

Open [http://localhost:3011](http://localhost:3011).

## Scripts

- `npm run dev` — dev server on port 3011 (Turbopack)
- `npm run build` — production build
- `npm run start` — serve the production build on port 3011

## Structure

- `src/lib/types.ts` — types mirroring the real backend payloads
- `src/lib/merge.ts` — snapshot + parsed-item merge (ported from `public/app.js`)
- `src/hooks/useDashboard.ts` — SWR data hook (cache-first)
- `src/components/ai-summary/` — the AI Summary card and its parts
- `src/components/dashboard/` — page orchestrator
