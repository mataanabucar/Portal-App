/**
 * Sites service (SharePoint).
 *
 * Required scopes (per function — noted inline):
 *   Sites.Read.All      – all read functions
 *   Sites.ReadWrite.All – write operations (none currently)
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

/** @scope Sites.Read.All */
export async function searchSites(token, query, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/sites",
    token,
    query: { search: query, $select: select },
  });
  return data?.value ?? [];
}

/** @scope Sites.Read.All */
export async function getSite(token, siteId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope Sites.Read.All */
export async function getRootSite(token, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: "/sites/root",
    token,
    query: { $select: select },
  });
}

/** @scope Sites.Read.All */
export async function listSubsites(token, siteId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/sites`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Drives
// ---------------------------------------------------------------------------

/** @scope Sites.Read.All */
export async function listSiteDrives(token, siteId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/drives`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** @scope Sites.Read.All */
export async function listSiteLists(token, siteId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/lists`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Sites.Read.All */
export async function getSiteList(token, siteId, listId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope Sites.Read.All */
export async function listListItems(token, siteId, listId, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items`,
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Sites.Read.All */
export async function getListItem(token, siteId, listId, itemId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Pages & Permissions
// ---------------------------------------------------------------------------

/** @scope Sites.Read.All */
export async function listSitePages(token, siteId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/pages`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Sites.Read.All */
export async function listSitePermissions(token, siteId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/sites/${encodeURIComponent(siteId)}/permissions`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}
