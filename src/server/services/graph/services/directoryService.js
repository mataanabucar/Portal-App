/**
 * Directory service.
 *
 * Required scopes (per function — noted inline):
 *   Application.Read.All       – listApplications, getApplication
 *   Application.Read.All       – listServicePrincipals, getServicePrincipal
 *   Device.Read.All            – listDevices, getDevice
 *   RoleManagement.Read.All    – listDirectoryRoles, getDirectoryRole, listDirectoryRoleMembers
 *   Organization.Read.All      – getOrganization
 *   Organization.Read.All      – listSubscribedSkus
 *   Domain.Read.All            – listDomains, getDomain
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

/** @scope Application.Read.All */
export async function listApplications(token, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/applications",
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/** @scope Application.Read.All */
export async function getApplication(token, appId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/applications/${encodeURIComponent(appId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Service principals
// ---------------------------------------------------------------------------

/** @scope Application.Read.All */
export async function listServicePrincipals(token, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/servicePrincipals",
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/** @scope Application.Read.All */
export async function getServicePrincipal(token, spId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/servicePrincipals/${encodeURIComponent(spId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/** @scope Device.Read.All */
export async function listDevices(token, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/devices",
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/** @scope Device.Read.All */
export async function getDevice(token, deviceId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/devices/${encodeURIComponent(deviceId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Directory roles
// ---------------------------------------------------------------------------

/** @scope RoleManagement.Read.All */
export async function listDirectoryRoles(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/directoryRoles",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope RoleManagement.Read.All */
export async function getDirectoryRole(token, roleId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/directoryRoles/${encodeURIComponent(roleId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope RoleManagement.Read.All */
export async function listDirectoryRoleMembers(token, roleId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/directoryRoles/${encodeURIComponent(roleId)}/members/microsoft.graph.user`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

/** @scope Organization.Read.All */
export async function getOrganization(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/organization",
    token,
    query: { $select: select },
  });
  return data?.value?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Subscribed SKUs (licenses)
// ---------------------------------------------------------------------------

/** @scope Organization.Read.All */
export async function listSubscribedSkus(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/subscribedSkus",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

/** @scope Domain.Read.All */
export async function listDomains(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/domains",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Domain.Read.All */
export async function getDomain(token, domainId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/domains/${encodeURIComponent(domainId)}`,
    token,
    query: { $select: select },
  });
}
