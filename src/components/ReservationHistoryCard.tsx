"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatReservationWhen, mapsUrl, stationImageFor } from "@/lib/reservationUi";
import type { Reservation } from "@/types/reservation";

interface ReservationHistoryCardProps {
  reservation: Reservation;
  onRate?: (reservation: Reservation) => void;
}

export const ReservationHistoryCard: React.FC<ReservationHistoryCardProps> = ({ reservation, onRate }) => {
  const router = useRouter();
  const { status } = reservation;

  const isCompleted = status === "COMPLETED";
  const hasDetail = !isCompleted; // جزئیات فقط برای رزروهای غیر از «تکمیل شده»
  const showDirections =
    (status === "PENDING" || status === "CONFIRMED") && !!reservation.gamingCenterAddress;
  const showRate = isCompleted && reservation.canRate !== false && reservation.isRated !== true;

  const openDetail = () => {
    if (hasDetail) router.push(`/reservations/${encodeURIComponent(reservation.id)}`);
  };

  return (
    <article
      onClick={openDetail}
      role={hasDetail ? "link" : undefined}
      tabIndex={hasDetail ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && openDetail()}
      className={`px-4 py-5 flex flex-col gap-3.5 border-b border-[var(--border-color)] lg:rounded-[10px] lg:border lg:bg-[var(--bg-card)] lg:border-[var(--border-subtle)] lg:p-5 ${
        hasDetail ? "cursor-pointer active:bg-[var(--bg-card)]/50 transition-colors" : ""
      }`}
    >
      {/* Title + Status */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold text-[var(--text-white)] line-clamp-1">
          {reservation.gamingCenterName ?? "گیمنت"}
        </h3>
        <StatusBadge status={status} />
      </div>

      {reservation.gamingCenterAddress && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{reservation.gamingCenterAddress}</p>
      )}

      {/* Station + Price */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-card bg-[var(--text-white)] flex items-center justify-center overflow-hidden">
            <img
              src={stationImageFor(reservation.stationSnapshot?.stationType)}
              alt={reservation.stationSnapshot?.name ?? "ایستگاه"}
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="text-sm text-[var(--text-white)] truncate">
            {reservation.stationSnapshot?.name ?? ""}
          </span>
        </div>

        <div className="flex items-baseline gap-1 shrink-0 text-[var(--text-white)]">
          <span className="text-base font-black">{formatPrice(reservation.totalPrice)}</span>
          <span className="text-xs">تومان</span>
        </div>
      </div>

      {/* When */}
      <p className="text-sm font-extrabold text-[var(--text-white)]">
        {formatReservationWhen(reservation.startTime, reservation.endTime)}
      </p>

      {/* Code + Action */}
      {(reservation.reservationCode || showDirections || showRate) && (
        <div className="flex items-stretch gap-3">
          {reservation.reservationCode && (
            <div
              className={`h-12 rounded-card bg-[var(--foreground)] flex items-center justify-center gap-2 text-sm text-[var(--text-white)] ${
                showDirections || showRate ? "basis-[45%]" : "w-full"
              }`}
            >
              <span>کد رزرو :</span>
              <span className="font-bold">{toPersianDigits(reservation.reservationCode)}</span>
            </div>
          )}

          {showDirections && (
            <a
              href={mapsUrl(reservation.gamingCenterAddress!)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-12 rounded-card bg-[var(--text-white)] text-[var(--bg-body)] text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 016 6v5" />
              </svg>
              <span>مسیر یابی</span>
            </a>
          )}

          {showRate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRate?.(reservation);
              }}
              className="flex-1 h-12 rounded-card bg-[var(--accent-star)] text-[#101014] text-sm font-black active:scale-[0.98] transition-transform"
            >
              افزودن نظر
            </button>
          )}
        </div>
      )}
    </article>
  );
};