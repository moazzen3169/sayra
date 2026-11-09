"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useGamingCenterStations } from "@/hooks/gaming-center/use-gaming-center-stations";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import { cn } from "@/lib/utils";

interface DeviceSelectModalProps {
  gamingCenterSlug: string;
  category: DeviceCategory;
  /** دستگاه‌های انتخاب‌شده‌ی این دسته */
  selected: PhysicalStation[];
  onChange: (stations: PhysicalStation[]) => void;
  onClose: () => void;
}

export const DeviceSelectModal: React.FC<DeviceSelectModalProps> = ({
  gamingCenterSlug,
  category,
  selected,
  onChange,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // قفل اسکرول، Escape و مدیریت فوکوس
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, []);

  // اگر catalogId داریم با آن، در غیر این صورت با نوع دستگاه (هرگز catalogDeviceId=null)
  const filter = useMemo(
    () =>
      category.catalogId
        ? { catalogDeviceId: category.catalogId, limit: 100 }
        : { stationType: category.deviceType, limit: 100 },
    [category],
  );

  const { stations, isLoading, hasFetched, error, refetch } = useGamingCenterStations(
    gamingCenterSlug,
    filter,
  );

  const selectedIds = selected.map((s) => s.id);
  const count = selected.length;
  const has = count > 0;
  const hourly = selected.reduce((sum, s) => sum + (s.hourlyPrice || 0), 0);
  const allSelected = stations.length > 0 && stations.every((s) => selectedIds.includes(s.id));

  const toggle = (st: PhysicalStation) => {
    onChange(
      selectedIds.includes(st.id)
        ? selected.filter((s) => s.id !== st.id)
        : [...selected, st],
    );
  };

  const selectAll = () => {
    const rest = selected.filter((s) => !stations.some((x) => x.id === s.id));
    onChange([...rest, ...stations]);
  };
  const clearAll = () =>
    onChange(selected.filter((s) => !stations.some((x) => x.id === s.id)));

  const showSkeleton = isLoading || (!hasFetched && !error);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-select-title"
      tabIndex={-1}
      dir="rtl"
      className="fixed inset-0 z-50 flex animate-fadeIn flex-col bg-[var(--bg-body)] text-[var(--text-white)] outline-none"
    >
      {/* هدر */}
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-body)]">
        <div className="mx-auto flex h-16 w-full max-w-[960px] items-center gap-3 px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-white)] transition-colors hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Icon name="back" size={20} />
          </button>
          <div className="flex min-w-0 flex-col">
            <h2
              id="device-select-title"
              className="truncate text-base font-bold text-[var(--text-white)]"
            >
              {category.name}
            </h2>
            <span className="truncate text-xs text-[var(--text-muted)]">
              دستگاه‌های دلخواهت رو انتخاب کن
            </span>
          </div>
        </div>
      </header>

      {/* بدنه */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-6">
          {showSkeleton && (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              aria-busy="true"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 animate-pulse"
                >
                  <div className="aspect-[4/3] w-full rounded-card bg-[var(--bg-body)]" />
                  <div className="h-4 w-3/4 rounded bg-[var(--bg-body)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--bg-body)]" />
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && error && (
            <ErrorState
              title="بارگذاری دستگاه‌ها انجام نشد"
              description={error}
              onRetry={refetch}
            />
          )}

          {!showSkeleton && !error && stations.length === 0 && (
            <EmptyState
              title="دستگاهی در این دسته پیدا نشد"
              description="می‌تونی از دسته‌های دیگه دستگاهت رو انتخاب کنی."
            />
          )}

          {!showSkeleton && !error && stations.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p
                  aria-live="polite"
                  className="text-sm text-[var(--text-muted)]"
                >
                  {has
                    ? `${toPersianDigits(count)} دستگاه انتخاب شده`
                    : `${toPersianDigits(stations.length)} دستگاه آماده بازی`}
                </p>
                <button
                  type="button"
                  onClick={allSelected ? clearAll : selectAll}
                  className="flex h-11 items-center px-2 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  {allSelected ? "پاک کردن انتخاب" : "انتخاب همه"}
                </button>
              </div>

              <div
                role="group"
                aria-label="دستگاه‌های موجود"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {stations.map((st) => {
                  const active = selectedIds.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(st)}
                      className={cn(
                        "flex flex-col gap-3 rounded-card border p-3 text-right transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                        active
                          ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-[var(--foreground)]/40 ">
                        <SafeImage
                          src={st.coverImageUrl || category.coverImageUrl || ""}
                          alt={st.name}
                          fallbackSrc={PLACEHOLDERS.center}
                          loading="lazy"
                          draggable={false}
                          className="h-full w-full object-cover"
                        />

                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                            active
                              ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                              : "border-[var(--border-color)] bg-[var(--bg-body)]/60 text-transparent"
                          )}
                        >
                          <Icon name="check" size={16} />
                        </span>

                        {st.isVip && (
                          <span className="absolute right-2 top-2 rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)] px-2.5 py-1 text-xs font-bold leading-none text-[var(--text-white)]">
                            VIP
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="truncate text-sm font-bold text-[var(--text-white)]">
                          {st.name}
                        </h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-[var(--text-white)]">
                            {formatPrice(st.hourlyPrice)}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            تومان / ساعت
                          </span>
                        </div>
                        {(st.minRentHours > 1 || st.maxRentHours < 24) && (
                          <span className="text-xs text-[var(--text-muted)]">
                            مدت: {toPersianDigits(st.minRentHours)} تا{" "}
                            {toPersianDigits(st.maxRentHours)} ساعت
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* فوتر چسبان */}
      <footer className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              {has
                ? `${toPersianDigits(count)} دستگاه انتخاب کردی`
                : "هنوز دستگاهی انتخاب نکردی"}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-[var(--text-muted)]">
                مجموع ساعتی
              </span>
              <span className="text-base font-black text-[var(--primary)]">
                {has ? formatPrice(hourly) : "—"}
              </span>
              <span className="text-xs text-[var(--text-white)]">تومان</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!has}
            className="h-12 w-full rounded-card bg-[var(--primary)] text-sm font-bold text-on-primary transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:bg-[var(--foreground)] disabled:text-[var(--text-muted)]"
          >
            {has
              ? `تأیید و ادامه (${toPersianDigits(count)} دستگاه)`
              : "دستگاهت رو انتخاب کن"}
          </button>

          {has && (
            <p className="text-center text-xs text-[var(--text-muted)]">
              بعد از تأیید، می‌تونی دستگاه‌های بیشتر اضافه کنی یا تاریخ و ساعت رزرو رو مشخص کنی.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};
