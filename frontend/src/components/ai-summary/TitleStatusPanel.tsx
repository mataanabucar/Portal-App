import { SearchCheck } from "lucide-react";
import { StatusPill, PriorityPill, DuePill } from "./StatusPill";
import type { DashboardCardItem } from "@/lib/types";

export function TitleStatusPanel({ item }: { item: DashboardCardItem }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 items-center p-3.5 rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-cyan-950/30 border border-cyan-700/20 shrink-0">
        <SearchCheck className="w-7 h-7 text-cyan-400" />
      </div>
      <div className="grid gap-2 min-w-0">
        <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-100">
          {item.title}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill label={item.status.label} tone={item.status.tone} />
          <PriorityPill label={item.priority.label} tone={item.priority.tone} />
          <DuePill date={item.due.date} relative={item.due.relative} />
        </div>
      </div>
    </div>
  );
}
