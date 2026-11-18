"use client";

import React, { useState } from "react";
import type { DateOption } from "@/lib/dates";
import {
  getStationExtraSelectionsList,
  type ExtraControllerSelectionMap,
} from "@/lib/extraControllers";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface ReviewStepProps {
  gamingCenterName: string;
  selectedDate: DateOption;
  rangeLabel: string;
  durationHours: number;
  stations: PhysicalStation[];
  extraSelection: ExtraControllerSelectionMap;
  estimate: number;
  note: string;
  onNoteChange: (val: string) => void;
  customerName: string;
  customerPhone: string;
  onEditTime: () => void;
  onPay: () => void;
  isBusy: boolean;
  isPaying: boolean;
  errorText: string | null;
  showLeadTimeAction: boolean;
  onLeadTimeReset: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  gamingCenterName,
  selectedDate,
  rangeLabel,
  durationHours,
  stations,
  extraSelection,
  estimate,
  note,
  onNoteChange,
  customerName,
  customerPhone,
  onEditTime,
  onPay,
  isBusy,
  isPaying,
  errorText,
  showLeadTimeAction,
  onLeadTimeReset,
}) => {
  const [noteOpen, setNoteOpen] = useState(Boolean(note.trim()));
  const missingCustomerInfo = !customerName.trim() || !customerPhone.trim();

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-6">
      {/* کارت ۱: خلاصه */}
      <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-card-title text-[var(--text-white)] truncate">
              {gamingCenterName}
            </span>
            <span className="text-secondary text-[var(--text-muted)]">
              {selectedDate.dayName} ({selectedDate.dateStr}) · {rangeLabel} (
              {toPersianDigits(Math.round(durationHours * 10) / 10)} ساعت)
            </span>
          </div>
          <button
            type="button"
            onClick={onEditTime}
            disabled={isBusy}
            className="min-h-[44px] px-2 text-xs font-bold text-[var(--primary)] hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card cursor-pointer"
          >
            ویرایش
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {stations.map((st) => {
            const pricing = getEffectiveStationPricing(st);
            const stPrice = Math.round(pricing.finalHourlyPrice * durationHours);
            const originalTotal = Math.round(pricing.originalHourlyPrice * durationHours);
            const stExtras = getStationExtraSelectionsList(extraSelection, st.id);

            return (
              <div key={st.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[var(--text-white)] truncate">
                    {st.name}
                  </span>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    {pricing.hasDiscount && (
                      <span className="text-secondary text-[var(--text-muted)] line-through">
                        {formatPrice(originalTotal)}
                      </span>
                    )}
                    <span className="font-bold text-[var(--text-white)]">
                      {formatPrice(stPrice)}
                    </span>
                    <span className="text-secondary text-[var(--text-muted)]">تومان</span>
                  </div>
                </div>
                {stExtras.map((entry) => {
                  const extraCost = Math.round(
                    entry.extraController.hourlyPrice * entry.quantity * durationHours
                  );
                  return (
                    <div
                      key={entry.extraController.id}
                      className="flex items-center justify-between gap-3 pr-3 text-[11px] text-[var(--text-muted)]"
                    >
                      <span className="truncate">
                        + {toPersianDigits(entry.quantity)} × {entry.extraController.controllerType}
                      </span>
                      <span className="shrink-0">
                        {formatPrice(extraCost)} تومان
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-2">
          {!noteOpen ? (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="min-h-[44px] text-xs font-bold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card cursor-pointer"
            >
              افزودن یادداشت
            </button>
          ) : (
            <Input
              label="یادداشت"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="توضیحات برای گیمنت"
              disabled={isBusy}
            />
          )}
        </div>
      </div>

      {/* کارت ۲: برآورد مبلغ */}
      <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-3">
        <span className="text-card-title text-[var(--text-white)]">برآورد مبلغ</span>
        <div className="flex items-baseline gap-1">
          <span className="text-key-number text-[var(--primary)]">
            {formatPrice(estimate)}
          </span>
          <span className="text-secondary text-[var(--text-white)]">تومان</span>
        </div>
      </div>

      {missingCustomerInfo && (
        <p className="text-secondary text-[var(--text-muted)] px-1">
          اطلاعات حساب کاربری ناقص است.
        </p>
      )}

      {errorText && (
        <InlineAlert
          variant="error"
          action={
            showLeadTimeAction ? (
              <Button variant="secondary" size="sm" onClick={onLeadTimeReset}>
                انتخاب ساعت دیگر
              </Button>
            ) : undefined
          }
        >
          <span className="text-xs">{errorText}</span>
        </InlineAlert>
      )}

      {/* دسکتاپ: دکمه پرداخت داخل صفحه؛ موبایل در StickyActionBar است */}
      <div className="hidden lg:flex flex-col items-end gap-2 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={onPay}
          disabled={isBusy}
          isLoading={isBusy}
          loadingLabel={isPaying ? "در حال انتقال" : "در حال ثبت"}
          className="w-full"
        >
          پرداخت
        </Button>
        <span className="text-secondary text-[var(--text-muted)] self-center">
          انتقال به درگاه بانکی
        </span>
      </div>
    </div>
  );
};
