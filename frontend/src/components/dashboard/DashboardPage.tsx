"use client";

import { useState, useSyncExternalStore } from "react";
import { RefreshCw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AISummaryCard } from "@/components/ai-summary/AISummaryCard";
import { QuickReadModal } from "@/components/quick-read/QuickReadModal";
import { TtsConfigModal } from "@/components/tts/TtsConfigModal";
import { ResearchTestModal } from "@/components/research/ResearchTestModal";
import { PillProgress3D } from "@/components/ui/PillProgress3D";
import { orderByPriority } from "@/lib/priority";
import { readLocal, subscribeLocal, writeLocal } from "@/lib/storage";
import { useDashboard } from "@/hooks/useDashboard";

const DEFAULT_SUMMARY_TONE = "Professional + Straightforward";
const SUMMARY_TONE_STORAGE_KEY = "dashboard-summary-tone";
const SUMMARY_TONE_OPTIONS = [
  "Friendly + Professional",
  "Authoritative + Informative",
  "Urgent + Persuasive",
  "Casual + Conversational",
  "Professional + Trustworthy",
  "Humorous + Informal",
  "Professional + Straightforward",
  "Serious + Empathetic",
  "Positive + Enthusiastic",
  "Authoritative + Professional",
  "Casual + Funny",
  "Authoritative + Experts",
] as const;

type SummaryTone = (typeof SUMMARY_TONE_OPTIONS)[number];

export function DashboardPage() {
  const summaryTone = useStoredSummaryTone();
  const [quickReadOpen, setQuickReadOpen] = useState(false);
  const [ttsConfigOpen, setTtsConfigOpen] = useState(false);
  const [researchTestOpen, setResearchTestOpen] = useState(false);
  const {
    data,
    items,
    error,
    isLoading,
    isRefreshing,
    isBackendReady,
    isCheckingConnection,
    loadingProgress,
    loadingLabel,
    refresh,
    refreshWithRequest,
  } = useDashboard({
    includeSummary: true,
    summaryTone,
  });

  // Only show the TeamGPT tone selector when the summarizer is using TeamGPT.
  const isTeamGptSummarizer = data?.summary?.provider === "teamgpt";

  // Cards are shown ordered by priority too, so the grid and Quick Read agree.
  const orderedItems = orderByPriority(items);

  const statusLine = isLoading
    ? "Loading..."
    : error
      ? String(error.message ?? error)
      : `${items.length} item${items.length !== 1 ? "s" : ""}`;

  const handleSummaryToneChange = (nextTone: string) => {
    if (!isSummaryTone(nextTone) || nextTone === summaryTone) {
      return;
    }

    writeLocal(SUMMARY_TONE_STORAGE_KEY, nextTone);
    refreshWithRequest({
      includeSummary: true,
      summaryTone: nextTone,
    });
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        onQuickRead={() => setQuickReadOpen(true)}
        quickReadActive={quickReadOpen}
        onTtsConfig={() => setTtsConfigOpen(true)}
        onResearchTest={() => setResearchTestOpen(true)}
      />

      <main className="flex-1 min-w-0 px-5 py-8 space-y-6">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Today&apos;s queue
            </h1>
            <p className="text-sm text-slate-400 mt-1">{statusLine}</p>
          </div>
          <div className="flex items-center gap-2">
            {isTeamGptSummarizer && (
              <SelectMenu
                label="TeamGPT tone"
                value={summaryTone}
                options={SUMMARY_TONE_OPTIONS.map((tone) => ({
                  value: tone,
                  label: tone,
                }))}
                onValueChange={handleSummaryToneChange}
                helperText="This changes the voice used when the queue brief and item summaries are regenerated."
                disabled={isLoading}
              />
            )}
            <Button
              variant="outline"
              onClick={() => setQuickReadOpen(true)}
              disabled={isLoading}
              className="rounded-full border-cyan-600/40 text-cyan-300 hover:border-cyan-400"
            >
              <BookOpen className="w-4 h-4" />
              Quick Read
            </Button>
            <Button
              variant="outline"
              onClick={() => refresh()}
              disabled={isCheckingConnection || !isBackendReady || isRefreshing}
              className="rounded-full border-slate-600 hover:border-cyan-500"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isCheckingConnection || isRefreshing ? "animate-spin" : ""
                }`}
              />
              {isCheckingConnection
                ? "Checking connection"
                : isRefreshing
                  ? "Refreshing queue"
                  : "Refresh queue"}
            </Button>
          </div>
        </section>

        {error && !isLoading && (
          <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
            {String(error.message ?? error)}
          </p>
        )}

        {/* Loading overlay covers cards and blocks all interaction. */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <PillProgress3D
              progress={loadingProgress}
              label={loadingLabel}
              width={420}
              height={60}
            />
          </div>
        )}

        <section
          className="flex flex-wrap justify-around gap-8 px-4"
          style={isLoading ? { pointerEvents: "none", opacity: 0.35 } : undefined}
        >
          {orderedItems.map((item) => (
            <div key={item.id || `card-${item.index}`} className="w-full max-w-[650px]">
              <AISummaryCard
                item={item}
                onRegenerate={() => refresh()}
                isRegenerating={isLoading}
              />
            </div>
          ))}
          {!isLoading && items.length === 0 && !error && (
            <p className="text-slate-500 text-sm">No items in queue.</p>
          )}
        </section>
      </main>

      <QuickReadModal
        open={quickReadOpen}
        onClose={() => setQuickReadOpen(false)}
        items={items}
      />

      <TtsConfigModal
        open={ttsConfigOpen}
        onClose={() => setTtsConfigOpen(false)}
      />

      <ResearchTestModal
        open={researchTestOpen}
        onClose={() => setResearchTestOpen(false)}
      />
    </div>
  );
}

function isSummaryTone(value: string | null | undefined): value is SummaryTone {
  return SUMMARY_TONE_OPTIONS.includes(value as SummaryTone);
}

function readStoredSummaryTone(): SummaryTone {
  const savedTone = readLocal<string>(SUMMARY_TONE_STORAGE_KEY);
  return isSummaryTone(savedTone) ? savedTone : DEFAULT_SUMMARY_TONE;
}

function useStoredSummaryTone(): SummaryTone {
  return useSyncExternalStore(
    (onStoreChange) => subscribeLocal(SUMMARY_TONE_STORAGE_KEY, onStoreChange),
    readStoredSummaryTone,
    () => DEFAULT_SUMMARY_TONE
  );
}
