"use client";

import React from "react";
import { toPersianDigits } from "@/lib/format";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { DevicePickerSkeleton } from "@/components/gamecenter/GamecenterDetailSkeletons";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
    return <DevicePickerSkeleton />;
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
    <>
      {/* دسکتاپ: اسلایدر افقی با کارت‌های بزرگ */}
      <Carousel
        opts={{ direction: "rtl", align: "start", containScroll: "trimSnaps" }}
        className="hidden lg:block w-full"
      >
        <CarouselContent className="-mr-3">
          {categories.map((cat) => {
            const key = categoryKey(cat);
            const count = selection[key]?.length ?? 0;
            const selected = count > 0;

            return (
              <CarouselItem key={key} className="basis-1/2 pr-3">
                <button
                  type="button"
                  disabled={reservationDisabled}
                  aria-pressed={selected}
                  onClick={() => onOpen(cat)}
                  aria-label={
                    selected
                      ? `${cat.name}، ${toPersianDigits(count)} دستگاه انتخاب شده. برای تغییر انتخاب کلیک کنید`
                      : `انتخاب ${cat.name}`
                  }
                  className={cn(
                    "group flex w-full flex-col overflow-hidden rounded-card border-2 text-right transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    reservationDisabled
                      ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-card)] opacity-50"
                      : selected
                      ? "cursor-pointer border-[var(--primary)] bg-[var(--primary-muted)]"
                      : "cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)]/60"
                  )}
                >
                  {/* تصویر — بدون هیچ متنی روی آن تا خوانایی حفظ شود */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--foreground)]/40">
                    <SafeImage
                      src={cat.coverImageUrl || ""}
                      alt=""
                      fallbackSrc={PLACEHOLDERS.center}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    {selected && (
                      <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-on-primary shadow-md">
                        <Icon name="check" size={16} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* اطلاعات + اقدام روی پس‌زمینه یکدست */}
                  <div className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="truncate text-card-title text-[var(--text-white)]">
                        {cat.name}
                      </h3>
                      <span className="text-secondary text-[var(--text-muted)]">
                        {selected
                          ? `${toPersianDigits(count)} از ${toPersianDigits(cat.deviceCount)} دستگاه انتخاب شده`
                          : `${toPersianDigits(cat.deviceCount)} دستگاه`}
                      </span>
                    </div>

                    {!reservationDisabled && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors",
                          selected
                            ? "bg-[var(--primary)] text-on-primary"
                            : "border border-[var(--primary)]/50 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-on-primary"
                        )}
                      >
                        <Icon
                          name={selected ? "edit" : "plus"}
                          size={14}
                          strokeWidth={2.5}
                        />
                        {selected ? "تغییر" : "انتخاب"}
                      </span>
                    )}
                  </div>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="h-9 w-9" title="قبلی" />
        <CarouselNext className="h-9 w-9" title="بعدی" />
      </Carousel>

    {/* موبایل و تبلت: بدون تغییر */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden w-full">
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
            <div className="relative aspect-[4/3] w-full overflow-hidden">
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
    </>
  );
};
