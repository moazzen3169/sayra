"use client";

import React, { useState } from "react";
import Link from "next/link";
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
      <header className="fixed top-0 z-40 w-full max-w-[var(--max-app-width)] bg-[var(--bg-body)]/95 backdrop-blur-md px-4 pt-4 pb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 lg:px-8 lg:py-3 border-b border-[var(--border-subtle)]">
        {/* Desktop Logo */}
        <Link href="/" className="hidden lg:block shrink-0 lg:order-1">
          <img src="/design/sayra.svg" alt="سایرا" className="h-6 w-auto" />
        </Link>

        {/* Row 1: Location (right) + Notifications (left) */}
        <div className="flex items-center justify-between lg:contents">
          <button
            type="button"
            onClick={handleLocationBtnClick}
            className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-[var(--bg-card)] hover:bg-[var(--foreground)] border border-[var(--border-subtle)] transition-colors text-xs text-[var(--text-white)] lg:order-2 shrink-0"
          >
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-extrabold">{currentCity}</span>
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleNotificationBtnClick}
            aria-label="اعلانات"
            className="relative w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--foreground)] flex items-center justify-center text-[var(--text-white)] transition-colors lg:order-5 shrink-0"
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
        </div>

        {/* Row 2: Search bar */}
        <button
          type="button"
          onClick={handleSearchBtnClick}
          className="w-full h-11 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 px-4 flex items-center gap-2 text-xs text-[var(--text-white)] text-right transition-all group lg:order-3 lg:flex-1 lg:max-w-[520px]"
        >
          <span className="text-[var(--text-muted)] group-hover:text-[var(--text-white)] transition-colors">جستجو در</span>
          <img src="/design/sayra.svg" alt="سایرا" className="h-4 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="text-[var(--text-subtle)] hidden sm:inline-block mr-1">(گیمنت، PS5، PC، بازی...)</span>
          <svg
            className="w-4 h-4 text-[var(--primary)] mr-auto shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:order-4 lg:mx-auto">
          <DesktopNav />
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
