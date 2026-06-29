"use client";

import type { DashboardCardItem } from "./types";

const MAX_CONTEXT_CHARS = 40000;
const MAX_SUMMARY_CHARS = 1200;
const MAX_TITLE_CHARS = 180;
const MAX_ACTION_CHARS = 320;
const MAX_DETAIL_CHARS = 160;
const MAX_ITEM_SUMMARY_CHARS = 700;
const MAX_DELIVERABLE_CHARS = 320;
const MAX_BLOCKER_CHARS = 200;
const MAX_URGENCY_CHARS = 220;

export interface RealtimeContextItem {
  index: number;
  id: string;
  title: string;
  status: { label: string };
  priority: { label: string };
  due: { date: string; relative: string };
  nextAction: string;
  summary: string;
  deliverable: string;
  urgency: string;
  confidence: { level: string; reason: string };
  blockers: string[];
  blockersCount: number;
  keyDetails: Array<{ label: string; value: string }>;
  requestId?: string;
  application?: string;
  businessCustomer?: string;
}

export interface RealtimeContextPayload {
  queueCount: number;
  generatedAt: string;
  tone?: string;
  summary?: string;
  refreshing?: boolean;
  items: RealtimeContextItem[];
}

export function buildRealtimeContext(
  items: DashboardCardItem[],
  opts: { summary?: string; tone?: string; refreshing?: boolean } = {}
): RealtimeContextPayload {
  const payload: RealtimeContextPayload = {
    queueCount: items.length,
    generatedAt: new Date().toISOString(),
    tone: trimText(opts.tone, 120),
    summary: trimText(opts.summary, MAX_SUMMARY_CHARS),
    refreshing: opts.refreshing === true,
    items: items.map((item) => ({
      index: item.index,
      id: trimText(item.id, 80),
      title: trimText(item.title, MAX_TITLE_CHARS),
      status: { label: trimText(item.status.label, 60) },
      priority: { label: trimText(item.priority.label, 60) },
      due: {
        date: trimText(item.due.date, 60),
        relative: trimText(item.due.relative, 60),
      },
      nextAction: trimText(item.nextAction, MAX_ACTION_CHARS),
      summary: trimText(item.summary, MAX_ITEM_SUMMARY_CHARS),
      deliverable: trimText(item.deliverable, MAX_DELIVERABLE_CHARS),
      urgency: trimText(item.urgencyText, MAX_URGENCY_CHARS),
      confidence: {
        level: trimText(item.confidence.level, 20),
        reason: trimText(item.confidence.reason, 200),
      },
      blockers: item.blockersOpenQuestions
        .map((blocker) => trimText(blocker, MAX_BLOCKER_CHARS))
        .filter(Boolean),
      blockersCount: item.blockersOpenQuestions.length,
      keyDetails: collectKeyDetails(item),
      requestId: pickKeyDetail(item, "Request ID"),
      application: pickKeyDetail(item, "Application"),
      businessCustomer: pickKeyDetail(item, "Business / Customer"),
    })),
  };

  return shrinkRealtimeContext(payload);
}

function shrinkRealtimeContext(
  payload: RealtimeContextPayload
): RealtimeContextPayload {
  const next: RealtimeContextPayload = {
    ...payload,
    items: [...payload.items],
  };

  while (
    next.items.length > 1 &&
    JSON.stringify(next).length > MAX_CONTEXT_CHARS
  ) {
    next.items.pop();
  }

  if (JSON.stringify(next).length > MAX_CONTEXT_CHARS && next.summary) {
    next.summary = trimText(next.summary, 320);
  }

  if (JSON.stringify(next).length > MAX_CONTEXT_CHARS && next.items.length > 0) {
    next.items = next.items.map((item) => ({
      ...item,
      title: trimText(item.title, 120),
      nextAction: trimText(item.nextAction, 120),
      summary: trimText(item.summary, 240),
      deliverable: trimText(item.deliverable, 120),
      urgency: trimText(item.urgency, 120),
      blockers: item.blockers.slice(0, 3),
      keyDetails: item.keyDetails.slice(0, 6),
      requestId: trimText(item.requestId, 40),
      application: trimText(item.application, 60),
      businessCustomer: trimText(item.businessCustomer, 60),
    }));
  }

  while (
    next.items.length > 0 &&
    JSON.stringify(next).length > MAX_CONTEXT_CHARS
  ) {
    next.items.pop();
  }

  return next;
}

function collectKeyDetails(item: DashboardCardItem) {
  return item.keyDetails
    .filter((entry) => entry.value && entry.value !== "Not visible")
    .map((entry) => ({
      label: entry.label,
      value: trimText(entry.value, MAX_DETAIL_CHARS),
    }));
}

function pickKeyDetail(item: DashboardCardItem, label: string) {
  const value =
    item.keyDetails.find((entry) => entry.label === label)?.value ?? "";
  if (!value || value === "Not visible") {
    return undefined;
  }

  return trimText(value, MAX_DETAIL_CHARS);
}

function trimText(value: string | undefined, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
