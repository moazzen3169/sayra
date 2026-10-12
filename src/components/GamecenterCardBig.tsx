import React from "react";
import { formatPrice, toPersianDigits } from "@/lib/format";

export interface GamecenterCardBigProps {
  id: string;
  name: string;
  imageUrl: string;
  /** آدرس / توضیح کوتاه */
  location: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  /** درصد تخفیف از Backend؛ اگر نبود نشان نمایش داده نمی‌شود */
  discountPercent?: number;
  durationLabel?: string;
  onClick?: (id: string) => void;
}

export const GamecenterCardBig: React.FC<GamecenterCardBigProps> = ({
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
      className="w-full bg-[var(--bg-card)] rounded-3xl overflow-hidden cursor-pointer flex flex-col pb-4"
    >
      {/* Image */}
      <div className="relative w-full aspect-[5/3] bg-[var(--foreground)]">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        {discountPercent ? (
          <span className="absolute top-3 left-3 px-3 h-7 rounded-full bg-[var(--primary)] text-[#101014] text-sm font-black flex items-center">
            {toPersianDigits(discountPercent)}٪
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="px-4 pt-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-sm text-[var(--primary)]">
          <span>({toPersianDigits(reviewsCount)} دیدگاه)</span>
          <span>{toPersianDigits(rating.toFixed(1))}</span>
        </div>

        <h3 className="text-lg font-extrabold text-[var(--text-white)] line-clamp-1">{name}</h3>

        <p className="text-sm text-[var(--text-muted)] line-clamp-1">{location}</p>
      </div>

      {/* Price pill */}
      <div className="mx-4 mt-4 h-11 rounded-full bg-[var(--foreground)]/50 px-4 flex items-center justify-between text-sm">
        <span className="font-extrabold text-[var(--text-white)]">
          {formatPrice(hourlyPrice)} <span className="font-bold">تومان</span>
        </span>
        <span className="text-[var(--text-muted)]">/ {durationLabel}</span>
      </div>
    </div>
  );
};