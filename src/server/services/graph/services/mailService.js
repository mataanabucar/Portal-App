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
 *
 * NOTE: Mail.Send is NOT in the granted scope list.
 *       No send function is implemented here.
 *       Add sendMessage() only after Mail.Send is added to the app registration.
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
