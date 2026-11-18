"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type TabType =
  | "home"
  | "gamecenters"
  | "news"
  | "reservations"
  | "history"
  | "profile";

interface BottomBarProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

/** مسیر هر تب */
export const TAB_ROUTES: Record<TabType, string> = {
  home: "/",
  gamecenters: "/gamecenters",
  news: "/blog",
  reservations: "/reservations",
  history: "/reservations",
  profile: "/profile",
};

const tabs: { id: TabType; label: string; icon: IconName; href: string }[] = [
  { id: "home", label: "خانه", href: TAB_ROUTES.home, icon: "home" },
  { id: "gamecenters", label: "گیمنت‌ها", href: TAB_ROUTES.gamecenters, icon: "gamepad" },
  { id: "news", label: "اخبار", href: TAB_ROUTES.news, icon: "list" },
  { id: "reservations", label: "رزروهای من", href: TAB_ROUTES.reservations, icon: "calendar" },
];

export function getActiveTabFromPathname(pathname: string | null | undefined): TabType | null {
  if (!pathname) return null;
  if (pathname === "/") return "home";
  if (pathname === "/gamecenters" || pathname.startsWith("/gamecenters/")) return "gamecenters";
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return "news";
  if (pathname === "/reservations" || pathname.startsWith("/reservations/")) return "reservations";
  return null;
}

export const BottomBar: React.FC<BottomBarProps> = ({ activeTab, onTabChange }) => {
  const pathname = usePathname();
  const routeTab = getActiveTabFromPathname(pathname);

  const resolvedTab = activeTab ?? routeTab ?? "home";
  const normalizedActiveTab =
    resolvedTab === "history" ? "reservations" : resolvedTab;

  return (
    <nav
      aria-label="ناوبری پایین صفحه"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-header)] flex justify-center pointer-events-none lg:hidden"
    >
      <div className="w-full max-w-[var(--max-app-width)] border-t border-[var(--border-subtle)] bg-[var(--bg-body)]/95 backdrop-blur-md px-4 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = normalizedActiveTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => onTabChange?.(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 min-w-[64px] min-h-[44px] transition-colors rounded-card",
                isActive
                  ? "text-[var(--primary)] font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
              )}
            >
              <Icon name={tab.icon} size={20} />
              <span className="text-xs font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
