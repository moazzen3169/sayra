"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { isAbortError } from "@/lib/api/client";
import { generateDays, mapCalendarDaysToDateOptions } from "@/lib/dates";
import type { DateOption } from "@/lib/dates";
import {
  isSlotBookable,
  type AvailabilityMap,
  type BookingItem,
  type BookingLine,
} from "@/lib/devices";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatClock, getErrorMessage } from "@/lib/reservationUi";
import { calendarService } from "@/services/calendarService";
import {
  bookingPreparationService,
  type BookingPriceBreakdown,
} from "@/services/bookingPreparationService";
import { gamingCenterService } from "@/services/gamingCenterService";
import type { AvailabilitySlot } from "@/services/gamingCenterService";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export interface SlotView {
  /** همان startTime برگشتی Backend؛ بدون دستکاری به API ارسال می‌شود */
  key: string;
  startTime: string;
  startLabel: string;
  endLabel?: string;
}

type RawSlot = SlotView & { available: boolean };

export interface BookingSelection {
  date: DateOption;
  slots: SlotView[];
  items: BookingItem[];
}

interface BookingSheetProps {
  gamingCenterSlug: string;
  lines: BookingLine[];
  isSubmitting: boolean;
  submitError: string | null;
  progress: { done: number; total: number } | null;
  /** با هر تغییر، Availability دوباره از Backend گرفته می‌شود */
  refreshKey: number;
  onClose: () => void;
  onConfirm: (selection: BookingSelection) => void;
}

/** وضعیت هر Slot از پاسخ Backend خوانده می‌شود */
function mapSlots(raw: AvailabilitySlot[]): RawSlot[] {
  return raw
    .filter((s) => !!s?.startTime)
    .map((s) => ({
      key: s.startTime,
      startTime: s.startTime,
      startLabel: formatClock(s.startTime, true),
      endLabel: s.endTime ? formatClock(s.endTime, true) : undefined,
      available:
        s.isAvailable !== false &&
        (s.status === undefined || s.status === "AVAILABLE"),
    }));
}

export const BookingSheet: React.FC<BookingSheetProps> = ({
  gamingCenterSlug,
  lines,
  isSubmitting,
  submitError,
  progress,
  refreshKey,
  onClose,
  onConfirm,
}) => {
  const [dates, setDates] = useState<DateOption[]>(() => generateDays(10));
  const [dateId, setDateId] = useState<string>("day-0");
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [avail, setAvail] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const dateListRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const submittingRef = useRef(isSubmitting);

  useEffect(() => {
    closeRef.current = onClose;
    submittingRef.current = isSubmitting;
  }, [onClose, isSubmitting]);

  // بارگذاری روزها از API رسمی تقویم ایران (GET /iran-calendar/days)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      try {
        const calDays = await calendarService.getUpcomingDays(10, controller.signal);
        if (active && calDays && calDays.length > 0) {
          const mapped = mapCalendarDaysToDateOptions(calDays);
          setDates(mapped);
        }
      } catch (err) {
        if (!isAbortError(err)) {
          // در صورت بروز هر خطای شبکه، به تولید محلی تاریخ‌ها متکی می‌ماند
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const date = dates.find((d) => d.id === dateId) ?? dates[0];
  const stations = useMemo(
    () => lines.flatMap((l) => l.group.stations),
    [lines],
  );
  const stationIdsKey = useMemo(
    () => stations.map((s) => s.id).sort().join(","),
    [stations],
  );
  const deviceCount = lines.reduce((a, l) => a + l.qty, 0);

  // قفل اسکرول، Escape و مدیریت فوکوس
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submittingRef.current) closeRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, []);

  // Availability همه‌ی دستگاه‌های انتخاب‌شده؛ فقط از Backend
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      setSlots([]);
      setAvail({});
      setSelectedKeys([]);
    }, 0);

    (async () => {
      try {
        const entries = await Promise.all(
          stations.map(async (s) => {
            try {
              const raw = await gamingCenterService.getAvailabilitySlots(
                gamingCenterSlug,
                date.fullDate,
                s.id,
                controller.signal,
              );
              return { id: s.id, list: mapSlots(raw) };
            } catch (e) {
              if (isAbortError(e)) throw e;
              return { id: s.id, list: [] as RawSlot[] };
            }
          }),
        );

        if (!active) return;

        const nextAvail: AvailabilityMap = {};
        const meta = new Map<string, SlotView>();

        for (const e of entries) {
          nextAvail[e.id] = {};
          for (const s of e.list) {
            nextAvail[e.id][s.key] = s.available;
            if (!meta.has(s.key)) {
              meta.set(s.key, {
                key: s.key,
                startTime: s.startTime,
                startLabel: s.startLabel,
                endLabel: s.endLabel,
              });
            }
          }
        }

        const sorted = Array.from(meta.values()).sort(
          (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
        );
        setAvail(nextAvail);
        setSlots(sorted);
      } catch (e) {
        if (!active || isAbortError(e)) return;
        setLoadError(getErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamingCenterSlug, stationIdsKey, date.fullDate, refreshKey, retryToken]);

  const toggleSlot = (key: string) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedKeys.includes(s.key)),
    [slots, selectedKeys],
  );

  const prepared = useMemo(
    () =>
      selectedSlots.length > 0
        ? bookingPreparationService.prepareBooking({
            gamingCenterSlug,
            lines,
            startTimes: selectedSlots.map((s) => s.startTime),
            availability: avail,
          })
        : null,
    [gamingCenterSlug, lines, selectedSlots, avail],
  );

  const items = prepared?.items ?? [];
  const estimate = prepared?.breakdown.grandTotal ?? 0;
  const canSubmit =
    selectedSlots.length > 0 && !!prepared?.isValid && !isSubmitting;

  const scrollDates = (dir: "next" | "prev") => {
    dateListRef.current?.scrollBy({
      left: dir === "next" ? -240 : 240,
      behavior: "smooth",
    });
  };

  const buttonText = isSubmitting
    ? progress && progress.total > 1
      ? `در حال ثبت ${toPersianDigits(progress.done)} از ${toPersianDigits(progress.total)}...`
      : "در حال ثبت رزرو..."
    : selectedSlots.length > 0
      ? `ثبت رزرو (${toPersianDigits(selectedSlots.length)} ساعت)`
      : "ابتدا ساعت‌ها را انتخاب کنید";

  const devicesLabel = lines
    .map(
      (l) =>
        `${toPersianDigits(l.qty)} × ${l.group.label}${
          l.extra > 0 ? ` (+${toPersianDigits(l.extra)} دسته)` : ""
        }`,
    )
    .join("، ");

  const slotsLabel =
    selectedSlots.length > 0
      ? selectedSlots.map((s) => s.startLabel).join("، ")
      : "هنوز ساعتی انتخاب نشده";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-sheet-title"
      tabIndex={-1}
      dir="rtl"
      className="fixed inset-0 z-50 flex animate-fadeIn flex-col bg-[var(--bg-body)] text-[var(--text-white)] outline-none"
    >
      {/* هدر */}
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-body)]">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center gap-3 px-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="بازگشت"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-white)] transition-colors hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
          >
            <Icon name="back" size={20} />
          </button>
          <div className="flex min-w-0 flex-col">
            <h2
              id="booking-sheet-title"
              className="truncate text-base font-bold text-[var(--text-white)]"
            >
              انتخاب روز و ساعت
            </h2>
            <span className="truncate text-xs text-[var(--text-muted)]">
              {devicesLabel}
            </span>
          </div>
        </div>
      </header>

      {/* بدنه */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
          {/* ستون اصلی */}
          <div className="flex min-w-0 flex-col gap-8">
            {/* روز */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  انتخاب روز
                </h3>
                <div className="hidden items-center gap-2 lg:flex">
                  {(["prev", "next"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => scrollDates(d)}
                      aria-label={d === "next" ? "روزهای بعدی" : "روزهای قبلی"}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--border-color)]"
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
                      onClick={() => setDateId(d.id)}
                      aria-pressed={active}
                      disabled={isSubmitting}
                      className={cn(
                        "flex h-24 w-20 shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-card border transition-colors sm:w-24",
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                          : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--border-color)]"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold">{d.dayName}</span>
                        {d.isHoliday && (
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              active ? "bg-white" : "bg-red-500",
                            )}
                            title={d.events?.[0]?.title || "تعطیل رسمی"}
                          />
                        )}
                      </div>
                      <span className="text-xl font-black leading-none">
                        {dayNum}
                      </span>
                      {month && (
                        <span
                          className={cn(
                            "text-xs",
                            active ? "font-bold" : d.isHoliday ? "text-red-400" : "text-[var(--text-muted)]",
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

            <hr className="border-[var(--border-subtle)]" />

            {/* ساعت */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="text-base font-bold text-[var(--text-white)]">
                    انتخاب ساعت
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {date.dayName} {date.dateStr} • امکان انتخاب چند ساعت
                  </p>
                </div>
                {selectedSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKeys([])}
                    disabled={isSubmitting}
                    className="flex h-11 shrink-0 items-center px-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-white)]"
                  >
                    پاک کردن انتخاب
                  </button>
                )}
              </div>

              {loading && (
                <div
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                  aria-busy="true"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-card bg-[var(--foreground)]/40"
                    />
                  ))}
                </div>
              )}

              {!loading && loadError && (
                <div className="flex flex-col items-center gap-3 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-5 text-center">
                  <p className="text-xs font-bold leading-6 text-[var(--accent-red)]">
                    {loadError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRetryToken((v) => v + 1)}
                    className="h-11 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] px-5 text-xs font-bold text-[var(--text-white)]"
                  >
                    تلاش دوباره
                  </button>
                </div>
              )}

              {!loading && !loadError && slots.length === 0 && (
                <div className="rounded-card border border-dashed border-[var(--border-color)] p-8 text-center text-xs leading-6 text-[var(--text-muted)]">
                  برای این روز ساعت خالی وجود ندارد. روز دیگری را انتخاب کنید.
                </div>
              )}

              {!loading && !loadError && slots.length > 0 && (
                <div
                  role="group"
                  aria-label="ساعت‌های موجود"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                >
                  {slots.map((s) => {
                    const ok = isSlotBookable(lines, s.startTime, avail);
                    const active = selectedKeys.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        aria-pressed={active}
                        disabled={!ok || isSubmitting}
                        onClick={() => toggleSlot(s.key)}
                        className={cn(
                          "relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-card border transition-colors active:scale-[0.97]",
                          !ok
                            ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-card)]/50 text-[var(--text-muted)] opacity-60"
                            : active
                              ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                              : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--border-color)]"
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-body)] text-[var(--primary)]"
                          >
                            <Icon name="check" size={16} />
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-sm font-bold",
                            !ok && "line-through"
                          )}
                        >
                          {s.startLabel}
                        </span>
                        <span className="text-xs">
                          {!ok
                            ? "ناموجود"
                            : s.endLabel
                              ? `تا ${s.endLabel}`
                              : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* خلاصه‌ی رزرو (فقط دسکتاپ) */}
          <aside className="hidden flex-col gap-4 self-start rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 lg:sticky lg:top-6 lg:flex">
            <h3 className="text-base font-bold text-[var(--text-white)]">
              رزرو شما
            </h3>

            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs text-[var(--text-muted)]">
                  دستگاه‌ها
                </dt>
                <dd className="text-left text-xs font-bold leading-6 text-[var(--text-white)]">
                  {devicesLabel}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs text-[var(--text-muted)]">
                  روز
                </dt>
                <dd className="text-left text-xs font-bold text-[var(--text-white)]">
                  {date.dayName} {date.dateStr}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs text-[var(--text-muted)]">
                  ساعت‌ها
                </dt>
                <dd className="text-left text-xs font-bold leading-6 text-[var(--text-white)]">
                  {slotsLabel}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
              <span className="text-xs text-[var(--text-muted)]">
                برآورد مبلغ
              </span>
              <span className="text-lg font-black text-[var(--primary)]">
                {selectedSlots.length > 0 ? formatPrice(estimate) : "—"}{" "}
                <span className="text-xs font-normal text-[var(--text-white)]">
                  تومان
                </span>
              </span>
            </div>
          </aside>
        </div>
      </div>

      {/* فوتر چسبان */}
      <footer className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-4">
          {submitError && (
            <div
              role="alert"
              className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
            >
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center justify-between gap-3 sm:flex-1">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-[var(--text-muted)]">
                  {toPersianDigits(deviceCount)} دستگاه •{" "}
                  {toPersianDigits(selectedSlots.length)} ساعت
                </span>
                <span className="truncate text-xs font-bold text-[var(--text-white)]">
                  {selectedSlots.length > 0
                    ? `${date.dayName}: ${slotsLabel}`
                    : slotsLabel}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-xs text-[var(--text-muted)]">
                  برآورد مبلغ
                </span>
                <span className="text-base font-black text-[var(--primary)]">
                  {selectedSlots.length > 0 ? formatPrice(estimate) : "—"}{" "}
                  <span className="text-xs font-normal text-[var(--text-white)]">
                    تومان
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() =>
                items && onConfirm({ date, slots: selectedSlots, items })
              }
              className="h-12 w-full shrink-0 rounded-card bg-[var(--primary)] px-8 text-sm font-bold text-on-primary transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:bg-[var(--foreground)] disabled:text-[var(--text-muted)] sm:w-auto sm:min-w-[220px]"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};