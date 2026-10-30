
"use client";

import React, { useState } from "react";
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
  { id: "owners", title: "احراز هویت", href: "/admin/owners", iconName: "check" },
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  // محتوای سایدبار با قابلیت حالت فشرده
  const navContent = (compact: boolean) => (
    <div className="flex flex-col h-full py-5 px-3">
      {/* Brand & Logo Header */}
      
{/* Brand & Logo Header */}
<div
  className={`pb-6 mb-2 border-b border-border flex items-center ${
    compact ? "justify-center px-0" : "justify-between px-3"
  }`}
>
  <div className="flex items-center gap-2.5 min-w-0">
    {/* Logo - Desktop Toggle */}
    <button
      type="button"
      onClick={() => setIsCollapsed((prev) => !prev)}
      aria-label={compact ? "باز کردن سایدبار" : "جمع کردن سایدبار"}
      title={compact ? "باز کردن سایدبار" : "جمع کردن سایدبار"}
      className="w-8 h-8 shrink-0 rounded-card bg-primary text-text-on-primary flex items-center justify-center font-black text-lg cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      S
    </button>

    {!compact && (
      <Link
        href="/admin"
        onClick={onCloseMobile}
        className="text-page-title text-primary font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-card whitespace-nowrap"
      >
        <span className="text-text-white tracking-tight">
          سایرا <span className="text-secondary text-primary font-normal">ادمین</span>
        </span>
      </Link>
    )}
  </div>

  {/* Mobile Close Button */}
  {!compact && (
    <button
      onClick={onCloseMobile}
      type="button"
      aria-label="بستن منو"
      className="lg:hidden p-2 rounded-card text-text-muted hover:text-text-white hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon name="close" size={20} />
    </button>
  )}
</div>


      {/* Navigation Links */}
      <nav
        aria-label="مدیریت سیستم"
        className="flex-1 space-y-1 overflow-y-auto"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              aria-label={item.title}
              title={compact ? item.title : undefined}
              className={`flex items-center rounded-card text-body transition-all duration-200 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                compact
                  ? "justify-center px-0 py-3"
                  : "gap-3 px-3.5 py-2.5"
              } ${
                active
                  ? "bg-primary-muted text-primary font-bold"
                  : "text-text-muted hover:text-text-white hover:bg-foreground/20"
              }`}
            >
              {/* Active Indicator */}
              {active && (
                <span className="absolute right-0 top-2 bottom-2 w-1 bg-primary rounded-l" />
              )}

              <Icon
                name={item.iconName}
                size={20}
                className={`shrink-0 ${
                  active
                    ? "text-primary"
                    : "text-text-muted group-hover:text-text-white transition-colors"
                }`}
              />

              {!compact && (
                <span className="truncate whitespace-nowrap">
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div
        className={`pt-4 border-t border-border text-secondary text-text-subtle ${
          compact ? "text-center px-0" : "px-3"
        }`}
      >
        {compact ? (
          <span className="text-xs font-bold">S</span>
        ) : (
          <>
            <p className="text-xs">پنل مدیریت پلتفرم سایرا</p>
            <p className="text-xs mt-0.5">نسخه ۱.۰.۰ — فاز ۱</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 bg-card-bg border-l border-border h-screen sticky top-0 transition-[width] duration-300 ease-in-out ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {navContent(isCollapsed)}
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
        {navContent(false)}
      </aside>
    </>
  );
};
