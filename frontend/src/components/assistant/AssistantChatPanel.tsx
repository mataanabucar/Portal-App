"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import {
  CopyResponseButton,
  ResponseBlocks,
  SourceChip,
} from "@/components/assistant/ResponseBlocks";
import type { AssistantActionUiStatus } from "@/hooks/useAssistantChatConversation";
import type {
  AssistantCapability,
  AssistantChatEntry,
  AssistantModelStatusResponse,
  AssistantProposedAction,
} from "@/lib/assistantChat";
import { cn } from "@/lib/utils";

interface AssistantChatPanelProps {
  entries: AssistantChatEntry[];
  sending: boolean;
  capabilities: AssistantCapability[] | null;
  modelStatus: AssistantModelStatusResponse | null;
  actionStatuses: Record<string, AssistantActionUiStatus>;
  actionErrors: Record<string, string>;
  onConfirm: (action: AssistantProposedAction) => void;
  onCancel: (action: AssistantProposedAction) => void;
  showSources?: boolean;
  // When embedded (in the assistant dock) the parent owns the single scroll
  // region and autoscroll; the panel renders bubbles directly with no inner
  // scroll box, so the modal never gets competing scrollbars.
  embedded?: boolean;
}

export function AssistantChatPanel({
  entries,
  sending,
  capabilities,
  modelStatus,
  actionStatuses,
  actionErrors,
  onConfirm,
  onCancel,
  showSources = true,
  embedded = false,
}: AssistantChatPanelProps) {
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!embedded && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries, sending, embedded]);

  const bubbles = (
    <>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ask about mail, calendar, Teams, tasks, or how this app is built.
          Mutating actions are staged for confirmation before anything runs.
        </p>
      ) : (
        entries.map((entry) => (
          <ChatBubble
            key={entry.id}
            entry={entry}
            actionStatuses={actionStatuses}
            actionErrors={actionErrors}
            onConfirm={onConfirm}
            onCancel={onCancel}
            showSources={showSources}
          />
        ))
      )}

      {sending && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Thinking...
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <StatusRow modelStatus={modelStatus} capabilities={capabilities} />
        {bubbles}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StatusRow modelStatus={modelStatus} capabilities={capabilities} />

      <div
        ref={logRef}
        className="min-h-[220px] flex-1 space-y-3 overflow-y-auto rounded-[24px] border border-slate-800/80 bg-slate-950/45 px-3 py-3"
      >
        {bubbles}
      </div>
    </div>
  );
}

function ChatBubble({
  entry,
  actionStatuses,
  actionErrors,
  onConfirm,
  onCancel,
  showSources,
}: {
  entry: AssistantChatEntry;
  actionStatuses: Record<string, AssistantActionUiStatus>;
  actionErrors: Record<string, string>;
  onConfirm: (action: AssistantProposedAction) => void;
  onCancel: (action: AssistantProposedAction) => void;
  showSources: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-3 py-2 text-sm leading-6",
        entry.error
          ? "border-red-500/25 bg-red-500/10 text-red-100"
          : entry.role === "assistant"
            ? "border-cyan-500/20 bg-cyan-500/8 text-slate-100"
            : "border-violet-500/20 bg-violet-500/8 text-slate-100"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {entry.role === "assistant" ? "Assistant" : "You"}
        </p>
        {entry.role === "assistant" && (
          <CopyResponseButton text={entry.content} />
        )}
      </div>

      {entry.blocks && entry.blocks.length > 0 ? (
        <ResponseBlocks blocks={entry.blocks} showSources={showSources} />
      ) : (
        <p className="whitespace-pre-wrap">{entry.content}</p>
      )}

      {showSources && entry.sources && entry.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.sources.map((source, index) => (
            <SourceChip key={`${source.path}-${index}`} source={source} />
          ))}
        </div>
      )}

      {entry.proposedActions && entry.proposedActions.length > 0 && (
        <div className="mt-2 space-y-2">
          {entry.proposedActions.map((action) => (
            <ProposedActionCard
              key={action.id}
              action={action}
              status={actionStatuses[action.id] ?? action.status}
              error={actionErrors[action.id]}
              onConfirm={() => onConfirm(action)}
              onCancel={() => onCancel(action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposedActionCard({
  action,
  status,
  error,
  onConfirm,
  onCancel,
}: {
  action: AssistantProposedAction;
  status: AssistantActionUiStatus;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirming = status === "confirming";
  const resolved =
    status === "confirmed" || status === "canceled" || status === "failed";
  const actionLabel = confirmButtonLabel(action.functionName);

  return (
    <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        Proposed action
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-100">
        {action.summary}
      </p>

      {status === "pending" || confirming ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {confirming ? "Confirming" : actionLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-red-400/50 hover:bg-red-500/10 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      ) : (
        resolved && (
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              status === "confirmed" && "text-emerald-300",
              status === "canceled" && "text-slate-400",
              status === "failed" && "text-red-300"
            )}
          >
            {status === "confirmed" && "Confirmed - action executed."}
            {status === "canceled" && "Canceled - nothing was changed."}
            {status === "failed" && `Failed${error ? `: ${error}` : "."}`}
          </p>
        )
      )}
    </div>
  );
}

function confirmButtonLabel(functionName: string) {
  const lower = functionName.toLowerCase();
  if (lower.includes("send") || lower.includes("reply")) {
    return "Confirm send";
  }
  if (lower.includes("delete")) {
    return "Confirm delete";
  }
  if (lower.includes("move")) {
    return "Confirm move";
  }
  if (lower.includes("event")) {
    return "Confirm calendar update";
  }
  if (lower.includes("channel") || lower.includes("chat")) {
    return "Confirm Teams message";
  }
  return "Confirm";
}

function StatusRow({
  modelStatus,
  capabilities,
}: {
  modelStatus: AssistantModelStatusResponse | null;
  capabilities: AssistantCapability[] | null;
}) {
  const chat = modelStatus?.chat;
  const modelLabel = chat
    ? chat.mode === "orchestrator"
      ? "Orchestrator - deterministic router"
      : chat.mode === "local"
        ? `Local - ${chat.model}${chat.reachable === false ? " (unreachable)" : ""}`
        : `Cloud - ${chat.provider} - ${chat.model}`
    : "Model status unavailable";
  const modelOk = chat
    ? chat.mode === "orchestrator"
      ? true
      : chat.mode === "local"
        ? chat.reachable !== false
        : chat.enabled
    : false;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            modelOk
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
              : "border-red-500/25 bg-red-500/10 text-red-200"
          )}
          title={chat?.reason ?? undefined}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              modelOk ? "bg-cyan-300" : "bg-red-300"
            )}
          />
          {modelLabel}
        </span>
      </div>

      {capabilities && capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((capability) => (
            <span
              key={capability.capability}
              title={capability.reason ?? undefined}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                capability.enabled
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700/80 bg-slate-900/50 text-slate-500"
              )}
            >
              {capability.capability}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
