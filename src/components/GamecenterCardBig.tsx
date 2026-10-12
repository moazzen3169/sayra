import React from "react";
import Link from "next/link";
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
    <Link
      href={`/gamecenter/${id}`}
      onClick={(e) => {
        if (onClick) {
          onClick(id);
        }
      }}
      className="w-full bg-[var(--bg-card)] rounded-card overflow-hidden cursor-pointer flex flex-col pb-4 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all group shadow-md"
    >
      {/* Image */}
      <div className="relative w-full aspect-[16/9] bg-[var(--foreground)] overflow-hidden">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {discountPercent ? (
          <span className="absolute top-3 left-3 px-3 pt-1 pb-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black flex items-center shadow-lg">
            {toPersianDigits(discountPercent)}٪ تخفیف
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="px-4 pt-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-bold">
          <span>★ {toPersianDigits(rating.toFixed(1))}</span>
          <span className="text-[var(--text-muted)]">({toPersianDigits(reviewsCount)} دیدگاه)</span>
        </div>

        <h3 className="text-base font-extrabold text-[var(--text-white)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">{name}</h3>

        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{location}</p>
      </div>

      {/* Price pill */}
      <div className="mx-4 mt-3 h-10 rounded-full bg-[var(--foreground)]/50 px-4 flex items-center justify-between text-xs">
        <span className="font-extrabold text-[var(--text-white)]">
          {formatPrice(hourlyPrice)} <span className="font-bold">تومان</span>
        </span>
        <span className="text-[var(--text-muted)]">/ {durationLabel}</span>
      </div>
    </Link>
  );
};
