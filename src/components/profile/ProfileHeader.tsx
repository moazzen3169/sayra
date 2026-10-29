"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProfileHeaderProps {
  title?: string;
  isSubpage?: boolean;
  backUrl?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title = "حساب کاربری",
  isSubpage = false,
  backUrl,
}) => {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();

  const displayName = isLoggedIn && user?.fullName ? user.fullName : "کاربر سایرا";
  const effectiveBackUrl = backUrl || (isSubpage ? "/profile" : "/");

  const handleBackClick = () => {
    if (backUrl) {
      router.push(backUrl);
    } else if (isSubpage) {
      router.push("/profile");
    } else {
      router.push("/");
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] shadow-sm">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 lg:px-8 gap-2">
        {/* Right Section: Back Button + Welcome & User Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBackClick}
            aria-label={isSubpage ? "بازگشت به پروفایل" : "بازگشت"}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)]/40 hover:bg-[var(--foreground)] text-[var(--text-white)] transition-colors active:scale-95"
            title={isSubpage ? "بازگشت به پروفایل" : "بازگشت"}
          >
            <svg
              className="w-5 h-5 text-[var(--text-white)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>

          <div className="flex flex-col min-w-0">
            <span className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate font-medium">
              خوش آمدید 👋
            </span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-white)] truncate">
              {displayName}
            </span>
          </div>
        </div>

        {/* Center Section: Page Title */}
        <div className="flex items-center justify-center min-w-0 px-2 text-center">
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-[var(--text-white)] truncate">
            {title}
          </h1>
        </div>

        {/* Left Section: Home Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            aria-label="صفحه اصلی"
            title="صفحه اصلی"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)]/40 hover:bg-[var(--foreground)] text-[var(--primary)] transition-colors active:scale-95"
          >
            <svg
              className="w-5 h-5 text-[var(--primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
};
