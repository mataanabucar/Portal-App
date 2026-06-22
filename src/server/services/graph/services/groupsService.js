/**
 * Groups service.
 *
 * Required scopes (per function — noted inline):
 *   Group.Read.All       – listGroups, getGroup, listGroupMembers,
 *                          listGroupTransitiveMembers, listGroupOwners
 *   Group.ReadWrite.All  – createGroup, updateGroup, addGroupMember
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** @scope Group.Read.All */
export async function listGroups(token, { top, select, filter, orderby } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/groups",
    token,
    query: { $top: top, $select: select, $filter: filter, $orderby: orderby },
  });
  return data?.value ?? [];
}

/** @scope Group.Read.All */
export async function getGroup(token, groupId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/groups/${encodeURIComponent(groupId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope Group.Read.All */
export async function listGroupMembers(token, groupId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/groups/${encodeURIComponent(groupId)}/members/microsoft.graph.user`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Group.Read.All */
export async function listGroupTransitiveMembers(token, groupId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/groups/${encodeURIComponent(groupId)}/transitiveMembers/microsoft.graph.user`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Group.Read.All */
export async function listGroupOwners(token, groupId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/groups/${encodeURIComponent(groupId)}/owners/microsoft.graph.user`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** @scope Group.ReadWrite.All */
export async function createGroup(token, groupInput) {
  return graphRequest({
    method: "POST",
    path: "/groups",
    token,
    body: groupInput,
  });
}

/** @scope Group.ReadWrite.All */
export async function updateGroup(token, groupId, patch) {
  return graphRequest({
    method: "PATCH",
    path: `/groups/${encodeURIComponent(groupId)}`,
    token,
    body: patch,
  });
}

/** @scope Group.ReadWrite.All */
export async function addGroupMember(token, groupId, memberOdataId) {
  return graphRequest({
    method: "POST",
    path: `/groups/${encodeURIComponent(groupId)}/members/$ref`,
    token,
    body: { "@odata.id": memberOdataId },
  });
}
