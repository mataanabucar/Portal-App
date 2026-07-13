/**
 * Teams chat service.
 *
 * Required scopes (per function — noted inline):
 *   Chat.ReadBasic   – listMyChats, listChatMembers
 *   Chat.Read        – getChat, listChatMessages, getChatMessage
 *   Chat.ReadWrite   – (all of the above)
 *   Chat.Create      – createOneOnOneChat, createGroupChat
 *   ChatMessage.Read – listChatMessages, getChatMessage
 *   ChatMessage.Send – sendChatMessage
 */

import { graphRequest, graphGetAllPages } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Full-text search across the signed-in user's Teams chat messages via the
 * Microsoft Search API. Returns the raw search "hits" (each has a `summary`
 * snippet and a `resource` chatMessage).
 * @scope Chat.Read
 */
export async function searchChatMessages(token, queryString, { size = 20, from = 0 } = {}) {
  const data = await graphRequest({
    method: "POST",
    path: "/search/query",
    token,
    body: {
      requests: [
        {
          entityTypes: ["chatMessage"],
          query: { queryString },
          from,
          size,
        },
      ],
    },
  });

  const containers = data?.value?.[0]?.hitsContainers ?? [];
  const hits = [];
  for (const container of containers) {
    for (const hit of container.hits ?? []) {
      hits.push(hit);
    }
  }
  return hits;
}

function stripChatHtml(text) {
  return String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function listRecentChatsForSearch(token, top) {
  // Prefer most-recently-active chats; fall back to a plain list if the
  // ordered/expanded query is rejected.
  try {
    const data = await graphRequest({
      method: "GET",
      path: "/me/chats",
      token,
      query: {
        $top: top,
        $orderby: "lastMessagePreview/createdDateTime desc",
        $expand: "lastMessagePreview",
      },
    });
    return data?.value ?? [];
  } catch {
    const data = await graphRequest({
      method: "GET",
      path: "/me/chats",
      token,
      query: { $top: top },
    });
    return data?.value ?? [];
  }
}

/**
 * Chat.Read-only keyword search fallback: scans recent chats and filters their
 * recent messages locally. No admin consent (avoids ChannelMessage.Read.All
 * that the Search API requires), but limited to recent messages.
 * Returns results already shaped for the client.
 * @scope Chat.Read
 */
export async function searchRecentChatMessages(
  token,
  queryString,
  { maxChats = 15, perChat = 25, limit = 10 } = {}
) {
  const needle = String(queryString ?? "").toLowerCase().trim();
  if (!needle) {
    return [];
  }

  const chats = await listRecentChatsForSearch(token, maxChats);

  const perChatMatches = await Promise.all(
    chats.map(async (chat) => {
      try {
        const data = await graphRequest({
          method: "GET",
          path: `/chats/${chat.id}/messages`,
          token,
          query: { $top: perChat },
        });
        const messages = data?.value ?? [];
        const out = [];
        for (const message of messages) {
          // Skip system/event messages (joins, renames, etc.).
          if (message?.messageType && message.messageType !== "message") {
            continue;
          }
          const content = stripChatHtml(message?.body?.content);
          if (!content || !content.toLowerCase().includes(needle)) {
            continue;
          }
          out.push({
            id: message.id || null,
            chatId: chat.id || null,
            topic: chat.topic || null,
            from:
              message.from?.user?.displayName ||
              message.from?.application?.displayName ||
              "Unknown sender",
            date: message.createdDateTime || null,
            snippet: content.slice(0, 300),
          });
        }
        return out;
      } catch {
        return [];
      }
    })
  );

  const matches = perChatMatches.flat();
  matches.sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );
  return matches.slice(0, limit);
}

/**
 * Chat.Read-only recent-message scan: newest messages across the user's most
 * recently active chats with no keyword filter (used by the executive day
 * organizer briefing). Same access pattern as searchRecentChatMessages, minus
 * the needle; optionally drops messages older than `sinceIso`.
 * Returns results already shaped for the client.
 * @scope Chat.Read
 */
export async function listRecentChatMessages(
  token,
  { maxChats = 15, perChat = 25, sinceIso = null, limit = 40 } = {}
) {
  const sinceTime = sinceIso ? new Date(sinceIso).getTime() : null;
  const chats = await listRecentChatsForSearch(token, maxChats);

  const perChatMessages = await Promise.all(
    chats.map(async (chat) => {
      try {
        const data = await graphRequest({
          method: "GET",
          path: `/chats/${chat.id}/messages`,
          token,
          query: { $top: perChat },
        });
        const messages = data?.value ?? [];
        const out = [];
        for (const message of messages) {
          // Skip system/event messages (joins, renames, etc.).
          if (message?.messageType && message.messageType !== "message") {
            continue;
          }
          if (
            sinceTime &&
            message?.createdDateTime &&
            new Date(message.createdDateTime).getTime() < sinceTime
          ) {
            continue;
          }
          const content = stripChatHtml(message?.body?.content);
          if (!content) {
            continue;
          }
          out.push({
            id: message.id || null,
            chatId: chat.id || null,
            topic: chat.topic || null,
            from:
              message.from?.user?.displayName ||
              message.from?.application?.displayName ||
              "Unknown sender",
            date: message.createdDateTime || null,
            snippet: content.slice(0, 300),
          });
        }
        return out;
      } catch {
        return [];
      }
    })
  );

  const results = perChatMessages.flat();
  results.sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );
  return results.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------

/**
 * List the signed-in user's Teams chats.
 * @scope Chat.ReadBasic, Chat.Read, or Chat.ReadWrite
 */
export async function listMyChats(token, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/chats",
    token,
    query: { $top: top, $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get a specific chat by ID.
 * @scope Chat.Read or Chat.ReadWrite
 */
export async function getChat(token, chatId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/chats/${chatId}`,
    token,
    query: { $select: select },
  });
}

/**
 * List members of a chat.
 * @scope Chat.ReadBasic, Chat.Read, or Chat.ReadWrite
 */
export async function listChatMembers(token, chatId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/chats/${chatId}/members`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get a single chat member.
 * @scope Chat.ReadBasic, Chat.Read, or Chat.ReadWrite
 */
export async function getChatMember(token, chatId, membershipId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/chats/${chatId}/members/${membershipId}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Create chats
// ---------------------------------------------------------------------------

/**
 * Create a one-on-one chat between two users.
 * @scope Chat.Create
 * @param {string} userIdA  Object ID of first user
 * @param {string} userIdB  Object ID of second user
 */
export async function createOneOnOneChat(token, userIdA, userIdB) {
  return graphRequest({
    method: "POST",
    path: "/chats",
    token,
    body: {
      chatType: "oneOnOne",
      members: [userIdA, userIdB].map((id) => ({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: ["owner"],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${id}')`,
      })),
    },
  });
}

/**
 * Create a group chat.
 * @scope Chat.Create
 * @param {string}   topic    Display name for the chat
 * @param {string[]} userIds  Object IDs of all members to include
 */
export async function createGroupChat(token, topic, userIds) {
  return graphRequest({
    method: "POST",
    path: "/chats",
    token,
    body: {
      chatType: "group",
      topic,
      members: userIds.map((id) => ({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: ["owner"],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${id}')`,
      })),
    },
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * List messages in a chat.
 * @scope ChatMessage.Read, Chat.Read, or Chat.ReadWrite
 */
export async function listChatMessages(token, chatId, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/chats/${chatId}/messages`,
    token,
    query: { $top: top, $select: select },
  });
  return data?.value ?? [];
}

/**
 * Fetch every message in a chat across all pages.
 * @scope ChatMessage.Read
 */
export async function listAllChatMessages(token, chatId) {
  return graphGetAllPages({
    method: "GET",
    path: `/chats/${chatId}/messages`,
    token,
    query: { $top: 50 },
  });
}

/**
 * Get a single message from a chat.
 * @scope ChatMessage.Read, Chat.Read, or Chat.ReadWrite
 */
export async function getChatMessage(token, chatId, messageId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/chats/${chatId}/messages/${messageId}`,
    token,
    query: { $select: select },
  });
}

/**
 * List hosted contents for a chat message.
 * @scope ChatMessage.Read
 */
export async function listChatMessageHostedContents(token, chatId, messageId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/chats/${chatId}/messages/${messageId}/hostedContents`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get one hosted content item from a chat message.
 * @scope ChatMessage.Read
 */
export async function getChatMessageHostedContent(
  token,
  chatId,
  messageId,
  hostedContentId,
  { select } = {}
) {
  return graphRequest({
    method: "GET",
    path: `/chats/${chatId}/messages/${messageId}/hostedContents/${hostedContentId}`,
    token,
    query: { $select: select },
  });
}

/**
 * List tabs for a chat.
 * @scope TeamsTab.Read.All
 */
export async function listChatTabs(token, chatId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/chats/${chatId}/tabs`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * List installed apps for a chat.
 * @scope TeamsAppInstallation.ReadForChat
 */
export async function listChatInstalledApps(token, chatId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/chats/${chatId}/installedApps`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Send a message to an existing chat.
 * @scope ChatMessage.Send
 * @param {string} content      Message text or HTML
 * @param {"text"|"html"} [contentType]
 */
export async function sendChatMessage(token, chatId, content, contentType = "html") {
  return graphRequest({
    method: "POST",
    path: `/chats/${chatId}/messages`,
    token,
    body: { body: { contentType, content } },
  });
}
