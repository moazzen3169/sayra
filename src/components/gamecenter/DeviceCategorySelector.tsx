"use client";

import React from "react";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import { toPersianDigits } from "@/lib/format";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

interface DeviceCategorySelectorProps {
  categories: DeviceCategory[];
  selectedCategory: DeviceCategory | null;
  onSelectCategory: (category: DeviceCategory) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const DeviceCategorySelector: React.FC<DeviceCategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" aria-busy="true">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="w-44 h-24 shrink-0 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse p-3 flex flex-col justify-between"
          >
            <div className="w-12 h-4 rounded bg-[var(--foreground)]/60" />
            <div className="w-24 h-5 rounded bg-[var(--foreground)]/80" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-5 text-center flex flex-col items-center gap-2">
        <p className="text-xs font-bold text-[var(--accent-red)] leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-8 px-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-white)] transition-colors"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-muted)]">
        هیچ دسته‌بندی دستگاهی برای این گیمنت یافت نشد.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>نوع دستگاه را انتخاب کنید:</span>
        <span>{toPersianDigits(categories.length)} دسته‌بندی موجود</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
        {categories.map((cat, idx) => {
          const isSelected =
            selectedCategory?.catalogId === cat.catalogId &&
            selectedCategory?.deviceType === cat.deviceType;

          return (
            <button
              key={`${cat.catalogId ?? "nocatalog"}-${cat.deviceType}-${idx}`}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`snap-start shrink-0 w-44 rounded-card p-3 border-2 transition-all flex flex-col gap-2.5 text-right relative overflow-hidden ${
                isSelected
                  ? "bg-[var(--primary)]/[0.08] border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[var(--primary)] text-on-primary flex items-center justify-center text-xs font-black shadow-sm">
                  ✓
                </span>
              )}

              <div className="w-10 h-10 rounded-lg bg-[var(--foreground)]/50 p-1 flex items-center justify-center overflow-hidden">
                <SafeImage
                  src={cat.coverImageUrl || ""}
                  alt={cat.name}
                  fallbackSrc={PLACEHOLDERS.center}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-[var(--text-white)] truncate">
                  {cat.name}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {toPersianDigits(cat.deviceCount)} دستگاه فیزیکی
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
