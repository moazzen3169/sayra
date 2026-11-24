"use client";

import React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPrice, toPersianDigits } from "@/lib/format";
import {
  formatReservationWhen,
  getPaymentLabel,
  getStationTypeLabel,
} from "@/lib/reservationUi";
import type { OwnerReservation } from "@/types/owner";

export type OwnerSessionAction = "start" | "stop";

interface OwnerSingleReservationCardProps {
  reservation: OwnerReservation;
  busy: boolean;
  detailsHref: string;
  onConfirm: () => void;
  onCancel: () => void;
  onSessionAction: (action: OwnerSessionAction) => void;
}

export const OwnerSingleReservationCard: React.FC<
  OwnerSingleReservationCardProps
> = ({
  reservation,
  busy,
  detailsHref,
  onConfirm,
  onCancel,
  onSessionAction,
}) => {
  const customerName =
    reservation.customer?.fullName ??
    reservation.user?.fullName ??
    reservation.customerName;
  const customerPhone =
    reservation.customer?.phone ??
    reservation.user?.phone ??
    reservation.customerPhone;
  const stationName =
    reservation.stationSnapshot?.name ??
    reservation.station?.name ??
    "ایستگاه بازی";
  const stationType =
    reservation.stationSnapshot?.stationType ?? reservation.station?.stationType;
  const trackingCode = reservation.checkInCode || reservation.reservationCode;
  const canManageStatus =
    reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  return (
    <article className="p-4 sm:p-5 flex flex-col gap-3.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card transition-colors duration-200 hover:border-[var(--border-color)]">
      {/* 1. Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-card-title text-[var(--text-white)] truncate">
              {stationName}
            </h3>
            {stationType && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--foreground)]/50 text-xs text-[var(--text-muted)]">
                {getStationTypeLabel(stationType)}
              </span>
            )}
            {trackingCode && (
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--foreground)]/70 text-xs font-bold text-[var(--text-white)] font-mono">
                کد: {toPersianDigits(trackingCode)}
              </span>
            )}
          </div>

          {(customerName || customerPhone) && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] truncate">
              <Icon name="user" size={14} className="shrink-0" />
              <span className="text-[var(--text-white)] font-medium truncate">
                {customerName || "مشتری"}
              </span>
              {customerPhone && (
                <span dir="ltr" className="text-[var(--text-muted)]">
                  ({toPersianDigits(customerPhone)})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-xs font-medium text-[var(--text-muted)] px-2.5 py-1 rounded-full bg-[var(--foreground)]/40">
            {getPaymentLabel(reservation.paymentState)}
          </span>
          <StatusBadge status={reservation.status} size="sm" />
        </div>
      </div>

      {/* 2. Time & Price Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-body)]/60 rounded-card p-3 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="clock" size={16} className="text-[var(--text-muted)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[var(--text-muted)]">
              زمان سانس ({toPersianDigits(reservation.totalHours)} ساعت)
            </span>
            <span className="text-sm font-bold text-[var(--text-white)]">
              {formatReservationWhen(reservation.startTime, reservation.endTime)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs text-[var(--text-muted)]">مبلغ کل</span>
          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-base font-black">
              {formatPrice(reservation.totalPrice)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">تومان</span>
          </div>
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex flex-wrap gap-2">
          {reservation.status === "PENDING" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={onConfirm}
            >
              <Icon name="check" size={16} />
              <span>تایید رزرو</span>
            </Button>
          )}

          {reservation.status === "CONFIRMED" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={busy}
              disabled={busy}
              onClick={() => onSessionAction("start")}
            >
              <Icon name="clock" size={16} />
              <span>شروع سانس</span>
            </Button>
          )}

          {canManageStatus && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={onCancel}
            >
              <Icon name="close" size={16} />
              <span>لغو رزرو</span>
            </Button>
          )}

          {reservation.status === "IN_PROGRESS" && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={busy}
              disabled={busy}
              onClick={() => onSessionAction("stop")}
            >
              پایان سانس
            </Button>
          )}
        </div>

        <Link
          href={detailsHref}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-card bg-[var(--foreground)] px-3.5 text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80 transition-colors"
        >
          <span>مشاهده جزئیات</span>
          <Icon name="arrow-left" size={15} />
        </Link>
      </div>
    </article>
  );
};
