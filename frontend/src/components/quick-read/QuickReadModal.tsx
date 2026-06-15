"use client";

import { useEffect } from "react";
import { X, CalendarDays, ArrowRight } from "lucide-react";
import { topByPriority } from "@/lib/priority";
import { cn } from "@/lib/utils";
import type { DashboardCardItem, UrgencyLevel } from "@/lib/types";

const URGENCY_BADGE: Record<UrgencyLevel, { label: string; cls: string }> = {
  critical: {
    label: "Critical",
    cls: "text-red-300 border-red-600/40 bg-red-950/40",
  },
  high: {
    label: "High",
    cls: "text-orange-300 border-orange-600/40 bg-orange-950/40",
  },
  normal: {
    label: "Normal",
    cls: "text-cyan-300 border-cyan-600/30 bg-cyan-950/30",
  },
  low: {
    label: "Low",
    cls: "text-slate-300 border-slate-600/30 bg-slate-800/40",
  },
};

interface QuickReadModalProps {
  open: boolean;
  onClose: () => void;
  items: DashboardCardItem[];
}

export function QuickReadModal({ open, onClose, items }: QuickReadModalProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const top = topByPriority(items, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Read"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl rounded-[24px] border border-slate-700/50 bg-gradient-to-b from-[#0c1220] to-[#080d18] shadow-[0_30px_80px_rgba(3,8,18,0.6)] overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-700/30">
          <div>
            <p className="text-[0.72rem] font-extrabold tracking-widest uppercase text-cyan-400">
              Quick Read
            </p>
            <h2 className="text-lg font-bold tracking-tight text-slate-100">
              What matters right now
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quick Read"
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-600/40 bg-slate-900/80 text-slate-300 hover:border-slate-400/55 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-400 mb-3">
            Top {top.length} item{top.length !== 1 ? "s" : ""}, ordered by
            urgency.
          </p>

          {top.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing in the queue yet.</p>
          ) : (
            <ol className="space-y-3">
              {top.map((item, i) => {
                const badge = URGENCY_BADGE[item.urgency];
                return (
                  <li
                    key={item.id || `quick-${item.index}`}
                    className="grid grid-cols-[24px_1fr] gap-3 items-start"
                  >
                    <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800/70 text-slate-300 border border-slate-600/40">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full border text-[0.7rem] font-bold",
                            badge.cls
                          )}
                        >
                          {badge.label}
                        </span>
                        {item.due.date && (
                          <span className="inline-flex items-center gap-1 text-[0.7rem] text-violet-300">
                            <CalendarDays className="w-3 h-3" />
                            {item.due.date}
                            {item.due.relative ? ` (${item.due.relative})` : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-100 leading-snug">
                        {item.title}
                      </p>
                      {item.nextAction && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400 leading-relaxed">
                          <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-cyan-400" />
                          {item.nextAction}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
