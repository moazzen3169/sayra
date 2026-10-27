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
  const [unreadCount, setUnreadCount] = useState(unreadNotificationsCount);

  // Modal Visibility States
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    if (onCityChange) {
      onCityChange(city);
    }
  };

  const handleLocationBtnClick = () => {
    if (onLocationClick) {
      onLocationClick();
    }
    setIsCityModalOpen(true);
  };

  const handleNotificationBtnClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    }
    setIsNotificationModalOpen(true);
  };

  const handleSearchBtnClick = () => {
    if (onSearchClick) {
      onSearchClick();
    }
    setIsSearchModalOpen(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full max-w-[var(--max-app-width)] mx-auto bg-[var(--bg-body)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-2.5 lg:px-8 lg:py-3 transition-all">
        {/* ========================================================= */}
        {/* MOBILE HEADER (2 Rows) - Visible on screens < lg (1024px) */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {/* Mobile Row 1: Brand (right) | City Selector (center) | Notification (left, conditional) */}
          <div className="flex items-center justify-between gap-2">
            {/* 1. SAYRA Logo on the Right */}
            <Link href="/" className="shrink-0 flex items-center" aria-label="صفحه اصلی سایرا">
              <img src="/design/sayra.svg" alt="سایرا" className="h-5 sm:h-6 w-auto" />
            </Link>

            {/* 2. City Selector in the Center */}
            <button
              type="button"
              onClick={handleLocationBtnClick}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-card bg-[var(--bg-card)] hover:bg-[var(--foreground)]/60 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] transition-colors shrink-0"
              aria-label="انتخاب شهر"
            >
              <svg className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-extrabold text-[13px]">{currentCity}</span>
              <svg className="w-3 h-3 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 3. Notification Button on Left (ONLY for logged-in users) */}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleNotificationBtnClick}
                aria-label="اعلانات"
                className="relative w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--foreground)] flex items-center justify-center text-[var(--text-white)] transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full bg-[var(--primary)] text-[#101014] text-[9px] font-black flex items-center justify-center border border-[var(--bg-body)]"
                    aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                  >
                    {unreadCount > 9 ? "+۹" : toPersianDigits(unreadCount)}
                  </span>
                )}
              </button>
            ) : (
              <div className="w-9 h-9 opacity-0 pointer-events-none" aria-hidden="true" />
            )}
          </div>

          {/* Mobile Row 2: Full-width Primary Search Field */}
          <button
            type="button"
            onClick={handleSearchBtnClick}
            className="w-full h-11 px-3.5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/40 focus:border-[var(--primary)]/60 flex items-center justify-between text-xs text-[var(--text-white)] transition-all group"
            aria-label="جست‌وجو در سایرا"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <svg
                className="w-4 h-4 text-[var(--primary)] shrink-0 transition-transform group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
              </svg>
              <span className="text-[var(--text-subtle)] text-[12px] truncate">
                جست‌وجوی گیم‌نت، سیستم یا بازی…
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--foreground)]/50 text-[var(--text-muted)] shrink-0">
              جستجو
            </span>
          </button>
        </div>

        {/* ========================================================== */}
        {/* DESKTOP HEADER (2 Rows) - Visible on screens >= lg (1024px) */}
        {/* ========================================================== */}
        <div className="hidden lg:flex lg:flex-col lg:gap-3">
          {/* Desktop Row 1: SAYRA Logo (right) | Global Navigation (leftwards) */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/60 pb-2.5">
            <div className="flex items-center gap-8">
              {/* SAYRA Logo */}
              <Link href="/" className="shrink-0 flex items-center" aria-label="صفحه اصلی سایرا">
                <img src="/design/sayra.svg" alt="سایرا" className="h-6 w-auto" />
              </Link>

              {/* Global Navigation Links */}
              <DesktopNav onSearchClick={handleSearchBtnClick} />
            </div>

            {/* Tagline badge */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
              <span>پلتفرم جامع گیمینگ سنترهای ایران</span>
            </div>
          </div>

          {/* Desktop Row 2: City Selector (right) | Large Search Field (center) | My Bookings + Notification (left) */}
          <div className="flex items-center justify-between gap-4 pt-0.5">
            {/* 1. City Selector on the Right */}
            <button
              type="button"
              onClick={handleLocationBtnClick}
              className="flex items-center gap-2 py-2 px-3.5 rounded-card bg-[var(--bg-card)] hover:bg-[var(--foreground)]/60 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] transition-colors shrink-0"
              aria-label="انتخاب شهر"
            >
              <svg className="w-4 h-4 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-extrabold text-xs">{currentCity}</span>
              <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 2. Large Primary Search Field in the Center */}
            <button
              type="button"
              onClick={handleSearchBtnClick}
              className="flex-1 max-w-[580px] h-11 px-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 focus:border-[var(--primary)]/80 flex items-center justify-between text-xs text-[var(--text-white)] transition-all group"
              aria-label="جست‌وجوی گیم‌نت، سیستم یا بازی"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-[var(--primary)] shrink-0 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                </svg>
                <span className="text-[var(--text-subtle)] group-hover:text-[var(--text-muted)] transition-colors">
                  جست‌وجوی گیم‌نت، سیستم یا بازی…
                </span>
              </div>
              <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--foreground)]/40 px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                کلید ↵
              </span>
            </button>

            {/* 3. Actions on the Left: "رزروهای من" & Conditional Notifications */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/reservations"
                className="h-11 px-4 rounded-card bg-[var(--bg-card)] hover:bg-[var(--foreground)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/40 flex items-center gap-2 text-xs font-bold text-[var(--text-white)] transition-all"
              >
                <svg className="w-4 h-4 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M9 16l2 2 4-4" />
                </svg>
                <span>رزروهای من</span>
              </Link>

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={handleNotificationBtnClick}
                  aria-label="اعلانات"
                  className="relative w-11 h-11 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--foreground)] flex items-center justify-center text-[var(--text-white)] transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full bg-[var(--primary)] text-[#101014] text-[9px] font-black flex items-center justify-center border border-[var(--bg-body)]"
                      aria-label={`${toPersianDigits(unreadCount)} اعلان خوانده‌نشده`}
                    >
                      {unreadCount > 9 ? "+۹" : toPersianDigits(unreadCount)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* City Selection Modal */}
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
