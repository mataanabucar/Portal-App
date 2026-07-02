/**
 * Mail service.
 *
 * Required scopes (per function — noted inline):
 *   Mail.ReadBasic            – listMyMessagesBasic, listInboxMessages, listUnreadMessages
 *   Mail.ReadBasic.Shared     – listSharedInboxMessages (basic fields only)
 *   Mail.Read                 – getMessage, searchMyMessages
 *   Mail.Read.Shared          – listSharedMailboxMessages, listSharedInboxMessages
 *   Mail.ReadWrite            – createDraftMessage, updateDraftMessage,
 *                               setMessageReadState, moveMessage, deleteMessage
 *   Mail.ReadWrite.Shared     – createSharedMailboxDraft
 *   Mail.Send                 – sendMail, sendDraftMessage, sendSharedMailboxMail
 *
 * NOTE: The send functions require Mail.Send (and Mail.ReadWrite for the
 *       draft-then-send flow) to be granted on the app registration and present
 *       in the signed-in user's token. Callers must gate sending behind explicit
 *       user confirmation.
 */

import { graphRequest, graphGetAllPages } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Read — own mailbox
// ---------------------------------------------------------------------------

/**
 * List messages with only metadata fields (no body).
 * Use when only Mail.ReadBasic is needed.
 * @scope Mail.ReadBasic
 */
export async function listMyMessagesBasic(token, { top, filter, orderby, skip } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/messages",
    token,
    query: {
      $select: "id,subject,from,receivedDateTime,isRead,hasAttachments",
      $top: top,
      $filter: filter,
      $orderby: orderby,
      $skip: skip,
    },
  });
  return data?.value ?? [];
}

/**
 * List messages from the signed-in mailbox with caller-controlled $select.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function listMessages(token, { top, select, filter, orderby, skip } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/messages",
    token,
    query: {
      $top: top,
      $select: select,
      $filter: filter,
      $orderby: orderby,
      $skip: skip,
    },
  });
  return data?.value ?? [];
}

/**
 * List inbox messages.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function listInboxMessages(token, { top, select, filter, orderby } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/mailFolders/inbox/messages",
    token,
    query: { $top: top, $select: select, $filter: filter, $orderby: orderby },
  });
  return data?.value ?? [];
}

/**
 * Get a single message including its body.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function getMessage(token, messageId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/messages/${messageId}`,
    token,
    query: { $select: select },
  });
}

/**
 * Clean public alias for getMessage.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function readMessage(token, messageId, options = {}) {
  return getMessage(token, messageId, options);
}

/**
 * Read a whole conversation thread: every message in /me/messages that shares
 * the given conversationId, oldest first. Graph rejects $orderby combined with
 * a conversationId $filter, so the ascending sort happens locally.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function readConversation(token, conversationId, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/messages",
    token,
    query: {
      $filter: `conversationId eq '${String(conversationId).replace(/'/g, "''")}'`,
      $select: select,
      $top: top,
    },
  });

  const messages = data?.value ?? [];
  return messages.sort((a, b) =>
    String(a.receivedDateTime || "").localeCompare(String(b.receivedDateTime || ""))
  );
}

/**
 * Alias for readConversation.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function readThread(token, conversationId, options = {}) {
  return readConversation(token, conversationId, options);
}

/**
 * Get MIME content for a message as a raw response.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function getMessageMime(token, messageId) {
  return graphRequest({
    method: "GET",
    path: `/me/messages/${messageId}/$value`,
    token,
    binary: true,
  });
}

/**
 * Full-text search across mail using the $search parameter.
 * @scope Mail.Read
 */
export async function searchMyMessages(token, searchText, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/messages",
    token,
    query: {
      $search: `"${searchText}"`,
      $top: top,
      $select: select,
    },
    headers: { ConsistencyLevel: "eventual" },
  });
  return data?.value ?? [];
}

/**
 * Clean public alias for searchMyMessages.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function searchMessages(token, searchText, options = {}) {
  return searchMyMessages(token, searchText, options);
}

/**
 * List messages in a specific mail folder.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function listMessagesInFolder(token, folderId, { top, select, filter, orderby, skip } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/mailFolders/${encodeURIComponent(folderId)}/messages`,
    token,
    query: {
      $top: top,
      $select: select,
      $filter: filter,
      $orderby: orderby,
      $skip: skip,
    },
  });
  return data?.value ?? [];
}

/**
 * Start or continue a delta query on a folder's messages.
 * @scope Mail.Read
 */
export async function deltaMessages(token, folderId, { select, top } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/mailFolders/${encodeURIComponent(folderId)}/messages/delta`,
    token,
    query: { $select: select, $top: top },
  });
}

/**
 * Filter to unread messages only.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function listUnreadMessages(token, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/messages",
    token,
    query: {
      $filter: "isRead eq false",
      $top: top,
      $select: select ?? "id,subject,from,receivedDateTime,isRead",
    },
  });
  return data?.value ?? [];
}

/**
 * Fetch all pages of a mail folder — use carefully on large mailboxes.
 * @scope Mail.Read
 */
export async function listAllMessages(token, { folder = "inbox", select } = {}) {
  return graphGetAllPages({
    method: "GET",
    path: `/me/mailFolders/${folder}/messages`,
    token,
    query: { $select: select, $top: 50 },
  });
}

// ---------------------------------------------------------------------------
// Read — shared / delegated mailbox
// ---------------------------------------------------------------------------

/**
 * List messages from a shared mailbox the signed-in user has access to.
 * @scope Mail.Read.Shared
 * @param {string} sharedMailbox  e.g. "shared@company.com"
 */
export async function listSharedMailboxMessages(token, sharedMailbox, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(sharedMailbox)}/messages`,
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/**
 * List inbox of a shared mailbox.
 * @scope Mail.Read.Shared or Mail.ReadBasic.Shared
 */
export async function listSharedInboxMessages(token, sharedMailbox, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(sharedMailbox)}/mailFolders/inbox/messages`,
    token,
    query: { $top: top, $select: select },
  });
  return data?.value ?? [];
}

/**
 * List mail folders for the signed-in mailbox.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function listMailFolders(token, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/mailFolders",
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/**
 * Get a single mail folder by ID or well-known name.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function getMailFolder(token, folderId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/mailFolders/${encodeURIComponent(folderId)}`,
    token,
    query: { $select: select },
  });
}

/**
 * List child folders for a mail folder.
 * @scope Mail.ReadBasic or Mail.Read
 */
export async function listChildFolders(token, folderId, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/mailFolders/${encodeURIComponent(folderId)}/childFolders`,
    token,
    query: { $top: top, $select: select },
  });
  return data?.value ?? [];
}

/**
 * List attachments for a message.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function listAttachments(token, messageId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/messages/${messageId}/attachments`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get a single message attachment.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function getAttachment(token, messageId, attachmentId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/messages/${messageId}/attachments/${attachmentId}`,
    token,
    query: { $select: select },
  });
}

/**
 * List Inbox message rules.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function listMessageRules(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/mailFolders/inbox/messageRules",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get one Inbox message rule.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function getMessageRule(token, messageRuleId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/mailFolders/inbox/messageRules/${encodeURIComponent(messageRuleId)}`,
    token,
    query: { $select: select },
  });
}

/**
 * List Outlook master categories.
 * @scope Mail.Read or Mail.ReadWrite
 */
export async function listOutlookCategories(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/outlook/masterCategories",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Write — own mailbox
// ---------------------------------------------------------------------------

/**
 * Create a draft message in the user's Drafts folder.
 * @scope Mail.ReadWrite
 * @param {object} draftInput
 *   subject, body { contentType, content }, toRecipients, ccRecipients,
 *   bccRecipients, importance, categories, attachments
 */
export async function createDraftMessage(token, draftInput) {
  return graphRequest({ method: "POST", path: "/me/messages", token, body: draftInput });
}

/**
 * Clean public alias for createDraftMessage.
 * @scope Mail.ReadWrite
 */
export async function createDraft(token, draftInput) {
  return createDraftMessage(token, draftInput);
}

/**
 * Reply to a message as the signed-in user. Accepts either a plain comment
 * string or a Graph reply payload ({ comment } and/or { message }).
 * @scope Mail.Send
 */
export async function replyToMessage(token, messageId, commentOrBody) {
  const body =
    typeof commentOrBody === "string"
      ? { comment: commentOrBody }
      : commentOrBody && typeof commentOrBody === "object"
        ? commentOrBody
        : { comment: "" };

  return graphRequest({
    method: "POST",
    path: `/me/messages/${encodeURIComponent(messageId)}/reply`,
    token,
    body,
  });
}

/**
 * Update a draft (partial update — only send changed fields).
 * @scope Mail.ReadWrite
 */
export async function updateDraftMessage(token, messageId, patch) {
  return graphRequest({ method: "PATCH", path: `/me/messages/${messageId}`, token, body: patch });
}

/**
 * Mark a message as read or unread.
 * @scope Mail.ReadWrite
 */
export async function setMessageReadState(token, messageId, isRead) {
  return graphRequest({
    method: "PATCH",
    path: `/me/messages/${messageId}`,
    token,
    body: { isRead },
  });
}

/**
 * Move a message to another folder.
 * @scope Mail.ReadWrite
 * @param {string} destinationId  Well-known name ("Inbox", "DeletedItems",
 *                                "Archive", "JunkEmail") or folder ID
 */
export async function moveMessage(token, messageId, destinationId) {
  return graphRequest({
    method: "POST",
    path: `/me/messages/${messageId}/move`,
    token,
    body: { destinationId },
  });
}

/**
 * Permanently delete a message.
 * @scope Mail.ReadWrite
 */
export async function deleteMessage(token, messageId) {
  return graphRequest({ method: "DELETE", path: `/me/messages/${messageId}`, token });
}

// ---------------------------------------------------------------------------
// Write — shared mailbox
// ---------------------------------------------------------------------------

/**
 * Create a draft in a shared mailbox.
 * @scope Mail.ReadWrite.Shared
 */
export async function createSharedMailboxDraft(token, sharedMailbox, draftInput) {
  return graphRequest({
    method: "POST",
    path: `/users/${encodeURIComponent(sharedMailbox)}/messages`,
    token,
    body: draftInput,
  });
}

/** @scope Mail.Read.Shared */
export async function getSharedMailboxMessage(token, sharedMailbox, messageId, { select } = {}) {
  return graphRequest({ method: "GET", path: `/users/${sharedMailbox}/messages/${messageId}`, token, query: { $select: select } });
}

/** @scope Mail.Read.Shared */
export async function listSharedMailboxFolders(token, sharedMailbox, { top, select } = {}) {
  const data = await graphRequest({ method: "GET", path: `/users/${sharedMailbox}/mailFolders`, token, query: { $top: top, $select: select } });
  return data?.value ?? [];
}

/**
 * Send a message as the signed-in user.
 * @scope Mail.Send
 * @param {object} options.saveToSentItems  Defaults to true on the Graph side.
 */
export async function sendMail(token, messageInput, { saveToSentItems } = {}) {
  const body = { message: messageInput };
  if (saveToSentItems !== undefined) {
    body.saveToSentItems = Boolean(saveToSentItems);
  }
  return graphRequest({ method: "POST", path: "/me/sendMail", token, body });
}

/**
 * Send an existing draft message (created via createDraftMessage). Returns no
 * body (Graph responds 202 Accepted). The draft's id identifies the message.
 * @scope Mail.Send
 */
export async function sendDraftMessage(token, messageId) {
  return graphRequest({ method: "POST", path: `/me/messages/${encodeURIComponent(messageId)}/send`, token });
}

/** @scope Mail.Send.Shared */
export async function sendSharedMailboxMail(token, sharedMailbox, messageInput) {
  return graphRequest({ method: "POST", path: `/users/${sharedMailbox}/sendMail`, token, body: { message: messageInput } });
}

/** @scope Mail.ReadWrite.Shared */
export async function updateSharedMailboxMessage(token, sharedMailbox, messageId, patch) {
  return graphRequest({ method: "PATCH", path: `/users/${sharedMailbox}/messages/${messageId}`, token, body: patch });
}
