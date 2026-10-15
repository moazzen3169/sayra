"use client";

import React from "react";

export interface GamecenterDetailHeaderProps {
  title: string;
  location: string;
  showDetails: boolean;
  onBackClick: () => void;
  onNotificationClick: () => void;
  unreadNotificationsCount?: number;
}

export const GamecenterDetailHeader: React.FC<GamecenterDetailHeaderProps> = ({
  title,
  location,
  showDetails,
  onBackClick,
  onNotificationClick,
  unreadNotificationsCount = 0,
}) => {
  return (
    <header className="fixed top-0 z-40 w-full max-w-[780px] bg-[var(--bg-card)]   transition-all">
      <div className="max-w-[780px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left Side: Back button + Title & Location when scrolled */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBackClick}
            aria-label="بازگشت"
            className="w-10 h-10 flex items-center justify-center shrink-0 "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-arrow-right preview-icon"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>

          {showDetails && (
            <div className="flex flex-col min-w-0 animate-fadeIn transition-all">
              <h1 className="text-sm font-extrabold text-[var(--text-white)] truncate">
                {title}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {location}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Notification Icon */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNotificationClick}
            aria-label="اعلانات"
            className="relative w-10 h-10  text-[var(--text-white)] flex items-center justify-center  transition-colors"
          >
            <svg
              className="w-5 h-5 text-[var(--text-white)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary)] text-[#101014] text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
