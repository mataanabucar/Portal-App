import {
  calendarService,
  mailService,
  mailboxSettingsService,
  peopleService,
  teamsChannelService,
  teamsChatService,
  userService,
} from "../../server/services/graph/index.js";
import { buildOptions } from "../utils/fieldParsers.js";
import {
  resolveChatReference,
  resolveMessageReference,
  resolveUserReference,
  searchChatsByFriendlyText,
} from "../utils/friendlyResolvers.js";

const SERVICE_METADATA = {
  user: {
    label: "User",
    description: "Profiles, directory lookups, and user photos.",
  },
  calendar: {
    label: "Calendar",
    description: "Primary and shared calendar reads plus event mutations.",
  },
  mail: {
    label: "Mail",
    description: "Mailbox reads, searches, drafts, and message state updates.",
  },
  mailboxSettings: {
    label: "Mailbox Settings",
    description: "Mailbox preferences such as time zone and automatic replies.",
  },
  teamsChat: {
    label: "Teams Chat",
    description: "Chats, chat members, and direct chat messaging.",
  },
  teamsChannel: {
    label: "Teams Channel",
    description: "Channel posts, replies, and edits.",
  },
  people: {
    label: "People",
    description: "Relevant people and people search results ranked for the user.",
  },
};

const USER_PATCH_SAMPLE = {
  jobTitle: "Lead Developer",
  officeLocation: "Cincinnati",
};

const EVENT_INPUT_SAMPLE = {
  subject: "Graph tester sample meeting",
  body: {
    contentType: "HTML",
    content: "Created from the standalone Graph tester.",
  },
  start: {
    dateTime: "2026-06-01T14:00:00",
    timeZone: "Eastern Standard Time",
  },
  end: {
    dateTime: "2026-06-01T14:30:00",
    timeZone: "Eastern Standard Time",
  },
  location: {
    displayName: "Conference Room A",
  },
  isOnlineMeeting: true,
  onlineMeetingProvider: "teamsForBusiness",
};

const EVENT_PATCH_SAMPLE = {
  subject: "Updated via Graph tester",
  categories: ["Graph Tester"],
};

const DRAFT_INPUT_SAMPLE = {
  subject: "Graph tester draft",
  body: {
    contentType: "HTML",
    content: "<p>This draft was created by the Graph tester.</p>",
  },
  toRecipients: [
    {
      emailAddress: {
        address: "person@company.com",
      },
    },
  ],
};

const MAILBOX_AUTOREPLY_SAMPLE = {
  automaticRepliesSetting: {
    status: "scheduled",
    scheduledStartDateTime: {
      dateTime: "2026-06-01T18:00:00",
      timeZone: "Eastern Standard Time",
    },
    scheduledEndDateTime: {
      dateTime: "2026-06-05T08:00:00",
      timeZone: "Eastern Standard Time",
    },
    internalReplyMessage: "I am out of office until June 5.",
    externalReplyMessage: "I am out of office until June 5.",
  },
};

const MAILBOX_TIMEZONE_SAMPLE = {
  timeZone: "Eastern Standard Time",
};

const CHANNEL_EXTRA_SAMPLE = {
  subject: "Optional channel subject",
  importance: "high",
};

const FIELD_TYPES = {
  text: "text",
  number: "number",
  boolean: "boolean",
  select: "select",
  textarea: "textarea",
  json: "json",
  dateTimeLocal: "datetime-local",
};

const GRAPH_TESTER_CATALOG = [
  defineEntry({
    service: "user",
    functionName: "getMe",
    label: "Get signed-in user",
    description: "Return the current user profile from /me.",
    outputHint: "user",
    defaults: {
      select: "id,displayName,mail,userPrincipalName,jobTitle,officeLocation",
    },
    fields: [
      textField("select", "$select", {
        description: "Comma-separated profile fields to return.",
        placeholder: "id,displayName,mail,userPrincipalName",
      }),
    ],
    invoke: (token, args) => userService.getMe(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "user",
    functionName: "getMyPhotoMetadata",
    label: "Get photo metadata",
    description: "Return the signed-in user's profile photo metadata.",
    outputHint: "photoMetadata",
    invoke: (token) => userService.getMyPhotoMetadata(token),
  }),
  defineEntry({
    service: "user",
    functionName: "getMyPhotoValue",
    label: "Get photo binary metadata",
    description:
      "Fetch the raw photo response and summarize its headers and size without returning binary.",
    outputHint: "photoBinary",
    invoke: async (token) => {
      const response = await userService.getMyPhotoValue(token);
      const buffer = await response.arrayBuffer();

      return {
        binary: true,
        status: response.status,
        contentType: response.headers.get("content-type") || null,
        sizeBytes: buffer.byteLength,
        contentLength: response.headers.get("content-length") || null,
        etag: response.headers.get("etag") || null,
      };
    },
  }),
  defineEntry({
    service: "user",
    functionName: "listUsers",
    label: "List users",
    description: "Query tenant users through /users.",
    outputHint: "users",
    defaults: {
      top: 10,
      select: "id,displayName,mail,userPrincipalName,jobTitle,officeLocation",
    },
    fields: commonDirectoryFields(),
    invoke: (token, args) => userService.listUsers(token, buildOptions(args, [
      "top",
      "select",
      "filter",
      "orderby",
    ])),
  }),
  defineEntry({
    service: "user",
    functionName: "searchUsers",
    label: "Search users",
    description: "Run a directory search by person name.",
    outputHint: "users",
    defaults: {
      top: 10,
      select: "id,displayName,mail,userPrincipalName,jobTitle",
    },
    requiredFields: ["text"],
    fields: [
      textField("text", "Person name", {
        required: true,
        placeholder: "Mataan",
      }),
      textField("select", "$select", {
        placeholder: "id,displayName,mail,userPrincipalName",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
    ],
    invoke: (token, args) =>
      userService.searchUsers(token, args.text, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "user",
    functionName: "getUser",
    label: "Get user",
    description: "Load one user by ID, email, UPN, or person name.",
    outputHint: "user",
    requiredFields: ["userIdOrUpn"],
    fields: [
      textField("userIdOrUpn", "User ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
        description:
          "Accepts an object ID, UPN/email, or a human-friendly name. Ambiguous names must be narrowed down.",
      }),
      textField("select", "$select", {
        placeholder: "id,displayName,mail,userPrincipalName",
      }),
    ],
    invoke: async (token, args) =>
      userService.getUser(
        token,
        await resolveUserReference(token, args.userIdOrUpn),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "user",
    functionName: "updateUser",
    label: "Update user",
    description: "Patch safe writable properties on a user profile.",
    mutation: true,
    outputHint: "user",
    requiredFields: ["userIdOrUpn", "patch"],
    samplePayloads: {
      patch: [{ label: "Safe patch", value: USER_PATCH_SAMPLE }],
    },
    fields: [
      textField("userIdOrUpn", "User ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
        description:
          "Accepts an object ID, UPN/email, or a human-friendly name.",
      }),
      jsonField("patch", "Patch JSON", {
        required: true,
        rows: 10,
        description: "Send only the writable fields you want to update.",
      }),
    ],
    invoke: async (token, args) =>
      userService.updateUser(
        token,
        await resolveUserReference(token, args.userIdOrUpn),
        args.patch
      ),
  }),
  defineEntry({
    service: "calendar",
    functionName: "listMyCalendars",
    label: "List calendars",
    description: "List calendars for the signed-in user.",
    outputHint: "calendarList",
    fields: [
      textField("select", "$select", {
        placeholder: "id,name,canEdit,owner",
      }),
    ],
    invoke: (token, args) =>
      calendarService.listMyCalendars(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "calendar",
    functionName: "listMyCalendarEvents",
    label: "List calendar events",
    description: "List events from the primary calendar.",
    outputHint: "calendarEvents",
    defaults: {
      top: 10,
      select: "id,subject,start,end,location,organizer",
    },
    fields: commonListFields(),
    invoke: (token, args) =>
      calendarService.listMyCalendarEvents(token, buildOptions(args, [
        "top",
        "select",
        "filter",
        "orderby",
      ])),
  }),
  defineEntry({
    service: "calendar",
    functionName: "getEvent",
    label: "Get event",
    description: "Load a single event from the primary calendar.",
    outputHint: "calendarEvent",
    requiredFields: ["eventId"],
    fields: [
      textField("eventId", "Event ID", {
        required: true,
        placeholder: "AAMkAG...AAA=",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,start,end,location,organizer",
      }),
    ],
    invoke: (token, args) =>
      calendarService.getEvent(token, args.eventId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "calendar",
    functionName: "getMyCalendarView",
    label: "Get calendar view",
    description: "List events inside a specific time window.",
    outputHint: "calendarEvents",
    requiredFields: ["start", "end"],
    defaults: {
      top: 10,
      timezone: "Eastern Standard Time",
      orderby: "start/dateTime",
    },
    fields: [
      dateTimeField("start", "Start", {
        required: true,
      }),
      dateTimeField("end", "End", {
        required: true,
      }),
      textField("select", "$select", {
        placeholder: "id,subject,start,end,location,organizer",
      }),
      textField("timezone", "Timezone", {
        placeholder: "Eastern Standard Time",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("$orderby", "Order by", {
        fieldName: "orderby",
        placeholder: "start/dateTime",
      }),
    ],
    invoke: (token, args) =>
      calendarService.getMyCalendarView(token, args.start, args.end, buildOptions(args, [
        "select",
        "timezone",
        "top",
        "orderby",
      ])),
  }),
  defineEntry({
    service: "calendar",
    functionName: "listSharedCalendarEvents",
    label: "List shared calendar events",
    description: "List events from a delegated or shared calendar.",
    outputHint: "calendarEvents",
    requiredFields: ["mailbox"],
    defaults: {
      top: 10,
      select: "id,subject,start,end,location,organizer",
    },
    fields: [
      textField("mailbox", "Shared mailbox", {
        required: true,
        placeholder: "shared@company.com",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,start,end,location,organizer",
      }),
      textField("filter", "$filter", {
        placeholder: "start/dateTime ge '2026-06-01T00:00:00Z'",
      }),
    ],
    invoke: (token, args) =>
      calendarService.listSharedCalendarEvents(
        token,
        args.mailbox,
        buildOptions(args, ["top", "select", "filter"])
      ),
  }),
  defineEntry({
    service: "calendar",
    functionName: "getSharedCalendarView",
    label: "Get shared calendar view",
    description: "List a shared calendar's events inside a time window.",
    outputHint: "calendarEvents",
    requiredFields: ["mailbox", "start", "end"],
    defaults: {
      top: 10,
      timezone: "Eastern Standard Time",
    },
    fields: [
      textField("mailbox", "Shared mailbox", {
        required: true,
        placeholder: "shared@company.com",
      }),
      dateTimeField("start", "Start", {
        required: true,
      }),
      dateTimeField("end", "End", {
        required: true,
      }),
      textField("select", "$select", {
        placeholder: "id,subject,start,end,location,organizer",
      }),
      textField("timezone", "Timezone", {
        placeholder: "Eastern Standard Time",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
    ],
    invoke: (token, args) =>
      calendarService.getSharedCalendarView(
        token,
        args.mailbox,
        args.start,
        args.end,
        buildOptions(args, ["select", "timezone", "top"])
      ),
  }),
  defineEntry({
    service: "calendar",
    functionName: "createEvent",
    label: "Create event",
    description: "Create a new event on the primary calendar.",
    mutation: true,
    outputHint: "calendarEvent",
    requiredFields: ["eventInput"],
    samplePayloads: {
      eventInput: [{ label: "Sample event", value: EVENT_INPUT_SAMPLE }],
    },
    fields: [
      jsonField("eventInput", "Event JSON", {
        required: true,
        rows: 14,
        description: "Full Microsoft Graph event payload.",
      }),
    ],
    invoke: (token, args) => calendarService.createEvent(token, args.eventInput),
  }),
  defineEntry({
    service: "calendar",
    functionName: "updateEvent",
    label: "Update event",
    description: "Patch an existing event.",
    mutation: true,
    outputHint: "calendarEvent",
    requiredFields: ["eventId", "patch"],
    samplePayloads: {
      patch: [{ label: "Event patch", value: EVENT_PATCH_SAMPLE }],
    },
    fields: [
      textField("eventId", "Event ID", {
        required: true,
      }),
      jsonField("patch", "Patch JSON", {
        required: true,
        rows: 10,
      }),
    ],
    invoke: (token, args) => calendarService.updateEvent(token, args.eventId, args.patch),
  }),
  defineEntry({
    service: "calendar",
    functionName: "deleteEvent",
    label: "Delete event",
    description: "Delete an event from the primary calendar.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["eventId"],
    fields: [
      textField("eventId", "Event ID", {
        required: true,
      }),
    ],
    invoke: (token, args) => calendarService.deleteEvent(token, args.eventId),
  }),
  defineEntry({
    service: "mail",
    functionName: "listMyMessagesBasic",
    label: "List basic messages",
    description: "List message metadata from /me/messages.",
    outputHint: "mailMessages",
    defaults: {
      top: 10,
    },
    fields: [
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("filter", "$filter", {
        placeholder: "isRead eq false",
      }),
      textField("orderby", "$orderby", {
        placeholder: "receivedDateTime desc",
      }),
      numberField("skip", "$skip", {
        placeholder: "0",
      }),
    ],
    invoke: (token, args) =>
      mailService.listMyMessagesBasic(token, buildOptions(args, [
        "top",
        "filter",
        "orderby",
        "skip",
      ])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listInboxMessages",
    label: "List inbox messages",
    description: "List messages in the signed-in user's Inbox.",
    outputHint: "mailMessages",
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: commonListFields(),
    invoke: (token, args) =>
      mailService.listInboxMessages(token, buildOptions(args, [
        "top",
        "select",
        "filter",
        "orderby",
      ])),
  }),
  defineEntry({
    service: "mail",
    functionName: "getMessage",
    label: "Get message",
    description: "Get a single message by ID or subject text, including the body when selected.",
    outputHint: "mailMessage",
    requiredFields: ["messageId"],
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
        description:
          "Accepts a raw message ID or a human-friendly subject search. If multiple matches exist, the tester will ask for a narrower value.",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,from,receivedDateTime,isRead,body",
      }),
    ],
    invoke: async (token, args) =>
      mailService.getMessage(
        token,
        await resolveMessageReference(token, args.messageId),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "searchMyMessages",
    label: "Search messages",
    description: "Run a full-text message search using subject, sender, or body text.",
    outputHint: "mailMessages",
    requiredFields: ["text"],
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      textField("text", "Message subject or text", {
        required: true,
        placeholder: "expense report",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,from,receivedDateTime,isRead,bodyPreview",
      }),
    ],
    invoke: (token, args) =>
      mailService.searchMyMessages(token, args.text, buildOptions(args, ["top", "select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listUnreadMessages",
    label: "List unread messages",
    description: "Return unread messages from the signed-in mailbox.",
    outputHint: "mailMessages",
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead",
    },
    fields: [
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,from,receivedDateTime,isRead",
      }),
    ],
    invoke: (token, args) =>
      mailService.listUnreadMessages(token, buildOptions(args, ["top", "select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listAllMessages",
    label: "List all messages",
    description: "Fetch all pages from a selected mail folder.",
    outputHint: "mailMessages",
    warnings: ["This can fetch many pages and return a large payload."],
    defaults: {
      folder: "inbox",
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      textField("folder", "Folder", {
        placeholder: "inbox",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,from,receivedDateTime,isRead,bodyPreview",
      }),
    ],
    invoke: (token, args) =>
      mailService.listAllMessages(token, buildOptions(args, ["folder", "select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listSharedMailboxMessages",
    label: "List shared mailbox messages",
    description: "List messages from a delegated mailbox.",
    outputHint: "mailMessages",
    requiredFields: ["mailbox"],
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      textField("mailbox", "Shared mailbox", {
        required: true,
        placeholder: "shared@company.com",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,from,receivedDateTime,isRead,bodyPreview",
      }),
      textField("filter", "$filter", {
        placeholder: "isRead eq false",
      }),
    ],
    invoke: (token, args) =>
      mailService.listSharedMailboxMessages(
        token,
        args.mailbox,
        buildOptions(args, ["top", "select", "filter"])
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "listSharedInboxMessages",
    label: "List shared inbox messages",
    description: "List Inbox messages from a delegated mailbox.",
    outputHint: "mailMessages",
    requiredFields: ["mailbox"],
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      textField("mailbox", "Shared mailbox", {
        required: true,
        placeholder: "shared@company.com",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder: "id,subject,from,receivedDateTime,isRead,bodyPreview",
      }),
    ],
    invoke: (token, args) =>
      mailService.listSharedInboxMessages(
        token,
        args.mailbox,
        buildOptions(args, ["top", "select"])
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "createDraftMessage",
    label: "Create draft",
    description: "Create a draft message in the signed-in mailbox.",
    mutation: true,
    outputHint: "mailMessage",
    requiredFields: ["draftInput"],
    samplePayloads: {
      draftInput: [{ label: "Draft payload", value: DRAFT_INPUT_SAMPLE }],
    },
    fields: [
      jsonField("draftInput", "Draft JSON", {
        required: true,
        rows: 12,
      }),
    ],
    invoke: (token, args) => mailService.createDraftMessage(token, args.draftInput),
  }),
  defineEntry({
    service: "mail",
    functionName: "createSharedMailboxDraft",
    label: "Create shared draft",
    description: "Create a draft message in a delegated mailbox.",
    mutation: true,
    outputHint: "mailMessage",
    requiredFields: ["mailbox", "draftInput"],
    samplePayloads: {
      draftInput: [{ label: "Draft payload", value: DRAFT_INPUT_SAMPLE }],
    },
    fields: [
      textField("mailbox", "Shared mailbox", {
        required: true,
        placeholder: "shared@company.com",
      }),
      jsonField("draftInput", "Draft JSON", {
        required: true,
        rows: 12,
      }),
    ],
    invoke: (token, args) =>
      mailService.createSharedMailboxDraft(token, args.mailbox, args.draftInput),
  }),
  defineEntry({
    service: "mail",
    functionName: "updateDraftMessage",
    label: "Update draft",
    description: "Patch an existing draft message.",
    mutation: true,
    outputHint: "mailMessage",
    requiredFields: ["messageId", "patch"],
    samplePayloads: {
      patch: [{ label: "Draft patch", value: { subject: "Updated draft subject" } }],
    },
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Graph tester draft",
        description:
          "Accepts a raw draft ID or a friendly subject lookup.",
      }),
      jsonField("patch", "Patch JSON", {
        required: true,
        rows: 10,
      }),
    ],
    invoke: async (token, args) =>
      mailService.updateDraftMessage(
        token,
        await resolveMessageReference(token, args.messageId),
        args.patch
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "setMessageReadState",
    label: "Set read state",
    description: "Mark a message as read or unread.",
    mutation: true,
    outputHint: "mailMessage",
    requiredFields: ["messageId", "isRead"],
    defaults: {
      isRead: true,
    },
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
        description:
          "Accepts a raw message ID or a friendly subject lookup.",
      }),
      booleanField("isRead", "Mark as read", {
        required: true,
      }),
    ],
    invoke: async (token, args) =>
      mailService.setMessageReadState(
        token,
        await resolveMessageReference(token, args.messageId),
        args.isRead
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "moveMessage",
    label: "Move message",
    description: "Move a message into another folder.",
    mutation: true,
    outputHint: "mailMessage",
    requiredFields: ["messageId", "destinationId"],
    defaults: {
      destinationId: "Archive",
    },
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
        description:
          "Accepts a raw message ID or a friendly subject lookup.",
      }),
      textField("destinationId", "Destination folder", {
        required: true,
        placeholder: "Archive",
      }),
    ],
    invoke: async (token, args) =>
      mailService.moveMessage(
        token,
        await resolveMessageReference(token, args.messageId),
        args.destinationId
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "deleteMessage",
    label: "Delete message",
    description: "Delete a message from the signed-in mailbox.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["messageId"],
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
        description:
          "Accepts a raw message ID or a friendly subject lookup.",
      }),
    ],
    invoke: async (token, args) =>
      mailService.deleteMessage(
        token,
        await resolveMessageReference(token, args.messageId)
      ),
  }),
  defineEntry({
    service: "mailboxSettings",
    functionName: "getMyMailboxSettings",
    label: "Get mailbox settings",
    description: "Load mailbox settings for the current user.",
    outputHint: "mailboxSettings",
    invoke: (token) => mailboxSettingsService.getMyMailboxSettings(token),
  }),
  defineEntry({
    service: "mailboxSettings",
    functionName: "updateMyMailboxSettings",
    label: "Update mailbox settings",
    description: "Patch mailbox settings such as auto-replies or time zone.",
    mutation: true,
    outputHint: "mailboxSettings",
    requiredFields: ["patch"],
    samplePayloads: {
      patch: [
        { label: "Auto-reply schedule", value: MAILBOX_AUTOREPLY_SAMPLE },
        { label: "Time zone only", value: MAILBOX_TIMEZONE_SAMPLE },
      ],
    },
    fields: [
      jsonField("patch", "Patch JSON", {
        required: true,
        rows: 12,
      }),
    ],
    invoke: (token, args) =>
      mailboxSettingsService.updateMyMailboxSettings(token, args.patch),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listMyChats",
    label: "List chats",
    description: "List chats for the signed-in user.",
    outputHint: "chats",
    defaults: {
      top: 10,
      select: "id,topic,chatType,lastUpdatedDateTime,webUrl",
    },
    fields: [
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder: "id,topic,chatType,lastUpdatedDateTime,webUrl",
      }),
    ],
    invoke: (token, args) =>
      teamsChatService.listMyChats(token, buildOptions(args, ["top", "select"])),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "searchMyChats",
    label: "Search chats",
    description: "Search chats by topic, participant name, participant email, or chat ID.",
    outputHint: "chats",
    requiredFields: ["text"],
    defaults: {
      top: 10,
    },
    fields: [
      textField("text", "Chat name or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
    ],
    invoke: (token, args) =>
      searchChatsByFriendlyText(token, args.text, buildOptions(args, ["top"])),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "getChat",
    label: "Get chat",
    description: "Load a single chat by ID, chat topic, or participant name.",
    outputHint: "chat",
    requiredFields: ["chatId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
        description:
          "Accepts a raw chat ID or a friendly chat/participant lookup.",
      }),
      textField("select", "$select", {
        placeholder: "id,topic,chatType,lastUpdatedDateTime,webUrl",
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.getChat(
        token,
        await resolveChatReference(token, args.chatId),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listChatMembers",
    label: "List chat members",
    description: "List conversation members for a chat selected by ID, topic, or participant.",
    outputHint: "people",
    requiredFields: ["chatId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.listChatMembers(
        token,
        await resolveChatReference(token, args.chatId)
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "createOneOnOneChat",
    label: "Create one-on-one chat",
    description: "Create a new direct chat between two Azure AD users.",
    mutation: true,
    outputHint: "chat",
    requiredFields: ["userIdA", "userIdB"],
    fields: [
      textField("userIdA", "First user ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
      }),
      textField("userIdB", "Second user ID, email, or name", {
        required: true,
        placeholder: "person@company.com or John Smith",
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.createOneOnOneChat(
        token,
        await resolveUserReference(token, args.userIdA),
        await resolveUserReference(token, args.userIdB)
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "createGroupChat",
    label: "Create group chat",
    description: "Create a group chat with a topic and member IDs, emails, or names.",
    mutation: true,
    outputHint: "chat",
    requiredFields: ["topic", "userIds"],
    fields: [
      textField("topic", "Chat topic", {
        required: true,
        placeholder: "Graph tester sample group",
      }),
      textareaField("userIds", "User IDs, emails, or names", {
        required: true,
        rows: 6,
        parseMode: "linesOrJsonArray",
        placeholder: "One member per line or a JSON array.",
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.createGroupChat(
        token,
        args.topic,
        await Promise.all(args.userIds.map((userReference) =>
          resolveUserReference(token, userReference)
        ))
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listChatMessages",
    label: "List chat messages",
    description: "Return messages from a chat selected by ID, topic, or participant.",
    outputHint: "chatMessages",
    requiredFields: ["chatId"],
    defaults: {
      top: 20,
      select: "id,createdDateTime,from,body,messageType",
    },
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      numberField("top", "$top", {
        placeholder: "20",
      }),
      textField("select", "$select", {
        placeholder: "id,createdDateTime,from,body,messageType",
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.listChatMessages(
        token,
        await resolveChatReference(token, args.chatId),
        buildOptions(args, ["top", "select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listAllChatMessages",
    label: "List all chat messages",
    description: "Fetch every page of messages from a chat selected by ID, topic, or participant.",
    outputHint: "chatMessages",
    warnings: ["This can fetch many pages and return a large payload."],
    requiredFields: ["chatId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.listAllChatMessages(
        token,
        await resolveChatReference(token, args.chatId)
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "getChatMessage",
    label: "Get chat message",
    description: "Load one message from a chat selected by ID, topic, or participant.",
    outputHint: "chatMessage",
    requiredFields: ["chatId", "messageId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textField("messageId", "Message ID", {
        required: true,
      }),
    ],
    invoke: async (token, args) =>
      teamsChatService.getChatMessage(
        token,
        await resolveChatReference(token, args.chatId),
        args.messageId
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "sendChatMessage",
    label: "Send chat message",
    description: "Send a text or HTML message into a chat selected by ID, topic, or participant.",
    mutation: true,
    outputHint: "chatMessage",
    requiredFields: ["chatId", "content", "contentType"],
    defaults: {
      contentType: "html",
    },
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textareaField("content", "Message content", {
        required: true,
        rows: 5,
      }),
      contentTypeField(),
    ],
    invoke: async (token, args) =>
      teamsChatService.sendChatMessage(
        token,
        await resolveChatReference(token, args.chatId),
        args.content,
        args.contentType
      ),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "sendChannelMessage",
    label: "Send channel message",
    description: "Post a message into a Teams channel.",
    mutation: true,
    outputHint: "chatMessage",
    requiredFields: ["teamId", "channelId", "content", "contentType"],
    defaults: {
      contentType: "html",
    },
    samplePayloads: {
      extra: [{ label: "Extra fields", value: CHANNEL_EXTRA_SAMPLE }],
    },
    fields: [
      textField("teamId", "Team ID", {
        required: true,
      }),
      textField("channelId", "Channel ID", {
        required: true,
      }),
      textareaField("content", "Message content", {
        required: true,
        rows: 5,
      }),
      contentTypeField(),
      jsonField("extra", "Extra JSON", {
        rows: 8,
        description: "Optional extra message fields such as subject or importance.",
      }),
    ],
    invoke: (token, args) =>
      teamsChannelService.sendChannelMessage(
        token,
        args.teamId,
        args.channelId,
        args.content,
        args.contentType,
        args.extra || {}
      ),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "sendChannelReply",
    label: "Send channel reply",
    description: "Reply to an existing Teams channel thread.",
    mutation: true,
    outputHint: "chatMessage",
    requiredFields: ["teamId", "channelId", "messageId", "content", "contentType"],
    defaults: {
      contentType: "html",
    },
    fields: [
      textField("teamId", "Team ID", {
        required: true,
      }),
      textField("channelId", "Channel ID", {
        required: true,
      }),
      textField("messageId", "Parent message ID", {
        required: true,
      }),
      textareaField("content", "Reply content", {
        required: true,
        rows: 5,
      }),
      contentTypeField(),
    ],
    invoke: (token, args) =>
      teamsChannelService.sendChannelReply(
        token,
        args.teamId,
        args.channelId,
        args.messageId,
        args.content,
        args.contentType
      ),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "editChannelMessage",
    label: "Edit channel message",
    description: "Edit a channel message sent by the signed-in user.",
    mutation: true,
    outputHint: "chatMessage",
    requiredFields: ["teamId", "channelId", "messageId", "content", "contentType"],
    defaults: {
      contentType: "html",
    },
    fields: [
      textField("teamId", "Team ID", {
        required: true,
      }),
      textField("channelId", "Channel ID", {
        required: true,
      }),
      textField("messageId", "Message ID", {
        required: true,
      }),
      textareaField("content", "Updated content", {
        required: true,
        rows: 5,
      }),
      contentTypeField(),
    ],
    invoke: (token, args) =>
      teamsChannelService.editChannelMessage(
        token,
        args.teamId,
        args.channelId,
        args.messageId,
        args.content,
        args.contentType
      ),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "editChannelReply",
    label: "Edit channel reply",
    description: "Edit a reply inside a Teams channel thread.",
    mutation: true,
    outputHint: "chatMessage",
    requiredFields: [
      "teamId",
      "channelId",
      "messageId",
      "replyId",
      "content",
      "contentType",
    ],
    defaults: {
      contentType: "html",
    },
    fields: [
      textField("teamId", "Team ID", {
        required: true,
      }),
      textField("channelId", "Channel ID", {
        required: true,
      }),
      textField("messageId", "Parent message ID", {
        required: true,
      }),
      textField("replyId", "Reply ID", {
        required: true,
      }),
      textareaField("content", "Updated content", {
        required: true,
        rows: 5,
      }),
      contentTypeField(),
    ],
    invoke: (token, args) =>
      teamsChannelService.editChannelReply(
        token,
        args.teamId,
        args.channelId,
        args.messageId,
        args.replyId,
        args.content,
        args.contentType
      ),
  }),
  defineEntry({
    service: "people",
    functionName: "listRelevantPeople",
    label: "List relevant people",
    description: "Return people ranked as relevant to the current user.",
    outputHint: "people",
    defaults: {
      top: 10,
      select: "displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName",
    },
    fields: [
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder:
          "displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName",
      }),
      textField("filter", "$filter", {
        placeholder: "personType/class eq 'Person'",
      }),
    ],
    invoke: (token, args) =>
      peopleService.listRelevantPeople(token, buildOptions(args, [
        "top",
        "select",
        "filter",
      ])),
  }),
  defineEntry({
    service: "people",
    functionName: "searchPeople",
    label: "Search people",
    description: "Search relevant people by name or email.",
    outputHint: "people",
    requiredFields: ["text"],
    defaults: {
      top: 10,
      select: "displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName",
    },
    fields: [
      textField("text", "Person name or email", {
        required: true,
        placeholder: "Mataan",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select", {
        placeholder:
          "displayName,jobTitle,officeLocation,scoredEmailAddresses,userPrincipalName",
      }),
    ],
    invoke: (token, args) =>
      peopleService.searchPeople(token, args.text, buildOptions(args, ["top", "select"])),
  }),
];

const CATALOG_INDEX = new Map(
  GRAPH_TESTER_CATALOG.map((entry) => [buildCatalogKey(entry.service, entry.functionName), entry])
);

export function getCatalogEntry(service, functionName) {
  return CATALOG_INDEX.get(buildCatalogKey(service, functionName)) || null;
}

export function getClientCatalog() {
  return Object.entries(SERVICE_METADATA).map(([serviceKey, metadata]) => ({
    key: serviceKey,
    label: metadata.label,
    description: metadata.description,
    functions: GRAPH_TESTER_CATALOG.filter((entry) => entry.service === serviceKey).map(
      serializeCatalogEntry
    ),
  }));
}

function serializeCatalogEntry(entry) {
  const { invoke, ...serializableEntry } = entry;
  return serializableEntry;
}

function buildCatalogKey(service, functionName) {
  return `${service}:${functionName}`;
}

function defineEntry(definition) {
  const metadata = SERVICE_METADATA[definition.service];

  return {
    serviceLabel: metadata.label,
    serviceDescription: metadata.description,
    mutation: false,
    warnings: [],
    fields: [],
    defaults: {},
    samplePayloads: {},
    outputHint: "generic",
    ...definition,
    requiredFields:
      definition.requiredFields ||
      definition.fields?.filter((field) => field.required).map((field) => field.name) ||
      [],
  };
}

function commonDirectoryFields() {
  return [
    numberField("top", "$top", {
      placeholder: "10",
    }),
    textField("select", "$select", {
      placeholder: "id,displayName,mail,userPrincipalName",
    }),
    textField("filter", "$filter", {
      placeholder: "accountEnabled eq true",
    }),
    textField("orderby", "$orderby", {
      placeholder: "displayName",
    }),
  ];
}

function commonListFields() {
  return [
    numberField("top", "$top", {
      placeholder: "10",
    }),
    textField("select", "$select", {
      placeholder: "id,subject,from,receivedDateTime,isRead",
    }),
    textField("filter", "$filter", {
      placeholder: "isRead eq false",
    }),
    textField("orderby", "$orderby", {
      placeholder: "receivedDateTime desc",
    }),
  ];
}

function contentTypeField() {
  return selectField("contentType", "Content type", {
    required: true,
    options: [
      { value: "html", label: "HTML" },
      { value: "text", label: "Text" },
    ],
  });
}

function textField(name, label, overrides = {}) {
  const fieldName = overrides.fieldName || name;

  return {
    name: fieldName,
    label,
    type: FIELD_TYPES.text,
    placeholder: "",
    description: "",
    ...overrides,
  };
}

function numberField(name, label, overrides = {}) {
  return {
    name,
    label,
    type: FIELD_TYPES.number,
    placeholder: "",
    description: "",
    ...overrides,
  };
}

function booleanField(name, label, overrides = {}) {
  return {
    name,
    label,
    type: FIELD_TYPES.boolean,
    description: "",
    ...overrides,
  };
}

function selectField(name, label, overrides = {}) {
  return {
    name,
    label,
    type: FIELD_TYPES.select,
    options: [],
    description: "",
    ...overrides,
  };
}

function textareaField(name, label, overrides = {}) {
  return {
    name,
    label,
    type: FIELD_TYPES.textarea,
    rows: 5,
    placeholder: "",
    description: "",
    ...overrides,
  };
}

function jsonField(name, label, overrides = {}) {
  return {
    name,
    label,
    type: FIELD_TYPES.json,
    rows: 8,
    placeholder: "{\n  \"key\": \"value\"\n}",
    description: "",
    ...overrides,
  };
}

function dateTimeField(name, label, overrides = {}) {
  return {
    name,
    label,
    type: FIELD_TYPES.dateTimeLocal,
    description: "",
    ...overrides,
  };
}
