"use client";

import React, { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { BLOG_SORT_OPTIONS } from "@/lib/blog";
import type { BlogSort } from "@/types/blog";

interface BlogSortSheetProps {
  value: BlogSort;
  onChange: (value: BlogSort) => void;
  onClose: () => void;
}

/** فقط هنگام باز بودن Mount می‌شود */
export const BlogSortSheet: React.FC<BlogSortSheetProps> = ({
  value,
  onChange,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blog-sort-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full animate-sheetUp flex-col gap-4 rounded-t-2xl border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:max-w-[480px] sm:rounded-card sm:border"
      >
        <div className="flex items-center justify-between">
          <h2
            id="blog-sort-title"
            className="text-base font-bold text-[var(--text-white)]"
          >
            مرتب‌سازی مقاله‌ها
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-white)]"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div role="radiogroup" aria-label="روش مرتب‌سازی" className="flex flex-col gap-2">
          {BLOG_SORT_OPTIONS.map((option) => {
            const active = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onChange(option.id);
                  onClose();
                }}
                className={`flex h-12 items-center justify-between rounded-card border px-4 text-sm font-bold transition-colors ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--foreground)]/40 text-[var(--text-white)] hover:border-[var(--primary)]/50"
                }`}
              >
                <span>{option.label}</span>
                {active && <Icon name="check" size={20} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};