"use client";

import React from "react";
import { toPersianDigits } from "@/lib/format";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import { cn } from "@/lib/utils";

/** کلید یکتای هر دسته در کاتالوگ */
export const categoryKey = (c: DeviceCategory) =>
  `${c.catalogId ?? "nocatalog"}-${c.deviceType}`;

interface DevicePickerProps {
  categories: DeviceCategory[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** دستگاه‌های انتخاب‌شده به تفکیک دسته */
  selection: Record<string, PhysicalStation[]>;
  onOpen: (category: DeviceCategory) => void;
}

export const DevicePicker: React.FC<DevicePickerProps> = ({
  categories,
  isLoading,
  error,
  onRetry,
  selection,
  onOpen,
}) => {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="بارگذاری دسته‌بندی دستگاه‌ها انجام نشد"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="دسته‌بندی دستگاهی ثبت نشده است"
        description="این گیمنت هنوز دستگاهی برای رزرو آنلاین ثبت نکرده است."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {categories.map((cat) => {
        const key = categoryKey(cat);
        const count = selection[key]?.length ?? 0;
        const selected = count > 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(cat)}
            className={cn(
              "flex h-full w-full flex-col gap-3 rounded-card border p-3 text-right transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
              selected
                ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
            )}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-[var(--foreground)]/40 ">
              <SafeImage
                src={cat.coverImageUrl || ""}
                alt={cat.name}
                fallbackSrc={PLACEHOLDERS.center}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
              />
              {selected && (
                <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-bold text-on-primary">
                  {toPersianDigits(count)}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="truncate text-sm font-bold text-[var(--text-white)]">
                {cat.name}
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {toPersianDigits(cat.deviceCount)} دستگاه موجود
              </span>
            </div>

            <span className="mt-auto flex h-11 w-full items-center justify-center gap-1.5 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] text-sm font-bold text-[var(--text-white)]">
              <Icon name={selected ? "edit" : "plus"} size={16} />
              <span>{selected ? "ویرایش انتخاب" : "افزودن"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};