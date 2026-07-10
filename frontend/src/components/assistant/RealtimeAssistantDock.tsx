"use client";

import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
  memo,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  Mail,
  Maximize2,
  Menu,
  MessageSquareText,
  Mic,
  MicOff,
  Minus,
  Paperclip,
  Phone,
  PhoneOff,
  Send,
  Shrink,
  SlidersHorizontal,
  Square,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import {
  AssistantChatPanel,
} from "@/components/assistant/AssistantChatPanel";
import {
  GennyBotMascot,
  type GennyBotState,
} from "@/components/assistant/GennyBotMascot";
import {
  CopyResponseButton,
  ResponseBlocks,
  RichText,
} from "@/components/assistant/ResponseBlocks";
import {
  useAssistantChatConversation,
} from "@/hooks/useAssistantChatConversation";
import {
  useRealtimeAssistant,
  type EmailSendStatus,
  type PendingEmail,
  type RealtimeMessage,
} from "@/hooks/useRealtimeAssistant";
import type {
  AssistantChatEntry,
  AssistantResponseLength,
  AssistantSource,
  ConversationArtifact,
} from "@/lib/assistantChat";
import type {
  MicCleanupDebug,
  MicCleanupSettings,
} from "@/lib/micCleanup";
import { readLocal, writeLocal } from "@/lib/storage";
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

const FLOATING_WIDGET_STORAGE_KEY = "genny-floating-widget-position";
const CITATIONS_STORAGE_KEY = "genny-assistant-show-citations";
const RESPONSE_LENGTH_STORAGE_KEY = "genny-assistant-response-length";
const SUGGESTED_ACTIONS_EXPANDED_STORAGE_KEY =
  "genny-assistant-suggested-actions-expanded";
const TEXT_DRAFT_STORAGE_KEY = "genny-assistant-text-draft";
const FLOATING_WIDGET_MARGIN = 18;
const FLOATING_BOT_FALLBACK_SIZE = {
  width: 180,
  height: 214,
};
const FLOATING_PANEL_FALLBACK_SIZE = {
  width: 1088,
  height: 768,
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
  suppressToggleAfterDrag: boolean;
}

interface ViewportSize {
  width: number;
  height: number;
}

type VoiceTimelineEntry =
  | {
      kind: "message";
      id: string;
      createdAt: string;
      message: RealtimeMessage;
    }
  | {
      kind: "artifact";
      id: string;
      createdAt: string;
      artifact: ConversationArtifact;
    };

export function RealtimeAssistantDock({
  items,
  summary,
  tone,
  isRefreshing = false,
  refresh,
}: RealtimeAssistantDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [assistantMode, setAssistantMode] = useState<"voice" | "text">("voice");
  const [showMicPanel, setShowMicPanel] = useState(false);
  const [draft, setDraft] = useState<string>(
    () => readLocal<string>(TEXT_DRAFT_STORAGE_KEY) ?? ""
  );
  const [manualBotState, setManualBotState] = useState<GennyBotState | null>(
    null
  );
  const [dismissedErrorSignal, setDismissedErrorSignal] = useState<
    string | null
  >(null);
  const [floatingPosition, setFloatingPosition] =
    useState<FloatingPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCitations, setShowCitations] = useState<boolean>(
    () => readLocal<boolean>(CITATIONS_STORAGE_KEY) ?? true
  );
  const [responseLength, setResponseLength] =
    useState<AssistantResponseLength>(() => {
      const stored = readLocal<AssistantResponseLength>(
        RESPONSE_LENGTH_STORAGE_KEY
      );
      return stored === "concise" ? "concise" : "detailed";
    });
  const [suggestedActionsExpanded, setSuggestedActionsExpanded] =
    useState<boolean>(
      () =>
        readLocal<boolean>(SUGGESTED_ACTIONS_EXPANDED_STORAGE_KEY) ?? false
    );
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  // Stick-to-bottom only when the user is already reading the latest turn —
  // scrolling up must never be fought by autoscroll.
  const isNearBottomRef = useRef(true);
  const floatingPositionRef = useRef<FloatingPosition | null>(null);
  const dragStateRef = useRef<FloatingDragState | null>(null);
  const ignoreNextToggleRef = useRef(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    status,
    isConnected,
    isMuted,
    messages,
    conversationArtifacts,
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
    stopResponse,
  } = useRealtimeAssistant({
    items,
    summary,
    tone,
    refreshing: isRefreshing,
    responseLength,
    refresh,
  });

  const textConversation = useAssistantChatConversation({ responseLength });
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
  const latestVoiceArtifact = findLatestArtifact(conversationArtifacts);
  const latestTextAssistantEntry = findLatestAssistantEntry(
    textConversation.entries
  );
  const referencedSources =
    assistantMode === "voice"
      ? latestVoiceArtifact?.sources ?? []
      : latestTextAssistantEntry?.sources ?? [];
  // Memoized: the mic meter re-renders this component ~60fps during a live
  // session. Without stable identities the timeline/chips would rebuild every
  // frame, churning the conversation subtree and retriggering autoscroll.
  const voiceTimeline = useMemo(
    () => buildVoiceTimeline(messages, conversationArtifacts),
    [messages, conversationArtifacts]
  );
  const activeLogEmpty =
    assistantMode === "voice"
      ? voiceTimeline.length === 0
      : textConversation.entries.length === 0;
  const suggestedActions = useMemo(
    () => buildSuggestedActions(items, referencedSources),
    [items, referencedSources]
  );

  useEffect(() => {
    floatingPositionRef.current = floatingPosition;
  }, [floatingPosition]);

  useEffect(() => {
    writeLocal(TEXT_DRAFT_STORAGE_KEY, draft);
  }, [draft]);

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
          nextViewport,
          expanded
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
  }, [syncFloatingWidget]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      syncFloatingWidget();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expanded, syncFloatingWidget]);

  // Restoring from full screen: re-clamp the windowed panel back inside the
  // viewport once it returns to its floating size.
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      syncFloatingWidget();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [maximized, syncFloatingWidget]);

  // Close the overflow menu on Escape or an outside click.
  useEffect(() => {
    if (!showOverflowMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!overflowMenuRef.current?.contains(event.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowOverflowMenu(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOverflowMenu]);

  useEffect(() => {
    if (!errorSignal) {
      setDismissedErrorSignal(null);
    }
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

  // Autoscroll: keyed on a stable content signal (not array identities), and
  // only when the user is already near the bottom.
  const conversationScrollSignal =
    assistantMode === "voice"
      ? buildTimelineSignal(voiceTimeline)
      : `${textConversation.entries.length}:${
          textConversation.entries[textConversation.entries.length - 1]?.id ?? ""
        }:${textConversation.sending}`;

  useEffect(() => {
    const container = conversationRef.current;
    if (container && isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [conversationScrollSignal, assistantMode]);

  const handleConversationScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  function startFloatingDrag(
    event: ReactPointerEvent<HTMLElement>,
    suppressToggleAfterDrag: boolean
  ) {
    if (event.button !== 0) {
      return;
    }

    const currentPosition = floatingPositionRef.current ?? floatingPosition;
    if (!currentPosition) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      origin: currentPosition,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      suppressToggleAfterDrag,
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  const finishFloatingDrag = (
    pointerId: number,
    target: HTMLElement
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

    if (dragState.suppressToggleAfterDrag) {
      ignoreNextToggleRef.current = true;
    }

    if (floatingPositionRef.current) {
      writeLocal(FLOATING_WIDGET_STORAGE_KEY, floatingPositionRef.current);
    }
  };

  const moveFloatingDrag = (event: ReactPointerEvent<HTMLElement>) => {
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
        },
        expanded
      )
    );
  };

  const handleFloatingBotPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    ignoreNextToggleRef.current = false;
    startFloatingDrag(event, true);
  };

  const handlePanelHeaderPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    // A maximized panel fills the viewport, so there is nothing to drag.
    if (maximized) {
      return;
    }

    if (isInteractiveDragTarget(event.target)) {
      return;
    }

    startFloatingDrag(event, false);
  };

  const handleFloatingBotClick = () => {
    if (ignoreNextToggleRef.current) {
      ignoreNextToggleRef.current = false;
      return;
    }

    setExpanded(true);
  };

  const handleConnectClick = async () => {
    if (isConnected) {
      disconnect();
      return;
    }

    await connect();
  };

  const handleClearActiveConversation = () => {
    if (assistantMode === "voice") {
      clearConversation();
      return;
    }

    textConversation.clearConversation();
  };

  const submitPrompt = async (text: string) => {
    const normalized = text.trim();
    if (!normalized) {
      return false;
    }

    if (assistantMode === "voice" && isConnected) {
      sendText(normalized);
      return true;
    }

    if (assistantMode === "voice") {
      setAssistantMode("text");
    }

    return textConversation.sendMessage(normalized);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = draft.trim();
    if (!normalized) {
      return;
    }

    setDraft("");
    void submitPrompt(normalized);
  };

  const handleSuggestedAction = (action: string) => {
    void submitPrompt(action);
  };

  const handleResponseLengthChange = (nextValue: AssistantResponseLength) => {
    setResponseLength(nextValue);
    writeLocal(RESPONSE_LENGTH_STORAGE_KEY, nextValue);
  };

  const handleCitationsChange = (nextValue: boolean) => {
    setShowCitations(nextValue);
    writeLocal(CITATIONS_STORAGE_KEY, nextValue);
  };

  const handleSuggestedActionsExpandedChange = (nextValue: boolean) => {
    setSuggestedActionsExpanded(nextValue);
    writeLocal(SUGGESTED_ACTIONS_EXPANDED_STORAGE_KEY, nextValue);
  };

  const handleAttachmentClick = () => {
    if (!pendingEmail) {
      return;
    }

    attachmentInputRef.current?.click();
  };

  const renderedConversation = useMemo(() => {
    if (assistantMode === "text") {
      return (
        <AssistantChatPanel
          entries={textConversation.entries}
          sending={textConversation.sending}
          capabilities={textConversation.capabilities}
          modelStatus={textConversation.modelStatus}
          actionStatuses={textConversation.actionStatuses}
          actionErrors={textConversation.actionErrors}
          onConfirm={(action) => {
            void textConversation.confirmAction(action);
          }}
          onCancel={(action) => {
            void textConversation.cancelAction(action);
          }}
          showSources={showCitations}
          embedded
        />
      );
    }

    return (
      <VoiceConversationLog
        entries={voiceTimeline}
        showCitations={showCitations}
      />
    );
  }, [
    assistantMode,
    showCitations,
    textConversation.actionErrors,
    textConversation.actionStatuses,
    textConversation.cancelAction,
    textConversation.capabilities,
    textConversation.confirmAction,
    textConversation.entries,
    textConversation.modelStatus,
    textConversation.sending,
    voiceTimeline,
  ]);

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
          className={cn(
            "pointer-events-auto flex flex-col overflow-hidden rounded-[30px] border border-cyan-900/50 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_42%),linear-gradient(180deg,_rgba(7,13,24,0.98),_rgba(4,9,18,0.98))] shadow-[0_28px_80px_rgba(2,8,23,0.7)] backdrop-blur-xl",
            maximized
              ? "fixed inset-3 z-40 h-auto w-auto"
              : "h-[min(48rem,calc(100vh-1.5rem))] max-h-[calc(100vh-1.5rem)] w-[min(68rem,calc(100vw-1.5rem))]"
          )}
        >
          <header className="relative shrink-0 border-b border-slate-800/80 px-4 py-3">
            <div
              onPointerDown={handlePanelHeaderPointerDown}
              onPointerMove={moveFloatingDrag}
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
                "flex flex-wrap items-center gap-2 select-none",
                maximized
                  ? "cursor-default"
                  : isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
              )}
            >
              {/* Identity */}
              <div className="mr-1 flex items-center gap-2.5">
                <GennyBotMascot state={botState} size="header" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight text-slate-100">
                    Genny Assistant
                  </p>
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Voice and text help for queue context, docs, and diagrams
                  </p>
                </div>
              </div>

              {/* Mode tabs */}
              <div className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-slate-800/80 bg-slate-950/50 p-1">
                {(["voice", "text"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAssistantMode(mode)}
                    className={cn(
                      "h-full rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                      assistantMode === mode
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <StatusBadge connected={isConnected} status={status} />

              <select
                id="assistant-preset-select"
                aria-label="Persona preset"
                value={presetId}
                onChange={(event) => selectPreset(event.target.value)}
                className="h-10 w-[10rem] shrink-0 rounded-full border border-slate-700/80 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-500/40"
              >
                <option value="">Built-in work assistant</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                    {preset.voice ? ` | ${preset.voice}` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleConnectClick()}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  isConnected
                    ? "border border-red-500/35 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:bg-red-500/15"
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
              </button>

              {status === "speaking" && (
                <button
                  type="button"
                  onClick={stopResponse}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-500/20"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              )}

              <button
                type="button"
                onClick={toggleMute}
                disabled={!isConnected}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:bg-slate-900 disabled:opacity-55"
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4 text-amber-300" />
                ) : (
                  <Mic className="h-4 w-4 text-cyan-300" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </button>

              <button
                type="button"
                onClick={handleClearActiveConversation}
                disabled={activeLogEmpty}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900 disabled:opacity-55"
              >
                <Trash2 className="h-4 w-4" />
                Clear log
              </button>

              <label className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/45 px-3 text-sm text-slate-200">
                <span>Cite</span>
                <input
                  type="checkbox"
                  checked={showCitations}
                  onChange={(event) =>
                    handleCitationsChange(event.target.checked)
                  }
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>

              {activeToolName && (
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {activeToolName}
                </span>
              )}

              {/* Right cluster: overflow · full screen · minimize */}
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <div className="relative" ref={overflowMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowOverflowMenu((value) => !value)}
                    aria-expanded={showOverflowMenu}
                    aria-haspopup="menu"
                    aria-label="More controls"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                      showOverflowMenu
                        ? "border-transparent bg-cyan-500 text-slate-950"
                        : "border-slate-700/80 bg-slate-950/50 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200"
                    )}
                  >
                    <Menu className="h-4 w-4" />
                  </button>

                  {showOverflowMenu && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-30 mt-2 w-[15rem] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-3 shadow-[0_18px_50px_rgba(2,8,23,0.7)] backdrop-blur-xl"
                    >
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Response length
                      </p>
                      <div className="flex items-center gap-1 rounded-full border border-slate-800/80 bg-slate-950/50 p-1">
                        {(["concise", "detailed"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleResponseLengthChange(option)}
                            className={cn(
                              "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                              responseLength === option
                                ? "bg-cyan-500 text-slate-950"
                                : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMicPanel((value) => !value);
                          setShowOverflowMenu(false);
                        }}
                        className="mt-3 flex w-full items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/40 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:bg-slate-900"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Mic cleanup
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMaximized((value) => !value)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/50 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
                  aria-label={
                    maximized ? "Restore window" : "Expand to full screen"
                  }
                  aria-pressed={maximized}
                >
                  {maximized ? (
                    <Shrink className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/50 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
                  aria-label="Minimize assistant"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mic cleanup drops over the conversation as an overlay so
                opening it never resizes the layout or breaks the modal's
                scroll. */}
            {showMicPanel && (
              <div className="absolute right-4 top-full z-30 mt-2 max-h-[min(55vh,28rem)] w-[min(24rem,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_18px_50px_rgba(2,8,23,0.7)] backdrop-blur-xl">
                <MicCleanupPanel
                  settings={micSettings}
                  debug={micDebug}
                  isTesting={isMicTesting}
                  onChange={updateMicSettings}
                  onTest={() => void testMic()}
                  onClose={() => setShowMicPanel(false)}
                />
              </div>
            )}
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* The conversation is the modal's main focus and its single
                scroll region — headers/footers stay fixed around it. */}
            <div
              ref={conversationRef}
              onScroll={handleConversationScroll}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              <EmailConfirmation
                pendingEmail={pendingEmail}
                status={emailStatus}
                onConfirm={() => void confirmSendEmail()}
                onCancel={cancelSendEmail}
                onRemoveAttachment={removeEmailAttachment}
              />

              {error && assistantMode === "voice" && (
                <p className="rounded-[22px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}

              {renderedConversation}
            </div>

            <div className="shrink-0 border-t border-slate-800/80 px-4 py-4">
              <form onSubmit={handleSubmit}>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void addEmailAttachment(file);
                    }
                    event.target.value = "";
                  }}
                />
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={buildComposerPlaceholder(
                      assistantMode,
                      isConnected
                    )}
                    rows={3}
                    className="min-h-[92px] flex-1 resize-none rounded-[24px] border border-slate-700/80 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500/40"
                  />
                  <button
                    type="button"
                    onClick={handleAttachmentClick}
                    disabled={!pendingEmail}
                    title={
                      pendingEmail
                        ? "Attach a file to the staged email draft."
                        : "Attachments become available after the assistant stages an email draft."
                    }
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/35 text-slate-200 transition-colors hover:border-cyan-500/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      (assistantMode !== "voice" || !isConnected
                        ? textConversation.sending
                        : false)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-400 px-4 py-3 text-sm font-medium text-slate-950 transition-colors hover:bg-violet-300 disabled:opacity-60"
                  >
                    {assistantMode !== "voice" || !isConnected ? (
                      textConversation.sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {pendingEmail
                    ? "Paperclip adds attachments to the staged email draft."
                    : assistantMode === "voice" && isConnected
                      ? "Voice speaks the short answer and shows the full answer, diagrams included, in the conversation."
                      : assistantMode === "voice"
                        ? "Typing here switches into the text assistant unless a voice session is already connected."
                        : "Text mode runs through the portal assistant chat path."}
                </p>
              </form>
            </div>

            <div className="shrink-0 border-t border-slate-800/80 px-2 py-2">
              <SuggestedActionsPanel
                suggestedActions={suggestedActions}
                onSuggestedAction={handleSuggestedAction}
                expanded={suggestedActionsExpanded}
                onExpandedChange={handleSuggestedActionsExpandedChange}
              />
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-400/20 bg-slate-950/65 px-2 py-2 shadow-[0_18px_45px_rgba(2,8,23,0.42)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => void handleConnectClick()}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-semibold transition-colors",
                isConnected
                  ? "border border-red-500/35 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:bg-red-500/15"
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
            </button>

            {status === "speaking" && (
              <button
                type="button"
                onClick={stopResponse}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-500/20"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            )}

            <button
              type="button"
              onClick={toggleMute}
              disabled={!isConnected}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-3 text-[11px] font-semibold text-slate-100 transition-colors hover:border-cyan-500/40 hover:bg-slate-900 disabled:opacity-55"
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Mic className="h-3.5 w-3.5 text-cyan-300" />
              )}
              {isMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          <button
            id="gennyFloatingIcon"
            type="button"
            onClick={handleFloatingBotClick}
            onPointerDown={handleFloatingBotPointerDown}
            onPointerMove={moveFloatingDrag}
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

// Compact collapsible bar: a slim header row with a Show/Hide control, and —
// only when expanded — the prompt chips. No helper text when collapsed.
function SuggestedActionsPanel({
  suggestedActions,
  onSuggestedAction,
  expanded,
  onExpandedChange,
}: {
  suggestedActions: string[];
  onSuggestedAction: (action: string) => void;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
}) {
  return (
    <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/45 p-1">
      <div className="flex items-center justify-between gap-3 px-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Suggested actions
        </h3>
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-slate-100"
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "Collapse suggested actions"
              : "Expand suggested actions"
          }
        >
          <span>{expanded ? "Hide" : "Show"}</span>
          <span className="rounded-full bg-slate-800/90 px-1.5 py-0.5 text-[10px] text-slate-400">
            {suggestedActions.length}
          </span>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded &&
        (suggestedActions.length === 0 ? (
          <p className="px-3 pb-2 pt-1 text-sm text-slate-500">
            Suggested actions will appear after conversation or source context
            is available.
          </p>
        ) : (
          <div className="grid gap-2 px-2 pb-2 pt-2 md:grid-cols-2 xl:grid-cols-3">
            {suggestedActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onSuggestedAction(action)}
                className="rounded-xl border border-slate-700/50 bg-slate-800/70 px-3 py-2 text-left font-mono text-xs leading-6 text-cyan-300 transition-colors hover:border-cyan-500/40 hover:bg-slate-800"
              >
                {action}
              </button>
            ))}
          </div>
        ))}
    </section>
  );
}

// Memoized: entries comes from a useMemo in the dock, so mic-meter frames
// (which re-render the dock ~60fps during a session) skip this whole subtree
// — including rendered mermaid diagrams — unless the conversation changed.
const VoiceConversationLog = memo(function VoiceConversationLog({
  entries,
  showCitations,
}: {
  entries: VoiceTimelineEntry[];
  showCitations: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Start a voice session or switch to text mode to begin the conversation.
      </p>
    );
  }

  return (
    <>
      {entries.map((entry) =>
        entry.kind === "artifact" ? (
          <VoiceArtifactBubble
            key={entry.id}
            artifact={entry.artifact}
            showCitations={showCitations}
          />
        ) : (
          <VoiceMessageBubble key={entry.id} message={entry.message} />
        )
      )}
    </>
  );
});

function VoiceMessageBubble({ message }: { message: RealtimeMessage }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-3 py-2 text-sm leading-6",
        message.role === "assistant"
          ? "border-cyan-500/20 bg-cyan-500/8 text-slate-100"
          : "border-violet-500/20 bg-violet-500/8 text-slate-100"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {message.role === "assistant" ? (
            <Waves className="h-3.5 w-3.5" />
          ) : (
            <MessageSquareText className="h-3.5 w-3.5" />
          )}
          {message.role === "assistant" ? "Voice transcript" : "You"}
        </div>
        {message.role === "assistant" && (
          <CopyResponseButton text={message.text} />
        )}
      </div>
      <RichText content={message.text} />
    </div>
  );
}

function VoiceArtifactBubble({
  artifact,
  showCitations,
}: {
  artifact: ConversationArtifact;
  showCitations: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-cyan-500/25 bg-cyan-500/10 px-3 py-3 text-sm text-slate-100">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
          Assistant detail
        </p>
        <CopyResponseButton text={artifact.answer} />
      </div>
      <ResponseBlocks
        blocks={
          artifact.blocks && artifact.blocks.length > 0
            ? artifact.blocks
            : [{ type: "text", text: artifact.answer }]
        }
        showSources={showCitations}
      />
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
  status:
    | "idle"
    | "connecting"
    | "listening"
    | "thinking"
    | "speaking"
    | "error";
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
      x:
        viewport.width -
        FLOATING_BOT_FALLBACK_SIZE.width -
        FLOATING_WIDGET_MARGIN,
      y:
        viewport.height -
        FLOATING_BOT_FALLBACK_SIZE.height -
        FLOATING_WIDGET_MARGIN,
    },
    null,
    viewport,
    false
  );
}

function clampFloatingPosition(
  position: FloatingPosition,
  widget: HTMLDivElement | null,
  viewport: ViewportSize,
  expanded: boolean
): FloatingPosition {
  const size = measureFloatingWidget(widget, expanded);
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

function measureFloatingWidget(
  widget: HTMLDivElement | null,
  expanded: boolean
) {
  if (!widget) {
    return expanded
      ? FLOATING_PANEL_FALLBACK_SIZE
      : FLOATING_BOT_FALLBACK_SIZE;
  }

  const rect = widget.getBoundingClientRect();
  const fallback = expanded
    ? FLOATING_PANEL_FALLBACK_SIZE
    : FLOATING_BOT_FALLBACK_SIZE;

  return {
    width: rect.width || fallback.width,
    height: rect.height || fallback.height,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Stable content fingerprint for the autoscroll effect: changes when a turn
// is added or the latest turn's text grows, but not on unrelated re-renders.
function buildTimelineSignal(entries: VoiceTimelineEntry[]) {
  const last = entries[entries.length - 1];
  if (!last) {
    return "empty";
  }
  const textLength =
    last.kind === "message"
      ? last.message.text.length
      : last.artifact.answer.length;
  return `${entries.length}:${last.id}:${textLength}`;
}

function buildVoiceTimeline(
  messages: RealtimeMessage[],
  artifacts: ConversationArtifact[]
): VoiceTimelineEntry[] {
  return [
    ...messages.map((message) => ({
      kind: "message" as const,
      id: `message-${message.id}`,
      createdAt: message.createdAt,
      message,
    })),
    ...artifacts.map((artifact) => ({
      kind: "artifact" as const,
      id: `artifact-${artifact.id}`,
      createdAt: artifact.createdAt,
      artifact,
    })),
  ].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt) || 0;
    const rightTime = Date.parse(right.createdAt) || 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.kind === "message" ? -1 : 1;
  });
}

function buildSuggestedActions(
  items: DashboardCardItem[],
  sources: AssistantSource[]
) {
  const base = [
    "Summarize the current queue.",
    "What is overdue right now?",
    "What needs my attention first?",
    "Show related policies for this queue.",
  ];
  const fromItems = items
    .slice(0, 2)
    .map((item) => `What is blocking ${item.title}?`);
  const fromSources = sources
    .slice(0, 2)
    .map((source) => `Explain ${source.title || source.path}.`);
  const unique = new Set<string>();

  for (const value of [...base, ...fromItems, ...fromSources]) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (normalized && !unique.has(key)) {
      unique.add(key);
    }
  }

  return Array.from(unique).map((key) =>
    [...base, ...fromItems, ...fromSources].find(
      (value) => value.trim().toLowerCase() === key
    )!
  );
}

function findLatestArtifact(artifacts: ConversationArtifact[]) {
  if (artifacts.length === 0) {
    return null;
  }

  return [...artifacts].sort(
    (left, right) =>
      (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
  )[0];
}

function findLatestAssistantEntry(entries: AssistantChatEntry[]) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.role === "assistant") {
      return entry;
    }
  }

  return null;
}

function isInteractiveDragTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest("button, a, input, select, textarea, label, [data-no-drag]")
  );
}

function buildComposerPlaceholder(
  assistantMode: "voice" | "text",
  isConnected: boolean
) {
  if (assistantMode === "voice" && isConnected) {
    return "Ask live and hear the short answer while the full answer renders here.";
  }

  if (assistantMode === "voice") {
    return "Type a question, or start a voice session.";
  }

  return "Ask the assistant...";
}

function EmailConfirmation({
  pendingEmail,
  status,
  onConfirm,
  onCancel,
  onRemoveAttachment,
}: {
  pendingEmail: PendingEmail | null;
  status: EmailSendStatus;
  onConfirm: () => void;
  onCancel: () => void;
  onRemoveAttachment: (index: number) => void;
}) {
  if (!pendingEmail) {
    if (status.state === "sent") {
      return (
        <div className="rounded-[22px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Email sent
          {status.messageId ? ` | id ${status.messageId.slice(0, 12)}...` : ""}.
        </div>
      );
    }
    if (status.state === "cancelled") {
      return (
        <div className="rounded-[22px] border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
          Email cancelled. Nothing was sent.
        </div>
      );
    }
    if (status.state === "error") {
      return (
        <div className="rounded-[22px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {status.message}
        </div>
      );
    }
    return null;
  }

  const sending = status.state === "sending";

  return (
    <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
        <Mail className="h-4 w-4" />
        Confirm send
      </div>

      <dl className="space-y-1 text-sm text-slate-100">
        <Field label="To" value={pendingEmail.to.join(", ")} />
        {pendingEmail.cc.length > 0 && (
          <Field label="Cc" value={pendingEmail.cc.join(", ")} />
        )}
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
        <button
          type="button"
          onClick={onConfirm}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {sending ? "Sending" : "Send"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-red-400/50 hover:bg-red-500/10 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>

      {status.state === "error" && (
        <p className="mt-2 text-xs text-red-200">{status.message}</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Review carefully. This sends a real email from your mailbox via
        Microsoft Graph. You can also say "yes send it now" while the draft is
        staged.
      </p>
    </div>
  );
}

const MIC_VOLUME_SCALE = 0.3;

function MicCleanupPanel({
  settings,
  debug,
  isTesting,
  onChange,
  onTest,
  onClose,
}: {
  settings: MicCleanupSettings;
  debug: MicCleanupDebug | null;
  isTesting: boolean;
  onChange: (partial: Partial<MicCleanupSettings>) => void;
  onTest: () => void;
  onClose: () => void;
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
    <div className="relative space-y-3 p-3">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close mic cleanup"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-800/80 hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
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
          <div
            className="absolute top-0 h-full w-0.5 bg-amber-300"
            style={{ left: `${thresholdPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <DebugRow label="Gate" value={gateOpen ? "open" : "closed"} accent={gateOpen} />
        <DebugRow label="Speaking" value={speaking ? "yes" : "no"} accent={speaking} />
        <DebugRow label="Threshold" value={settings.noiseGateThreshold.toFixed(3)} />
        <DebugRow label="Ignored noise" value={String(debug?.ignoredNoiseCount ?? 0)} />
      </div>

      <RangeRow
        label="Noise gate threshold"
        value={settings.noiseGateThreshold}
        min={0.001}
        max={0.1}
        step={0.001}
        format={(value) => value.toFixed(3)}
        onChange={(value) => onChange({ noiseGateThreshold: value })}
      />
      <RangeRow
        label="Silence stop delay"
        value={settings.endSilenceMs}
        min={300}
        max={3000}
        step={50}
        format={(value) => `${value} ms`}
        onChange={(value) => onChange({ endSilenceMs: value })}
      />
      <RangeRow
        label="Max utterance length"
        value={settings.maxUtteranceMs}
        min={5000}
        max={60000}
        step={1000}
        format={(value) => `${Math.round(value / 1000)} s`}
        onChange={(value) => onChange({ maxUtteranceMs: value })}
      />

      <div className="space-y-1.5 border-t border-slate-800/70 pt-2">
        <ToggleRow
          label="Noise suppression"
          checked={settings.noiseSuppression}
          onChange={(value) => onChange({ noiseSuppression: value })}
        />
        <ToggleRow
          label="Auto gain control"
          checked={settings.autoGainControl}
          onChange={(value) => onChange({ autoGainControl: value })}
        />
        <ToggleRow
          label="Echo cancellation"
          checked={settings.echoCancellation}
          onChange={(value) => onChange({ echoCancellation: value })}
        />
        <p className="text-[10px] text-slate-500">
          Browser cleanup toggles apply when you start the next session.
        </p>
      </div>

      <button
        type="button"
        onClick={onTest}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/35 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:bg-slate-900",
          isTesting && "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
        )}
      >
        <Mic className="h-4 w-4" />
        {isTesting ? "Stop mic test" : "Test microphone"}
      </button>
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
      <span
        className={cn(
          "tabular-nums",
          accent ? "text-emerald-300" : "text-slate-200"
        )}
      >
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

function StatusBadge({
  connected,
  status,
}: {
  connected: boolean;
  status:
    | "idle"
    | "connecting"
    | "listening"
    | "thinking"
    | "speaking"
    | "error";
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
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium",
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
