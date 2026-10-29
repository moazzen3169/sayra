"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, IconName } from "@/components/ui/Icon";

export interface NavItem {
  id: string;
  title: string;
  href: string;
  iconName: IconName;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", title: "داشبورد", href: "/admin", iconName: "monitor" },
  { id: "gamecenters", title: "گیمنت‌ها", href: "/admin/gamecenters", iconName: "gamepad" },
  { id: "tickets", title: "تیکت‌ها", href: "/admin/tickets", iconName: "ticket" },
  { id: "blog", title: "وبلاگ", href: "/admin/blog", iconName: "edit" },
  { id: "owners", title: "احراز صاحبان", href: "/admin/owners", iconName: "check" },
  { id: "reports", title: "گزارش‌ها", href: "/admin/reports", iconName: "calendar" },
  { id: "users", title: "کاربران", href: "/admin/users", iconName: "user" },
  { id: "ads", title: "تبلیغات", href: "/admin/ads", iconName: "tag" },
  { id: "campaigns", title: "کمپین‌ها", href: "/admin/campaigns", iconName: "star" },
  { id: "settings", title: "تنظیمات", href: "/admin/settings", iconName: "info" },
];

export interface AdminSidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full py-5 px-3">
      {/* Brand & Logo Header */}
      <div className="px-3 pb-6 mb-2 border-b border-border flex items-center justify-between">
        <Link
          href="/admin"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 text-page-title text-primary font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-card px-1 py-0.5"
        >
          <div className="w-8 h-8 rounded-card bg-primary text-text-on-primary flex items-center justify-center font-black text-lg">
            S
          </div>
          <span className="text-text-white tracking-tight">سایرا <span className="text-secondary text-primary font-normal">ادمین</span></span>
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          type="button"
          aria-label="بستن منو"
          className="lg:hidden p-2 rounded-card text-text-muted hover:text-text-white hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="مدیریت سیستم" className="flex-1 space-y-1 overflow-y-auto">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-card text-body transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "bg-primary-muted text-primary font-bold"
                  : "text-text-muted hover:text-text-white hover:bg-foreground/20"
              }`}
            >
              {/* Active Indicator Bar */}
              {active && (
                <span className="absolute right-0 top-2 bottom-2 w-1 bg-primary rounded-l" />
              )}
              <Icon
                name={item.iconName}
                size={20}
                className={active ? "text-primary shrink-0" : "text-text-muted group-hover:text-text-white shrink-0 transition-colors"}
              />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border px-3 text-secondary text-text-subtle">
        <p className="text-xs">پنل مدیریت پلتفرم سایرا</p>
        <p className="text-xs mt-0.5">نسخه ۱.۰.۰ — فاز ۱</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-card-bg border-l border-border h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-black/75 lg:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-card-bg border-l border-border transition-transform duration-250 ease-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
};
