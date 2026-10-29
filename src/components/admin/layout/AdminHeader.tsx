"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";

export interface AdminHeaderProps {
  onToggleMobileMenu: () => void;
}

const ROUTE_TITLE_MAP: Record<string, string> = {
  "/admin": "داشبورد مدیریت",
  "/admin/gamecenters": "مدیریت گیمنت‌ها",
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
  const title = ROUTE_TITLE_MAP[pathname] || "پنل مدیریت";

  const getBreadcrumbs = () => {
    if (pathname === "/admin") return [];
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
      </div>
    </header>
  );
};
