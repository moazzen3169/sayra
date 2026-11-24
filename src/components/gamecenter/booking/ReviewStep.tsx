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
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";

interface ReviewStepProps {
  gamingCenterName: string;
  selectedDate: DateOption;
  rangeLabel: string;
  durationHours: number;
  stations: PhysicalStation[];
  extraSelection: ExtraControllerSelectionMap;
  estimate: number;
  originalEstimate?: number;
  appliedDiscountAmount?: number;
  appliedDiscountTitle?: string;
  hasManagedDiscounts?: boolean;
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
  walletBalance: number | null;
  walletLoading: boolean;
  walletError: string | null;
  onRetryWallet: () => void;
  useWallet: boolean;
  onToggleWallet: (next: boolean) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  gamingCenterName,
  selectedDate,
  rangeLabel,
  durationHours,
  stations,
  extraSelection,
  estimate,
  originalEstimate,
  appliedDiscountAmount = 0,
  appliedDiscountTitle,
  hasManagedDiscounts = false,
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
  walletBalance,
  walletLoading,
  walletError,
  onRetryWallet,
  useWallet,
  onToggleWallet,
}) => {
  const [noteOpen, setNoteOpen] = useState(Boolean(note.trim()));
  const missingCustomerInfo = !customerName.trim() || !customerPhone.trim();

  const availableWallet = Math.max(0, walletBalance ?? 0);
  const canUseWallet = !walletLoading && !walletError && availableWallet > 0;
  const isWalletActive = canUseWallet && useWallet;
  const walletContribution = isWalletActive ? Math.min(availableWallet, estimate) : 0;
  const gatewayAmount = Math.max(0, estimate - walletContribution);
  const coversEntireAmount = isWalletActive && gatewayAmount === 0 && estimate > 0;

  const payButtonLabel = coversEntireAmount
    ? "پرداخت با کیف پول"
    : isWalletActive
    ? `پرداخت آنلاین ${formatPrice(gatewayAmount)} تومان`
    : "پرداخت";

  const payLoadingLabel = coversEntireAmount
    ? "در حال پرداخت"
    : isPaying
    ? "در حال انتقال"
    : "در حال ثبت";

  const payCaption = coversEntireAmount
    ? `کسر ${formatPrice(walletContribution)} تومان از کیف پول بدون نیاز به درگاه`
    : isWalletActive
    ? `${formatPrice(walletContribution)} تومان از کیف پول + ${formatPrice(gatewayAmount)} تومان درگاه بانکی`
    : "انتقال به درگاه بانکی";

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
            const originalTotal = Math.round(pricing.originalHourlyPrice * durationHours);
            const stPrice = hasManagedDiscounts
              ? originalTotal
              : Math.round(pricing.finalHourlyPrice * durationHours);
            const showInlineDiscount = !hasManagedDiscounts && pricing.hasDiscount;
            const stExtras = getStationExtraSelectionsList(extraSelection, st.id);

            return (
              <div key={st.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[var(--text-white)] truncate">
                    {st.name}
                  </span>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    {showInlineDiscount && (
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

      {/* کارت ۲: پرداخت با کیف پول */}
      <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                isWalletActive
                  ? "bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]"
                  : "bg-[var(--bg-body)] border-[var(--border-subtle)] text-[var(--text-muted)]"
              }`}
            >
              <Icon name="wallet" size={18} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-card-title text-[var(--text-white)]">
                استفاده از کیف پول
              </span>
              {walletLoading ? (
                <Skeleton className="h-3.5 w-28" />
              ) : walletError ? (
                <div className="flex items-center gap-2">
                  <span className="text-secondary text-[var(--accent-red)]">
                    خطا در دریافت موجودی
                  </span>
                  <button
                    type="button"
                    onClick={onRetryWallet}
                    disabled={isBusy}
                    className="text-[11px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    تلاش مجدد
                  </button>
                </div>
              ) : (
                <span className="text-secondary text-[var(--text-muted)]">
                  موجودی قابل استفاده:{" "}
                  <strong className="text-[var(--text-white)]">
                    {formatPrice(availableWallet)} تومان
                  </strong>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isWalletActive}
            aria-label="پرداخت با کیف پول"
            disabled={!canUseWallet || isBusy}
            onClick={() => onToggleWallet(!isWalletActive)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              !canUseWallet || isBusy
                ? "opacity-50 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-body)]"
                : isWalletActive
                ? "cursor-pointer border-[var(--primary)] bg-[var(--primary)]"
                : "cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-body)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isWalletActive ? "-translate-x-6" : "-translate-x-1"
              }`}
            />
          </button>
        </div>

        {!walletLoading && !walletError && (
          <div
            className={`rounded-card px-3 py-2.5 text-xs leading-relaxed border ${
              availableWallet <= 0
                ? "bg-[var(--bg-body)]/60 border-[var(--border-subtle)] text-[var(--text-muted)]"
                : coversEntireAmount
                ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                : isWalletActive
                ? "bg-[var(--primary)]/10 border-[var(--primary)]/25 text-[var(--text-white)]"
                : "bg-[var(--bg-body)]/60 border-[var(--border-subtle)] text-[var(--text-muted)]"
            }`}
          >
            {availableWallet <= 0 ? (
              <span>
                موجودی کیف پول شما صفر است؛ کل مبلغ از طریق درگاه بانکی پرداخت می‌شود.
              </span>
            ) : coversEntireAmount ? (
              <span>
                موجودی کیف پول شما برای پرداخت کل هزینه کافی است و نیازی به انتقال به درگاه بانکی نیست.
              </span>
            ) : isWalletActive ? (
              <span>
                <strong className="text-[var(--primary)]">
                  {formatPrice(walletContribution)} تومان
                </strong>{" "}
                از کیف پول کسر می‌شود و مابقی (
                <strong className="text-[var(--text-white)]">
                  {formatPrice(gatewayAmount)} تومان
                </strong>
                ) از طریق پرداخت آنلاین تسویه می‌گردد.
              </span>
            ) : (
              <span>
                برای کسر خودکار{" "}
                <strong className="text-[var(--text-white)]">
                  {formatPrice(Math.min(availableWallet, estimate))} تومان
                </strong>{" "}
                از هزینه رزرو، پرداخت با کیف پول را فعال کنید.
              </span>
            )}
          </div>
        )}
      </div>

      {/* کارت ۳: جزئیات مبلغ قابل پرداخت */}
      <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col gap-2.5">
        {appliedDiscountAmount > 0 && typeof originalEstimate === "number" && (
          <>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-muted)]">مبلغ اولیه</span>
              <span className="font-bold text-[var(--text-white)]">
                {formatPrice(originalEstimate)} تومان
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-muted)] truncate">
                تخفیف{appliedDiscountTitle ? ` (${appliedDiscountTitle})` : ""}
              </span>
              <span className="font-bold text-[var(--accent-green)] shrink-0">
                - {formatPrice(appliedDiscountAmount)} تومان
              </span>
            </div>
          </>
        )}
        {isWalletActive ? (
          <>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-muted)]">مبلغ کل رزرو</span>
              <span className="font-bold text-[var(--text-white)]">
                {formatPrice(estimate)} تومان
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-muted)]">کسر از کیف پول</span>
              <span className="font-bold text-[var(--accent-green)]">
                - {formatPrice(walletContribution)} تومان
              </span>
            </div>
            <div className="border-t border-[var(--border-subtle)] pt-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-card-title text-[var(--text-white)]">
                  {coversEntireAmount ? "مبلغ قابل پرداخت" : "باقیمانده پرداخت آنلاین"}
                </span>
                {coversEntireAmount && (
                  <span className="rounded-full bg-[var(--accent-green)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--accent-green)]">
                    تسویه با کیف پول
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-key-number text-[var(--primary)]">
                  {formatPrice(gatewayAmount)}
                </span>
                <span className="text-secondary text-[var(--text-white)]">تومان</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-card-title text-[var(--text-white)]">برآورد مبلغ</span>
            <div className="flex items-baseline gap-1">
              <span className="text-key-number text-[var(--primary)]">
                {formatPrice(estimate)}
              </span>
              <span className="text-secondary text-[var(--text-white)]">تومان</span>
            </div>
          </div>
        )}
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
          loadingLabel={payLoadingLabel}
          className="w-full"
        >
          {payButtonLabel}
        </Button>
        <span className="text-secondary text-[var(--text-muted)] self-center">
          {payCaption}
        </span>
      </div>
    </div>
  );
};
