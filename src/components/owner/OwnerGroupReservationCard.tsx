"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { formatPrice, toPersianDigits } from "@/lib/format";
import {
  formatReservationWhen,
  getPaymentLabel,
  stationImageFor,
} from "@/lib/reservationUi";
import { AppImage } from "@/components/common/AppImage";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";

interface OwnerGroupReservationCardProps {
  groupBooking: OwnerGroupBookingItem;
  busy: boolean;
  detailsHref: string;
  onConfirm: () => void;
  onCancel: () => void;
  onProposeTime: () => void;
}

export const OwnerGroupReservationCard: React.FC<
  OwnerGroupReservationCardProps
> = ({
  groupBooking,
  busy,
  detailsHref,
  onConfirm,
  onCancel,
  onProposeTime,
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

  const canManageStatus =
    groupBooking.status === "PENDING" || groupBooking.status === "CONFIRMED";

  const trackingLabel = groupBooking.checkInCode || groupBooking.reservationCode;

  return (
    <article className="p-4 sm:p-5 flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card transition-colors duration-200 hover:border-[var(--border-color)]">
      {/* 1. Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 min-w-0">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary-muted)] text-[var(--primary)] text-xs font-bold">
              <Icon name="gamepad" size={14} />
              <span>رزرو گروهی ({toPersianDigits(groupBooking.reservations.length)} دستگاه)</span>
            </span>
            {trackingLabel && (
              <span className="px-2.5 py-1 rounded-full bg-[var(--foreground)]/60 text-xs font-bold text-[var(--text-white)] font-mono">
                کد: {toPersianDigits(trackingLabel)}
              </span>
            )}
          </div>

          {(groupBooking.customerName || groupBooking.customerPhone) && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] truncate">
              <Icon name="user" size={14} className="shrink-0" />
              <span className="text-[var(--text-white)] font-medium truncate">
                {groupBooking.customerName || "مشتری"}
              </span>
              {groupBooking.customerPhone && (
                <span dir="ltr" className="text-[var(--text-muted)]">
                  ({toPersianDigits(groupBooking.customerPhone)})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-xs font-medium text-[var(--text-muted)] px-2.5 py-1 rounded-full bg-[var(--foreground)]/40">
            {getPaymentLabel(groupBooking.paymentState)}
          </span>
          <StatusBadge status={groupBooking.status} size="sm" />
        </div>
      </div>

      {/* 2. Key Time & Price Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-body)]/60 rounded-card p-3 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="clock" size={16} className="text-[var(--text-muted)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[var(--text-muted)]">زمان سانس</span>
            <span className="text-sm font-bold text-[var(--text-white)]">
              {formatReservationWhen(groupBooking.startTime, groupBooking.endTime)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs text-[var(--text-muted)]">مبلغ کل گروهی</span>
          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-base font-black">
              {formatPrice(groupBooking.totalPrice)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">تومان</span>
          </div>
        </div>
      </div>

      {/* 3. Selected Devices Carousel */}
      <div className="flex flex-col gap-2 min-w-0">
        <span className="text-xs font-bold text-[var(--text-muted)]">
          دستگاه‌های رزروشده
        </span>
        <Carousel
          opts={carouselOptions}
          setApi={handleSetApi}
          className="w-full relative"
        >
          <CarouselContent className="-mr-2 -ml-2">
            {groupBooking.devices.map((device) => {
              const fallback = stationImageFor(device.stationType);
              const imgSrc = device.coverImageUrl || fallback;

              return (
                <CarouselItem
                  key={device.key}
                  className="basis-[45%] sm:basis-[30%] md:basis-[22%] pr-2 pl-2"
                >
                  <div className="relative flex flex-col items-center gap-1 rounded-child bg-[var(--bg-body)]/40 border border-[var(--border-subtle)] p-2">
                    <div className="w-full aspect-square flex items-center justify-center p-1 overflow-hidden">
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
                      className="text-xs font-bold text-[var(--text-white)] text-center truncate w-full"
                    >
                      {device.stationName}
                      {device.count > 1 ? ` × ${toPersianDigits(device.count)}` : ""}
                    </span>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex flex-wrap gap-2">
          {groupBooking.status === "PENDING" && (
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

          {canManageStatus && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={onProposeTime}
              >
                <Icon name="calendar" size={16} />
                <span>پیشنهاد تاریخ جدید</span>
              </Button>
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
            </>
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
