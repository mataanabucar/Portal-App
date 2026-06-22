/**
 * Mailbox settings service.
 *
 * Required scope: MailboxSettings.ReadWrite
 */

import { graphRequest } from "../graphRequest.js";

/**
 * Get all mailbox settings for the signed-in user.
 * @scope MailboxSettings.ReadWrite
 *
 * Returns: timeZone, language, automaticRepliesSetting, dateFormat,
 *          timeFormat, workingHours, delegateMeetingMessageDeliveryOptions
 */
export async function getMyMailboxSettings(token, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: "/me/mailboxSettings",
    token,
    query: { $select: select },
  });
}

/**
 * Update mailbox settings (partial patch — only send fields you want to change).
 * @scope MailboxSettings.ReadWrite
 *
 * Common patches:
 *
 * Timezone:
 *   { timeZone: "Eastern Standard Time" }
 *
 * Auto-reply (scheduled):
 *   {
 *     automaticRepliesSetting: {
 *       status: "scheduled",
 *       scheduledStartDateTime: { dateTime: "...", timeZone: "Eastern Standard Time" },
 *       scheduledEndDateTime:   { dateTime: "...", timeZone: "Eastern Standard Time" },
 *       internalReplyMessage: "I am out of office.",
 *       externalReplyMessage: "I am out of office."
 *     }
 *   }
 *
 * Auto-reply (off):
 *   { automaticRepliesSetting: { status: "disabled" } }
 *
 * Working hours:
 *   {
 *     workingHours: {
 *       daysOfWeek: ["monday","tuesday","wednesday","thursday","friday"],
 *       startTime: "08:00:00.0000000",
 *       endTime:   "17:00:00.0000000",
 *       timeZone:  { name: "Eastern Standard Time" }
 *     }
 *   }
 */
export async function updateMyMailboxSettings(token, patch) {
  return graphRequest({ method: "PATCH", path: "/me/mailboxSettings", token, body: patch });
}
