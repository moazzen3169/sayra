"use client";

import React, { useState } from "react";
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
  const [copied, setCopied] = useState(false);
  const { status } = reservation;

  const showDirections =
    (status === "PENDING" || status === "CONFIRMED") && !!reservation.gamingCenterAddress;
  const showRate = status === "COMPLETED" && reservation.canRate !== false && reservation.isRated !== true;

  const handleCardClick = () => {
    router.push(`/reservations/${encodeURIComponent(reservation.id)}`);
  };

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reservation.reservationCode) return;
    try {
      await navigator.clipboard.writeText(reservation.reservationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <article
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      className="group relative p-4 desk:p-5 flex flex-col gap-3.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card transition-all duration-200 hover:border-[var(--border-color)] cursor-pointer active:scale-[0.995]"
    >
      {/* Top Header: Gaming Center Name + Status Badge */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-base font-extrabold text-[var(--text-white)] break-words leading-tight">
            {reservation.gamingCenterName ?? "گیمنت"}
          </h3>
          {reservation.gamingCenterAddress && (
            <p className="text-xs text-[var(--text-muted)] break-words leading-relaxed line-clamp-1">
              {reservation.gamingCenterAddress}
            </p>
          )}
        </div>
        <StatusBadge status={status} size="md" />
      </div>

      <div className="h-[1px] w-full bg-[var(--border-subtle)]" />

      {/* Middle Section: Station Info + Price */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] flex items-center justify-center p-1.5 overflow-hidden">
            <img
              src={stationImageFor(reservation.stationSnapshot?.stationType)}
              alt={reservation.stationSnapshot?.name ?? "ایستگاه"}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-[var(--text-white)] break-words">
              {reservation.stationSnapshot?.name ?? "ایستگاه گیمینگ"}
            </span>
            {reservation.stationSnapshot?.stationType && (
              <span className="text-[11px] text-[var(--text-subtle)]">
                {reservation.stationSnapshot.stationType}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[11px] text-[var(--text-subtle)]">مبلغ رزرو</span>
          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-base font-black">{formatPrice(reservation.totalPrice)}</span>
            <span className="text-[11px] font-normal text-[var(--text-muted)]">تومان</span>
          </div>
        </div>
      </div>

      {/* Time & Date Info */}
      <div className="flex items-center justify-between gap-2 bg-[var(--bg-body)]/60 rounded-child px-3 py-2 text-xs border border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)] shrink-0">
          <svg className="w-3.5 h-3.5 text-[var(--text-subtle)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold text-[var(--text-white)]">زمان رزرو:</span>
        </div>
        <span className="font-extrabold text-[var(--text-white)] text-left break-words min-w-0">
          {formatReservationWhen(reservation.startTime, reservation.endTime)}
        </span>
      </div>

      {/* Footer Actions / Code */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]/60">
        {reservation.reservationCode ? (
          <button
            type="button"
            onClick={handleCopyCode}
            title="کپی کد رزرو"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-child bg-[var(--foreground)]/60 hover:bg-[var(--foreground)] text-xs text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors"
          >
            <span>کد رزرو:</span>
            <span className="font-black text-[var(--text-white)] font-mono">{toPersianDigits(reservation.reservationCode)}</span>
            <span className="text-[10px] text-[var(--primary)] font-bold mr-0.5">
              {copied ? "کپی شد ✓" : "📋"}
            </span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 mr-auto" onClick={(e) => e.stopPropagation()}>
          {showDirections && (
            <a
              href={mapsUrl(reservation.gamingCenterAddress!)}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-child bg-[var(--foreground)] hover:bg-[var(--border-color)] text-[var(--text-white)] text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 016 6v5" />
              </svg>
              <span>مسیریابی</span>
            </a>
          )}

          {showRate && (
            <button
              type="button"
              onClick={() => onRate?.(reservation)}
              className="h-8 px-3 rounded-child bg-[var(--accent-star)] hover:bg-[var(--accent-star)]/90 text-[#101014] text-xs font-black transition-transform active:scale-95"
            >
              ثبت نظر
            </button>
          )}

          <span className="text-xs font-bold text-[var(--primary)] group-hover:underline flex items-center gap-1">
            جزئیات
            <svg className="w-3.5 h-3.5 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
};
