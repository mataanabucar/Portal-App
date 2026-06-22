/**
 * Microsoft Graph integration — public surface.
 *
 * Auth:
 *   createAuthClient, acquireTokenInteractive, exchangeCodeForToken,
 *   refreshAccessToken, acquireAppToken, buildAuthorizationUrl
 *
 * Token utilities:
 *   decodeTokenClaims, getTokenScopes, getTokenRoles, hasScope,
 *   isDelegatedToken, isTokenExpired
 *
 * Service functions (all grouped by domain):
 *   user, calendar, mail, mailboxSettings, teamsChat, teamsChannel, people,
 *   serviceHealth, reports, directory, groups, tasks, onenote, sites, files,
 *   contacts, profile
 *
 * Low-level:
 *   graphRequest, graphGetAllPages, GraphError
 */

export {
  createAuthClient,
  acquireTokenInteractive,
  exchangeCodeForToken,
  refreshAccessToken,
  acquireAppToken,
  buildAuthorizationUrl,
} from "./graphClient.js";

export {
  decodeTokenClaims,
  getTokenScopes,
  getTokenRoles,
  hasScope,
  isDelegatedToken,
  isTokenExpired,
} from "./tokenUtils.js";

export { graphRequest, graphGetAllPages } from "./graphRequest.js";
export { GraphError } from "./graphErrors.js";

export * as userService           from "./services/userService.js";
export * as calendarService       from "./services/calendarService.js";
export * as mailService           from "./services/mailService.js";
export * as mailboxSettingsService from "./services/mailboxSettingsService.js";
export * as teamsChatService      from "./services/teamsChatService.js";
export * as teamsChannelService   from "./services/teamsChannelService.js";
export * as peopleService         from "./services/peopleService.js";
export * as itemEmailService      from "./services/itemEmailService.js";
export * as serviceHealthService  from "./services/serviceHealthService.js";
export * as reportsService        from "./services/reportsService.js";
export * as directoryService      from "./services/directoryService.js";
export * as groupsService         from "./services/groupsService.js";
export * as tasksService          from "./services/tasksService.js";
export * as onenoteService        from "./services/onenoteService.js";
export * as sitesService          from "./services/sitesService.js";
export * as filesService          from "./services/filesService.js";
export * as contactsService       from "./services/contactsService.js";
export * as profileService        from "./services/profileService.js";
