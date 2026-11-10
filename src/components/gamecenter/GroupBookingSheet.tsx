"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroupReservation } from "@/hooks/gaming-center/use-group-reservation";
import { isAbortError } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { generateDays, mapCalendarDaysToDateOptions } from "@/lib/dates";
import type { DateOption } from "@/lib/dates";
import { cleanPhoneNumber, formatPrice, isValidIranPhone, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { formatClock, formatSlotHourEnglish, getErrorMessage } from "@/lib/reservationUi";
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
import { BookingStepper, type BookingStep } from "@/components/gamecenter/BookingStepper";
import { paymentService } from "@/services/paymentService";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";
import { createIdempotencyKey } from "@/services/bookingService";

interface SlotView {
  /** همان startTime برگشتی Backend؛ بدون دستکاری به API ارسال می‌شود */
  key: string;
  startTime: string;
  endTime?: string;
  startLabel: string;
  endLabel?: string;
  hourNumber: string;
}

type RawSlot = SlotView & { available: boolean };
type AvailabilityMap = Record<string, Record<string, boolean>>;

interface GroupBookingSheetProps {
  gamingCenterId?: string;
  gamingCenterSlug: string;
  gamingCenterName: string;
  gamingCenterAddress?: string;
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
      hourNumber: formatSlotHourEnglish(s.startTime),
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
  gamingCenterId,
  gamingCenterSlug,
  gamingCenterName,
  gamingCenterAddress,
  stations,
  initialCustomer,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const { isLoggedIn, user, login } = useAuth();

  // بازیابی درفت ذخیره‌شده (در صورت وجود و مطابقت با گیم‌نت)
  const savedDraft = useMemo(() => {
    const draft = bookingDraftStorage.get();
    if (draft && draft.gamingCenterSlug === gamingCenterSlug) {
      return draft;
    }
    return null;
  }, [gamingCenterSlug]);

  const [dates, setDates] = useState<DateOption[]>(() => generateDays(10));
  const [dateId, setDateId] = useState<string>(() => savedDraft?.date?.id ?? "day-0");
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [avail, setAvail] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    savedDraft?.slots ? savedDraft.slots.map((s) => s.key) : []
  );

  const [fullName, setFullName] = useState(
    () => user?.fullName || initialCustomer?.fullName || savedDraft?.customer?.fullName || ""
  );
  const [phone, setPhone] = useState(
    () => user?.phone || initialCustomer?.phone || savedDraft?.customer?.phone || ""
  );
  const [note, setNote] = useState(() => savedDraft?.note ?? "");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // مرحله ۲ از بازبینی: مرحله نمایش خلاصه نهایی و قیمت قبل از درگاه
  const [isReviewStage, setIsReviewStage] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const dateListRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  const { checkout, submit, isSubmitting, error: apiError } =
    useGroupReservation(gamingCenterSlug);

  const isActionBusy = isSubmitting || isPaying;
  const busyRef = useRef(isActionBusy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = isActionBusy;
  }, [onClose, isActionBusy]);

  // همگام‌سازی کاربر لاگین‌شده
  useEffect(() => {
    if (user?.fullName && !fullName) setFullName(user.fullName);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, fullName, phone]);

  // تقویم رسمی
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
          // fallback
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const date = dates.find((d) => d.id === dateId) ?? dates[0];
  const stationIds = useMemo(() => stations.map((s) => s.id), [stations]);
  const stationIdsKey = useMemo(() => [...stationIds].sort().join(","), [stationIds]);

  const minHours = useMemo(() => {
    const list = stations.map((s) => s.minRentHours || 1);
    return Math.max(1, ...list);
  }, [stations]);

  const maxHours = useMemo(() => {
    const list = stations.map((s) => s.maxRentHours || 24);
    return Math.min(24, ...list);
  }, [stations]);

  const totalHourly = useMemo(
    () => stations.reduce((a, s) => a + (s.hourlyPrice || 0), 0),
    [stations],
  );

  // قفل اسکرول و Escape
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current && !isAuthModalOpen) {
        if (isReviewStage) {
          setIsReviewStage(false);
        } else {
          closeRef.current();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, [isAuthModalOpen, isReviewStage]);

  // Availability از سرور
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const results = await Promise.all(
          stationIds.map(async (stId) => {
            const raw = await gamingCenterService.getAvailabilitySlots({
              slug: gamingCenterSlug,
              date: date.fullDate,
              stationId: stId,
              signal: controller.signal,
            });
            return { stId, slots: mapSlots(raw) };
          }),
        );

        if (!active) return;

        const unionMap = new Map<string, SlotView>();
        const stAvail: AvailabilityMap = {};

        for (const { stId, slots: sList } of results) {
          stAvail[stId] = {};
          for (const s of sList) {
            if (!unionMap.has(s.key)) {
              unionMap.set(s.key, {
                key: s.key,
                startTime: s.startTime,
                endTime: s.endTime,
                startLabel: s.startLabel,
                endLabel: s.endLabel,
                hourNumber: s.hourNumber,
              });
            }
            stAvail[stId][s.key] = s.available;
          }
        }

        const sorted = Array.from(unionMap.values()).sort(
          (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
        );

        setSlots(sorted);
        setAvail(stAvail);

        // هرس انتخاب‌های نامعتبر
        setSelectedKeys((prev) => {
          const valid = prev.filter((k) =>
            stationIds.every((id) => stAvail[id]?.[k] === true),
          );
          return valid.length === prev.length ? prev : valid;
        });
      } catch (err: any) {
        if (!active || isAbortError(err)) return;
        setLoadError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamingCenterSlug, stationIdsKey, date.fullDate, retryToken, stationIds]);

  const isBookable = (key: string) =>
    stationIds.length > 0 &&
    stationIds.every((id) => avail[id]?.[key] === true);

  const handleSlotClick = (key: string) => {
    if (isActionBusy || !isBookable(key)) return;
    setClientError(null);

    const idx = slots.findIndex((s) => s.key === key);
    if (idx === -1) return;

    if (selectedKeys.length === 0) {
      setSelectedKeys([key]);
      return;
    }

    const idxs = selectedKeys
      .map((k) => slots.findIndex((s) => s.key === k))
      .filter((i) => i !== -1)
      .sort((a, b) => a - b);

    const lo = idxs[0];
    const hi = idxs[idxs.length - 1];

    if (idx >= lo && idx <= hi) {
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

  // ذخیره درفت در صورت تغییر انتخاب‌ها
  useEffect(() => {
    if (has) {
      bookingDraftStorage.set({
        gamingCenterId,
        gamingCenterSlug,
        gamingCenterName,
        gamingCenterAddress,
        selectedStationIds: stationIds,
        stationSnapshots: stations.map((s) => ({
          id: s.id,
          name: s.name,
          hourlyPrice: s.hourlyPrice,
          stationType: s.stationType,
        })),
        date: {
          id: date.id,
          dayName: date.dayName,
          dateStr: date.dateStr,
          fullDate: date.fullDate,
        },
        slots: selectedSlots,
        durationHours,
        customer: {
          fullName,
          phone,
        },
        note,
        grandTotal: estimate,
      });
    }
  }, [
    gamingCenterId,
    gamingCenterSlug,
    gamingCenterName,
    gamingCenterAddress,
    stationIds,
    stations,
    date,
    selectedSlots,
    durationHours,
    fullName,
    phone,
    note,
    estimate,
    has,
  ]);

  const scrollDates = (dir: "next" | "prev") => {
    dateListRef.current?.scrollBy({
      left: dir === "next" ? -240 : 240,
      behavior: "smooth",
    });
  };

  // تعیین مرحله Stepper فعلی
  const currentStep: BookingStep = useMemo(() => {
    if (!has) return 3; // مرحله ۳: تاریخ و ساعت
    if (!isLoggedIn) return 4; // مرحله ۴: احراز هویت
    return 5; // مرحله ۵: بررسی و پرداخت نهایی
  }, [has, isLoggedIn]);

  // کلیک روی دکمه ثبت اولیه یا ادامه به بررسی
  const handleProceed = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isActionBusy) return;
    setClientError(null);

    if (!has || tooShort) {
      setClientError(disabledReason);
      return;
    }

    // اگر کاربر هنوز لاگین نکرده، فرم احراز هویت در همین صفحه باز می‌شود
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    // اگر لاگین است، مرحله بررسی نهایی و قیمت را باز کن
    setIsReviewStage(true);
  };

  // ایجاد رزرو و پرداخت نهایی
  const handleConfirmAndPay = async () => {
    if (isActionBusy) return;
    setClientError(null);

    const cleanPhone = cleanPhoneNumber(phone || user?.phone || "");
    const targetName = (fullName || user?.fullName || "").trim();

    if (targetName.length < 2) {
      setClientError("نام و نام خانوادگی را وارد کنید.");
      return;
    }
    if (!isValidIranPhone(cleanPhone)) {
      setClientError("شماره موبایل را با ۱۱ رقم و با ۰۹ وارد کنید.");
      return;
    }

    const payload: GroupReservationPayload = {
      startTime: selectedSlots[0].startTime,
      durationMinutes,
      items: stations.map((st) => ({ stationId: st.id })),
      customer: {
        fullName: targetName,
        phone: cleanPhone,
        ...(initialCustomer?.email ? { email: initialCustomer.email } : {}),
      },
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    try {
      // طبق مدل جدید Payment-First:
      // هیچ رزرو واقعی با وضعیت UNPAID ثبت نمی‌شود.
      // ابتدا checkout فراخوانی می‌شود تا BookingHold با وضعیت ACTIVE ثبت و توکن و paymentUrl درگاه بانکی بازگردانده شود.
      try {
        const checkoutRes = await checkout(payload);

        // ذخیره شناسه هولد و پرداخت در درفت جهت بازیابی و تأیید در بازگشت از درگاه
        bookingDraftStorage.update({
          holdId: checkoutRes.holdId,
          paymentId: checkoutRes.paymentId,
          paymentUrl: checkoutRes.paymentUrl,
          holdExpiresAt: checkoutRes.expiresAt,
          gamingCenterId: checkoutRes.gamingCenterId || gamingCenterId,
          grandTotal: checkoutRes.amount || estimate,
        });

        if (checkoutRes.paymentUrl) {
          setIsPaying(true);
          window.location.href = checkoutRes.paymentUrl;
          return;
        }
      } catch (checkoutErr: any) {
        // در صورتی که اندپوینت جدید با 404 مواجه شود، با رعایت سازگاری عقب‌رو به سیستم سابق فال‌بک می‌شود
        if (checkoutErr?.status !== 404 && checkoutErr?.code !== "NOT_FOUND") {
          throw checkoutErr;
        }

        // fallback قدیمی: ثبت مستقیم رزرو و init پرداخت
        const res = await submit(payload);
        bookingDraftStorage.update({
          reservationId: res.id,
          gamingCenterId: res.gamingCenterId || gamingCenterId,
        });

        const resolvedCenterId = res.gamingCenterId || gamingCenterId;
        if (resolvedCenterId) {
          setIsPaying(true);
          const idempotencyKey = createIdempotencyKey();
          try {
            const payRes = await paymentService.initPayment(
              resolvedCenterId,
              res.id,
              idempotencyKey
            );
            if (payRes.paymentUrl) {
              window.location.href = payRes.paymentUrl;
              return;
            }
          } catch (payErr: any) {
            console.error("Payment init error:", payErr);
            router.push(`/reservations/${encodeURIComponent(res.id)}?paymentError=1`);
            return;
          } finally {
            setIsPaying(false);
          }
        }

        onSuccess(res);
        return;
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.code === "UNAUTHORIZED") {
        setIsAuthModalOpen(true);
      } else {
        setClientError(getErrorMessage(err));
      }
    }
  };

  const handleAuthSuccess = async (
    authFullName: string,
    authPhone: string,
    token?: string,
    refreshToken?: string,
    centerId?: string,
    role?: string
  ) => {
    login(authFullName, authPhone, token, refreshToken, role);
    setIsAuthModalOpen(false);

    const resolvedName = authFullName || fullName.trim() || user?.fullName || "کاربر سایرا";
    const resolvedPhone = toEnglishDigits(authPhone || phone || user?.phone || "").trim();
    if (resolvedName) setFullName(resolvedName);
    if (resolvedPhone) setPhone(resolvedPhone);

    // پس از ورود موفق، کاربر به مرحله ۵ (بررسی نهایی و پرداخت) منتقل می‌شود
    if (has && !tooShort) {
      setIsReviewStage(true);
    }
  };

  const rangeLabel = has
    ? `${selectedSlots[0].startLabel} تا ${
        selectedSlots[selectedSlots.length - 1].endLabel ??
        selectedSlots[selectedSlots.length - 1].startLabel
      }`
    : "هنوز ساعتی انتخاب نشده";

  const errorText = clientError || apiError?.message || null;

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
      {/* هدر با Stepper یکپارچه */}
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-body)]">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center gap-3 px-4">
          <button
            type="button"
            onClick={isReviewStage ? () => setIsReviewStage(false) : onClose}
            disabled={isActionBusy}
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
              {isReviewStage ? "بررسی و پرداخت نهایی رزرو" : "انتخاب روز و ساعت"}
            </h2>
            <span className="truncate text-xs text-[var(--text-muted)]">
              {gamingCenterName} • {toPersianDigits(stations.length)} دستگاه
            </span>
          </div>
        </div>

        {/* Stepper مراحل */}
        <BookingStepper
          currentStep={isReviewStage ? 5 : currentStep}
          onStepClick={(step) => {
            if (step <= 3 && isReviewStage) {
              setIsReviewStage(false);
            }
          }}
        />
      </header>

      {/* حالت اول: انتخاب روز و ساعت */}
      {!isReviewStage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProceed();
          }}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          {/* بدنه انتخاب سانس */}
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
                          disabled={isActionBusy}
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
                                active
                                  ? "font-bold"
                                  : d.isHoliday
                                    ? "text-red-400"
                                    : "text-[var(--text-muted)]",
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

                {/* ساعت‌ها */}
                <section className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[var(--text-white)]">
                      انتخاب ساعت
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                        انتخاب‌شده
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]" />
                        آزاد
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[var(--foreground)] opacity-40" />
                        رزرو / غیرفعال
                      </span>
                    </div>
                  </div>

                  {loading && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-6">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-16 animate-pulse rounded-card bg-[var(--bg-card)]"
                        />
                      ))}
                    </div>
                  )}

                  {!loading && loadError && (
                    <div className="flex flex-col items-center gap-3 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-6 text-center">
                      <p className="text-sm font-bold text-[var(--accent-red)]">
                        {loadError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setRetryToken((t) => t + 1)}
                        className="rounded-card bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-white)] hover:border-[var(--border-color)]"
                      >
                        تلاش مجدد
                      </button>
                    </div>
                  )}

                  {!loading && !loadError && slots.length === 0 && (
                    <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-muted)]">
                      سانسی برای این روز یافت نشد.
                    </div>
                  )}

                  {!loading && !loadError && slots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-6">
                      {slots.map((s) => {
                        const active = selectedKeys.includes(s.key);
                        const bookable = isBookable(s.key);
                        const label = s.endLabel
                          ? `${s.startLabel} تا ${s.endLabel}`
                          : s.startLabel;

                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => handleSlotClick(s.key)}
                            disabled={!bookable || isActionBusy}
                            aria-pressed={active}
                            className={cn(
                              "relative flex h-16 flex-col items-center justify-center rounded-card border px-3 text-xs font-bold transition-all",
                              active
                                ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary shadow-md"
                                : bookable
                                  ? "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--border-color)]"
                                  : "cursor-not-allowed border-transparent bg-[var(--foreground)] text-[var(--text-muted)] opacity-40 line-through",
                            )}
                          >
                            <span>{label}</span>
                            {active && (
                              <span
                                aria-hidden="true"
                                className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--bg-body)] text-[var(--primary)] shadow"
                              >
                                <Icon name="check" size={10} />
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
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  خلاصه رزرو
                </h3>

                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-xs text-[var(--text-muted)]">
                      دستگاه‌ها
                    </dt>
                    <dd className="text-left text-xs font-bold leading-6 text-[var(--text-white)]">
                      {stations.map((s) => s.name).join("، ")}
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
                      ساعت
                    </dt>
                    <dd className="text-left text-xs font-bold leading-6 text-[var(--text-white)]">
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

          {/* فوتر مرحله انتخاب سانس */}
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
                  type="button"
                  onClick={() => handleProceed()}
                  disabled={isActionBusy || !!disabledReason}
                  className="h-12 w-full shrink-0 rounded-card bg-[var(--primary)] px-8 text-sm font-bold text-on-primary transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:bg-[var(--foreground)] disabled:text-[var(--text-muted)] sm:w-auto sm:min-w-[240px]"
                >
                  {!has
                    ? "ابتدا ساعت‌ها را انتخاب کنید"
                    : tooShort
                    ? disabledReason
                    : !isLoggedIn
                    ? "ورود و ادامه رزرو"
                    : "ادامه به بررسی و پرداخت"}
                </button>
              </div>
            </div>
          </footer>
        </form>
      )}

      {/* حالت دوم: بررسی و پرداخت نهایی */}
      {isReviewStage && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 py-4">
              {/* کارت اطلاعات گیم‌نت و سانس */}
              <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--text-muted)]">نام مجموعه</span>
                    <span className="text-base font-bold text-[var(--text-white)]">{gamingCenterName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewStage(false)}
                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    تغییر زمان یا دستگاه
                  </button>
                </div>

                {gamingCenterAddress && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Icon name="pin" size={16} className="text-[var(--primary)] shrink-0" />
                    <span>{gamingCenterAddress}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-body)]/50 p-3.5 rounded-child border border-[var(--border-subtle)] text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[var(--text-muted)]">تاریخ رزرو:</span>
                    <span className="font-bold text-[var(--text-white)]">
                      {date.dayName} ({date.dateStr})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[var(--text-muted)]">ساعت رزرو:</span>
                    <span className="font-bold text-[var(--primary)]">
                      {rangeLabel} ({toPersianDigits(Math.round(durationHours * 10) / 10)} ساعت)
                    </span>
                  </div>
                </div>
              </div>

              {/* کارت دستگاه‌ها و قیمت */}
              <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-white)] border-b border-[var(--border-subtle)] pb-3">
                  دستگاه‌های انتخاب‌شده ({toPersianDigits(stations.length)})
                </h3>

                <div className="flex flex-col gap-2.5">
                  {stations.map((st) => {
                    const stPrice = Math.round((st.hourlyPrice || 0) * durationHours);
                    return (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2.5 rounded-child bg-[var(--bg-body)]/40 border border-[var(--border-subtle)] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
                          <span className="font-bold text-[var(--text-white)] truncate">{st.name}</span>
                          {st.stationType && (
                            <span className="text-[var(--text-muted)]">({st.stationType})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 font-bold text-[var(--text-white)]">
                          <span>{formatPrice(stPrice)}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">تومان</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* یادداشت اختیاری */}
                <div className="flex flex-col gap-1.5 pt-2">
                  <label htmlFor="booking-note" className="text-xs text-[var(--text-muted)]">
                    توضیحات یا درخواست اضافه (اختیاری):
                  </label>
                  <input
                    id="booking-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثلاً: دسته اضافی یا بازی مورد نظر..."
                    className="h-10 w-full rounded-child border border-[var(--border-subtle)] bg-[var(--bg-body)] px-3 text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>

                {/* جمع کل */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <span className="text-sm font-bold text-[var(--text-white)]">مبلغ نهایی قابل پرداخت:</span>
                  <div className="flex items-baseline gap-1 text-[var(--primary)] font-black text-lg">
                    <span>{formatPrice(estimate)}</span>
                    <span className="text-xs font-normal text-[var(--text-white)]">تومان</span>
                  </div>
                </div>
              </div>

              {/* اطلاعات رزروکننده */}
              <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-3 text-xs">
                <span className="font-bold text-[var(--text-white)]">اطلاعات تحویل‌گیرنده رزرو:</span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[var(--text-muted)]">
                  <span>نام و شماره همراه: <strong className="text-[var(--text-white)]">{fullName || user?.fullName || "—"}</strong></span>
                  <span dir="ltr" className="font-mono text-[var(--text-white)]">{phone || user?.phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* فوتر مرحله پرداخت */}
          <footer className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto flex w-full max-w-[680px] flex-col gap-3 px-4">
              {errorText && (
                <div
                  role="alert"
                  className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
                >
                  {errorText}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[var(--text-muted)]">مبلغ قابل پرداخت</span>
                    <span className="text-lg font-black text-[var(--primary)]">
                      {formatPrice(estimate)} <span className="text-xs text-[var(--text-white)] font-normal">تومان</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAndPay}
                  disabled={isActionBusy}
                  className="h-12 w-full sm:w-auto sm:min-w-[260px] rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60 text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                >
                  {isActionBusy ? (
                    <>
                      <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>{isPaying ? "در حال انتقال به درگاه..." : "در حال ثبت رزرو..."}</span>
                    </>
                  ) : (
                    <span>پرداخت و ثبت نهایی رزرو</span>
                  )}
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* مدال احراز هویت درون صفحه (بدون پاک شدن انتخاب‌ها) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialPhone={phone}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
