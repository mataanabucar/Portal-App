import {
  mailService,
  teamsChatService,
  userService,
} from "../../server/services/graph/index.js";

const DEFAULT_USER_SELECT =
  "id,displayName,mail,userPrincipalName,jobTitle,officeLocation";
const DEFAULT_MESSAGE_SELECT =
  "id,subject,from,receivedDateTime,isRead,bodyPreview";
const DEFAULT_CHAT_SELECT =
  "id,topic,chatType,lastUpdatedDateTime,webUrl";

export async function resolveUserReference(token, userReference) {
  const normalizedReference = normalizeLookupValue(
    userReference,
    "User name, email, or ID"
  );
  const directUser = await tryResolveDirectUser(token, normalizedReference);

  if (directUser) {
    return directUser.id || normalizedReference;
  }

  const matches = await rankUsersByReference(token, normalizedReference);
  return requireUniqueMatch(matches, "user", normalizedReference, formatUserMatch).id;
}

export async function resolveMessageReference(token, messageReference) {
  const normalizedReference = normalizeLookupValue(
    messageReference,
    "Message subject or ID"
  );
  const directMessage = await tryResolveDirectMessage(token, normalizedReference);

  if (directMessage) {
    return directMessage.id;
  }

  const matches = await rankMessagesByReference(token, normalizedReference);
  return requireUniqueMatch(
    matches,
    "message",
    normalizedReference,
    formatMessageMatch
  ).id;
}

export async function resolveChatReference(token, chatReference) {
  const normalizedReference = normalizeLookupValue(
    chatReference,
    "Chat name, participant, or ID"
  );
  const directChat = await tryResolveDirectChat(token, normalizedReference);

  if (directChat) {
    return directChat.id;
  }

  const matches = await searchChatsByFriendlyTextInternal(token, normalizedReference, 5);
  return requireUniqueMatch(matches, "chat", normalizedReference, formatChatMatch).id;
}

export async function searchChatsByFriendlyText(token, searchText, { top } = {}) {
  const normalizedSearchText = normalizeLookupValue(
    searchText,
    "Chat name or participant"
  );
  const matches = await searchChatsByFriendlyTextInternal(
    token,
    normalizedSearchText,
    Number(top) || 10
  );

  return matches.map(stripChatMatchMetadata);
}

async function rankUsersByReference(token, normalizedReference) {
  const users = await runFriendlyLookup(
    () =>
      userService.searchUsers(token, normalizedReference, {
        top: 10,
        select: DEFAULT_USER_SELECT,
      }),
    "Use an email/UPN directly or grant directory lookup permissions for name-based user resolution."
  );

  return users
    .map((user) => ({
      ...user,
      _matchScore: Math.max(
        scoreTextMatch(normalizedReference, user.displayName),
        scoreTextMatch(normalizedReference, user.mail),
        scoreTextMatch(normalizedReference, user.userPrincipalName)
      ),
    }))
    .filter((user) => user._matchScore > 0)
    .sort(compareFriendlyMatches);
}

async function rankMessagesByReference(token, normalizedReference) {
  const messages = await runFriendlyLookup(
    () =>
      mailService.searchMyMessages(token, normalizedReference, {
        top: 10,
        select: DEFAULT_MESSAGE_SELECT,
      }),
    "Try a more specific subject, sender, or direct message ID."
  );

  return messages
    .map((message) => ({
      ...message,
      _matchScore: Math.max(
        scoreTextMatch(normalizedReference, message.subject),
        scoreTextMatch(normalizedReference, message.from?.emailAddress?.address),
        scoreTextMatch(normalizedReference, message.bodyPreview)
      ),
    }))
    .filter((message) => message._matchScore > 0)
    .sort(compareFriendlyMatches);
}

async function searchChatsByFriendlyTextInternal(token, normalizedSearchText, top) {
  const chats = await runFriendlyLookup(
    () =>
      teamsChatService.listMyChats(token, {
        top: Math.max(top * 3, 25),
        select: DEFAULT_CHAT_SELECT,
      }),
    "Verify chat read permissions or use a direct chat ID."
  );
  const matches = [];

  for (const chat of chats) {
    const scoredChat = await scoreChatCandidate(token, chat, normalizedSearchText);

    if (scoredChat._matchScore > 0) {
      matches.push(scoredChat);
    }
  }

  return matches.sort(compareFriendlyMatches).slice(0, top);
}

async function scoreChatCandidate(token, chat, normalizedSearchText) {
  const topicScore = scoreTextMatch(normalizedSearchText, chat.topic);
  const idScore = scoreTextMatch(normalizedSearchText, chat.id);
  let memberSummary = "";
  let memberMatches = [];
  let memberScore = 0;

  if (topicScore === 0) {
    memberMatches = await teamsChatService.listChatMembers(token, chat.id);
    const memberLabels = memberMatches.map(formatChatMemberLabel).filter(Boolean);
    memberSummary = memberLabels.join(", ");
    memberScore = memberLabels.reduce(
      (bestScore, memberLabel) =>
        Math.max(bestScore, scoreTextMatch(normalizedSearchText, memberLabel)),
      0
    );
  }

  return {
    ...chat,
    memberSummary,
    matchedOn:
      topicScore >= memberScore && topicScore >= idScore
        ? "topic"
        : memberScore >= idScore
          ? "participant"
          : "id",
    _matchScore: Math.max(topicScore, memberScore, idScore),
    _lastActivity:
      Date.parse(chat.lastUpdatedDateTime || "") || 0,
    _memberMatches: memberMatches,
  };
}

async function tryResolveDirectUser(token, normalizedReference) {
  try {
    return await userService.getUser(token, normalizedReference, {
      select: DEFAULT_USER_SELECT,
    });
  } catch (error) {
    if (error?.status === 400 || error?.status === 404) {
      return null;
    }

    throw error;
  }
}

async function tryResolveDirectMessage(token, normalizedReference) {
  try {
    return await mailService.getMessage(token, normalizedReference, {
      select: DEFAULT_MESSAGE_SELECT,
    });
  } catch (error) {
    if (error?.status === 400 || error?.status === 404) {
      return null;
    }

    throw error;
  }
}

async function tryResolveDirectChat(token, normalizedReference) {
  try {
    return await teamsChatService.getChat(token, normalizedReference, {
      select: DEFAULT_CHAT_SELECT,
    });
  } catch (error) {
    if (error?.status === 400 || error?.status === 404) {
      return null;
    }

    throw error;
  }
}

function requireUniqueMatch(matches, kind, rawReference, formatter) {
  if (matches.length === 0) {
    throw buildLookupError(
      `${toDisplayLabel(kind)} "${rawReference}" did not match any accessible result.`,
      "GraphFriendlyLookupNotFound",
      `Try a more specific ${kind} name, email, subject, or direct ID.`
    );
  }

  if (matches.length === 1 || matches[0]._matchScore > (matches[1]?._matchScore || 0)) {
    return matches[0];
  }

  throw buildLookupError(
    `${toDisplayLabel(kind)} "${rawReference}" matched multiple results.`,
    "GraphFriendlyLookupAmbiguous",
    `Be more specific or use a direct ID. Matches: ${matches
      .slice(0, 5)
      .map(formatter)
      .join(" | ")}`
  );
}

function compareFriendlyMatches(left, right) {
  if (right._matchScore !== left._matchScore) {
    return right._matchScore - left._matchScore;
  }

  if ((right._lastActivity || 0) !== (left._lastActivity || 0)) {
    return (right._lastActivity || 0) - (left._lastActivity || 0);
  }

  return String(left.displayName || left.subject || left.topic || left.id || "")
    .localeCompare(String(right.displayName || right.subject || right.topic || right.id || ""));
}

function stripChatMatchMetadata(chat) {
  const { _matchScore, _lastActivity, _memberMatches, ...safeChat } = chat;
  return safeChat;
}

function scoreTextMatch(needle, haystack) {
  if (!needle || !haystack) {
    return 0;
  }

  const normalizedNeedle = normalizeForCompare(needle);
  const normalizedHaystack = normalizeForCompare(haystack);

  if (normalizedHaystack === normalizedNeedle) {
    return 300;
  }

  if (normalizedHaystack.startsWith(normalizedNeedle)) {
    return 200;
  }

  if (normalizedHaystack.includes(normalizedNeedle)) {
    return 100;
  }

  return 0;
}

function formatUserMatch(user) {
  return `${user.displayName || "Unnamed"} <${user.mail || user.userPrincipalName || user.id}>`;
}

function formatMessageMatch(message) {
  return `${message.subject || "(No subject)"} from ${
    message.from?.emailAddress?.address || "unknown sender"
  } on ${message.receivedDateTime || "unknown date"}`;
}

function formatChatMatch(chat) {
  const title = chat.topic || chat.memberSummary || chat.id || "Untitled chat";
  return `${title} (${chat.chatType || "chat"})`;
}

function formatChatMemberLabel(member) {
  return (
    member.displayName ||
    member.email ||
    member.userId ||
    member.visibleHistoryStartDateTime ||
    ""
  );
}

function normalizeLookupValue(value, label) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw buildLookupError(
      `${label} is required for friendly lookup.`,
      "GraphFriendlyLookupMissing",
      "Enter a name, email, subject, or direct ID."
    );
  }

  return normalizedValue;
}

function normalizeForCompare(value) {
  return String(value || "").trim().toLowerCase();
}

function buildLookupError(message, code, hint) {
  const error = new Error(message);
  error.name = "GraphFriendlyLookupError";
  error.code = code;
  error.statusCode = 400;
  error.hint = hint;
  return error;
}

async function runFriendlyLookup(loadValue, permissionHint) {
  try {
    return await loadValue();
  } catch (error) {
    if (error?.status === 403) {
      throw buildLookupError(
        error.graphMessage || error.message,
        "GraphFriendlyLookupPermissionDenied",
        permissionHint
      );
    }

    throw error;
  }
}

function toDisplayLabel(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}
