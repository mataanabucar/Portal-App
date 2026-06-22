import {
  calendarService,
  mailService,
  mailboxSettingsService,
  peopleService,
  teamsChannelService,
  teamsChatService,
  userService,
} from "../../server/services/graph/index.js";
import {
  serviceHealthService,
  reportsService,
  directoryService,
  groupsService,
  tasksService,
  onenoteService,
  sitesService,
  filesService,
  contactsService,
  profileService,
} from "../../server/services/graph/index.js";
import { buildOptions } from "../utils/fieldParsers.js";
import {
  resolveChatReference,
  resolveMessageReference,
  resolveUserReference,
  searchChatsByFriendlyText,
} from "../utils/friendlyResolvers.js";
import { getGraphSelectMetadata } from "./graphSelectOptions.js";

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
  serviceHealth: {
    label: "Service Health",
    description: "Microsoft 365 service health overviews and incident/advisory issues.",
  },
  reports: {
    label: "Reports",
    description: "Usage and activity reports returned as CSV streams.",
  },
  directory: {
    label: "Directory",
    description: "App registrations, service principals, devices, roles, org info, SKUs, and domains.",
  },
  groups: {
    label: "Groups",
    description: "Microsoft 365 and security group management including membership.",
  },
  tasks: {
    label: "Tasks",
    description: "Microsoft To Do task lists and tasks.",
  },
  onenote: {
    label: "OneNote",
    description: "OneNote notebooks, sections, and pages.",
  },
  sites: {
    label: "Sites",
    description: "SharePoint sites, document libraries, lists, list items, and pages.",
  },
  files: {
    label: "Files",
    description: "OneDrive and SharePoint drive items.",
  },
  contacts: {
    label: "Contacts",
    description: "Outlook contacts and contact folders.",
  },
  calendarShared: {
    label: "Calendar (Shared)",
    description: "Create and update events on shared or delegated calendars.",
  },
  mailShared: {
    label: "Mail (Shared)",
    description: "Read, send, and manage messages in shared mailboxes.",
  },
  profile: {
    label: "Profile",
    description: "Microsoft Graph beta profile API — names, emails, phones, positions, and skills.",
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

const GROUP_INPUT_SAMPLE = {
  displayName: "Graph Tester Group",
  mailNickname: "graphtestergroup",
  mailEnabled: false,
  securityEnabled: true,
};

const GROUP_PATCH_SAMPLE = {
  description: "Updated via Graph tester",
  visibility: "Private",
};

const TASK_INPUT_SAMPLE = {
  title: "Graph tester sample task",
  importance: "normal",
  status: "notStarted",
  dueDateTime: {
    dateTime: "2026-12-31T00:00:00",
    timeZone: "Eastern Standard Time",
  },
};

const TASK_PATCH_SAMPLE = {
  status: "inProgress",
  importance: "high",
};

const CONTACT_INPUT_SAMPLE = {
  displayName: "Graph Tester Contact",
  givenName: "Graph",
  surname: "Tester",
  emailAddresses: [{ address: "contact@example.com", name: "Graph Tester Contact" }],
};

const SHARED_EVENT_INPUT_SAMPLE = {
  subject: "Graph tester shared meeting",
  body: { contentType: "HTML", content: "Created from the standalone Graph tester." },
  start: { dateTime: "2026-06-01T14:00:00", timeZone: "Eastern Standard Time" },
  end: { dateTime: "2026-06-01T14:30:00", timeZone: "Eastern Standard Time" },
};

const SEND_MAIL_SAMPLE = {
  subject: "Graph tester test email",
  body: { contentType: "HTML", content: "<p>Sent from the Graph tester.</p>" },
  toRecipients: [{ emailAddress: { address: "person@company.com" } }],
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
    functionName: "getUserManager",
    label: "Get user manager",
    description: "Load the manager for a user selected by ID, email, UPN, or person name.",
    outputHint: "user",
    requiredFields: ["userIdOrUpn"],
    fields: [
      textField("userIdOrUpn", "User ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      userService.getUserManager(
        token,
        await resolveUserReference(token, args.userIdOrUpn),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "user",
    functionName: "listUserDirectReports",
    label: "List user direct reports",
    description: "List direct reports for a user selected by ID, email, UPN, or person name.",
    outputHint: "users",
    requiredFields: ["userIdOrUpn"],
    fields: [
      textField("userIdOrUpn", "User ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      userService.listUserDirectReports(
        token,
        await resolveUserReference(token, args.userIdOrUpn),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "user",
    functionName: "listUserJoinedTeams",
    label: "List user joined teams",
    description: "List Teams teams the selected user has joined.",
    outputHint: "teams",
    requiredFields: ["userIdOrUpn"],
    fields: [
      textField("userIdOrUpn", "User ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      userService.listUserJoinedTeams(
        token,
        await resolveUserReference(token, args.userIdOrUpn),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "user",
    functionName: "listUserMemberOf",
    label: "List user memberOf",
    description: "List directory groups and memberships for a selected user.",
    outputHint: "directoryObjects",
    requiredFields: ["userIdOrUpn"],
    fields: [
      textField("userIdOrUpn", "User ID, email, or name", {
        required: true,
        placeholder: "person@company.com or Mataan Abucar",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      userService.listUserMemberOf(
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
    functionName: "getCalendar",
    label: "Get calendar",
    description: "Load a single calendar by calendar ID.",
    outputHint: "calendar",
    requiredFields: ["calendarId"],
    fields: [
      textField("calendarId", "Calendar ID", {
        required: true,
        placeholder: "AQMkAG...",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      calendarService.getCalendar(token, args.calendarId, buildOptions(args, ["select"])),
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
    fields: commonEventListFields(),
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
    functionName: "listEvents",
    label: "List events",
    description: "List events from /me/events with flexible $select values.",
    outputHint: "calendarEvents",
    defaults: {
      top: 10,
      select: "id,subject,start,end,location,organizer",
    },
    fields: commonEventListFields(),
    invoke: (token, args) =>
      calendarService.listEvents(token, buildOptions(args, [
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
    functionName: "listCalendarEvents",
    label: "List events by calendar",
    description: "List events for a specific calendar ID.",
    outputHint: "calendarEvents",
    requiredFields: ["calendarId"],
    defaults: {
      top: 10,
      select: "id,subject,start,end,location,organizer",
    },
    fields: [
      textField("calendarId", "Calendar ID", {
        required: true,
        placeholder: "AQMkAG...",
      }),
      ...commonEventListFields(),
    ],
    invoke: (token, args) =>
      calendarService.listCalendarEvents(token, args.calendarId, buildOptions(args, [
        "top",
        "select",
        "filter",
        "orderby",
      ])),
  }),
  defineEntry({
    service: "calendar",
    functionName: "listEventInstances",
    label: "List event instances",
    description: "List recurring-event instances inside a specific time window.",
    outputHint: "calendarEvents",
    requiredFields: ["eventId", "start", "end"],
    defaults: {
      top: 10,
      timezone: "Eastern Standard Time",
      select: "id,subject,start,end,location,organizer",
    },
    fields: [
      textField("eventId", "Event ID", {
        required: true,
        placeholder: "AAMkAG...AAA=",
      }),
      dateTimeField("start", "Start", {
        required: true,
      }),
      dateTimeField("end", "End", {
        required: true,
      }),
      textField("select", "$select"),
      textField("timezone", "Timezone", {
        placeholder: "Eastern Standard Time",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
    ],
    invoke: (token, args) =>
      calendarService.listEventInstances(
        token,
        args.eventId,
        args.start,
        args.end,
        buildOptions(args, ["top", "select", "timezone"])
      ),
  }),
  defineEntry({
    service: "calendar",
    functionName: "listEventAttachments",
    label: "List event attachments",
    description: "List attachments for an event.",
    outputHint: "attachments",
    requiredFields: ["eventId"],
    fields: [
      textField("eventId", "Event ID", {
        required: true,
        placeholder: "AAMkAG...AAA=",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      calendarService.listEventAttachments(
        token,
        args.eventId,
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "calendar",
    functionName: "getEventAttachment",
    label: "Get event attachment",
    description: "Load a single event attachment by attachment ID.",
    outputHint: "attachment",
    requiredFields: ["eventId", "attachmentId"],
    fields: [
      textField("eventId", "Event ID", {
        required: true,
        placeholder: "AAMkAG...AAA=",
      }),
      textField("attachmentId", "Attachment ID", {
        required: true,
        placeholder: "AAMkAD...",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      calendarService.getEventAttachment(
        token,
        args.eventId,
        args.attachmentId,
        buildOptions(args, ["select"])
      ),
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
    functionName: "listMessages",
    label: "List messages",
    description: "List messages from /me/messages with a configurable $select list.",
    outputHint: "mailMessages",
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select"),
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
      mailService.listMessages(token, buildOptions(args, [
        "top",
        "select",
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
    functionName: "listMessagesInFolder",
    label: "List folder messages",
    description: "List messages from a specific mail folder ID or well-known folder name.",
    outputHint: "mailMessages",
    requiredFields: ["folderId"],
    defaults: {
      top: 10,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      textField("folderId", "Folder ID or well-known name", {
        required: true,
        placeholder: "inbox or AQMkAG...",
      }),
      numberField("top", "$top", {
        placeholder: "10",
      }),
      textField("select", "$select"),
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
      mailService.listMessagesInFolder(token, args.folderId, buildOptions(args, [
        "top",
        "select",
        "filter",
        "orderby",
        "skip",
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
    functionName: "getMessageMime",
    label: "Get message MIME",
    description: "Fetch the MIME payload for a single message without returning binary directly.",
    outputHint: "mimeContent",
    requiredFields: ["messageId"],
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
      }),
    ],
    invoke: async (token, args) => {
      const response = await mailService.getMessageMime(
        token,
        await resolveMessageReference(token, args.messageId)
      );
      const buffer = await response.arrayBuffer();
      const mimeText = new TextDecoder().decode(buffer);

      return {
        binary: true,
        status: response.status,
        contentType: response.headers.get("content-type") || null,
        sizeBytes: buffer.byteLength,
        preview: mimeText.slice(0, 4000),
      };
    },
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
    functionName: "deltaMessages",
    label: "Delta messages",
    description: "Start or continue a delta query for a specific mail folder.",
    outputHint: "mailDelta",
    requiredFields: ["folderId"],
    defaults: {
      top: 25,
      select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    },
    fields: [
      textField("folderId", "Folder ID or well-known name", {
        required: true,
        placeholder: "inbox or AQMkAG...",
      }),
      numberField("top", "$top", {
        placeholder: "25",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailService.deltaMessages(token, args.folderId, buildOptions(args, ["top", "select"])),
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
    functionName: "listMailFolders",
    label: "List mail folders",
    description: "List mail folders for the signed-in mailbox.",
    outputHint: "mailFolders",
    fields: [
      numberField("top", "$top", {
        placeholder: "25",
      }),
      textField("select", "$select"),
      textField("filter", "$filter", {
        placeholder: "childFolderCount gt 0",
      }),
    ],
    invoke: (token, args) =>
      mailService.listMailFolders(token, buildOptions(args, ["top", "select", "filter"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "getMailFolder",
    label: "Get mail folder",
    description: "Load one mail folder by folder ID or well-known folder name.",
    outputHint: "mailFolder",
    requiredFields: ["folderId"],
    fields: [
      textField("folderId", "Folder ID or well-known name", {
        required: true,
        placeholder: "inbox or AQMkAG...",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailService.getMailFolder(token, args.folderId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listChildFolders",
    label: "List child folders",
    description: "List child folders under a specific parent folder.",
    outputHint: "mailFolders",
    requiredFields: ["folderId"],
    fields: [
      textField("folderId", "Folder ID or well-known name", {
        required: true,
        placeholder: "inbox or AQMkAG...",
      }),
      numberField("top", "$top", {
        placeholder: "25",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailService.listChildFolders(token, args.folderId, buildOptions(args, ["top", "select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listAttachments",
    label: "List message attachments",
    description: "List attachments for a selected message.",
    outputHint: "attachments",
    requiredFields: ["messageId"],
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      mailService.listAttachments(
        token,
        await resolveMessageReference(token, args.messageId),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "getAttachment",
    label: "Get message attachment",
    description: "Load one message attachment by attachment ID.",
    outputHint: "attachment",
    requiredFields: ["messageId", "attachmentId"],
    fields: [
      textField("messageId", "Message ID or subject", {
        required: true,
        placeholder: "Quarterly budget update",
      }),
      textField("attachmentId", "Attachment ID", {
        required: true,
        placeholder: "AAMkAD...",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      mailService.getAttachment(
        token,
        await resolveMessageReference(token, args.messageId),
        args.attachmentId,
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "mail",
    functionName: "listMessageRules",
    label: "List message rules",
    description: "List Inbox message rules for the signed-in mailbox.",
    outputHint: "messageRules",
    fields: [
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailService.listMessageRules(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "getMessageRule",
    label: "Get message rule",
    description: "Load a single Inbox message rule by rule ID.",
    outputHint: "messageRule",
    requiredFields: ["messageRuleId"],
    fields: [
      textField("messageRuleId", "Message rule ID", {
        required: true,
        placeholder: "AQAAANCM...",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailService.getMessageRule(token, args.messageRuleId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "mail",
    functionName: "listOutlookCategories",
    label: "List Outlook categories",
    description: "List master categories for the signed-in mailbox.",
    outputHint: "categories",
    fields: [
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailService.listOutlookCategories(token, buildOptions(args, ["select"])),
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
    fields: [
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      mailboxSettingsService.getMyMailboxSettings(token, buildOptions(args, ["select"])),
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
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.listChatMembers(
        token,
        await resolveChatReference(token, args.chatId),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "getChatMember",
    label: "Get chat member",
    description: "Load a single chat member by membership ID.",
    outputHint: "person",
    requiredFields: ["chatId", "membershipId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textField("membershipId", "Membership ID", {
        required: true,
        placeholder: "MCMjMCMj...",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.getChatMember(
        token,
        await resolveChatReference(token, args.chatId),
        args.membershipId,
        buildOptions(args, ["select"])
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
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.getChatMessage(
        token,
        await resolveChatReference(token, args.chatId),
        args.messageId,
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listChatMessageHostedContents",
    label: "List chat hosted contents",
    description: "List hosted content records for a chat message.",
    outputHint: "attachments",
    requiredFields: ["chatId", "messageId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textField("messageId", "Message ID", {
        required: true,
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.listChatMessageHostedContents(
        token,
        await resolveChatReference(token, args.chatId),
        args.messageId,
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "getChatMessageHostedContent",
    label: "Get chat hosted content",
    description: "Load a single hosted content record from a chat message.",
    outputHint: "attachment",
    requiredFields: ["chatId", "messageId", "hostedContentId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textField("messageId", "Message ID", {
        required: true,
      }),
      textField("hostedContentId", "Hosted content ID", {
        required: true,
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.getChatMessageHostedContent(
        token,
        await resolveChatReference(token, args.chatId),
        args.messageId,
        args.hostedContentId,
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listChatTabs",
    label: "List chat tabs",
    description: "List tabs configured in a chat.",
    outputHint: "tabs",
    requiredFields: ["chatId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.listChatTabs(
        token,
        await resolveChatReference(token, args.chatId),
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChat",
    functionName: "listChatInstalledApps",
    label: "List chat installed apps",
    description: "List installed Teams apps for a chat.",
    outputHint: "teamsApps",
    requiredFields: ["chatId"],
    fields: [
      textField("chatId", "Chat ID, topic, or participant", {
        required: true,
        placeholder: "Safety team or Mataan Abucar",
      }),
      textField("select", "$select"),
    ],
    invoke: async (token, args) =>
      teamsChatService.listChatInstalledApps(
        token,
        await resolveChatReference(token, args.chatId),
        buildOptions(args, ["select"])
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
    functionName: "listChannels",
    label: "List channels",
    description: "List channels for a Teams team.",
    outputHint: "channels",
    requiredFields: ["teamId"],
    fields: [
      textField("teamId", "Team ID", {
        required: true,
        placeholder: "19:teamid@thread.tacv2",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      teamsChannelService.listChannels(token, args.teamId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "getChannel",
    label: "Get channel",
    description: "Load a single Teams channel by team ID and channel ID.",
    outputHint: "channel",
    requiredFields: ["teamId", "channelId"],
    fields: [
      textField("teamId", "Team ID", {
        required: true,
        placeholder: "19:teamid@thread.tacv2",
      }),
      textField("channelId", "Channel ID", {
        required: true,
        placeholder: "19:channelid@thread.tacv2",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      teamsChannelService.getChannel(
        token,
        args.teamId,
        args.channelId,
        buildOptions(args, ["select"])
      ),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "listChannelMessages",
    label: "List channel messages",
    description: "List root messages for a Teams channel.",
    outputHint: "chatMessages",
    requiredFields: ["teamId", "channelId"],
    defaults: {
      top: 20,
      select: "id,createdDateTime,from,body,messageType",
    },
    fields: [
      textField("teamId", "Team ID", {
        required: true,
        placeholder: "19:teamid@thread.tacv2",
      }),
      textField("channelId", "Channel ID", {
        required: true,
        placeholder: "19:channelid@thread.tacv2",
      }),
      numberField("top", "$top", {
        placeholder: "20",
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      teamsChannelService.listChannelMessages(
        token,
        args.teamId,
        args.channelId,
        buildOptions(args, ["top", "select"])
      ),
  }),
  defineEntry({
    service: "teamsChannel",
    functionName: "getChannelMessage",
    label: "Get channel message",
    description: "Load a single channel message by team, channel, and message ID.",
    outputHint: "chatMessage",
    requiredFields: ["teamId", "channelId", "messageId"],
    fields: [
      textField("teamId", "Team ID", {
        required: true,
        placeholder: "19:teamid@thread.tacv2",
      }),
      textField("channelId", "Channel ID", {
        required: true,
        placeholder: "19:channelid@thread.tacv2",
      }),
      textField("messageId", "Message ID", {
        required: true,
      }),
      textField("select", "$select"),
    ],
    invoke: (token, args) =>
      teamsChannelService.getChannelMessage(
        token,
        args.teamId,
        args.channelId,
        args.messageId,
        buildOptions(args, ["select"])
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
  defineEntry({
    service: "serviceHealth",
    functionName: "listServiceHealthOverviews",
    label: "List service health overviews",
    description: "List Microsoft 365 service health overview records.",
    outputHint: "generic",
    defaults: { select: "id,service,status" },
    fields: [
      textField("select", "$select", { placeholder: "id,service,status" }),
    ],
    invoke: (token, args) =>
      serviceHealthService.listServiceHealthOverviews(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "serviceHealth",
    functionName: "getServiceHealthOverview",
    label: "Get service health overview",
    description: "Get the health overview for one service by its service name.",
    outputHint: "generic",
    requiredFields: ["serviceName"],
    defaults: { select: "id,service,status" },
    fields: [
      textField("serviceName", "Service name", { required: true, placeholder: "Exchange Online" }),
      textField("select", "$select", { placeholder: "id,service,status" }),
    ],
    invoke: (token, args) =>
      serviceHealthService.getServiceHealthOverview(token, args.serviceName, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "serviceHealth",
    functionName: "listServiceHealthIssues",
    label: "List service health issues",
    description: "List service incidents and advisories.",
    outputHint: "generic",
    defaults: { select: "id,title,service,status,isResolved,startDateTime" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,title,service,status,isResolved" }),
    ],
    invoke: (token, args) =>
      serviceHealthService.listServiceHealthIssues(token, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "serviceHealth",
    functionName: "getServiceHealthIssue",
    label: "Get service health issue",
    description: "Get one service incident or advisory by issue ID.",
    outputHint: "generic",
    requiredFields: ["issueId"],
    fields: [
      textField("issueId", "Issue ID", { required: true, placeholder: "EX123456" }),
      textField("select", "$select", { placeholder: "id,title,service,status" }),
    ],
    invoke: (token, args) =>
      serviceHealthService.getServiceHealthIssue(token, args.issueId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "reports",
    functionName: "getEmailActivityUserDetail",
    label: "Email activity user detail",
    description: "Returns a CSV report of per-user email activity for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getEmailActivityUserDetail(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getEmailActivityCounts",
    label: "Email activity counts",
    description: "Returns a CSV report of email activity aggregates for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getEmailActivityCounts(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getEmailActivityUserCounts",
    label: "Email activity user counts",
    description: "Returns a CSV report of daily active user counts for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getEmailActivityUserCounts(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getEmailAppUsageUserDetail",
    label: "Email app usage user detail",
    description: "Returns a CSV report of email app usage per user for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getEmailAppUsageUserDetail(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getMailboxUsageDetail",
    label: "Mailbox usage detail",
    description: "Returns a CSV report of per-mailbox storage usage for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getMailboxUsageDetail(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getSharePointSiteUsageDetail",
    label: "SharePoint site usage detail",
    description: "Returns a CSV report of per-site SharePoint usage for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getSharePointSiteUsageDetail(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getOneDriveUsageAccountDetail",
    label: "OneDrive usage account detail",
    description: "Returns a CSV report of per-user OneDrive usage for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getOneDriveUsageAccountDetail(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "reports",
    functionName: "getOffice365ActiveUserDetail",
    label: "Office 365 active user detail",
    description: "Returns a CSV report of Office 365 active users for the selected period.",
    outputHint: "mimeContent",
    requiredFields: ["period"],
    defaults: { period: "D30" },
    fields: [
      selectField("period", "Period", {
        required: true,
        options: [
          { value: "D7", label: "Last 7 days" },
          { value: "D30", label: "Last 30 days" },
          { value: "D90", label: "Last 90 days" },
          { value: "D180", label: "Last 180 days" },
        ],
      }),
    ],
    invoke: async (token, args) => {
      const response = await reportsService.getOffice365ActiveUserDetail(token, args.period);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 3000) };
    },
  }),
  defineEntry({
    service: "directory",
    functionName: "listApplications",
    label: "List applications",
    description: "List app registrations in the directory.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,appId,displayName,signInAudience,createdDateTime" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,appId,displayName,signInAudience" }),
      textField("filter", "$filter", { placeholder: "startsWith(displayName,'Graph')" }),
    ],
    invoke: (token, args) =>
      directoryService.listApplications(token, buildOptions(args, ["top", "select", "filter"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "getApplication",
    label: "Get application",
    description: "Load one app registration by object ID.",
    outputHint: "generic",
    requiredFields: ["appId"],
    fields: [
      textField("appId", "Object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,appId,displayName" }),
    ],
    invoke: (token, args) =>
      directoryService.getApplication(token, args.appId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "listServicePrincipals",
    label: "List service principals",
    description: "List enterprise applications (service principals) in the directory.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,appId,displayName,servicePrincipalType,accountEnabled" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,appId,displayName,servicePrincipalType" }),
      textField("filter", "$filter", { placeholder: "accountEnabled eq true" }),
    ],
    invoke: (token, args) =>
      directoryService.listServicePrincipals(token, buildOptions(args, ["top", "select", "filter"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "getServicePrincipal",
    label: "Get service principal",
    description: "Load one service principal by object ID.",
    outputHint: "generic",
    requiredFields: ["spId"],
    fields: [
      textField("spId", "Object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,appId,displayName" }),
    ],
    invoke: (token, args) =>
      directoryService.getServicePrincipal(token, args.spId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "listDevices",
    label: "List devices",
    description: "List Entra-registered devices.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,displayName,operatingSystem,operatingSystemVersion,isCompliant,isManaged" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,displayName,operatingSystem" }),
      textField("filter", "$filter", { placeholder: "accountEnabled eq true" }),
    ],
    invoke: (token, args) =>
      directoryService.listDevices(token, buildOptions(args, ["top", "select", "filter"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "getDevice",
    label: "Get device",
    description: "Load one device by object ID.",
    outputHint: "generic",
    requiredFields: ["deviceId"],
    fields: [
      textField("deviceId", "Object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,operatingSystem" }),
    ],
    invoke: (token, args) =>
      directoryService.getDevice(token, args.deviceId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "listDirectoryRoles",
    label: "List directory roles",
    description: "List activated directory roles in the tenant.",
    outputHint: "generic",
    defaults: { select: "id,displayName,description,roleTemplateId" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,description" }),
    ],
    invoke: (token, args) =>
      directoryService.listDirectoryRoles(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "getDirectoryRole",
    label: "Get directory role",
    description: "Load one directory role by object ID.",
    outputHint: "generic",
    requiredFields: ["roleId"],
    fields: [
      textField("roleId", "Role object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,description" }),
    ],
    invoke: (token, args) =>
      directoryService.getDirectoryRole(token, args.roleId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "listDirectoryRoleMembers",
    label: "List directory role members",
    description: "List users assigned to a directory role.",
    outputHint: "users",
    requiredFields: ["roleId"],
    defaults: { select: "id,displayName,userPrincipalName,mail,jobTitle" },
    fields: [
      textField("roleId", "Role object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,userPrincipalName" }),
    ],
    invoke: (token, args) =>
      directoryService.listDirectoryRoleMembers(token, args.roleId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "getOrganization",
    label: "Get organization",
    description: "Load tenant organization details.",
    outputHint: "generic",
    defaults: { select: "id,displayName,verifiedDomains,assignedPlans,businessPhones,city,country" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,verifiedDomains" }),
    ],
    invoke: (token, args) =>
      directoryService.getOrganization(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "listSubscribedSkus",
    label: "List subscribed SKUs",
    description: "List license SKUs subscribed by the tenant.",
    outputHint: "generic",
    defaults: { select: "id,skuPartNumber,capabilityStatus,consumedUnits,prepaidUnits" },
    fields: [
      textField("select", "$select", { placeholder: "id,skuPartNumber,capabilityStatus" }),
    ],
    invoke: (token, args) =>
      directoryService.listSubscribedSkus(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "listDomains",
    label: "List domains",
    description: "List tenant verified and unverified domains.",
    outputHint: "generic",
    defaults: { select: "id,isVerified,isDefault,isInitial,supportedServices,state" },
    fields: [
      textField("select", "$select", { placeholder: "id,isVerified,isDefault" }),
    ],
    invoke: (token, args) =>
      directoryService.listDomains(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "directory",
    functionName: "getDomain",
    label: "Get domain",
    description: "Load one domain by its domain name.",
    outputHint: "generic",
    requiredFields: ["domainId"],
    fields: [
      textField("domainId", "Domain name", { required: true, placeholder: "contoso.com" }),
      textField("select", "$select", { placeholder: "id,isVerified,isDefault" }),
    ],
    invoke: (token, args) =>
      directoryService.getDomain(token, args.domainId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "groups",
    functionName: "listGroups",
    label: "List groups",
    description: "List Microsoft 365 and security groups.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,displayName,mail,mailEnabled,securityEnabled,groupTypes,visibility" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,displayName,mail,groupTypes" }),
      textField("filter", "$filter", { placeholder: "startsWith(displayName,'Sales')" }),
      textField("orderby", "$orderby", { placeholder: "displayName" }),
    ],
    invoke: (token, args) =>
      groupsService.listGroups(token, buildOptions(args, ["top", "select", "filter", "orderby"])),
  }),
  defineEntry({
    service: "groups",
    functionName: "getGroup",
    label: "Get group",
    description: "Load one group by object ID.",
    outputHint: "generic",
    requiredFields: ["groupId"],
    fields: [
      textField("groupId", "Group object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,mail,groupTypes" }),
    ],
    invoke: (token, args) =>
      groupsService.getGroup(token, args.groupId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "groups",
    functionName: "listGroupMembers",
    label: "List group members",
    description: "List direct members of a group, cast to users.",
    outputHint: "users",
    requiredFields: ["groupId"],
    defaults: { select: "id,displayName,userPrincipalName,mail,jobTitle" },
    fields: [
      textField("groupId", "Group object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,userPrincipalName" }),
    ],
    invoke: (token, args) =>
      groupsService.listGroupMembers(token, args.groupId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "groups",
    functionName: "listGroupTransitiveMembers",
    label: "List group transitive members",
    description: "List all nested group members, cast to users.",
    outputHint: "users",
    requiredFields: ["groupId"],
    defaults: { select: "id,displayName,userPrincipalName,mail,jobTitle" },
    fields: [
      textField("groupId", "Group object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,userPrincipalName" }),
    ],
    invoke: (token, args) =>
      groupsService.listGroupTransitiveMembers(token, args.groupId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "groups",
    functionName: "listGroupOwners",
    label: "List group owners",
    description: "List group owners, cast to users.",
    outputHint: "users",
    requiredFields: ["groupId"],
    defaults: { select: "id,displayName,userPrincipalName,mail" },
    fields: [
      textField("groupId", "Group object ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,userPrincipalName" }),
    ],
    invoke: (token, args) =>
      groupsService.listGroupOwners(token, args.groupId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "groups",
    functionName: "createGroup",
    label: "Create group",
    description: "Create a new Microsoft 365 or security group.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["groupInput"],
    samplePayloads: { groupInput: [{ label: "Security group", value: GROUP_INPUT_SAMPLE }] },
    fields: [
      jsonField("groupInput", "Group JSON", { required: true, rows: 12, description: "Full group creation payload." }),
    ],
    invoke: (token, args) => groupsService.createGroup(token, args.groupInput),
  }),
  defineEntry({
    service: "groups",
    functionName: "updateGroup",
    label: "Update group",
    description: "Patch writable properties on a group.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["groupId", "patch"],
    samplePayloads: { patch: [{ label: "Group patch", value: GROUP_PATCH_SAMPLE }] },
    fields: [
      textField("groupId", "Group object ID", { required: true, placeholder: "00000000-..." }),
      jsonField("patch", "Patch JSON", { required: true, rows: 8 }),
    ],
    invoke: (token, args) => groupsService.updateGroup(token, args.groupId, args.patch),
  }),
  defineEntry({
    service: "groups",
    functionName: "addGroupMember",
    label: "Add group member",
    description: "Add a user or other directory object to a group.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["groupId", "memberOdataId"],
    fields: [
      textField("groupId", "Group object ID", { required: true, placeholder: "00000000-..." }),
      textField("memberOdataId", "Member @odata.id URL", {
        required: true,
        placeholder: "https://graph.microsoft.com/v1.0/directoryObjects/00000000-...",
        description: "Full @odata.id reference for the user or object to add.",
      }),
    ],
    invoke: (token, args) => groupsService.addGroupMember(token, args.groupId, args.memberOdataId),
  }),
  defineEntry({
    service: "tasks",
    functionName: "listTodoLists",
    label: "List To Do lists",
    description: "List all Microsoft To Do task lists for the signed-in user.",
    outputHint: "generic",
    defaults: { select: "id,displayName,isOwner,isShared,wellknownListName" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,isOwner,wellknownListName" }),
    ],
    invoke: (token, args) =>
      tasksService.listTodoLists(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "tasks",
    functionName: "getTodoList",
    label: "Get To Do list",
    description: "Load one To Do task list by ID.",
    outputHint: "generic",
    requiredFields: ["listId"],
    fields: [
      textField("listId", "List ID", { required: true, placeholder: "AQMkAG..." }),
      textField("select", "$select", { placeholder: "id,displayName,isOwner" }),
    ],
    invoke: (token, args) =>
      tasksService.getTodoList(token, args.listId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "tasks",
    functionName: "listTasks",
    label: "List tasks",
    description: "List tasks in a To Do task list.",
    outputHint: "generic",
    requiredFields: ["listId"],
    defaults: { top: 25, select: "id,title,status,importance,dueDateTime,createdDateTime,completedDateTime" },
    fields: [
      textField("listId", "List ID", { required: true, placeholder: "AQMkAG..." }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,title,status,importance" }),
      textField("filter", "$filter", { placeholder: "status eq 'notStarted'" }),
    ],
    invoke: (token, args) =>
      tasksService.listTasks(token, args.listId, buildOptions(args, ["select", "top", "filter"])),
  }),
  defineEntry({
    service: "tasks",
    functionName: "getTask",
    label: "Get task",
    description: "Load one task by list ID and task ID.",
    outputHint: "generic",
    requiredFields: ["listId", "taskId"],
    fields: [
      textField("listId", "List ID", { required: true, placeholder: "AQMkAG..." }),
      textField("taskId", "Task ID", { required: true, placeholder: "AQMkAH..." }),
      textField("select", "$select", { placeholder: "id,title,status,importance" }),
    ],
    invoke: (token, args) =>
      tasksService.getTask(token, args.listId, args.taskId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "tasks",
    functionName: "createTask",
    label: "Create task",
    description: "Create a new task in a To Do list.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["listId", "taskInput"],
    samplePayloads: { taskInput: [{ label: "Sample task", value: TASK_INPUT_SAMPLE }] },
    fields: [
      textField("listId", "List ID", { required: true, placeholder: "AQMkAG..." }),
      jsonField("taskInput", "Task JSON", { required: true, rows: 12 }),
    ],
    invoke: (token, args) => tasksService.createTask(token, args.listId, args.taskInput),
  }),
  defineEntry({
    service: "tasks",
    functionName: "updateTask",
    label: "Update task",
    description: "Patch an existing task.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["listId", "taskId", "patch"],
    samplePayloads: { patch: [{ label: "Task patch", value: TASK_PATCH_SAMPLE }] },
    fields: [
      textField("listId", "List ID", { required: true, placeholder: "AQMkAG..." }),
      textField("taskId", "Task ID", { required: true, placeholder: "AQMkAH..." }),
      jsonField("patch", "Patch JSON", { required: true, rows: 8 }),
    ],
    invoke: (token, args) => tasksService.updateTask(token, args.listId, args.taskId, args.patch),
  }),
  defineEntry({
    service: "onenote",
    functionName: "listNotebooks",
    label: "List notebooks",
    description: "List OneNote notebooks for the signed-in user.",
    outputHint: "generic",
    defaults: { select: "id,displayName,createdDateTime,lastModifiedDateTime,isDefault" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,isDefault" }),
    ],
    invoke: (token, args) =>
      onenoteService.listNotebooks(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "onenote",
    functionName: "getNotebook",
    label: "Get notebook",
    description: "Load one OneNote notebook by ID.",
    outputHint: "generic",
    requiredFields: ["notebookId"],
    fields: [
      textField("notebookId", "Notebook ID", { required: true, placeholder: "1-abc..." }),
      textField("select", "$select", { placeholder: "id,displayName,isDefault" }),
    ],
    invoke: (token, args) =>
      onenoteService.getNotebook(token, args.notebookId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "onenote",
    functionName: "listSections",
    label: "List sections",
    description: "List all OneNote sections for the signed-in user.",
    outputHint: "generic",
    defaults: { select: "id,displayName,createdDateTime,lastModifiedDateTime" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,createdDateTime" }),
    ],
    invoke: (token, args) =>
      onenoteService.listSections(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "onenote",
    functionName: "getSection",
    label: "Get section",
    description: "Load one OneNote section by ID.",
    outputHint: "generic",
    requiredFields: ["sectionId"],
    fields: [
      textField("sectionId", "Section ID", { required: true, placeholder: "1-abc..." }),
      textField("select", "$select", { placeholder: "id,displayName" }),
    ],
    invoke: (token, args) =>
      onenoteService.getSection(token, args.sectionId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "onenote",
    functionName: "listPages",
    label: "List pages",
    description: "List OneNote pages for the signed-in user.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,title,createdDateTime,lastModifiedDateTime" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,title,createdDateTime" }),
    ],
    invoke: (token, args) =>
      onenoteService.listPages(token, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "onenote",
    functionName: "getPage",
    label: "Get page",
    description: "Load one OneNote page metadata by page ID.",
    outputHint: "generic",
    requiredFields: ["pageId"],
    fields: [
      textField("pageId", "Page ID", { required: true, placeholder: "1-abc..." }),
      textField("select", "$select", { placeholder: "id,title,createdDateTime" }),
    ],
    invoke: (token, args) =>
      onenoteService.getPage(token, args.pageId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "onenote",
    functionName: "getPageContent",
    label: "Get page content",
    description: "Fetch the HTML content of a OneNote page.",
    outputHint: "mimeContent",
    requiredFields: ["pageId"],
    fields: [
      textField("pageId", "Page ID", { required: true, placeholder: "1-abc..." }),
    ],
    invoke: async (token, args) => {
      const response = await onenoteService.getPageContent(token, args.pageId);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, preview: text.slice(0, 4000) };
    },
  }),
  defineEntry({
    service: "onenote",
    functionName: "createPage",
    label: "Create page",
    description: "Create a new OneNote page in a section. Note: the body must be an HTML string.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["sectionId", "htmlContent"],
    fields: [
      textField("sectionId", "Section ID", { required: true, placeholder: "1-abc..." }),
      textareaField("htmlContent", "HTML content", { required: true, rows: 8, placeholder: "<html><head><title>New Page</title></head><body>Content here.</body></html>" }),
    ],
    invoke: (token, args) =>
      onenoteService.createPage(token, args.sectionId, args.htmlContent),
  }),
  defineEntry({
    service: "onenote",
    functionName: "updatePageContent",
    label: "Update page content",
    description: "Apply patch commands to a OneNote page.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["pageId", "patchCommands"],
    fields: [
      textField("pageId", "Page ID", { required: true, placeholder: "1-abc..." }),
      jsonField("patchCommands", "Patch commands JSON", {
        required: true,
        rows: 10,
        placeholder: JSON.stringify([{ action: "replace", target: "body", content: "<p>Updated.</p>", position: "after" }], null, 2),
      }),
    ],
    invoke: (token, args) =>
      onenoteService.updatePageContent(token, args.pageId, args.patchCommands),
  }),
  defineEntry({
    service: "sites",
    functionName: "searchSites",
    label: "Search sites",
    description: "Search SharePoint sites by keyword.",
    outputHint: "generic",
    requiredFields: ["query"],
    defaults: { select: "id,name,displayName,webUrl,createdDateTime" },
    fields: [
      textField("query", "Search query", { required: true, placeholder: "marketing" }),
      textField("select", "$select", { placeholder: "id,name,displayName,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.searchSites(token, args.query, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "getSite",
    label: "Get site",
    description: "Load a SharePoint site by site ID or site URL path.",
    outputHint: "generic",
    requiredFields: ["siteId"],
    fields: [
      textField("siteId", "Site ID or path", { required: true, placeholder: "contoso.sharepoint.com:/sites/team" }),
      textField("select", "$select", { placeholder: "id,name,displayName,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.getSite(token, args.siteId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "getRootSite",
    label: "Get root site",
    description: "Load the tenant root SharePoint site.",
    outputHint: "generic",
    defaults: { select: "id,name,displayName,webUrl,siteCollection" },
    fields: [
      textField("select", "$select", { placeholder: "id,name,displayName,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.getRootSite(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "listSubsites",
    label: "List subsites",
    description: "List subsites of a SharePoint site.",
    outputHint: "generic",
    requiredFields: ["siteId"],
    defaults: { select: "id,name,displayName,webUrl" },
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("select", "$select", { placeholder: "id,name,displayName,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.listSubsites(token, args.siteId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "listSiteDrives",
    label: "List site drives",
    description: "List document libraries (drives) in a SharePoint site.",
    outputHint: "generic",
    requiredFields: ["siteId"],
    defaults: { select: "id,name,driveType,webUrl,quota" },
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("select", "$select", { placeholder: "id,name,driveType,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.listSiteDrives(token, args.siteId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "listSiteLists",
    label: "List site lists",
    description: "List SharePoint lists in a site.",
    outputHint: "generic",
    requiredFields: ["siteId"],
    defaults: { select: "id,displayName,name,webUrl,createdDateTime" },
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("select", "$select", { placeholder: "id,displayName,name,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.listSiteLists(token, args.siteId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "getSiteList",
    label: "Get site list",
    description: "Load one SharePoint list by site and list ID.",
    outputHint: "generic",
    requiredFields: ["siteId", "listId"],
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("listId", "List ID", { required: true, placeholder: "00000000-..." }),
      textField("select", "$select", { placeholder: "id,displayName,name,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.getSiteList(token, args.siteId, args.listId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "listListItems",
    label: "List list items",
    description: "List items in a SharePoint list.",
    outputHint: "generic",
    requiredFields: ["siteId", "listId"],
    defaults: { top: 25 },
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("listId", "List ID", { required: true, placeholder: "00000000-..." }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,webUrl,createdDateTime" }),
    ],
    invoke: (token, args) =>
      sitesService.listListItems(token, args.siteId, args.listId, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "getListItem",
    label: "Get list item",
    description: "Load one SharePoint list item by item ID.",
    outputHint: "generic",
    requiredFields: ["siteId", "listId", "itemId"],
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("listId", "List ID", { required: true, placeholder: "00000000-..." }),
      textField("itemId", "Item ID", { required: true, placeholder: "1" }),
      textField("select", "$select", { placeholder: "id,webUrl,createdDateTime" }),
    ],
    invoke: (token, args) =>
      sitesService.getListItem(token, args.siteId, args.listId, args.itemId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "listSitePages",
    label: "List site pages",
    description: "List modern site pages in a SharePoint site.",
    outputHint: "generic",
    requiredFields: ["siteId"],
    defaults: { select: "id,name,title,webUrl,createdDateTime,publishingState" },
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
      textField("select", "$select", { placeholder: "id,name,title,webUrl" }),
    ],
    invoke: (token, args) =>
      sitesService.listSitePages(token, args.siteId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "sites",
    functionName: "listSitePermissions",
    label: "List site permissions",
    description: "List sharing permissions for a SharePoint site.",
    outputHint: "generic",
    requiredFields: ["siteId"],
    fields: [
      textField("siteId", "Site ID", { required: true, placeholder: "contoso.sharepoint.com,..." }),
    ],
    invoke: (token, args) =>
      sitesService.listSitePermissions(token, args.siteId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "getMyDrive",
    label: "Get my drive",
    description: "Load the signed-in user's default OneDrive drive.",
    outputHint: "generic",
    defaults: { select: "id,driveType,name,owner,quota,webUrl" },
    fields: [
      textField("select", "$select", { placeholder: "id,driveType,name,owner,quota" }),
    ],
    invoke: (token, args) =>
      filesService.getMyDrive(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "getDrive",
    label: "Get drive",
    description: "Load a drive by drive ID.",
    outputHint: "generic",
    requiredFields: ["driveId"],
    defaults: { select: "id,driveType,name,owner,quota,webUrl" },
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("select", "$select", { placeholder: "id,driveType,name,owner" }),
    ],
    invoke: (token, args) =>
      filesService.getDrive(token, args.driveId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "listRootChildren",
    label: "List root children",
    description: "List items at the root of the signed-in user's OneDrive.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,name,webUrl,size,file,folder,createdDateTime,lastModifiedDateTime" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,name,webUrl,size,file,folder" }),
    ],
    invoke: (token, args) =>
      filesService.listRootChildren(token, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "files",
    functionName: "getDriveItem",
    label: "Get drive item",
    description: "Load a specific file or folder by drive ID and item ID.",
    outputHint: "generic",
    requiredFields: ["driveId", "itemId"],
    defaults: { select: "id,name,webUrl,size,file,folder,createdDateTime,lastModifiedDateTime" },
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("itemId", "Item ID", { required: true, placeholder: "01ABC..." }),
      textField("select", "$select", { placeholder: "id,name,webUrl,size,file,folder" }),
    ],
    invoke: (token, args) =>
      filesService.getDriveItem(token, args.driveId, args.itemId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "listItemChildren",
    label: "List item children",
    description: "List child items in a folder by drive ID and folder item ID.",
    outputHint: "generic",
    requiredFields: ["driveId", "itemId"],
    defaults: { top: 25, select: "id,name,webUrl,size,file,folder,createdDateTime,lastModifiedDateTime" },
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("itemId", "Item ID", { required: true, placeholder: "01ABC..." }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,name,webUrl,size,file,folder" }),
    ],
    invoke: (token, args) =>
      filesService.listItemChildren(token, args.driveId, args.itemId, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "files",
    functionName: "searchDriveItems",
    label: "Search drive items",
    description: "Search for files and folders in the signed-in user's OneDrive.",
    outputHint: "generic",
    requiredFields: ["query"],
    defaults: { top: 25, select: "id,name,webUrl,size,file,folder,createdDateTime" },
    fields: [
      textField("query", "Search query", { required: true, placeholder: "budget report" }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,name,webUrl,size,file,folder" }),
    ],
    invoke: (token, args) =>
      filesService.searchDriveItems(token, args.query, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "files",
    functionName: "listRecentFiles",
    label: "List recent files",
    description: "List recently accessed files for the signed-in user.",
    outputHint: "generic",
    defaults: { select: "id,name,webUrl,size,createdDateTime,lastModifiedDateTime" },
    fields: [
      textField("select", "$select", { placeholder: "id,name,webUrl,size" }),
    ],
    invoke: (token, args) =>
      filesService.listRecentFiles(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "listSharedWithMe",
    label: "List shared with me",
    description: "List items shared with the signed-in user.",
    outputHint: "generic",
    defaults: { select: "id,name,webUrl,size,createdBy,createdDateTime" },
    fields: [
      textField("select", "$select", { placeholder: "id,name,webUrl,size,createdBy" }),
    ],
    invoke: (token, args) =>
      filesService.listSharedWithMe(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "listAppFolderChildren",
    label: "List app folder children",
    description: "List items in the application's special app root folder.",
    outputHint: "generic",
    defaults: { select: "id,name,webUrl,size,createdDateTime" },
    fields: [
      textField("select", "$select", { placeholder: "id,name,webUrl,size" }),
    ],
    invoke: (token, args) =>
      filesService.listAppFolderChildren(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "listItemPermissions",
    label: "List item permissions",
    description: "List sharing permissions on a drive item.",
    outputHint: "generic",
    requiredFields: ["driveId", "itemId"],
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("itemId", "Item ID", { required: true, placeholder: "01ABC..." }),
    ],
    invoke: (token, args) =>
      filesService.listItemPermissions(token, args.driveId, args.itemId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "files",
    functionName: "getItemContent",
    label: "Get item content",
    description: "Download a file's binary content and return size/type metadata.",
    outputHint: "photoBinary",
    requiredFields: ["driveId", "itemId"],
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("itemId", "Item ID", { required: true, placeholder: "01ABC..." }),
    ],
    invoke: async (token, args) => {
      const response = await filesService.getItemContent(token, args.driveId, args.itemId);
      const buffer = await response.arrayBuffer();
      return { binary: true, status: response.status, contentType: response.headers.get("content-type"), sizeBytes: buffer.byteLength, contentLength: response.headers.get("content-length"), etag: response.headers.get("etag") };
    },
  }),
  defineEntry({
    service: "files",
    functionName: "createUploadSession",
    label: "Create upload session",
    description: "Create a resumable upload session URL for a large file.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["driveId", "parentId", "filename"],
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("parentId", "Parent folder item ID", { required: true, placeholder: "01ABC..." }),
      textField("filename", "File name", { required: true, placeholder: "report.xlsx" }),
    ],
    invoke: (token, args) =>
      filesService.createUploadSession(token, args.driveId, args.parentId, args.filename),
  }),
  defineEntry({
    service: "files",
    functionName: "copyDriveItem",
    label: "Copy drive item",
    description: "Copy a file or folder to a new parent folder.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["driveId", "itemId", "destinationParentId"],
    fields: [
      textField("driveId", "Drive ID", { required: true, placeholder: "b!abc..." }),
      textField("itemId", "Source item ID", { required: true, placeholder: "01ABC..." }),
      textField("destinationParentId", "Destination parent ID", { required: true, placeholder: "01DEF..." }),
      textField("newName", "New file name", { placeholder: "copy-of-report.xlsx" }),
    ],
    invoke: (token, args) =>
      filesService.copyDriveItem(token, args.driveId, args.itemId, args.destinationParentId, args.newName || undefined),
  }),
  defineEntry({
    service: "contacts",
    functionName: "listContacts",
    label: "List contacts",
    description: "List personal contacts for the signed-in user.",
    outputHint: "generic",
    defaults: { top: 25, select: "id,displayName,emailAddresses,businessPhones,jobTitle,companyName" },
    fields: [
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,displayName,emailAddresses,jobTitle" }),
    ],
    invoke: (token, args) =>
      contactsService.listContacts(token, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "getContact",
    label: "Get contact",
    description: "Load one personal contact by contact ID.",
    outputHint: "generic",
    requiredFields: ["contactId"],
    fields: [
      textField("contactId", "Contact ID", { required: true, placeholder: "AQMkAG..." }),
      textField("select", "$select", { placeholder: "id,displayName,emailAddresses" }),
    ],
    invoke: (token, args) =>
      contactsService.getContact(token, args.contactId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "listUserContacts",
    label: "List user contacts",
    description: "List contacts for a specific user when app permissions allow.",
    outputHint: "generic",
    requiredFields: ["userId"],
    defaults: { top: 25, select: "id,displayName,emailAddresses,jobTitle,companyName" },
    fields: [
      textField("userId", "User ID or UPN", { required: true, placeholder: "person@company.com" }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,displayName,emailAddresses" }),
    ],
    invoke: (token, args) =>
      contactsService.listUserContacts(token, args.userId, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "getUserContact",
    label: "Get user contact",
    description: "Load one contact for a specific user.",
    outputHint: "generic",
    requiredFields: ["userId", "contactId"],
    fields: [
      textField("userId", "User ID or UPN", { required: true, placeholder: "person@company.com" }),
      textField("contactId", "Contact ID", { required: true, placeholder: "AQMkAG..." }),
      textField("select", "$select", { placeholder: "id,displayName,emailAddresses" }),
    ],
    invoke: (token, args) =>
      contactsService.getUserContact(token, args.userId, args.contactId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "listContactFolders",
    label: "List contact folders",
    description: "List contact folders for the signed-in user.",
    outputHint: "generic",
    defaults: { select: "id,displayName,parentFolderId,childFolderCount" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,parentFolderId" }),
    ],
    invoke: (token, args) =>
      contactsService.listContactFolders(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "getContactFolder",
    label: "Get contact folder",
    description: "Load one contact folder by folder ID.",
    outputHint: "generic",
    requiredFields: ["folderId"],
    fields: [
      textField("folderId", "Folder ID", { required: true, placeholder: "AQMkAG..." }),
      textField("select", "$select", { placeholder: "id,displayName,parentFolderId" }),
    ],
    invoke: (token, args) =>
      contactsService.getContactFolder(token, args.folderId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "listContactsInFolder",
    label: "List contacts in folder",
    description: "List contacts in a specific contact folder.",
    outputHint: "generic",
    requiredFields: ["folderId"],
    defaults: { top: 25, select: "id,displayName,emailAddresses,jobTitle,companyName" },
    fields: [
      textField("folderId", "Folder ID", { required: true, placeholder: "AQMkAG..." }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,displayName,emailAddresses" }),
    ],
    invoke: (token, args) =>
      contactsService.listContactsInFolder(token, args.folderId, buildOptions(args, ["select", "top"])),
  }),
  defineEntry({
    service: "contacts",
    functionName: "createContact",
    label: "Create contact",
    description: "Create a new personal contact for the signed-in user.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["contactInput"],
    samplePayloads: { contactInput: [{ label: "Sample contact", value: CONTACT_INPUT_SAMPLE }] },
    fields: [
      jsonField("contactInput", "Contact JSON", { required: true, rows: 12 }),
    ],
    invoke: (token, args) => contactsService.createContact(token, args.contactInput),
  }),
  defineEntry({
    service: "contacts",
    functionName: "updateContact",
    label: "Update contact",
    description: "Patch an existing personal contact.",
    mutation: true,
    outputHint: "generic",
    requiredFields: ["contactId", "patch"],
    fields: [
      textField("contactId", "Contact ID", { required: true, placeholder: "AQMkAG..." }),
      jsonField("patch", "Patch JSON", { required: true, rows: 8 }),
    ],
    invoke: (token, args) => contactsService.updateContact(token, args.contactId, args.patch),
  }),
  defineEntry({
    service: "calendarShared",
    functionName: "getSharedCalendarEvent",
    label: "Get shared calendar event",
    description: "Load a single event from a shared or delegated calendar.",
    outputHint: "calendarEvent",
    requiredFields: ["mailbox", "eventId"],
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      textField("eventId", "Event ID", { required: true, placeholder: "AAMkAG...AAA=" }),
      textField("select", "$select", { placeholder: "id,subject,start,end,organizer" }),
    ],
    invoke: (token, args) =>
      calendarService.getSharedCalendarEvent(token, args.mailbox, args.eventId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "calendarShared",
    functionName: "createSharedEvent",
    label: "Create shared event",
    description: "Create a new event on a shared or delegated calendar.",
    mutation: true,
    outputHint: "calendarEvent",
    requiredFields: ["mailbox", "eventInput"],
    samplePayloads: { eventInput: [{ label: "Sample event", value: SHARED_EVENT_INPUT_SAMPLE }] },
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      jsonField("eventInput", "Event JSON", { required: true, rows: 14 }),
    ],
    invoke: (token, args) =>
      calendarService.createSharedEvent(token, args.mailbox, args.eventInput),
  }),
  defineEntry({
    service: "calendarShared",
    functionName: "updateSharedEvent",
    label: "Update shared event",
    description: "Patch an existing event on a shared or delegated calendar.",
    mutation: true,
    outputHint: "calendarEvent",
    requiredFields: ["mailbox", "eventId", "patch"],
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      textField("eventId", "Event ID", { required: true }),
      jsonField("patch", "Patch JSON", { required: true, rows: 10 }),
    ],
    invoke: (token, args) =>
      calendarService.updateSharedEvent(token, args.mailbox, args.eventId, args.patch),
  }),
  defineEntry({
    service: "mailShared",
    functionName: "getSharedMailboxMessage",
    label: "Get shared mailbox message",
    description: "Load a single message from a shared mailbox by message ID.",
    outputHint: "mailMessage",
    requiredFields: ["mailbox", "messageId"],
    defaults: { select: "id,subject,from,receivedDateTime,isRead,bodyPreview,body" },
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      textField("messageId", "Message ID", { required: true, placeholder: "AAMkAG..." }),
      textField("select", "$select", { placeholder: "id,subject,from,receivedDateTime,body" }),
    ],
    invoke: (token, args) =>
      mailService.getSharedMailboxMessage(token, args.mailbox, args.messageId, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "mailShared",
    functionName: "listSharedMailboxFolders",
    label: "List shared mailbox folders",
    description: "List mail folders in a shared mailbox.",
    outputHint: "mailFolders",
    requiredFields: ["mailbox"],
    defaults: { select: "id,displayName,parentFolderId,totalItemCount,unreadItemCount" },
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      numberField("top", "$top", { placeholder: "25" }),
      textField("select", "$select", { placeholder: "id,displayName,totalItemCount" }),
    ],
    invoke: (token, args) =>
      mailService.listSharedMailboxFolders(token, args.mailbox, buildOptions(args, ["top", "select"])),
  }),
  defineEntry({
    service: "mailShared",
    functionName: "sendMail",
    label: "Send mail",
    description: "Send an email from the signed-in user's mailbox via /me/sendMail.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["messageInput"],
    samplePayloads: { messageInput: [{ label: "Sample email", value: SEND_MAIL_SAMPLE }] },
    fields: [
      jsonField("messageInput", "Message JSON", { required: true, rows: 12, description: "Message object (without the outer 'message' wrapper)." }),
    ],
    invoke: (token, args) => mailService.sendMail(token, args.messageInput),
  }),
  defineEntry({
    service: "mailShared",
    functionName: "sendSharedMailboxMail",
    label: "Send shared mailbox mail",
    description: "Send an email from a shared mailbox using delegated permissions.",
    mutation: true,
    outputHint: "mutationAck",
    requiredFields: ["mailbox", "messageInput"],
    samplePayloads: { messageInput: [{ label: "Sample email", value: SEND_MAIL_SAMPLE }] },
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      jsonField("messageInput", "Message JSON", { required: true, rows: 12 }),
    ],
    invoke: (token, args) =>
      mailService.sendSharedMailboxMail(token, args.mailbox, args.messageInput),
  }),
  defineEntry({
    service: "mailShared",
    functionName: "updateSharedMailboxMessage",
    label: "Update shared mailbox message",
    description: "Patch a message in a shared mailbox.",
    mutation: true,
    outputHint: "mailMessage",
    requiredFields: ["mailbox", "messageId", "patch"],
    fields: [
      textField("mailbox", "Shared mailbox", { required: true, placeholder: "shared@company.com" }),
      textField("messageId", "Message ID", { required: true, placeholder: "AAMkAG..." }),
      jsonField("patch", "Patch JSON", { required: true, rows: 8 }),
    ],
    invoke: (token, args) =>
      mailService.updateSharedMailboxMessage(token, args.mailbox, args.messageId, args.patch),
  }),
  defineEntry({
    service: "profile",
    functionName: "getProfile",
    label: "Get profile",
    description: "Load the signed-in user's beta profile root.",
    outputHint: "generic",
    fields: [],
    invoke: (token) => profileService.getProfile(token),
  }),
  defineEntry({
    service: "profile",
    functionName: "listProfileNames",
    label: "List profile names",
    description: "List name entries from the signed-in user's beta profile.",
    outputHint: "generic",
    defaults: { select: "id,displayName,first,last,nickname" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,first,last" }),
    ],
    invoke: (token, args) =>
      profileService.listProfileNames(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "profile",
    functionName: "listProfileEmails",
    label: "List profile emails",
    description: "List email entries from the signed-in user's beta profile.",
    outputHint: "generic",
    defaults: { select: "id,address,displayName,type" },
    fields: [
      textField("select", "$select", { placeholder: "id,address,displayName,type" }),
    ],
    invoke: (token, args) =>
      profileService.listProfileEmails(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "profile",
    functionName: "listProfilePhones",
    label: "List profile phones",
    description: "List phone entries from the signed-in user's beta profile.",
    outputHint: "generic",
    defaults: { select: "id,displayName,number,type" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,number,type" }),
    ],
    invoke: (token, args) =>
      profileService.listProfilePhones(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "profile",
    functionName: "listProfilePositions",
    label: "List profile positions",
    description: "List work position entries from the signed-in user's beta profile.",
    outputHint: "generic",
    defaults: { select: "id,displayName,detail,isCurrent" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,detail,isCurrent" }),
    ],
    invoke: (token, args) =>
      profileService.listProfilePositions(token, buildOptions(args, ["select"])),
  }),
  defineEntry({
    service: "profile",
    functionName: "listProfileSkills",
    label: "List profile skills",
    description: "List skill entries from the signed-in user's beta profile.",
    outputHint: "generic",
    defaults: { select: "id,displayName,proficiency" },
    fields: [
      textField("select", "$select", { placeholder: "id,displayName,proficiency" }),
    ],
    invoke: (token, args) =>
      profileService.listProfileSkills(token, buildOptions(args, ["select"])),
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
  const entry = {
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

  return applySelectMetadata(entry);
}

function applySelectMetadata(entry) {
  const selectMetadata = getGraphSelectMetadata(entry.service, entry.functionName);

  if (!selectMetadata) {
    return entry;
  }

  const recommendedValues = splitCommaSeparatedValues(entry.defaults?.select);

  return {
    ...entry,
    fields: entry.fields.map((field) => {
      if (field.name !== "select") {
        return field;
      }

      return {
        ...field,
        placeholder: field.placeholder || selectMetadata.values.join(","),
        pickerOptions: selectMetadata.options,
        recommendedValues:
          recommendedValues.length > 0 ? recommendedValues : selectMetadata.values,
        description: field.description || "Type comma-separated fields or use the picker below.",
      };
    }),
  };
}

function splitCommaSeparatedValues(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
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

function commonEventListFields() {
  return [
    numberField("top", "$top", {
      placeholder: "10",
    }),
    textField("select", "$select"),
    textField("filter", "$filter", {
      placeholder: "start/dateTime ge '2026-06-01T00:00:00Z'",
    }),
    textField("orderby", "$orderby", {
      placeholder: "start/dateTime",
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
