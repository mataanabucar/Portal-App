"use client";

import Link from "next/link";
import { BrainCircuit, ChevronRight, Database, FileJson2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PillProgress3D } from "@/components/ui/PillProgress3D";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardResponse, ParsedPortalItem, SummaryResult } from "@/lib/types";

export function AITracePage() {
  const { data, error, isLoading, loadingProgress, loadingLabel, refresh } = useDashboard({
    includeSummary: true,
  });

  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <main className="flex-1 min-w-0 px-5 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-[28px] border border-slate-700/40 bg-[linear-gradient(135deg,rgba(14,24,42,0.96),rgba(9,14,28,0.92))] px-6 py-6 shadow-[0_24px_80px_rgba(2,8,24,0.38)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.28em] text-cyan-300/85">
                  AI Trace
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-100 sm:text-[2.1rem]">
                  What the models saw, and what came back
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  This view breaks the dashboard AI flow into two lanes: TeamGPT for the
                  readable queue brief, OpenAI for the structured parser that turns the queue
                  into action cards. Each lane shows what was prepared, and what came back.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-slate-600/60 hover:border-cyan-500"
                >
                  <Link href="/">
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    Queue
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={refresh}
                  disabled={isLoading}
                  className="rounded-full border-cyan-600/40 text-cyan-200 hover:border-cyan-400"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh trace
                </Button>
              </div>
            </div>
          </section>

          {error && !data && !isLoading && (
            <p className="rounded-2xl border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {String(error.message ?? error)}
            </p>
          )}

          {isLoading && !data ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center">
              <PillProgress3D
                progress={loadingProgress}
                label={loadingLabel}
                width={420}
                height={60}
              />
            </div>
          ) : data ? (
            <AITraceContent data={data} isLoading={isLoading} refresh={refresh} />
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
    </div>
  );
}

function AITraceContent({
  data,
  isLoading,
  refresh,
}: {
  data: DashboardResponse;
  isLoading: boolean;
  refresh: () => void;
}) {
  const summary = data.summary;
  const parsedItems = data.parser.parsed?.items || [];

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
        <MetricCard
          kicker="Snapshot"
          title={`${data.snapshot.recordCount} visible request${data.snapshot.recordCount === 1 ? "" : "s"}`}
          body={`Fetched ${formatDateTime(data.snapshot.fetchedAt)} from ${data.snapshot.title || "the current queue"}.`}
          accent="cyan"
          icon={Database}
          meta={[
            `Source: ${data.snapshot.source || "Unknown"}`,
            `Preview chars: ${data.snapshot.rawPreview?.length || 0}`,
          ]}
        />
        <MetricCard
          kicker="TeamGPT"
          title={summary?.enabled === false ? "Queue brief unavailable" : summary?.model || "Not captured"}
          body={buildSummaryStatus(summary)}
          accent="violet"
          icon={BrainCircuit}
          meta={[
            `Provider: ${summary?.provider || summary?.trace?.provider || "Unknown"}`,
            `Focus: ${summary?.suggestedFocus || "General queue guidance"}`,
          ]}
        />
        <MetricCard
          kicker="OpenAI"
          title={`${data.parser.model} (${data.parser.mode})`}
          body={
            data.parser.mode === "structured"
              ? `${parsedItems.length} parsed item${parsedItems.length === 1 ? "" : "s"} came back from the structured parser.`
              : "The OpenAI parser is in raw response mode, so it returned free-form text."
          }
          accent="emerald"
          icon={FileJson2}
          meta={[
            `Request ID: ${data.parser.debug.requestId}`,
            `Response ID: ${data.parser.debug.openaiResponseId || "Not returned"}`,
          ]}
        />
      </section>

      {summary?.reason && (
        <p className="rounded-2xl border border-amber-700/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
          {summary.reason}
        </p>
      )}

      <ProviderSection
        provider="TeamGPT"
        title="Queue brief flow"
        description="This is the high-level readable summary of the queue. It should show the summary instructions, the queue text TeamGPT received, and the brief it returned."
      >
        <section className="grid gap-5 xl:grid-cols-2">
          <TraceCard
            kicker="TeamGPT"
            title="What we sent for the queue brief"
            eyebrow={summary?.trace?.model || summary?.model || "Not captured"}
          >
            <TraceMetaGrid
              rows={[
                ["Provider", summary?.trace?.provider || summary?.provider || "Unknown"],
                ["Focus", summary?.suggestedFocus || "General queue guidance"],
                ["Input size", formatCount(summary?.trace?.inputLength)],
                ["Endpoint", summary?.trace?.endpoint || "N/A for this provider"],
              ]}
            />
            <TraceTextBlock
              label="Instructions"
              text={summary?.trace?.instructions}
              empty="This summary snapshot was captured before request tracing was added."
            />
            <TraceTextBlock
              label="Queue text sent to TeamGPT"
              text={summary?.trace?.input}
              empty="No TeamGPT summary input was captured for this run."
              tone="muted"
            />
          </TraceCard>

          <TraceCard
            kicker="TeamGPT"
            title="What came back from the queue brief"
            eyebrow={summary?.enabled === false ? "Fallback" : "Returned text"}
          >
            <HumanText text={summary?.summary} empty="No TeamGPT summary text was returned." />
          </TraceCard>
        </section>

      </ProviderSection>

      <ProviderSection
        provider="OpenAI"
        title="Structured parser flow"
        description="This is the extraction pass that turns the queue into card-ready fields. It shows the large parser input, the exact parser request, and the structured output returned by OpenAI."
      >
        <section className="grid gap-5 xl:grid-cols-2">
          <TraceCard
            kicker="OpenAI"
            title="What we sent for item extraction"
            eyebrow={`${data.parser.model} • ${data.parser.mode}`}
          >
            <TraceMetaGrid
              rows={[
                ["Mode", data.parser.mode],
                ["Original text size", formatCount(data.parser.originalText?.length)],
                ["Request endpoint", data.parser.debug.endpoint],
                ["Response format", data.parser.debug.responseVersion],
              ]}
            />
            <TraceTextBlock
              label="Portal text sent to OpenAI"
              text={data.parser.originalText}
              empty="No OpenAI parser input was captured."
              tone="muted"
            />
          </TraceCard>

          <TraceCard
            kicker="OpenAI"
            title="What came back from item extraction"
            eyebrow={data.parser.mode === "structured" ? "Structured response" : "Raw response"}
          >
            {data.parser.mode === "structured" ? (
              <ParsedItemsPreview items={parsedItems} />
            ) : (
              <HumanText
                text={typeof data.parser.responseText === "string" ? data.parser.responseText : ""}
                empty="No raw OpenAI parser response was returned."
              />
            )}
          </TraceCard>
        </section>

      </ProviderSection>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={refresh}
          disabled={isLoading}
          className="rounded-full border-slate-600 hover:border-cyan-500"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh trace
        </Button>
      </div>
    </>
  );
}

function ProviderSection({
  provider,
  title,
  description,
  children,
}: {
  provider: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-[28px] border border-slate-700/35 bg-slate-950/35 p-5">
      <div className="max-w-4xl">
        <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.28em] text-slate-400">
          {provider}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  kicker,
  title,
  body,
  meta,
  icon: Icon,
  accent,
}: {
  kicker: string;
  title: string;
  body: string;
  meta: string[];
  icon: typeof Database;
  accent: "cyan" | "violet" | "emerald";
}) {
  const accentMap = {
    cyan: "border-cyan-700/30 bg-cyan-950/15 text-cyan-200",
    violet: "border-violet-700/30 bg-violet-950/15 text-violet-200",
    emerald: "border-emerald-700/30 bg-emerald-950/15 text-emerald-200",
  } as const;

  return (
    <article className="rounded-[24px] border border-slate-700/35 bg-slate-950/40 p-5 shadow-[0_18px_45px_rgba(2,8,24,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.26em] text-slate-400">
            {kicker}
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-100">{title}</h2>
        </div>
        <div className={`rounded-2xl border px-3 py-3 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
      <ul className="mt-4 space-y-2 text-xs leading-6 text-slate-400">
        {meta.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

function TraceCard({
  kicker,
  title,
  eyebrow,
  children,
}: {
  kicker: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[26px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(7,12,24,0.92))] p-5 shadow-[0_20px_54px_rgba(3,8,18,0.34)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.26em] text-slate-400">
            {kicker}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-100">{title}</h2>
        </div>
        {eyebrow ? (
          <span className="rounded-full border border-slate-700/50 bg-slate-900/70 px-3 py-1 text-[0.72rem] font-semibold text-slate-300">
            {eyebrow}
          </span>
        ) : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </article>
  );
}

function TraceMetaGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{value || "Not provided"}</p>
        </div>
      ))}
    </div>
  );
}

function TraceTextBlock({
  label,
  text,
  empty,
  tone = "default",
}: {
  label: string;
  text?: string | null;
  empty: string;
  tone?: "default" | "muted";
}) {
  return (
    <section>
      <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <div
        className={`mt-2 rounded-2xl border px-4 py-4 text-sm leading-7 whitespace-pre-wrap ${
          tone === "muted"
            ? "border-slate-800/70 bg-slate-950/55 text-slate-300"
            : "border-slate-700/60 bg-slate-900/70 text-slate-200"
        }`}
      >
        {text?.trim() || empty}
      </div>
    </section>
  );
}

function HumanText({ text, empty }: { text?: string | null; empty: string }) {
  const lines = splitTextLines(text);

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-sm leading-7 text-slate-400">
        {empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div
              key={`${line}-${index}`}
              className="grid grid-cols-[14px_1fr] gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm leading-7 text-slate-200"
            >
              <span className="mt-2 h-2 w-2 rounded-full bg-cyan-400" />
              <p>{line.slice(2).trim()}</p>
            </div>
          );
        }

        return (
          <p
            key={`${line}-${index}`}
            className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm leading-7 text-slate-200"
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ParsedItemsPreview({ items }: { items: ParsedPortalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-sm leading-7 text-slate-400">
        No structured items were returned.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <article
          key={`${item.title}-${index}`}
          className="rounded-[22px] border border-slate-800/70 bg-slate-900/60 px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                Item {index + 1}
              </p>
              <h3 className="mt-2 text-base font-bold leading-6 text-slate-100">
                {item.title || "Untitled request"}
              </h3>
            </div>
            <span className="rounded-full border border-slate-700/50 bg-slate-950/70 px-3 py-1 text-[0.72rem] font-semibold text-slate-300">
              {item.status?.label || "No status"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CompactField label="Next action" value={item.nextAction} />
            <CompactField label="Deliverable" value={item.deliverable} />
            <CompactField label="Urgency" value={item.urgency} />
            <CompactField label="Confidence" value={item.confidence?.level || item.confidence?.reason} />
          </div>

          <div className="mt-4">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Summary
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              {item.summary || "No summary returned for this item."}
            </p>
          </div>

          {item.blockersOpenQuestions?.length ? (
            <div className="mt-4">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                Blockers and open questions
              </p>
              <ul className="mt-2 space-y-2">
                {item.blockersOpenQuestions.map((blocker, blockerIndex) => (
                  <li
                    key={`${blocker}-${blockerIndex}`}
                    className="rounded-xl border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-sm leading-6 text-slate-300"
                  >
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function CompactField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-950/55 px-3 py-3">
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value?.trim() || "Not returned"}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[28px] border border-slate-700/40 bg-slate-950/45 px-6 py-8 text-sm leading-7 text-slate-300">
      No AI trace is available yet. Open the queue and refresh it once so the dashboard payload can
      be captured.
    </section>
  );
}

function buildSummaryStatus(summary: SummaryResult | null) {
  if (!summary) {
    return "No queue summary was returned for this snapshot.";
  }

  if (summary.enabled === false) {
    return summary.reason || "The summary provider did not return a response.";
  }

  return "Summary text returned successfully and is available below in readable form.";
}

function splitTextLines(text?: string | null) {
  if (!text?.trim()) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Unknown time";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatCount(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unknown";
  }

  return `${value.toLocaleString()} characters`;
}
