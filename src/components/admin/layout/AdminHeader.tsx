"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { clearAdminTokens, clearBlogTokens } from "@/lib/token";
import { authService } from "@/services/authService";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";

export interface AdminHeaderProps {
  onToggleMobileMenu: () => void;
}

const ROUTE_TITLE_MAP: Record<string, string> = {
  "/admin": "داشبورد مدیریت",
  "/admin/gamecenters": "مدیریت گیمنت‌ها",
  "/admin/catalog": "کاتالوگ دستگاه‌ها",
  "/admin/tickets": "تیکت‌های پشتیبانی",
  "/admin/blog": "مدیریت وبلاگ",
  "/admin/owners": "احراز هویت صاحبان گیمنت",
  "/admin/reports": "گزارش‌ها و آمار",
  "/admin/users": "مدیریت کاربران",
  "/admin/ads": "مدیریت تبلیغات",
  "/admin/campaigns": "کمپین‌ها و تخفیف‌ها",
  "/admin/settings": "تنظیمات سیستم",
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileMenu,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isBlogArea =
    pathname === "/admin/blog" || pathname.startsWith("/admin/blog/");

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      if (isBlogArea) {
        clearBlogTokens();
        router.replace("/admin/login?tab=blog");
        return;
      }

      try {
        await authService.logoutPlatformAdmin();
      } catch {
        // Proceed with local cleanup even if backend session is already expired
      }
      clearAdminTokens();
      router.replace("/admin/login");
    } finally {
      setIsLoggingOut(false);
    }
  };
  const matchedBase = Object.keys(ROUTE_TITLE_MAP)
    .filter((key) => key !== "/admin" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  const title =
    ROUTE_TITLE_MAP[pathname] ||
    (matchedBase ? ROUTE_TITLE_MAP[matchedBase] : "پنل مدیریت");

  const getBreadcrumbs = () => {
    if (pathname === "/admin") return [];
    if (matchedBase && pathname !== matchedBase) {
      return [
        { label: ROUTE_TITLE_MAP[matchedBase], href: matchedBase },
        { label: "جزئیات" },
      ];
    }
    return [{ label: title }];
  };

  return (
    <header className="sticky top-0 z-40 bg-card-bg border-b border-border px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          type="button"
          aria-label="باز و بست منوی مدیریت"
          className="lg:hidden p-2 rounded-card text-text-muted hover:text-text-white hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          <Icon name="filter" size={20} />
        </button>

        <div>
          <h1 className="text-section-title text-text-white">{title}</h1>
          <div className="hidden sm:block mt-0.5">
            <AdminBreadcrumbs items={getBreadcrumbs()} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-foreground/30 hover:bg-foreground/60 text-secondary text-text-white transition-colors border border-border"
          title="مشاهده سایت عمومی"
        >
          <Icon name="back" size={14} />
          <span className="hidden sm:inline">سایت اصلی</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="خروج از پنل مدیریت"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-red-500/10 hover:bg-red-500/20 text-secondary text-red-400 transition-colors border border-red-500/30 disabled:opacity-60"
        >
          <span>{isLoggingOut ? "در حال خروج..." : "خروج"}</span>
        </button>
      </div>
    </header>
  );
};
