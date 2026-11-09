"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { toPersianDigits } from "@/lib/format";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
  const isDraggingRef = useRef(false);

  const carouselOptions = useMemo(
    () => ({
      direction: "rtl" as const,
      align: "start" as const,
      dragFree: true,
      containScroll: "trimSnaps" as const,
    }),
    [],
  );

  const handleSetApi = useCallback((api: Parameters<NonNullable<React.ComponentProps<typeof Carousel>["setApi"]>>[0]) => {
    if (!api) return;
    api.on("pointerDown", () => {
      isDraggingRef.current = false;
    });
    api.on("scroll", () => {
      isDraggingRef.current = true;
    });
    api.on("pointerUp", () => {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="w-full" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 animate-pulse"
            >
              <div className="aspect-[4/3] w-full rounded-card bg-[var(--bg-body)]" />
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="h-4 w-3/4 rounded bg-[var(--bg-body)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--bg-body)]" />
              </div>
              <div className="mt-2 h-11 w-full rounded-card bg-[var(--bg-body)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="دسته‌بندی دستگاه‌ها لود نشد"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="دستگاهی ثبت نشده"
        description="این گیم‌نت در حال حاضر دستگاهی برای رزرو آنلاین اضافه نکرده است."
      />
    );
  }

  return (
    <div className="relative w-full">
      <Carousel
        opts={carouselOptions}
        setApi={handleSetApi}
        className="w-full"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {toPersianDigits(categories.length)} نوع دستگاه موجود
          </span>
          <div className="hidden sm:flex items-center gap-1.5" dir="rtl">
            <CarouselPrevious
              className="static h-8 w-8 translate-x-0 translate-y-0 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:bg-[var(--foreground)]"
            />
            <CarouselNext
              className="static h-8 w-8 translate-x-0 translate-y-0 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:bg-[var(--foreground)]"
            />
          </div>
        </div>

        <CarouselContent className="-mr-3 -ml-3">
          {categories.map((cat) => {
            const key = categoryKey(cat);
            const count = selection[key]?.length ?? 0;
            const selected = count > 0;

            return (
              <CarouselItem
                key={key}
                className="basis-[68%] pr-3 pl-3 sm:basis-1/3 lg:basis-1/4"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isDraggingRef.current) return;
                    onOpen(cat);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(cat);
                    }
                  }}
                  className={cn(
                    "group flex h-full w-full cursor-pointer flex-col gap-3 rounded-card border p-3 text-right transition-all select-none",
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                  )}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-[var(--foreground)]/40">
                    <SafeImage
                      src={cat.coverImageUrl || ""}
                      alt={cat.name}
                      fallbackSrc={PLACEHOLDERS.center}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {selected && (
                      <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-2 text-xs font-bold text-on-primary shadow-md">
                        {toPersianDigits(count)}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="truncate text-sm font-bold text-[var(--text-white)]">
                      {cat.name}
                    </h3>
                    <span className="text-xs text-[var(--text-muted)]">
                      {toPersianDigits(cat.deviceCount)} دستگاه آماده بازی
                    </span>
                  </div>

                  <span className="mt-auto flex h-11 w-full items-center justify-center gap-1.5 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] text-sm font-bold text-[var(--text-white)] transition-colors group-hover:bg-[var(--border-color)]">
                    <Icon name={selected ? "edit" : "plus"} size={16} />
                    <span>{selected ? "تغییر انتخاب" : "انتخاب"}</span>
                  </span>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
