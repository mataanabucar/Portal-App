"use client";

import { BookOpen, FlaskConical, Headphones, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar, type SidebarAction } from "@/components/layout/Sidebar";

interface AppSidebarProps {
  onQuickRead?: () => void;
  quickReadActive?: boolean;
  onTtsConfig?: () => void;
  onResearchTest?: () => void;
}

export function AppSidebar({
  onQuickRead,
  quickReadActive = false,
  onTtsConfig,
  onResearchTest,
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

  if (onTtsConfig) {
    actions.push({
      id: "tts-config",
      label: "Speech",
      icon: Headphones,
      onSelect: onTtsConfig,
    });
  }

  if (onResearchTest) {
    actions.push({
      id: "research-test",
      label: "Research Test",
      icon: FlaskConical,
      onSelect: onResearchTest,
    });
  }

  return <Sidebar actions={actions} />;
}
