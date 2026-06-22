/**
 * Service Health service.
 *
 * Required scopes (per function — noted inline):
 *   ServiceHealth.Read.All – all functions
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Health overviews
// ---------------------------------------------------------------------------

/** @scope ServiceHealth.Read.All */
export async function listServiceHealthOverviews(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/admin/serviceAnnouncement/healthOverviews",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope ServiceHealth.Read.All */
export async function getServiceHealthOverview(token, serviceName, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/admin/serviceAnnouncement/healthOverviews/${encodeURIComponent(serviceName)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Health issues
// ---------------------------------------------------------------------------

/** @scope ServiceHealth.Read.All */
export async function listServiceHealthIssues(token, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/admin/serviceAnnouncement/issues",
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope ServiceHealth.Read.All */
export async function getServiceHealthIssue(token, issueId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/admin/serviceAnnouncement/issues/${encodeURIComponent(issueId)}`,
    token,
    query: { $select: select },
  });
}
