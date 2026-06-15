import { StatusPill, PriorityPill, DuePill } from "./StatusPill";
import type { DashboardCardItem } from "@/lib/types";

export function TitleStatusPanel({ item }: { item: DashboardCardItem }) {
  return (
    <div className="grid gap-2.5 min-w-0">
      <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-100">
        {item.title}
      </h2>
      <div className="flex flex-wrap gap-1.5">
        <StatusPill label={item.status.label} tone={item.status.tone} />
        <PriorityPill label={item.priority.label} tone={item.priority.tone} />
        <DuePill date={item.due.date} relative={item.due.relative} />
      </div>
    </div>
  );
}
