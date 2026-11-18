"use client";

import React, { useRef } from "react";
import type { DateOption } from "@/lib/dates";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export interface SlotView {
  key: string;
  startTime: string;
  endTime?: string;
  startLabel: string;
  endLabel?: string;
  hourNumber: string;
}

interface TimeStepProps {
  dates: DateOption[];
  dateId: string;
  onSelectDate: (id: string) => void;
  slots: SlotView[];
  selectedKeys: string[];
  isBookable: (key: string) => boolean;
  onSlotClick: (key: string) => void;
  loading: boolean;
  loadError: string | null;
  dateClosedNotice: string | null;
  onRetry: () => void;
  stations: PhysicalStation[];
  selectedDate: DateOption;
  rangeLabel: string;
  durationHours: number;
  estimate: number;
  hasSelection: boolean;
  isActionBusy: boolean;
  disabledReason: string | null;
  actionLabel: string;
  onProceed: () => void;
  errorText: string | null;
  showLeadTimeAction: boolean;
  onLeadTimeReset: () => void;
}

export const TimeStep: React.FC<TimeStepProps> = ({
  dates,
  dateId,
  onSelectDate,
  slots,
  selectedKeys,
  isBookable,
  onSlotClick,
  loading,
  loadError,
  dateClosedNotice,
  onRetry,
  stations,
  selectedDate,
  rangeLabel,
  durationHours,
  estimate,
  hasSelection,
  isActionBusy,
  disabledReason,
  actionLabel,
  onProceed,
  errorText,
  showLeadTimeAction,
  onLeadTimeReset,
}) => {
  const dateListRef = useRef<HTMLDivElement>(null);

  const scrollDates = (dir: "next" | "prev") => {
    dateListRef.current?.scrollBy({
      left: dir === "next" ? -240 : 240,
      behavior: "smooth",
    });
  };

  const currentIdx = dates.findIndex((d) => d.id === dateId);
  const nextDate = currentIdx >= 0 && currentIdx + 1 < dates.length ? dates[currentIdx + 1] : null;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        {/* روز */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-section-title text-[var(--text-white)]">روز</h3>
            <div className="hidden items-center gap-2 lg:flex">
              {(["prev", "next"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => scrollDates(d)}
                  aria-label={d === "next" ? "روزهای بعدی" : "روزهای قبلی"}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                >
                  <Icon
                    name="chevron"
                    size={20}
                    className={d === "next" ? "rotate-90" : "-rotate-90"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div
            ref={dateListRef}
            className="-mx-4 flex snap-x gap-2 overflow-x-auto scroll-smooth px-4 pb-1"
          >
            {dates.map((d) => {
              const active = d.id === dateId;
              const parts = d.dateStr.split(" ");
              const dayNum = parts[0];
              const month = parts.slice(1).join(" ");
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDate(d.id)}
                  aria-pressed={active}
                  disabled={isActionBusy}
                  className={cn(
                    "flex h-24 w-20 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-card border transition-colors duration-150 sm:w-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--border-color)]"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-label">{d.dayName}</span>
                    {d.isHoliday && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          active ? "bg-on-primary" : "bg-[var(--accent-red)]"
                        )}
                        title={d.events?.[0]?.title || "تعطیل رسمی"}
                      />
                    )}
                  </div>
                  <span className="text-key-number leading-none">{dayNum}</span>
                  {month && (
                    <span
                      className={cn(
                        "text-xs",
                        active
                          ? "font-bold text-on-primary"
                          : d.isHoliday
                          ? "text-[var(--accent-red)]"
                          : "text-[var(--text-muted)]"
                      )}
                    >
                      {month}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ساعت */}
        <section className="flex flex-col gap-3">
          <h3 className="text-section-title text-[var(--text-white)]">ساعت</h3>

          {loading && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" aria-busy="true">
              <span className="sr-only">در حال بارگذاری</span>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!loading && loadError && (
            <ErrorState
              title="ساعت‌ها بارگذاری نشد"
              description={loadError}
              onRetry={onRetry}
            />
          )}

          {!loading && dateClosedNotice && (
            <InlineAlert variant="error">
              <p className="text-sm font-bold">{dateClosedNotice}</p>
            </InlineAlert>
          )}

          {!loading && !loadError && !dateClosedNotice && slots.length === 0 && (
            <EmptyState
              title="برای این روز ساعت خالی نیست"
              actionLabel={nextDate ? "مشاهده فردا" : undefined}
              onAction={nextDate ? () => onSelectDate(nextDate.id) : undefined}
            />
          )}

          {!loading && !loadError && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {slots.map((s) => {
                const active = selectedKeys.includes(s.key);
                const bookable = isBookable(s.key);
                const label = s.endLabel ? `${s.startLabel} تا ${s.endLabel}` : s.startLabel;

                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onSlotClick(s.key)}
                    disabled={!bookable || isActionBusy}
                    aria-pressed={active}
                    className={cn(
                      "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border px-2 py-2 text-xs font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary cursor-pointer"
                        : bookable
                        ? "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--border-color)] cursor-pointer"
                        : "cursor-not-allowed border-transparent bg-[var(--foreground)]/50 text-[var(--text-muted)] opacity-50"
                    )}
                  >
                    <span>{label}</span>
                    {!bookable && (
                      <span className="text-xs font-medium text-[var(--text-muted)]">پر</span>
                    )}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-body)] text-[var(--primary)]"
                      >
                        <Icon name="check" size={16} strokeWidth={2} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* سایدبار دسکتاپ */}
      <aside className="hidden flex-col gap-4 self-start rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 lg:sticky lg:top-6 lg:flex">
        <dl className="flex flex-col gap-3 text-body">
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-secondary text-[var(--text-muted)]">دستگاه</dt>
            <dd className="text-left text-xs font-bold leading-5 text-[var(--text-white)]">
              {stations.map((s) => s.name).join("، ")}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-secondary text-[var(--text-muted)]">روز</dt>
            <dd className="text-left text-xs font-bold text-[var(--text-white)]">
              {selectedDate.dayName} {selectedDate.dateStr}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-secondary text-[var(--text-muted)]">ساعت</dt>
            <dd
              key={rangeLabel}
              className="text-left text-xs font-bold leading-5 text-[var(--text-white)] animate-fadeIn"
            >
              {hasSelection
                ? `${toPersianDigits(Math.round(durationHours * 10) / 10)} ساعت · ${rangeLabel}`
                : "ساعت را انتخاب کنید"}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
          <span className="text-secondary text-[var(--text-muted)]">برآورد</span>
          <span className="text-key-number text-[var(--primary)]">
            {hasSelection ? formatPrice(estimate) : "—"}{" "}
            <span className="text-xs font-normal text-[var(--text-white)]">تومان</span>
          </span>
        </div>

        {errorText && (
          <InlineAlert
            variant="error"
            action={
              showLeadTimeAction ? (
                <Button variant="secondary" size="sm" onClick={onLeadTimeReset}>
                  انتخاب ساعت دیگر
                </Button>
              ) : undefined
            }
          >
            <span className="text-xs">{errorText}</span>
          </InlineAlert>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={onProceed}
          disabled={isActionBusy || Boolean(disabledReason)}
          className="w-full"
        >
          {actionLabel}
        </Button>

        {disabledReason && (
          <p className="text-center text-secondary text-[var(--text-muted)]">
            {disabledReason}
          </p>
        )}
      </aside>
    </div>
  );
};
