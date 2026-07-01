# Graph Auths

Small standalone app that does one thing:

1. open Microsoft Graph OAuth login
2. receive the redirect locally
3. write the resulting token set to a JSON file

## Default output file

`<repo root>/.local-auth/graph-tester-token.json`

This is the **same file** the main Portal app and the embedded graph-tester (port 3069) read and
auto-refresh. Writing here means a single login via this tool updates the token for the whole
system — no manual file copying.

## Run

```powershell
cd "C:\Users\700000347\OneDrive - Gensuite LLC\Desktop\Portal App\graph-auths"
npm install
npm start
```

By default, `npm start` opens `http://127.0.0.1:3070` automatically in the configured browser
mode. If you turn that off, open the page manually and click **Open Graph Login**.

If another app is already using port `3070`, set both `GRAPH_AUTHS_PORT` and
`GRAPH_AUTHS_REDIRECT_URI` to the same alternate port and make sure that redirect URI is
registered in Azure.

## Config

The app tries `graph-auths/.env` first and then falls back to the repo root `.env`.

Use `GRAPH_AUTHS_*` variables for mini-app-specific overrides:

```env
GRAPH_AUTHS_PORT=3070
GRAPH_AUTHS_HOST=127.0.0.1
GRAPH_AUTHS_REDIRECT_URI=http://localhost:3070/auth/redirect
GRAPH_AUTHS_OUTPUT_FILE=../.local-auth/graph-tester-token.json
GRAPH_AUTHS_AUTO_OPEN_BROWSER=true
GRAPH_AUTHS_BROWSER_MODE=chrome-clean
GRAPH_AUTHS_TENANT_ID=
GRAPH_AUTHS_CLIENT_ID=
GRAPH_AUTHS_CLIENT_SECRET=
# GRAPH_AUTHS_SCOPES intentionally unset — inherits GRAPH_SCOPES from repo root .env
```

**Ports in this repo:**
- `3000` — main Portal server
- `3069` — embedded graph-tester (login UI built into the main app)
- `3070` — this app (`graph-auths`)

**Scopes:** Do not set `GRAPH_AUTHS_SCOPES`. The app falls through to `GRAPH_SCOPES` from the
repo root `.env`, which is the single canonical scope list for all three tools.

Browser mode values:

- `chrome-persisted`: open in regular Chrome using your normal signed-in profile
- `chrome-clean`: open in regular Chrome using this app's separate local profile
- `edge`: open in Microsoft Edge using its normal profile

If `GRAPH_AUTHS_TENANT_ID`, `GRAPH_AUTHS_CLIENT_ID`, or `GRAPH_AUTHS_CLIENT_SECRET`
are not set, the app falls back to `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, and
`GRAPH_CLIENT_SECRET` from the parent app's `.env`.

When `GRAPH_AUTHS_AUTO_OPEN_BROWSER=true`, `npm start` opens the mini app home page
automatically in the configured browser mode. The same browser mode is also used
when you click **Open Graph Login**.

## Redirect URI

Your Azure app registration must include the exact redirect URI used by this mini app.
The default is:

`http://localhost:3070/auth/redirect`

> **Manual step required:** If you changed the port from the previous default (3000), update
> the Azure App Registration (client ID in `GRAPH_CLIENT_ID`) to add
> `http://localhost:3070/auth/redirect` as a valid redirect URI before logging in.

If you change the port or set `GRAPH_AUTHS_REDIRECT_URI`, update the Azure app
registration to match exactly.
