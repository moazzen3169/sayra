"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { paymentService } from "@/services/paymentService";
import { reservationService } from "@/services/reservationService";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";
import { createIdempotencyKey } from "@/services/bookingService";
import type { Reservation } from "@/types/reservation";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatClock, formatDayLabel } from "@/lib/reservationUi";
import { Icon } from "@/components/ui/Icon";

function PaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reservationId = searchParams.get("reservationId") || "";
  const statusParam = (searchParams.get("status") || "FAILED").toUpperCase();
  const messageParam = searchParams.get("message") || "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

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
        console.error("Failed to load reservation on failed page:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId]);

  // منطق Retry ایمن طبق الزامات:
  // ۱. بررسی وضعیت تراکنش قبلی
  // ۲. اگر موفق شده باشد، کاربر را به success هدایت کن
  // ۳. در غیر این صورت ایجاد درخواست جدید پرداخت با idempotencyKey جدید
  const handleRetryPayment = async () => {
    if (!reservationId || isRetrying) return;
    setIsRetrying(true);
    setRetryError(null);

    const draft = bookingDraftStorage.get();
    const gamingCenterId = reservation?.gamingCenterId || draft?.gamingCenterId;

    if (!gamingCenterId) {
      setRetryError("شناسه گیم‌نت جهت تلاش مجدد یافت نشد.");
      setIsRetrying(false);
      return;
    }

    try {
      // ۱. بررسی وضعیت پرداخت فعلی
      const statusRes = await paymentService.getPaymentStatus(gamingCenterId, reservationId);
      if (statusRes.paymentState === "PAID") {
        router.push(
          `/payment/success?reservationId=${encodeURIComponent(
            reservationId
          )}&trackingCode=${encodeURIComponent(statusRes.trackingCode || "")}`
        );
        return;
      }

      // ۲. ایجاد تراکنش جدید
      const newIdempotencyKey = createIdempotencyKey();
      const initRes = await paymentService.initPayment(
        gamingCenterId,
        reservationId,
        newIdempotencyKey
      );

      if (initRes.paymentUrl) {
        window.location.href = initRes.paymentUrl;
      } else {
        setRetryError("آدرس معتبری از درگاه پرداخت دریافت نشد.");
      }
    } catch (err: any) {
      console.error("Retry payment error:", err);
      setRetryError(err?.message || "خطا در برقراری ارتباط با درگاه پرداخت.");
    } finally {
      setIsRetrying(false);
    }
  };

  const isCancelled = statusParam === "CANCELLED";
  const isPending = statusParam === "PENDING";
  const isUnknown = statusParam === "UNKNOWN";

  const title = isCancelled
    ? "انصراف از پرداخت"
    : isPending
    ? "پرداخت در انتظار تأیید"
    : isUnknown
    ? "عدم امکان تعیین نتیجه پرداخت"
    : "پرداخت انجام نشد";

  const description =
    messageParam ||
    (isCancelled
      ? "شما فرآیند پرداخت را در درگاه بانکی لغو کردید."
      : isPending
      ? "تراکنش بانکی انجام شده اما تایید نهایی درگاه هنوز دریافت نشده است."
      : isUnknown
      ? "پاسخی از درگاه بانکی دریافت نشد. در صورت کسر وجه از حساب، مبلغ ظرف ۷۲ ساعت بازگردانده می‌شود."
      : "تراکنش توسط درگاه بانکی تایید نشد یا خطایی در ارتباط با بانک رخ داده است.");

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] p-4 flex flex-col items-center justify-center py-12" dir="rtl">
      <div className="w-full max-w-[520px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 sm:p-8 flex flex-col items-center text-center gap-6 shadow-2xl">
        {/* Status Badge */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
            isPending
              ? "bg-[var(--accent-star)]/15 border-[var(--accent-star)] text-[var(--accent-star)]"
              : isUnknown
              ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]"
              : "bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-[var(--accent-red)]"
          }`}
        >
          {isPending ? (
            <Icon name="clock" size={36} />
          ) : isUnknown ? (
            <Icon name="alert" size={36} />
          ) : (
            <Icon name="close" size={36} className="stroke-[3]" />
          )}
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-white)]">{title}</h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
        </div>

        {/* Details Card */}
        {reservation && (
          <div className="w-full bg-[var(--bg-body)]/60 rounded-card p-4 border border-[var(--border-subtle)] flex flex-col gap-3 text-right text-xs">
            {reservation.id && (
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <span className="text-[var(--text-muted)]">شناسه رزرو:</span>
                <span className="font-mono font-bold text-sm text-[var(--text-white)]" dir="ltr">
                  {toPersianDigits(reservation.id)}
                </span>
              </div>
            )}

            {reservation.gamingCenterName && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">نام مجموعه:</span>
                <span className="font-bold text-[var(--text-white)]">{reservation.gamingCenterName}</span>
              </div>
            )}

            {reservation.startTime && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">زمان رزرو:</span>
                <span className="font-bold text-[var(--text-white)]">
                  {formatDayLabel(reservation.startTime)} • {formatClock(reservation.startTime, true)}
                </span>
              </div>
            )}

            {reservation.totalPrice !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] font-bold">مبلغ رزرو:</span>
                <div className="flex items-center gap-1 font-black text-sm text-[var(--primary)]">
                  <span>{formatPrice(reservation.totalPrice)}</span>
                  <span className="text-[11px] font-normal text-[var(--text-white)]">تومان</span>
                </div>
              </div>
            )}
          </div>
        )}

        {retryError && (
          <div className="w-full p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)] text-right">
            {retryError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          {reservationId && (
            <button
              type="button"
              onClick={handleRetryPayment}
              disabled={isRetrying}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isRetrying ? (
                <>
                  <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>در حال انتقال به درگاه...</span>
                </>
              ) : (
                <span>تلاش مجدد برای پرداخت</span>
              )}
            </button>
          )}

          {reservationId && (
            <Link
              href={`/reservations/${encodeURIComponent(reservationId)}`}
              className="h-11 w-full rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-[var(--text-white)] font-bold text-xs flex items-center justify-center transition-colors"
            >
              مشاهده جزئیات این رزرو
            </Link>
          )}

          <Link
            href="/reservations"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors py-1"
          >
            مشاهده تمام رزروهای من
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center" dir="rtl">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span className="text-xs text-[var(--text-muted)]">در حال بارگذاری صفحه وضعیت پرداخت...</span>
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
