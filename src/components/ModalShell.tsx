"use client";

import React, { useEffect, useRef } from "react";

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  /** محتوای سمت چپ هدر (اختیاری) — مثلاً دکمه «علامت خوانده‌شده» */
  headerActions?: React.ReactNode;
  /** اگر true باشد فوکوس خودکار روی ورودی جستجو انجام نمی‌شود */
  disableAutoFocus?: boolean;
  /** ref برای فوکوس روی ورودی داخل محتوا */
  focusRef?: React.RefObject<HTMLElement | null>;
  /** عنوان قابل نمایش در هدر (اختیاری) */
  title?: React.ReactNode;
  /** حداکثر عرض محتوا (پیش‌فرض یکسان برای همه) */
  maxWidthClass?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  children,
  headerActions,
  disableAutoFocus = false,
  focusRef,
  title,
  maxWidthClass = "max-w-[var(--max-mini-app-width)]",
}) => {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    let timer: number | undefined;
    if (!disableAutoFocus && focusRef?.current) {
      timer = window.setTimeout(() => {
        focusRef.current?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (timer) window.clearTimeout(timer);
    };
  }, [isOpen, onClose, disableAutoFocus, focusRef]);

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      ref={shellRef}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-body)] text-[var(--text-white)] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Header — قالب یکسان برای همه مودال‌ها */}
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-body)]">
        <div
          className={`mx-auto flex w-full ${maxWidthClass} items-center gap-3 px-4 py-3 sm:px-6`}
        >
          {title ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {title}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          {headerActions && (
            <div className="shrink-0">{headerActions}</div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="m18 6-12 12M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>
    </div>
  );
};