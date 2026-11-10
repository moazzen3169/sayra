"use client";

import React from "react";
import { toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export type BookingStep = 1 | 2 | 3 | 4 | 5;

interface BookingStepperProps {
  currentStep: BookingStep;
  onStepClick?: (step: BookingStep) => void;
  className?: string;
}

const STEPS: { id: BookingStep; label: string; shortLabel: string }[] = [
  { id: 1, label: "انتخاب گیم‌نت", shortLabel: "گیم‌نت" },
  { id: 2, label: "انتخاب دستگاه‌ها", shortLabel: "دستگاه‌ها" },
  { id: 3, label: "تاریخ و ساعت", shortLabel: "زمان" },
  { id: 4, label: "احراز هویت", shortLabel: "اطلاعات" },
  { id: 5, label: "بررسی و پرداخت", shortLabel: "پرداخت" },
];

export const BookingStepper: React.FC<BookingStepperProps> = ({
  currentStep,
  onStepClick,
  className = "",
}) => {
  return (
    <div className={`w-full py-2.5 px-6  ${className}`} dir="rtl">
      <div className="max-w-[720px] mx-auto flex items-center justify-between relative">
        {STEPS.map((step, index) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;
          const isClickable = onStepClick && step.id < currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${
                    step.id <= currentStep ? "bg-[var(--primary)]" : "bg-[var(--border-subtle)]"
                  }`}
                />
              )}

              {/* Step item */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
                className={`flex flex-col items-center gap-3 group focus:outline-none transition-all ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? "bg-[var(--primary)] text-on-primary ring-2 ring-[var(--primary)]/30"
                      : isCurrent
                      ? "bg-[var(--primary)] text-on-primary ring-4 ring-[var(--primary)]/20 scale-105 shadow-md"
                      : "bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  {isDone ? (
                    <Icon name="check" size={14} className="stroke-[3]" />
                  ) : (
                    <span>{toPersianDigits(step.id)}</span>
                  )}
                </div>

                <span
                  className={`text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                    isCurrent
                      ? "font-bold text-[var(--primary)]"
                      : isDone
                      ? "text-[var(--text-white)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
