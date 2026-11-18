"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Button } from "@/components/ui/Button";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { discountService } from "@/services/discountService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import { ownerService } from "@/services/ownerService";

type TargetScope = "GAMING_CENTER" | "STATION";
type ValueType = "PERCENTAGE" | "FIXED_AMOUNT";

const DURATION_OPTIONS = [1, 3, 7, 14, 30] as const;

const PRESETS: {
  label: string;
  valueType: ValueType;
  value: string;
  days: number;
}[] = [
  { label: "۲۰٪ · ۳ روز", valueType: "PERCENTAGE", value: "20", days: 3 },
  { label: "۳۰٪ · ۷ روز", valueType: "PERCENTAGE", value: "30", days: 7 },
  {
    label: "۵۰,۰۰۰ تومان · ۵ روز",
    valueType: "FIXED_AMOUNT",
    value: "50000",
    days: 5,
  },
];

const SAMPLE_PRICE = 100000;

export default function NewOwnerDiscountPage() {
  const router = useRouter();
  const { centerId, isCenterLoading } = useOwner();

  const [stations, setStations] = useState<GameStationInfo[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);

  const [targetScope, setTargetScope] = useState<TargetScope>("GAMING_CENTER");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [valueType, setValueType] = useState<ValueType>("PERCENTAGE");
  const [value, setValue] = useState("20");
  const [durationDays, setDurationDays] = useState<number>(3);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;

    const controller = new AbortController();
    let active = true;
    ownerService
      .listStations(centerId, controller.signal)
      .then((list) => {
        if (!active) return;
        setStations(list);
        if (list.length > 0) {
          setSelectedStationId((prev) => prev || list[0].id);
        }
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setStations([]);
      })
      .finally(() => {
        if (active) setStationsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId]);

  const numericValue = Number(toEnglishDigits(value).replace(/,/g, "").trim());
  const validNumeric = !isNaN(numericValue) && numericValue > 0 ? numericValue : 0;

  const sampleFinalPrice =
    valueType === "PERCENTAGE"
      ? Math.max(0, Math.round(SAMPLE_PRICE * (1 - Math.min(100, validNumeric) / 100)))
      : Math.max(0, SAMPLE_PRICE - validNumeric);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!centerId) {
      setError("گیم‌نت انتخاب نشده است.");
      return;
    }

    if (isNaN(numericValue) || numericValue <= 0) {
      setError("مقدار تخفیف را به درستی وارد کنید.");
      return;
    }

    if (valueType === "PERCENTAGE" && numericValue > 100) {
      setError("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.");
      return;
    }

    if (targetScope === "STATION" && !selectedStationId) {
      setError("یک دستگاه را انتخاب کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + durationDays * 86400000);

      await discountService.createDiscount(centerId, {
        targetType: targetScope,
        targetId: targetScope === "STATION" ? selectedStationId : centerId,
        valueType,
        value: numericValue,
        startAt: now.toISOString(),
        endAt: end.toISOString(),
        isActive: true,
      });

      router.push("/owner/discounts?created=1");
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "ثبت تخفیف انجام نشد.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader
        title="تخفیف جدید"
        isSubpage
        backUrl="/owner/discounts"
      />

      <main className="flex-1 mt-16 px-4 py-5 lg:max-w-[600px] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-5">
        {error && <InlineAlert variant="error">{error}</InlineAlert>}

        {/* Quick Presets */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[var(--text-muted)]">
            انتخاب سریع
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setValueType(preset.valueType);
                  setValue(preset.value);
                  setDurationDays(preset.days);
                }}
                className="px-3.5 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-white)] transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-5"
        >
          {/* 1. Target Scope */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-[var(--text-white)]">
              برای کجا اعمال شود؟
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope("GAMING_CENTER")}
                className={`h-11 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                  targetScope === "GAMING_CENTER"
                    ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                    : "bg-[var(--foreground)]/40 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                }`}
              >
                کل گیم‌نت
              </button>
              <button
                type="button"
                onClick={() => setTargetScope("STATION")}
                className={`h-11 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                  targetScope === "STATION"
                    ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                    : "bg-[var(--foreground)]/40 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                }`}
              >
                یک دستگاه
              </button>
            </div>

            {targetScope === "STATION" && (
              isCenterLoading || stationsLoading ? (
                <Skeleton className="h-11 w-full rounded-card" />
              ) : stations.length > 0 ? (
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)]"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {formatPrice(st.hourlyPrice)} تومان
                    </option>
                  ))}
                </select>
              ) : (
                <InlineAlert
                  variant="warning"
                  action={
                    <Link
                      href="/owner/stations/new"
                      className="text-xs font-bold underline"
                    >
                      افزودن دستگاه
                    </Link>
                  }
                >
                  هنوز دستگاهی ثبت نکرده‌اید.
                </InlineAlert>
              )
            )}
          </div>

          {/* 2. Discount Type & Value */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-[var(--text-white)]">
              مقدار تخفیف
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setValueType("PERCENTAGE");
                  if (numericValue > 100) setValue("20");
                }}
                className={`h-11 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                  valueType === "PERCENTAGE"
                    ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                    : "bg-[var(--foreground)]/40 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                }`}
              >
                درصدی (٪)
              </button>
              <button
                type="button"
                onClick={() => {
                  setValueType("FIXED_AMOUNT");
                  if (numericValue <= 100) setValue("50000");
                }}
                className={`h-11 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                  valueType === "FIXED_AMOUNT"
                    ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                    : "bg-[var(--foreground)]/40 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                }`}
              >
                مبلغی (تومان)
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={valueType === "PERCENTAGE" ? "20" : "50000"}
                className="w-full h-12 pl-16 pr-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-base font-bold outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                {valueType === "PERCENTAGE" ? "درصد" : "تومان"}
              </span>
            </div>

            <div className="text-xs text-[var(--text-muted)] flex items-center justify-between bg-[var(--foreground)]/25 px-3 py-2 rounded-card">
              <span>نمونه قیمت {formatPrice(SAMPLE_PRICE)} تومان:</span>
              <span className="font-bold text-[var(--primary)]">
                {formatPrice(sampleFinalPrice)} تومان
              </span>
            </div>
          </div>

          {/* 3. Duration */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-[var(--text-white)]">
              مدت اعتبار
            </label>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_OPTIONS.map((days) => {
                const selected = durationDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`h-10 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                      selected
                        ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                        : "bg-[var(--foreground)]/40 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                    }`}
                  >
                    {toPersianDigits(days)} روز
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={submitting}
              loadingLabel="در حال ثبت..."
              className="flex-1"
            >
              فعال‌سازی تخفیف
            </Button>
            <Link
              href="/owner/discounts"
              className="h-12 px-5 rounded-card bg-[var(--foreground)] hover:bg-[var(--foreground)]/80 text-xs font-bold flex items-center justify-center border border-[var(--border-subtle)]"
            >
              انصراف
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
