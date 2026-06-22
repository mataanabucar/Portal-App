/**
 * Reports service.
 *
 * Required scopes (per function — noted inline):
 *   Reports.Read.All – all functions
 *
 * All functions return a binary Response (CSV stream).
 * Valid period values: D7, D30, D90, D180
 */

import { graphRequest } from "../graphRequest.js";

/** @scope Reports.Read.All */
export async function getEmailActivityUserDetail(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getEmailActivityUserDetail(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getEmailActivityCounts(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getEmailActivityCounts(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getEmailActivityUserCounts(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getEmailActivityUserCounts(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getEmailAppUsageUserDetail(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getEmailAppUsageUserDetail(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getMailboxUsageDetail(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getMailboxUsageDetail(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getSharePointSiteUsageDetail(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getSharePointSiteUsageDetail(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getOneDriveUsageAccountDetail(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getOneDriveUsageAccountDetail(period='${period}')`,
    token,
    binary: true,
  });
}

/** @scope Reports.Read.All */
export async function getOffice365ActiveUserDetail(token, period) {
  return graphRequest({
    method: "GET",
    path: `/reports/getOffice365ActiveUserDetail(period='${period}')`,
    token,
    binary: true,
  });
}
