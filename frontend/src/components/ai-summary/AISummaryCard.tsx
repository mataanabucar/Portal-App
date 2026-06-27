"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  TriangleAlert,
  History,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Clock,
  Search,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
  Clock3,
  LayoutList,
  Volume2,
  Loader2,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TitleStatusPanel } from "./TitleStatusPanel";
import { SummarySection } from "./SummarySection";
import { KeyDetailsPanel, visibleKeyDetailRows } from "./KeyDetailsPanel";
import { ResearchModal } from "@/components/research/ResearchModal";
import { cn } from "@/lib/utils";
import {
  type TtsState,
  VOICE_REPLAY_TTS_INSTRUCTIONS,
  playPortalTts,
  stopPortalTts,
} from "@/lib/tts";
import { readTtsConfig } from "@/lib/ttsConfig";
import { buildQueueItemVoiceReplayReport } from "@/lib/ttsBuildText";
import type {
  ConfidenceLevel,
  DashboardCardItem,
  DueTone,
  UrgencyLevel,
} from "@/lib/types";

interface AISummaryCardProps {
  item: DashboardCardItem;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

function formatGeneratedAt(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `Generated ${parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function AISummaryCard({
  item,
  onRegenerate,
  isRegenerating,
}: AISummaryCardProps) {
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [blockersOpen, setBlockersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const voiceReplayAbortRef = useRef<AbortController | null>(null);

  async function buildVoiceReplayText() {
    const reportText = buildQueueItemVoiceReplayReport(item);
    const abortController = new AbortController();
    voiceReplayAbortRef.current = abortController;

    const res = await fetch("/api/tts/card-replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, reportText }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((errBody as { error?: string }).error ?? res.statusText);
    }

    const payload = (await res.json()) as { text?: string };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) {
      throw new Error("Voice replay returned empty text.");
    }
    return text;
  }

  async function handleListen() {
    const cfg = readTtsConfig();
    setTtsError(null);
    stopPortalTts();
    voiceReplayAbortRef.current?.abort();
    setTtsState("loading");

    try {
      const text = await buildVoiceReplayText();
      voiceReplayAbortRef.current = null;
      await playPortalTts({
        text,
        voice: cfg.voice,
        instructions: VOICE_REPLAY_TTS_INSTRUCTIONS,
        speed: cfg.speed,
        playbackRate: cfg.playbackRate,
        format: cfg.responseFormat,
        volume: cfg.volume,
        onStateChange: setTtsState,
        onError: (msg) => {
          setTtsError(msg);
          setTimeout(() => setTtsError(null), 4000);
        },
      });
    } catch (err) {
      voiceReplayAbortRef.current = null;
      if ((err as Error).name === "AbortError") return;
      setTtsState("idle");
      setTtsError((err as Error).message);
      setTimeout(() => setTtsError(null), 4000);
    }
  }

  function handleTtsStop() {
    voiceReplayAbortRef.current?.abort();
    voiceReplayAbortRef.current = null;
    stopPortalTts();
    setTtsState("idle");
  }

  const generatedLabel = formatGeneratedAt(item.generatedAt);
  const shownKeyDetails = visibleKeyDetailRows(item.keyDetails);
  const hasKeyDetails = shownKeyDetails.length > 0;
  const detailFieldCount = shownKeyDetails.filter(
    (r) => r.value !== "Not visible"
  ).length;

  const footerText = [
    item.footer.requested && `Requested: ${item.footer.requested}`,
    item.footer.lastUpdated && `Last Updated: ${item.footer.lastUpdated}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <>
      <article className="relative grid gap-4 p-5 rounded-[24px] border border-slate-700/40 bg-gradient-to-b from-[#0c1220] to-[#080d18] shadow-[0_20px_54px_rgba(3,8,18,0.34)] w-full min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 flex-wrap">
          <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-cyan-950/40 border border-cyan-700/20 shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-tight leading-none">
              Item Summary
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Item ID: #{item.id || "—"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-full border-cyan-600/35 bg-slate-900/80 text-cyan-300 hover:border-cyan-400/55 hover:bg-slate-800 text-xs font-bold tracking-wide"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`}
            />
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResearchOpen(true)}
            disabled={isRegenerating}
            className="rounded-full border-violet-600/35 bg-slate-900/80 text-violet-300 hover:border-violet-400/55 hover:bg-slate-800 text-xs font-bold tracking-wide"
          >
            <Search className="w-3.5 h-3.5" />
            Research
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={ttsState === "idle" ? handleListen : handleTtsStop}
            disabled={isRegenerating}
            className="rounded-full border-teal-600/35 bg-slate-900/80 text-teal-300 hover:border-teal-400/55 hover:bg-slate-800 text-xs font-bold tracking-wide"
          >
            {ttsState === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : ttsState === "playing" ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            {ttsState === "idle" ? "Listen" : ttsState === "loading" ? "Loading..." : "Stop"}
          </Button>
          {ttsState === "playing" && (
            <span className="flex items-center gap-1.5 text-xs text-teal-300 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Reading aloud
            </span>
          )}
          {ttsError && (
            <span className="text-xs text-red-400 whitespace-nowrap">{ttsError}</span>
          )}
          {generatedLabel && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 whitespace-nowrap ml-auto">
              <Clock className="w-3.5 h-3.5" />
              {generatedLabel}
            </p>
          )}
        </header>

        {/* Title + status pills */}
        <TitleStatusPanel item={item} />

        {/* Two-column body: only What to Do Now + Summary sit alongside Quick Facts */}
        <div className="grid grid-cols-[1fr_200px] gap-4 min-w-0 items-start">
          <div className="grid gap-2 min-w-0">
            {item.nextAction && (
              <SummarySection
                kind="next-action"
                label="What to Do Now"
                icon={ArrowRight}
              >
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.nextAction}
                </p>
              </SummarySection>
            )}

            {item.summary && (
              <SummarySection
                kind="summary"
                label="Summary"
                icon={FileText}
                collapsible
                isOpen={summaryOpen}
                onToggle={() => setSummaryOpen((v) => !v)}
              >
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.summary}
                </p>
              </SummarySection>
            )}
          </div>

          {/* Right: Quick Facts */}
          <QuickFacts item={item} />
        </div>

        {/* Full-width sections below the two-column area */}
        <div className="grid gap-2 min-w-0">
          {item.blockersOpenQuestions.length > 0 && (
            <SummarySection
              kind="blockers"
              label="Blockers / Open Questions"
              icon={TriangleAlert}
              collapsible
              isOpen={blockersOpen}
              onToggle={() => setBlockersOpen((v) => !v)}
            >
              <ul className="mt-1 space-y-1 text-sm text-slate-300 list-disc list-inside leading-relaxed">
                {item.blockersOpenQuestions.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </SummarySection>
          )}

          {item.requestHistorySignals && (
            <SummarySection
              kind="history"
              label="Request History Signals"
              icon={History}
              collapsible
              isOpen={historyOpen}
              onToggle={() => setHistoryOpen((v) => !v)}
            >
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.requestHistorySignals}
              </p>
            </SummarySection>
          )}

          {hasKeyDetails && (
            <SummarySection
              kind="details"
              label={`Key Details (${detailFieldCount} field${detailFieldCount !== 1 ? "s" : ""})`}
              icon={LayoutList}
              collapsible
              isOpen={detailsOpen}
              onToggle={() => setDetailsOpen((v) => !v)}
            >
              <KeyDetailsPanel rows={item.keyDetails} />
            </SummarySection>
          )}
        </div>

        <footer className="flex items-center gap-3 flex-wrap pt-2.5 border-t border-slate-700/25">
          {item.href && (
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-cyan-300 border border-cyan-600/40 bg-slate-800/90 hover:border-cyan-400/60 hover:bg-slate-700/80 transition-colors"
            >
              View Full Request
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {footerText && (
            <p className="text-xs text-slate-500 ml-auto">{footerText}</p>
          )}
        </footer>
      </article>

      <ResearchModal
        open={researchOpen}
        onClose={() => setResearchOpen(false)}
        item={item}
      />
    </>
  );
}

// ─── Quick Facts sidebar ──────────────────────────────────────────────────────

const DUE_TONE_CLS: Record<DueTone, string> = {
  soon: "text-cyan-400 border-cyan-600/30 bg-cyan-950/30",
  overdue: "text-red-400 border-red-600/30 bg-red-950/30",
  normal: "text-slate-300 border-slate-600/30 bg-slate-800/30",
  unknown: "text-slate-500 border-slate-700/30 bg-transparent",
};

const URGENCY_CLS: Record<UrgencyLevel, string> = {
  critical: "text-red-400 border-red-600/30 bg-red-950/30",
  high: "text-amber-400 border-amber-600/30 bg-amber-950/30",
  normal: "text-slate-400 border-slate-600/30 bg-slate-800/30",
  low: "text-green-400 border-green-600/30 bg-green-950/30",
};

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const CONFIDENCE_CLS: Record<ConfidenceLevel, string> = {
  High: "text-green-400 border-green-600/30 bg-green-950/30",
  Medium: "text-yellow-400 border-yellow-600/30 bg-yellow-950/30",
  Low: "text-red-400 border-red-600/30 bg-red-950/30",
  "": "text-slate-400 border-slate-600/30 bg-transparent",
};

function QuickFacts({ item }: { item: DashboardCardItem }) {
  return (
    <div className="rounded-2xl border border-slate-700/30 bg-slate-900/60 p-3.5 flex flex-col gap-3">
      <p className="text-[0.65rem] font-extrabold tracking-widest uppercase text-slate-500">
        Quick Facts
      </p>

      {item.due.date && (
        <QuickFactRow icon={CalendarDays} label="Due Date" iconCls="bg-slate-800/60 text-slate-300">
          <p className="text-sm font-semibold text-slate-200 leading-snug">
            {item.due.date}
          </p>
          {item.due.relative && (
            <span
              className={cn(
                "mt-1 inline-flex text-[0.65rem] font-bold px-2 py-0.5 rounded-full border",
                DUE_TONE_CLS[item.due.tone]
              )}
            >
              {item.due.relative}
            </span>
          )}
        </QuickFactRow>
      )}

      {item.confidence.level && (
        <QuickFactRow
          icon={ShieldCheck}
          label="Confidence"
          iconCls="bg-green-950/30 text-green-400"
          badge={
            <span
              className={cn(
                "text-[0.65rem] font-extrabold px-2 py-0.5 rounded-full border",
                CONFIDENCE_CLS[item.confidence.level]
              )}
            >
              {item.confidence.level}
            </span>
          }
        >
          {null}
        </QuickFactRow>
      )}

      {item.deliverable && (
        <QuickFactRow icon={BadgeCheck} label="Deliverable" iconCls="bg-green-950/30 text-green-400">
          <p className="text-xs text-slate-300 leading-snug">{item.deliverable}</p>
        </QuickFactRow>
      )}

      {(item.urgencyText || item.urgency) && (
        <QuickFactRow
          icon={Clock3}
          label="Urgency"
          iconCls="bg-amber-950/30 text-amber-400"
          badge={
            <span
              className={cn(
                "text-[0.65rem] font-extrabold px-2 py-0.5 rounded-full border",
                URGENCY_CLS[item.urgency]
              )}
            >
              {URGENCY_LABEL[item.urgency]}
            </span>
          }
        >
          {item.urgencyText && (
            <p className="text-xs text-slate-300 leading-snug mt-0.5">
              {item.urgencyText}
            </p>
          )}
        </QuickFactRow>
      )}
    </div>
  );
}

function QuickFactRow({
  icon: Icon,
  label,
  iconCls,
  badge,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  iconCls: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center border border-white/8 shrink-0 mt-0.5",
          iconCls
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-[0.65rem] font-bold tracking-widest uppercase text-slate-500">
            {label}
          </p>
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}
