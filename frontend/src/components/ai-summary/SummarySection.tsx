import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionKind =
  | "next-action"
  | "summary"
  | "deliverable"
  | "blockers"
  | "urgency"
  | "history"
  | "confidence"
  | "details";

const KIND: Record<SectionKind, { label: string; icon: string; card?: string }> =
  {
    "next-action": { label: "text-cyan-400", icon: "bg-cyan-950/40 text-cyan-400" },
    summary: { label: "text-violet-400", icon: "bg-violet-950/30 text-violet-400" },
    deliverable: { label: "text-green-400", icon: "bg-green-950/30 text-green-400" },
    blockers: {
      label: "text-red-400",
      icon: "bg-red-950/40 text-red-400",
      card: "border-red-800/30 bg-red-950/20",
    },
    urgency: {
      label: "text-amber-400",
      icon: "bg-amber-950/30 text-amber-400",
      card: "border-amber-800/30 bg-amber-950/15",
    },
    history: { label: "text-cyan-400", icon: "bg-cyan-950/30 text-cyan-400" },
    confidence: { label: "text-green-400", icon: "bg-green-950/30 text-green-400" },
    details: { label: "text-slate-400", icon: "bg-slate-800/60 text-slate-400" },
  };

interface SummarySectionProps {
  kind: SectionKind;
  label: string;
  icon: LucideIcon;
  headingRight?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function SummarySection({
  kind,
  label,
  icon: Icon,
  headingRight,
  children,
  collapsible,
  isOpen = true,
  onToggle,
}: SummarySectionProps) {
  const s = KIND[kind];
  const showChildren = !collapsible || isOpen;

  return (
    <div
      className={cn(
        "grid grid-cols-[34px_1fr] gap-3 p-3 rounded-2xl border border-slate-700/30 bg-slate-900/80",
        showChildren ? "items-start" : "items-center",
        s.card
      )}
    >
      <div
        className={cn(
          "w-[34px] h-[34px] rounded-full flex items-center justify-center border border-white/10 shrink-0",
          s.icon
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            showChildren && "mb-1",
            collapsible && "cursor-pointer select-none"
          )}
          onClick={collapsible ? onToggle : undefined}
          role={collapsible ? "button" : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") onToggle?.();
                }
              : undefined
          }
        >
          <p
            className={cn(
              "text-[0.72rem] font-extrabold tracking-widest uppercase",
              s.label
            )}
          >
            {label}
          </p>
          <div className="flex items-center gap-1.5">
            {headingRight}
            {collapsible && (
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            )}
          </div>
        </div>
        {showChildren && children}
      </div>
    </div>
  );
}
