"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileCode,
  FileText,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  assistantChat,
  type AssistantCapability,
  type AssistantChatMessage,
  type AssistantModelStatusResponse,
  type AssistantProposedAction,
  type AssistantSource,
  type ResponseBlock,
} from "@/lib/assistantChat";
import { ResponseBlocks } from "@/components/assistant/ResponseBlocks";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: ResponseBlock[];
  sources?: AssistantSource[];
  proposedActions?: AssistantProposedAction[];
  error?: boolean;
}

type ActionUiStatus = AssistantProposedAction["status"] | "confirming";

export function AssistantChatPanel() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [capabilities, setCapabilities] = useState<AssistantCapability[] | null>(null);
  const [modelStatus, setModelStatus] = useState<AssistantModelStatusResponse | null>(null);
  const [actionStatuses, setActionStatuses] = useState<Record<string, ActionUiStatus>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();

  useEffect(() => {
    let cancelled = false;

    assistantChat
      .getCapabilities()
      .then((res) => {
        if (!cancelled) setCapabilities(res.capabilities);
      })
      .catch(() => {
        if (!cancelled) setCapabilities([]);
      });

    assistantChat
      .getModelStatus()
      .then((res) => {
        if (!cancelled) setModelStatus(res);
      })
      .catch(() => {
        if (!cancelled) setModelStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  const sendMessage = async (text: string) => {
    const userEntry: ChatEntry = { id: makeId(), role: "user", content: text };
    const nextEntries = [...entries, userEntry];
    setEntries(nextEntries);
    setSending(true);

    try {
      const history: AssistantChatMessage[] = nextEntries.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));
      const res = await assistantChat.sendMessage(history);
      setEntries((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: res.content || "(no response)",
          blocks: res.blocks,
          sources: res.sources,
          proposedActions: res.proposedActions,
        },
      ]);
    } catch (error) {
      setEntries((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: error instanceof Error ? error.message : "The assistant request failed.",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    void sendMessage(text);
  };

  const handleConfirm = async (action: AssistantProposedAction) => {
    setActionStatuses((current) => ({ ...current, [action.id]: "confirming" }));
    setActionErrors((current) => ({ ...current, [action.id]: "" }));
    try {
      const res = await assistantChat.confirmAction(action.id);
      if (!res.ok) throw new Error(res.error || "Action failed.");
      setActionStatuses((current) => ({ ...current, [action.id]: "confirmed" }));
    } catch (error) {
      setActionStatuses((current) => ({ ...current, [action.id]: "failed" }));
      setActionErrors((current) => ({
        ...current,
        [action.id]: error instanceof Error ? error.message : "Action failed.",
      }));
    }
  };

  const handleCancel = async (action: AssistantProposedAction) => {
    setActionStatuses((current) => ({ ...current, [action.id]: "canceled" }));
    try {
      await assistantChat.cancelAction(action.id);
    } catch {
      // Already marked canceled locally; a failed cancel call isn't actionable here.
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StatusRow modelStatus={modelStatus} capabilities={capabilities} />

      <div
        ref={logRef}
        className="min-h-[220px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/45 px-3 py-3"
      >
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ask about mail, calendar, Teams, tasks, or how this app itself is built. Actions that
            change live data are staged for you to confirm — nothing sends automatically.
          </p>
        ) : (
          entries.map((entry) => (
            <ChatBubble
              key={entry.id}
              entry={entry}
              actionStatuses={actionStatuses}
              actionErrors={actionErrors}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))
        )}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
        <label htmlFor={inputId} className="sr-only">
          Message the assistant
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask the assistant…"
            rows={2}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500/40"
          />
          <Button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-2xl bg-violet-400 px-4 text-slate-950 hover:bg-violet-300"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

function ChatBubble({
  entry,
  actionStatuses,
  actionErrors,
  onConfirm,
  onCancel,
}: {
  entry: ChatEntry;
  actionStatuses: Record<string, ActionUiStatus>;
  actionErrors: Record<string, string>;
  onConfirm: (action: AssistantProposedAction) => void;
  onCancel: (action: AssistantProposedAction) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2 text-sm leading-6",
        entry.error
          ? "border-red-500/25 bg-red-500/10 text-red-100"
          : entry.role === "assistant"
            ? "border-cyan-500/20 bg-cyan-500/8 text-slate-100"
            : "border-violet-500/20 bg-violet-500/8 text-slate-100"
      )}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {entry.role === "assistant" ? "Assistant" : "You"}
      </p>
      {entry.blocks && entry.blocks.length > 0 ? (
        <ResponseBlocks blocks={entry.blocks} />
      ) : (
        <p className="whitespace-pre-wrap">{entry.content}</p>
      )}

      {entry.sources && entry.sources.length > 0 && (
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

function SourceChip({ source }: { source: AssistantSource }) {
  const Icon = source.type === "code" ? FileCode : FileText;
  const lineRange =
    source.type === "code" && source.startLine
      ? `:${source.startLine}${source.endLine && source.endLine !== source.startLine ? `-${source.endLine}` : ""}`
      : "";

  return (
    <span
      title={source.snippet}
      className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-slate-700/80 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {source.path}
        {lineRange}
      </span>
    </span>
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
  status: ActionUiStatus;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirming = status === "confirming";
  const resolved = status === "confirmed" || status === "canceled" || status === "failed";
  const actionLabel = confirmButtonLabel(action.functionName);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        Proposed action
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-100">{action.summary}</p>

      {status === "pending" || confirming ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-full bg-emerald-500 px-4 text-slate-950 hover:bg-emerald-400"
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {confirming ? "Confirming" : actionLabel}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-full border-slate-700/80 bg-slate-950/35 text-slate-200 hover:border-red-400/50 hover:bg-red-500/10"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
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
            {status === "confirmed" && "Confirmed — action executed."}
            {status === "canceled" && "Canceled — nothing was changed."}
            {status === "failed" && `Failed${error ? `: ${error}` : "."}`}
          </p>
        )
      )}
    </div>
  );
}

function confirmButtonLabel(functionName: string): string {
  const lower = functionName.toLowerCase();
  if (lower.includes("send") || lower.includes("reply")) return "Confirm Send";
  if (lower.includes("delete")) return "Confirm Delete";
  if (lower.includes("move")) return "Confirm Move";
  if (lower.includes("event")) return "Confirm Calendar Update";
  if (lower.includes("channel") || lower.includes("chat")) return "Confirm Teams Message";
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
      ? "Orchestrator · deterministic router"
      : chat.mode === "local"
        ? `Local · ${chat.model}${chat.reachable === false ? " (unreachable)" : ""}`
        : `Cloud · ${chat.provider} · ${chat.model}`
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
          <span className={cn("h-2 w-2 rounded-full", modelOk ? "bg-cyan-300" : "bg-red-300")} />
          {modelLabel}
        </span>
      </div>

      {capabilities && capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((cap) => (
            <span
              key={cap.capability}
              title={cap.reason ?? undefined}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                cap.enabled
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700/80 bg-slate-900/50 text-slate-500"
              )}
            >
              {cap.capability}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function makeId(): string {
  return `msg_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}
