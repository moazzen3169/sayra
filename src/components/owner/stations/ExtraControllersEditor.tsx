"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { formatToman, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { parseAmount } from "@/lib/ownerStations";
import {
  createEmptyExtraControllerRow,
  validateExtraControllerRows,
  type ExtraControllerDraftRow,
} from "@/lib/extraControllers";

export {
  createEmptyExtraControllerRow,
  validateExtraControllerRows,
  type ExtraControllerDraftRow,
};

const SUGGESTED_CONTROLLER_TYPES = ["دسته PS5", "دسته PS4", "دسته Xbox"];

interface ExtraControllersEditorProps {
  rows: ExtraControllerDraftRow[];
  onChange: (rows: ExtraControllerDraftRow[]) => void;
  disabled?: boolean;
  error?: string;
}

export const ExtraControllersEditor: React.FC<ExtraControllersEditorProps> = ({
  rows,
  onChange,
  disabled = false,
  error,
}) => {
  const addRow = (defaultType = "") => {
    onChange([...rows, createEmptyExtraControllerRow(defaultType)]);
  };

  const updateRow = (localId: string, patch: Partial<ExtraControllerDraftRow>) => {
    onChange(rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  };

  const removeRow = (localId: string) => {
    onChange(rows.filter((r) => r.localId !== localId));
  };

  const existingNames = new Set(rows.map((r) => r.controllerType.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-[var(--text-white)]">
            دسته‌های اضافی (اختیاری)
          </span>
          <span className="text-[11px] leading-5 text-[var(--text-muted)]">
            برای این نوع دستگاه می‌توانید دسته اضافی (مثلاً PS4، PS5 یا Xbox) همراه با تعداد و قیمت هر ساعت ثبت کنید.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => addRow()}
        >
          <span className="flex items-center gap-1">
            <Icon name="plus" size={14} />
            <span>افزودن دسته اضافی</span>
          </span>
        </Button>
      </div>

      {/* Quick preset chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[var(--text-muted)]">افزودن سریع:</span>
        {SUGGESTED_CONTROLLER_TYPES.map((preset) => {
          const alreadyAdded = existingNames.has(preset.toLowerCase());
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled || alreadyAdded}
              onClick={() => addRow(preset)}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-white)] hover:border-[var(--primary)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              + {preset}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-[var(--border-subtle)] p-3 text-center text-xs text-[var(--text-muted)]">
          هنوز دسته اضافی‌ای برای این دستگاه تعریف نشده است.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row, idx) => {
            const parsedRowPrice = parseAmount(row.hourlyPrice, toEnglishDigits);
            const priceHelper =
              parsedRowPrice !== null && parsedRowPrice >= 0
                ? `${formatToman(parsedRowPrice)} تومان / ساعت`
                : undefined;

            return (
              <div
                key={row.localId}
                className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--primary)]">
                    دسته اضافی #{toPersianDigits(idx + 1)}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-white)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        disabled={disabled}
                        onChange={(e) => updateRow(row.localId, { isActive: e.target.checked })}
                        className="h-4 w-4 accent-[var(--primary)] cursor-pointer"
                      />
                      <span>فعال</span>
                    </label>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeRow(row.localId)}
                      aria-label={`حذف ردیف ${idx + 1}`}
                      className="flex h-8 w-8 items-center justify-center rounded-card text-[var(--text-muted)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] cursor-pointer"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="نام / نوع دسته"
                    value={row.controllerType}
                    onChange={(e) => updateRow(row.localId, { controllerType: e.target.value })}
                    placeholder="مثلاً دسته PS5"
                    disabled={disabled}
                  />
                  <Input
                    label="تعداد موجود"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.localId, { quantity: e.target.value })}
                    inputMode="numeric"
                    placeholder="۲"
                    disabled={disabled}
                  />
                  <Input
                    label="قیمت ۱ ساعت (تومان)"
                    value={row.hourlyPrice}
                    onChange={(e) => updateRow(row.localId, { hourlyPrice: e.target.value })}
                    inputMode="numeric"
                    placeholder="۳۰۰۰۰"
                    helperText={priceHelper}
                    disabled={disabled}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <span className="text-xs font-bold text-[var(--accent-red)]">{error}</span>
      )}
    </div>
  );
};
