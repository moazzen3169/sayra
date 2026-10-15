import React from "react";
import { toPersianDigits } from "@/lib/format";

interface HeaderProps {
  locationName?: string;
  unreadNotificationsCount?: number;
  onLocationClick?: () => void;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  locationName = "تبریز",
  unreadNotificationsCount = 0,
  onLocationClick,
  onNotificationClick,
  onSearchClick,
}) => {
  return (
    <header className="fixed top-0 z-40 w-full max-w-[780px] bg-[var(--bg-body)] px-4 pt-4 pb-3 flex flex-col gap-4">
      {/* Row 1: Location (right) + Bell (left) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onLocationClick}
          className="flex items-center gap-2 text-sm text-[var(--text-white)]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.686 7-11a7 7 0 10-14 0c0 5.314 7 11 7 11z" />
            <circle cx="12" cy="10" r="1.5" />
          </svg>
          <span>{locationName}</span>
          <svg className="w-5 h-5 text-[var(--text-muted)] mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onNotificationClick}
          aria-label="اعلانات"
          className="relative w-8 h-8 flex items-center justify-center text-[var(--text-white)]"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadNotificationsCount > 0 && (
            <span
              className="absolute top-0 left-0 min-w-4 h-4 px-1 rounded-full bg-[var(--primary)] text-[#101014] text-[9px] font-black flex items-center justify-center"
              aria-label={`${toPersianDigits(unreadNotificationsCount)} اعلان خوانده‌نشده`}
            >
              {unreadNotificationsCount > 9 ? "+۹" : toPersianDigits(unreadNotificationsCount)}
            </span>
          )}
        </button>
      </div>

      {/* Row 2: Search bar */}
      <button
        type="button"
        onClick={onSearchClick}
        className="w-full h-12 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 flex items-center gap-2 text-sm text-[var(--text-white)] text-right"
      >
        <span>جستجو در</span>
        <img src="/design/sayra.svg" alt="سایرا" className="h-5 w-auto" />
        <svg
          className="w-5 h-5 text-[var(--text-muted)] mr-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
        </svg>
      </button>
    </header>
  );
};