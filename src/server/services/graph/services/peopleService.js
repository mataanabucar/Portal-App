/**
 * People service.
 *
 * Required scope: People.Read
 *
 * The /me/people endpoint returns people ranked by relevance to the signed-in
 * user — colleagues, recent contacts, frequent collaborators — not the full
 * directory. For directory queries use userService.searchUsers().
 */

import { graphRequest } from "../graphRequest.js";

/**
 * List people most relevant to the signed-in user.
 * @scope People.Read
 * @param {object} [opts]
 * @param {number} [opts.top]     Max results (default: Graph default ~10)
 * @param {string} [opts.select]  Comma-separated fields
 * @param {string} [opts.filter]  OData $filter
 */
export async function listRelevantPeople(token, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/people",
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/**
 * Search for people by name or email.
 * @scope People.Read
 * @param {string} searchText  Name fragment or email address to search for
 */
export async function searchPeople(token, searchText, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/people",
    token,
    query: {
      $search: `"${searchText}"`,
      $top: top,
      $select: select,
    },
  });
  return data?.value ?? [];
}
