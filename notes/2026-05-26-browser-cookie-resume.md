# Portal Cookie Resume Skill

## Overview

This workflow captures portal cookies from an authenticated browser session, keeps them in a process-global resume cache, and mirrors them to `.local-auth/portal-cookie-cache.json` so later refreshes can run without reopening the browser.

## Setup

- Use `PORTAL_SOURCE_MODE=browser-html` for the first authenticated run.
- Set `PORTAL_COOKIE_CACHE_FILE=.local-auth/portal-cookie-cache.json` or another local path.
- Keep `PLAYWRIGHT_EXECUTABLE_PATH` pointed at a Chrome-family browser.

## Resume Flow

1. `browser-html` opens the portal in the browser session you already trust.
2. After a successful outer-page load, the app captures cookies from that session.
3. The captured cookie payload is written to the process-global cache and the on-disk cache file.
4. `cookie-html` reads the in-memory cache first, then the file cache.
5. If both are missing or expired, the app opens a browser again for reauthentication.

## Key Files

- `src/server/services/portal/playwrightHtmlPortalSource.js`
- `src/server/services/portal/cookieHtmlPortalSource.js`
- `src/server/services/portal/portalCookieCache.js`
- `scripts/smoke-test.js`

## Notes

- The cache is local-only and should never be committed.
- The cache is a resume aid, not a replacement for valid auth. If cookies expire, the browser flow still needs to be repeated.
