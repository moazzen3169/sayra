"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { paymentService } from "@/services/paymentService";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";
import { getErrorMessage } from "@/lib/reservationUi";

function normalizePurpose(value: unknown): string {
  const normalized = String(value || "").trim().toUpperCase();

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

  return "";
}

function buildSuccessUrl(data: {
  purpose: string;
  reservationId?: string;
  groupBookingId?: string;
  paymentId?: string;
  trackingCode?: string;
  amount?: number | string;
  paymentStatus?: string;
  description?: string;
  paidAt?: string;
  walletBalance?: number | string;
  refId?: string;
  transactionId?: string;
}): string {
  const params = new URLSearchParams();

  params.set("purpose", data.purpose || "UNKNOWN");
  params.set("paymentStatus", data.paymentStatus || "PAID");

  if (data.reservationId) {
    params.set("reservationId", data.reservationId);
  }

  if (data.groupBookingId) {
    params.set("groupBookingId", data.groupBookingId);
  }

  if (data.paymentId) {
    params.set("paymentId", data.paymentId);
  }

  if (data.trackingCode) {
    params.set("trackingCode", data.trackingCode);
  }

  if (data.refId) {
    params.set("refId", data.refId);
  }

  if (data.transactionId) {
    params.set("transactionId", data.transactionId);
  }

  if (data.amount !== undefined && data.amount !== null && data.amount !== "") {
    params.set("amount", String(data.amount));
  }

  if (data.description) {
    params.set("description", data.description);
  }

  if (data.paidAt) {
    params.set("paidAt", data.paidAt);
  }

  if (
    data.walletBalance !== undefined &&
    data.walletBalance !== null &&
    data.walletBalance !== ""
  ) {
    params.set("walletBalance", String(data.walletBalance));
  }

  return `/payment/success?${params.toString()}`;
}

function buildFailedUrl(data: {
  status: string;
  reservationId?: string;
  paymentId?: string;
  purpose?: string;
  amount?: number | string;
  message?: string;
}): string {
  const params = new URLSearchParams();

  params.set("status", data.status || "FAILED");

  if (data.reservationId) {
    params.set("reservationId", data.reservationId);
  }

  if (data.paymentId) {
    params.set("paymentId", data.paymentId);
  }

  if (data.purpose) {
    params.set("purpose", data.purpose);
  }

  if (data.amount !== undefined && data.amount !== null && data.amount !== "") {
    params.set("amount", String(data.amount));
  }

  if (data.message) {
    params.set("message", data.message);
  }

  return `/payment/failed?${params.toString()}`;
}

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusText, setStatusText] = useState(
    "در حال تأیید تراکنش و بررسی نتیجه پرداخت..."
  );
  const [errorText, setErrorText] = useState<string | null>(null);

  const isVerifyingRef = useRef(false);

  useEffect(() => {
    if (isVerifyingRef.current) return;

    isVerifyingRef.current = true;

    const authority =
      searchParams.get("Authority") ||
      searchParams.get("authority") ||
      searchParams.get("trackId") ||
      "";

    const status =
      searchParams.get("Status") ||
      searchParams.get("status") ||
      "";

    const paramPaymentId =
      searchParams.get("paymentId") ||
      searchParams.get("id") ||
      "";

    const paramReservationId =
      searchParams.get("reservationId") ||
      searchParams.get("orderId") ||
      "";

    const paramGamingCenterId =
      searchParams.get("gamingCenterId") ||
      searchParams.get("centerId") ||
      "";

    const paramPurpose = normalizePurpose(
      searchParams.get("purpose") ||
        searchParams.get("paymentPurpose") ||
        searchParams.get("type")
    );

    const draft = bookingDraftStorage.get();

    const paymentId = paramPaymentId || draft?.paymentId || "";
    const reservationId = paramReservationId || draft?.reservationId || "";
    const gamingCenterId = paramGamingCenterId || draft?.gamingCenterId || "";

    const draftAmount = draft?.grandTotal;

    // لغو پرداخت در درگاه
    if (status && status.toUpperCase() === "NOK") {
      router.replace(
        buildFailedUrl({
          status: "CANCELLED",
          reservationId,
          paymentId,
          purpose: paramPurpose,
          amount: draftAmount,
          message: "پرداخت توسط کاربر لغو گردید.",
        })
      );
      return;
    }

    if (!paymentId && (!reservationId || !gamingCenterId)) {
      setErrorText(
        "اطلاعات پرداخت یا رزرو جهت تأیید تراکنش یافت نشد."
      );
      return;
    }

    const redirectToSuccess = (verifyRes: any) => {
      const serverPurpose = normalizePurpose(
        verifyRes.paymentPurpose ||
          verifyRes.purpose ||
          verifyRes.paymentType ||
          verifyRes.type
      );

      // اولویت با نوع پرداخت اعلام‌شده از سمت سرور است.
      // اگر سرور نوع پرداخت را اعلام نکرده باشد، از زمینه رزرو استفاده می‌کنیم.
      const purpose =
        serverPurpose ||
        paramPurpose ||
        (verifyRes.reservationId || reservationId
          ? "RESERVATION"
          : "");

      const resultReservationId =
        verifyRes.reservationId || reservationId || "";

      // groupBookingId یک شناسه مستقل است و نباید به‌جای reservationId ارسال شود.
      const resultGroupBookingId =
        verifyRes.groupBookingId || "";

      const trackingCode =
        verifyRes.trackingCode ||
        verifyRes.refId ||
        verifyRes.transactionId ||
        "";

      const resultAmount =
        verifyRes.amount ??
        draftAmount ??
        "";

      const description =
        verifyRes.description ||
        verifyRes.paymentDescription ||
        (purpose === "WALLET_TOPUP"
          ? "افزایش موجودی کیف پول"
          : purpose === "RESERVATION"
          ? "پرداخت هزینه رزرو"
          : "");

      const walletBalance =
        verifyRes.wallet?.newBalance ??
        verifyRes.wallet?.walletBalance ??
        verifyRes.newBalance ??
        verifyRes.walletBalance;

      const paidAt =
        verifyRes.paidAt ||
        verifyRes.paymentDate ||
        verifyRes.verifiedAt ||
        "";

      bookingDraftStorage.clear();

      router.replace(
        buildSuccessUrl({
          purpose: purpose || "UNKNOWN",
          reservationId: resultReservationId,
          groupBookingId: resultGroupBookingId,
          paymentId,
          trackingCode,
          amount: resultAmount,
          paymentStatus: verifyRes.paymentStatus || verifyRes.paymentState || "PAID",
          description,
          paidAt,
          walletBalance,
          refId: verifyRes.refId,
          transactionId: verifyRes.transactionId,
        })
      );
    };

    (async () => {
      try {
        setStatusText("در حال تأیید تراکنش با درگاه بانکی...");

        // مسیر جدید: تأیید متمرکز با paymentId
        if (paymentId) {
          const verifyRes = await paymentService.verifyPayment(paymentId, {
            authority: authority || undefined,
            status: status || undefined,
          });

          const paymentState = String(
            verifyRes.paymentStatus || verifyRes.paymentState || ""
          ).toUpperCase();

          // فقط وضعیت قطعی PAID مجوز نمایش رسید موفق است.
          // success=true به‌تنهایی برای قطعی دانستن پرداخت کافی نیست.
          if (paymentState === "PAID") {
            redirectToSuccess(verifyRes);
            return;
          }

          if (
            paymentState === "PENDING" ||
            paymentState === "INITIATED"
          ) {
            router.replace(
              buildFailedUrl({
                status: "PENDING",
                reservationId,
                paymentId,
                purpose: paramPurpose,
                amount: verifyRes.amount ?? draftAmount,
                message:
                  verifyRes.message ||
                  "تراکنش در انتظار تأیید نهایی درگاه بانکی است.",
              })
            );
            return;
          }

          router.replace(
            buildFailedUrl({
              status: paymentState || "FAILED",
              reservationId,
              paymentId,
              purpose: paramPurpose,
              amount: verifyRes.amount ?? draftAmount,
              message:
                verifyRes.message ||
                "پرداخت ناموفق بود یا توسط بانک تأیید نشد.",
            })
          );
          return;
        }

        // مسیر قدیمی پرداخت رزرو
        if (gamingCenterId && reservationId) {
          const verifyRes = await paymentService.verifyPaymentRedirect({
            gamingCenterId,
            reservationId,
            authority: authority || undefined,
            status: status || undefined,
          });

          const paymentState = String(
            verifyRes.paymentStatus || verifyRes.paymentState || ""
          ).toUpperCase();

          if (paymentState === "PAID") {
            redirectToSuccess(verifyRes);
            return;
          }

          if (paymentState === "PENDING") {
            router.replace(
              buildFailedUrl({
                status: "PENDING",
                reservationId,
                paymentId,
                purpose: "RESERVATION",
                amount: verifyRes.amount ?? draftAmount,
                message:
                  verifyRes.message ||
                  "تراکنش در انتظار تأیید نهایی درگاه بانکی است.",
              })
            );
            return;
          }

          router.replace(
            buildFailedUrl({
              status: paymentState || "FAILED",
              reservationId,
              paymentId,
              purpose: "RESERVATION",
              amount: verifyRes.amount ?? draftAmount,
              message:
                verifyRes.message ||
                "پرداخت ناموفق بود یا توسط بانک تأیید نشد.",
            })
          );
          return;
        }
      } catch (error: unknown) {
        console.error("Payment verify error:", error);

        const errorMessage = getErrorMessage(error);

        // fallback فقط برای پرداخت‌های قدیمی رزرو
        if (gamingCenterId && reservationId) {
          try {
            const statusRes = await paymentService.getPaymentStatus(
              gamingCenterId,
              reservationId
            );

            if (
              String(statusRes.paymentState || "").toUpperCase() === "PAID"
            ) {
              redirectToSuccess(statusRes);
              return;
            }
          } catch {
            // در صورت شکست استعلام دوم، نتیجه نامشخص اعلام می‌شود.
          }
        }

        router.replace(
          buildFailedUrl({
            status: "UNKNOWN",
            reservationId,
            paymentId,
            purpose: paramPurpose,
            amount: draftAmount,
            message:
              errorMessage ||
              "امکان تعیین قطعی نتیجه پرداخت وجود ندارد.",
          })
        );
      }
    })();
  }, [router, searchParams]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center"
      dir="rtl"
    >
      {!errorText ? (
        <>
          <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />

          <h2 className="text-base font-bold text-[var(--text-white)]">
            {statusText}
          </h2>

          <p className="text-xs text-[var(--text-muted)]">
            لطفاً چند لحظه شکیبا باشید و صفحه را نبندید.
          </p>
        </>
      ) : (
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex items-center justify-center font-bold">
            !
          </div>

          <h2 className="text-sm font-bold text-[var(--text-white)]">
            {errorText}
          </h2>

          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="h-10 px-6 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold"
          >
            بازگشت به حساب کاربری
          </button>
        </div>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center"
          dir="rtl"
        >
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />

          <span className="text-xs text-[var(--text-muted)]">
            در حال بارگذاری اطلاعات پرداخت...
          </span>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}