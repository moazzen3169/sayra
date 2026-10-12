import React from "react";

interface HeaderProps {
  locationName?: string;
  unreadNotificationsCount?: number;
  userName?: string;
  isLoggedIn?: boolean;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onLocationClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  locationName = "تهران، سعادت‌آباد",
  unreadNotificationsCount = 2,
  userName,
  isLoggedIn = false,
  onNotificationClick,
  onProfileClick,
  onLocationClick,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-body)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3 transition-all">
      <div className="flex items-center justify-between gap-3">
        {/* Right side: Logo & App Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-[#101014] font-black flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,255,61,0.25)]">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-[var(--text-white)]">
              سایرا <span className="text-[var(--primary)] text-xs font-normal">SAYRA</span>
            </span>
            <button
              onClick={onLocationClick}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors text-right"
            >
              <svg
                className="w-3.5 h-3.5 text-[var(--primary)] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate max-w-[140px]">{locationName}</span>
              <svg
                className="w-3 h-3 text-[var(--text-subtle)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Left side: Notification Bell & Auth / User Profile */}
        <div className="flex items-center gap-2">
          {/* Notification Button */}
          <button
            onClick={onNotificationClick}
            className="relative w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-white)] hover:border-[var(--primary)] transition-colors"
            aria-label="اعلانات"
          >
            <svg
              className="w-5 h-5 text-[var(--text-white)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[var(--primary)] text-[#101014] text-[10px] font-black flex items-center justify-center border-2 border-[var(--bg-body)]">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Profile / Auth Button */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 h-10 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-white)] hover:border-[var(--primary)] transition-colors text-xs font-medium"
          >
            {isLoggedIn ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-[var(--primary-muted)] text-[var(--primary)] font-bold flex items-center justify-center text-xs">
                  {userName ? userName.substring(0, 1) : "U"}
                </div>
                <span className="max-w-[80px] truncate hidden sm:inline">
                  {userName || "کاربر"}
                </span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-[var(--primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span>ورود / ثبت‌نام</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
