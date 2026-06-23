# KB Read-Only Debug Client

This local server now exposes a read-only Knowledge Base proxy against:

`https://tools.benchmarkdigital.com/kb/callKBX.cfm`

Authentication:

- Preferred for the local app: set `KB_AUTH_TOKEN` in `.env`
- Optional per request override: send `Authorization: Bearer <JWT>`

Supported debug routes:

- `GET /kb/debug?method=<kbxMethod>&param=value`
- `GET /kb/getTypes`
- `GET /kb/getContent?contentid=123`
- `GET /kb/getRecentContent`
- `GET /kb/getFavoriteContent`
- `GET /kb/findContentByTitle?title=...`
- `GET /kb/getTags`
- `GET /kb/getTagsByType?tagtypeid=...`
- `GET /kb/getHistory?contentid=123`
- `GET /kb/getBinder?binderid=...`
- `GET /kb/getBinderContents?binderID=...`
- `GET /kb/getBinderPermissions?binderid=...`
- `GET /kb/getBinderSection?sectionID=...`
- `GET /kb/getBinderFolderPath?binderid=...&sectionid=...`
- `GET /kb/getBinderIdsForContent?contentid=...`
- `GET /kb/getBindersByOrg?orgid=...`
- `GET /kb/listBinders`
- `GET /kb/getUserBinders`
- `GET /kb/searchContent?query=...&limit=10&start=0`

The same routes are also available under `/api/kb/...`.

Notes:

- `searchContent` uses `method=searchAsAgent`
- The server base64-encodes the `query` value for `searchContent`
- `limit` maps to `rows`
- `start` defaults to `0`
- Optional filters for `searchContent`: `tags`, `pillars`, `users`, `owners`, `binderids`
- Search is GET-only for now, so long queries or many filters can hit URL length limits

Example `curl.exe` commands:

```powershell
curl.exe "http://127.0.0.1:3000/kb/getTypes"
```

```powershell
curl.exe "http://127.0.0.1:3000/kb/getContent?contentid=123"
```

```powershell
curl.exe "http://127.0.0.1:3000/kb/findContentByTitle?title=ColdFusion"
```

```powershell
curl.exe "http://127.0.0.1:3000/kb/searchContent?query=ColdFusion&limit=10&start=0"
```

```powershell
curl.exe -H "Authorization: Bearer <JWT>" "http://127.0.0.1:3000/kb/debug?method=getBinderPermissions&binderid=456"
```
