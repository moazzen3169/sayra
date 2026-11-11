"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

const iconProps = {
  className: "w-5 h-5",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * تب‌های BottomBar به ترتیب از راست به چپ:
 * ۱. خانه
 * ۲. گیمنت‌ها
 * ۳. اخبار
 * ۴. رزروهای من
 */
const tabs: { id: TabType; label: string; icon: React.ReactNode; href: string }[] = [
  {
    id: "home",
    label: "خانه",
    href: TAB_ROUTES.home,
    icon: (
      <svg {...iconProps}>
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z" />
      </svg>
    ),
  },
  {
    id: "gamecenters",
    label: "گیمنت‌ها",
    href: TAB_ROUTES.gamecenters,
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 12h4m-2-2v4" />
        <circle cx="16" cy="10" r="1" fill="currentColor" />
        <circle cx="18" cy="13" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "news",
    label: "اخبار",
    href: TAB_ROUTES.news,
    icon: (
      <svg {...iconProps}>
        <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 8h6m-6 4h6m-6 4h4" />
      </svg>
    ),
  },
  {
    id: "reservations",
    label: "رزروهای من",
    href: TAB_ROUTES.reservations,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
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

  // If activeTab is explicitly provided, respect it; otherwise derive from pathname (defaulting to "home")
  const resolvedTab = activeTab ?? routeTab ?? "home";
  const normalizedActiveTab =
    resolvedTab === "history" ? "reservations" : resolvedTab;

  return (
    <nav
      aria-label="ناوبری پایین صفحه"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none lg:hidden"
    >
      <div className="w-full max-w-[var(--max-app-width)] border-t border-[var(--border-subtle)] bg-[var(--bg-body)]/95 backdrop-blur-md px-4 pt-2.5 pb-3 flex items-center justify-around pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = normalizedActiveTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => onTabChange?.(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-2 py-1 min-w-[64px] transition-colors rounded-lg ${
                isActive
                  ? "text-[var(--primary)] font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
              }`}
            >
              <span className={isActive ? "text-[var(--primary)] scale-105 transition-transform" : ""}>
                {tab.icon}
              </span>
              <span className="text-[11px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
