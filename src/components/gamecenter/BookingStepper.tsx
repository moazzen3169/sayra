"use client";

import React from "react";
import { toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type BookingStep = 1 | 2 | 3;

interface BookingStepperProps {
  currentStep: BookingStep;
  loggedIn?: boolean;
  onStepClick?: (step: BookingStep) => void;
  className?: string;
}

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 1, label: "زمان" },
  { id: 2, label: "ورود" },
  { id: 3, label: "پرداخت" },
];

export const BookingStepper: React.FC<BookingStepperProps> = ({
  currentStep,
  loggedIn = false,
  onStepClick,
  className,
}) => {
  return (
    <div
      role="list"
      aria-label="مراحل رزرو"
      className={cn("w-full py-2 px-4", className)}
      dir="rtl"
    >
      <div className="max-w-[420px] mx-auto flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isDone =
            step.id < currentStep || (step.id === 2 && loggedIn && currentStep >= 1);
          const isClickable = Boolean(onStepClick && step.id < currentStep);

          const circleClass = cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 shrink-0",
            isDone || isCurrent
              ? "bg-[var(--primary)] text-on-primary"
              : "bg-[var(--foreground)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
          );

          const content = (
            <div className="flex items-center gap-2">
              <div className={circleClass}>
                {isDone ? (
                  <Icon name="check" size={16} strokeWidth={2} />
                ) : (
                  <span className="leading-none">{toPersianDigits(step.id)}</span>
                )}
              </div>
              {isCurrent && (
                <span className="text-xs font-bold text-[var(--primary)] whitespace-nowrap">
                  {step.label}
                </span>
              )}
            </div>
          );

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-150",
                    step.id <= currentStep || (step.id === 2 && loggedIn)
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border-subtle)]"
                  )}
                />
              )}

              <div
                role="listitem"
                aria-current={isCurrent ? "step" : undefined}
                className="shrink-0"
              >
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(step.id)}
                    aria-label={`بازگشت به ${step.label}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-card hover:bg-[var(--foreground)]/40 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer px-1"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="min-h-[44px] flex items-center justify-center px-1">
                    {content}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
