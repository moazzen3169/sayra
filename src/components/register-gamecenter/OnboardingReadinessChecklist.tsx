"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { READINESS_ITEMS } from "@/data/registerGamecenterContent";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export const OnboardingReadinessChecklist: React.FC = () => {
  const [checkedIds, setCheckedIds] = useState<string[]>([
    "phone",
    "address",
    "hours",
  ]);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const totalCount = READINESS_ITEMS.length;
  const checkedCount = checkedIds.length;
  const progressPercent = Math.round((checkedCount / totalCount) * 100);
  const startReadyCount = READINESS_ITEMS.filter(
    (item) => item.requiredAtStart && checkedIds.includes(item.id)
  ).length;
  const isReadyToStart = startReadyCount === 3;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-6">
      {/* Header & Progress */}
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="file" size={20} className="text-[var(--primary)]" />
            <h3 className="text-base font-bold text-[var(--text-white)]">
              چک‌لیست آمادگی و مدارک مورد نیاز
            </h3>
          </div>

          <Badge variant={isReadyToStart ? "success" : "warning"}>
            {isReadyToStart ? "آماده شروع ثبت" : "موارد شروع را بررسی کنید"}
          </Badge>
        </div>

        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-muted)]">
              موارد علامت‌گذاری‌شده
            </span>
            <span className="font-bold text-[var(--text-white)]">
              {toPersianDigits(checkedCount)} از {toPersianDigits(totalCount)} مورد
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="میزان آمادگی مدارک و اطلاعات"
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--foreground)]"
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <ul className="flex flex-col gap-2.5">
        {READINESS_ITEMS.map((item) => {
          const checked = checkedIds.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "flex min-h-12 w-full items-start gap-3 rounded-card border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer",
                  checked
                    ? "border-[var(--primary)]/40 bg-[var(--primary-muted)]"
                    : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 hover:border-[var(--border-color)]"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-child border transition-colors",
                    checked
                      ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                      : "border-[var(--border-color)] bg-[var(--bg-body)] text-transparent"
                  )}
                >
                  <Icon name="check" size={14} strokeWidth={2.5} />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium leading-6 text-[var(--text-white)]">
                    {item.label}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold leading-none",
                        item.requiredAtStart
                          ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                          : "bg-[var(--foreground)] text-[var(--text-muted)]"
                      )}
                    >
                      {item.hint}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Practical reassurance */}
      <p className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-body)]/70 p-3 text-xs leading-6 text-[var(--text-muted)]">
        اگر فقط سه مورد اول (شماره موبایل مدیر، نشانی روی نقشه و ساعات کاری) را آماده دارید، همین حالا می‌توانید گیمنت را ثبت کنید و تصویر پروانه کسب، شماره شبا و عکس‌های سالن را در پنل مدیریت بارگذاری نمایید.
      </p>
    </div>
  );
};
