"use client";

import React from "react";
import Link from "next/link";
import { useMyGamingCenter } from "@/hooks/useMyGamingCenter";
import { cn } from "@/lib/utils";

type LinkKind = "admin" | "center" | "create";

interface OwnerCenterLinkProps {
  /** menu: ردیف داخل منوی کشویی هدر | card: ردیف کارتی برای صفحه پروفایل */
  variant?: "menu" | "card";
  /** برای بستن منو بعد از کلیک */
  onNavigate?: () => void;
  /**
   * اگر دریافت اطلاعات از API شکست خورد، از نقش ذخیره‌شده در AuthContext استفاده می‌شود.
   * "none" یعنی هیچ لینکی نمایش داده نشود.
   */
  fallback?: "admin" | "center" | "none";
  className?: string;
}

const LINKS: Record<LinkKind, { href: string; label: string; iconPath: string }> = {
  admin: {
    href: "/admin",
    label: "پنل مدیریت سامانه",
    iconPath:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  center: {
    href: "/owner",
    label: "مدیریت گیمنت",
    iconPath:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  create: {
    href: "/owner/new",
    label: "ساخت گیمنت",
    iconPath: "M12 4v16m8-8H4",
  },
};

export const OwnerCenterLink: React.FC<OwnerCenterLinkProps> = ({
  variant = "menu",
  onNavigate,
  fallback = "none",
  className,
}) => {
  const { status, hasCenter, isAdmin } = useMyGamingCenter();

  // نامشخص بودن وضعیت: لینک اشتباه نشان داده نمی‌شود
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div
        aria-busy="true"
        className={cn(
          "animate-pulse rounded-card bg-[var(--foreground)]/40",
          variant === "menu" ? "mx-3 my-2 h-6" : "h-12",
          className
        )}
      >
        <span className="sr-only">در حال بارگذاری</span>
      </div>
    );
  }

  let kind: LinkKind | null = null;

  if (status === "ready") {
    kind = isAdmin ? "admin" : hasCenter ? "center" : "create";
  } else {
    // status === "error"
    kind = fallback === "none" ? null : fallback;
  }

  if (!kind) return null;

  const item = LINKS[kind];
  const iconColor = kind === "create" || kind === "center" || kind === "admin"
    ? "text-[var(--primary)]"
    : "text-[var(--text-muted)]";

  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
    </svg>
  );

  if (variant === "card") {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex min-h-12 items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm font-bold text-[var(--text-white)] transition-colors hover:border-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          className
        )}
      >
        <span className="flex items-center gap-3">
          <span className={iconColor}>{icon}</span>
          <span>{item.label}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-4 w-4 text-[var(--text-muted)]"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60",
        className
      )}
    >
      <span className={cn("shrink-0", iconColor)}>{icon}</span>
      <span>{item.label}</span>
    </Link>
  );
};