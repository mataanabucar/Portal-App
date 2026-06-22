/**
 * Contacts service.
 *
 * Required scopes (per function — noted inline):
 *   Contacts.Read      – list/get contacts, folders
 *   Contacts.ReadWrite – createContact, updateContact
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Own contacts
// ---------------------------------------------------------------------------

/** @scope Contacts.Read */
export async function listContacts(token, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/contacts",
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Contacts.Read */
export async function getContact(token, contactId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/contacts/${encodeURIComponent(contactId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Other user contacts
// ---------------------------------------------------------------------------

/** @scope Contacts.Read */
export async function listUserContacts(token, userId, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userId)}/contacts`,
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Contacts.Read */
export async function getUserContact(token, userId, contactId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userId)}/contacts/${encodeURIComponent(contactId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Contact folders
// ---------------------------------------------------------------------------

/** @scope Contacts.Read */
export async function listContactFolders(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/contactFolders",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Contacts.Read */
export async function getContactFolder(token, folderId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/contactFolders/${encodeURIComponent(folderId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope Contacts.Read */
export async function listContactsInFolder(token, folderId, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/contactFolders/${encodeURIComponent(folderId)}/contacts`,
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** @scope Contacts.ReadWrite */
export async function createContact(token, contactInput) {
  return graphRequest({
    method: "POST",
    path: "/me/contacts",
    token,
    body: contactInput,
  });
}

/** @scope Contacts.ReadWrite */
export async function updateContact(token, contactId, patch) {
  return graphRequest({
    method: "PATCH",
    path: `/me/contacts/${encodeURIComponent(contactId)}`,
    token,
    body: patch,
  });
}
