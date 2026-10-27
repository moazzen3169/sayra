"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { isAbortError } from "@/lib/api/client";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { generateDays } from "@/lib/dates";
import type { DateOption } from "@/lib/dates";
import {
  allocateItems,
  estimateItemsTotal,
  isSlotBookable,
  type AvailabilityMap,
  type BookingItem,
  type BookingLine,
} from "@/lib/devices";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatClock, getErrorMessage } from "@/lib/reservationUi";
import { generateHourlySlots } from "@/lib/slots";
import { gamingCenterService } from "@/services/gamingCenterService";
import type { AvailabilitySlot } from "@/services/gamingCenterService";

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
      available: s.isAvailable !== false && (s.status === undefined || s.status === "AVAILABLE"),
    }));
}

/** ⚠️ فقط Mock: وقتی USE_MOCK_RESERVATIONS فعال است برای طراحی استفاده می‌شود */
const MOCK_TZ_OFFSET = "+03:30";
function buildMockSlots(date: string): RawSlot[] {
  return generateHourlySlots().map((s) => {
    const hh = String(s.startHour).padStart(2, "0");
    const startMs = Date.parse(`${date}T${hh}:00:00${MOCK_TZ_OFFSET}`);
    const start = new Date(startMs).toISOString();
    const end = new Date(startMs + 3_600_000).toISOString();
    return {
      key: start,
      startTime: start,
      startLabel: formatClock(start, true),
      endLabel: formatClock(end, true),
      available: startMs > Date.now(),
    };
  });
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
  const [dates] = useState<DateOption[]>(() => generateDays(10));
  const [dateId, setDateId] = useState<string>("day-0");
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [avail, setAvail] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const dateListRef = useRef<HTMLDivElement>(null);

  const date = dates.find((d) => d.id === dateId) ?? dates[0];
  const stations = useMemo(() => lines.flatMap((l) => l.group.stations), [lines]);
  const deviceCount = lines.reduce((a, l) => a + l.qty, 0);

  // قفل اسکرول + Escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, isSubmitting]);

  // Availability همه‌ی دستگاه‌های نوع‌های انتخاب‌شده؛ فقط از Backend
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setLoadError(null);
    setSlots([]);
    setAvail({});
    setSelectedKeys([]);

    (async () => {
      try {
        const entries = await Promise.all(
          stations.map(async (s) => {
            try {
              const raw = await gamingCenterService.getAvailabilitySlots(
                gamingCenterSlug,
                date.fullDate,
                s.id,
                controller.signal
              );
              return { id: s.id, list: mapSlots(raw) };
            } catch (e) {
              if (isAbortError(e) || !USE_MOCK_RESERVATIONS) throw e;
              return { id: s.id, list: [] as RawSlot[] };
            }
          })
        );

        if (!active) return;

        const nextAvail: AvailabilityMap = {};
        const meta = new Map<string, SlotView>();

        for (const e of entries) {
          const list = e.list.length === 0 && USE_MOCK_RESERVATIONS ? buildMockSlots(date.fullDate) : e.list;
          nextAvail[e.id] = {};
          for (const s of list) {
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
          (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)
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
      controller.abort();
    };
  }, [gamingCenterSlug, stations, date.fullDate, refreshKey, retryToken]);

  const toggleSlot = (key: string) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedKeys.includes(s.key)),
    [slots, selectedKeys]
  );

  const items = useMemo(
    () =>
      selectedSlots.length > 0
        ? allocateItems(lines, selectedSlots.map((s) => s.startTime), avail)
        : [],
    [lines, selectedSlots, avail]
  );

  const estimate = items ? estimateItemsTotal(items) : 0;
  const canSubmit = selectedSlots.length > 0 && !!items && items.length > 0 && !isSubmitting;

  const scrollDates = (dir: "next" | "prev") => {
    dateListRef.current?.scrollBy({ left: dir === "next" ? -200 : 200, behavior: "smooth" });
  };

  const buttonText = isSubmitting
    ? progress && progress.total > 1
      ? `در حال ثبت ${toPersianDigits(progress.done)} از ${toPersianDigits(progress.total)}...`
      : "در حال ثبت رزرو..."
    : selectedSlots.length > 0
    ? `ثبت رزرو (${toPersianDigits(selectedSlots.length)} ساعت)`
    : "ابتدا ساعت‌ها را انتخاب کنید";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn sm:p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب روز و ساعت رزرو"
        className="animate-sheetUp w-full sm:max-w-[600px] max-h-[92dvh] flex flex-col bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col min-w-0">
            <h3 className="text-base font-black text-[var(--text-white)]">انتخاب روز و ساعت</h3>
            <span className="text-[11px] text-[var(--text-muted)] truncate">
              {lines
                .map(
                  (l) =>
                    `${toPersianDigits(l.qty)} × ${l.group.label}${
                      l.extra > 0 ? ` (+${toPersianDigits(l.extra)} دسته)` : ""
                    }`
                )
                .join("، ")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="بستن"
            className="w-9 h-9 shrink-0 rounded-full bg-[var(--foreground)]/50 text-[var(--text-muted)] hover:text-[var(--text-white)] disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {/* Step 1: day */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[var(--text-white)]">۱. روز را انتخاب کنید</h4>
              <div className="hidden sm:flex items-center gap-1">
                {(["prev", "next"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => scrollDates(d)}
                    aria-label={d === "next" ? "روزهای بعدی" : "روزهای قبلی"}
                    className="w-7 h-7 rounded bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={d === "next" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div ref={dateListRef} className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 scroll-smooth snap-x">
              {dates.map((d) => {
                const active = d.id === dateId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDateId(d.id)}
                    aria-pressed={active}
                    disabled={isSubmitting}
                    className={`snap-start shrink-0 w-[84px] h-16 rounded-card flex flex-col items-center justify-center gap-0.5 border transition-all ${
                      active
                        ? "bg-[var(--primary)] text-[#101014] border-[var(--primary)]"
                        : "bg-[var(--foreground)]/50 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    <span className="text-xs font-extrabold">{d.dayName}</span>
                    <span className={`text-[11px] ${active ? "font-bold opacity-80" : "text-[var(--text-muted)]"}`}>
                      {d.dateStr}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: time (چندانتخابی) */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-[var(--text-white)]">۲. ساعت‌ها را انتخاب کنید</h4>
              {selectedSlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedKeys([])}
                  disabled={isSubmitting}
                  className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-white)]"
                >
                  پاک کردن انتخاب
                </button>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              هر کادر یک ساعت است. برای بازی ۱۲ تا ۱۵، سه ساعتِ ۱۲ و ۱۳ و ۱۴ را انتخاب کنید.
              {deviceCount > 1 && " فقط ساعت‌هایی فعال هستند که همه‌ی دستگاه‌های انتخابی شما در آن خالی باشند."}
            </p>

            {loading && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-busy="true">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-card bg-[var(--foreground)]/40 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-4 flex flex-col items-center gap-3 text-center">
                <p className="text-xs font-bold text-[var(--accent-red)]">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setRetryToken((v) => v + 1)}
                  className="h-9 px-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold"
                >
                  تلاش دوباره
                </button>
              </div>
            )}

            {!loading && !loadError && slots.length === 0 && (
              <div className="rounded-card border border-dashed border-[var(--border-color)] p-6 text-center text-xs text-[var(--text-muted)]">
                برای این روز ساعت خالی وجود ندارد. روز دیگری را امتحان کنید.
              </div>
            )}

            {!loading && !loadError && slots.length > 0 && (
              <>
                <div role="group" aria-label="ساعت‌های موجود" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                        className={`relative h-14 rounded-card flex flex-col items-center justify-center border transition-all active:scale-[0.97] ${
                          !ok
                            ? "bg-[var(--foreground)]/20 border-transparent text-[var(--text-subtle)] line-through cursor-not-allowed opacity-50"
                            : active
                            ? "bg-[var(--primary)] text-[#101014] border-[var(--primary)] font-black"
                            : "bg-[var(--foreground)]/50 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--primary)]/60"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[#101014] text-[var(--primary)] text-[9px] flex items-center justify-center font-black">
                            ✓
                          </span>
                        )}
                        <span className="text-sm font-extrabold">{s.startLabel}</span>
                        {s.endLabel && <span className="text-[10px] opacity-70">تا {s.endLabel}</span>}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--text-subtle)]">ساعت‌های خط‌خورده در دسترس نیستند.</p>
              </>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
          {submitError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed"
            >
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[var(--text-muted)]">
                {toPersianDigits(deviceCount)} دستگاه • {toPersianDigits(selectedSlots.length)} ساعت
              </span>
              <span className="font-extrabold text-[var(--text-white)] truncate">
                {selectedSlots.length > 0
                  ? `${date.dayName}: ${selectedSlots.map((s) => s.startLabel).join("، ")}`
                  : "هنوز ساعتی انتخاب نشده"}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[var(--text-muted)]">برآورد مبلغ</span>
              <span className="font-black text-[var(--primary)]">
                {selectedSlots.length > 0 ? formatPrice(estimate) : "—"}{" "}
                <span className="text-[10px] font-normal text-[var(--text-white)]">تومان</span>
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-subtle)] leading-relaxed">
            مبلغ نهایی (با احتساب تخفیف) پس از ثبت رزرو توسط سیستم اعلام می‌شود.
          </p>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => items && onConfirm({ date, slots: selectedSlots, items })}
            className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--foreground)] disabled:text-[var(--text-muted)] text-[#101014] font-black text-sm transition-all active:scale-[0.98]"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};