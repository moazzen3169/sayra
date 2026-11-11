"use client";

import React from "react";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

interface PhysicalStationListProps {
  stations: PhysicalStation[];
  selectedStationIds: string[];
  onToggleStation: (station: PhysicalStation) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const PhysicalStationList: React.FC<PhysicalStationListProps> = ({
  stations,
  selectedStationIds,
  onToggleStation,
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-36 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse p-3 flex flex-col justify-between"
          >
            <div className="w-16 h-4 rounded bg-[var(--foreground)]/60" />
            <div className="w-full h-8 rounded bg-[var(--foreground)]/40" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-5 text-center flex flex-col items-center gap-2">
        <p className="text-xs font-bold text-[var(--accent-red)] leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-8 px-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-white)] transition-colors"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-muted)]">
        هیچ دستگاه فعالی در این دسته‌بندی وجود ندارد. لطفاً دسته‌بندی دیگری را انتخاب کنید.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">
          دستگاه‌های مورد نظر را انتخاب کنید (امکان انتخاب همزمان چند دستگاه):
        </span>
        <span className="font-bold text-[var(--primary)]">
          {toPersianDigits(selectedStationIds.length)} دستگاه انتخاب‌شده
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {stations.map((st) => {
          const isSelected = selectedStationIds.includes(st.id);
          const {
            originalHourlyPrice,
            finalHourlyPrice,
            discountPercentage,
            hasDiscount,
          } = getEffectiveStationPricing(st);

          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onToggleStation(st)}
              className={`rounded-card p-3 border-2 transition-all flex flex-col gap-2.5 text-right relative overflow-hidden active:scale-[0.98] ${
                isSelected
                  ? "bg-[var(--primary)]/[0.08] border-[var(--primary)] shadow-md shadow-[var(--primary)]/10"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
              }`}
            >
              {/* Checkbox indicator */}
              <div
                className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-colors z-10 ${
                  isSelected
                    ? "bg-[var(--primary)] text-on-primary"
                    : "border border-[var(--border-color)] bg-[var(--foreground)]/40 text-transparent"
                }`}
              >
                ✓
              </div>

              {/* Badges */}
              <div className="self-start flex flex-wrap items-center gap-1 z-10">
                {st.isVip && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    VIP
                  </span>
                )}
                {hasDiscount && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--primary)] text-on-primary">
                    {discountPercentage
                      ? `${toPersianDigits(discountPercentage)}٪ تخفیف`
                      : "تخفیف ویژه"}
                  </span>
                )}
              </div>

              {/* Image or Station Icon */}
              <div className="h-20 w-full rounded-lg bg-[var(--foreground)]/40 flex items-center justify-center p-2 overflow-hidden">
                <SafeImage
                  src={st.coverImageUrl || ""}
                  alt={st.name}
                  fallbackSrc={PLACEHOLDERS.center}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Station Info */}
              <div className="flex flex-col gap-1 min-w-0">
                <h4 className="text-sm font-bold text-[var(--text-white)] truncate">
                  {st.name}
                </h4>

                <div className="flex flex-wrap items-baseline gap-1 text-xs">
                  {hasDiscount ? (
                    <>
                      <span className="font-black text-[var(--primary)]">
                        {formatPrice(finalHourlyPrice)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] line-through">
                        {formatPrice(originalHourlyPrice)}
                      </span>
                    </>
                  ) : (
                    <span className="font-black text-[var(--primary)]">
                      {formatPrice(finalHourlyPrice)}
                    </span>
                  )}
                  <span className="text-[var(--text-muted)]">تومان / ساعت</span>
                </div>

                {(st.minRentHours > 1 || st.maxRentHours < 24) && (
                  <span className="text-[10px] text-[var(--text-subtle)]">
                    مدت: {toPersianDigits(st.minRentHours)} تا {toPersianDigits(st.maxRentHours)} ساعت
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
