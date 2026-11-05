"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export type TabType = "home" | "history" | "profile";

interface BottomBarProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

/** مسیر هر تب */
export const TAB_ROUTES: Record<TabType, string> = {
  home: "/",
  history: "/reservations",
  profile: "/profile",
};

const iconProps = {
  className: "w-6 h-6",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "خانه",
    icon: (
      <svg {...iconProps}>
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "رزروهای من",
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
  {
    id: "profile",
    label: "حساب کاربری",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export const BottomBar: React.FC<BottomBarProps> = ({ activeTab = "home", onTabChange }) => {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  const resolvedTabs = tabs.map((tab) => {
    if (tab.id === "profile") {
      if (isAdmin) {
        return {
          id: tab.id,
          label: "پنل مدیریت",
          href: "/admin",
          icon: (
            <svg {...iconProps}>
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        };
      }
      if (isManager) {
        return {
          id: tab.id,
          label: "پنل گیم‌نت",
          href: "/owner",
          icon: (
            <svg {...iconProps}>
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        };
      }
      return {
        ...tab,
        href: "/profile",
      };
    }
    return {
      ...tab,
      href: TAB_ROUTES[tab.id],
    };
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none lg:hidden">
      <div className="w-full max-w-[var(--max-app-width)] bg-[var(--bg-body)] px-6 pt-3 pb-4 flex items-center justify-around pointer-events-auto">
        {resolvedTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => onTabChange?.(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1.5 min-w-20 transition-colors ${
                isActive ? "text-[var(--primary)] font-bold" : "text-[var(--text-white)]"
              }`}
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
