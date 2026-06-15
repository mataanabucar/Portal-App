"use client";

import { useState } from "react";
import {
  ArrowRight,
  FileText,
  BadgeCheck,
  TriangleAlert,
  Clock3,
  History,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Clock,
  ChevronDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TitleStatusPanel } from "./TitleStatusPanel";
import { SummarySection } from "./SummarySection";
import { KeyDetailsPanel, visibleKeyDetailRows } from "./KeyDetailsPanel";
import { ResearchModal } from "@/components/research/ResearchModal";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel, DashboardCardItem } from "@/lib/types";

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

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
    <article
      // The card fills its grid cell (no hard-coded width) so it never floats
      // or fights the row layout. Expanding Key Details grows the card's height
      // in-flow; the parent grid lets an expanded card claim more row width.
      className="relative grid gap-3.5 p-4 rounded-[24px] border border-slate-700/40 bg-gradient-to-b from-[#0c1220] to-[#080d18] shadow-[0_20px_54px_rgba(3,8,18,0.34)] w-full min-w-0 transition-[grid-column] duration-200"
    >
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
        {/* Regenerate sits directly next to the title (left-anchored). */}
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
        {generatedLabel && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5 whitespace-nowrap ml-auto">
            <Clock className="w-3.5 h-3.5" />
            {generatedLabel}
          </p>
        )}
      </header>

      {/* Body: a single column of fixed-size content sections. These never
          shrink — expanding Key Details adds a full-width section below. */}
      <div className="grid gap-2 min-w-0">
        <TitleStatusPanel item={item} />

          {item.nextAction && (
            <SummarySection kind="next-action" label="Next Action" icon={ArrowRight}>
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.nextAction}
              </p>
            </SummarySection>
          )}
          {item.summary && (
            <SummarySection kind="summary" label="Summary" icon={FileText}>
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.summary}
              </p>
            </SummarySection>
          )}
          {item.deliverable && (
            <SummarySection
              kind="deliverable"
              label="Deliverable"
              icon={BadgeCheck}
            >
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.deliverable}
              </p>
            </SummarySection>
          )}
          {item.blockersOpenQuestions.length > 0 && (
            <SummarySection
              kind="blockers"
              label="Blockers / Open Questions"
              icon={TriangleAlert}
            >
              <ul className="mt-1 space-y-1 text-sm text-slate-300 list-disc list-inside leading-relaxed">
                {item.blockersOpenQuestions.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </SummarySection>
          )}
          {item.urgencyText && (
            <SummarySection kind="urgency" label="Urgency" icon={Clock3}>
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.urgencyText}
              </p>
            </SummarySection>
          )}
          {item.requestHistorySignals && (
            <SummarySection
              kind="history"
              label="Request History Signals"
              icon={History}
            >
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.requestHistorySignals}
              </p>
            </SummarySection>
          )}
          {(item.confidence.level || item.confidence.reason) && (
            <SummarySection
              kind="confidence"
              label="Confidence"
              icon={ShieldCheck}
              headingRight={
                item.confidence.level ? (
                  <ConfidencePill level={item.confidence.level} />
                ) : undefined
              }
            >
              {item.confidence.reason && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.confidence.reason}
                </p>
              )}
            </SummarySection>
          )}
      </div>

      {/* Persistent KEY DETAILS toggle bar — always full-width at the bottom of
          the card body. Chevron flips on expand/collapse; no separate button. */}
      {hasKeyDetails && (
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          aria-label={detailsOpen ? "Collapse key details" : "Expand key details"}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-700/30 bg-slate-900/60 hover:bg-slate-800/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[0.72rem] font-extrabold tracking-widest uppercase text-cyan-400">
              Key Details
            </span>
            <span className="text-[0.7rem] text-slate-500">
              ({detailFieldCount} field{detailFieldCount !== 1 ? "s" : ""})
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-cyan-400 transition-transform shrink-0",
              detailsOpen && "rotate-180"
            )}
          />
        </button>
      )}

      {/* Table: only mounted when expanded; card grows in height naturally. */}
      {hasKeyDetails && detailsOpen && (
        <KeyDetailsPanel rows={item.keyDetails} />
      )}

      <footer className="flex items-center gap-3 flex-wrap pt-2.5 border-t border-slate-700/25">
        {item.href && (
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-cyan-300 border border-cyan-600/30 bg-slate-900/80 hover:border-cyan-400/50 transition-colors"
          >
            View Full Request
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {footerText && <p className="text-xs text-slate-500">{footerText}</p>}
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

function ConfidencePill({ level }: { level: ConfidenceLevel }) {
  const cls =
    level === "High"
      ? "text-green-400 border-green-600/30 bg-green-950/30"
      : level === "Medium"
        ? "text-yellow-400 border-yellow-600/30 bg-yellow-950/30"
        : "text-red-400 border-red-600/30 bg-red-950/30";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${cls}`}
    >
      {level}
    </span>
  );
}
