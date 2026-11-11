"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOwner } from "@/context/OwnerContext";
import { OwnerVerificationBadge } from "@/components/owner/OwnerVerificationBadge";

interface OwnerHeaderProps {
  title?: string;
  isSubpage?: boolean;
  backUrl?: string;
  showBadge?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  searchPlaceholder?: string;
}

export const OwnerHeader: React.FC<OwnerHeaderProps> = ({
  title = "پنل مدیریت",
  isSubpage = true,
  backUrl,
  showBadge = true,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "جستجوی کد رزرو یا مشتری...",
}) => {
  const router = useRouter();
  const { ownerName, center } = useOwner();
  const [internalSearchOpen, setInternalSearchOpen] = React.useState(false);
  const [localQuery, setLocalQuery] = React.useState(searchValue);

  React.useEffect(() => {
    setLocalQuery(searchValue);
  }, [searchValue]);

  const displayName = ownerName || "مدیر گیم‌نت";

  const handleBackClick = () => {
    if (backUrl) {
      router.push(backUrl);
    } else if (isSubpage) {
      router.push("/owner");
    } else {
      router.push("/");
    }
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(e);
    } else {
      const q = localQuery.trim();
      router.push(q ? `/owner/reservations?q=${encodeURIComponent(q)}` : "/owner/reservations");
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 max-w-[var(--max-app-width)] mx-auto bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-[var(--max-mini-app-width)] items-center justify-between px-4 lg:px-0 gap-2">
        {/* Right Section: Back Button + Welcome & Owner Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBackClick}
            aria-label={isSubpage ? "بازگشت به پنل مدیریت" : "بازگشت"}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)]/40 hover:bg-[var(--foreground)] text-[var(--text-white)] transition-colors active:scale-95"
            title={isSubpage ? "بازگشت به پنل مدیریت" : "بازگشت"}
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

          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-[var(--text-white)] truncate">
                {title}
              </h1>
              {center?.name && (
                <span className="text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full truncate hidden sm:inline-block">
                  {center.name}
                </span>
              )}
            </div>
            {/* نام صاحب گیمنت لینک شده به پروفایل کاربر */}
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              <Link
                href="/profile"
                className="hover:text-[var(--primary)] hover:underline transition-colors font-medium"
                title="مشاهده پروفایل صاحب گیم‌نت"
              >
                {displayName}
              </Link>{" "}
              {center?.name ? `• ${center.name}` : ""}
            </div>
          </div>
        </div>

        {/* Center / Search bar when desktop or active */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-sm mx-2">
            <form onSubmit={handleLocalSubmit} className="relative w-full">
              <input
                value={onSearchChange ? searchValue : localQuery}
                onChange={(e) => {
                  if (onSearchChange) onSearchChange(e.target.value);
                  else setLocalQuery(e.target.value);
                }}
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                className="w-full h-10 rounded-full bg-[var(--foreground)]/50 border border-[var(--border-subtle)] px-4 pl-10 text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
              <button
                type="submit"
                aria-label="جستجو"
                className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Left Section: Search Toggle (Mobile) + Badge + Home */}
        <div className="flex items-center gap-2 shrink-0">


          {showBadge && (
            <div className="hidden sm:block">
              <OwnerVerificationBadge size="sm" />
            </div>
          )}

          <Link
            href="/"
            aria-label="صفحه اصلی سایت"
            title="صفحه اصلی سایت"
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
