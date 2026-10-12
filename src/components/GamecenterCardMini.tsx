import React from "react";
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(id)}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(id)}
      className="w-[187px] min-w-[187px] shrink-0 bg-[var(--bg-card)] rounded-3xl overflow-hidden cursor-pointer flex flex-col pb-3"
    >
      <div className="relative w-full h-[120px] bg-[var(--foreground)]">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        {discountPercent ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 h-6 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black flex items-center">
            {toPersianDigits(discountPercent)}٪
          </span>
        ) : null}
      </div>

      <div className="px-3 pt-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 text-xs text-[var(--primary)]">
          <span>({toPersianDigits(reviewsCount)} دیدگاه)</span>
          <span>{toPersianDigits(rating.toFixed(1))}</span>
        </div>
        <h4 className="text-base font-extrabold text-[var(--text-white)] line-clamp-1">{name}</h4>
        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{location}</p>
      </div>

      <div className="mx-3 mt-3 h-9 rounded-full bg-[var(--foreground)]/50 px-3 flex items-center justify-between text-[11px]">
        <span className="font-extrabold text-[var(--text-white)]">
          {formatPrice(hourlyPrice)} تومان
        </span>
        <span className="text-[var(--text-muted)]">/ {durationLabel}</span>
      </div>
    </div>
  );
};