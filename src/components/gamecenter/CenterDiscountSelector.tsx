"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { discountSelectionKey } from "@/lib/discountSelection";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AvailableDiscountItem } from "@/types/gaming-center/discount-selection.types";

interface CenterDiscountSelectorProps {
  discounts: AvailableDiscountItem[];
  selectedKey: string | null;
  recommendedKey?: string | null;
  onSelect: (discount: AvailableDiscountItem) => void;
  disabled?: boolean;
  className?: string;
}

function formatCompactValue(item: AvailableDiscountItem): string {
  if (item.discountType === "PERCENTAGE") {
    return `${toPersianDigits(item.value)}٪`;
  }
  return `${formatPrice(item.value)} ت`;
}

function getSourceBadge(
  item: AvailableDiscountItem,
  isRecommended: boolean
): { label: string; highlight: boolean } {
  if (item.badge?.trim()) {
    return { label: item.badge.trim(), highlight: item.isBest || isRecommended };
  }
  if (item.isBest || isRecommended) {
    return { label: "پیشنهادی", highlight: true };
  }
  if (item.type === "CAMPAIGN") {
    return { label: "کمپین", highlight: false };
  }
  return { label: "گیمنت", highlight: false };
}

function buildConditionSummary(item: AvailableDiscountItem): string | null {
  if (!item.isApplicable && item.ineligibilityReason?.trim()) {
    return item.ineligibilityReason.trim();
  }
  if (item.conditions?.trim()) {
    return item.conditions.trim();
  }
  const parts: string[] = [];
  if (typeof item.minOrderAmount === "number" && item.minOrderAmount > 0) {
    parts.push(`حداقل سفارش ${formatPrice(item.minOrderAmount)} تومان`);
  }
  if (typeof item.maxDiscountAmount === "number" && item.maxDiscountAmount > 0) {
    parts.push(`سقف تخفیف ${formatPrice(item.maxDiscountAmount)} تومان`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export const CenterDiscountSelector: React.FC<CenterDiscountSelectorProps> = ({
  discounts,
  selectedKey,
  recommendedKey,
  onSelect,
  disabled = false,
  className,
}) => {
  if (!discounts || discounts.length === 0) {
    return null;
  }

  const selectedItem =
    discounts.find(
      (d) => discountSelectionKey(d.type, d.id) === selectedKey
    ) ?? null;

  const conditionText = selectedItem ? buildConditionSummary(selectedItem) : null;
  const isIneligibleSelected = Boolean(selectedItem && !selectedItem.isApplicable);

  return (
    <div
      className={cn("flex flex-col gap-2 w-full", className)}
      aria-label="تخفیف‌های فعال گیمنت"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon
            name="tag"
            size={14}
            className="text-[var(--primary)] shrink-0"
          />
          <span className="text-xs font-bold text-[var(--text-white)]">
            تخفیف‌های فعال
          </span>
        </div>
        {discounts.length > 1 && (
          <span className="text-[11px] text-[var(--text-muted)] shrink-0">
            یک مورد قابل انتخاب
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="انتخاب تخفیف"
        className="flex items-stretch gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {discounts.map((item) => {
          const key = discountSelectionKey(item.type, item.id);
          const isSelected = key === selectedKey;
          const isRecommended = key === recommendedKey;
          const badge = getSourceBadge(item, isRecommended);

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(item)}
              className={cn(
                "group flex shrink-0 items-center gap-2.5 rounded-card border px-3 py-2 text-right transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                disabled
                  ? "cursor-not-allowed opacity-50 border-[var(--border-subtle)] bg-[var(--bg-card)]"
                  : isSelected
                  ? "cursor-pointer border-[var(--primary)] bg-[var(--primary-muted)]"
                  : "cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)]/50",
                !item.isApplicable && !isSelected && "opacity-70"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                    : "border-[var(--border-color)] bg-transparent text-transparent"
                )}
              >
                <Icon name="check" size={11} strokeWidth={3} />
              </span>

              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[var(--primary)] leading-none">
                    {formatCompactValue(item)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      badge.highlight
                        ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                        : "bg-[var(--foreground)] text-[var(--text-muted)]"
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <span className="max-w-[165px] truncate text-[11px] font-medium text-[var(--text-white)]/90 sm:max-w-[190px]">
                  {item.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {conditionText && (
        <p
          className={cn(
            "flex items-center gap-1 text-[11px] leading-relaxed truncate",
            isIneligibleSelected
              ? "text-[var(--accent-warning)]"
              : "text-[var(--text-muted)]"
          )}
          title={conditionText}
        >
          <Icon
            name={isIneligibleSelected ? "alert" : "info"}
            size={12}
            className="shrink-0"
          />
          <span className="truncate">{conditionText}</span>
        </p>
      )}
    </div>
  );
};
