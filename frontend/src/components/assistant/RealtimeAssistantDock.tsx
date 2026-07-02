"use client";

import {
  type FormEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
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
  SlidersHorizontal,
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
import type {
  MicCleanupDebug,
  MicCleanupSettings,
} from "@/lib/micCleanup";
import type { DashboardCardItem, DashboardResponse } from "@/lib/types";
import { readLocal, writeLocal } from "@/lib/storage";
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

const FLOATING_WIDGET_STORAGE_KEY = "genny-floating-widget-position";
const FLOATING_WIDGET_MARGIN = 18;
const FLOATING_WIDGET_FALLBACK_SIZE = {
  width: 180,
  height: 214,
};

interface FloatingPosition {
  x: number;
  y: number;
}

interface FloatingDragState {
  pointerId: number;
  origin: FloatingPosition;
  startX: number;
  startY: number;
  moved: boolean;
}

interface ViewportSize {
  width: number;
  height: number;
}

export function RealtimeAssistantDock({
  items,
  summary,
  tone,
  isRefreshing = false,
  refresh,
}: RealtimeAssistantDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMicPanel, setShowMicPanel] = useState(false);
  const [draft, setDraft] = useState("");
  const [manualBotState, setManualBotState] = useState<GennyBotState | null>(null);
  const [dismissedErrorSignal, setDismissedErrorSignal] = useState<string | null>(null);
  const [floatingPosition, setFloatingPosition] =
    useState<FloatingPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const floatingPositionRef = useRef<FloatingPosition | null>(null);
  const dragStateRef = useRef<FloatingDragState | null>(null);
  const ignoreNextToggleRef = useRef(false);
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
    micSettings,
    micDebug,
    updateMicSettings,
    testMic,
    isMicTesting,
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
    floatingPositionRef.current = floatingPosition;
  }, [floatingPosition]);

  const syncFloatingWidget = useEffectEvent(
    (preferredPosition: FloatingPosition | null = null) => {
      const nextViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      setFloatingPosition((currentPosition) => {
        const basePosition =
          preferredPosition ??
          currentPosition ??
          readLocal<FloatingPosition>(FLOATING_WIDGET_STORAGE_KEY) ??
          getDefaultFloatingPosition(nextViewport);

        return clampFloatingPosition(
          basePosition,
          widgetRef.current,
          nextViewport
        );
      });
    }
  );

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
    const frameId = window.requestAnimationFrame(() => {
      syncFloatingWidget();
    });

    const handleResize = () => {
      syncFloatingWidget();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
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

  const finishFloatingDrag = (
    pointerId: number,
    target: HTMLButtonElement
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== pointerId) {
      return;
    }

    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (!dragState.moved) {
      return;
    }

    ignoreNextToggleRef.current = true;
    if (floatingPositionRef.current) {
      writeLocal(FLOATING_WIDGET_STORAGE_KEY, floatingPositionRef.current);
    }
  };

  const handleFloatingBotPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (event.button !== 0) {
      return;
    }

    const currentPosition = floatingPositionRef.current ?? floatingPosition;
    if (!currentPosition) {
      return;
    }

    ignoreNextToggleRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      origin: currentPosition,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFloatingBotPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.moved && Math.hypot(deltaX, deltaY) < 6) {
      return;
    }

    dragState.moved = true;
    setIsDragging(true);
    setFloatingPosition(
      clampFloatingPosition(
        {
          x: dragState.origin.x + deltaX,
          y: dragState.origin.y + deltaY,
        },
        widgetRef.current,
        {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      )
    );
  };

  const handleFloatingBotClick = () => {
    if (ignoreNextToggleRef.current) {
      ignoreNextToggleRef.current = false;
      return;
    }

    setExpanded(true);
  };

  if (!floatingPosition) {
    return null;
  }

  return (
    <div
      ref={widgetRef}
      className="pointer-events-none fixed z-40"
      style={{
        left: floatingPosition.x,
        top: floatingPosition.y,
      }}
    >
      {expanded ? (
        <section
          id="realtime-assistant-panel"
          className="pointer-events-auto flex max-h-[calc(100vh-2.5rem)] w-[min(26rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[26px] border border-cyan-900/50 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_42%),linear-gradient(180deg,_rgba(7,13,24,0.98),_rgba(4,9,18,0.98))] shadow-[0_28px_80px_rgba(2,8,23,0.7)] backdrop-blur-xl"
        >
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

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowMicPanel((value) => !value)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-slate-200"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Mic cleanup
                </span>
                <span className="flex items-center gap-2 normal-case tracking-normal text-slate-500">
                  {micDebug?.speaking ? (
                    <span className="text-emerald-300">speaking</span>
                  ) : micDebug?.gateOpen ? (
                    <span className="text-cyan-300">open</span>
                  ) : null}
                  {showMicPanel ? "−" : "+"}
                </span>
              </button>
              {showMicPanel && (
                <MicCleanupPanel
                  settings={micSettings}
                  debug={micDebug}
                  isTesting={isMicTesting}
                  onChange={updateMicSettings}
                  onTest={() => void testMic()}
                />
              )}
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
        <div className="flex flex-col items-center gap-3">
          <div className="pointer-events-auto flex items-center botButton-Z gap-2 rounded-full border border-cyan-400/20 bg-slate-950/65 px-2 py-2 shadow-[0_18px_45px_rgba(2,8,23,0.42)] backdrop-blur-md">
            <Button
              variant={isConnected ? "outline" : "default"}
              onClick={() => void handleConnectClick()}
              className={cn(
                "h-8 rounded-full px-3 text-[11px] font-semibold",
                isConnected
                  ? "border-red-500/35 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:bg-red-500/15"
                  : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              )}
            >
              {status === "connecting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isConnected ? (
                <PhoneOff className="h-3.5 w-3.5" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
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
              className="h-8 rounded-full border-slate-700/80 bg-slate-950/35 px-3 text-[11px] font-semibold text-slate-100 hover:border-cyan-500/40 hover:bg-slate-900 disabled:opacity-55"
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Mic className="h-3.5 w-3.5 text-cyan-300" />
              )}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </div>

          <button
            id="gennyFloatingIcon"
            type="button"
            onClick={handleFloatingBotClick}
            onPointerDown={handleFloatingBotPointerDown}
            onPointerMove={handleFloatingBotPointerMove}
            onPointerUp={(event) =>
              finishFloatingDrag(event.pointerId, event.currentTarget)
            }
            onPointerCancel={(event) =>
              finishFloatingDrag(event.pointerId, event.currentTarget)
            }
            onLostPointerCapture={(event) =>
              finishFloatingDrag(event.pointerId, event.currentTarget)
            }
            className={cn(
              "genny-bot-trigger pointer-events-auto relative flex h-[10.75rem] w-[9.5rem] touch-none select-none items-center justify-center rounded-[2.5rem] focus-visible:outline-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            title="Open Genny (Virtual Assistant)"
            aria-label="Open Genny virtual assistant"
            aria-expanded={expanded}
            aria-controls="realtime-assistant-panel"
          >
            <span className="pointer-events-none absolute inset-x-4 bottom-4 h-8 rounded-full bg-cyan-400/25 blur-2xl" />
            <span className="pointer-events-none absolute inset-3 rounded-[2.4rem] bg-[radial-gradient(circle_at_50%_32%,rgba(14,165,233,0.18),transparent_62%)]" />
            <GennyBotMascot
              state={botState}
              size="floating"
              interactive
              className="relative z-10"
            />
          </button>
        </div>
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

function getDefaultFloatingPosition(viewport: ViewportSize): FloatingPosition {
  return clampFloatingPosition(
    {
      x: viewport.width - FLOATING_WIDGET_FALLBACK_SIZE.width - FLOATING_WIDGET_MARGIN,
      y: viewport.height - FLOATING_WIDGET_FALLBACK_SIZE.height - FLOATING_WIDGET_MARGIN,
    },
    null,
    viewport
  );
}

function clampFloatingPosition(
  position: FloatingPosition,
  widget: HTMLDivElement | null,
  viewport: ViewportSize
): FloatingPosition {
  const size = measureFloatingWidget(widget);
  const maxX = Math.max(
    FLOATING_WIDGET_MARGIN,
    viewport.width - size.width - FLOATING_WIDGET_MARGIN
  );
  const maxY = Math.max(
    FLOATING_WIDGET_MARGIN,
    viewport.height - size.height - FLOATING_WIDGET_MARGIN
  );

  return {
    x: clamp(position.x, FLOATING_WIDGET_MARGIN, maxX),
    y: clamp(position.y, FLOATING_WIDGET_MARGIN, maxY),
  };
}

function measureFloatingWidget(widget: HTMLDivElement | null) {
  if (!widget) {
    return FLOATING_WIDGET_FALLBACK_SIZE;
  }

  const rect = widget.getBoundingClientRect();
  return {
    width: rect.width || FLOATING_WIDGET_FALLBACK_SIZE.width,
    height: rect.height || FLOATING_WIDGET_FALLBACK_SIZE.height,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
        Review carefully - this sends a real email from your mailbox via Microsoft Graph. You can also say "yes send it now" while this draft is staged.
      </p>
    </div>
  );
}

// Display scale for the volume meter. Speech RMS typically peaks well under
// this, so it keeps the bar readable without clipping at the top.
const MIC_VOLUME_SCALE = 0.3;

function MicCleanupPanel({
  settings,
  debug,
  isTesting,
  onChange,
  onTest,
}: {
  settings: MicCleanupSettings;
  debug: MicCleanupDebug | null;
  isTesting: boolean;
  onChange: (partial: Partial<MicCleanupSettings>) => void;
  onTest: () => void;
}) {
  const volume = debug?.volume ?? 0;
  const volumePct = Math.min(100, (volume / MIC_VOLUME_SCALE) * 100);
  const thresholdPct = Math.min(
    100,
    (settings.noiseGateThreshold / MIC_VOLUME_SCALE) * 100
  );
  const speaking = debug?.speaking ?? false;
  const gateOpen = debug?.gateOpen ?? false;

  return (
    <div className="mt-2 space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
      {/* Live volume meter with a marker showing the noise-gate threshold. */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>Input level</span>
          <span className="tabular-nums">{volume.toFixed(3)}</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-800/80">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-75",
              gateOpen ? "bg-emerald-400" : "bg-slate-500"
            )}
            style={{ width: `${volumePct}%` }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-amber-300"
            style={{ left: `${thresholdPct}%` }}
          />
        </div>
      </div>

      {/* Live state readout (also serves as dev debug). */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <DebugRow label="Gate" value={gateOpen ? "open" : "closed"} accent={gateOpen} />
        <DebugRow label="Speaking" value={speaking ? "yes" : "no"} accent={speaking} />
        <DebugRow label="Threshold" value={settings.noiseGateThreshold.toFixed(3)} />
        <DebugRow label="Ignored noise" value={String(debug?.ignoredNoiseCount ?? 0)} />
      </div>

      {/* Live-tunable gate / timing settings. */}
      <RangeRow
        label="Noise gate threshold"
        value={settings.noiseGateThreshold}
        min={0.001}
        max={0.1}
        step={0.001}
        format={(v) => v.toFixed(3)}
        onChange={(v) => onChange({ noiseGateThreshold: v })}
      />
      <RangeRow
        label="Silence stop delay"
        value={settings.endSilenceMs}
        min={300}
        max={3000}
        step={50}
        format={(v) => `${v} ms`}
        onChange={(v) => onChange({ endSilenceMs: v })}
      />
      <RangeRow
        label="Max utterance length"
        value={settings.maxUtteranceMs}
        min={5000}
        max={60000}
        step={1000}
        format={(v) => `${Math.round(v / 1000)} s`}
        onChange={(v) => onChange({ maxUtteranceMs: v })}
      />

      {/* Native browser cleanup toggles (apply on the next session). */}
      <div className="space-y-1.5 border-t border-slate-800/70 pt-2">
        <ToggleRow
          label="Noise suppression"
          checked={settings.noiseSuppression}
          onChange={(v) => onChange({ noiseSuppression: v })}
        />
        <ToggleRow
          label="Auto gain control"
          checked={settings.autoGainControl}
          onChange={(v) => onChange({ autoGainControl: v })}
        />
        <ToggleRow
          label="Echo cancellation"
          checked={settings.echoCancellation}
          onChange={(v) => onChange({ echoCancellation: v })}
        />
        <p className="text-[10px] text-slate-500">
          Browser cleanup toggles apply when you start your next session.
        </p>
      </div>

      <Button
        variant="outline"
        onClick={onTest}
        className={cn(
          "w-full rounded-full border-slate-700/80 bg-slate-950/35 text-slate-200 hover:border-cyan-500/40 hover:bg-slate-900",
          isTesting && "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
        )}
      >
        <Mic className="h-4 w-4" />
        {isTesting ? "Stop mic test" : "Test microphone"}
      </Button>
    </div>
  );
}

function DebugRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className={cn("tabular-nums", accent ? "text-emerald-300" : "text-slate-200")}>
        {value}
      </span>
    </div>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-200">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-[11px] text-slate-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-cyan-400"
      />
    </label>
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
