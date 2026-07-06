/**
 * Friendly capability view for the assistant UI (mail.read, mail.send, ...).
 *
 * This is a presentation layer only. It looks up specific, verified
 * functionName entries in the existing Graph catalog (the single source of
 * truth for what's enabled) via getCatalogEntry/isFunctionEnabled/
 * getMissingScopes — it does not define or duplicate any scope requirements
 * of its own, so it cannot drift from the catalog.
 */
import { getCatalogEntry } from "../../../graph-tester/catalog/graphTesterCatalog.js";
import { isFunctionEnabled, getMissingScopes } from "./graphCapabilities.js";

// Each capability maps to one or more catalog (service, functionName) pairs.
// The capability is enabled if any of its functions is enabled for the
// current token. Names/functionNames below were verified directly against
// src/graph-tester/catalog/graphTesterCatalog.js.
const CAPABILITY_GROUPS = [
  { capability: "mail.read", service: "mail", functionNames: ["listMyMessagesBasic", "listMessages", "listInboxMessages", "listMessagesInFolder", "getMessage", "readMessage", "readConversation", "listUnreadMessages", "listAllMessages"] },
  { capability: "mail.search", service: "mail", functionNames: ["searchMyMessages", "searchMessages"] },
  { capability: "mail.draft", service: "mail", functionNames: ["createDraftMessage", "updateDraftMessage", "createDraft"] },
  { capability: "mail.send", service: "mail", functionNames: ["sendMail"] },
  { capability: "mail.reply", service: "mail", functionNames: ["replyToMessage"] },
  { capability: "mail.move", service: "mail", functionNames: ["moveMessage"] },
  { capability: "mail.delete", service: "mail", functionNames: ["deleteMessage"] },

  { capability: "calendar.read", service: "calendar", functionNames: ["listMyCalendars", "getCalendar", "listMyCalendarEvents", "listEvents", "getEvent", "getMyCalendarView", "listCalendarEvents", "listEventInstances"] },
  { capability: "calendar.create", service: "calendar", functionNames: ["createEvent"] },
  { capability: "calendar.update", service: "calendar", functionNames: ["updateEvent"] },
  { capability: "calendar.delete", service: "calendar", functionNames: ["deleteEvent"] },

  { capability: "teams.chat.read", service: "teamsChat", functionNames: ["listMyChats", "searchMyChats", "getChat", "listChatMembers", "listChatMessages", "listAllChatMessages", "getChatMessage"] },
  { capability: "teams.chat.send", service: "teamsChat", functionNames: ["sendChatMessage"] },

  { capability: "teams.channel.read", service: "teamsChannel", functionNames: ["listChannels", "getChannel", "listChannelMessages", "getChannelMessage"] },
  { capability: "teams.channel.send", service: "teamsChannel", functionNames: ["sendChannelMessage", "sendChannelReply"] },
  { capability: "teams.channel.editOwnMessage", service: "teamsChannel", functionNames: ["editOwnChannelMessage", "editChannelReply"] },

  { capability: "notes.read", service: "onenote", functionNames: ["listNotebooks", "getNotebook", "listSections", "getSection", "listPages", "getPage", "getPageContent"] },
  { capability: "notes.write", service: "onenote", functionNames: ["createPage", "updatePageContent"] },

  { capability: "files.read", service: "files", functionNames: ["getMyDrive", "listRootChildren", "getDriveItem", "listItemChildren", "searchDriveItems", "listRecentFiles", "listSharedWithMe", "getItemContent"] },
  { capability: "files.write", service: "files", functionNames: ["createUploadSession", "copyDriveItem"] },

  { capability: "tasks.read", service: "tasks", functionNames: ["listTodoLists", "listTaskLists", "getTodoList", "listTasks", "getTask"] },
  { capability: "tasks.write", service: "tasks", functionNames: ["createTask", "updateTask", "completeTask"] },
];

export function buildFriendlyCapabilities(grantedScopes = []) {
  return CAPABILITY_GROUPS.map((group) => {
    const entries = group.functionNames
      .map((functionName) => getCatalogEntry(group.service, functionName))
      .filter(Boolean);

    const enabled = entries.some((entry) => isFunctionEnabled(entry, grantedScopes));
    const missingScopes = enabled
      ? []
      : [...new Set(entries.flatMap((entry) => getMissingScopes(entry, grantedScopes)))];

    return {
      capability: group.capability,
      service: group.service,
      enabled,
      missingScopes,
      reason: enabled
        ? null
        : missingScopes.length
          ? `Missing scope(s): ${missingScopes.join(", ")}.`
          : "Not available for this app registration.",
    };
  });
}
