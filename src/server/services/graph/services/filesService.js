/**
 * Files service (OneDrive / SharePoint drives).
 *
 * Required scopes (per function — noted inline):
 *   Files.Read         – getMyDrive, getDrive, listRootChildren, getDriveItem,
 *                        listItemChildren, searchDriveItems, listRecentFiles,
 *                        listSharedWithMe, listAppFolderChildren,
 *                        listItemPermissions, getItemContent
 *   Files.ReadWrite    – createUploadSession, copyDriveItem
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Drives
// ---------------------------------------------------------------------------

/** @scope Files.Read */
export async function getMyDrive(token, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: "/me/drive",
    token,
    query: { $select: select },
  });
}

/** @scope Files.Read */
export async function getDrive(token, driveId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/drives/${encodeURIComponent(driveId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** @scope Files.Read */
export async function listRootChildren(token, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/drive/root/children",
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Files.Read */
export async function getDriveItem(token, driveId, itemId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope Files.Read */
export async function listItemChildren(token, driveId, itemId, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children`,
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Files.Read */
export async function searchDriveItems(token, query, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/drive/root/search(q='${encodeURIComponent(query)}')`,
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Files.Read */
export async function listRecentFiles(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/drive/recent",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Files.Read */
export async function listSharedWithMe(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/drive/sharedWithMe",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Files.ReadWrite */
export async function listAppFolderChildren(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/drive/special/approot/children",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Files.Read */
export async function listItemPermissions(token, driveId, itemId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/permissions`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Returns raw binary Response (the file bytes).
 * @scope Files.Read
 */
export async function getItemContent(token, driveId, itemId) {
  return graphRequest({
    method: "GET",
    path: `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    token,
    binary: true,
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** @scope Files.ReadWrite */
export async function createUploadSession(token, driveId, parentId, filename) {
  return graphRequest({
    method: "POST",
    path: `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(filename)}:/createUploadSession`,
    token,
    body: { item: { "@microsoft.graph.conflictBehavior": "rename" } },
  });
}

/** @scope Files.ReadWrite */
export async function copyDriveItem(token, driveId, itemId, destinationParentId, newName) {
  return graphRequest({
    method: "POST",
    path: `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/copy`,
    token,
    body: { parentReference: { id: destinationParentId }, name: newName },
  });
}
