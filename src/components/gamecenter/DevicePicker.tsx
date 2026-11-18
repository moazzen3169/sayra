"use client";

import React from "react";
import { toPersianDigits } from "@/lib/format";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { CardSkeleton } from "@/components/ui/Skeleton";
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
  /** غیرفعال بودن رزرو آنلاین برای این گیمنت */
  reservationDisabled?: boolean;
}

export const DevicePicker: React.FC<DevicePickerProps> = ({
  categories,
  isLoading,
  error,
  onRetry,
  selection,
  onOpen,
  reservationDisabled = false,
}) => {
  if (isLoading) {
    return (
      <div className="w-full" aria-busy="true">
        <span className="sr-only">در حال بارگذاری</span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="دسته‌ها بارگذاری نشد"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (categories.length === 0) {
    return <EmptyState title="دستگاهی ثبت نشده" />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 w-full">
      {categories.map((cat) => {
        const key = categoryKey(cat);
        const count = selection[key]?.length ?? 0;
        const selected = count > 0;

        return (
          <button
            key={key}
            type="button"
            disabled={reservationDisabled}
            aria-pressed={selected}
            onClick={() => onOpen(cat)}
            className={cn(
              "group flex h-full w-full flex-col gap-3 rounded-card border p-3 text-right transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
              reservationDisabled
                ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-card)] opacity-50"
                : selected
                ? "cursor-pointer border-[var(--primary)] bg-[var(--primary-muted)]"
                : "cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
            )}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-[var(--foreground)]/40">
              <SafeImage
                src={cat.coverImageUrl || ""}
                alt={cat.name}
                fallbackSrc={PLACEHOLDERS.center}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
              />
              {selected && (
                <span className="absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-[var(--primary)] px-2 text-xs font-bold text-on-primary leading-none">
                  <Icon name="check" size={16} strokeWidth={2} />
                  <span>{toPersianDigits(count)}</span>
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="truncate text-card-title text-[var(--text-white)]">
                {cat.name}
              </h3>
              <span className="text-secondary text-[var(--text-muted)]">
                {toPersianDigits(cat.deviceCount)} دستگاه
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
