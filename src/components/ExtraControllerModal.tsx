"use client";

import React, { useState } from "react";
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
  initialCount = 0,
  maxExtra = 4,
  pricePerController = 30000,
}) => {
  const [count, setCount] = useState<number>(initialCount);
  const [prevInitial, setPrevInitial] = useState<number>(initialCount);

  if (initialCount !== prevInitial) {
    setPrevInitial(initialCount);
    setCount(initialCount);
  }

  if (!isOpen) return null;

  const handleIncrement = () => {
    if (count < maxExtra) setCount((c) => c + 1);
  };

  const handleDecrement = () => {
    if (count > 0) setCount((c) => c - 1);
  };

  const handleConfirm = () => {
    onConfirm(count);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-5 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <h3 className="text-base font-black text-[var(--text-white)]">دسته بازی اضافه</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 text-right">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              هر دستگاه <span className="text-[var(--text-white)] font-bold">{deviceName}</span> به‌صورت پیش‌فرض همراه با <strong className="text-[var(--primary)] font-extrabold">{toPersianDigits(defaultControllers)} دسته</strong> ارائه می‌شود.
          </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              آیا برای بازی گروهی به دسته اضافه نیاز دارید؟ (حداکثر {toPersianDigits(maxExtra)} دسته اضافه برای هر دستگاه)
            </p>

          {/* Extra controller counter card */}
          <div className="bg-[var(--foreground)]/50 rounded-card p-3.5 border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-[var(--text-white)]">تعداد دسته اضافه</span>
                {pricePerController > 0 ? (
                  <span className="text-[11px] text-[var(--primary)] font-bold">
                    +{formatPrice(pricePerController)} تومان / دسته / ساعت
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--text-muted)]">رایگان</span>
                )}
            </div>

            <div className="flex items-center gap-3 bg-[var(--bg-card)] rounded-card p-1 border border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={count <= 0}
                className="w-8 h-8 rounded-lg bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-sm disabled:opacity-30 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
              >
                -
              </button>
              <span className="w-6 text-center text-sm font-black text-[var(--primary)]">
                {toPersianDigits(count)}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                  disabled={count >= maxExtra}
                className="w-8 h-8 rounded-lg bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-sm disabled:opacity-30 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Summary text */}
            {count > 0 && pricePerController > 0 && (
              <div className="flex items-center justify-between text-xs px-1 text-[var(--text-white)] bg-[var(--primary)]/10 p-2.5 rounded-card border border-[var(--primary)]/20">
                <span>هزینه دسته‌های اضافه:</span>
              <span className="font-extrabold text-[var(--primary)]">
                +{formatPrice(count * pricePerController)} تومان/ساعت
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-11 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-xs transition-colors"
          >
            تایید و ثبت
          </button>
          <button
            type="button"
            onClick={() => {
              setCount(0);
              onConfirm(0);
              onClose();
            }}
            className="h-11 px-4 rounded-card bg-[var(--foreground)]/60 text-[var(--text-muted)] hover:text-[var(--text-white)] text-xs font-bold transition-colors"
          >
            بدون دسته اضافه
          </button>
        </div>
      </div>
    </div>
  );
};
