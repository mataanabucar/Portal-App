"use client";

import {
  Hash,
  Link2,
  User,
  Monitor,
  Building2,
  FileText,
  Globe,
  CalendarDays,
  Flag,
  Paperclip,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KeyDetailRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON: Record<string, LucideIcon> = {
  "Request ID": Hash,
  "Related Action Item": Link2,
  Requester: User,
  Application: Monitor,
  "Business / Customer": Building2,
  "Request Type": FileText,
  Origin: Globe,
  "Assigned Lead": User,
  "Due Date": CalendarDays,
  "Priority / Risk": Flag,
  Attachments: Paperclip,
  "References / Fields": Tags,
};

// Labels intentionally hidden from the Key Details table. Exported so the card
// footer's "N fields" count stays in sync with what's actually shown.
export const HIDDEN_KEY_DETAIL_LABELS = new Set<string>(["Request Type"]);

export function visibleKeyDetailRows(rows: KeyDetailRow[]): KeyDetailRow[] {
  return rows.filter((r) => !HIDDEN_KEY_DETAIL_LABELS.has(r.label));
}

interface KeyDetailsPanelProps {
  rows: KeyDetailRow[];
}

// Pure table — the toggle bar and open/closed state live entirely in the parent
// card. Mounted only when expanded; card grows in height naturally.
export function KeyDetailsPanel({ rows }: KeyDetailsPanelProps) {
  const shownRows = visibleKeyDetailRows(rows);
  return (
    // Responsive 2-column grid; gap-px + container bg acts as divider lines.
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-xl border border-slate-700/25 overflow-hidden bg-slate-700/20">
      {shownRows.map((row) => {
        const RowIcon = ICON[row.label] ?? FileText;
        const missing = row.value === "Not visible";
        return (
          <div
            key={row.label}
            className="grid grid-cols-[42%_1fr] gap-2 px-3 py-2 bg-slate-900/80 text-xs"
          >
            <div className="flex items-center gap-2 text-slate-400 font-medium truncate">
              <RowIcon className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{row.label}</span>
            </div>
            <div
              className={cn(
                "text-slate-200 leading-snug break-words",
                missing && "text-slate-500 italic"
              )}
            >
              {row.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
