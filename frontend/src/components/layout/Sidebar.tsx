"use client";

import { useSyncExternalStore } from "react";
import { Menu, Sparkles, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { readLocal, writeLocal } from "@/lib/storage";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "sidebar-collapsed";

export interface SidebarAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  active?: boolean;
}

// Subscribe to the `storage` event so cross-tab toggles stay in sync.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function Sidebar({ actions }: { actions: SidebarAction[] }) {
  // useSyncExternalStore is the React-blessed way to read a browser store with
  // an SSR snapshot: the server snapshot (true) matches the client's first
  // render, so there's no hydration mismatch, then it reflects the saved value.
  const collapsed = useSyncExternalStore(
    subscribe,
    () => readLocal<boolean>(COLLAPSE_KEY) ?? true, // client value
    () => true // server snapshot: default collapsed
  );

  const toggle = () => {
    writeLocal(COLLAPSE_KEY, !collapsed);
    // Notify subscribers in this tab (storage event only fires cross-tab).
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 flex flex-col border-r border-slate-800/60 bg-[#0a1322]/90 backdrop-blur transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[232px]"
      )}
    >
      <div className="flex items-center gap-2 px-3 h-14 border-b border-slate-800/60">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          aria-expanded={!collapsed}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800/70 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {!collapsed && (
          <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-100 whitespace-nowrap">
            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            Portal
          </span>
        )}
      </div>

      <nav className="flex-1 py-3">
        <ul className="space-y-1 px-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={action.onSelect}
                  title={collapsed ? action.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100",
                    action.active &&
                      "bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-700/40",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <span className="whitespace-nowrap">{action.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="px-3 py-3 border-t border-slate-800/60 text-[0.7rem] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-500" />
            Portal Visualizer
          </span>
        </div>
      )}
    </aside>
  );
}
