"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { toPersianDigits } from "@/lib/format";
import { customerNotificationService } from "@/services/customerNotificationService";
import { CityModal } from "./CityModal";
import { NotificationModal } from "./NotificationModal";
import { SearchModal } from "./SearchModal";
import { DesktopNav } from "./DesktopNav";

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

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

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
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        accountButtonRef.current?.focus();
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
  // admin  = admin panel (/admin)
  // manager = owner (/owner)
  // user = profile (/profile)
  const isManager = role === "MANAGER";
  const isAdmin = role === "ADMIN";

  const primaryAction = isAdmin
    ? {
        href: "/admin",
        label: "پنل مدیریت",
        shortLabel: "ادمین",
        icon: (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-4 w-4 shrink-0 text-[var(--primary)]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        ),
      }
    : isManager
      ? {
          href: "/owner",
          label: "پنل مدیریت گیم‌نت",
          shortLabel: "پنل گیم‌نت",
          icon: (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-4 w-4 shrink-0 text-[var(--primary)]"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          ),
        }
      : {
          href: "/reservations",
          label: "رزروهای من",
          shortLabel: "رزروها",
          icon: (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-4 w-4 shrink-0 text-[var(--primary)]"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          ),
        };

  const accountLinks = isAdmin
    ? [
        {
          href: "/admin",
          label: "پنل مدیریت سامانه",
          icon: (
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ),
        },
        {
          href: "/admin/gamecenters",
          label: "مراکز بازی",
          icon: (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          ),
        },
      ]
    : isManager
      ? [
          {
            href: "/owner",
            label: "پنل مدیریت گیم‌نت",
            icon: (
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            ),
          },
          {
            href: "/owner/reservations",
            label: "رزروهای گیم‌نت",
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
          },
        ]
      : [
          {
            href: "/profile",
            label: "حساب کاربری",
            icon: (
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
            ),
          },
          {
            href: "/reservations",
            label: "رزروهای من",
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
          },
        ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 w-full">
        {/* ================= MOBILE HEADER ================= */}
        <div className="lg:hidden border-b border-[var(--border-subtle)] bg-body-bg">
          <div className="flex flex-col gap-2 p-2">
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                className="flex shrink-0 items-center"
                aria-label="صفحه اصلی سایرا"
              >
                <img
                  src="/design/sayra.svg"
                  alt="سایرا"
                  className="h-5 w-auto sm:h-6"
                />
              </Link>

              <button
                type="button"
                onClick={handleLocationBtnClick}
                className="flex shrink-0 items-center gap-1.5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60"
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

              {isLoggedIn ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleNotificationBtnClick}
                    aria-label="اعلانات"
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>

                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--bg-body)] bg-[var(--primary)] px-1 text-xs font-bold text-on-primary"
                        aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                      >
                        {notificationBadge}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-9 w-9 shrink-0" aria-hidden="true" />
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
            <div className="flex items-center gap-6 shrink-0">
              {/* Navigation */}
              <div className="flex shrink-0 items-center">
                <DesktopNav onSearchClick={handleSearchBtnClick} />
              </div>
            </div>

                          {/* Brand */}
              <Link
                href="/"
                className="flex shrink-0 items-center"
                aria-label="صفحه اصلی سایرا"
              >
                <img
                  src="/design/sayra.svg"
                  alt="سایرا"
                  className="h-6 w-auto"
                />
              </Link>

            <div className="flex items-center gap-2 shrink-0 ">
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
                className="group flex h-10 max-w-[300px] flex-1 items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 transition-colors hover:border-[var(--primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 xl:px-4"
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
                {/* <Link
                href={primaryAction.href}
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--foreground)] xl:px-3.5"
              >
                {primaryAction.icon}
                <span>{primaryAction.label}</span>
              </Link> */}

                {/* Account menu — desktop only */}
                {isLoggedIn ? (
                  <div ref={accountMenuRef} className="relative">
                    <button
                      ref={accountButtonRef}
                      type="button"
                      onClick={() =>
                        setIsAccountMenuOpen((previous) => !previous)
                      }
                      aria-label="حساب کاربری"
                      aria-haspopup="menu"
                      aria-expanded={isAccountMenuOpen}
                      className="flex h-10 w-10 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
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
                    </button>

                    {isAccountMenuOpen && (
                      <div
                        role="menu"
                        aria-label="منوی حساب کاربری"
                        className="absolute left-0 top-full z-50 mt-2 w-[250px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 text-right shadow-xl shadow-black/20 animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        {accountLinks.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={closeAccountMenu}
                            className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                          >
                            <span className="shrink-0 text-[var(--text-muted)]">
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        ))}

                        <div className="my-1 border-t border-[var(--border-subtle)]" />

                        <button
                          type="button"
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
                    )}
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
