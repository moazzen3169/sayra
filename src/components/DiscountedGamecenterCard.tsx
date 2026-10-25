import React from "react";
import Link from "next/link";
import { DiscountedCenter } from "@/types/home";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatDiscountBadge } from "@/lib/discount";
import { formatDayLabel } from "@/lib/reservationUi";

export interface DiscountedGamecenterCardProps {
  center: DiscountedCenter;
  className?: string;
  onClick?: () => void;
}

export const DiscountedGamecenterCard: React.FC<DiscountedGamecenterCardProps> = ({
  center,
  className = "",
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

  return (
    <Link
      href={`/gamecenter/${id}`}
      onClick={onClick}
      className={`w-full h-full flex flex-col bg-[var(--bg-card)] rounded-card overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-white outline-none transition-all group ${className}`}
    >
      {/* Image container */}
      <div className="relative w-full aspect-[16/11] bg-[var(--foreground)] overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge - top left */}
        <span className="absolute top-2.5 left-2.5 z-10 px-2.5 pt-1 pb-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black flex items-center shadow-md">
          {formatDiscountBadge(discount.valueType, discount.value)}
        </span>

        {/* End Date Chip - bottom right */}
        {discount.endAt && (
          <span className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[var(--text-white)] text-[10px] font-medium flex items-center">
            تا {formatDayLabel(discount.endAt)}
          </span>
        )}
      </div>

      {/* Content body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-xs text-[var(--primary)] font-bold">
            <span>★ {toPersianDigits(rating.toFixed(1))}</span>
            <span className="text-[var(--text-muted)] font-normal">
              ({toPersianDigits(reviewsCount)})
            </span>
          </div>

          <h3 className="text-sm font-extrabold text-[var(--text-white)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
            {name}
          </h3>

          <p className="text-xs text-[var(--text-muted)] line-clamp-1">{location}</p>
        </div>

        {/* Price Pill */}
        <div className="mt-2 h-9 rounded-full bg-[var(--foreground)]/50 px-3 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            {discountedHourlyPrice !== undefined ? (
              <>
                <span className="font-extrabold text-[var(--primary)] text-xs">
                  {formatPrice(discountedHourlyPrice)} تومان
                </span>
                <span className="line-through text-[var(--text-subtle)] text-[10px]">
                  {formatPrice(hourlyPrice)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[var(--text-muted)] font-normal">از</span>
                <span className="font-extrabold text-[var(--text-white)] text-xs">
                  {formatPrice(hourlyPrice)} تومان
                </span>
              </>
            )}
          </div>
          <span className="text-[var(--text-muted)] font-normal">/ ۱ساعته</span>
        </div>
      </div>
    </Link>
  );
};
