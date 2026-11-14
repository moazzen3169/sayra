"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { reservationService } from "@/services/reservationService";
import type { Reservation } from "@/types/reservation";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatClock, formatDayLabel } from "@/lib/reservationUi";
import { Icon } from "@/components/ui/Icon";

type PaymentPurpose = "RESERVATION" | "WALLET_TOPUP" | "UNKNOWN";

function normalizePurpose(value: string | null): PaymentPurpose {
  const normalized = (value || "").trim().toUpperCase();

  if (
    ["WALLET", "WALLET_TOPUP", "WALLET_CHARGE", "TOPUP", "DEPOSIT"].includes(
      normalized
    )
  ) {
    return "WALLET_TOPUP";
  }

  if (
    ["RESERVATION", "BOOKING", "GROUP_RESERVATION"].includes(normalized)
  ) {
    return "RESERVATION";
  }

  return "UNKNOWN";
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function DetailRow({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value?: string | number | null;
  ltr?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[var(--text-muted)] shrink-0">{label}</span>
      <span
        className={`font-bold text-[var(--text-white)] text-left break-all ${
          ltr ? "font-mono" : ""
        }`}
        dir={ltr ? "ltr" : "rtl"}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  const reservationId = searchParams.get("reservationId") || "";
  const groupBookingId = searchParams.get("groupBookingId") || "";
  const paymentId = searchParams.get("paymentId") || "";

  const trackingCode =
    searchParams.get("trackingCode") ||
    searchParams.get("refId") ||
    searchParams.get("transactionId") ||
    "";

  const amountParam = searchParams.get("amount") || "";
  const paymentStatus =
    (searchParams.get("paymentStatus") || "PAID").toUpperCase();

  const purpose = useMemo(
    () => normalizePurpose(searchParams.get("purpose")),
    [searchParams]
  );

  const description =
    searchParams.get("description") ||
    (purpose === "WALLET_TOPUP"
      ? "افزایش موجودی کیف پول"
      : purpose === "RESERVATION"
      ? "پرداخت هزینه رزرو"
      : "پرداخت آنلاین");

  const paidAt = searchParams.get("paidAt") || "";
  const walletBalanceParam = searchParams.get("walletBalance") || "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);

  const amount = useMemo(() => {
    if (!amountParam) return undefined;

    const parsed = Number(amountParam.replace(/[,\s٬،]/g, ""));

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }, [amountParam]);

  const walletBalance = useMemo(() => {
    if (!walletBalanceParam) return undefined;

    const parsed = Number(walletBalanceParam.replace(/[,\s٬،]/g, ""));

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }, [walletBalanceParam]);

  useEffect(() => {
    // برای پرداخت کیف پول نباید درخواست دریافت جزئیات رزرو ارسال شود.
    if (purpose === "WALLET_TOPUP" || !reservationId) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadReservation = async () => {
      setLoading(true);

      try {
        const result = await reservationService.get(reservationId);

        if (active) {
          setReservation(result);
        }
      } catch (error) {
        console.error(
          "Failed to load reservation details on payment success page:",
          error
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReservation();

    return () => {
      active = false;
    };
  }, [reservationId, purpose]);

  const isWalletPayment = purpose === "WALLET_TOPUP";
  const isReservationPayment =
    purpose === "RESERVATION" || Boolean(reservationId);

  const finalAmount =
    amount ??
    (isReservationPayment ? reservation?.totalPrice : undefined);

  const finalTrackingCode =
    trackingCode ||
    (reservation as any)?.trackingCode ||
    (reservation as any)?.reservationCode ||
    "";

  const statusLabel =
    paymentStatus === "PAID"
      ? "پرداخت موفق"
      : paymentStatus === "PENDING"
      ? "در انتظار تأیید"
      : paymentStatus;

  const pageTitle = isWalletPayment
    ? "شارژ کیف پول با موفقیت انجام شد"
    : "پرداخت با موفقیت انجام شد";

  const pageDescription = isWalletPayment
    ? "مبلغ پرداختی برای افزایش موجودی کیف پول شما ثبت شده است."
    : "پرداخت رزرو شما با موفقیت انجام شده است.";

  return (
    <div
      className="min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] p-4 flex flex-col items-center justify-center py-12"
      dir="rtl"
    >
      <div className="w-full max-w-[540px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 sm:p-8 flex flex-col items-center text-center gap-6 shadow-2xl">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-[var(--accent-green)]/15 border-2 border-[var(--accent-green)] text-[var(--accent-green)] flex items-center justify-center shadow-[0_0_24px_rgba(74,222,128,0.25)]">
          <Icon name="check" size={36} className="stroke-[3]" />
        </div>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-white)]">
            {pageTitle}
          </h1>

          <p className="text-xs text-[var(--text-muted)] leading-6">
            {pageDescription}
          </p>
        </div>

        {/* Amount */}
        {finalAmount !== undefined && (
          <div className="w-full rounded-card bg-[var(--primary)]/10 border border-[var(--primary)]/30 p-4">
            <span className="block text-xs text-[var(--text-muted)] mb-2">
              مبلغ پرداخت‌شده
            </span>

            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--primary)]">
                {formatPrice(finalAmount)}
              </span>

              <span className="text-xs text-[var(--text-white)]">
                تومان
              </span>
            </div>
          </div>
        )}

        {/* Receipt */}
        <div className="w-full bg-[var(--bg-body)]/60 rounded-card p-4 border border-[var(--border-subtle)] flex flex-col gap-3 text-right text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <span className="text-[var(--text-muted)]">
              وضعیت تراکنش:
            </span>

            <span className="font-black text-[var(--accent-green)]">
              {statusLabel}
            </span>
          </div>

          <DetailRow
            label="بابت:"
            value={description}
          />

          <DetailRow
            label="نوع پرداخت:"
            value={
              isWalletPayment
                ? "شارژ کیف پول"
                : isReservationPayment
                ? "پرداخت رزرو"
                : "پرداخت آنلاین"
            }
          />

          <DetailRow
            label="کد پیگیری:"
            value={finalTrackingCode || "در پاسخ درگاه ارائه نشده"}
            ltr={Boolean(finalTrackingCode)}
          />

          <DetailRow
            label="شناسه تراکنش:"
            value={paymentId || undefined}
            ltr
          />

          <DetailRow
            label="تاریخ پرداخت:"
            value={paidAt ? formatDateTime(paidAt) : undefined}
          />

          {groupBookingId && (
            <DetailRow
              label="شناسه رزرو گروهی:"
              value={groupBookingId}
              ltr
            />
          )}

          {isWalletPayment && walletBalance !== undefined && (
            <>
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <DetailRow
                  label="موجودی جدید کیف پول:"
                  value={`${formatPrice(walletBalance)} تومان`}
                />
              </div>
            </>
          )}

          {isReservationPayment && reservation && (
            <>
              <div className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-3">
                <DetailRow
                  label="شماره رزرو:"
                  value={
                    (reservation as any).reservationCode ||
                    reservation.id
                  }
                  ltr
                />

                <DetailRow
                  label="نام مجموعه:"
                  value={reservation.gamingCenterName}
                />

                <DetailRow
                  label="دستگاه:"
                  value={reservation.stationSnapshot?.name}
                />

                {reservation.startTime && (
                  <DetailRow
                    label="زمان شروع:"
                    value={`${formatDayLabel(
                      reservation.startTime
                    )} • ${formatClock(reservation.startTime, true)}`}
                  />
                )}

                {reservation.endTime && (
                  <DetailRow
                    label="زمان پایان:"
                    value={formatClock(reservation.endTime, true)}
                  />
                )}
              </div>
            </>
          )}

          {isReservationPayment && loading && (
            <p className="text-[var(--text-muted)] text-center pt-2">
              در حال دریافت جزئیات رزرو...
            </p>
          )}

          {isReservationPayment && !loading && !reservation && reservationId && (
            <p className="text-[var(--text-muted)] text-center pt-2 leading-6">
              پرداخت تأیید شده است؛ اما جزئیات رزرو در حال حاضر قابل دریافت
              نیست. شناسه رزرو شما: {toPersianDigits(reservationId)}
            </p>
          )}

          {!finalTrackingCode && (
            <p className="text-[10px] text-[var(--text-muted)] leading-5 border-t border-[var(--border-subtle)] pt-2">
              کد پیگیری در پاسخ تأیید پرداخت دریافت نشده است. برای نمایش این
              مقدار، بک‌اند باید trackingCode یا refId را برگرداند.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          {isReservationPayment && reservationId && (
            <Link
              href={`/reservations/${encodeURIComponent(reservationId)}`}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              مشاهده جزئیات رزرو
            </Link>
          )}

          {isWalletPayment && (
            <Link
              href="/profile"
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              مشاهده کیف پول
            </Link>
          )}

          {isReservationPayment && (
            <Link
              href="/reservations"
              className="h-11 w-full rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-[var(--text-white)] font-bold text-xs flex items-center justify-center transition-colors"
            >
              مشاهده رزروهای من
            </Link>
          )}

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
        <div
          className="flex flex-col items-center justify-center min-h-screen gap-3 text-center"
          dir="rtl"
        >
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span className="text-xs text-[var(--text-muted)]">
            در حال بارگذاری رسید پرداخت...
          </span>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}