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
 *   user, calendar, mail, mailboxSettings, teamsChat, teamsChannel, people
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
