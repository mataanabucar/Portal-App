# Microsoft Graph Tester Reference

Source of truth: `src/graph-tester/catalog/graphTesterCatalog.js` for the function catalog and `src/server/services/graph/services/*.js` for the scope comments and API behavior.

## Current Auth Bundle
The tester defaults to `GRAPH_SCOPES` = `User.Read Mail.Read Calendars.Read Chat.Read People.Read MailboxSettings.ReadWrite offline_access`.

That default bundle covers the common read paths, but the tester also exposes functions that need additional scopes.

## Scope Coverage
| Scope | In default `GRAPH_SCOPES`? | Functions |
| --- | --- | --- |
| `Calendars.Read` | yes | `calendar.listMyCalendars`<br>`calendar.listMyCalendarEvents`<br>`calendar.getEvent`<br>`calendar.getMyCalendarView` |
| `Calendars.Read.Shared` | no | `calendar.listSharedCalendarEvents`<br>`calendar.getSharedCalendarView` |
| `Calendars.ReadBasic` | no | `calendar.listMyCalendars`<br>`calendar.getMyCalendarView` |
| `Calendars.ReadWrite` | no | `calendar.listMyCalendarEvents`<br>`calendar.getEvent`<br>`calendar.getMyCalendarView`<br>`calendar.createEvent`<br>`calendar.updateEvent`<br>`calendar.deleteEvent` |
| `ChannelMessage.Edit` | no | `teamsChannel.editChannelMessage`<br>`teamsChannel.editChannelReply` |
| `ChannelMessage.Send` | no | `teamsChannel.sendChannelMessage`<br>`teamsChannel.sendChannelReply` |
| `Chat.Create` | no | `teamsChat.createOneOnOneChat`<br>`teamsChat.createGroupChat` |
| `Chat.Read` | yes | `teamsChat.listMyChats`<br>`teamsChat.searchMyChats`<br>`teamsChat.getChat`<br>`teamsChat.listChatMembers`<br>`teamsChat.listChatMessages`<br>`teamsChat.getChatMessage` |
| `Chat.ReadBasic` | no | `teamsChat.listMyChats`<br>`teamsChat.searchMyChats`<br>`teamsChat.listChatMembers` |
| `Chat.ReadWrite` | no | `teamsChat.listMyChats`<br>`teamsChat.searchMyChats`<br>`teamsChat.getChat`<br>`teamsChat.listChatMembers`<br>`teamsChat.listChatMessages`<br>`teamsChat.getChatMessage` |
| `ChatMessage.Read` | no | `teamsChat.listChatMessages`<br>`teamsChat.listAllChatMessages`<br>`teamsChat.getChatMessage` |
| `ChatMessage.Send` | no | `teamsChat.sendChatMessage` |
| `Mail.Read` | yes | `mail.listInboxMessages`<br>`mail.getMessage`<br>`mail.searchMyMessages`<br>`mail.listUnreadMessages`<br>`mail.listAllMessages` |
| `Mail.Read.Shared` | no | `mail.listSharedMailboxMessages`<br>`mail.listSharedInboxMessages` |
| `Mail.ReadBasic` | no | `mail.listMyMessagesBasic`<br>`mail.listInboxMessages`<br>`mail.listUnreadMessages` |
| `Mail.ReadBasic.Shared` | no | `mail.listSharedInboxMessages` |
| `Mail.ReadWrite` | no | `mail.getMessage`<br>`mail.createDraftMessage`<br>`mail.updateDraftMessage`<br>`mail.setMessageReadState`<br>`mail.moveMessage`<br>`mail.deleteMessage` |
| `Mail.ReadWrite.Shared` | no | `mail.createSharedMailboxDraft` |
| `MailboxSettings.ReadWrite` | yes | `mailboxSettings.getMyMailboxSettings`<br>`mailboxSettings.updateMyMailboxSettings` |
| `People.Read` | yes | `people.listRelevantPeople`<br>`people.searchPeople` |
| `User.Read` | yes | `user.getMe`<br>`user.getMyPhotoMetadata`<br>`user.getMyPhotoValue` |
| `User.ReadBasic.All` | no | `user.listUsers`<br>`user.searchUsers`<br>`user.getUser` |
| `User.ReadWrite` | no | `user.updateUser` |

## Scope Gaps
These scopes are exposed by the tester but are not part of the current default auth bundle:

- `Calendars.Read.Shared`
- `Calendars.ReadBasic`
- `Calendars.ReadWrite`
- `ChannelMessage.Edit`
- `ChannelMessage.Send`
- `Chat.Create`
- `Chat.ReadBasic`
- `Chat.ReadWrite`
- `ChatMessage.Read`
- `ChatMessage.Send`
- `Mail.Read.Shared`
- `Mail.ReadBasic`
- `Mail.ReadBasic.Shared`
- `Mail.ReadWrite`
- `Mail.ReadWrite.Shared`
- `User.ReadBasic.All`
- `User.ReadWrite`

## Service Reference

### User
Profiles, directory lookups, and user photos.

| Function | Scope | Options |
| --- | --- | --- |
| `getMe` | `User.Read` | `select` (`text`; optional; default `id,displayName,mail,userPrincipalName,jobTitle,officeLocation`; placeholder `id,displayName,mail,userPrincipalName`) |
| `getMyPhotoMetadata` | `User.Read` | none |
| `getMyPhotoValue` | `User.Read` | none |
| `listUsers` | `User.ReadBasic.All` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,displayName,mail,userPrincipalName,jobTitle,officeLocation`; placeholder `id,displayName,mail,userPrincipalName`)<br>`filter` (`text`; optional; placeholder `accountEnabled eq true`)<br>`orderby` (`text`; optional; placeholder `displayName`) |
| `searchUsers` | `User.ReadBasic.All` | `text` (`text`; required; placeholder `Mataan`)<br>`select` (`text`; optional; default `id,displayName,mail,userPrincipalName,jobTitle`; placeholder `id,displayName,mail,userPrincipalName`)<br>`top` (`number`; optional; default `10`; placeholder `10`) |
| `getUser` | `User.ReadBasic.All` | `userIdOrUpn` (`text`; required; placeholder `person@company.com or Mataan Abucar`)<br>`select` (`text`; optional; placeholder `id,displayName,mail,userPrincipalName`) |
| `updateUser` | `User.ReadWrite` | `userIdOrUpn` (`text`; required; placeholder `person@company.com or Mataan Abucar`)<br>`patch` (`json`; required; placeholder `{ "key": "value" }`) |

#### `getMe`
- Scope: `User.Read`
- Description: Return the current user profile from /me.
- Mutation: no
- Inputs:
  - `select` (type: `text`; optional; default: `id,displayName,mail,userPrincipalName,jobTitle,officeLocation`; placeholder: `id,displayName,mail,userPrincipalName`; note: Comma-separated profile fields to return.)

#### `getMyPhotoMetadata`
- Scope: `User.Read`
- Description: Return the signed-in user's profile photo metadata.
- Mutation: no
- Inputs: none

#### `getMyPhotoValue`
- Scope: `User.Read`
- Description: Fetch the raw photo response and summarize its headers and size without returning binary.
- Mutation: no
- Inputs: none

#### `listUsers`
- Scope: `User.ReadBasic.All`
- Description: Query tenant users through /users.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,displayName,mail,userPrincipalName,jobTitle,officeLocation`; placeholder: `id,displayName,mail,userPrincipalName`)
  - `filter` (type: `text`; optional; placeholder: `accountEnabled eq true`)
  - `orderby` (type: `text`; optional; placeholder: `displayName`)

#### `searchUsers`
- Scope: `User.ReadBasic.All`
- Description: Run a directory search by person name.
- Mutation: no
- Inputs:
  - `text` (type: `text`; required; placeholder: `Mataan`)
  - `select` (type: `text`; optional; default: `id,displayName,mail,userPrincipalName,jobTitle`; placeholder: `id,displayName,mail,userPrincipalName`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)

#### `getUser`
- Scope: `User.ReadBasic.All`
- Description: Load one user by ID, email, UPN, or person name.
- Mutation: no
- Inputs:
  - `userIdOrUpn` (type: `text`; required; placeholder: `person@company.com or Mataan Abucar`; note: Accepts an object ID, UPN/email, or a human-friendly name. Ambiguous names must be narrowed down.)
  - `select` (type: `text`; optional; placeholder: `id,displayName,mail,userPrincipalName`)

#### `updateUser`
- Scope: `User.ReadWrite`
- Description: Patch safe writable properties on a user profile.
- Mutation: yes
- Inputs:
  - `userIdOrUpn` (type: `text`; required; placeholder: `person@company.com or Mataan Abucar`; note: Accepts an object ID, UPN/email, or a human-friendly name.)
  - `patch` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 10; note: Send only the writable fields you want to update.)
- Sample buttons: `Safe patch`

### Calendar
Primary and shared calendar reads plus event mutations.

| Function | Scope | Options |
| --- | --- | --- |
| `listMyCalendars` | `Calendars.ReadBasic`, `Calendars.Read` | `select` (`text`; optional; placeholder `id,name,canEdit,owner`) |
| `listMyCalendarEvents` | `Calendars.Read`, `Calendars.ReadWrite` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,start,end,location,organizer`; placeholder `id,subject,from,receivedDateTime,isRead`)<br>`filter` (`text`; optional; placeholder `isRead eq false`)<br>`orderby` (`text`; optional; placeholder `receivedDateTime desc`) |
| `getEvent` | `Calendars.Read`, `Calendars.ReadWrite` | `eventId` (`text`; required; placeholder `AAMkAG...AAA=`)<br>`select` (`text`; optional; placeholder `id,subject,start,end,location,organizer`) |
| `getMyCalendarView` | `Calendars.ReadBasic`, `Calendars.Read`, `Calendars.ReadWrite` | `start` (`datetime-local`; required)<br>`end` (`datetime-local`; required)<br>`select` (`text`; optional; placeholder `id,subject,start,end,location,organizer`)<br>`timezone` (`text`; optional; default `Eastern Standard Time`; placeholder `Eastern Standard Time`)<br>`top` (`number`; optional; default `10`; placeholder `10`)<br>`orderby` (`text`; optional; default `start/dateTime`; placeholder `start/dateTime`) |
| `listSharedCalendarEvents` | `Calendars.Read.Shared` | `mailbox` (`text`; required; placeholder `shared@company.com`)<br>`top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,start,end,location,organizer`; placeholder `id,subject,start,end,location,organizer`)<br>`filter` (`text`; optional; placeholder `start/dateTime ge '2026-06-01T00:00:00Z'`) |
| `getSharedCalendarView` | `Calendars.Read.Shared` | `mailbox` (`text`; required; placeholder `shared@company.com`)<br>`start` (`datetime-local`; required)<br>`end` (`datetime-local`; required)<br>`select` (`text`; optional; placeholder `id,subject,start,end,location,organizer`)<br>`timezone` (`text`; optional; default `Eastern Standard Time`; placeholder `Eastern Standard Time`)<br>`top` (`number`; optional; default `10`; placeholder `10`) |
| `createEvent` | `Calendars.ReadWrite` | `eventInput` (`json`; required; placeholder `{ "key": "value" }`) |
| `updateEvent` | `Calendars.ReadWrite` | `eventId` (`text`; required)<br>`patch` (`json`; required; placeholder `{ "key": "value" }`) |
| `deleteEvent` | `Calendars.ReadWrite` | `eventId` (`text`; required) |

#### `listMyCalendars`
- Scope: `Calendars.ReadBasic`, `Calendars.Read`
- Description: List calendars for the signed-in user.
- Mutation: no
- Inputs:
  - `select` (type: `text`; optional; placeholder: `id,name,canEdit,owner`)

#### `listMyCalendarEvents`
- Scope: `Calendars.Read`, `Calendars.ReadWrite`
- Description: List events from the primary calendar.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,start,end,location,organizer`; placeholder: `id,subject,from,receivedDateTime,isRead`)
  - `filter` (type: `text`; optional; placeholder: `isRead eq false`)
  - `orderby` (type: `text`; optional; placeholder: `receivedDateTime desc`)

#### `getEvent`
- Scope: `Calendars.Read`, `Calendars.ReadWrite`
- Description: Load a single event from the primary calendar.
- Mutation: no
- Inputs:
  - `eventId` (type: `text`; required; placeholder: `AAMkAG...AAA=`)
  - `select` (type: `text`; optional; placeholder: `id,subject,start,end,location,organizer`)

#### `getMyCalendarView`
- Scope: `Calendars.ReadBasic`, `Calendars.Read`, `Calendars.ReadWrite`
- Description: List events inside a specific time window.
- Mutation: no
- Inputs:
  - `start` (type: `datetime-local`; required)
  - `end` (type: `datetime-local`; required)
  - `select` (type: `text`; optional; placeholder: `id,subject,start,end,location,organizer`)
  - `timezone` (type: `text`; optional; default: `Eastern Standard Time`; placeholder: `Eastern Standard Time`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `orderby` (type: `text`; optional; default: `start/dateTime`; placeholder: `start/dateTime`)

#### `listSharedCalendarEvents`
- Scope: `Calendars.Read.Shared`
- Description: List events from a delegated or shared calendar.
- Mutation: no
- Inputs:
  - `mailbox` (type: `text`; required; placeholder: `shared@company.com`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,start,end,location,organizer`; placeholder: `id,subject,start,end,location,organizer`)
  - `filter` (type: `text`; optional; placeholder: `start/dateTime ge '2026-06-01T00:00:00Z'`)

#### `getSharedCalendarView`
- Scope: `Calendars.Read.Shared`
- Description: List a shared calendar's events inside a time window.
- Mutation: no
- Inputs:
  - `mailbox` (type: `text`; required; placeholder: `shared@company.com`)
  - `start` (type: `datetime-local`; required)
  - `end` (type: `datetime-local`; required)
  - `select` (type: `text`; optional; placeholder: `id,subject,start,end,location,organizer`)
  - `timezone` (type: `text`; optional; default: `Eastern Standard Time`; placeholder: `Eastern Standard Time`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)

#### `createEvent`
- Scope: `Calendars.ReadWrite`
- Description: Create a new event on the primary calendar.
- Mutation: yes
- Inputs:
  - `eventInput` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 14; note: Full Microsoft Graph event payload.)
- Sample buttons: `Sample event`

#### `updateEvent`
- Scope: `Calendars.ReadWrite`
- Description: Patch an existing event.
- Mutation: yes
- Inputs:
  - `eventId` (type: `text`; required)
  - `patch` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 10)
- Sample buttons: `Event patch`

#### `deleteEvent`
- Scope: `Calendars.ReadWrite`
- Description: Delete an event from the primary calendar.
- Mutation: yes
- Inputs:
  - `eventId` (type: `text`; required)

### Mail
Mailbox reads, searches, drafts, and message state updates.

| Function | Scope | Options |
| --- | --- | --- |
| `listMyMessagesBasic` | `Mail.ReadBasic` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`filter` (`text`; optional; placeholder `isRead eq false`)<br>`orderby` (`text`; optional; placeholder `receivedDateTime desc`)<br>`skip` (`number`; optional; placeholder `0`) |
| `listInboxMessages` | `Mail.ReadBasic`, `Mail.Read` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder `id,subject,from,receivedDateTime,isRead`)<br>`filter` (`text`; optional; placeholder `isRead eq false`)<br>`orderby` (`text`; optional; placeholder `receivedDateTime desc`) |
| `getMessage` | `Mail.Read`, `Mail.ReadWrite` | `messageId` (`text`; required; placeholder `Quarterly budget update`)<br>`select` (`text`; optional; placeholder `id,subject,from,receivedDateTime,isRead,body`) |
| `searchMyMessages` | `Mail.Read` | `text` (`text`; required; placeholder `expense report`)<br>`top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder `id,subject,from,receivedDateTime,isRead,bodyPreview`) |
| `listUnreadMessages` | `Mail.ReadBasic`, `Mail.Read` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,from,receivedDateTime,isRead`; placeholder `id,subject,from,receivedDateTime,isRead`) |
| `listAllMessages` | `Mail.Read` | `folder` (`text`; optional; default `inbox`; placeholder `inbox`)<br>`select` (`text`; optional; default `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder `id,subject,from,receivedDateTime,isRead,bodyPreview`) |
| `listSharedMailboxMessages` | `Mail.Read.Shared` | `mailbox` (`text`; required; placeholder `shared@company.com`)<br>`top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder `id,subject,from,receivedDateTime,isRead,bodyPreview`)<br>`filter` (`text`; optional; placeholder `isRead eq false`) |
| `listSharedInboxMessages` | `Mail.Read.Shared`, `Mail.ReadBasic.Shared` | `mailbox` (`text`; required; placeholder `shared@company.com`)<br>`top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder `id,subject,from,receivedDateTime,isRead,bodyPreview`) |
| `createDraftMessage` | `Mail.ReadWrite` | `draftInput` (`json`; required; placeholder `{ "key": "value" }`) |
| `createSharedMailboxDraft` | `Mail.ReadWrite.Shared` | `mailbox` (`text`; required; placeholder `shared@company.com`)<br>`draftInput` (`json`; required; placeholder `{ "key": "value" }`) |
| `updateDraftMessage` | `Mail.ReadWrite` | `messageId` (`text`; required; placeholder `Graph tester draft`)<br>`patch` (`json`; required; placeholder `{ "key": "value" }`) |
| `setMessageReadState` | `Mail.ReadWrite` | `messageId` (`text`; required; placeholder `Quarterly budget update`)<br>`isRead` (`boolean`; required; default `true`) |
| `moveMessage` | `Mail.ReadWrite` | `messageId` (`text`; required; placeholder `Quarterly budget update`)<br>`destinationId` (`text`; required; default `Archive`; placeholder `Archive`) |
| `deleteMessage` | `Mail.ReadWrite` | `messageId` (`text`; required; placeholder `Quarterly budget update`) |

#### `listMyMessagesBasic`
- Scope: `Mail.ReadBasic`
- Description: List message metadata from /me/messages.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `filter` (type: `text`; optional; placeholder: `isRead eq false`)
  - `orderby` (type: `text`; optional; placeholder: `receivedDateTime desc`)
  - `skip` (type: `number`; optional; placeholder: `0`)

#### `listInboxMessages`
- Scope: `Mail.ReadBasic`, `Mail.Read`
- Description: List messages in the signed-in user's Inbox.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder: `id,subject,from,receivedDateTime,isRead`)
  - `filter` (type: `text`; optional; placeholder: `isRead eq false`)
  - `orderby` (type: `text`; optional; placeholder: `receivedDateTime desc`)

#### `getMessage`
- Scope: `Mail.Read`, `Mail.ReadWrite`
- Description: Get a single message by ID or subject text, including the body when selected.
- Mutation: no
- Inputs:
  - `messageId` (type: `text`; required; placeholder: `Quarterly budget update`; note: Accepts a raw message ID or a human-friendly subject search. If multiple matches exist, the tester will ask for a narrower value.)
  - `select` (type: `text`; optional; placeholder: `id,subject,from,receivedDateTime,isRead,body`)

#### `searchMyMessages`
- Scope: `Mail.Read`
- Description: Run a full-text message search using subject, sender, or body text.
- Mutation: no
- Inputs:
  - `text` (type: `text`; required; placeholder: `expense report`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder: `id,subject,from,receivedDateTime,isRead,bodyPreview`)

#### `listUnreadMessages`
- Scope: `Mail.ReadBasic`, `Mail.Read`
- Description: Return unread messages from the signed-in mailbox.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,from,receivedDateTime,isRead`; placeholder: `id,subject,from,receivedDateTime,isRead`)

#### `listAllMessages`
- Scope: `Mail.Read`
- Description: Fetch all pages from a selected mail folder.
- Mutation: no
- Inputs:
  - `folder` (type: `text`; optional; default: `inbox`; placeholder: `inbox`)
  - `select` (type: `text`; optional; default: `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder: `id,subject,from,receivedDateTime,isRead,bodyPreview`)
- Notes:
  - This can fetch many pages and return a large payload.

#### `listSharedMailboxMessages`
- Scope: `Mail.Read.Shared`
- Description: List messages from a delegated mailbox.
- Mutation: no
- Inputs:
  - `mailbox` (type: `text`; required; placeholder: `shared@company.com`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder: `id,subject,from,receivedDateTime,isRead,bodyPreview`)
  - `filter` (type: `text`; optional; placeholder: `isRead eq false`)

#### `listSharedInboxMessages`
- Scope: `Mail.Read.Shared`, `Mail.ReadBasic.Shared`
- Description: List Inbox messages from a delegated mailbox.
- Mutation: no
- Inputs:
  - `mailbox` (type: `text`; required; placeholder: `shared@company.com`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,subject,from,receivedDateTime,isRead,bodyPreview`; placeholder: `id,subject,from,receivedDateTime,isRead,bodyPreview`)

#### `createDraftMessage`
- Scope: `Mail.ReadWrite`
- Description: Create a draft message in the signed-in mailbox.
- Mutation: yes
- Inputs:
  - `draftInput` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 12)
- Sample buttons: `Draft payload`

#### `createSharedMailboxDraft`
- Scope: `Mail.ReadWrite.Shared`
- Description: Create a draft message in a delegated mailbox.
- Mutation: yes
- Inputs:
  - `mailbox` (type: `text`; required; placeholder: `shared@company.com`)
  - `draftInput` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 12)
- Sample buttons: `Draft payload`
- Notes:
  - Shared-mailbox drafting needs Mail.ReadWrite.Shared, which is not in the default auth bundle.

#### `updateDraftMessage`
- Scope: `Mail.ReadWrite`
- Description: Patch an existing draft message.
- Mutation: yes
- Inputs:
  - `messageId` (type: `text`; required; placeholder: `Graph tester draft`; note: Accepts a raw draft ID or a friendly subject lookup.)
  - `patch` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 10)
- Sample buttons: `Draft patch`

#### `setMessageReadState`
- Scope: `Mail.ReadWrite`
- Description: Mark a message as read or unread.
- Mutation: yes
- Inputs:
  - `messageId` (type: `text`; required; placeholder: `Quarterly budget update`; note: Accepts a raw message ID or a friendly subject lookup.)
  - `isRead` (type: `boolean`; required; default: `true`)

#### `moveMessage`
- Scope: `Mail.ReadWrite`
- Description: Move a message into another folder.
- Mutation: yes
- Inputs:
  - `messageId` (type: `text`; required; placeholder: `Quarterly budget update`; note: Accepts a raw message ID or a friendly subject lookup.)
  - `destinationId` (type: `text`; required; default: `Archive`; placeholder: `Archive`)

#### `deleteMessage`
- Scope: `Mail.ReadWrite`
- Description: Delete a message from the signed-in mailbox.
- Mutation: yes
- Inputs:
  - `messageId` (type: `text`; required; placeholder: `Quarterly budget update`; note: Accepts a raw message ID or a friendly subject lookup.)

### Mailbox Settings
Mailbox preferences such as time zone and automatic replies.

| Function | Scope | Options |
| --- | --- | --- |
| `getMyMailboxSettings` | `MailboxSettings.ReadWrite` | none |
| `updateMyMailboxSettings` | `MailboxSettings.ReadWrite` | `patch` (`json`; required; placeholder `{ "key": "value" }`) |

#### `getMyMailboxSettings`
- Scope: `MailboxSettings.ReadWrite`
- Description: Load mailbox settings for the current user.
- Mutation: no
- Inputs: none

#### `updateMyMailboxSettings`
- Scope: `MailboxSettings.ReadWrite`
- Description: Patch mailbox settings such as auto-replies or time zone.
- Mutation: yes
- Inputs:
  - `patch` (type: `json`; required; placeholder: `{ "key": "value" }`; rows: 12)
- Sample buttons: `Auto-reply schedule`, `Time zone only`

### Teams Chat
Chats, chat members, and direct chat messaging.

| Function | Scope | Options |
| --- | --- | --- |
| `listMyChats` | `Chat.ReadBasic`, `Chat.Read`, `Chat.ReadWrite` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `id,topic,chatType,lastUpdatedDateTime,webUrl`; placeholder `id,topic,chatType,lastUpdatedDateTime,webUrl`) |
| `searchMyChats` | `Chat.ReadBasic`, `Chat.Read`, `Chat.ReadWrite` | `text` (`text`; required; placeholder `Safety team or Mataan Abucar`)<br>`top` (`number`; optional; default `10`; placeholder `10`) |
| `getChat` | `Chat.Read`, `Chat.ReadWrite` | `chatId` (`text`; required; placeholder `Safety team or Mataan Abucar`)<br>`select` (`text`; optional; placeholder `id,topic,chatType,lastUpdatedDateTime,webUrl`) |
| `listChatMembers` | `Chat.ReadBasic`, `Chat.Read`, `Chat.ReadWrite` | `chatId` (`text`; required; placeholder `Safety team or Mataan Abucar`) |
| `createOneOnOneChat` | `Chat.Create` | `userIdA` (`text`; required; placeholder `person@company.com or Mataan Abucar`)<br>`userIdB` (`text`; required; placeholder `person@company.com or John Smith`) |
| `createGroupChat` | `Chat.Create` | `topic` (`text`; required; placeholder `Graph tester sample group`)<br>`userIds` (`textarea`; required; placeholder `One member per line or a JSON array.`) |
| `listChatMessages` | `ChatMessage.Read`, `Chat.Read`, `Chat.ReadWrite` | `chatId` (`text`; required; placeholder `Safety team or Mataan Abucar`)<br>`top` (`number`; optional; default `20`; placeholder `20`)<br>`select` (`text`; optional; default `id,createdDateTime,from,body,messageType`; placeholder `id,createdDateTime,from,body,messageType`) |
| `listAllChatMessages` | `ChatMessage.Read` | `chatId` (`text`; required; placeholder `Safety team or Mataan Abucar`) |
| `getChatMessage` | `ChatMessage.Read`, `Chat.Read`, `Chat.ReadWrite` | `chatId` (`text`; required; placeholder `Safety team or Mataan Abucar`)<br>`messageId` (`text`; required) |
| `sendChatMessage` | `ChatMessage.Send` | `chatId` (`text`; required; placeholder `Safety team or Mataan Abucar`)<br>`content` (`textarea`; required)<br>`contentType` (`select`; required; default `html`; options `html`, `text`) |

#### `listMyChats`
- Scope: `Chat.ReadBasic`, `Chat.Read`, `Chat.ReadWrite`
- Description: List chats for the signed-in user.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `id,topic,chatType,lastUpdatedDateTime,webUrl`; placeholder: `id,topic,chatType,lastUpdatedDateTime,webUrl`)

#### `searchMyChats`
- Scope: `Chat.ReadBasic`, `Chat.Read`, `Chat.ReadWrite`
- Description: Search chats by topic, participant name, participant email, or chat ID.
- Mutation: no
- Inputs:
  - `text` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
- Notes:
  - Friendly lookup resolves by topic or participant and may prompt when matches are ambiguous.

#### `getChat`
- Scope: `Chat.Read`, `Chat.ReadWrite`
- Description: Load a single chat by ID, chat topic, or participant name.
- Mutation: no
- Inputs:
  - `chatId` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`; note: Accepts a raw chat ID or a friendly chat/participant lookup.)
  - `select` (type: `text`; optional; placeholder: `id,topic,chatType,lastUpdatedDateTime,webUrl`)

#### `listChatMembers`
- Scope: `Chat.ReadBasic`, `Chat.Read`, `Chat.ReadWrite`
- Description: List conversation members for a chat selected by ID, topic, or participant.
- Mutation: no
- Inputs:
  - `chatId` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`)

#### `createOneOnOneChat`
- Scope: `Chat.Create`
- Description: Create a new direct chat between two Azure AD users.
- Mutation: yes
- Inputs:
  - `userIdA` (type: `text`; required; placeholder: `person@company.com or Mataan Abucar`)
  - `userIdB` (type: `text`; required; placeholder: `person@company.com or John Smith`)
- Notes:
  - Chat creation needs Chat.Create, which is not in the default auth bundle.

#### `createGroupChat`
- Scope: `Chat.Create`
- Description: Create a group chat with a topic and member IDs, emails, or names.
- Mutation: yes
- Inputs:
  - `topic` (type: `text`; required; placeholder: `Graph tester sample group`)
  - `userIds` (type: `textarea`; required; placeholder: `One member per line or a JSON array.`; rows: 6; parse mode: `linesOrJsonArray`)
- Notes:
  - Chat creation needs Chat.Create, which is not in the default auth bundle.

#### `listChatMessages`
- Scope: `ChatMessage.Read`, `Chat.Read`, `Chat.ReadWrite`
- Description: Return messages from a chat selected by ID, topic, or participant.
- Mutation: no
- Inputs:
  - `chatId` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`)
  - `top` (type: `number`; optional; default: `20`; placeholder: `20`)
  - `select` (type: `text`; optional; default: `id,createdDateTime,from,body,messageType`; placeholder: `id,createdDateTime,from,body,messageType`)

#### `listAllChatMessages`
- Scope: `ChatMessage.Read`
- Description: Fetch every page of messages from a chat selected by ID, topic, or participant.
- Mutation: no
- Inputs:
  - `chatId` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`)
- Notes:
  - This can fetch many pages and return a large payload.

#### `getChatMessage`
- Scope: `ChatMessage.Read`, `Chat.Read`, `Chat.ReadWrite`
- Description: Load one message from a chat selected by ID, topic, or participant.
- Mutation: no
- Inputs:
  - `chatId` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`)
  - `messageId` (type: `text`; required)

#### `sendChatMessage`
- Scope: `ChatMessage.Send`
- Description: Send a text or HTML message into a chat selected by ID, topic, or participant.
- Mutation: yes
- Inputs:
  - `chatId` (type: `text`; required; placeholder: `Safety team or Mataan Abucar`)
  - `content` (type: `textarea`; required; rows: 5)
  - `contentType` (type: `select`; required; default: `html`; options: `html`, `text`)
- Notes:
  - Sending chat messages needs ChatMessage.Send, which is not in the default auth bundle.

### Teams Channel
Channel posts, replies, and edits.

| Function | Scope | Options |
| --- | --- | --- |
| `sendChannelMessage` | `ChannelMessage.Send` | `teamId` (`text`; required)<br>`channelId` (`text`; required)<br>`content` (`textarea`; required)<br>`contentType` (`select`; required; default `html`; options `html`, `text`)<br>`extra` (`json`; optional; placeholder `{ "key": "value" }`) |
| `sendChannelReply` | `ChannelMessage.Send` | `teamId` (`text`; required)<br>`channelId` (`text`; required)<br>`messageId` (`text`; required)<br>`content` (`textarea`; required)<br>`contentType` (`select`; required; default `html`; options `html`, `text`) |
| `editChannelMessage` | `ChannelMessage.Edit` | `teamId` (`text`; required)<br>`channelId` (`text`; required)<br>`messageId` (`text`; required)<br>`content` (`textarea`; required)<br>`contentType` (`select`; required; default `html`; options `html`, `text`) |
| `editChannelReply` | `ChannelMessage.Edit` | `teamId` (`text`; required)<br>`channelId` (`text`; required)<br>`messageId` (`text`; required)<br>`replyId` (`text`; required)<br>`content` (`textarea`; required)<br>`contentType` (`select`; required; default `html`; options `html`, `text`) |

#### `sendChannelMessage`
- Scope: `ChannelMessage.Send`
- Description: Post a message into a Teams channel.
- Mutation: yes
- Inputs:
  - `teamId` (type: `text`; required)
  - `channelId` (type: `text`; required)
  - `content` (type: `textarea`; required; rows: 5)
  - `contentType` (type: `select`; required; default: `html`; options: `html`, `text`)
  - `extra` (type: `json`; optional; placeholder: `{ "key": "value" }`; rows: 8; note: Optional extra message fields such as subject or importance.)
- Sample buttons: `Extra fields`
- Notes:
  - Sending channel posts needs ChannelMessage.Send, which is not in the default auth bundle.

#### `sendChannelReply`
- Scope: `ChannelMessage.Send`
- Description: Reply to an existing Teams channel thread.
- Mutation: yes
- Inputs:
  - `teamId` (type: `text`; required)
  - `channelId` (type: `text`; required)
  - `messageId` (type: `text`; required)
  - `content` (type: `textarea`; required; rows: 5)
  - `contentType` (type: `select`; required; default: `html`; options: `html`, `text`)
- Notes:
  - Sending channel posts needs ChannelMessage.Send, which is not in the default auth bundle.

#### `editChannelMessage`
- Scope: `ChannelMessage.Edit`
- Description: Edit a channel message sent by the signed-in user.
- Mutation: yes
- Inputs:
  - `teamId` (type: `text`; required)
  - `channelId` (type: `text`; required)
  - `messageId` (type: `text`; required)
  - `content` (type: `textarea`; required; rows: 5)
  - `contentType` (type: `select`; required; default: `html`; options: `html`, `text`)
- Notes:
  - Editing channel posts needs ChannelMessage.Edit, which is not in the default auth bundle.

#### `editChannelReply`
- Scope: `ChannelMessage.Edit`
- Description: Edit a reply inside a Teams channel thread.
- Mutation: yes
- Inputs:
  - `teamId` (type: `text`; required)
  - `channelId` (type: `text`; required)
  - `messageId` (type: `text`; required)
  - `replyId` (type: `text`; required)
  - `content` (type: `textarea`; required; rows: 5)
  - `contentType` (type: `select`; required; default: `html`; options: `html`, `text`)
- Notes:
  - Editing channel posts needs ChannelMessage.Edit, which is not in the default auth bundle.

### People
Relevant people and people search results ranked for the user.

| Function | Scope | Options |
| --- | --- | --- |
| `listRelevantPeople` | `People.Read` | `top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`; placeholder `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`)<br>`filter` (`text`; optional; placeholder `personType/class eq 'Person'`) |
| `searchPeople` | `People.Read` | `text` (`text`; required; placeholder `Mataan`)<br>`top` (`number`; optional; default `10`; placeholder `10`)<br>`select` (`text`; optional; default `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`; placeholder `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`) |

#### `listRelevantPeople`
- Scope: `People.Read`
- Description: Return people ranked as relevant to the current user.
- Mutation: no
- Inputs:
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`; placeholder: `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`)
  - `filter` (type: `text`; optional; placeholder: `personType/class eq 'Person'`)

#### `searchPeople`
- Scope: `People.Read`
- Description: Search relevant people by name or email.
- Mutation: no
- Inputs:
  - `text` (type: `text`; required; placeholder: `Mataan`)
  - `top` (type: `number`; optional; default: `10`; placeholder: `10`)
  - `select` (type: `text`; optional; default: `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`; placeholder: `displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName`)

## Notes
- `offline_access` is included in the default bundle so the auth flow can refresh tokens silently when refresh tokens are available.
- `Mail.Send` is intentionally not exposed by the current mail service surface.
- `teamId` and `channelId` must be supplied explicitly for Teams channel operations; the tester does not discover them automatically.
