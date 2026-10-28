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
  { id: "home", label: "صفحه اصلی", href: "/" },
  { id: "reservations", label: "رزروهای من", href: "/reservations" },
];

interface DesktopNavProps {
  onSearchClick?: () => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ onSearchClick }) => {
  const pathname = usePathname();

  return (
    <nav aria-label="ناوبری اصلی دسکتاپ" className="flex items-center gap-6 shrink-0 pl-[200px]">
      {GLOBAL_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/" && item.id === "home"
            ? pathname === "/"
            : item.href !== "/" && item.href !== "#" && pathname.startsWith(item.href);


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
