/**
 * Calendar service.
 *
 * Required scopes (per function — noted inline):
 *   Calendars.ReadBasic   – listMyCalendars, getMyCalendarView
 *   Calendars.Read        – listMyCalendarEvents, getEvent
 *   Calendars.Read.Shared – listSharedCalendarEvents, getSharedCalendarView
 *   Calendars.ReadWrite   – createEvent, updateEvent, deleteEvent
 */

import { graphRequest } from "../graphRequest.js";

const DEFAULT_TZ = "Eastern Standard Time";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * List the signed-in user's calendars.
 * @scope Calendars.ReadBasic or Calendars.Read
 */
export async function listMyCalendars(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/calendars",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get a single calendar by ID.
 * @scope Calendars.ReadBasic or Calendars.Read
 */
export async function getCalendar(token, calendarId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/calendars/${calendarId}`,
    token,
    query: { $select: select },
  });
}

/**
 * List events from the user's primary calendar.
 * @scope Calendars.Read or Calendars.ReadWrite
 */
export async function listMyCalendarEvents(token, { top, select, filter, orderby } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/calendar/events",
    token,
    query: { $top: top, $select: select, $filter: filter, $orderby: orderby },
  });
  return data?.value ?? [];
}

/**
 * List events from the signed-in user's events collection.
 * @scope Calendars.Read or Calendars.ReadWrite
 */
export async function listEvents(token, { top, select, filter, orderby } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/events",
    token,
    query: { $top: top, $select: select, $filter: filter, $orderby: orderby },
  });
  return data?.value ?? [];
}

/**
 * Get a single event by ID.
 * @scope Calendars.Read or Calendars.ReadWrite
 * @param {string} eventId
 */
export async function getEvent(token, eventId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/events/${eventId}`,
    token,
    query: { $select: select },
  });
}

/**
 * Get events within a date/time window (calendarView).
 * @scope Calendars.ReadBasic, Calendars.Read, or Calendars.ReadWrite
 * @param {string} startDateTime  ISO 8601
 * @param {string} endDateTime    ISO 8601
 */
export async function getMyCalendarView(token, startDateTime, endDateTime, {
  select,
  top,
  orderby = "start/dateTime",
  timezone = DEFAULT_TZ,
} = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/calendar/calendarView",
    token,
    query: { startDateTime, endDateTime, $top: top, $select: select, $orderby: orderby },
    headers: { Prefer: `outlook.timezone="${timezone}"` },
  });
  return data?.value ?? [];
}

/**
 * List events from a shared calendar or delegated mailbox.
 * The signed-in user must already have access to the target calendar.
 * @scope Calendars.Read.Shared
 * @param {string} sharedUserOrMailbox  e.g. "shared@company.com"
 */
export async function listSharedCalendarEvents(token, sharedUserOrMailbox, { top, select, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(sharedUserOrMailbox)}/calendar/events`,
    token,
    query: { $top: top, $select: select, $filter: filter },
  });
  return data?.value ?? [];
}

/**
 * Calendar view for a shared/delegated calendar within a date range.
 * @scope Calendars.Read.Shared
 */
export async function getSharedCalendarView(token, sharedUserOrMailbox, startDateTime, endDateTime, {
  select,
  top,
  timezone = DEFAULT_TZ,
} = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/users/${encodeURIComponent(sharedUserOrMailbox)}/calendar/calendarView`,
    token,
    query: { startDateTime, endDateTime, $top: top, $select: select },
    headers: { Prefer: `outlook.timezone="${timezone}"` },
  });
  return data?.value ?? [];
}

/**
 * List events from a specific calendar by calendar ID.
 * @scope Calendars.Read or Calendars.ReadWrite
 */
export async function listCalendarEvents(token, calendarId, { top, select, filter, orderby } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/calendars/${calendarId}/events`,
    token,
    query: { $top: top, $select: select, $filter: filter, $orderby: orderby },
  });
  return data?.value ?? [];
}

/**
 * List instances for a recurring event in a date range.
 * @scope Calendars.Read or Calendars.ReadWrite
 */
export async function listEventInstances(token, eventId, startDateTime, endDateTime, {
  top,
  select,
  timezone = DEFAULT_TZ,
} = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/events/${eventId}/instances`,
    token,
    query: { startDateTime, endDateTime, $top: top, $select: select },
    headers: { Prefer: `outlook.timezone="${timezone}"` },
  });
  return data?.value ?? [];
}

/**
 * List attachments for an event.
 * @scope Calendars.Read or Calendars.ReadWrite
 */
export async function listEventAttachments(token, eventId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/events/${eventId}/attachments`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get a single attachment from an event.
 * @scope Calendars.Read or Calendars.ReadWrite
 */
export async function getEventAttachment(token, eventId, attachmentId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/events/${eventId}/attachments/${attachmentId}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Create an event on the user's primary calendar.
 * @scope Calendars.ReadWrite
 * @param {object} eventInput  See Microsoft Graph docs for full event schema.
 *
 * Common fields:
 *   subject, body { contentType, content }, start { dateTime, timeZone },
 *   end { dateTime, timeZone }, location { displayName },
 *   attendees [{ emailAddress { address, name }, type }],
 *   isOnlineMeeting, onlineMeetingProvider, importance, sensitivity,
 *   showAs, reminderMinutesBeforeStart, isReminderOn, categories
 */
export async function createEvent(token, eventInput) {
  return graphRequest({
    method: "POST",
    path: "/me/calendar/events",
    token,
    body: eventInput,
  });
}

/**
 * Update an existing event (partial update — only include changed fields).
 * @scope Calendars.ReadWrite
 */
export async function updateEvent(token, eventId, patch) {
  return graphRequest({
    method: "PATCH",
    path: `/me/events/${eventId}`,
    token,
    body: patch,
  });
}

/**
 * Delete an event.
 * @scope Calendars.ReadWrite
 */
export async function deleteEvent(token, eventId) {
  return graphRequest({ method: "DELETE", path: `/me/events/${eventId}`, token });
}

/** @scope Calendars.Read.Shared */
export async function getSharedCalendarEvent(token, sharedUserOrMailbox, eventId, { select } = {}) {
  return graphRequest({ method: "GET", path: `/users/${sharedUserOrMailbox}/events/${eventId}`, token, query: { $select: select } });
}

/** @scope Calendars.ReadWrite.Shared */
export async function createSharedEvent(token, sharedUserOrMailbox, eventInput) {
  return graphRequest({ method: "POST", path: `/users/${sharedUserOrMailbox}/events`, token, body: eventInput });
}

/** @scope Calendars.ReadWrite.Shared */
export async function updateSharedEvent(token, sharedUserOrMailbox, eventId, patch) {
  return graphRequest({ method: "PATCH", path: `/users/${sharedUserOrMailbox}/events/${eventId}`, token, body: patch });
}
