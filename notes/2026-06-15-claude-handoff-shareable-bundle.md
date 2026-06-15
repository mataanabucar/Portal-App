Portal Visualizer shareable bundle handoff

Date: 2026-06-15
Repo: C:\Users\700000347\OneDrive - Gensuite LLC\Desktop\Portal App

Goal
- Continue the work to package a shareable Windows bundle for another team member.
- The intended experience is: unzip, run one launcher, then log into Microsoft / Portal in the browser when prompted.

What was added
- Root script in `package.json`:
  - `bundle:share`: `node scripts/build-shareable-bundle.js`
- New builder:
  - `scripts/build-shareable-bundle.js`
- New one-click launcher for the builder:
  - `Build Shareable Portal Visualizer ZIP.cmd`

What the builder currently does
- Verifies root `.env` exists.
- Runs `npm --prefix frontend run build`.
- Runs `npm run pack:win`.
- Builds a staged folder at:
  - `dist\shareable\Portal Visualizer Shareable`
- Copies into that staged folder:
  - root `.env`
  - `dist\win-unpacked`
  - `frontend\.next`
  - `frontend\node_modules`
  - `frontend\public`
  - `frontend\package.json`
  - `frontend\package-lock.json`
  - `frontend\next.config.ts`
  - `frontend\next-env.d.ts`
- Writes:
  - `Launch Portal Visualizer.cmd`
  - `START HERE.txt`
- Then tries to zip the staged folder with PowerShell `Compress-Archive`.

Current verified state
- The staged folder exists and appears complete:
  - `dist\shareable\Portal Visualizer Shareable`
- The incomplete zip process was manually stopped.
- The zip file does not currently exist:
  - `dist\shareable\Portal Visualizer Shareable.zip`
- The staged content is large:
  - packaged shell content: about 412 MB
  - bundled frontend content: about 734 MB
  - total uncompressed staged content: about 1.1 GB

What happened
- The staging steps completed.
- The build stalled in the zip step.
- The PowerShell process running `Compress-Archive` against the staged folder was killed.
- The original incomplete zip artifact is gone now.

Relevant file behavior
- `package.json`
  - `pack:win` is `electron-builder --win dir`
  - `bundle:share` calls `node scripts/build-shareable-bundle.js`
- `scripts/build-shareable-bundle.js`
  - stops running packaged `Portal Visualizer` processes from this repo's `dist\win-unpacked`
  - uses a Windows-safe `cmd.exe /c` wrapper for `.cmd` invocations
  - currently zips with PowerShell `Compress-Archive`

Important app/runtime details
- The packaged Electron shell still expects the bundled `frontend` folder outside the EXE tree. The staged layout preserves that.
- The bundle includes `.env`.
- TeamGPT auth is per user and comes from the user's Portal / TeamGPT browser session.
- Graph-backed features are still per user. The user must complete their own Graph sign-in flow on their machine if those features are used.
- No Azure app registration work should be required for the teammate if they are using the same existing app configuration. Their identity differs based on their own sign-in and local token/cache state.

Files with existing uncommitted work
- Modified:
  - `frontend/src/components/dashboard/DashboardPage.tsx`
  - `frontend/src/components/layout/Sidebar.tsx`
  - `frontend/src/lib/types.ts`
  - `package.json`
  - `src/server/app.js`
  - `src/server/config/env.js`
  - `src/server/index.js`
  - `src/server/services/ai/ask.js`
  - `src/server/services/ai/index.js`
- Untracked:
  - `Build Shareable Portal Visualizer ZIP.cmd`
  - `frontend/src/app/ai-trace/`
  - `frontend/src/components/layout/AppSidebar.tsx`
  - `frontend/src/components/trace/`
  - `public/teamgpt-tester.css`
  - `public/teamgpt-tester.html`
  - `public/teamgpt-tester.js`
  - `scripts/build-shareable-bundle.js`
  - `src/server/services/teamgpt/`
- There is also an untracked user note file:
  - `notes/pwtempgpt.txt`

Recommended next steps
1. Decide whether a zip is actually needed right now, or whether the staged folder is enough for local testing and handoff.
2. If a zip is still required, replace `Compress-Archive` with a faster method for a 1.1 GB folder.
3. Validate the staged bundle by launching:
  - `dist\shareable\Portal Visualizer Shareable\Launch Portal Visualizer.cmd`
4. Confirm the packaged app can:
  - start the bundled frontend
  - read the bundled `.env`
  - open the browser for Microsoft / Portal login when needed
5. If the staged bundle works, re-run the final zip step only after choosing a better compression approach.

Likely improvement path
- Keep the staging logic.
- Replace only the zip implementation.
- Candidate options:
  - `tar.exe -a -c -f`
  - 7-Zip if available on the machine
  - skip zip creation and ship the staged folder

Cautions
- Do not revert unrelated repo changes.
- Keep the existing staged folder unless you intentionally rebuild it.
- Avoid using `MutationObserver` in any JS changes in this repo.
