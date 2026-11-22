"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { reservationService } from "@/services/reservationService";
import {
  customerNotificationService,
  triggerNotificationsRefresh,
} from "@/services/customerNotificationService";
import { getAccessToken } from "@/lib/token";
import type { Reservation } from "@/types/reservation";
import { APP_TIME_ZONE } from "@/lib/api/config";
import { formatPrice, toEnglishDigits } from "@/lib/format";
import { formatClock, formatDayLabel } from "@/lib/reservationUi";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type PaymentPurpose = "RESERVATION" | "WALLET_TOPUP" | "UNKNOWN";
type NormalizedStatusKind = "SUCCESS" | "PENDING" | "FAILED";

interface StatusMeta {
  kind: NormalizedStatusKind;
  label: string;
  badgeVariant: BadgeProps["variant"];
  iconName: IconName;
  iconWrapperClass: string;
}

function normalizePurpose(value: string | null): PaymentPurpose {
  const normalized = (value || "").trim().toUpperCase();

  if (
    ["WALLET", "WALLET_TOPUP", "WALLET_CHARGE", "TOPUP", "DEPOSIT"].includes(
      normalized
    )
  ) {
    return "WALLET_TOPUP";
  }

  if (["RESERVATION", "BOOKING", "GROUP_RESERVATION"].includes(normalized)) {
    return "RESERVATION";
  }

  return "UNKNOWN";
}

function resolveStatusMeta(
  statusParam: string | null,
  paymentStatusParam: string | null
): StatusMeta {
  const raw = (statusParam || paymentStatusParam || "success")
    .trim()
    .toUpperCase();

  if (["PENDING", "INITIATED", "WAITING", "PROCESSING"].includes(raw)) {
    return {
      kind: "PENDING",
      label: "در انتظار تأیید",
      badgeVariant: "warning",
      iconName: "clock",
      iconWrapperClass:
        "bg-[var(--accent-warning)]/15 border border-[var(--accent-warning)]/30 text-[var(--accent-warning)]",
    };
  }

  if (["FAILED", "FAIL", "ERROR", "CANCELLED", "CANCELED", "NOK", "0"].includes(raw)) {
    return {
      kind: "FAILED",
      label: raw === "CANCELLED" || raw === "CANCELED" || raw === "NOK" ? "لغو شده" : "ناموفق",
      badgeVariant: "danger",
      iconName: "alert",
      iconWrapperClass:
        "bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]",
    };
  }

  return {
    kind: "SUCCESS",
    label: "پرداخت موفق",
    badgeVariant: "success",
    iconName: "check",
    iconWrapperClass:
      "bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]",
  };
}

function parseNumericParam(value: string): number | undefined {
  if (!value) return undefined;
  const cleaned = toEnglishDigits(value).replace(/[,\s٬،]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function DetailRow({
  label,
  value,
  ltr = false,
  action,
}: {
  label: string;
  value?: React.ReactNode;
  ltr?: boolean;
  action?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex items-center justify-between gap-4 min-h-7">
      <span className="text-secondary text-[var(--text-muted)] shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "text-body-emphasis text-[var(--text-white)] text-left break-all",
            ltr && "font-mono"
          )}
          dir={ltr ? "ltr" : "rtl"}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}

function PaymentSuccessTopBar() {
  return (
    <header className="sticky top-0 z-[var(--z-header)] w-full bg-[var(--bg-card)] border-b border-[var(--border-subtle)]">
      <div className="w-full max-w-[640px] mx-auto h-14 px-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-11 px-3 -mr-3 rounded-card text-label text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Icon name="back" size={20} className="text-[var(--primary)]" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>

        <span className="text-secondary text-[var(--text-muted)]">
          رسید پرداخت
        </span>
      </div>
    </header>
  );
}

function PaymentSuccessSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--bg-body)] text-[var(--text-white)]"
      dir="rtl"
    >
      <PaymentSuccessTopBar />
      <main
        aria-busy="true"
        className="flex-1 w-full max-w-[640px] mx-auto px-4 py-6 lg:py-8 flex flex-col justify-center"
      >
        <span className="sr-only">در حال بارگذاری رسید پرداخت</span>
        <div className="w-full rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col items-center gap-6">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="w-full flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-36 w-full" />
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId") || "";
  const reservationId = searchParams.get("reservationId") || "";
  const groupBookingId = searchParams.get("groupBookingId") || "";
  const paymentId = searchParams.get("paymentId") || "";

  const trackingCode =
    searchParams.get("trackId") ||
    searchParams.get("trackingCode") ||
    searchParams.get("refId") ||
    searchParams.get("transactionId") ||
    "";

  const amountParam = searchParams.get("amount") || "";
  const statusParam = searchParams.get("status");
  const paymentStatusParam = searchParams.get("paymentStatus");

  const statusMeta = useMemo(
    () => resolveStatusMeta(statusParam, paymentStatusParam),
    [statusParam, paymentStatusParam]
  );

  const purpose = useMemo(
    () =>
      normalizePurpose(
        searchParams.get("purpose") || searchParams.get("type")
      ),
    [searchParams]
  );

  const descriptionParam = searchParams.get("description") || "";
  const paidAt = searchParams.get("paidAt") || "";
  const walletBalanceParam = searchParams.get("walletBalance") || "";

  const [reservationResult, setReservationResult] = useState<{
    id: string;
    data: Reservation | null;
  } | null>(null);
  const [copiedTrackId, setCopiedTrackId] = useState(false);

  const amount = useMemo(() => parseNumericParam(amountParam), [amountParam]);
  const walletBalance = useMemo(
    () => parseNumericParam(walletBalanceParam),
    [walletBalanceParam]
  );

  const shouldLoadReservation =
    purpose !== "WALLET_TOPUP" && Boolean(reservationId);
  const loadingReservation =
    shouldLoadReservation && reservationResult?.id !== reservationId;
  const reservation =
    shouldLoadReservation && reservationResult?.id === reservationId
      ? reservationResult.data
      : null;

  useEffect(() => {
    if (!shouldLoadReservation) return;

    let active = true;
    const controller = new AbortController();

    reservationService
      .get(reservationId, controller.signal)
      .then((data) => {
        if (active) {
          setReservationResult({ id: reservationId, data });
        }
      })
      .catch(() => {
        if (active) {
          setReservationResult({ id: reservationId, data: null });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reservationId, shouldLoadReservation]);

  const isWalletPayment = purpose === "WALLET_TOPUP";
  const isReservationPayment =
    purpose === "RESERVATION" || Boolean(reservationId);

  useEffect(() => {
    if (!isReservationPayment || statusMeta.kind !== "SUCCESS") return;
    triggerNotificationsRefresh();
    if (!getAccessToken()) return;

    const controller = new AbortController();
    customerNotificationService
      .fetchLatestNotifications({ pageSize: 20, signal: controller.signal })
      .catch(() => {
        // Best effort refresh after reservation completion
      });

    return () => controller.abort();
  }, [isReservationPayment, statusMeta.kind]);

  const finalAmount =
    amount ?? (isReservationPayment ? reservation?.totalPrice : undefined);

  const finalTrackingCode =
    trackingCode ||
    (reservation as { trackingCode?: string } | null)?.trackingCode ||
    (reservation as { reservationCode?: string } | null)?.reservationCode ||
    "";

  const paymentTypeLabel = isWalletPayment
    ? "شارژ کیف پول"
    : isReservationPayment
    ? "پرداخت رزرو"
    : "پرداخت آنلاین";

  const pageTitle =
    statusMeta.kind === "PENDING"
      ? "پرداخت در انتظار تأیید است"
      : statusMeta.kind === "FAILED"
      ? "پرداخت انجام نشد"
      : isWalletPayment
      ? "شارژ کیف پول با موفقیت انجام شد"
      : isReservationPayment
      ? "پرداخت رزرو با موفقیت انجام شد"
      : "پرداخت با موفقیت انجام شد";

  const pageSubtitle =
    statusMeta.kind === "PENDING"
      ? "تراکنش ثبت شده و در انتظار تأیید نهایی درگاه بانکی است."
      : statusMeta.kind === "FAILED"
      ? "تراکنش توسط درگاه بانکی تأیید نشد."
      : isWalletPayment
      ? "مبلغ پرداختی به موجودی کیف پول شما اضافه شد."
      : isReservationPayment
      ? "رزرو شما با موفقیت ثبت و پرداخت شد."
      : "تراکنش شما با موفقیت در سامانه ثبت شد.";

  const handleCopyTrackId = async () => {
    if (!finalTrackingCode || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(finalTrackingCode);
      setCopiedTrackId(true);
      window.setTimeout(() => setCopiedTrackId(false), 2500);
    } catch {
      // ignore clipboard permission errors
    }
  };

  const actionLinkBase =
    "h-12 w-full rounded-card text-button font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
  const primaryLinkClass = cn(
    actionLinkBase,
    "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary"
  );
  const secondaryLinkClass = cn(
    actionLinkBase,
    "bg-[var(--foreground)] hover:bg-[var(--foreground)]/80 text-[var(--text-white)] border border-[var(--border-color)]"
  );

  const reservationsButton = (
    <Link
      key="reservations"
      href="/reservations"
      className={isWalletPayment ? secondaryLinkClass : primaryLinkClass}
    >
      <Icon name="calendar" size={20} />
      <span>مشاهده رزروها</span>
    </Link>
  );

  const walletButton = (
    <Link
      key="wallet"
      href="/profile/wallet"
      className={isWalletPayment ? primaryLinkClass : secondaryLinkClass}
    >
      <Icon name="wallet" size={20} />
      <span>مشاهده کیف پول</span>
    </Link>
  );

  const orderedBottomActions = isWalletPayment
    ? [walletButton, reservationsButton]
    : [reservationsButton, walletButton];

  const distinctOrderId =
    orderId && orderId !== reservationId && orderId !== paymentId
      ? orderId
      : "";

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--bg-body)] text-[var(--text-white)]"
      dir="rtl"
    >
      <PaymentSuccessTopBar />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-6 lg:py-8 flex flex-col justify-center animate-fadeIn">
        <section className="w-full rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col items-center text-center gap-6">
          {/* Status Icon & Heading */}
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                statusMeta.iconWrapperClass
              )}
            >
              <Icon name={statusMeta.iconName} size={24} strokeWidth={2.25} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-page-title text-[var(--text-white)]">
                {pageTitle}
              </h1>
              <p className="text-secondary text-[var(--text-muted)]">
                {pageSubtitle}
              </p>
            </div>
          </div>

          {/* Highlighted Amount */}
          {finalAmount !== undefined && (
            <div className="w-full rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] p-4 flex flex-col items-center gap-1.5">
              <span className="text-secondary text-[var(--text-muted)]">
                مبلغ پرداخت‌شده
              </span>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-key-number text-[var(--primary)]">
                  {formatPrice(finalAmount)}
                </span>
                <span className="text-secondary text-[var(--text-white)]">
                  تومان
                </span>
              </div>
            </div>
          )}

          {/* Receipt Summary */}
          <div className="w-full rounded-card bg-[var(--bg-body)]/60 border border-[var(--border-subtle)] p-4 flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
              <span className="text-secondary text-[var(--text-muted)]">
                وضعیت تراکنش
              </span>
              <Badge variant={statusMeta.badgeVariant}>
                {statusMeta.label}
              </Badge>
            </div>

            {finalTrackingCode && (
              <DetailRow
                label="کد پیگیری"
                value={finalTrackingCode}
                ltr
                action={
                  <button
                    type="button"
                    onClick={handleCopyTrackId}
                    aria-label="کپی کد پیگیری"
                    className="relative inline-flex items-center gap-1 px-2.5 h-8 rounded-child bg-[var(--foreground)]/60 hover:bg-[var(--foreground)] text-label text-[var(--text-white)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white after:content-[''] after:absolute after:-inset-y-1.5 after:-inset-x-1"
                  >
                    <Icon
                      name={copiedTrackId ? "check" : "copy"}
                      size={16}
                      className={
                        copiedTrackId
                          ? "text-[var(--accent-green)]"
                          : "text-[var(--text-muted)]"
                      }
                    />
                    <span>{copiedTrackId ? "کپی شد" : "کپی"}</span>
                  </button>
                }
              />
            )}

            <DetailRow label="شماره سفارش" value={distinctOrderId} ltr />

            <DetailRow label="شناسه تراکنش" value={paymentId} ltr />

            <DetailRow label="نوع پرداخت" value={paymentTypeLabel} />

            {descriptionParam && (
              <DetailRow label="بابت" value={descriptionParam} />
            )}

            {paidAt && (
              <DetailRow label="تاریخ پرداخت" value={formatDateTime(paidAt)} />
            )}

            {groupBookingId && (
              <DetailRow label="شناسه رزرو گروهی" value={groupBookingId} ltr />
            )}

            {isWalletPayment && walletBalance !== undefined && (
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <DetailRow
                  label="موجودی جدید کیف پول"
                  value={`${formatPrice(walletBalance)} تومان`}
                />
              </div>
            )}

            {isReservationPayment && loadingReservation && (
              <div
                aria-busy="true"
                className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-2"
              >
                <span className="sr-only">در حال دریافت جزئیات رزرو</span>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            )}

            {isReservationPayment && !loadingReservation && reservation && (
              <div className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-3">
                <DetailRow
                  label="کد رزرو"
                  value={
                    (reservation as { reservationCode?: string })
                      .reservationCode || reservation.id
                  }
                  ltr
                />
                <DetailRow
                  label="گیمنت"
                  value={reservation.gamingCenterName}
                />
                <DetailRow
                  label="دستگاه"
                  value={reservation.stationSnapshot?.name}
                />
                {reservation.startTime && (
                  <DetailRow
                    label="زمان شروع"
                    value={`${formatDayLabel(
                      reservation.startTime
                    )} • ${formatClock(reservation.startTime, true)}`}
                  />
                )}
                {reservation.endTime && (
                  <DetailRow
                    label="زمان پایان"
                    value={formatClock(reservation.endTime, true)}
                  />
                )}
                {reservationId && (
                  <div className="pt-1">
                    <Link
                      href={`/reservations/${encodeURIComponent(reservationId)}`}
                      className="inline-flex items-center gap-1.5 text-label text-[var(--primary)] underline underline-offset-4 hover:opacity-80"
                    >
                      <span>مشاهده جزئیات کامل رزرو</span>
                      <Icon name="arrow-left" size={16} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!isReservationPayment && reservationId && (
              <DetailRow label="شناسه رزرو" value={reservationId} ltr />
            )}
          </div>

          {/* Primary & Secondary Bottom Actions: Reservations & Wallet */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {orderedBottomActions}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
