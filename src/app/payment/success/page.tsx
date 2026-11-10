"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { reservationService } from "@/services/reservationService";
import type { Reservation } from "@/types/reservation";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatClock, formatDayLabel } from "@/lib/reservationUi";
import { Icon } from "@/components/ui/Icon";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reservationId = searchParams.get("reservationId") || "";
  const paramTrackingCode = searchParams.get("trackingCode") || "";
  const paramAmount = searchParams.get("amount") || "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await reservationService.get(reservationId);
        setReservation(res);
      } catch (err) {
        console.error("Failed to load reservation details on success page:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId]);

  const trackingCode =
    paramTrackingCode ||
    (reservation as any)?.trackingCode ||
    reservation?.id ||
    "—";

  const totalAmount =
    reservation?.totalPrice ??
    (paramAmount ? parseInt(paramAmount, 10) : undefined);

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] p-4 flex flex-col items-center justify-center py-12" dir="rtl">
      <div className="w-full max-w-[520px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 sm:p-8 flex flex-col items-center text-center gap-6 shadow-2xl">
        {/* Animated Success Badge */}
        <div className="w-20 h-20 rounded-full bg-[var(--accent-green)]/15 border-2 border-[var(--accent-green)] text-[var(--accent-green)] flex items-center justify-center shadow-[0_0_24px_rgba(74,222,128,0.25)]">
          <Icon name="check" size={36} className="stroke-[3]" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-white)]">
            پرداخت با موفقیت انجام شد
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            رزرو شما با موفقیت ثبت گردید و پیامک تایید برای شما ارسال شد.
          </p>
        </div>

        {/* Details Card */}
        <div className="w-full bg-[var(--bg-body)]/60 rounded-card p-4 border border-[var(--border-subtle)] flex flex-col gap-3 text-right text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <span className="text-[var(--text-muted)]">کد پیگیری تراکنش / رزرو:</span>
            <span className="font-mono font-black text-sm text-[var(--primary)]" dir="ltr">
              {toPersianDigits(trackingCode)}
            </span>
          </div>

          {reservation?.gamingCenterName && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">نام مجموعه:</span>
              <span className="font-bold text-[var(--text-white)]">{reservation.gamingCenterName}</span>
            </div>
          )}

          {reservation?.stationSnapshot?.name && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">دستگاه:</span>
              <span className="font-bold text-[var(--text-white)]">
                {reservation.stationSnapshot.name}
                {reservation.stationSnapshot.stationType ? ` (${reservation.stationSnapshot.stationType})` : ""}
              </span>
            </div>
          )}

          {reservation?.startTime && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">زمان رزرو:</span>
              <span className="font-bold text-[var(--text-white)]">
                {formatDayLabel(reservation.startTime)} • {formatClock(reservation.startTime, true)}
                {reservation.endTime ? ` تا ${formatClock(reservation.endTime, true)}` : ""}
              </span>
            </div>
          )}

          {totalAmount !== undefined && !isNaN(totalAmount) && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] font-bold">مبلغ پرداخت‌شده:</span>
              <div className="flex items-center gap-1 font-black text-sm text-[var(--primary)]">
                <span>{formatPrice(totalAmount)}</span>
                <span className="text-[11px] font-normal text-[var(--text-white)]">تومان</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          {reservationId && (
            <Link
              href={`/reservations/${encodeURIComponent(reservationId)}`}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>مشاهده جزئیات رزرو</span>
            </Link>
          )}

          <Link
            href="/reservations"
            className="h-11 w-full rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-[var(--text-white)] font-bold text-xs flex items-center justify-center transition-colors"
          >
            مشاهده رزروهای من
          </Link>

          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors py-1"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center" dir="rtl">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span className="text-xs text-[var(--text-muted)]">در حال بارگذاری صفحه تایید پرداخت...</span>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
