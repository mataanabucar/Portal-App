"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Mail,
  MessageSquareText,
  Mic,
  MicOff,
  Minimize2,
  Paperclip,
  Phone,
  PhoneOff,
  Send,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GennyBotMascot,
  type GennyBotState,
} from "@/components/assistant/GennyBotMascot";
import {
  useRealtimeAssistant,
  type EmailSendStatus,
  type PendingEmail,
} from "@/hooks/useRealtimeAssistant";
import type { DashboardCardItem, DashboardResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RealtimeAssistantDockProps {
  items: DashboardCardItem[];
  summary?: string;
  tone?: string;
  isRefreshing?: boolean;
  refresh: () => Promise<DashboardResponse | undefined>;
}

declare global {
  interface Window {
    GennyBot?: {
      setState: (state: GennyBotState) => void;
      setSpeaking: (isSpeaking: boolean) => void;
    };
    setGennyBotState?: (state: GennyBotState) => void;
  }
}

const GENNY_BOT_STATES: readonly GennyBotState[] = [
  "idle",
  "listening",
  "thinking",
  "responding",
  "error",
];

export function RealtimeAssistantDock({
  items,
  summary,
  tone,
  isRefreshing = false,
  refresh,
}: RealtimeAssistantDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [manualBotState, setManualBotState] = useState<GennyBotState | null>(null);
  const [dismissedErrorSignal, setDismissedErrorSignal] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const {
    status,
    isConnected,
    isMuted,
    messages,
    activeToolName,
    error,
    presets,
    presetId,
    selectPreset,
    pendingEmail,
    emailStatus,
    confirmSendEmail,
    cancelSendEmail,
    addEmailAttachment,
    removeEmailAttachment,
    connect,
    disconnect,
    toggleMute,
    sendText,
    clearConversation,
  } = useRealtimeAssistant({
    items,
    summary,
    tone,
    refreshing: isRefreshing,
    refresh,
  });

  const errorSignal = error || (status === "error" ? "realtime-error" : "");
  const showErrorState = Boolean(
    errorSignal && dismissedErrorSignal !== errorSignal
  );
  const realtimeBotState = resolveGennyBotState({
    activeToolName,
    connected: isConnected,
    showError: showErrorState,
    status,
  });
  const botState = manualBotState ?? realtimeBotState;

  useEffect(() => {
    const setGennyBotState = (nextState: GennyBotState) => {
      if (!isGennyBotState(nextState)) {
        console.warn(`Unsupported Genny bot state: ${String(nextState)}`);
        return;
      }
      setManualBotState(nextState);
    };

    const controller = {
      setState: setGennyBotState,
      setSpeaking: (isSpeaking: boolean) => {
        setManualBotState(isSpeaking ? "responding" : null);
      },
    };

    window.setGennyBotState = setGennyBotState;
    window.GennyBot = controller;

    return () => {
      if (window.setGennyBotState === setGennyBotState) {
        delete window.setGennyBotState;
      }
      if (window.GennyBot === controller) {
        delete window.GennyBot;
      }
    };
  }, []);

  useEffect(() => {
    if (errorSignal) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedErrorSignal(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [errorSignal]);

  useEffect(() => {
    if (botState !== "error") {
      return;
    }

    const currentErrorSignal = errorSignal;
    const timeoutId = window.setTimeout(() => {
      setManualBotState(null);
      if (currentErrorSignal) {
        setDismissedErrorSignal(currentErrorSignal);
      }
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [botState, errorSignal]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const latestAssistant = findLatestMessage(messages, "assistant");
  const latestUser = findLatestMessage(messages, "user");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }

    sendText(text);
    setDraft("");
  };

  const handleConnectClick = async () => {
    if (isConnected) {
      disconnect();
      return;
    }

    await connect();
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40">
      {expanded ? (
        <section className="pointer-events-auto flex max-h-[calc(100vh-2.5rem)] w-[min(26rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[26px] border border-cyan-900/50 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_42%),linear-gradient(180deg,_rgba(7,13,24,0.98),_rgba(4,9,18,0.98))] shadow-[0_28px_80px_rgba(2,8,23,0.7)] backdrop-blur-xl">
          <div className="shrink-0 border-b border-slate-800/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <GennyBotMascot state={botState} size="header" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Genny Assistant
                  </p>
                  <p className="text-xs text-slate-400">
                    Live queue help with AI-generated voice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-full border border-slate-700/80 bg-slate-950/50 p-2 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
                aria-label="Minimize assistant"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge connected={isConnected} status={status} />
              {activeToolName && (
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {activeToolName}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant={isConnected ? "outline" : "default"}
                onClick={() => void handleConnectClick()}
                className={cn(
                  "rounded-full px-4",
                  isConnected
                    ? "border-red-500/35 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:bg-red-500/15"
                    : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                )}
              >
                {status === "connecting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isConnected ? (
                  <PhoneOff className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                {status === "connecting"
                  ? "Connecting"
                  : isConnected
                    ? "Disconnect"
                    : "Start session"}
              </Button>

              <Button
                variant="outline"
                onClick={toggleMute}
                disabled={!isConnected}
                className="rounded-full border-slate-700/80 bg-slate-950/35 text-slate-200 hover:border-cyan-500/40 hover:bg-slate-900"
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4 text-amber-300" />
                ) : (
                  <Mic className="h-4 w-4 text-cyan-300" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>

              <Button
                variant="outline"
                onClick={clearConversation}
                disabled={messages.length === 0}
                className="rounded-full border-slate-700/80 bg-slate-950/35 text-slate-200 hover:border-slate-500 hover:bg-slate-900"
              >
                <Trash2 className="h-4 w-4" />
                Clear log
              </Button>
            </div>

            <div className="mt-3">
              <label
                htmlFor="assistant-preset-select"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
              >
                Voice preset
              </label>
              <select
                id="assistant-preset-select"
                value={presetId}
                onChange={(event) => selectPreset(event.target.value)}
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-500/40"
              >
                <option value="">Default (work assistant)</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                    {preset.voice ? ` · ${preset.voice}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {isConnected
                  ? "Applies on your next session. Voice, persona, and approximated effects are inherited; pitch/tempo aren't applied to the live voice."
                  : "Inherits the preset's voice, persona, and approximated effects (EQ, compression, reverb, volume). Pitch/tempo can't be applied to the live voice."}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <EmailConfirmation
              pendingEmail={pendingEmail}
              status={emailStatus}
              onConfirm={() => void confirmSendEmail()}
              onCancel={cancelSendEmail}
              onAddAttachment={addEmailAttachment}
              onRemoveAttachment={removeEmailAttachment}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <TranscriptCard
                label="Assistant"
                icon={Waves}
                toneClass="border-cyan-500/20 bg-cyan-500/10 text-cyan-50"
                emptyText="No assistant response yet."
                text={latestAssistant?.text ?? ""}
              />
              <TranscriptCard
                label="You"
                icon={MessageSquareText}
                toneClass="border-violet-500/20 bg-violet-500/10 text-violet-50"
                emptyText="No recent user transcript yet."
                text={latestUser?.text ?? ""}
              />
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45">
              <div className="border-b border-slate-800/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Transcript Log
              </div>
              <div
                ref={logRef}
                className="max-h-44 space-y-2 overflow-y-auto px-3 py-3"
              >
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-sm leading-6",
                        message.role === "assistant"
                          ? "border-cyan-500/20 bg-cyan-500/8 text-slate-100"
                          : "border-violet-500/20 bg-violet-500/8 text-slate-100"
                      )}
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {message.role === "assistant" ? "Assistant" : "You"}
                      </p>
                      <p>{message.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Start a session to talk through the current queue.
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3"
            >
              <label
                htmlFor="assistant-text-input"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
              >
                Text Fallback
              </label>
              <div className="flex items-end gap-2">
                <textarea
                  id="assistant-text-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    isConnected
                      ? "Ask about queue priority, blockers, research, or a refresh."
                      : "Connect the assistant to send a message."
                  }
                  disabled={!isConnected}
                  rows={3}
                  className="min-h-[88px] flex-1 resize-none rounded-2xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500/40"
                />
                <Button
                  type="submit"
                  disabled={!isConnected || !draft.trim()}
                  className="rounded-2xl bg-violet-400 px-4 text-slate-950 hover:bg-violet-300"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Voice is AI-generated. The assistant uses current dashboard context and read-only tools in this first pass.
              </p>
            </form>

            {error && (
              <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
          </div>
        </section>
      ) : (
        <button
          id="gennyFloatingIcon"
          type="button"
          onClick={() => setExpanded(true)}
          className="genny-bot-trigger pointer-events-auto flex items-center gap-3 rounded-[2rem] border border-cyan-400/25 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_34%),linear-gradient(135deg,rgba(8,16,30,0.97),rgba(15,23,42,0.95))] px-3 py-3 pr-5 text-left shadow-[0_18px_45px_rgba(2,8,23,0.55)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-[0_26px_70px_rgba(8,145,178,0.32)] focus-visible:outline-none"
          title="Open Genny (Virtual Assistant)"
          aria-label="Open Genny virtual assistant"
        >
          <GennyBotMascot state={botState} interactive />
          <span>
            <span className="block text-sm font-semibold text-slate-100">
              Genny
            </span>
            <span className="block text-xs text-slate-400">
              Realtime queue help
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function resolveGennyBotState({
  activeToolName,
  connected,
  showError,
  status,
}: {
  activeToolName: string | null;
  connected: boolean;
  showError: boolean;
  status: "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
}): GennyBotState {
  if (showError) {
    return "error";
  }

  if (activeToolName || status === "connecting" || status === "thinking") {
    return "thinking";
  }

  if (status === "speaking") {
    return "responding";
  }

  if (connected || status === "listening") {
    return "listening";
  }

  return "idle";
}

function isGennyBotState(value: unknown): value is GennyBotState {
  return (
    typeof value === "string" &&
    (GENNY_BOT_STATES as readonly string[]).includes(value)
  );
}

function EmailConfirmation({
  pendingEmail,
  status,
  onConfirm,
  onCancel,
  onAddAttachment,
  onRemoveAttachment,
}: {
  pendingEmail: PendingEmail | null;
  status: EmailSendStatus;
  onConfirm: () => void;
  onCancel: () => void;
  onAddAttachment: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
}) {
  if (!pendingEmail) {
    if (status.state === "sent") {
      return (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Email sent{status.messageId ? ` · id ${status.messageId.slice(0, 12)}…` : ""}.
        </div>
      );
    }
    if (status.state === "cancelled") {
      return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
          Email cancelled — nothing was sent.
        </div>
      );
    }
    if (status.state === "error") {
      return (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {status.message}
        </div>
      );
    }
    return null;
  }

  const sending = status.state === "sending";

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
        <Mail className="h-4 w-4" />
        Confirm send
      </div>

      <dl className="space-y-1 text-sm text-slate-100">
        <Field label="To" value={pendingEmail.to.join(", ")} />
        {pendingEmail.cc.length > 0 && <Field label="Cc" value={pendingEmail.cc.join(", ")} />}
        <Field label="Subject" value={pendingEmail.subject} />
      </dl>

      <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-sm leading-6 text-slate-200">
        {pendingEmail.body}
      </p>

      {pendingEmail.attachments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pendingEmail.attachments.map((attachment, index) => (
            <li
              key={`${attachment.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/50 px-2 py-1 text-xs text-slate-300"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{attachment.name}</span>
                <span className="shrink-0 text-slate-500">
                  ({Math.ceil(attachment.size / 1024)} KB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(index)}
                disabled={sending}
                className="shrink-0 rounded-full p-1 text-slate-400 hover:text-red-300 disabled:opacity-50"
                aria-label={`Remove ${attachment.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={onConfirm}
          disabled={sending}
          className="rounded-full bg-emerald-500 px-4 text-slate-950 hover:bg-emerald-400"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {sending ? "Sending" : "Send"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={sending}
          className="rounded-full border-slate-700/80 bg-slate-950/35 text-slate-200 hover:border-red-400/50 hover:bg-red-500/10"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-950/35 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500/40">
          <Paperclip className="h-4 w-4" />
          Attach
          <input
            type="file"
            className="hidden"
            disabled={sending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onAddAttachment(file);
              }
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {status.state === "error" && (
        <p className="mt-2 text-xs text-red-200">{status.message}</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Review carefully — this sends a real email from your mailbox via Microsoft Graph.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-slate-100">{value}</dd>
    </div>
  );
}

function TranscriptCard({
  label,
  icon: Icon,
  text,
  emptyText,
  toneClass,
}: {
  label: string;
  icon: typeof Waves;
  text: string;
  emptyText: string;
  toneClass: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-3", toneClass)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={cn("min-h-[72px] text-sm leading-6", !text && "text-slate-400")}>
        {text || emptyText}
      </p>
    </div>
  );
}

function StatusBadge({
  connected,
  status,
}: {
  connected: boolean;
  status: "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
}) {
  const label =
    status === "connecting"
      ? "Connecting"
      : status === "listening"
        ? "Listening"
        : status === "thinking"
          ? "Thinking"
          : status === "speaking"
            ? "Speaking"
            : status === "error"
              ? "Error"
              : connected
                ? "Connected"
                : "Disconnected";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium",
        status === "error"
          ? "border-red-500/25 bg-red-500/10 text-red-200"
          : connected
            ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
            : "border-slate-700/80 bg-slate-900/60 text-slate-300"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "error"
            ? "bg-red-300"
            : connected
              ? "bg-cyan-300"
              : "bg-slate-500"
        )}
      />
      {label}
    </span>
  );
}

function findLatestMessage(
  messages: Array<{ role: "assistant" | "user"; text: string }>,
  role: "assistant" | "user"
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === role) {
      return messages[index];
    }
  }

  return null;
}
