/**
 * Teams channel message service.
 *
 * Required scopes (per function — noted inline):
 *   ChannelMessage.Send – sendChannelMessage, sendChannelReply
 *   ChannelMessage.Edit – editChannelMessage, editChannelReply
 *
 * teamId and channelId are always required as parameters — they are never
 * hardcoded here. Discover them via the Teams admin portal or the
 * Microsoft Graph Teams APIs (requires additional scopes not currently granted).
 *
 * Editing notes:
 *   Users can generally only edit messages they sent.
 *   Tenant policy and Teams admin settings may restrict this further.
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * List channels in a team.
 * @scope Channel.ReadBasic.All or Channel.Read.All
 */
export async function listChannels(token, teamId, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/teams/${teamId}/channels`,
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get one channel from a team.
 * @scope Channel.ReadBasic.All or Channel.Read.All
 */
export async function getChannel(token, teamId, channelId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/teams/${teamId}/channels/${channelId}`,
    token,
    query: { $select: select },
  });
}

/**
 * List messages in a channel.
 * @scope ChannelMessage.Read.All
 */
export async function listChannelMessages(token, teamId, channelId, { top, select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/teams/${teamId}/channels/${channelId}/messages`,
    token,
    query: { $top: top, $select: select },
  });
  return data?.value ?? [];
}

/**
 * Get one channel message.
 * @scope ChannelMessage.Read.All
 */
export async function getChannelMessage(token, teamId, channelId, messageId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/teams/${teamId}/channels/${channelId}/messages/${messageId}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

/**
 * Post a new message to a Teams channel.
 * @scope ChannelMessage.Send
 * @param {string} teamId
 * @param {string} channelId
 * @param {string} content        Message body text or HTML
 * @param {"text"|"html"} [contentType]
 * @param {object} [extra]        Additional message fields (importance, subject, mentions, attachments)
 */
export async function sendChannelMessage(token, teamId, channelId, content, contentType = "html", extra = {}) {
  return graphRequest({
    method: "POST",
    path: `/teams/${teamId}/channels/${channelId}/messages`,
    token,
    body: {
      body: { contentType, content },
      ...extra,
    },
  });
}

/**
 * Reply to an existing channel message thread.
 * @scope ChannelMessage.Send
 * @param {string} messageId  ID of the parent (root) message
 */
export async function sendChannelReply(token, teamId, channelId, messageId, content, contentType = "html") {
  return graphRequest({
    method: "POST",
    path: `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
    token,
    body: { body: { contentType, content } },
  });
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

/**
 * Edit a channel message the signed-in user previously sent.
 * @scope ChannelMessage.Edit
 */
export async function editChannelMessage(token, teamId, channelId, messageId, content, contentType = "html") {
  return graphRequest({
    method: "PATCH",
    path: `/teams/${teamId}/channels/${channelId}/messages/${messageId}`,
    token,
    body: { body: { contentType, content } },
  });
}

/**
 * Edit a reply to a channel message thread.
 * @scope ChannelMessage.Edit
 */
export async function editChannelReply(token, teamId, channelId, messageId, replyId, content, contentType = "html") {
  return graphRequest({
    method: "PATCH",
    path: `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies/${replyId}`,
    token,
    body: { body: { contentType, content } },
  });
}
