"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { toPersianDigits } from "@/lib/format";
import { customerNotificationService } from "@/services/customerNotificationService";
import { AppImage } from "@/components/common/AppImage";
import { CityModal } from "./CityModal";
import { NotificationModal } from "./NotificationModal";
import { SearchModal } from "./SearchModal";
import { DesktopNav } from "./DesktopNav";
import { OwnerCenterLink } from "./OwnerCenterLink";

interface HeaderProps {
  locationName?: string;
  unreadNotificationsCount?: number;
  onLocationClick?: () => void;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
  onCityChange?: (city: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  locationName = "تبریز",
  unreadNotificationsCount,
  onLocationClick,
  onNotificationClick,
  onSearchClick,
  onCityChange,
}) => {
  const { isLoggedIn, role, logout } = useAuth();

  const [currentCity, setCurrentCity] = useState(locationName);
  const [unreadCount, setUnreadCount] = useState<number>(
    unreadNotificationsCount ?? 0,
  );

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const desktopAccountMenuRef = useRef<HTMLDivElement>(null);
  const desktopAccountButtonRef = useRef<HTMLButtonElement>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null);
  const mobileAccountButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch real unread notification count for authenticated customers
  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await customerNotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Retain existing count on network errors without fabricating values
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (unreadNotificationsCount !== undefined) {
      setUnreadCount(unreadNotificationsCount);
    } else {
      fetchUnreadCount();
    }
  }, [unreadNotificationsCount, fetchUnreadCount]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDesktop =
        desktopAccountMenuRef.current?.contains(target);
      const clickedInsideMobile =
        mobileAccountMenuRef.current?.contains(target);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        if (
          desktopAccountButtonRef.current &&
          desktopAccountButtonRef.current.offsetParent !== null
        ) {
          desktopAccountButtonRef.current.focus();
        } else if (mobileAccountButtonRef.current) {
          mobileAccountButtonRef.current.focus();
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isLoggedIn) {
      const timer = setTimeout(() => setIsAccountMenuOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      ) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    onCityChange?.(city);
  };

  const handleLocationBtnClick = () => {
    onLocationClick?.();
    setIsCityModalOpen(true);
  };

  const handleNotificationBtnClick = () => {
    onNotificationClick?.();
    setIsNotificationModalOpen(true);
  };

  const handleSearchBtnClick = () => {
    onSearchClick?.();
    setIsSearchModalOpen(true);
  };

  const notificationBadge =
    unreadCount > 9 ? "+۹" : toPersianDigits(unreadCount);

  const closeAccountMenu = () => setIsAccountMenuOpen(false);

  // Dynamic role-based navigation mapping
  const isManager = role === "MANAGER";
  const isAdmin = role === "ADMIN";
  const isOwner = isManager || isAdmin;

  // Managed reservations navigation based on role
  const reservationsHref = isOwner ? "/owner/reservations" : "/reservations";
  const reservationsLabel = isOwner ? "رزروهای گیم‌نت" : "رزروهای من";

  // فقط اگر دریافت اطلاعات از API شکست بخورد از نقش ذخیره‌شده استفاده می‌شود
  const centerLinkFallback: "admin" | "center" | "none" = isAdmin
    ? "admin"
    : isManager
    ? "center"
    : "none";

  /**
   * منوی دراپ‌داون پروفایل در هر اندازه صفحه هنگام لاگین بودن:
   * ۱. اطلاعات کاربر= پروفایل (/profile)
   * ۲. رزروهای من / مدیریت رزروها بر اساس نقش
   * ۳. نوتیفیکیشن
   * ۴. فقط یکی از: مدیریت گیمنت (اگر کاربر گیمنت دارد) | ساخت گیمنت (اگر ندارد)
   *    تشخیص بر اساس توکن و پاسخ API (/auth/me) انجام می‌شود، نه نقش ذخیره‌شده.
   * ۵. پشتیبانی (/support)
   * ۶. خروج از حساب
   */
  const renderAccountDropdownContent = () => (
    <div
      role="menu"
      aria-label="منوی حساب کاربری"
      className="absolute left-0 top-full z-50 mt-2 w-[250px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 text-right shadow-xl shadow-black/20 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {/* 1. اطلاعات کاربر= پروفایل */}
      <Link
        href="/profile"
        role="menuitem"
        onClick={closeAccountMenu}
        className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
      >
        <span className="shrink-0 text-[var(--text-muted)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            className="h-[18px] w-[18px]"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 20a7 7 0 0114 0"
            />
          </svg>
        </span>
        <span>اطلاعات کاربر (پروفایل)</span>
      </Link>

      {/* 2. رزروها (مدیریت شده بر اساس نقش کاربر) */}
      <Link
        href={reservationsHref}
        role="menuitem"
        onClick={closeAccountMenu}
        className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
      >
        <span className="shrink-0 text-[var(--text-muted)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            className="h-[18px] w-[18px]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </span>
        <span>{reservationsLabel}</span>
      </Link>

      {/* 3. نوتیفیکیشن */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          closeAccountMenu();
          handleNotificationBtnClick();
        }}
        className="w-full flex min-h-10 items-center justify-between rounded-lg px-3 py-2.5 text-sm text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 text-right cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[var(--text-muted)]">
            <svg
              className="h-[18px] w-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.7}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </span>
          <span>نوتیفیکیشن</span>
        </div>
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-bold text-on-primary">
            {notificationBadge}
          </span>
        )}
      </button>

      {/* 4. فقط یک لینک: مدیریت گیمنت یا ساخت گیمنت (بر اساس پاسخ API) */}
      <OwnerCenterLink
        variant="menu"
        onNavigate={closeAccountMenu}
        fallback={centerLinkFallback}
      />

      {/* 5. پشتیبانی */}
      <Link
        href="/support"
        role="menuitem"
        onClick={closeAccountMenu}
        className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
      >
        <span className="shrink-0 text-[var(--text-muted)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            className="h-[18px] w-[18px]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </span>
        <span>پشتیبانی</span>
      </Link>

      <div className="my-1 border-t border-[var(--border-subtle)]" />

      {/* 6. خروج از حساب */}
      <button
        type="button"
        role="menuitem"
        onClick={async () => {
          closeAccountMenu();
          await logout();
        }}
        className="w-full flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--accent-red)] transition-colors hover:bg-[var(--accent-red)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red)]/50 text-right cursor-pointer"
      >
        <svg
          className="h-[18px] w-[18px] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 17l5-5-5-5M15 12H3"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6"
          />
        </svg>
        <span>خروج از حساب</span>
      </button>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 w-full">
        {/* ================= MOBILE HEADER ================= */}
        <div className="lg:hidden border-b border-[var(--border-subtle)] bg-body-bg">
          <div className="flex flex-col gap-2 p-4">
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                className="flex shrink-0 items-center"
                aria-label="صفحه اصلی سایرا"
              >
                <AppImage
                  src="/design/sayra.svg"
                  alt="سایرا"
                  className="h-5 w-auto sm:h-6"
                  loading="eager"
                  priority
                />
              </Link>

              <button
                type="button"
                onClick={handleLocationBtnClick}
                className="flex shrink-0 items-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-white)]  transition-colors hover:bg-[var(--foreground)]/60 h-[40px]"
                aria-label="انتخاب شهر"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>

                <span className="text-xs font-bold">{currentCity}</span>

                <svg
                  className="h-3 w-3 shrink-0 text-[var(--text-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19 9-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Profile button on mobile (replacing notifications) */}
              {isLoggedIn ? (
                <div ref={mobileAccountMenuRef} className="relative">
                  <button
                    ref={mobileAccountButtonRef}
                    type="button"
                    onClick={() =>
                      setIsAccountMenuOpen((previous) => !previous)
                    }
                    aria-label="پروفایل"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 20a7 7 0 0114 0"
                      />
                    </svg>

                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -left-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-[var(--bg-body)] bg-[var(--primary)] text-[10px] font-bold text-on-primary px-0.5"
                        aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                      >
                        {notificationBadge}
                      </span>
                    )}
                  </button>

                  {isAccountMenuOpen && renderAccountDropdownContent()}
                </div>
              ) : (
                <Link
                  href="/profile"
                  aria-label="پروفایل"
                  className="relative flex h-10 w-10 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 20a7 7 0 0114 0"
                    />
                  </svg>
                </Link>
              )}
            </div>

            {/* Row 2: Search */}
            <button
              type="button"
              onClick={handleSearchBtnClick}
              aria-label="جست‌وجو در سایرا"
              className="group flex h-10 w-full items-center justify-between rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 text-xs text-[var(--text-white)] transition-all hover:border-[var(--primary)]/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <svg
                  className="h-4 w-4 shrink-0 text-[var(--primary)] transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                </svg>

                <span className="truncate text-xs text-[var(--text-subtle)]">
                  جست‌وجوی گیم‌نت، سیستم یا بازی…
                </span>
              </span>

              <span className="shrink-0 rounded bg-[var(--foreground)]/50 px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
                جستجو
              </span>
            </button>
          </div>
        </div>

        {/* ================= DESKTOP HEADER ================= */}
        <div className="hidden bg-body-bg lg:block">
          <div className="mx-auto flex min-h-[68px] max-w-[var(--max-app-width)] items-center justify-between gap-4 border border-[var(--border-subtle)] p-6">
            {/* Brand */}
            <Link
              href="/"
              className="flex shrink-0 items-center ml-4"
              aria-label="صفحه اصلی سایرا"
            >
              <AppImage
                src="/design/sayra.svg"
                alt="سایرا"
                className="h-8 w-auto"
                loading="eager"
                priority
              />
            </Link>

            {/* Navigation */}
            <div className="flex shrink-0 items-center">
              <DesktopNav onSearchClick={handleSearchBtnClick} />
            </div>

            {/* City selector */}
            <button
              type="button"
              onClick={handleLocationBtnClick}
              aria-label="انتخاب شهر"
              className="flex h-10 shrink-0 items-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--foreground)]/60 xl:px-3.5"
            >
              <svg
                className="h-4 w-4 shrink-0 text-[var(--primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>

              <span className="whitespace-nowrap text-xs font-bold text-[var(--text-white)]">
                {currentCity}
              </span>

              <svg
                className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19 9-7 7-7-7"
                />
              </svg>
            </button>

            {/* Search */}
            <button
              type="button"
              onClick={handleSearchBtnClick}
              aria-label="جست‌وجوی گیم‌نت، سیستم یا بازی"
              className="group flex h-10 w-full flex-1 items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 transition-colors hover:border-[var(--primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 xl:px-4"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <svg
                  className="h-4 w-4 shrink-0 text-[var(--primary)] transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                </svg>

                <span className="truncate text-xs text-[var(--text-subtle)] transition-colors group-hover:text-[var(--text-muted)]">
                  جست‌وجوی گیم‌نت، سیستم یا بازی…
                </span>
              </span>

              <span className="hidden shrink-0 rounded border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-2 py-1 text-xs font-medium text-[var(--text-muted)] xl:inline-flex">
                /
              </span>
            </button>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Account menu — desktop */}
              {isLoggedIn ? (
                <div ref={desktopAccountMenuRef} className="relative">
                  <button
                    ref={desktopAccountButtonRef}
                    type="button"
                    onClick={() =>
                      setIsAccountMenuOpen((previous) => !previous)
                    }
                    aria-label="پروفایل"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    className="relative flex h-10 w-10 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 20a7 7 0 0114 0"
                      />
                    </svg>
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--bg-body)] bg-[var(--primary)] text-[10px] font-bold text-on-primary px-1"
                        aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                      >
                        {notificationBadge}
                      </span>
                    )}
                  </button>

                  {isAccountMenuOpen && renderAccountDropdownContent()}
                </div>
              ) : (
                <Link
                  href="/profile"
                  className="flex h-10 items-center gap-1.5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)] transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 20a7 7 0 0114 0"
                    />
                  </svg>
                  <span>ورود / حساب</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* City Modal */}
      <CityModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={currentCity}
        onSelectCity={handleCitySelect}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onMarkAllAsRead={() => setUnreadCount(0)}
        onUnreadCountChange={(count) => setUnreadCount(count)}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        selectedCity={currentCity}
      />
    </>
  );
};