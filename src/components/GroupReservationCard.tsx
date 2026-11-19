"use client";

import React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatReservationWhen } from "@/lib/reservationUi";
import type { GroupBookingItem } from "@/types/reservation";

interface GroupReservationCardProps {
  groupBooking: GroupBookingItem;
  onRate?: (groupBooking: GroupBookingItem) => void;
  isRated?: boolean;
}

export const GroupReservationCard: React.FC<GroupReservationCardProps> = ({
  groupBooking,
  onRate,
  isRated = false,
}) => {
  const targetId =
    groupBooking.groupBookingId || groupBooking.reservations[0]?.id;
  const alreadyRated =
    isRated ||
    groupBooking.reservations.some(
      (r) => r.isRated === true || r.canRate === false
    );
  const canRateNow =
    groupBooking.status === "COMPLETED" && !alreadyRated && Boolean(onRate);

  const firstRes = groupBooking.reservations[0];
  const deviceNames = groupBooking.reservations
    .map((r) => r.stationSnapshot?.name)
    .filter(Boolean)
    .join("، ");

  const cardContent = (
    <div className="p-4 flex flex-col gap-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card transition-colors hover:border-[var(--border-color)]">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <h3 className="text-card-title text-[var(--text-white)] truncate group-hover:text-[var(--primary)] transition-colors">
            {groupBooking.gamingCenterName ?? "گیمنت"}
          </h3>
          <Badge variant="neutral">
            {toPersianDigits(groupBooking.reservations.length)} دستگاه
          </Badge>
        </div>
        <StatusBadge status={groupBooking.status} />
      </div>

      {deviceNames && (
        <p className="text-secondary text-[var(--text-muted)] truncate">
          {deviceNames}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-2.5">
        {firstRes ? (
          <div className="flex items-center gap-2 text-secondary text-[var(--text-white)] min-w-0">
            <Icon name="clock" size={16} className="shrink-0 text-[var(--text-muted)]" />
            <span className="truncate">
              {formatReservationWhen(firstRes.startTime, firstRes.endTime)}
            </span>
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-col items-end shrink-0">
          <span className="text-secondary text-[var(--text-muted)]">مبلغ رزرو</span>
          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-card-title font-bold">
              {formatPrice(groupBooking.totalPrice)}
            </span>
            <span className="text-secondary text-[var(--text-muted)]">تومان</span>
          </div>
        </div>
      </div>

      {groupBooking.status === "COMPLETED" && (alreadyRated || canRateNow) && (
        <div className="flex items-center justify-end border-t border-[var(--border-subtle)] pt-2.5">
          {alreadyRated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)]">
              <Icon name="gamepad" size={13} />
              <span>امتیاز ثبت شد</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRate?.(groupBooking);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] hover:bg-[#D1FF78] px-3 py-1.5 text-[11px] font-extrabold text-[var(--text-on-primary)] transition-transform active:scale-95"
            >
              <Icon name="gamepad" size={14} />
              <span>ثبت امتیاز</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!targetId) {
    return cardContent;
  }

  return (
    <Link
      href={`/reservations/${encodeURIComponent(targetId)}`}
      className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {cardContent}
    </Link>
  );
};
