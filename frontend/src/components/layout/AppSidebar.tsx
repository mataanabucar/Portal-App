"use client";

import { BookOpen, BrainCircuit, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar, type SidebarAction } from "@/components/layout/Sidebar";

interface AppSidebarProps {
  onQuickRead?: () => void;
  quickReadActive?: boolean;
}

export function AppSidebar({
  onQuickRead,
  quickReadActive = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const actions: SidebarAction[] = [
    {
      id: "queue",
      label: "Queue",
      icon: LayoutDashboard,
      href: "/",
      active: pathname === "/",
    },
    {
      id: "ai-trace",
      label: "AI Trace",
      icon: BrainCircuit,
      href: "/ai-trace",
      active: pathname === "/ai-trace",
    },
  ];

  if (onQuickRead) {
    actions.push({
      id: "quick-read",
      label: "Quick Read",
      icon: BookOpen,
      onSelect: onQuickRead,
      active: quickReadActive,
    });
  }

  return <Sidebar actions={actions} />;
}
