"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits } from "@/lib/format";

export interface ReservationSummaryDetails {
  /** شناسه رزرو ساخته‌شده توسط Backend؛ برای ریدایرکت به صفحه جزئیات */
  reservationId?: string;
  gameCenterTitle?: string;
  dateStr?: string;
  dayName?: string;
  timeSlots?: string[];
  totalHours?: number;
  grandTotal?: number;
  devicesSummary?: string;
  /** فقط در صورتی که Backend کد قابل نمایش بدهد */
  trackingCode?: string;
}

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  details?: ReservationSummaryDetails | null;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  details,
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleViewDetails = () => {
    const target = details?.reservationId
      ? `/reservations/${encodeURIComponent(details.reservationId)}`
      : "/reservations";
    onClose();
    router.push(target);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col items-center text-center gap-5 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Success Check Icon */}
        <div className="w-16 h-16 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)] text-[var(--primary)] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,61,0.2)] animate-bounce">
          <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title & Message */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xl font-black text-[var(--text-white)]">
            پرداخت با موفقیت انجام شد
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            رزرو شما با موفقیت در سیستم ثبت گردید و پیامک تایید ارسال شد.
          </p>
        </div>

        {/* Reservation Receipt Card */}
        <div className="w-full bg-[var(--foreground)]/30 rounded-card p-4 border border-[var(--border-subtle)] flex flex-col gap-3 text-right text-xs">
          {details?.trackingCode && (
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <span className="text-[var(--text-muted)]">کد پیگیری رزرو:</span>
              <span className="font-mono font-black text-sm text-[var(--primary)]">
                {toPersianDigits(details.trackingCode)}
              </span>
            </div>
          )}

          {details?.gameCenterTitle && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">نام مجموعه:</span>
              <span className="font-bold text-[var(--text-white)]">{details.gameCenterTitle}</span>
            </div>
          )}

          {details?.devicesSummary && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">دستگاه‌ها:</span>
              <span className="font-bold text-[var(--text-white)] truncate max-w-[240px]">
                {details.devicesSummary}
              </span>
            </div>
          )}

          {details?.dateStr && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">زمان رزرو:</span>
              <span className="font-bold text-[var(--text-white)]">
                {details.dayName} ({details.dateStr})
              </span>
            </div>
          )}

          {details?.timeSlots && details.timeSlots.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">ساعات رزرو شده:</span>
              <span className="font-bold text-[var(--text-white)]">
                {details.timeSlots.join("، ")}
              </span>
            </div>
          )}

          {details?.grandTotal !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)] font-bold">مبلغ پرداخت شده:</span>
              <div className="flex items-center gap-1 font-black text-sm text-[var(--primary)]">
                <span>{formatPrice(details.grandTotal)}</span>
                <span className="text-[11px] font-normal text-[var(--text-white)]">تومان</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleViewDetails}
          className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
        >
          <span>مشاهده جزئیات رزرو</span>
        </button>
      </div>
    </div>
  );
};