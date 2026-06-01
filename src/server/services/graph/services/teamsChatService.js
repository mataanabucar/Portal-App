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
export async function listChatMembers(token, chatId) {
  const data = await graphRequest({ method: "GET", path: `/chats/${chatId}/members`, token });
  return data?.value ?? [];
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
export async function getChatMessage(token, chatId, messageId) {
  return graphRequest({ method: "GET", path: `/chats/${chatId}/messages/${messageId}`, token });
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
