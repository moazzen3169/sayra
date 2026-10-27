"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  featured?: boolean;
}

const GLOBAL_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "خانه", href: "/" },
  { id: "gamecenters", label: "گیم‌نت‌ها", href: "/", featured: true },
  { id: "discounts", label: "تخفیف‌ها", href: "#discounts" },
  { id: "blog", label: "وبلاگ", href: "#blog" },
  { id: "about", label: "درباره سایرا", href: "#about" },
];

interface DesktopNavProps {
  onSearchClick?: () => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ onSearchClick }) => {
  const pathname = usePathname();

  return (
    <nav aria-label="ناوبری اصلی دسکتاپ" className="flex items-center gap-6 shrink-0">
      {GLOBAL_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/" && item.id === "home"
            ? pathname === "/"
            : item.href !== "/" && item.href !== "#" && pathname.startsWith(item.href);

        if (item.id === "gamecenters" && onSearchClick) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={onSearchClick}
              className={`text-xs font-black transition-all py-1 px-2.5 rounded-full relative flex items-center gap-1.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/25 hover:bg-[var(--primary)] hover:text-[#101014]`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse group-hover:bg-[#101014]" />
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`text-xs font-bold transition-colors py-1 relative ${
              isActive
                ? "text-[var(--primary)] font-black"
                : item.featured
                ? "text-[var(--text-white)] hover:text-[var(--primary)] font-extrabold"
                : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
