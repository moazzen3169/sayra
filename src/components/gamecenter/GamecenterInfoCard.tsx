"use client";

import React from "react";
import { toPersianDigits } from "@/lib/format";
import { mapsUrl } from "@/lib/reservationUi";
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
  return (
    <section className="flex flex-col gap-1">
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
        <a
          href={mapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center gap-1.5 text-secondary text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card w-fit max-w-full"
        >
          <Icon name="pin" size={16} className="shrink-0" />
          <span className="truncate">{address}</span>
          <Icon name="external-link" size={16} className="shrink-0" />
          <span className="sr-only">در تب جدید</span>
        </a>
      )}
    </section>
  );
};
