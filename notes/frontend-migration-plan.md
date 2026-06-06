# Frontend Migration Plan
## Portal Visualizer → Next.js + TypeScript + Tailwind CSS + shadcn/ui + lucide-react

**Status:** Planning  
**Backend:** Keep existing Node.js / Express backend as-is  
**Goal:** Replace the vanilla JS `public/` frontend with a Next.js app

---

## 1. Target Architecture

```
portal-app/
├── src/server/               ← existing Express backend (no changes)
└── frontend/                 ← NEW: Next.js app
    ├── src/
    │   ├── app/              ← App Router pages
    │   ├── components/       ← UI components
    │   │   ├── ai-summary/
    │   │   ├── dashboard/
    │   │   └── ui/           ← shadcn auto-generated
    │   ├── hooks/            ← React hooks (useDashboard, etc.)
    │   └── lib/              ← types, API client, utils
    ├── tailwind.config.ts
    ├── components.json       ← shadcn config
    └── next.config.ts        ← proxies /api/* → Express on :3000
```

`next.config.ts` rewrites all `/api/*` calls to the existing Express server. No Express code changes required.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Icons | lucide-react |
| Data fetching | SWR (stale-while-revalidate) |

---

## 3. Phase 1 — Project Bootstrap

### 3.1 Create the Next.js app

```bash
# from the portal-app root
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd frontend
```

### 3.2 Install dependencies

```bash
# initialise shadcn — pick: Style: Default | Dark mode: class | Base color: Slate
npx shadcn@latest init

# shadcn components this app needs
npx shadcn@latest add card badge button separator tooltip dialog scroll-area

# other runtime deps
npm install lucide-react swr clsx tailwind-merge class-variance-authority
```

### 3.3 Configure API proxy

```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

```bash
# frontend/.env.local
BACKEND_URL=http://localhost:3000
```

### 3.4 Root layout — always dark

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Portal Visualizer" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07111f] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
```

---

## 4. Phase 2 — TypeScript Types

```typescript
// frontend/src/lib/types.ts

export type StatusTone  = "blocked" | "warning" | "active" | "ready" | "neutral";
export type PriorityTone = "normal" | "high" | "low" | "unknown";
export type DueTone     = "normal" | "soon" | "overdue" | "unknown";
export type ConfidenceLevel = "High" | "Medium" | "Low" | "";
export type ParserMode  = "structured" | "testchat";

export interface KeyDetailRow {
  label: string;
  value: string; // "Not visible" when the AI couldn't extract it
}

// The 12 fixed key-detail labels, in order
export const KEY_DETAIL_LABELS = [
  "Request ID", "Related Action Item", "Requester", "Application",
  "Business / Customer", "Request Type", "Origin", "Assigned Lead",
  "Due Date", "Priority / Risk", "Attachments", "References / Fields",
] as const;

export interface ParsedPortalItem {
  id?: string;
  href?: string;
  title: string;
  generatedAt: string;       // ISO 8601
  urgency: string;
  status:   { label: string; tone: StatusTone };
  priority: { label: string; tone: PriorityTone };
  due:      { date: string; relative: string; tone: DueTone };
  nextAction: string;
  summary: string;
  deliverable: string;
  blockersOpenQuestions: string[];
  urgencyText: string;
  keyDetails: KeyDetailRow[];
  requestHistorySignals: string;
  confidence: { level: ConfidenceLevel; reason: string };
  footer: { requested: string; lastUpdated: string };
}

export interface PortalMetrics {
  statusCounts: Record<string, number>;
  ownerCounts:  Record<string, number>;
  totalRecords: number;
}

export interface PortalRecord {
  id: string;
  href?: string;
  title?: string;
  status?: string;
  owner?: string;
  priority?: string;
  dueDate?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface PortalSnapshot {
  source: string;
  target: string;
  title: string;
  fetchedAt: string;
  recordCount: number;
  metrics: PortalMetrics;
  records: PortalRecord[];
  rawPreview: string;
}

export interface SummaryResult {
  enabled: boolean;
  model: string;
  reason: string | null;
  suggestedFocus: string | null;
  summary: string;
}

export interface ParserResult {
  enabled: boolean;
  model: string;
  mode: ParserMode;
  testchat: boolean;
  reason: string | null;
  originalText: string;
  request: unknown;
  parsed?: { items: ParsedPortalItem[] };
  responseText?: string;  // set only when testchat: true
  debug: {
    requestId: string;
    openaiResponseId: string | null;
    endpoint: string;
    mode: ParserMode;
    model: string;
    responseVersion: string;
  };
}

export interface DashboardResponse {
  snapshot: PortalSnapshot;
  summary: SummaryResult | null;
  parser: ParserResult;
}

export interface DashboardRequest {
  includeSummary?: boolean;
  focus?: string;
  parserFocus?: string;
  parserTestchat?: boolean;
  model?: string;
}

export interface HealthResponse {
  ok: boolean;
  config: {
    port: number;
    portal:    { mode: string; target: string | null; dataPath?: string | null };
    summarizer: { enabled: boolean; model: string; reason?: string | null };
    parser:    { enabled: boolean; model: string; reason?: string | null; testchatAllowed: boolean };
    ask:       { enabled: boolean; model: string; reason?: string | null };
  };
  testing: { usingTesterConfig: boolean };
  now: string;
}
```

---

## 5. Phase 3 — API Client + Data Hook

```typescript
// frontend/src/lib/api.ts
import type { DashboardResponse, DashboardRequest, HealthResponse } from "./types";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  health:         ()                    => get<HealthResponse>("/api/health"),
  dashboard:      (req: DashboardRequest = {}) => post<DashboardResponse>("/api/dashboard", req),
  dashboardCache: ()                    => get<DashboardResponse | null>("/api/dashboard/cache"),
};
```

```typescript
// frontend/src/hooks/useDashboard.ts
"use client";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { DashboardRequest, DashboardResponse } from "@/lib/types";

export function useDashboard(req: DashboardRequest = {}) {
  const key = JSON.stringify({ endpoint: "dashboard", ...req });

  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
    key,
    // Load from cache first; fall back to a fresh parse if nothing cached
    () => api.dashboardCache().then((cached) => cached ?? api.dashboard(req)),
    { revalidateOnFocus: false }
  );

  const refresh = () => mutate(api.dashboard(req), { revalidate: false });

  return { data, error, isLoading, refresh };
}
```

---

## 6. Phase 4 — Component Architecture

### File layout

```
src/components/
├── ai-summary/
│   ├── AISummaryCard.tsx       ← card root ("use client")
│   ├── TitleStatusPanel.tsx    ← large icon + title + pill row
│   ├── SummarySection.tsx      ← reusable section (icon · label · body)
│   ├── KeyDetailsPanel.tsx     ← right-column details table
│   └── StatusPill.tsx          ← status / priority / due chips
├── dashboard/
│   ├── DashboardPage.tsx       ← page orchestrator ("use client")
│   ├── DashboardHeader.tsx     ← title, refresh button, status pill
│   ├── TelemetryGrid.tsx       ← open / do-now / blocked stat cards
│   └── FocusGrid.tsx           ← priority spotlight + quick-read card
└── ui/                         ← shadcn auto-generated (do not edit)
```

---

### 6.1 StatusPill

```tsx
// src/components/ai-summary/StatusPill.tsx
import { TriangleAlert, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone, PriorityTone } from "@/lib/types";

const STATUS_CLS: Record<StatusTone, string> = {
  blocked: "text-amber-400 border-amber-500/40 bg-amber-950/40",
  warning: "text-yellow-400 border-yellow-500/30 bg-yellow-950/30",
  active:  "text-cyan-400  border-cyan-500/30  bg-cyan-950/30",
  ready:   "text-green-400 border-green-500/30 bg-green-950/30",
  neutral: "text-slate-400 border-slate-600/30 bg-transparent",
};

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold tracking-wide",
      STATUS_CLS[tone],
    )}>
      {tone === "blocked" && <TriangleAlert className="w-3 h-3" />}
      {label}
    </span>
  );
}

const PRIORITY_CLS: Record<PriorityTone, string> = {
  normal:  "text-green-400  border-green-500/30  bg-green-950/30",
  high:    "text-orange-400 border-orange-500/30 bg-orange-950/30",
  low:     "text-sky-400    border-sky-500/30    bg-sky-950/30",
  unknown: "text-slate-400  border-slate-600/30  bg-transparent",
};

export function PriorityPill({ label, tone }: { label: string; tone: PriorityTone }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold",
      PRIORITY_CLS[tone],
    )}>
      {label}
    </span>
  );
}

export function DuePill({ date, relative }: { date: string; relative: string }) {
  if (!date) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold text-violet-300 border-violet-500/30 bg-violet-950/30">
      <CalendarDays className="w-3 h-3 opacity-80" />
      Due: {date}{relative ? ` (${relative})` : ""}
    </span>
  );
}
```

---

### 6.2 SummarySection

```tsx
// src/components/ai-summary/SummarySection.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionKind =
  | "next-action" | "summary" | "deliverable"
  | "blockers" | "urgency" | "history" | "confidence";

const KIND: Record<SectionKind, { label: string; icon: string; card?: string }> = {
  "next-action": { label: "text-cyan-400",   icon: "bg-cyan-950/40  text-cyan-400" },
  summary:       { label: "text-violet-400", icon: "bg-violet-950/30 text-violet-400" },
  deliverable:   { label: "text-green-400",  icon: "bg-green-950/30 text-green-400" },
  blockers:      { label: "text-red-400",    icon: "bg-red-950/40   text-red-400",   card: "border-red-800/30 bg-red-950/20" },
  urgency:       { label: "text-amber-400",  icon: "bg-amber-950/30 text-amber-400", card: "border-amber-800/30 bg-amber-950/15" },
  history:       { label: "text-cyan-400",   icon: "bg-cyan-950/30  text-cyan-400" },
  confidence:    { label: "text-green-400",  icon: "bg-green-950/30 text-green-400" },
};

interface SummarySectionProps {
  kind: SectionKind;
  label: string;
  icon: LucideIcon;
  headingRight?: React.ReactNode;  // e.g. the confidence pill
  children: React.ReactNode;
}

export function SummarySection({ kind, label, icon: Icon, headingRight, children }: SummarySectionProps) {
  const s = KIND[kind];
  return (
    <div className={cn(
      "grid grid-cols-[34px_1fr] gap-3 items-start p-3 rounded-2xl border border-slate-700/30 bg-slate-900/80",
      s.card,
    )}>
      <div className={cn(
        "w-[34px] h-[34px] rounded-full flex items-center justify-center border border-white/10 flex-shrink-0",
        s.icon,
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={cn("text-[0.72rem] font-extrabold tracking-widest uppercase", s.label)}>
            {label}
          </p>
          {headingRight}
        </div>
        {children}
      </div>
    </div>
  );
}
```

---

### 6.3 KeyDetailsPanel

```tsx
// src/components/ai-summary/KeyDetailsPanel.tsx
import { Info, Hash, Link2, User, Monitor, Building2, FileText,
         Globe, CalendarDays, Flag, Paperclip, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KeyDetailRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON: Record<string, LucideIcon> = {
  "Request ID": Hash, "Related Action Item": Link2,
  "Requester": User, "Application": Monitor,
  "Business / Customer": Building2, "Request Type": FileText,
  "Origin": Globe, "Assigned Lead": User,
  "Due Date": CalendarDays, "Priority / Risk": Flag,
  "Attachments": Paperclip, "References / Fields": Tags,
};

export function KeyDetailsPanel({ rows }: { rows: KeyDetailRow[] }) {
  return (
    <div className="p-3 rounded-2xl border border-slate-700/30 bg-slate-900/80">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[0.72rem] font-extrabold tracking-widest uppercase text-cyan-400">
          Key Details
        </p>
        <Info className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="rounded-xl border border-slate-700/25 overflow-hidden">
        {rows.map((row, i) => {
          const RowIcon = ICON[row.label] ?? FileText;
          const missing = row.value === "Not visible";
          return (
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-[42%_1fr] gap-2 px-3 py-2 bg-slate-900/80 text-xs",
                i > 0 && "border-t border-slate-700/20",
              )}
            >
              <div className="flex items-center gap-2 text-slate-400 font-medium truncate">
                <RowIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="truncate">{row.label}</span>
              </div>
              <div className={cn("text-slate-200 leading-snug break-words", missing && "text-slate-500 italic")}>
                {row.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### 6.4 TitleStatusPanel

```tsx
// src/components/ai-summary/TitleStatusPanel.tsx
import { SearchCheck } from "lucide-react";
import { StatusPill, PriorityPill, DuePill } from "./StatusPill";
import type { ParsedPortalItem } from "@/lib/types";

export function TitleStatusPanel({ item }: { item: ParsedPortalItem }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 items-center p-3.5 rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-cyan-950/30 border border-cyan-700/20 flex-shrink-0">
        <SearchCheck className="w-7 h-7 text-cyan-400" />
      </div>
      <div className="grid gap-2 min-w-0">
        <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-100">
          {item.title}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {item.status?.label  && <StatusPill   label={item.status.label}   tone={item.status.tone} />}
          {item.priority?.label && <PriorityPill label={item.priority.label} tone={item.priority.tone} />}
          {item.due?.date       && <DuePill      date={item.due.date}        relative={item.due.relative} />}
        </div>
      </div>
    </div>
  );
}
```

---

### 6.5 AISummaryCard

```tsx
// src/components/ai-summary/AISummaryCard.tsx
"use client";
import {
  ArrowRight, FileText, BadgeCheck, TriangleAlert,
  Clock3, History, ShieldCheck, RefreshCw, ExternalLink,
  Sparkles, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TitleStatusPanel } from "./TitleStatusPanel";
import { SummarySection } from "./SummarySection";
import { KeyDetailsPanel } from "./KeyDetailsPanel";
import type { ParsedPortalItem } from "@/lib/types";

interface AISummaryCardProps {
  item: ParsedPortalItem;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function AISummaryCard({ item, onRegenerate, isRegenerating }: AISummaryCardProps) {
  const generatedLabel = item.generatedAt
    ? `Generated ${new Date(item.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";

  const footerText = [
    item.footer?.requested  && `Requested: ${item.footer.requested}`,
    item.footer?.lastUpdated && `Last Updated: ${item.footer.lastUpdated}`,
  ].filter(Boolean).join(" | ");

  return (
    <article className="relative grid gap-3.5 p-4 rounded-[24px] border border-slate-700/40 bg-gradient-to-b from-[#0c1220] to-[#080d18] shadow-[0_20px_54px_rgba(3,8,18,0.34)] overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-cyan-950/40 border border-cyan-700/20 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight leading-none">AI Summary</p>
            <p className="text-xs text-slate-400 mt-0.5">Generated summary of this customer request</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
          {generatedLabel && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" />
              {generatedLabel}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-full border-cyan-600/35 bg-slate-900/80 text-cyan-300 hover:border-cyan-400/55 hover:bg-slate-800 text-xs font-bold tracking-wide"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        </div>
      </header>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-3.5 items-start">

        {/* Left */}
        <div className="grid gap-2">
          <TitleStatusPanel item={item} />

          {item.nextAction && (
            <SummarySection kind="next-action" label="Next Action" icon={ArrowRight}>
              <p className="text-sm text-slate-300 leading-relaxed">{item.nextAction}</p>
            </SummarySection>
          )}
          {item.summary && (
            <SummarySection kind="summary" label="Summary" icon={FileText}>
              <p className="text-sm text-slate-300 leading-relaxed">{item.summary}</p>
            </SummarySection>
          )}
          {item.deliverable && (
            <SummarySection kind="deliverable" label="Deliverable" icon={BadgeCheck}>
              <p className="text-sm text-slate-300 leading-relaxed">{item.deliverable}</p>
            </SummarySection>
          )}
          {item.blockersOpenQuestions?.length > 0 && (
            <SummarySection kind="blockers" label="Blockers / Open Questions" icon={TriangleAlert}>
              <ul className="mt-1 space-y-1 text-sm text-slate-300 list-disc list-inside leading-relaxed">
                {item.blockersOpenQuestions.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </SummarySection>
          )}
          {item.urgencyText && (
            <SummarySection kind="urgency" label="Urgency" icon={Clock3}>
              <p className="text-sm text-slate-300 leading-relaxed">{item.urgencyText}</p>
            </SummarySection>
          )}
        </div>

        {/* Right */}
        <div className="grid gap-2">
          {item.keyDetails?.length > 0 && <KeyDetailsPanel rows={item.keyDetails} />}

          {item.requestHistorySignals && (
            <SummarySection kind="history" label="Request History Signals" icon={History}>
              <p className="text-sm text-slate-300 leading-relaxed">{item.requestHistorySignals}</p>
            </SummarySection>
          )}
          {(item.confidence?.level || item.confidence?.reason) && (
            <SummarySection
              kind="confidence"
              label="Confidence"
              icon={ShieldCheck}
              headingRight={item.confidence.level ? <ConfidencePill level={item.confidence.level} /> : undefined}
            >
              {item.confidence.reason && (
                <p className="text-sm text-slate-300 leading-relaxed">{item.confidence.reason}</p>
              )}
            </SummarySection>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-700/25">
        <p className="text-xs text-slate-500">{footerText}</p>
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
      </footer>
    </article>
  );
}

function ConfidencePill({ level }: { level: string }) {
  const cls =
    level === "High"   ? "text-green-400  border-green-600/30  bg-green-950/30"
    : level === "Medium" ? "text-yellow-400 border-yellow-600/30 bg-yellow-950/30"
    :                      "text-red-400    border-red-600/30    bg-red-950/30";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${cls}`}>
      {level}
    </span>
  );
}
```

---

### 6.6 DashboardPage

```tsx
// src/components/dashboard/DashboardPage.tsx
"use client";
import { useDashboard } from "@/hooks/useDashboard";
import { AISummaryCard } from "@/components/ai-summary/AISummaryCard";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const { data, error, isLoading, refresh } = useDashboard({ includeSummary: true });
  const items = data?.parser?.parsed?.items ?? [];

  return (
    <main className="max-w-[1240px] mx-auto px-5 py-8 space-y-6">

      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Today&apos;s queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isLoading ? "Loading…" : error ? String(error) : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={isLoading}
          className="rounded-full border-slate-600 hover:border-cyan-500"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh queue
        </Button>
      </section>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
          {String(error)}
        </p>
      )}

      <section className="grid gap-5">
        {items.map((item, i) => (
          <AISummaryCard
            key={item.id ?? i}
            item={item}
            onRegenerate={refresh}
            isRegenerating={isLoading}
          />
        ))}
        {!isLoading && items.length === 0 && !error && (
          <p className="text-slate-500 text-sm">No items in queue.</p>
        )}
      </section>
    </main>
  );
}
```

---

## 7. Phase 5 — App Router Page

```tsx
// src/app/page.tsx
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export default function Home() {
  return <DashboardPage />;
}
```

---

## 8. Phase 6 — Responsive Breakpoints

The two-column body grid uses `lg:` so it collapses on tablets and phones automatically:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-3.5 items-start">
```

| Breakpoint | Behaviour |
|---|---|
| `lg` 1024px+ | Two-column: sections left, key details right |
| Below `lg` | Single column, key details move below sections |
| `sm` 640px | Pills wrap; title icon shrinks via `w-12 h-12 sm:w-16 sm:h-16` |

---

## 9. Phase 7 — Feature Parity Checklist

- [ ] AI Summary card renders all sections from live data
- [ ] Status / Priority / Due pills render with correct colors per tone
- [ ] Blockers section: red accent + bullet list
- [ ] Urgency section: amber accent
- [ ] KEY DETAILS table: 12 rows, icons, "Not visible" in italic
- [ ] REQUEST HISTORY SIGNALS card
- [ ] CONFIDENCE card with High / Medium / Low pill
- [ ] Regenerate button triggers fresh parse
- [ ] "View Full Request" opens `item.href` in new tab
- [ ] Footer shows Requested and Last Updated dates
- [ ] Two-column on desktop, single-column on mobile
- [ ] Missing / empty fields are hidden (no broken layout)
- [ ] Loading spinner while fetching
- [ ] Error message if API call fails
- [ ] Cache-first on initial load, fresh data on Refresh
- [ ] Testchat / plain-text fallback handled (non-structured parser response)

---

## 10. Running Both Together

```bash
# Terminal 1 — Express backend (unchanged, port 3000)
npm run dev

# Terminal 2 — Next.js frontend (port 3001, proxies /api → 3000)
cd frontend
npm run dev
```

Add to `frontend/package.json`:
```json
{
  "scripts": {
    "dev":   "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001"
  }
}
```

---

## 11. Deployment

### Option A — Vercel (recommended for Next.js)
1. Deploy Express separately (Railway / Fly.io / any Node host)
2. Deploy `frontend/` to Vercel — zero config, detects Next.js automatically
3. Set `BACKEND_URL` env var in Vercel dashboard
4. Add CORS for the Vercel domain in Express

### Option B — Single server, static export
```bash
cd frontend && next build
# copies frontend/out/ to Express static directory
cp -r out/ ../public-next/
```
Then serve `public-next/` from Express with `express.static()`.

### Option C — Docker Compose
```yaml
services:
  backend:
    build: .
    ports: ["3000:3000"]
  frontend:
    build: ./frontend
    ports: ["3001:3001"]
    environment:
      BACKEND_URL: http://backend:3000
```

---

## 12. Implementation Order & Time Estimates

| Step | Task | Est. time |
|---|---|---|
| 1 | Bootstrap Next.js + Tailwind + shadcn | 1–2 h |
| 2 | Paste `lib/types.ts` from this doc | 15 min |
| 3 | Implement `lib/api.ts` + `useDashboard` hook | 30 min |
| 4 | Build `StatusPill`, `SummarySection`, `KeyDetailsPanel` | 1–2 h |
| 5 | Build `TitleStatusPanel` + `AISummaryCard` | 1–2 h |
| 6 | Wire up the page, test against live backend | 30 min |
| 7 | Responsive breakpoints | 30 min |
| 8 | Feature parity checklist | 1–2 h |

**Total: ~6–9 hours for full feature parity**
