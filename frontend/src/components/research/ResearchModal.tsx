"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Send,
  ExternalLink,
  ChevronDown,
  Search,
  AlertTriangle,
  CheckCircle2,
  Rocket,
  ShieldAlert,
  User,
  FileText,
  BarChart3,
  Code2,
  BookOpen,
  BookMarked,
  HelpCircle,
  ListChecks,
  Info,
  Volume2,
  Loader2,
  Square,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { PillProgress3D } from "@/components/ui/PillProgress3D";
import { readLocal, writeLocal } from "@/lib/storage";
import { api } from "@/lib/api";
import {
  type TtsState,
  VOICE_REPLAY_TTS_INSTRUCTIONS,
  playPortalTts,
  stopPortalTts,
} from "@/lib/tts";
import { readTtsConfig, buildAfChain } from "@/lib/ttsConfig";
import {
  buildQuickTakeTtsText,
  buildOverviewTtsText,
  buildMissingInfoTtsText,
  buildActionsTtsText,
  buildResearchVoiceReplayReport,
} from "@/lib/ttsBuildText";
import type {
  DashboardCardItem,
  ResearchFinding,
  ResearchMessage,
  ResearchReport,
  RetrievalStep,
} from "@/lib/types";

interface ResearchModalProps {
  open: boolean;
  onClose: () => void;
  item: DashboardCardItem;
}

type TabId = "overview" | "code" | "kb" | "docs" | "missing" | "actions";

function buildItemContext(item: DashboardCardItem): string {
  const kd = (label: string) =>
    item.keyDetails.find((r) => r.label === label)?.value ?? "";

  const lines = [
    `Title: ${item.title}`,
    item.summary && `Summary: ${item.summary}`,
    item.nextAction && `Next Action: ${item.nextAction}`,
    item.blockersOpenQuestions.length > 0 &&
      `Blockers: ${item.blockersOpenQuestions.join("; ")}`,
    kd("Related Action Item") && `Related Action Item: ${kd("Related Action Item")}`,
    kd("Application") && `Application: ${kd("Application")}`,
    kd("Request Type") && `Request Type: ${kd("Request Type")}`,
    kd("Request ID") && `Request ID: ${kd("Request ID")}`,
    kd("Business / Customer") && `Customer: ${kd("Business / Customer")}`,
    kd("References / Fields") && `References / Fields: ${kd("References / Fields")}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function buildInitialQuery(): string {
  return (
    `Research this portal item and help me understand how to resolve it.\n\n` +
    `Find relevant code, existing feature implementations, known limitations, ` +
    `and any patterns in the codebase that would help address this request.`
  );
}

function keyDetail(item: DashboardCardItem, ...labels: string[]): string {
  for (const label of labels) {
    const value = item.keyDetails.find((r) => r.label === label)?.value ?? "";
    if (value && value.toLowerCase() !== "not visible") return value;
  }
  return "";
}

export function ResearchModal({ open, onClose, item }: ResearchModalProps) {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [codeFindings, setCodeFindings] = useState<ResearchFinding[]>([]);
  const [kbFindings, setKbFindings] = useState<ResearchFinding[]>([]);
  const [docsFindings, setDocsFindings] = useState<ResearchFinding[]>([]);
  const [retrievalTrail, setRetrievalTrail] = useState<RetrievalStep[]>([]);
  const [messages, setMessages] = useState<ResearchMessage[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [chatUrl, setChatUrl] = useState<string | null>(null);
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [ttsActiveKey, setTtsActiveKey] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const voiceReplayAbortRef = useRef<AbortController | null>(null);
  const crawlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const itemContext = useMemo(() => buildItemContext(item), [item]);

  // Crawl animation while loading.
  useEffect(() => {
    if (loading) {
      setLoadProgress(0);
      crawlRef.current = setInterval(() => {
        setLoadProgress((p) => p + Math.max(0.4, (85 - p) * 0.045));
      }, 120);
    } else {
      if (crawlRef.current) clearInterval(crawlRef.current);
      if (report) setLoadProgress(100);
    }
    return () => {
      if (crawlRef.current) clearInterval(crawlRef.current);
    };
  }, [loading, report]);

  // Fire the initial research run when the modal opens.
  useEffect(() => {
    if (!open) return;
    setReport(null);
    setCodeFindings([]);
    setKbFindings([]);
    setDocsFindings([]);
    setRetrievalTrail([]);
    setMessages([]);
    setActiveTab("overview");
    setInput("");
    setError(null);
    setChatUrl(null);
    runResearch(buildInitialQuery(), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!loading && report) inputRef.current?.focus();
  }, [loading, report]);

  async function runResearch(query: string, history: ResearchMessage[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.research({ query, messages: history, itemContext });
      setReport(res.report);
      setCodeFindings(res.codeFindings ?? []);
      setKbFindings(res.kbFindings ?? []);
      setDocsFindings(res.docsFindings ?? []);
      setRetrievalTrail(res.retrievalTrail ?? []);
      if (res.chatUrl) setChatUrl(res.chatUrl);
      setActiveTab("overview");
      setMessages([
        ...history,
        { role: "user", content: query },
        { role: "assistant", content: res.report?.summaryOfIssue || "" },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    runResearch(q, messages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function buildResearchReplayText(key: string, sectionLabel: string, sectionText: string) {
    if (!report) {
      throw new Error("Research report is not ready.");
    }

    const reportText = buildResearchVoiceReplayReport({
      item,
      report,
      sectionLabel,
      sectionText,
    });
    const abortController = new AbortController();
    voiceReplayAbortRef.current = abortController;

    const res = await fetch("/api/tts/card-replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportText,
        item: {
          replayType: "research-section",
          sectionKey: key,
          sectionLabel,
          portalItem: item,
          researchReport: report,
        },
      }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((errBody as { error?: string }).error ?? res.statusText);
    }

    const payload = (await res.json()) as { text?: string };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) {
      throw new Error("Research voice replay returned empty text.");
    }
    return text;
  }

  async function handleModalListen(key: string, text: string, sectionLabel = "Research section") {
    const cfg = readTtsConfig();
    stopPortalTts();
    voiceReplayAbortRef.current?.abort();
    setTtsActiveKey(key);
    setTtsError(null);
    setTtsState("loading");

    try {
      const replayText = await buildResearchReplayText(key, sectionLabel, text);
      voiceReplayAbortRef.current = null;
      await playPortalTts({
        text: replayText,
        voice: cfg.voice,
        instructions: VOICE_REPLAY_TTS_INSTRUCTIONS,
        speed: cfg.speed,
        playbackRate: cfg.playbackRate,
        format: cfg.responseFormat,
        volume: cfg.volume,
        afChain: buildAfChain(cfg),
        onStateChange: (state) => {
          setTtsState(state);
          if (state === "idle") setTtsActiveKey(null);
        },
        onError: (msg) => {
          setTtsError(msg);
          setTimeout(() => setTtsError(null), 4000);
        },
      });
    } catch (err) {
      voiceReplayAbortRef.current = null;
      if ((err as Error).name === "AbortError") return;
      setTtsState("idle");
      setTtsActiveKey(null);
      setTtsError((err as Error).message);
      setTimeout(() => setTtsError(null), 4000);
    }
  }

  function handleModalStop() {
    voiceReplayAbortRef.current?.abort();
    voiceReplayAbortRef.current = null;
    stopPortalTts();
    setTtsState("idle");
    setTtsActiveKey(null);
  }

  const ttsLoadingKey = ttsState !== "idle" ? ttsActiveKey : null;

  if (!open) return null;

  const showReport = !loading && report;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col w-full max-w-4xl h-[90vh] bg-[#0a0e1a] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/70 shrink-0">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-950/60 border border-violet-700/40 shrink-0">
              <Search className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-violet-400 uppercase">
                Code + KB Research
              </p>
              <p className="text-sm font-semibold text-slate-200 truncate">{item.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0 flex-wrap justify-end">
            {ttsState !== "idle" && (
              <div className="flex items-center gap-1.5 text-xs border border-slate-700/40 rounded-lg px-2.5 py-1.5 bg-slate-900/60">
                {ttsState === "loading" ? (
                  <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                )}
                <span className="text-teal-300 font-medium">
                  {ttsState === "loading" ? "Generating audio..." : "Reading aloud"}
                </span>
                <button
                  onClick={handleModalStop}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-0.5"
                  title="Stop"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              </div>
            )}
            {ttsError && (
              <span className="text-xs text-red-400">{ttsError}</span>
            )}
            {chatUrl && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-violet-300 transition-colors"
                title="View in Sourcebot"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <PillProgress3D
                progress={loadProgress}
                label="RESEARCHING CODE + KB..."
                width={400}
                height={54}
              />
              <p className="text-xs text-slate-500">Searching Benchmark Digital repos and Knowledge Base…</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-6">
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
                {error}
              </p>
            </div>
          )}

          {showReport && (
            <div className="px-6 py-5 space-y-5">
              <QuickTake
                report={report}
                onListen={() =>
                  handleModalListen("quicktake", buildQuickTakeTtsText(report), "Quick Take")
                }
                ttsLoading={ttsLoadingKey === "quicktake"}
              />
              <StatusCards item={item} report={report} />
              <Tabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                codeCount={codeFindings.length}
                kbCount={kbFindings.length}
                docsCount={docsFindings.length}
                missingCount={report.whatIsMissing.length}
                actionCount={report.actionItems.length}
              />
              <TabContent
                activeTab={activeTab}
                report={report}
                codeFindings={codeFindings}
                kbFindings={kbFindings}
                docsFindings={docsFindings}
                retrievalTrail={retrievalTrail}
                itemId={item.id}
                onListen={handleModalListen}
                ttsLoadingKey={ttsLoadingKey}
              />
            </div>
          )}
        </div>

        {/* Follow-up input */}
        <div className="shrink-0 border-t border-slate-800/70 px-4 py-3 flex items-end gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-950/60 border border-violet-700/40 shrink-0">
            <Search className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question…"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none bg-slate-900/70 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 disabled:opacity-40 max-h-28 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <Button
            variant="outline"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-xl border-violet-600/40 text-violet-300 hover:border-violet-400 shrink-0 h-10 w-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Take ────────────────────────────────────────────────────────────────

function QuickTake({
  report,
  onListen,
  ttsLoading,
}: {
  report: ResearchReport;
  onListen?: () => void;
  ttsLoading?: boolean;
}) {
  const { quickTake } = report;
  if (!quickTake.issue && !quickTake.whatWeKnow && !quickTake.nextStep) return null;

  return (
    <div className="rounded-2xl border border-violet-800/40 bg-violet-950/20 p-4 flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-violet-900/50 border border-violet-700/40 flex items-center justify-center shrink-0">
        <Search className="w-4 h-4 text-violet-300" />
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-violet-300 uppercase">
            Quick Take
          </p>
          {onListen && (
            <button
              onClick={onListen}
              className="text-slate-500 hover:text-teal-300 transition-colors"
              title="Listen to Quick Take"
            >
              {ttsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
        {quickTake.issue && (
          <QuickTakeRow icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} label="Issue" text={quickTake.issue} />
        )}
        {quickTake.whatWeKnow && (
          <QuickTakeRow icon={<CheckCircle2 className="w-4 h-4 text-cyan-400" />} label="What we know" text={quickTake.whatWeKnow} />
        )}
        {quickTake.nextStep && (
          <QuickTakeRow icon={<Rocket className="w-4 h-4 text-violet-300" />} label="Next step" text={quickTake.nextStep} />
        )}
      </div>
    </div>
  );
}

function QuickTakeRow({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm text-slate-300 leading-relaxed">
        <span className="font-semibold text-slate-100">{label}:</span> {text}
      </p>
    </div>
  );
}

// ── Status cards ────────────────────────────────────────────────────────────────

function StatusCards({ item, report }: { item: DashboardCardItem; report: ResearchReport }) {
  const owner = keyDetail(item, "Assigned Lead", "Requester") || "Unassigned";
  const requestType = keyDetail(item, "Request Type") || "—";
  const statusColor = statusToneColor(item.status.label);
  const conf = report.confidence;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatusCard
        icon={<ShieldAlert className={`w-4 h-4 ${statusColor.text}`} />}
        label="Status"
        value={
          <span className="flex items-center gap-1.5">
            {item.status.label || "—"}
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
          </span>
        }
      />
      <StatusCard icon={<User className="w-4 h-4 text-cyan-400" />} label="Owner" value={owner} />
      <StatusCard icon={<FileText className="w-4 h-4 text-slate-400" />} label="Request Type" value={requestType} />
      <StatusCard
        icon={<BarChart3 className={`w-4 h-4 ${confidenceColor(conf.level).text}`} />}
        label="Confidence"
        value={
          <span className="flex flex-col">
            <span className={confidenceColor(conf.level).text}>{conf.level}</span>
            <span className="text-[0.65rem] font-normal text-slate-500">
              {conf.criticalGaps} critical gap{conf.criticalGaps !== 1 ? "s" : ""}
            </span>
          </span>
        }
      />
    </div>
  );
}

function StatusCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[0.65rem] font-medium tracking-wide text-slate-500 uppercase">{label}</span>
      </div>
      <div className="text-sm font-semibold text-slate-200 truncate">{value}</div>
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────────

const TAB_META: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Info className="w-3.5 h-3.5" /> },
  { id: "code", label: "Code Findings", icon: <Code2 className="w-3.5 h-3.5" /> },
  { id: "kb", label: "KB Findings", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "docs", label: "Docs", icon: <BookMarked className="w-3.5 h-3.5" /> },
  { id: "missing", label: "Missing Info", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: "actions", label: "Actions", icon: <ListChecks className="w-3.5 h-3.5" /> },
];

function Tabs({
  activeTab,
  setActiveTab,
  codeCount,
  kbCount,
  docsCount,
  missingCount,
  actionCount,
}: {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  codeCount: number;
  kbCount: number;
  docsCount: number;
  missingCount: number;
  actionCount: number;
}) {
  const counts: Record<TabId, number | null> = {
    overview: null,
    code: codeCount,
    kb: kbCount,
    docs: docsCount,
    missing: missingCount,
    actions: actionCount,
  };

  return (
    <div className="flex items-center gap-1 border-b border-slate-800/70 overflow-x-auto">
      {TAB_META.map((tab) => {
        const active = tab.id === activeTab;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px ${
              active
                ? "border-violet-500 text-violet-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
            {count != null && count > 0 && (
              <span className="ml-0.5 text-[0.65rem] font-mono px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TabContent({
  activeTab,
  report,
  codeFindings,
  kbFindings,
  docsFindings,
  retrievalTrail,
  itemId,
  onListen,
  ttsLoadingKey,
}: {
  activeTab: TabId;
  report: ResearchReport;
  codeFindings: ResearchFinding[];
  kbFindings: ResearchFinding[];
  docsFindings: ResearchFinding[];
  retrievalTrail: RetrievalStep[];
  itemId: string;
  onListen?: (key: string, text: string, sectionLabel?: string) => void;
  ttsLoadingKey?: string | null;
}) {
  if (activeTab === "overview") {
    return (
      <div className="space-y-5">
        <Section
          number={1}
          title="Summary of the Issue"
          icon={<FileText className="w-4 h-4 text-violet-400" />}
          onListen={onListen ? () => onListen("overview", buildOverviewTtsText(report), "Overview") : undefined}
          ttsLoading={ttsLoadingKey === "overview"}
        >
          {report.summaryOfIssue ? (
            <MarkdownBody content={report.summaryOfIssue} />
          ) : (
            <EmptyLine text="No summary available." />
          )}
        </Section>

        <Section number={2} title="What We Found" icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}>
          <BulletList items={report.whatWeFound} emptyText="No concrete findings yet." />
        </Section>

        <Section number={3} title="What Is Missing" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}>
          <BulletList items={report.whatIsMissing} emptyText="Nothing flagged as missing." />
        </Section>

        <Section number={4} title="Recommended Next Searches" icon={<Search className="w-4 h-4 text-cyan-400" />}>
          <SearchChips terms={report.recommendedSearches} />
        </Section>

        <Section number={5} title="Action Items" icon={<ListChecks className="w-4 h-4 text-violet-400" />}>
          <ActionItemsTable items={report.actionItems} itemId={itemId} />
        </Section>
      </div>
    );
  }

  if (activeTab === "code") {
    return <FindingsList findings={codeFindings} emptyText="No code evidence found for this item." trail={retrievalTrail} />;
  }

  if (activeTab === "kb") {
    return <FindingsList findings={kbFindings} emptyText="No Knowledge Base articles matched this item." />;
  }

  if (activeTab === "docs") {
    return <FindingsList findings={docsFindings} emptyText="No internal documentation matched this item." />;
  }

  if (activeTab === "missing") {
    return (
      <Section
        title="What Is Missing"
        icon={<HelpCircle className="w-4 h-4 text-amber-400" />}
        onListen={onListen ? () => onListen("missing", buildMissingInfoTtsText(report), "Missing Info") : undefined}
        ttsLoading={ttsLoadingKey === "missing"}
      >
        <BulletList items={report.whatIsMissing} emptyText="Nothing flagged as missing." />
      </Section>
    );
  }

  return (
    <Section
      title="Action Items"
      icon={<ListChecks className="w-4 h-4 text-violet-400" />}
      onListen={onListen ? () => onListen("actions", buildActionsTtsText(report), "Actions") : undefined}
      ttsLoading={ttsLoadingKey === "actions"}
    >
      <ActionItemsTable items={report.actionItems} itemId={itemId} />
    </Section>
  );
}

// ── Building blocks ───────────────────────────────────────────────────────────

function Section({
  number,
  title,
  icon,
  children,
  onListen,
  ttsLoading,
}: {
  number?: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onListen?: () => void;
  ttsLoading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        {number != null && (
          <span className="w-5 h-5 rounded-md bg-violet-900/60 border border-violet-700/40 text-[0.65rem] font-bold text-violet-300 flex items-center justify-center">
            {number}
          </span>
        )}
        {icon}
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {onListen && (
          <button
            onClick={onListen}
            className="ml-auto text-slate-500 hover:text-teal-300 transition-colors"
            title="Listen to this section"
          >
            {ttsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items || items.length === 0) return <EmptyLine text={emptyText} />;
  return (
    <ul className="space-y-1.5">
      {items.map((entry, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
          <span className="mt-2 w-1 h-1 rounded-full bg-violet-500 shrink-0" />
          <span className="min-w-0">
            <MarkdownInline content={entry} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SearchChips({ terms }: { terms: string[] }) {
  if (!terms || terms.length === 0) return <EmptyLine text="No suggested searches." />;
  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((term, i) => (
        <span
          key={i}
          className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-800/70 border border-slate-700/50 text-cyan-300"
        >
          {term}
        </span>
      ))}
    </div>
  );
}

function ActionItemsTable({ items, itemId }: { items: ResearchReport["actionItems"]; itemId: string }) {
  const storageKey = `research-actions:${itemId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(readLocal<Record<string, boolean>>(storageKey) ?? {});
  }, [storageKey]);

  if (!items || items.length === 0) return <EmptyLine text="No action items suggested." />;

  const toggle = (task: string) => {
    setChecked((prev) => {
      const next = { ...prev, [task]: !prev[task] };
      writeLocal(storageKey, next);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[0.65rem] uppercase tracking-wide text-slate-500 border-b border-slate-800/70">
            <th className="font-medium pb-2 pl-1 w-8"></th>
            <th className="font-medium pb-2">Task</th>
            <th className="font-medium pb-2 w-36">Owner</th>
            <th className="font-medium pb-2 w-28">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((action, i) => {
            const isDone = !!checked[action.task];
            return (
              <tr key={i} className="border-b border-slate-800/40 last:border-0">
                <td className="py-2.5 pl-1 align-top">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggle(action.task)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-violet-500 cursor-pointer"
                  />
                </td>
                <td className={`py-2.5 pr-3 text-slate-300 ${isDone ? "line-through text-slate-500" : ""}`}>
                  {action.task}
                </td>
                <td className="py-2.5 pr-3 align-top">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="w-3 h-3 text-violet-400" />
                    {action.owner}
                  </span>
                </td>
                <td className="py-2.5 align-top">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-emerald-400" : "bg-slate-500"}`} />
                    {isDone ? "Done" : action.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FindingsList({
  findings,
  emptyText,
  trail,
}: {
  findings: ResearchFinding[];
  emptyText: string;
  trail?: RetrievalStep[];
}) {
  if (!findings || findings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-8 text-center">
          <p className="text-sm text-slate-500">{emptyText}</p>
        </div>
        {trail && trail.length > 0 && <RetrievalTrail steps={trail} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((finding, i) => (
        <div key={i} className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-semibold text-slate-200 truncate">{finding.label}</p>
            <div className="flex items-center gap-2 shrink-0">
              {finding.language && (
                <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                  {finding.language}
                </span>
              )}
              {finding.webUrl && (
                <a
                  href={finding.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-violet-300 transition-colors"
                  title="Open source"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          {finding.location && finding.location !== finding.label && (
            <p className="text-xs font-mono text-slate-500 mb-2 truncate">{finding.location}</p>
          )}
          {finding.snippets &&
            (finding.language === "Genny Studio" ? (
              // aris_search returns a finished markdown answer — render it as
              // formatted prose, not a monospace code block.
              <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-3 overflow-y-auto max-h-96">
                <MarkdownBody content={finding.snippets} />
              </div>
            ) : (
              <pre className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-3 overflow-x-auto text-xs text-emerald-300 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-72">
                {finding.snippets}
              </pre>
            ))}
        </div>
      ))}
      {trail && trail.length > 0 && <RetrievalTrail steps={trail} />}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-slate-500 italic">{text}</p>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusToneColor(label: string): { text: string; dot: string } {
  const v = label.toLowerCase();
  if (v.includes("block") || v.includes("overdue") || v.includes("urgent")) {
    return { text: "text-red-400", dot: "bg-red-500" };
  }
  if (v.includes("closed") || v.includes("done") || v.includes("complete") || v.includes("ready")) {
    return { text: "text-emerald-400", dot: "bg-emerald-500" };
  }
  if (v.includes("progress") || v.includes("review") || v.includes("waiting") || v.includes("pending")) {
    return { text: "text-amber-400", dot: "bg-amber-500" };
  }
  return { text: "text-cyan-400", dot: "bg-cyan-500" };
}

function confidenceColor(level: string): { text: string } {
  if (level === "High") return { text: "text-emerald-400" };
  if (level === "Medium") return { text: "text-amber-400" };
  return { text: "text-red-400" };
}

// ── Markdown rendering (reused from the chat-era modal) ─────────────────────────

function MarkdownInline({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <span className="text-sm text-slate-300 leading-relaxed">{children}</span>,
        strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="text-xs font-mono text-emerald-300 bg-slate-900/60 rounded px-1 py-0.5">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5 text-sm text-slate-300">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5 text-sm text-slate-300">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all"
          >
            {children}
          </a>
        ),
        code: ({ className, children }) => {
          if (className === "language-mermaid") {
            return <MermaidDiagram code={String(children)} />;
          }
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <code className="block text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
                {children}
              </code>
            );
          }
          return (
            <code className="text-xs font-mono text-emerald-300 bg-slate-900/60 rounded px-1 py-0.5">{children}</code>
          );
        },
        pre: ({ children }) => {
          // Mermaid blocks render as a diagram div — don't wrap them in <pre>.
          const child = Array.isArray(children) ? children[0] : children;
          if (
            child &&
            typeof child === "object" &&
            "props" in child &&
            (child.props as { className?: string }).className === "language-mermaid"
          ) {
            return <>{children}</>;
          }
          return (
            <pre className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-3 my-2 overflow-x-auto text-xs">
              {children}
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function RetrievalTrail({ steps }: { steps: RetrievalStep[] }) {
  const [open, setOpen] = useState(false);
  const codeSteps = steps.filter((s) => s.tool !== "intent");

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[0.7rem] text-slate-500 hover:text-slate-400 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {codeSteps.length} retrieval step{codeSteps.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="mt-2 space-y-1 pl-1 border-l border-slate-800/60">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-[0.6rem] font-mono font-bold uppercase text-slate-600 w-20">
                {step.tool}
              </span>
              <span className="text-[0.7rem] text-slate-500 leading-snug">{step.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
