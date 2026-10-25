import React from "react";
import Link from "next/link";
import { DiscountedCenter } from "@/types/home";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatDiscountBadge } from "@/lib/discount";
import { formatDayLabel } from "@/lib/reservationUi";

export interface DiscountedGamecenterCardProps {
  center: DiscountedCenter;
  onClick?: (id: string) => void;
}

export const DiscountedGamecenterCard: React.FC<DiscountedGamecenterCardProps> = ({
  center,
  onClick,
}) => {
  const {
    id,
    name,
    imageUrl,
    location,
    rating,
    reviewsCount = 0,
    hourlyPrice,
    discountedHourlyPrice,
    discount,
  } = center;

  const endLabel = discount.endAt ? formatDayLabel(discount.endAt) : "";

  return (
    <Link
      href={`/gamecenter/${id}`}
      onClick={() => onClick?.(id)}
      className="w-full h-full flex flex-col pb-3 bg-[var(--bg-card)] rounded-card overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white select-none"
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[16/11] bg-[var(--foreground)] overflow-hidden shrink-0">
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge (Top-Left) */}
        <span className="absolute top-2.5 left-2.5 px-2.5 pt-1 pb-0.5 rounded-full bg-[var(--primary)] text-[#101014] font-black text-xs flex items-center shadow-md z-10">
          {formatDiscountBadge(discount.valueType, discount.value)}
        </span>

        {/* Optional End Date Chip (Bottom-Right) */}
        {endLabel ? (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[var(--bg-body)]/80 backdrop-blur-md text-white text-[10px] font-bold border border-white/10 z-10">
            تا {endLabel}
          </span>
        ) : null}
      </div>

      {/* Body Info */}
      <div className="px-3 pt-2.5 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1 text-xs text-[var(--primary)] font-bold">
          <span>★ {toPersianDigits(rating.toFixed(1))}</span>
          <span className="text-[var(--text-muted)] font-normal">
            ({toPersianDigits(reviewsCount)})
          </span>
        </div>

        <h4 className="text-sm font-extrabold text-[var(--text-white)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
          {name}
        </h4>

        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{location}</p>
      </div>

      {/* Price Pill */}
      <div className="mx-3 mt-auto h-9 rounded-full bg-[var(--foreground)]/50 px-3 flex items-center justify-between text-[11px]">
        {discountedHourlyPrice !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[var(--primary)]">
              {formatPrice(discountedHourlyPrice)} تومان
            </span>
            <span className="text-[10px] line-through text-[var(--text-subtle)] font-medium">
              {formatPrice(hourlyPrice)}
            </span>
          </div>
        ) : (
          <div className="font-extrabold text-[var(--text-white)]">
            <span className="text-[var(--text-muted)] font-normal ml-1">از</span>
            {formatPrice(hourlyPrice)} تومان
          </div>
        )}
        <span className="text-[var(--text-muted)]">/ ۱ساعته</span>
      </div>
    </Link>
  );
};
