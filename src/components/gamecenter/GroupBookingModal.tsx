"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import type {
  GroupReservation,
  GroupReservationPayload,
} from "@/types/gaming-center/group-reservation.types";
import { cleanPhoneNumber, formatPrice, isValidIranPhone, toPersianDigits, toEnglishDigits } from "@/lib/format";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import { useGroupReservation } from "@/hooks/gaming-center/use-group-reservation";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";

interface GroupBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamingCenterSlug: string;
  gamingCenterName: string;
  selectedStations: PhysicalStation[];
  initialCustomer?: { fullName: string; phone: string; email?: string };
  requireOtp?: boolean;
  onSuccess: (reservation: GroupReservation) => void;
  onRequestOtp?: (phone: string) => void;
}

export const GroupBookingModal: React.FC<GroupBookingModalProps> = ({
  isOpen,
  onClose,
  gamingCenterSlug,
  gamingCenterName,
  selectedStations,
  initialCustomer,
  requireOtp,
  onSuccess,
  onRequestOtp,
}) => {
  // Days generation: today + next 6 days
  const availableDates = useMemo(() => {
    const list: { id: string; dateStr: string; dayName: string; dateObj: Date }[] = [];
    const now = new Date();
    const dayNames = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString("fa-IR", {
        month: "numeric",
        day: "numeric",
      });
      const dayName = i === 0 ? "امروز" : i === 1 ? "فردا" : dayNames[d.getDay()];
      list.push({
        id: d.toISOString().split("T")[0],
        dateStr,
        dayName,
        dateObj: d,
      });
    }
    return list;
  }, []);

  const [selectedDateId, setSelectedDateId] = useState<string>(availableDates[0]?.id || "");
  const [selectedTimeHour, setSelectedTimeHour] = useState<number>(() => {
    const nextHour = new Date().getHours() + 1;
    return nextHour >= 24 ? 14 : Math.max(10, nextHour);
  });
  const [selectedTimeMinute, setSelectedTimeMinute] = useState<number>(0);

  // Duration in hours or minutes (standard range 15 to 1440 min)
  const [durationHours, setDurationHours] = useState<number>(2);

  // Form customer fields
  const [fullName, setFullName] = useState(initialCustomer?.fullName || "");
  const [phone, setPhone] = useState(initialCustomer?.phone || "");
  const [email, setEmail] = useState(initialCustomer?.email || "");
  const [note, setNote] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { user, isLoggedIn, login } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.fullName && !fullName) setFullName(user.fullName);
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [user]);

  const { checkout, submit, isSubmitting, error: apiError } = useGroupReservation(gamingCenterSlug);

  // Station duration constraints analysis
  const durationConstraints = useMemo(() => {
    if (selectedStations.length === 0) return { minHours: 1, maxHours: 24 };
    const minHours = Math.max(...selectedStations.map((s) => s.minRentHours || 1));
    const maxHours = Math.min(...selectedStations.map((s) => s.maxRentHours || 24));
    return { minHours, maxHours };
  }, [selectedStations]);

  // Price estimate calculation
  const totalHourlyPrice = useMemo(() => {
    return selectedStations.reduce(
      (sum, s) => sum + getEffectiveStationPricing(s).finalHourlyPrice,
      0
    );
  }, [selectedStations]);

  const estimatedTotal = totalHourlyPrice * durationHours;

  if (!isOpen) return null;

  // Build target ISO startTime
  const constructStartTime = (): { date: Date; isoString: string; error?: string } => {
    const selectedDate = availableDates.find((d) => d.id === selectedDateId);
    if (!selectedDate) return { date: new Date(), isoString: "", error: "روز انتخابی نامعتبر است." };

    const targetDate = new Date(selectedDate.dateObj);
    targetDate.setHours(selectedTimeHour, selectedTimeMinute, 0, 0);

    if (targetDate.getTime() <= Date.now()) {
      return {
        date: targetDate,
        isoString: "",
        error: "زمان رزرو باید در آینده باشد. لطفاً ساعت یا روز دیگری را انتخاب کنید.",
      };
    }

    return { date: targetDate, isoString: targetDate.toISOString() };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (selectedStations.length === 0) {
      setClientError("هیچ دستگاهی برای رزرو انتخاب نشده است.");
      return;
    }

    if (durationConstraints.minHours > durationConstraints.maxHours) {
      setClientError(
        `دستگاه‌های انتخاب‌شده دارای محدودیت مدت زمان متناقض هستند (${toPersianDigits(
          durationConstraints.minHours
        )} ساعت تا ${toPersianDigits(durationConstraints.maxHours)} ساعت).`
      );
      return;
    }

    if (
      durationHours < durationConstraints.minHours ||
      durationHours > durationConstraints.maxHours
    ) {
      setClientError(
        `مدت زمان رزرو باید بین ${toPersianDigits(
          durationConstraints.minHours
        )} تا ${toPersianDigits(durationConstraints.maxHours)} ساعت باشد.`
      );
      return;
    }

    const { isoString, error: timeError } = constructStartTime();
    if (timeError || !isoString) {
      setClientError(timeError || "زمان شروع نامعتبر است.");
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setClientError("نام و نام خانوادگی را به درستی وارد کنید (حداقل ۲ کاراکتر).");
      return;
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (!isValidIranPhone(cleanPhone)) {
      setClientError("شماره موبایل را با ۱۱ رقم و با ۰۹ وارد کنید.");
      return;
    }

    if (requireOtp && onRequestOtp) {
      // Guide user through required OTP flow
      onRequestOtp(cleanPhone);
      return;
    }

    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    await doSubmit(cleanPhone, fullName.trim(), isoString);
  };

  const doSubmit = async (targetPhone: string, targetName: string, startTimeIso?: string) => {
    const finalStartTime = startTimeIso || constructStartTime().isoString;
    if (!finalStartTime) return;

    const durationMinutes = Math.round(durationHours * 60);

    const payload: GroupReservationPayload = {
      startTime: finalStartTime,
      durationMinutes,
      items: selectedStations.map((st) => ({
        stationId: st.id,
      })),
      customer: {
        fullName: targetName,
        phone: targetPhone,
        ...(email.trim() ? { email: email.trim() } : {}),
      },
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    try {
      try {
        const checkoutRes = await checkout(payload);
        if (checkoutRes.paymentUrl) {
          window.location.href = checkoutRes.paymentUrl;
          return;
        }
      } catch (checkoutErr: any) {
        if (checkoutErr?.status !== 404 && checkoutErr?.code !== "NOT_FOUND") {
          throw checkoutErr;
        }
        // Fallback for legacy environments
        const res = await submit(payload);
        onSuccess(res);
        return;
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.code === "UNAUTHORIZED") {
        setIsAuthModalOpen(true);
      }
      // API error handled by hook state
    }
  };

  const handleAuthSuccess = async (
    authFullName: string,
    authPhone: string,
    token?: string,
    refreshToken?: string,
    gamingCenterId?: string,
    role?: string
  ) => {
    login(authFullName, authPhone, token, refreshToken, role);
    setIsAuthModalOpen(false);

    const resolvedName = authFullName || fullName.trim() || "کاربر سایرا";
    const resolvedPhone = toEnglishDigits(authPhone || phone).trim();
    if (resolvedName) setFullName(resolvedName);
    if (resolvedPhone) setPhone(resolvedPhone);

    if (resolvedPhone && resolvedPhone.length >= 10) {
      await doSubmit(resolvedPhone, resolvedName);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 sm:p-6 flex flex-col gap-5 text-right relative shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-[var(--text-white)]">
              تکمیل رزرو گروهی
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              {gamingCenterName} • {toPersianDigits(selectedStations.length)} دستگاه انتخاب‌شده
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-[var(--foreground)]/50 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Selected Stations Pills */}
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
          {selectedStations.map((s) => {
            const pricing = getEffectiveStationPricing(s);
            return (
              <span
                key={s.id}
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--foreground)]/60 text-[var(--text-white)] border border-[var(--border-subtle)] flex items-center gap-1"
              >
                <span>{s.name}</span>
                <span>({formatPrice(pricing.finalHourlyPrice)} ت/س)</span>
                {pricing.hasDiscount && (
                  <span className="text-[10px] text-[var(--primary)] font-black">
                    {pricing.discountPercentage ? `[${toPersianDigits(pricing.discountPercentage)}٪]` : "[تخفیف]"}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Step 1: Date */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-white)]">
              ۱. تاریخ رزرو:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
              {availableDates.map((d) => {
                const active = d.id === selectedDateId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDateId(d.id)}
                    className={`snap-start shrink-0 w-20 h-14 rounded-lg flex flex-col items-center justify-center text-xs border transition-all ${
                      active
                        ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold shadow-md"
                        : "bg-[var(--foreground)]/40 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    <span>{d.dayName}</span>
                    <span className="opacity-80 text-[10px]">{d.dateStr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-white)]">
                ساعت شروع:
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTimeHour}
                  onChange={(e) => setSelectedTimeHour(Number(e.target.value))}
                  className="flex-1 h-10 px-2 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] focus:border-[var(--primary)] outline-none"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h} className="bg-[var(--bg-card)]">
                      {toPersianDigits(h.toString().padStart(2, "0"))}:00
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTimeMinute}
                  onChange={(e) => setSelectedTimeMinute(Number(e.target.value))}
                  className="w-16 h-10 px-2 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] focus:border-[var(--primary)] outline-none"
                >
                  <option value={0} className="bg-[var(--bg-card)]">۰۰</option>
                  <option value={15} className="bg-[var(--bg-card)]">۱۵</option>
                  <option value={30} className="bg-[var(--bg-card)]">۳۰</option>
                  <option value={45} className="bg-[var(--bg-card)]">۴۵</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-white)]">
                مدت زمان (ساعت):
              </label>
              <input
                type="number"
                min={durationConstraints.minHours}
                max={durationConstraints.maxHours}
                value={durationHours}
                onChange={(e) => setDurationHours(Math.max(1, Number(e.target.value)))}
                className="h-10 px-3 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] focus:border-[var(--primary)] outline-none"
              />
            </div>
          </div>

          {/* Step 3: Customer Information */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-white)]">
              اطلاعات رزرو کننده:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="نام و نام خانوادگی *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 px-3 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
              />

              <input
                type="tel"
                placeholder="شماره موبایل (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-10 px-3 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="email"
                placeholder="ایمیل (اختیاری)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 px-3 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
              />

              <input
                type="text"
                placeholder="یادداشت رزرو (اختیاری)"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                className="h-10 px-3 rounded-lg bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
              />
            </div>
          </div>

          {/* Total & Price summary */}
          <div className="rounded-card bg-[var(--foreground)]/40 p-3.5 flex items-center justify-between border border-[var(--border-subtle)] text-xs">
            <span className="text-[var(--text-muted)]">مبلغ برآوردی کل:</span>
            <div className="flex items-baseline gap-1 font-black text-sm text-[var(--primary)]">
              <span>{formatPrice(estimatedTotal)}</span>
              <span className="text-xs font-normal text-[var(--text-white)]">تومان</span>
            </div>
          </div>

          {/* Validation & Backend Error display */}
          {(clientError || apiError) && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/40 text-[var(--accent-red)] text-xs font-bold leading-relaxed"
            >
              {clientError || apiError?.message}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || selectedStations.length === 0}
            className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--foreground)] disabled:text-[var(--text-muted)] text-on-primary font-bold text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? "در حال ثبت رزرو گروهی..." : "تأیید و ثبت نهایی رزرو"}
          </button>
        </form>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialPhone={phone}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
