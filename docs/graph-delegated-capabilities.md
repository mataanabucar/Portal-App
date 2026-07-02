# Graph Delegated Capabilities

How the portal app decides which Microsoft Graph functions to request, display,
and run, based on the delegated scopes in the signed-in token.

## App identity

The portal app uses **its own Azure app registration** (from
`filesforcontext/Mail api(Microsoft Graph format).json`):

| | |
|---|---|
| Display name | `Mail api` |
| App ID (client ID) | `1fb8c198-909a-412b-9b2e-20450f6e7ecc` |
| Tenant sign-in | `AzureADMyOrg` (GENSUITE tenant only) |

`GRAPH_CLIENT_ID` in `.env` must be this appId. Tokens minted for any other
client — **Graph Explorer** (`de8bc8b5-d9f9-48b1-a8ad-b748da725064`),
**One Outlook Web / Outlook Web**, or any Microsoft first-party client — are
never used as the portal app's identity. The tester UI and
`/api/graph-tester/capabilities` warn when the stored token's `appid`/`azp`
does not match the configured client ID.

`filesforcontext/decodedToken.json` is a decoded **Graph Explorer** token kept
for diagnostics only. It does not prove anything about the portal app's runtime
access.

## Requested scopes

The default requested scopes (kept consistent across `.env.example`,
`src/server/config/env.js`, `src/graph-tester/config.js`, and
`graph-auths/server.js`, sourced from `DEFAULT_GRAPH_SCOPES` in
`src/server/services/graph/graphCapabilities.js`):

```
openid profile email offline_access https://graph.microsoft.com/.default
```

`.default` asks Azure AD for **every delegated Graph permission the tenant has
approved for this app registration**. The token's `scp` claim then carries the
full approved set (currently 35 delegated scopes: mail incl. shared, calendar
incl. shared, tasks incl. shared, notes, chat, channel posts, mailbox
settings, user/people basics), and newly approved permissions flow in
automatically — no config edit needed.

**Do not enumerate individual Graph scopes in `GRAPH_SCOPES`.** This tenant
approves permissions per app; a request containing even ONE unapproved scope
(e.g. `Files.Read`, `Team.ReadBasic.All`, `Directory.Read.All`,
`Contacts.ReadWrite` before it is approved) makes token refresh fail with
`AADSTS65001` and can block login. Function availability is gated by the
token's actual `scp` claim, never by the request list — so `.default` grants
nothing extra, it just avoids the failure mode.

Internal Microsoft scopes (`OWA.*`, `*-Internal*`, `OutlookService.*`,
`ShortNotes.*`, …) are stripped by `sanitizeGraphScopes()` and must never be
requested.

## ⚠ New scopes require a fresh login

The token cache keeps the scopes it was minted with. After adding a scope to
`GRAPH_SCOPES` (for example **Mail.Send**):

1. Delete the cached token:
   ```
   del .local-auth\graph-tester-token.json
   ```
   (or use the **Clear token** button in the Graph Tester UI)
2. Start the tester: `npm run graph-tester`
3. Click **Login** (or open `http://localhost:3069/auth/login`) and finish the
   Microsoft sign-in.

Until you re-login, functions needing the new scope (e.g. `sendMail`) stay
hidden/disabled — the server rejects them with 403 before any Graph call.

## Redirect URIs

The app registration has these web redirect URIs:

- `http://localhost:3069/auth/redirect` (graph tester, default)
- `http://localhost:3070/auth/redirect` (graph-auths mini app)
- `https://oauth.pstmn.io/v1/callback` (Postman)

`GRAPH_REDIRECT_URI` defaults to `http://localhost:3069/auth/redirect`. The
old hardcoded native-client URI
(`https://login.microsoftonline.com/common/oauth2/nativeclient`) is no longer
used for the web flow.

## Scope gating

`src/server/services/graph/graphCapabilities.js` is the single source of truth:

- `getDelegatedScopesFromClaims` — reads the `scp` claim only; app-only
  `roles` are never treated as delegated scopes.
- `expandImpliedDelegatedScopes` — `Mail.ReadWrite` implies `Mail.Read` +
  `Mail.ReadBasic`, `Tasks.ReadWrite` implies `Tasks.Read`, etc.
- `classifyScopes` — separates internal Microsoft scopes into `ignoredScopes`.
- `isFunctionEnabled(entry, grantedScopes)` — checks each catalog entry's
  `requiredScopes: { any, all }`.

Every entry in `src/graph-tester/catalog/graphTesterCatalog.js` carries
`requiredScopes`. Enforcement is **server-side**:

- `GET /api/graph-tester/catalog` — returns only enabled functions;
  `?includeUnavailable=true` adds disabled ones with `enabled: false` and
  `missingScopes`. Unauthenticated: empty (or disabled metadata only).
- `POST /api/graph-tester/run` — 401 when not signed in, 403 with the missing
  scopes when the token doesn't cover the function, and 400 unless mutations
  send `confirmMutation: true`.
- `GET /api/graph-tester/capabilities` — token type, token appid vs manifest
  appId (identity match), granted/expanded/ignored scopes, roles, enabled and
  disabled functions with missing scopes, and warnings.

The Vue tester hides unavailable functions by default (toggle: *Show
unavailable functions*) and never lets a disabled mutation run.

## Curated function groups

Mail: `listMessages`, `searchMessages`, `readMessage`, `readConversation`,
`createDraft`, `sendMail` (now under **Mail**, not only Mail Shared),
`replyToMessage`, `moveMessage`, `deleteMessage`.
Calendar: `listEvents`, `createEvent`, `updateEvent`, `deleteEvent`.
Teams chat: `listMyChats`, `listChatMessages`, `sendChatMessage`
(requires `ChatMessage.Send` explicitly).
Teams channel: `sendChannelMessage`, `editOwnChannelMessage` only —
`listChannels`, `getChannel`, `listChannelMessages`, `getChannelMessage`,
`sendChannelReply`, `editChannelReply` are hidden until intentionally added.
Tasks: `listTaskLists`, `listTasks`, `createTask`, `updateTask`,
`completeTask` (status → `completed` patch).
OneNote: exposed only when the token carries a `Notes.*` scope. No ShortNotes
endpoints are implemented.

All mutations (drafts, sends, replies, moves, deletes, events, chat/channel
posts, task changes, shared-mailbox writes) require `confirmMutation: true`
and are never auto-sent. Sample payloads use `person@example.com`.

## Assistant (voice bot) access

The realtime assistant has the **full Graph surface**, not just the shortcut
tools (`search_emails`, `get_recent_emails`, `search_chats`, `send_email`):

- `list_graph_functions` → `GET /api/assistant/graph/functions` — every
  catalog function the signed-in token enables, with argument metadata.
  Optional `?service=` / `?search=` filters.
- `run_graph_function` → `POST /api/assistant/graph/run` — executes any
  allowlisted function. The server enforces the same scope gating as the Graph
  tester (403 + `missingScopes`), and mutations are rejected with
  `requiresConfirmation` unless `confirmMutation: true` is sent — the bot is
  instructed to read the change back and get an explicit yes first. Nothing is
  ever auto-sent.

## Capability report

```
npm run graph:capabilities
```

Parses `filesforcontext/` (manifest + decoded token text file, defensively),
decodes the runtime token cache when present (claims only — never token
material), and writes
`filesforcontext/graph-capability-report.generated.json` with the identity
match, granted vs ignored scopes, and enabled/disabled function lists.

## Security rules

- Never commit `.local-auth/`, access/refresh tokens, decoded tokens, or
  client secrets.
- Never print client secrets.
- Never depend on Graph Explorer or Outlook Web tokens.
- Never expose internal Microsoft scopes in the requested scope list.
- Mutations always require explicit confirmation; nothing is auto-sent.
