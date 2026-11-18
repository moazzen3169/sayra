"use client";

import React, { useState } from "react";
import { toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

interface GamecenterInfoCardProps {
  title: string;
  address?: string;
  rating: { avg: number; count: number } | null;
  onScrollTo?: (id: string) => void;
}

export const GamecenterInfoCard: React.FC<GamecenterInfoCardProps> = ({
  title,
  address,
  rating,
  onScrollTo,
}) => {
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-section-title text-[var(--text-white)] truncate min-w-0 flex-1">
          {title}
        </h1>

        {rating && (
          <button
            type="button"
            onClick={() => onScrollTo?.("reviews")}
            aria-label={`امتیاز ${toPersianDigits(rating.avg.toFixed(1))} از ${toPersianDigits(rating.count)} نظر`}
            className="shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-2 rounded-card hover:bg-[var(--foreground)]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            <Icon name="star" size={16} filled className="text-[var(--accent-star)]" />
            <span className="text-card-title text-[var(--text-white)]">
              {toPersianDigits(rating.avg.toFixed(1))}
            </span>
            <span className="text-secondary text-[var(--text-muted)]">
              ({toPersianDigits(rating.count)} نظر)
            </span>
          </button>
        )}
      </div>

      {address && (
        <div className="flex items-start gap-1.5 text-secondary text-[var(--text-muted)]">
          <Icon name="pin" size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 flex items-baseline gap-1.5 flex-wrap">
            <span
              className={
                isAddressExpanded
                  ? "leading-relaxed text-[var(--text-muted)] break-words"
                  : "truncate flex-1 min-w-0"
              }
            >
              {address}
            </span>
            <button
              type="button"
              onClick={() => setIsAddressExpanded((v) => !v)}
              className="shrink-0 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
            >
              {isAddressExpanded ? "بستن" : "مشاهده بیشتر"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
