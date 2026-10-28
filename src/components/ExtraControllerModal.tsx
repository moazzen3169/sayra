
"use client";

import React, { useEffect, useState } from "react";
import { formatPrice, toPersianDigits } from "@/lib/format";

interface ExtraControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (extraControllersCount: number) => void;
  deviceName: string;
  defaultControllers?: number;
  initialCount?: number;
  maxExtra?: number;
  pricePerController?: number;
}

export const ExtraControllerModal: React.FC<ExtraControllerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deviceName,
  defaultControllers = 2,
  initialCount = 2,
  maxExtra = 4,
  pricePerController = 30000,
}) => {
  const [count, setCount] = useState(initialCount);

useEffect(() => {
  if (isOpen) {
    setCount(
      Math.max(
        defaultControllers,
        Math.min(initialCount, defaultControllers + maxExtra)
      )
    );
  }
}, [isOpen, initialCount, defaultControllers, maxExtra]);

  if (!isOpen) return null;

  const maxControllers = defaultControllers + maxExtra;
  const extraCount = Math.max(0, count - defaultControllers);
  const totalPrice = extraCount * pricePerController;

  const handleConfirm = () => {
    onConfirm(extraCount);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extra-controller-title"
        className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>

            <div>
              <h3
                id="extra-controller-title"
                className="text-base font-black text-[var(--text-white)]"
              >
                تعداد دسته‌ها
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {deviceName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] flex items-center justify-center text-lg hover:bg-[var(--foreground)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Controller Counter */}
        <div className="bg-[var(--foreground)]/40 rounded-card border border-[var(--border-subtle)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-sm font-bold text-[var(--text-white)]">
                تعداد دسته
              </span>
              <span className="block text-xs text-[var(--text-muted)] mt-1">
                {toPersianDigits(defaultControllers)} دسته به صورت پیشفرض
              </span>
            </div>

            <div className="flex items-center gap-3 bg-[var(--bg-card)] rounded-card p-1 border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                disabled={count <= 0}
                aria-label="کاهش تعداد دسته‌ها"
                className="w-9 h-9 rounded-lg bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-lg disabled:opacity-30 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
              >
                −
              </button>

              <span
                aria-live="polite"
                className="w-6 text-center text-base font-black text-[var(--primary)]"
              >
                {toPersianDigits(count)}
              </span>

              <button
                type="button"
                onClick={() => setCount((c) => Math.min(maxControllers, c + 1))}
                disabled={count >= maxControllers}
                aria-label="افزایش تعداد دسته‌ها"
                className="w-9 h-9 rounded-lg bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-lg disabled:opacity-30 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Price Summary */}
        <div className="rounded-card border border-[var(--border-subtle)] p-3.5 flex items-center justify-between gap-3">
          <div>
            <span className="block text-xs text-[var(--text-muted)]">
              هزینه دسته اضافه / ساعت
            </span>
            <span className="block text-sm font-bold text-[var(--text-white)] mt-1">
              {extraCount === 0
                ? "رایگان"
                : `${toPersianDigits(extraCount)} دسته اضافه`}
            </span>
          </div>

          <div className="text-left">
            <span
              className={`text-base font-black ${
                totalPrice > 0
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-white)]"
              }`}
            >
              {totalPrice > 0
                ? `${formatPrice(totalPrice)} تومان`
                : "۰ تومان"}
            </span>
            {totalPrice > 0 && (
              <span className="block text-[10px] text-[var(--text-muted)] mt-1">
                هر دسته {formatPrice(pricePerController)} تومان
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full h-11 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm transition-colors"
        >
          تایید و ثبت
        </button>
      </div>
    </div>
  );
};
