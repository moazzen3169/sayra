import React from "react";
import Link from "next/link";
import { formatPrice, toPersianDigits } from "@/lib/format";

export interface GamecenterCardMiniProps {
  id: string;
  name: string;
  imageUrl: string;
  location: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  discountPercent?: number;
  durationLabel?: string;
  onClick?: (id: string) => void;
}

export const GamecenterCardMini: React.FC<GamecenterCardMiniProps> = ({
  id,
  name,
  imageUrl,
  location,
  rating,
  reviewsCount = 0,
  hourlyPrice,
  discountPercent,
  durationLabel = "1ساعته",
  onClick,
}) => {
  return (
    <Link
      href={`/gamecenter/${id}`}
      onClick={(e) => {
        if (onClick) {
          onClick(id);
        }
      }}
      className="w-[187px] min-w-[187px] lg:w-[220px] lg:min-w-[220px] shrink-0 bg-[var(--bg-card)] rounded-card overflow-hidden cursor-pointer flex flex-col pb-3 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all group"
    >
      <div className="relative w-full h-[120px] lg:h-[140px] bg-[var(--foreground)] overflow-hidden">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {discountPercent ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 pt-1 pb-0.5 rounded-full bg-[var(--primary)] text-on-primary text-xs font-bold flex items-center shadow-md">
            {toPersianDigits(discountPercent)}٪
          </span>
        ) : null}
      </div>

      <div className="px-3 pt-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 text-xs text-[var(--primary)] font-bold">
          <span>★ {toPersianDigits(rating.toFixed(1))}</span>
          <span className="text-[var(--text-muted)] font-normal">({toPersianDigits(reviewsCount)})</span>
        </div>
        <h4 className="text-base font-extrabold text-[var(--text-white)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">{name}</h4>
        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{location}</p>
      </div>

      <div className="mx-3 mt-3 h-9 rounded-full bg-[var(--foreground)]/50 px-3 flex items-center justify-between text-[11px]">
        <span className="font-extrabold text-[var(--text-white)]">
          {formatPrice(hourlyPrice)} تومان
        </span>
        <span className="text-[var(--text-muted)]">/ {durationLabel}</span>
      </div>
    </Link>
  );
};
