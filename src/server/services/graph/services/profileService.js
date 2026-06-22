/**
 * Profile service (beta endpoint).
 *
 * Required scopes (per function — noted inline):
 *   User.Read       – getProfile
 *   User.Read.All   – listProfile* (names, emails, phones, positions, skills)
 *
 * All endpoints use the beta API: https://graph.microsoft.com/beta
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** @scope User.Read */
export async function getProfile(token, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: "https://graph.microsoft.com/beta/me/profile",
    token,
    query: { $select: select },
  });
}

/** @scope User.Read */
export async function listProfileNames(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "https://graph.microsoft.com/beta/me/profile/names",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope User.Read */
export async function listProfileEmails(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "https://graph.microsoft.com/beta/me/profile/emails",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope User.Read */
export async function listProfilePhones(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "https://graph.microsoft.com/beta/me/profile/phones",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope User.Read */
export async function listProfilePositions(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "https://graph.microsoft.com/beta/me/profile/positions",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope User.Read */
export async function listProfileSkills(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "https://graph.microsoft.com/beta/me/profile/skills",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}
