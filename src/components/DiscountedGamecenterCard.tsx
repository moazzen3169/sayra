import React from "react";
import Link from "next/link";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatDiscountBadge } from "@/lib/discount";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

export interface GamecenterCardData {
  id: string;
  name: string;
  imageUrl: string;
  location: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  discountedHourlyPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  discount?: {
    valueType: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    endAt?: string;
  };
}

export interface DiscountedGamecenterCardProps {
  center: GamecenterCardData;
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
    discountPercent,
    discountAmount,
    discount,
  } = center;

  // قیمت تخفیف‌دار فقط از Backend پذیرفته می‌شود (بدون محاسبه در کلاینت)
  const hasDiscount = Boolean(
    discountedHourlyPrice !== undefined &&
      hourlyPrice > 0 &&
      discountedHourlyPrice < hourlyPrice
  );

  const discountBadgeText = hasDiscount
    ? discount
      ? formatDiscountBadge(discount.valueType, discount.value)
      : discountAmount && discountAmount > 0
      ? formatDiscountBadge("FIXED_AMOUNT", discountAmount)
      : discountPercent
      ? `${toPersianDigits(discountPercent)}٪`
      : "تخفیف"
    : null;

  return (
    <Link
      href={`/gamecenter/${id}`}
      onClick={() => onClick?.(id)}
      className="w-full h-full flex flex-col bg-[var(--bg-card)] rounded-card overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white select-none"
    >
      <div className="relative w-full aspect-[16/11] bg-[var(--foreground)] overflow-hidden shrink-0">
        <SafeImage
          src={imageUrl}
          alt={name}
          loading="lazy"
          fallbackSrc={PLACEHOLDERS.center}
          draggable={false}
          className="w-full h-full object-cover"
        />

        {discountBadgeText && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Badge variant="primary">{discountBadgeText}</Badge>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h4 className="text-card-title text-[var(--text-white)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
          {name}
        </h4>

        <div className="flex items-center gap-2 text-secondary text-[var(--text-muted)] min-w-0">
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[var(--text-white)] font-bold">
              <Icon
                name="star"
                size={16}
                filled
                className="text-[var(--accent-star)]"
              />
              <span>{toPersianDigits(rating.toFixed(1))}</span>
              {reviewsCount > 0 && (
                <span className="text-[var(--text-muted)] font-normal">
                  ({toPersianDigits(reviewsCount)})
                </span>
              )}
            </span>
          )}
          <span className="truncate">{location}</span>
        </div>

        <div
          className="mt-auto pt-1 flex items-baseline gap-1.5 text-xs"
          aria-label="قیمت ساعتی"
          title="قیمت ساعتی"
        >
          {hasDiscount && discountedHourlyPrice !== undefined ? (
            <>
              <span className="text-card-title text-[var(--primary)]">
                از {formatPrice(discountedHourlyPrice)} تومان
              </span>
              <span className="text-secondary line-through text-[var(--text-muted)]">
                {formatPrice(hourlyPrice)}
              </span>
            </>
          ) : (
            <span className="text-card-title text-[var(--text-white)]">
              از {formatPrice(hourlyPrice)} تومان
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
