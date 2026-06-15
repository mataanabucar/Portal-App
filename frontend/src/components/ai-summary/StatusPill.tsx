import { TriangleAlert, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone, PriorityTone } from "@/lib/types";

const STATUS_CLS: Record<StatusTone, string> = {
  blocked: "text-amber-400 border-amber-500/40 bg-amber-950/40",
  warning: "text-yellow-400 border-yellow-500/30 bg-yellow-950/30",
  active: "text-cyan-400 border-cyan-500/30 bg-cyan-950/30",
  ready: "text-green-400 border-green-500/30 bg-green-950/30",
  neutral: "text-slate-400 border-slate-600/30 bg-transparent",
};

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold tracking-wide",
        STATUS_CLS[tone]
      )}
    >
      {tone === "blocked" && <TriangleAlert className="w-3 h-3" />}
      {label}
    </span>
  );
}

const PRIORITY_CLS: Record<PriorityTone, string> = {
  normal: "text-green-400 border-green-500/30 bg-green-950/30",
  high: "text-orange-400 border-orange-500/30 bg-orange-950/30",
  low: "text-sky-400 border-sky-500/30 bg-sky-950/30",
  unknown: "text-slate-400 border-slate-600/30 bg-transparent",
};

export function PriorityPill({
  label,
  tone,
}: {
  label: string;
  tone: PriorityTone;
}) {
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold",
        PRIORITY_CLS[tone]
      )}
    >
      {label}
    </span>
  );
}

export function DuePill({
  date,
  relative,
}: {
  date: string;
  relative: string;
}) {
  if (!date) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold text-violet-300 border-violet-500/30 bg-violet-950/30">
      <CalendarDays className="w-3 h-3 opacity-80" />
      Due: {date}
      {relative ? ` (${relative})` : ""}
    </span>
  );
}
