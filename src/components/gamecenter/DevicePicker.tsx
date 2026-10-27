"use client";

import React from "react";
import { formatPrice, toPersianDigits } from "@/lib/format";
import type { CartEntry, DeviceGroup } from "@/lib/devices";

interface DevicePickerProps {
  groups: DeviceGroup[];
  cart: Record<string, CartEntry>;
  onQtyChange: (key: string, qty: number) => void;
  onExtraChange: (key: string, extra: number) => void;
}

const Stepper: React.FC<{
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}> = ({ value, min, max, onChange, label }) => (
  <div
    role="group"
    aria-label={label}
    className="flex items-center gap-1 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-color)] p-1"
  >
    <button
      type="button"
      onClick={() => onChange(value - 1)}
      disabled={value <= min}
      aria-label="کم کردن"
      className="w-9 h-9 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] text-lg font-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
    >
      −
    </button>
    <span className="w-8 text-center text-sm font-black text-[var(--primary)]" aria-live="polite">
      {toPersianDigits(value)}
    </span>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      disabled={value >= max}
      aria-label="اضافه کردن"
      className="w-9 h-9 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] text-lg font-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
    >
      +
    </button>
  </div>
);

export const DevicePicker: React.FC<DevicePickerProps> = ({ groups, cart, onQtyChange, onExtraChange }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-muted)]">
        فعلاً دستگاهی برای رزرو آنلاین ثبت نشده است.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {groups.map((g) => {
        const entry = cart[g.key];
        const qty = entry?.qty ?? 0;
        const extra = entry?.extra ?? 0;
        const selected = qty > 0;
        const samePrice = g.minPrice === g.maxPrice;
        const canExtra = g.isConsole && typeof g.extraControllerPrice === "number";

        return (
          <article
            key={g.key}
            className={`rounded-card p-3.5 flex flex-col gap-3 border-2 transition-colors ${
              selected
                ? "bg-[var(--primary)]/[0.06] border-[var(--primary)]"
                : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 shrink-0 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] flex items-center justify-center p-2 overflow-hidden">
                <img src={g.image} alt="" loading="lazy" className="w-full h-full object-contain" />
              </div>

              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-[var(--text-white)] truncate">{g.label}</h3>
                <div className="flex items-baseline gap-1">
                  {!samePrice && <span className="text-[10px] text-[var(--text-muted)]">از</span>}
                  <span className="text-sm font-black text-[var(--primary)]">{formatPrice(g.minPrice)}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">تومان / ساعت</span>
                </div>
                <span className="text-[11px] text-[var(--text-subtle)]">
                  {toPersianDigits(g.capacity)} دستگاه موجود
                </span>
              </div>
            </div>

            {/* تعداد */}
            {!selected ? (
              <button
                type="button"
                onClick={() => onQtyChange(g.key, 1)}
                className="h-11 w-full rounded-card bg-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[#101014] text-[var(--text-white)] text-sm font-black transition-colors active:scale-[0.98]"
              >
                + افزودن
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-white)]">چند دستگاه؟</span>
                  <span className="text-[10px] text-[var(--text-subtle)]">
                    {qty >= g.capacity ? "به سقف ظرفیت رسیدید" : `حداکثر ${toPersianDigits(g.capacity)} دستگاه`}
                  </span>
                </div>
                <Stepper
                  value={qty}
                  min={0}
                  max={g.capacity}
                  onChange={(v) => onQtyChange(g.key, v)}
                  label={`تعداد ${g.label}`}
                />
              </div>
            )}

            {/* دسته (فقط کنسول‌ها) */}
            {selected && g.isConsole && (
              <div className="flex flex-col gap-2.5 rounded-card bg-[var(--bg-body)]/50 border border-[var(--border-subtle)] p-3">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  هر دستگاه با{" "}
                  <strong className="text-[var(--text-white)]">{toPersianDigits(g.defaultControllers)} دسته</strong>{" "}
                  تحویل داده می‌شود.
                </p>

                {canExtra ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--text-white)]">دسته اضافه (برای هر دستگاه)</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        +{formatPrice(g.extraControllerPrice!)} تومان / دسته / ساعت
                      </span>
                    </div>
                    <Stepper
                      value={extra}
                      min={0}
                      max={g.maxExtra}
                      onChange={(v) => onExtraChange(g.key, v)}
                      label={`دسته اضافه ${g.label}`}
                    />
                  </div>
                ) : null}

                {canExtra && extra > 0 && (
                  <div className="flex items-center justify-between text-[11px] border-t border-[var(--border-subtle)] pt-2">
                    <span className="text-[var(--text-muted)]">هزینه دسته‌ها در هر ساعت</span>
                    <span className="font-black text-[var(--primary)]">
                      +{formatPrice(qty * extra * g.extraControllerPrice!)} تومان
                    </span>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};