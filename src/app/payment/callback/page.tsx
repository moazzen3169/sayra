"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { paymentService } from "@/services/paymentService";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";
import { getErrorMessage } from "@/lib/reservationUi";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusText, setStatusText] = useState("در حال تأیید تراکنش و بررسی نتیجه پرداخت...");
  const [errorText, setErrorText] = useState<string | null>(null);

  // جلوگیری از ارسال چندباره verify با یک Authority
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
    const paramReservationId =
      searchParams.get("reservationId") ||
      searchParams.get("orderId") ||
      "";
    const paramGamingCenterId =
      searchParams.get("gamingCenterId") ||
      searchParams.get("centerId") ||
      "";

    const draft = bookingDraftStorage.get();
    const reservationId = paramReservationId || draft?.reservationId;
    const gamingCenterId = paramGamingCenterId || draft?.gamingCenterId;

    // اگر کاربر درگاه را لغو کرده (مثلاً Status === 'NOK')
    if (status && status.toUpperCase() === "NOK") {
      router.replace(
        `/payment/failed?status=CANCELLED&reservationId=${encodeURIComponent(
          reservationId || ""
        )}&message=${encodeURIComponent("پرداخت توسط کاربر لغو گردید.")}`
      );
      return;
    }

    if (!reservationId || !gamingCenterId) {
      // اگر اطلاعات شناسایی رزرو پیدا نشد
      setErrorText("اطلاعات رزرو جهت تأیید تراکنش یافت نشد.");
      return;
    }

    (async () => {
      try {
        setStatusText("در حال تأیید تراکنش با درگاه بانکی...");

        // فراخوانی متد رسمی GET /gamingCenters/{id}/reservation/{id}/payments/verify طبق OpenAPI
        const verifyRes = await paymentService.verifyPaymentRedirect({
          gamingCenterId,
          reservationId,
          authority: authority || undefined,
          status: status || undefined,
        });

        const paymentState = (verifyRes.paymentState || "PAID").toUpperCase();

        if (paymentState === "PAID") {
          // پاک کردن درفت موقت
          bookingDraftStorage.clear();
          const trk = verifyRes.trackingCode || verifyRes.transactionId || verifyRes.refId || "";
          router.replace(
            `/payment/success?reservationId=${encodeURIComponent(
              reservationId
            )}&trackingCode=${encodeURIComponent(trk)}&amount=${encodeURIComponent(
              String(verifyRes.amount || draft?.grandTotal || "")
            )}`
          );
        } else if (paymentState === "PENDING") {
          router.replace(
            `/payment/failed?status=PENDING&reservationId=${encodeURIComponent(
              reservationId
            )}&message=${encodeURIComponent(
              "تراکنش در انتظار تایید نهایی درگاه بانکی است."
            )}`
          );
        } else {
          router.replace(
            `/payment/failed?status=${paymentState}&reservationId=${encodeURIComponent(
              reservationId
            )}&message=${encodeURIComponent(
              verifyRes.message || "پرداخت ناموفق بود یا توسط بانک تایید نشد."
            )}`
          );
        }
      } catch (err: any) {
        console.error("Payment verify error:", err);
        const errMessage = getErrorMessage(err);

        // استعلام مجدد وضعیت از طریق status endpoint
        try {
          const statusRes = await paymentService.getPaymentStatus(
            gamingCenterId,
            reservationId
          );
          if (statusRes.paymentState === "PAID") {
            bookingDraftStorage.clear();
            router.replace(
              `/payment/success?reservationId=${encodeURIComponent(
                reservationId
              )}&trackingCode=${encodeURIComponent(
                statusRes.trackingCode || ""
              )}&amount=${encodeURIComponent(String(statusRes.amount || ""))}`
            );
            return;
          }
        } catch {
          // ignore status fallback failure
        }

        router.replace(
          `/payment/failed?status=UNKNOWN&reservationId=${encodeURIComponent(
            reservationId
          )}&message=${encodeURIComponent(
            errMessage || "عدم امکان تعیین قطعی نتیجه پرداخت"
          )}`
        );
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center" dir="rtl">
      {!errorText ? (
        <>
          <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          <h2 className="text-base font-bold text-[var(--text-white)]">{statusText}</h2>
          <p className="text-xs text-[var(--text-muted)]">لطفاً چند لحظه شکیبا باشید و صفحه را نبندید.</p>
        </>
      ) : (
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex items-center justify-center font-bold">
            !
          </div>
          <h2 className="text-sm font-bold text-[var(--text-white)]">{errorText}</h2>
          <button
            type="button"
            onClick={() => router.push("/reservations")}
            className="h-10 px-6 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold"
          >
            مشاهده رزروهای من
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center" dir="rtl">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span className="text-xs text-[var(--text-muted)]">در حال بارگذاری اطلاعات پرداخت...</span>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
