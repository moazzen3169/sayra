"use client";

import React, { useCallback, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatReservationWhen, getPaymentLabel, stationImageFor } from "@/lib/reservationUi";
import { AppImage } from "@/components/common/AppImage";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";

interface OwnerGroupReservationCardProps {
  groupBooking: OwnerGroupBookingItem;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onProposeTime: () => void;
  onViewDetails: () => void;
}

export const OwnerGroupReservationCard: React.FC<OwnerGroupReservationCardProps> = ({
  groupBooking,
  busy,
  onConfirm,
  onCancel,
  onProposeTime,
  onViewDetails,
}) => {
  const [, setApi] = useState<CarouselApi>();

  const handleSetApi = useCallback((carouselApi: CarouselApi) => {
    setApi(carouselApi);
  }, []);

  const carouselOptions = {
    direction: "rtl" as const,
    align: "start" as const,
    dragFree: true,
    containScroll: "trimSnaps" as const,
  };

  const btn = "h-9 px-3.5 rounded-card text-xs font-bold disabled:opacity-50 transition-all";

  return (
    <article className="p-4 sm:p-5 flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card transition-all duration-200 hover:border-[var(--border-color)]">
      {/* 1. Header */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[var(--text-white)] truncate">
              {groupBooking.gamingCenterName ?? "گیم‌نت"}
            </h3>
            <Badge
              variant="neutral"
              className="bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30 text-[10px] px-2 py-0.5"
            >
              رزرو گروهی ({toPersianDigits(groupBooking.reservations.length)} دستگاه)
            </Badge>
          </div>

          {(groupBooking.customerName || groupBooking.customerPhone) && (
            <p className="text-xs text-[var(--text-muted)] truncate">
              مشتری: {groupBooking.customerName ?? ""}{" "}
              {groupBooking.customerPhone ? `(${toPersianDigits(groupBooking.customerPhone)})` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full bg-[var(--bg-body)]">
            {getPaymentLabel(groupBooking.paymentState)}
          </span>
          <StatusBadge status={groupBooking.status} size="sm" />
        </div>
      </div>

      <div className="h-[1px] w-full bg-[var(--border-subtle)]" />

      {/* 2. Main Reservation Details */}
      <div className="flex items-center justify-between gap-3 bg-[var(--bg-body)]/60 rounded-card p-3 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-[var(--text-muted)]">زمان سانس</span>
            <span className="text-xs font-bold text-[var(--text-white)]">
              {formatReservationWhen(groupBooking.startTime, groupBooking.endTime)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[10px] text-[var(--text-muted)]">مبلغ کل گروهی</span>
          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-sm font-black">{formatPrice(groupBooking.totalPrice)}</span>
            <span className="text-[10px] text-[var(--text-muted)]">تومان</span>
          </div>
        </div>
      </div>

      {/* 3. Selected Devices Carousel */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[11px] font-bold text-[var(--text-muted)]">دستگاه‌های رزرو شده:</span>
        <Carousel opts={carouselOptions} setApi={handleSetApi} className="w-full relative">
          <CarouselContent className="-mr-2 -ml-2">
            {groupBooking.devices.map((device) => {
              const fallback = stationImageFor(device.stationType);
              const imgSrc = device.coverImageUrl || fallback;

              return (
                <CarouselItem
                  key={device.key}
                  className="basis-[45%] sm:basis-[30%] md:basis-[22%] pr-2 pl-2"
                >
                  <div className="relative rounded-card border border-[var(--border-subtle)] bg-[var(--bg-body)]/50 p-2 flex flex-col items-center gap-1.5 hover:border-[var(--border-color)]">
                    <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center rounded-full bg-[var(--primary)] text-on-primary text-[10px] font-black px-1.5 py-0.5 shadow-sm leading-none">
                      ×{toPersianDigits(device.count)}
                    </span>

                    <div className="w-full aspect-[4/3] rounded-child bg-[var(--foreground)]/40 border border-[var(--border-subtle)] flex items-center justify-center p-1.5 overflow-hidden">
                      <AppImage
                        src={imgSrc}
                        fallbackSrc={fallback}
                        alt={device.stationName}
                        className="w-full h-full object-contain"
                        objectFit="contain"
                      />
                    </div>

                    <span
                      title={device.stationName}
                      className="text-[11px] font-bold text-[var(--text-white)] text-center truncate w-full"
                    >
                      {device.stationName}
                    </span>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex flex-wrap gap-2">
          {groupBooking.status === "PENDING" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className={`${btn} bg-[var(--primary)] text-on-primary hover:opacity-90`}
              >
                تایید کل رزرو گروهی
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className={`${btn} bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25`}
              >
                لغو رزرو گروهی
              </button>
            </>
          )}

          {groupBooking.status === "CONFIRMED" && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className={`${btn} bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25`}
            >
              لغو رزرو گروهی
            </button>
          )}

          {(groupBooking.status === "PENDING" || groupBooking.status === "CONFIRMED") && (
            <button
              type="button"
              disabled={busy}
              onClick={onProposeTime}
              className={`${btn} border border-[var(--border-color)] text-[var(--text-white)] hover:border-[var(--primary)]`}
            >
              پیشنهاد زمان جدید
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onViewDetails}
          className={`${btn} bg-[var(--foreground)] text-[var(--text-white)] hover:bg-[var(--foreground)]/80`}
        >
          مشاهده جزئیات
        </button>
      </div>
    </article>
  );
};
