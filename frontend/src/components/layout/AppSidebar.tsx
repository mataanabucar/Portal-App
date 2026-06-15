"use client";

import { BookOpen, LayoutDashboard } from "lucide-react";
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
