"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import {
  REGISTRATION_STEPS,
  type RegistrationStepItem,
} from "@/data/registerGamecenterContent";
import { cn } from "@/lib/utils";

type PhaseFilter = "all" | "onboarding" | "verification";

const FILTERS: { id: PhaseFilter; label: string }[] = [
  { id: "all", label: "همه گام‌ها (۶ مرحله)" },
  { id: "onboarding", label: "ثبت اولیه (گام ۱ تا ۵)" },
  { id: "verification", label: "احراز هویت و انتشار" },
];

export const StepJourneySection: React.FC = () => {
  const [filter, setFilter] = useState<PhaseFilter>("all");
  const [activeStep, setActiveStep] = useState<string>("۰۱");

  const visibleSteps: RegistrationStepItem[] =
    filter === "all"
      ? REGISTRATION_STEPS
      : REGISTRATION_STEPS.filter((step) => step.phase === filter);

  return (
    <div className="flex flex-col gap-4">
      {/* Phase Filter Pills */}
      <div
        role="group"
        aria-label="فیلتر مراحل ثبت گیمنت"
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        {FILTERS.map((item) => {
          const isSelected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setFilter(item.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                  : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--border-color)] hover:text-[var(--text-white)]"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Timeline List */}
      <ol className="flex flex-col gap-3">
        {visibleSteps.map((step) => {
          const isFocused = activeStep === step.number;
          const isVerification = step.phase === "verification";

          return (
            <li key={step.number} className="list-none">
              <button
                type="button"
                onClick={() => setActiveStep(step.number)}
                aria-expanded={isFocused}
                className={cn(
                  "w-full rounded-card border p-4 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer",
                  isFocused
                    ? "border-[var(--primary)]/50 bg-[var(--bg-card)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Step Number Circle */}
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-card border text-base font-black",
                      isFocused
                        ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary)]"
                        : "border-[var(--border-color)] bg-[var(--foreground)]/50 text-[var(--text-white)]"
                    )}
                  >
                    {step.number}
                  </div>

                  {/* Step Content */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold leading-6 text-[var(--text-white)]">
                        {step.title}
                      </h3>
                      <Badge variant={isVerification ? "warning" : "neutral"}>
                        {step.phaseLabel}
                      </Badge>
                    </div>

                    <p className="text-xs font-medium leading-6 text-[var(--text-muted)]">
                      {step.summary}
                    </p>

                    <ul className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                      {step.details.map((detail, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs leading-6 text-[var(--text-white)]"
                        >
                          <Icon
                            name="check"
                            size={16}
                            className="mt-1 shrink-0 text-[var(--primary)]"
                          />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Inline Step Action Prompt */}
      <div className="flex flex-col justify-between gap-3 rounded-card border border-[var(--border-color)] bg-[var(--foreground)]/40 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-[var(--primary-muted)] text-[var(--primary)]">
            <Icon name="info" size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-[var(--text-white)]">
              فرم ثبت اولیه کوتاه و مرحله‌به‌مرحله است
            </p>
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              اگر در میانه مراحل خارج شوید، می‌توانید فرایند ثبت را بدون سردرگمی ادامه دهید.
            </p>
          </div>
        </div>

        <Link
          href="/owner/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-xs font-bold text-[var(--primary)] transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span>ورود به فرم ۵ مرحله‌ای</span>
          <Icon name="arrow-left" size={16} />
        </Link>
      </div>
    </div>
  );
};
