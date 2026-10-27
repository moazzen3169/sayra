"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { toPersianDigits } from "@/lib/format";
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
  unreadNotificationsCount = 2,
  onLocationClick,
  onNotificationClick,
  onSearchClick,
  onCityChange,
}) => {
  const { isLoggedIn } = useAuth();

  const [currentCity, setCurrentCity] = useState(locationName);
  const [unreadCount, setUnreadCount] = useState(
    unreadNotificationsCount
  );

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] =
    useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 w-full">
        {/* ================= MOBILE HEADER ================= */}
        <div className="lg:hidden bg-body-bg border-b border-[var(--border-subtle)]">
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
                  className="h-5 sm:h-6 w-auto"
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

                <span className="text-[13px] font-extrabold">
                  {currentCity}
                </span>

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
                      className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--bg-body)] bg-[var(--primary)] px-1 text-[9px] font-black text-[#101014]"
                      aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                    >
                      {notificationBadge}
                    </span>
                  )}
                </button>
              ) : (
                <div
                  className="h-9 w-9 shrink-0"
                  aria-hidden="true"
                />
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
                  <path
                    strokeLinecap="round"
                    d="m20 20-3.5-3.5"
                  />
                </svg>

                <span className="truncate text-[12px] text-[var(--text-subtle)]">
                  جست‌وجوی گیم‌نت، سیستم یا بازی…
                </span>
              </span>

              <span className="shrink-0 rounded bg-[var(--foreground)]/50 px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                جستجو
              </span>
            </button>
          </div>
        </div>

        {/* ================= DESKTOP HEADER ================= */}
        <div className="hidden  bg-body-bg lg:block">
          <div className="mx-auto flex min-h-[68px] max-w-[1400px] border border-[var(--border-subtle)] items-center gap-4 p-6">
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
              className="group flex h-10 min-w-[100px]  flex-1 items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 transition-colors hover:border-[var(--primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 xl:px-4"
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
                  <path
                    strokeLinecap="round"
                    d="m20 20-3.5-3.5"
                  />
                </svg>

                <span className="truncate text-xs text-[var(--text-subtle)] transition-colors group-hover:text-[var(--text-muted)]">
                  جست‌وجوی گیم‌نت، سیستم یا بازی…
                </span>
              </span>

              <span className="hidden shrink-0 rounded border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] xl:inline-flex">
                Ctrl + F
              </span>
            </button>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/reservations"
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--foreground)] xl:px-3.5"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-[var(--primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="m9 16 2 2 4-4" />
                </svg>

                <span>رزروهای من</span>
              </Link>

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={handleNotificationBtnClick}
                  aria-label="اعلانات"
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--foreground)]"
                >
                  <svg
                    className="h-5 w-5"
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
                      className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--bg-body)] bg-[var(--primary)] px-1 text-[9px] font-black text-[#101014]"
                      aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                    >
                      {notificationBadge}
                    </span>
                  )}
                </button>
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
