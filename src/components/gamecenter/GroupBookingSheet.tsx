"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGroupReservation } from "@/hooks/gaming-center/use-group-reservation";
import { isAbortError } from "@/lib/api/client";
import { generateDays, mapCalendarDaysToDateOptions } from "@/lib/dates";
import type { DateOption } from "@/lib/dates";
import { formatPrice, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { formatClock, getErrorMessage } from "@/lib/reservationUi";
import { calendarService } from "@/services/calendarService";
import { gamingCenterService } from "@/services/gamingCenterService";
import type { AvailabilitySlot } from "@/services/gamingCenterService";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import type {
  GroupReservation,
  GroupReservationPayload,
} from "@/types/gaming-center/group-reservation.types";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface SlotView {
  /** همان startTime برگشتی Backend؛ بدون دستکاری به API ارسال می‌شود */
  key: string;
  startTime: string;
  endTime?: string;
  startLabel: string;
  endLabel?: string;
}

type RawSlot = SlotView & { available: boolean };
type AvailabilityMap = Record<string, Record<string, boolean>>;

interface GroupBookingSheetProps {
  gamingCenterSlug: string;
  gamingCenterName: string;
  stations: PhysicalStation[];
  initialCustomer?: { fullName: string; phone: string; email?: string };
  onClose: () => void;
  onSuccess: (reservation: GroupReservation) => void;
}

function mapSlots(raw: AvailabilitySlot[]): RawSlot[] {
  return raw
    .filter((s) => !!s?.startTime)
    .map((s) => ({
      key: s.startTime,
      startTime: s.startTime,
      endTime: s.endTime || undefined,
      startLabel: formatClock(s.startTime, true),
      endLabel: s.endTime ? formatClock(s.endTime, true) : undefined,
      available:
        s.isAvailable !== false &&
        (s.status === undefined || s.status === "AVAILABLE"),
    }));
}

const slotMinutes = (s: SlotView) =>
  s.endTime
    ? Math.max(
        1,
        Math.round((Date.parse(s.endTime) - Date.parse(s.startTime)) / 60000),
      )
    : 60;

export const GroupBookingSheet: React.FC<GroupBookingSheetProps> = ({
  gamingCenterSlug,
  gamingCenterName,
  stations,
  initialCustomer,
  onClose,
  onSuccess,
}) => {
  const [dates, setDates] = useState<DateOption[]>(() => generateDays(10));
  const [dateId, setDateId] = useState<string>("day-0");
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [avail, setAvail] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [fullName, setFullName] = useState(initialCustomer?.fullName ?? "");
  const [phone, setPhone] = useState(initialCustomer?.phone ?? "");
  const [note, setNote] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const { submit, isSubmitting, error: apiError } =
    useGroupReservation(gamingCenterSlug);

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

  // محدودیت مدت زمان بین همه‌ی دستگاه‌های انتخاب‌شده
  const { minHours, maxHours } = useMemo(
    () => ({
      minHours: Math.max(1, ...stations.map((s) => s.minRentHours || 1)),
      maxHours: Math.min(24, ...stations.map((s) => s.maxRentHours || 24)),
    }),
    [stations],
  );

  const totalHourly = stations.reduce((a, s) => a + (s.hourlyPrice || 0), 0);

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
                endTime: s.endTime,
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
  }, [gamingCenterSlug, stations, date.fullDate, retryToken]);

  // ساعت فقط وقتی قابل انتخاب است که برای همه‌ی دستگاه‌ها خالی باشد
  const isBookable = (key: string) =>
    stations.every((st) => avail[st.id]?.[key] === true);

  /**
   * رزرو گروهی یک شروع و یک مدت دارد؛ پس ساعت‌ها باید پشت‌سرهم باشند.
   * کلیک روی ساعت مجاور بازه را گسترش می‌دهد، کلیک روی ساعت جدا بازه را از نو شروع می‌کند.
   */
  const toggleSlot = (key: string) => {
    const idx = slots.findIndex((s) => s.key === key);
    if (idx < 0) return;
    const idxs = selectedKeys
      .map((k) => slots.findIndex((s) => s.key === k))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);

    if (idxs.length === 0) {
      setSelectedKeys([key]);
      return;
    }

    const lo = idxs[0];
    const hi = idxs[idxs.length - 1];

    if (idx >= lo && idx <= hi) {
      // برداشتن از لبه‌ی بازه؛ در غیر این صورت شروع مجدد از همین ساعت
      if (idxs.length === 1) setSelectedKeys([]);
      else if (idx === lo) setSelectedKeys(slots.slice(lo + 1, hi + 1).map((s) => s.key));
      else if (idx === hi) setSelectedKeys(slots.slice(lo, hi).map((s) => s.key));
      else setSelectedKeys([key]);
      return;
    }

    if (idx === hi + 1 || idx === lo - 1) {
      const nextLo = Math.min(lo, idx);
      const nextHi = Math.max(hi, idx);
      const range = slots.slice(nextLo, nextHi + 1);
      const allOk = range.every((s) => isBookable(s.key));
      if (allOk && range.length <= maxHours) {
        setSelectedKeys(range.map((s) => s.key));
        return;
      }
    }
    setSelectedKeys([key]);
  };

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedKeys.includes(s.key)),
    [slots, selectedKeys],
  );

  const durationMinutes = selectedSlots.reduce((a, s) => a + slotMinutes(s), 0);
  const durationHours = durationMinutes / 60;
  const estimate = Math.round(totalHourly * durationHours);
  const has = selectedSlots.length > 0;
  const tooShort = has && durationHours < minHours;

  const disabledReason = !has
    ? "ابتدا ساعت‌ها را انتخاب کنید"
    : tooShort
      ? `حداقل مدت رزرو ${toPersianDigits(minHours)} ساعت است`
      : null;

  const scrollDates = (dir: "next" | "prev") => {
    dateListRef.current?.scrollBy({
      left: dir === "next" ? -240 : 240,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setClientError(null);

    if (!has || tooShort) {
      setClientError(disabledReason);
      return;
    }
    if (fullName.trim().length < 2) {
      setClientError("نام و نام خانوادگی را وارد کنید.");
      return;
    }
    const cleanPhone = toEnglishDigits(phone.trim());
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setClientError("شماره موبایل را با ۱۱ رقم و با ۰۹ وارد کنید.");
      return;
    }

    const payload: GroupReservationPayload = {
      startTime: selectedSlots[0].startTime,
      durationMinutes,
      items: stations.map((st) => ({ stationId: st.id })),
      customer: {
        fullName: fullName.trim(),
        phone: cleanPhone,
        ...(initialCustomer?.email ? { email: initialCustomer.email } : {}),
      },
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    try {
      const res = await submit(payload);
      onSuccess(res);
    } catch {
      // خطای API از state هوک نمایش داده می‌شود
    }
  };

  const rangeLabel = has
    ? `${selectedSlots[0].startLabel} تا ${
        selectedSlots[selectedSlots.length - 1].endLabel ??
        selectedSlots[selectedSlots.length - 1].startLabel
      }`
    : "هنوز ساعتی انتخاب نشده";

  const errorText = clientError || apiError?.message || null;

  const buttonText = isSubmitting
    ? "در حال ثبت رزرو..."
    : disabledReason
      ? disabledReason
      : `ثبت درخواست رزرو (${toPersianDigits(Math.round(durationHours * 10) / 10)} ساعت)`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-sheet-title"
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
              id="group-sheet-title"
              className="truncate text-base font-bold text-[var(--text-white)]"
            >
              انتخاب روز و ساعت
            </h2>
            <span className="truncate text-xs text-[var(--text-muted)]">
              {gamingCenterName} • {toPersianDigits(stations.length)} دستگاه
            </span>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        {/* بدنه */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
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
                          "flex h-30 w-20 shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-card border transition-colors sm:w-24",
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
                                active ? "bg-white" : "bg-red-500"
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
                              active ? "font-bold" : d.isHoliday ? "text-red-400" : "text-[var(--text-muted)]"
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
                    <p className="text-xs leading-5 text-[var(--text-muted)]">
                      {date.dayName} {date.dateStr} • ساعت‌ها باید پشت‌سرهم
                      باشند
                      {minHours > 1
                        ? ` • حداقل ${toPersianDigits(minHours)} ساعت`
                        : ""}
                    </p>
                  </div>
                  {has && (
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
                    برای این روز ساعت خالی وجود ندارد. روز دیگری را انتخاب
                    کنید.
                  </div>
                )}

                {!loading && !loadError && slots.length > 0 && (
                  <div
                    role="group"
                    aria-label="ساعت‌های موجود"
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                  >
                    {slots.map((s) => {
                      const ok = isBookable(s.key);
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

              <hr className="border-[var(--border-subtle)]" />

              {/* اطلاعات رزرو کننده */}
              <section className="flex flex-col gap-4">
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  اطلاعات رزرو کننده
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="gb-name"
                      className="text-xs font-bold text-[var(--text-muted)]"
                    >
                      نام و نام خانوادگی
                    </label>
                    <input
                      id="gb-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-3.5 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="gb-phone"
                      className="text-xs font-bold text-[var(--text-muted)]"
                    >
                      شماره موبایل
                    </label>
                    <input
                      id="gb-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      placeholder="09123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-3.5 text-right text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="gb-note"
                    className="text-xs font-bold text-[var(--text-muted)]"
                  >
                    یادداشت (اختیاری)
                  </label>
                  <input
                    id="gb-note"
                    type="text"
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-11 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-3.5 text-sm text-[var(--text-white)] outline-none transition-colors focus:border-[var(--primary)]"
                  />
                </div>
              </section>
            </div>

            {/* خلاصه‌ی رزرو (فقط دسکتاپ) */}
            <aside className="hidden flex-col gap-4 self-start rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 lg:sticky lg:top-6 lg:flex">
              <h3 className="text-base font-bold text-[var(--text-white)]">
                رزرو شما
              </h3>

              <ul className="flex flex-col gap-2">
                {stations.map((st) => (
                  <li
                    key={st.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate font-bold text-[var(--text-white)]">
                      {st.name}
                    </span>
                    <span className="shrink-0 text-[var(--text-muted)]">
                      {formatPrice(st.hourlyPrice)} ت/ساعت
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
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
                    ساعت
                  </dt>
                  <dd className="text-left text-xs font-bold text-[var(--text-white)]">
                    {rangeLabel}
                  </dd>
                </div>
              </dl>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                <span className="text-xs text-[var(--text-muted)]">
                  برآورد مبلغ
                </span>
                <span className="text-lg font-black text-[var(--primary)]">
                  {has ? formatPrice(estimate) : "—"}{" "}
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
            {errorText && (
              <div
                role="alert"
                className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
              >
                {errorText}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex items-center justify-between gap-3 sm:flex-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-[var(--text-muted)]">
                    {toPersianDigits(stations.length)} دستگاه
                    {has
                      ? ` • ${toPersianDigits(Math.round(durationHours * 10) / 10)} ساعت`
                      : ""}
                  </span>
                  <span className="truncate text-xs font-bold text-[var(--text-white)]">
                    {has ? `${date.dayName}: ${rangeLabel}` : rangeLabel}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs text-[var(--text-muted)]">
                    برآورد مبلغ
                  </span>
                  <span className="text-base font-black text-[var(--primary)]">
                    {has ? formatPrice(estimate) : "—"}{" "}
                    <span className="text-xs font-normal text-[var(--text-white)]">
                      تومان
                    </span>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!disabledReason}
                className="h-12 w-full shrink-0 rounded-card bg-[var(--primary)] px-8 text-sm font-bold text-on-primary transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:bg-[var(--foreground)] disabled:text-[var(--text-muted)] sm:w-auto sm:min-w-[240px]"
              >
                {buttonText}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
};