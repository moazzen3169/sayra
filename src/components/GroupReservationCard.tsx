
"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/Badge";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import { formatPrice, toPersianDigits } from "@/lib/format";

import {
  formatReservationWhen,
  stationImageFor,
} from "@/lib/reservationUi";
import { AppImage } from "@/components/common/AppImage";

import type { GroupBookingItem } from "@/types/reservation";

// =====================================================
// Group Reservation Card
// =====================================================

interface GroupReservationCardProps {
  groupBooking: GroupBookingItem;
}

export const GroupReservationCard: React.FC<
  GroupReservationCardProps
> = ({ groupBooking }) => {
  const router = useRouter();

  const [, setApi] = useState<CarouselApi>();

  const handleSetApi = useCallback((carouselApi: CarouselApi) => {
    setApi(carouselApi);
  }, []);

  // Navigate to reservation details.
  const handleCardClick = () => {
    const targetId =
      groupBooking.groupBookingId ||
      groupBooking.reservations[0]?.id;

    if (!targetId) return;

    router.push(
      `/reservations/${encodeURIComponent(targetId)}`
    );
  };

  // Carousel configuration.
  const carouselOptions = {
    direction: "rtl" as const,
    align: "start" as const,
    dragFree: true,
    containScroll: "trimSnaps" as const,
  };

  return (
    <article
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
      className="group relative p-4 desk:p-5 flex flex-col gap-4 bg-[var(--bg-card)]  lg:rounded-card transition-all duration-200 hover:border-[var(--border-color)] cursor-pointer active:scale-[0.995]"
    >
      {/* =========================================
          1. Header
      ========================================= */}

      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-[var(--text-white)] break-words leading-tight">
              {groupBooking.gamingCenterName ?? "گیم‌نت"}
            </h3>

            <Badge
              variant="neutral"
              className="bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30 text-[11px] px-2 py-0.5"
            >
              رزرو گروهی
            </Badge>
          </div>

          {groupBooking.gamingCenterAddress && (
            <p className="text-xs text-[var(--text-muted)] break-words leading-relaxed line-clamp-1">
              {groupBooking.gamingCenterAddress}
            </p>
          )}
        </div>

        <StatusBadge
          status={groupBooking.status}
          size="md"
        />
      </div>

      <div className="h-[1px] w-full bg-[var(--border-subtle)]" />

      {/* =========================================
          2. Reservation Information
      ========================================= */}

      <div className="flex items-center justify-between gap-3 bg-[var(--bg-body)]/60 rounded-child p-3 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="w-4 h-4 text-[var(--primary)] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-[var(--text-muted)]">
              تاریخ و ساعت رزرو
            </span>

            <span className="text-xs font-bold text-[var(--text-white)] break-words">
              {formatReservationWhen(
                groupBooking.startTime,
                groupBooking.endTime
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[11px] text-[var(--text-subtle)]">
            مبلغ کل گروهی
          </span>

          <div className="flex items-baseline gap-1 text-[var(--primary)]">
            <span className="text-base font-black">
              {formatPrice(groupBooking.totalPrice)}
            </span>

            <span className="text-xs font-normal text-[var(--text-muted)]">
              تومان
            </span>
          </div>
        </div>
      </div>

      {/* =========================================
          3. Selected Devices Carousel
      ========================================= */}

      <div
        className="flex flex-col gap-2 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >


        <Carousel
          opts={carouselOptions}
          setApi={handleSetApi}
          className="w-full relative"
        >
          {/* Navigation Buttons */}

          {groupBooking.devices.length > 2 && (
            <div
              className="hidden sm:flex items-center gap-1.5 absolute left-0 -top-8 z-20"
              dir="ltr"
            >

            </div>
          )}

          <CarouselContent className="-mr-2.5 -ml-2.5">
            {groupBooking.devices.map((device) => {
              const fallback = stationImageFor(
                device.stationType
              );

              const imgSrc =
                device.coverImageUrl || fallback;

              return (
                <CarouselItem
                  key={device.key}
                  className="basis-[42%] sm:basis-[32%] md:basis-[28%] pr-2.5 pl-2.5"
                >
                  <div className="relative rounded-card border border-[var(--border-subtle)] bg-[var(--bg-body)]/50 p-2.5 flex flex-col items-center gap-2 transition-colors hover:border-[var(--border-color)]">

                    {/* Device Quantity Badge */}

                    <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center rounded-full bg-[var(--primary)] text-on-primary text-[10px] font-black px-1.5 py-0.5 shadow-sm leading-none">
                      ×{toPersianDigits(device.count)}
                    </span>

                    {/* Device Image */}

                    <div className="w-full aspect-[4/3] rounded-child bg-[var(--foreground)]/40 border border-[var(--border-subtle)] flex items-center justify-center p-2 overflow-hidden">
                      <AppImage
                        src={imgSrc}
                        fallbackSrc={fallback}
                        alt={device.stationName}
                        className="w-full h-full object-contain"
                        objectFit="contain"
                      />
                    </div>

                    {/* Device Name */}

                    <span
                      title={device.stationName}
                      className="text-xs font-bold text-[var(--text-white)] text-center truncate w-full"
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

      {/* =========================================
          4. Footer
      ========================================= */}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]/70">
        <div />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="h-9 px-4 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-sm"
        >
          <span>مشاهده جزئیات رزرو</span>

          <svg
            className="w-3.5 h-3.5 transform rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </article>
  );
};
