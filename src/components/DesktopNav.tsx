"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_ROUTES, TabType } from "./BottomBar";

const NAV_ITEMS: { id: TabType; label: string; href: string }[] = [
  { id: "home", label: "خانه", href: TAB_ROUTES.home },
  { id: "history", label: "تاریخچه", href: TAB_ROUTES.history },
  { id: "profile", label: "حساب کاربری", href: TAB_ROUTES.profile },
];

export const DesktopNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav aria-label="ناوبری اصلی دسکتاپ" className="hidden lg:flex items-center gap-6 shrink-0">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`text-sm transition-colors py-1 relative ${
              isActive
                ? "text-[var(--primary)] font-black"
                : "text-[var(--text-white)] hover:text-[var(--primary)] font-bold"
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
