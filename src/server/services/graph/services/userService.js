/**
 * User / profile service.
 *
 * Required scopes (per function — noted inline):
 *   User.Read            – /me endpoints
 *   User.ReadBasic.All   – /users directory queries
 *   User.ReadWrite       – updateUser
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Signed-in user
// ---------------------------------------------------------------------------

/** @scope User.Read */
export async function getMe(token, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: "/me",
    token,
    query: { $select: select },
  });
}

/** @scope User.Read */
export async function getMyPhotoMetadata(token) {
  return graphRequest({ method: "GET", path: "/me/photo", token });
}

/**
 * Returns the raw photo Response so the caller can pipe it as image/jpeg.
 * @scope User.Read
 */
export async function getMyPhotoValue(token) {
  return graphRequest({ method: "GET", path: "/me/photo/$value", token, binary: true });
}

// ---------------------------------------------------------------------------
// Directory queries (User.ReadBasic.All)
// ---------------------------------------------------------------------------

/**
 * @scope User.ReadBasic.All
 * @param {object} [opts]
 * @param {number}  [opts.top]
 * @param {string}  [opts.select]  Comma-separated fields
 * @param {string}  [opts.filter]  OData $filter
 * @param {string}  [opts.orderby]
 */
export async function listUsers(token, { top, select, filter, orderby } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/users",
    token,
    query: { $top: top, $select: select, $filter: filter, $orderby: orderby },
  });
  return data?.value ?? [];
}

/**
 * Search users by display name prefix or full-text search.
 * Sends `$search` which requires the ConsistencyLevel header.
 * @scope User.ReadBasic.All
 */
export async function searchUsers(token, searchText, { select, top } = {}) {
  return graphRequest({
    method: "GET",
    path: "/users",
    token,
    query: {
      $search: `"displayName:${searchText}"`,
      $select: select,
      $top: top,
      $count: "true",
    },
    headers: { ConsistencyLevel: "eventual" },
  }).then((data) => data?.value ?? []);
}

/**
 * Get a specific user by their object ID or UPN.
 * @scope User.ReadBasic.All
 * @param {string} userIdOrUpn  e.g. "abc-123" or "user@company.com"
 */
export async function getUser(token, userIdOrUpn, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userIdOrUpn)}`,
    token,
    query: { $select: select },
  });
}

/**
 * Get a user's manager.
 * @scope User.Read.All or User.ReadBasic.All
 */
export async function getUserManager(token, userIdOrUpn, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userIdOrUpn)}/manager`,
    token,
    query: { $select: select },
  });
}

/**
 * List direct reports for a user.
 * @scope User.Read.All or User.ReadBasic.All
 */
export async function listUserDirectReports(token, userIdOrUpn, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userIdOrUpn)}/directReports`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * List joined Teams teams for a user.
 * @scope Team.ReadBasic.All or Team.Read.All
 */
export async function listUserJoinedTeams(token, userIdOrUpn, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userIdOrUpn)}/joinedTeams`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * List directory memberships for a user.
 * @scope GroupMember.Read.All or Directory.Read.All
 */
export async function listUserMemberOf(token, userIdOrUpn, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(userIdOrUpn)}/memberOf`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Update writable profile properties for any user.
 * @scope User.ReadWrite
 * @param {object} patch  Only include fields you want to change
 *
 * Safe fields: aboutMe, birthday, hireDate, interests, jobTitle, mobilePhone,
 *              mySite, officeLocation, pastProjects, preferredLanguage,
 *              responsibilities, schools, skills
 */
export async function updateUser(token, userIdOrUpn, patch) {
  return graphRequest({
    method: "PATCH",
    path: `/users/${encodeURIComponent(userIdOrUpn)}`,
    token,
    body: patch,
  });
}
