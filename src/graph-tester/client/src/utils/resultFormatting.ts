import {
  formatBytes,
  formatDateTime,
  formatValueForCell,
  hasUsableValue,
  isScalarLike,
  sanitizeHtmlContent,
  stripHtml,
  toDisplayLabel,
} from "./valueFormatters";

type AnyRecord = Record<string, any>;

export interface TableColumn {
  key: string;
  label: string;
  getter: (item: AnyRecord) => unknown;
}

export interface KeyValue {
  label: string;
  value: string;
}

export interface PreviewMail {
  metaLines: string[];
  bodyLabel: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface PreviewCard {
  title: string;
  lines: string[];
  mail?: PreviewMail;
}

// Column catalog ported from the original tester; the table shows the first
// six columns that actually carry data across the returned rows.
export const TABLE_COLUMNS: TableColumn[] = [
  { key: "id", label: "ID", getter: (item) => item.id },
  { key: "displayName", label: "Name", getter: (item) => item.displayName },
  { key: "name", label: "Name", getter: (item) => item.name },
  {
    key: "mail",
    label: "Mail",
    getter: (item) =>
      item.mail ||
      item.userPrincipalName ||
      item.emailAddress?.address ||
      item.scoredEmailAddresses?.[0]?.address,
  },
  { key: "email", label: "Email", getter: (item) => item.email },
  { key: "userPrincipalName", label: "User principal name", getter: (item) => item.userPrincipalName },
  { key: "subject", label: "Subject", getter: (item) => item.subject },
  { key: "description", label: "Description", getter: (item) => item.description },
  {
    key: "from",
    label: "From",
    getter: (item) =>
      item.from?.emailAddress?.address ||
      item.from?.user?.displayName ||
      item.organizer?.emailAddress?.address,
  },
  { key: "receivedDateTime", label: "Received", getter: (item) => item.receivedDateTime },
  { key: "lastModifiedDateTime", label: "Last modified", getter: (item) => item.lastModifiedDateTime },
  { key: "lastUpdatedDateTime", label: "Last updated", getter: (item) => item.lastUpdatedDateTime },
  { key: "isRead", label: "Read", getter: (item) => item.isRead },
  { key: "contentType", label: "Content type", getter: (item) => item.contentType },
  { key: "size", label: "Size", getter: (item) => item.size },
  { key: "webUrl", label: "Web URL", getter: (item) => item.webUrl },
  { key: "start", label: "Start", getter: (item) => item.start?.dateTime || item.start },
  { key: "end", label: "End", getter: (item) => item.end?.dateTime || item.end },
  { key: "location", label: "Location", getter: (item) => item.location?.displayName || item.location },
  { key: "topic", label: "Topic", getter: (item) => item.topic },
  { key: "memberSummary", label: "Participants", getter: (item) => item.memberSummary },
  { key: "chatType", label: "Chat type", getter: (item) => item.chatType },
  { key: "createdDateTime", label: "Created", getter: (item) => item.createdDateTime },
  { key: "parentFolderId", label: "Parent folder", getter: (item) => item.parentFolderId },
  { key: "childFolderCount", label: "Child folders", getter: (item) => item.childFolderCount },
  { key: "totalItemCount", label: "Total items", getter: (item) => item.totalItemCount },
  { key: "unreadItemCount", label: "Unread items", getter: (item) => item.unreadItemCount },
  { key: "sequence", label: "Sequence", getter: (item) => item.sequence },
  { key: "color", label: "Color", getter: (item) => item.color },
];

export function selectTableColumns(rows: AnyRecord[]): TableColumn[] {
  const objectRows = rows.filter((item) => item && typeof item === "object");
  if (objectRows.length === 0) {
    return [];
  }
  return TABLE_COLUMNS.filter((column) =>
    objectRows.some((item) => hasUsableValue(column.getter(item))),
  ).slice(0, 6);
}

export function buildScalarGrid(data: AnyRecord): KeyValue[] {
  return Object.entries(data)
    .filter(([, value]) => isScalarLike(value))
    .slice(0, 12)
    .map(([key, value]) => ({
      label: toDisplayLabel(key),
      value: formatValueForCell(value),
    }));
}

export { formatValueForCell };

// Builds normalized preview-card view models per outputHint. Returns [] when a
// hint has no card representation (the table/scalar grid still renders).
export function buildPreviewCards(outputHint: string, items: unknown[]): PreviewCard[] {
  return items
    .slice(0, 8)
    .map((item) => buildPreviewCard(outputHint, item as AnyRecord))
    .filter((card): card is PreviewCard => card !== null);
}

function buildPreviewCard(outputHint: string, item: AnyRecord): PreviewCard | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  if (outputHint === "mailMessages" || outputHint === "mailMessage") {
    return buildMailCard(item, outputHint === "mailMessage");
  }

  if (outputHint === "calendarEvents" || outputHint === "calendarEvent") {
    return {
      title: item.subject || "(No subject)",
      lines: [
        formatDateTime(item.start?.dateTime || item.start),
        formatDateTime(item.end?.dateTime || item.end),
        item.location?.displayName || "No location",
        item.organizer?.emailAddress?.address || "Organizer unavailable",
      ],
    };
  }

  if (outputHint === "calendarList" || outputHint === "calendar") {
    return {
      title: item.name || "(Unnamed calendar)",
      lines: [
        item.owner?.name || item.owner?.address || "Owner unavailable",
        item.canEdit === true ? "Editable" : "Read-only",
        item.isDefaultCalendar === true ? "Default calendar" : "Secondary calendar",
      ],
    };
  }

  if (
    outputHint === "users" ||
    outputHint === "user" ||
    outputHint === "person" ||
    outputHint === "people" ||
    outputHint === "directoryObjects"
  ) {
    return {
      title: item.displayName || item.name || "(Unnamed person)",
      lines: [
        item.mail || item.userPrincipalName || item.scoredEmailAddresses?.[0]?.address || "No email",
        item.jobTitle || "No title",
        item.officeLocation || "No office location",
      ],
    };
  }

  if (outputHint === "teams" || outputHint === "channels" || outputHint === "channel") {
    return {
      title: item.displayName || item.name || "(Unnamed team)",
      lines: [
        item.description || item.summary || "No description",
        item.membershipType || item.visibility || "Visibility unavailable",
        formatDateTime(item.createdDateTime),
        item.webUrl || "No web URL",
      ],
    };
  }

  if (
    outputHint === "chats" ||
    outputHint === "chat" ||
    outputHint === "chatMessages" ||
    outputHint === "chatMessage"
  ) {
    return {
      title:
        item.topic || item.memberSummary || item.subject || item.chatType || "(Untitled chat item)",
      lines: [
        item.chatType || item.messageType || "Graph chat item",
        item.memberSummary || "",
        item.from?.user?.displayName || item.createdBy?.user?.displayName || "Sender unavailable",
        formatDateTime(item.createdDateTime || item.lastUpdatedDateTime),
        stripHtml(item.body?.content || "").slice(0, 160) || "No preview available.",
      ].filter(Boolean),
    };
  }

  if (outputHint === "attachments" || outputHint === "attachment") {
    return {
      title: item.name || "(Unnamed attachment)",
      lines: [
        item.contentType || "Unknown content type",
        formatBytes(item.size || item.sizeBytes),
        formatDateTime(item.lastModifiedDateTime),
      ],
    };
  }

  if (outputHint === "mailFolders" || outputHint === "mailFolder") {
    return {
      title: item.displayName || "(Unnamed folder)",
      lines: [
        `Unread ${item.unreadItemCount ?? 0}`,
        `Total ${item.totalItemCount ?? 0}`,
        `Child folders ${item.childFolderCount ?? 0}`,
      ],
    };
  }

  if (outputHint === "messageRules" || outputHint === "messageRule") {
    return {
      title: item.displayName || "(Unnamed rule)",
      lines: [
        `Sequence ${item.sequence ?? "-"}`,
        item.isEnabled === true ? "Enabled" : "Disabled",
        item.isReadOnly === true ? "Read-only" : "Editable",
      ],
    };
  }

  if (outputHint === "categories") {
    return {
      title: item.displayName || "(Unnamed category)",
      lines: [item.color || "No color"],
    };
  }

  return null;
}

function buildMailCard(item: AnyRecord, showFullBody: boolean): PreviewCard {
  const metaLines = [
    item.from?.emailAddress?.address || "Unknown sender",
    formatDateTime(item.receivedDateTime),
    item.isRead === true ? "Read" : item.isRead === false ? "Unread" : "Read state unavailable",
  ];

  const body = item.body;
  let mail: PreviewMail;

  if (showFullBody && body?.content) {
    mail = {
      metaLines,
      bodyLabel: body.contentType === "text" ? "Body text" : "Body HTML",
      bodyHtml:
        body.contentType === "html"
          ? sanitizeHtmlContent(body.content)
          : escapeHtml(String(body.content)).replace(/\r?\n/g, "<br />"),
    };
  } else {
    mail = {
      metaLines,
      bodyLabel: "Preview",
      bodyText:
        item.bodyPreview || stripHtml(body?.content || "").slice(0, 160) || "No preview available.",
    };
  }

  return { title: item.subject || "(No subject)", lines: [], mail };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
