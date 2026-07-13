"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  MessageSquare,
  RefreshCw,
  X,
} from "lucide-react";
import { RichText } from "@/components/assistant/ResponseBlocks";
import { PillProgress3D } from "@/components/ui/PillProgress3D";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  BriefingPrefilter,
  BriefingRetainedItem,
  DayBriefingResponse,
} from "@/lib/types";

// The two-stage pipeline takes a while (Graph fetch + two LLM calls); this
// trickle mirrors useDashboard's fake-progress pattern with briefing phases.
const BRIEFING_PHASES = [
  { delay: 0, progress: 14, label: "FETCHING CALENDAR, EMAIL & TEAMS..." },
  { delay: 3500, progress: 34, label: "STAGE 1 · PREFILTERING..." },
  { delay: 12000, progress: 55, label: "STAGE 1 · SCORING PRIORITIES..." },
  { delay: 22000, progress: 72, label: "STAGE 2 · WRITING BRIEFING..." },
  { delay: 36000, progress: 85, label: "STAGE 2 · POLISHING..." },
  { delay: 52000, progress: 92, label: "ALMOST THERE..." },
] as const;

function startBriefingTrickle(
  setProgress: (p: number) => void,
  setLabel: (l: string) => void
): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const phase of BRIEFING_PHASES) {
    timers.push(
      setTimeout(() => {
        if (!cancelled) {
          setProgress(phase.progress);
          setLabel(phase.label);
        }
      }, phase.delay)
    );
  }
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

const PRIORITY_BADGE: Record<number, string> = {
  5: "text-red-300 border-red-600/40 bg-red-950/40",
  4: "text-orange-300 border-orange-600/40 bg-orange-950/40",
  3: "text-cyan-300 border-cyan-600/30 bg-cyan-950/30",
};

interface DayOrganizerModalProps {
  open: boolean;
  onClose: () => void;
}

export function DayOrganizerModal({ open, onClose }: DayOrganizerModalProps) {
  const [data, setData] = useState<DayBriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("STARTING...");
  const cancelTrickleRef = useRef<(() => void) | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(6);
    setLabel("STARTING...");
    cancelTrickleRef.current?.();
    cancelTrickleRef.current = startBriefingTrickle(setProgress, setLabel);
    try {
      const response = await api.dayBriefing();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      cancelTrickleRef.current?.();
      cancelTrickleRef.current = null;
      setLoading(false);
    }
  }, []);

  // Clear any pending trickle timers on unmount.
  useEffect(() => () => cancelTrickleRef.current?.(), []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-generate the first time the modal opens; afterwards the cached
  // briefing is shown until the user hits Refresh.
  useEffect(() => {
    if (open && !data && !loading && !error) {
      void generate();
    }
  }, [open, data, loading, error, generate]);

  if (!open) return null;

  const todayLabel =
    data?.meta.window.date ??
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Executive Day Organizer"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Fullpage panel */}
      <div className="absolute inset-0 sm:inset-4 flex flex-col rounded-none sm:rounded-[24px] border border-slate-700/50 bg-gradient-to-b from-[#0c1220] to-[#080d18] shadow-[0_30px_80px_rgba(3,8,18,0.6)] overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center bg-cyan-950/50 border border-cyan-600/30">
              <CalendarClock className="w-5 h-5 text-cyan-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.72rem] font-extrabold tracking-widest uppercase text-cyan-400">
                Executive Day Organizer
              </p>
              <h2 className="text-lg font-bold tracking-tight text-slate-100 truncate">
                {todayLabel}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-full border border-cyan-600/40 text-sm font-semibold text-cyan-300 hover:border-cyan-400 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              {loading ? "Generating" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Day Organizer"
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-600/40 bg-slate-900/80 text-slate-300 hover:border-slate-400/55 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <PillProgress3D progress={progress} label={label} width={420} height={60} />
              <p className="text-xs text-slate-500">
                Stage 1 prefilters your Microsoft 365 data; Stage 2 writes the briefing.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="max-w-xl mx-auto mt-16 text-center space-y-4">
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void generate()}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-full border border-cyan-600/40 text-sm font-semibold text-cyan-300 hover:border-cyan-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <div className="max-w-3xl mx-auto space-y-6">
              {data.meta.sourceFailures.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Some sources could not be fetched:{" "}
                    {data.meta.sourceFailures
                      .map((f) => `${f.source} (${f.error})`)
                      .join("; ")}
                    . The briefing covers the rest.
                  </span>
                </div>
              )}

              <RichText content={data.briefingMarkdown} />

              <SourcesSection prefilter={data.prefilter} />

              <p className="text-[0.7rem] text-slate-500 border-t border-slate-800/60 pt-3">
                Generated via {data.meta.provider} · Stage 1 {data.meta.models.stage1} (
                {(data.meta.timings.stage1Ms / 1000).toFixed(1)}s) · Stage 2{" "}
                {data.meta.models.stage2} ({(data.meta.timings.stage2Ms / 1000).toFixed(1)}
                s) · Reviewed {data.meta.counts.calendarFetched} events,{" "}
                {data.meta.counts.emailsFetched} emails, {data.meta.counts.teamsFetched}{" "}
                Teams messages · Retained {data.meta.counts.retained}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collapsible traceability panel: the validated Stage 1 items with their
// preserved Graph source IDs resolved to real Outlook/Teams links.
function SourcesSection({ prefilter }: { prefilter: BriefingPrefilter }) {
  const [expanded, setExpanded] = useState(false);
  const groups = [
    {
      key: "calendar",
      title: "Calendar",
      icon: CalendarDays,
      items: prefilter.retained_calendar_events,
    },
    { key: "email", title: "Email", icon: Mail, items: prefilter.retained_emails },
    {
      key: "teams",
      title: "Teams",
      icon: MessageSquare,
      items: prefilter.retained_teams_messages,
    },
  ];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="rounded-[20px] border border-slate-700/40 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-200 hover:text-cyan-300 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        Sources
        <span className="text-xs font-normal text-slate-500">
          {total} retained item{total !== 1 ? "s" : ""} from Microsoft 365
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {total === 0 && (
            <p className="text-xs text-slate-500">
              The prefilter retained no items for today.
            </p>
          )}
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <div key={group.key}>
                <p className="flex items-center gap-1.5 text-[0.7rem] font-extrabold tracking-widest uppercase text-slate-400 mb-2">
                  <group.icon className="w-3.5 h-3.5" />
                  {group.title}
                </p>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <SourceItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function SourceItemRow({ item }: { item: BriefingRetainedItem }) {
  const title =
    item.title || item.subject || item.chat_or_channel || "(untitled item)";
  const who = item.organizer || item.sender || "";
  const score =
    typeof item.priority_score === "number" ? item.priority_score : null;

  return (
    <li className="rounded-xl border border-slate-700/30 bg-slate-950/40 px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        {score !== null && (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full border text-[0.68rem] font-bold",
              PRIORITY_BADGE[score] ?? "text-slate-300 border-slate-600/30 bg-slate-800/40"
            )}
          >
            P{score}
          </span>
        )}
        <span className="text-sm font-semibold text-slate-200 min-w-0 truncate">
          {title}
        </span>
        {item.web_link && (
          <a
            href={item.web_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {[who, formatItemTime(item)].filter(Boolean).join(" · ")}
      </p>
      {(item.summary || item.why_retained) && (
        <p className="text-xs text-slate-500 mt-1">
          {item.summary || item.why_retained}
        </p>
      )}
      {item.automated_sender_exception_reason &&
        !(item.tags ?? []).includes("[Automated Notification]") && (
          <p className="text-xs text-amber-300/80 mt-1">
            Automated sender exception: {item.automated_sender_exception_reason}
          </p>
        )}
      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-md border border-slate-700/40 bg-slate-800/40 text-[0.65rem] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function formatItemTime(item: BriefingRetainedItem): string {
  const raw = item.start_time || item.received_time || item.message_time || "";
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}
