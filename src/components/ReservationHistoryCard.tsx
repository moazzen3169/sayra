"use client";

import React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ReservationCodeStrip } from "@/components/ReservationCodeStrip";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { formatReservationWhen, stationImageFor } from "@/lib/reservationUi";
import { AppImage } from "@/components/common/AppImage";
import type { Reservation } from "@/types/reservation";

interface ReservationHistoryCardProps {
  reservation: Reservation;
  onRate?: (reservation: Reservation) => void;
  isRated?: boolean;
}

export const ReservationHistoryCard: React.FC<ReservationHistoryCardProps> = ({
  reservation,
  onRate,
  isRated = false,
}) => {
  const { status } = reservation;
  const trackingCode =
    reservation.checkInCode ||
    reservation.reservationCode ||
    reservation.groupBooking?.trackingCode;
  const alreadyRated =
    isRated || reservation.isRated === true || reservation.canRate === false;
  const canRateNow = status === "COMPLETED" && !alreadyRated && Boolean(onRate);

  return (
    <Link
      href={`/reservations/${encodeURIComponent(reservation.id)}`}
      className="group p-4 flex flex-col gap-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card transition-colors hover:border-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <h3 className="text-card-title text-[var(--text-white)] truncate group-hover:text-[var(--primary)] transition-colors">
          {reservation.gamingCenterName ?? "گیمنت"}
        </h3>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] flex items-center justify-center p-1.5 overflow-hidden">
            <AppImage
              src={stationImageFor(reservation.stationSnapshot?.stationType)}
              fallbackSrc={stationImageFor(reservation.stationSnapshot?.stationType)}
              alt={reservation.stationSnapshot?.name ?? "دستگاه"}
              className="w-full h-full object-contain"
              objectFit="contain"
            />
          </div>
          <span className="text-body-emphasis text-[var(--text-white)] truncate">
            {reservation.stationSnapshot?.name ?? "دستگاه"}
          </span>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-secondary text-[var(--text-muted)]">مبلغ رزرو</span>
          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-card-title font-bold">
              {formatPrice(reservation.totalPrice)}
            </span>
            <span className="text-secondary text-[var(--text-muted)]">تومان</span>
          </div>
        </div>
      </div>

      <ReservationCodeStrip code={trackingCode} compact />

      <div className="flex items-center justify-between gap-2 text-secondary text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="clock" size={16} className="shrink-0" />
          <span className="truncate text-[var(--text-white)]">
            {formatReservationWhen(reservation.startTime, reservation.endTime)}
          </span>
        </div>

        {status === "COMPLETED" && alreadyRated && (
          <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)]">
            <Icon name="gamepad" size={13} />
            <span>امتیاز ثبت شد</span>
          </span>
        )}

        {canRateNow && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRate?.(reservation);
            }}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-[var(--primary)] hover:bg-[#D1FF78] px-3 py-1.5 text-[11px] font-extrabold text-[var(--text-on-primary)] transition-transform active:scale-95"
          >
            <Icon name="gamepad" size={14} />
            <span>ثبت امتیاز</span>
          </button>
        )}
      </div>
    </Link>
  );
};
