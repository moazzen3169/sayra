"use client";

import React, { useCallback, useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { ownerService } from "@/services/ownerService";
import {
  discountService,
  type CreateDiscountInput,
  type Discount,
} from "@/services/discountService";
import type { GameStationInfo } from "@/services/gamingCenterService";

// Interface representing a Discount Rule / Code in the system
export interface DiscountItem {
  id: string;
  title: string;
  code?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number; // e.g., 20 or 50000
  targetScope: "ALL" | "STATION_TYPE" | "SPECIFIC_STATION";
  targetDeviceName: string; // e.g. "همه دستگاه‌ها", "PS5", "PC", "VR", "میز ۱ - PS5"
  durationDays: number;
  maxUsage?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  expiresAt: string; // e.g. "۳ روز دیگر"
}

const PRESETS = [
  {
    label: "تخفیف ۲۰٪ همه دستگاه‌ها",
    title: "تخفیف عمومی ۲۰٪",
    discountType: "PERCENTAGE" as const,
    value: "20",
    targetScope: "ALL" as const,
    targetDeviceName: "همه دستگاه‌ها",
    durationDays: "3",
    maxUsage: "50",
  },
  {
    label: "ویژه سیستم‌های پلی‌استیشن",
    title: "تخفیف ویژه PS5",
    discountType: "PERCENTAGE" as const,
    value: "25",
    targetScope: "STATION_TYPE" as const,
    targetDeviceName: "PLAYSTATION",
    durationDays: "7",
    maxUsage: "30",
  },
  {
    label: "کاهش ۵۰ هزار تومانی قیمت",
    title: "تخفیف ۵۰ هزار تومانی رزرو",
    discountType: "FIXED_AMOUNT" as const,
    value: "50000",
    targetScope: "ALL" as const,
    targetDeviceName: "همه دستگاه‌ها",
    durationDays: "5",
    maxUsage: "20",
  },
];

const inputClass =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)] transition-all";

function formatIsoToPersianDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatExpiryDisplay(endAtIso?: string): string {
  if (!endAtIso) return "نامشخص";
  try {
    const end = new Date(endAtIso).getTime();
    const now = Date.now();
    const diffMs = end - now;
    if (diffMs <= 0) return "منقضی شده";
    const diffDays = Math.ceil(diffMs / 86400000);
    return `${toPersianDigits(diffDays)} روز دیگر`;
  } catch {
    return "نامشخص";
  }
}

function calculateDurationDays(startAtIso?: string, endAtIso?: string): number {
  if (!startAtIso || !endAtIso) return 3;
  try {
    const s = new Date(startAtIso).getTime();
    const e = new Date(endAtIso).getTime();
    const days = Math.round((e - s) / 86400000);
    return Math.max(1, days);
  } catch {
    return 3;
  }
}

function mapBackendDiscountToItem(
  d: Discount,
  stationMap: Map<string, GameStationInfo>
): DiscountItem {
  const isStation = d.targetType === "STATION";
  const st = isStation ? stationMap.get(d.targetId) : undefined;
  const targetDeviceName = isStation
    ? st?.name ?? "دستگاه اختصاصی"
    : "همه دستگاه‌ها";
  const targetScope: "ALL" | "STATION_TYPE" | "SPECIFIC_STATION" = isStation
    ? "SPECIFIC_STATION"
    : "ALL";

  const durationDays = calculateDurationDays(d.startAt, d.endAt);
  const title =
    d.title?.trim() ||
    (d.valueType === "PERCENTAGE"
      ? `تخفیف ${toPersianDigits(d.value)}٪`
      : `تخفیف ${formatPrice(d.value)} تومان`);

  return {
    id: d.id,
    title,
    code: d.code,
    discountType: d.valueType,
    value: d.value,
    targetScope,
    targetDeviceName,
    durationDays,
    maxUsage: d.maxUsage,
    usedCount: d.usedCount ?? 0,
    isActive: d.isActive,
    createdAt: formatIsoToPersianDate(d.createdAt || d.startAt),
    expiresAt: formatExpiryDisplay(d.endAt),
  };
}

export default function OwnerDiscountsPage() {
  const { center, centerId } = useOwner();

  // State management
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [stations, setStations] = useState<GameStationInfo[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [value, setValue] = useState("20");
  const [targetScope, setTargetScope] = useState<"ALL" | "STATION_TYPE" | "SPECIFIC_STATION">("ALL");
  const [targetDeviceName, setTargetDeviceName] = useState("همه دستگاه‌ها");
  const [durationDays, setDurationDays] = useState("3");
  const [maxUsage, setMaxUsage] = useState("50");
  const [hasUsageLimit, setHasUsageLimit] = useState(true);

  // Load stations for center
  useEffect(() => {
    if (!centerId) return;
    let active = true;
    const controller = new AbortController();
    ownerService
      .listStations(centerId, controller.signal)
      .then((st) => {
        if (!active) return;
        setStations(st);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId]);

  // Load discounts from real backend API
  const fetchDiscounts = useCallback(
    async (signal?: AbortSignal) => {
      if (!centerId) return;
      setLoading(true);
      setError(null);
      try {
        const queryParams: { isActive?: boolean; signal?: AbortSignal } = {
          signal,
        };
        if (filter === "ACTIVE") queryParams.isActive = true;
        if (filter === "INACTIVE") queryParams.isActive = false;

        const rawDiscounts = await discountService.listDiscounts(
          centerId,
          queryParams
        );

        const stationMap = new Map<string, GameStationInfo>(
          stations.map((s) => [s.id, s])
        );

        const mapped = rawDiscounts.map((d) =>
          mapBackendDiscountToItem(d, stationMap)
        );
        setDiscounts(mapped);
      } catch (err: any) {
        if (isAbortError(err)) return;
        setError(err?.message || "خطا در دریافت لیست تخفیف‌ها");
      } finally {
        setLoading(false);
      }
    },
    [centerId, filter, stations]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDiscounts(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchDiscounts]);

  // Handle Preset Selection
  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setTitle(preset.title);
    setDiscountType(preset.discountType);
    setValue(preset.value);
    setTargetScope(preset.targetScope);
    setTargetDeviceName(preset.targetDeviceName);
    setDurationDays(preset.durationDays);
    setMaxUsage(preset.maxUsage);
    setHasUsageLimit(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const valNum = Number(value);
    if (isNaN(valNum) || valNum <= 0) {
      setMsg({ ok: false, text: "لطفا مقدار تخفیف معتبری وارد کنید." });
      return;
    }
    if (discountType === "PERCENTAGE" && valNum > 100) {
      setMsg({ ok: false, text: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰٪ باشد." });
      return;
    }

    if (!centerId) {
      setMsg({ ok: false, text: "شناسه گیم‌نت یافت نشد." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const days = Number(durationDays) || 3;
      const now = new Date();
      const startAt = now.toISOString();
      const endAt = new Date(now.getTime() + days * 86400000).toISOString();

      let targetType: "GAMING_CENTER" | "STATION" = "GAMING_CENTER";
      let targetId: string = centerId;

      if (targetScope === "SPECIFIC_STATION") {
        targetType = "STATION";
        // Find matching station ID by name or fallback to first station
        const matched = stations.find((s) => s.name === targetDeviceName);
        if (matched) {
          targetId = matched.id;
        } else if (stations.length > 0) {
          targetId = stations[0].id;
        }
      } else {
        targetType = "GAMING_CENTER";
        targetId = centerId;
      }

      const payload: CreateDiscountInput = {
        targetType,
        targetId,
        valueType: discountType,
        value: valNum,
        startAt,
        endAt,
        isActive: true,
      };

      await discountService.createDiscount(centerId, payload);

      setOpenModal(false);
      resetForm();
      setMsg({
        ok: true,
        text: "تخفیف جدید با موفقیت ایجاد شد و برای گیمنت شما فعال گردید.",
      });

      // Refresh list to preserve server state
      await fetchDiscounts();
    } catch (err: any) {
      setMsg({
        ok: false,
        text: err?.message || "خطا در ثبت تخفیف در سرور.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCode("");
    setDiscountType("PERCENTAGE");
    setValue("20");
    setTargetScope("ALL");
    setTargetDeviceName("همه دستگاه‌ها");
    setDurationDays("3");
    setMaxUsage("50");
    setHasUsageLimit(true);
  };

  const toggleStatus = async (id: string) => {
    const target = discounts.find((d) => d.id === id);
    if (!target || !centerId) return;

    const nextState = !target.isActive;
    // Optimistic UI update
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isActive: nextState } : d))
    );

    try {
      await discountService.updateDiscountStatus(centerId, id, nextState);
    } catch (err: any) {
      // Revert on error
      setDiscounts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isActive: target.isActive } : d))
      );
      setMsg({
        ok: false,
        text: err?.message || "خطا در تغییر وضعیت تخفیف در سرور.",
      });
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!centerId) return;
    const prevList = [...discounts];
    // Optimistic removal
    setDiscounts((prev) => prev.filter((d) => d.id !== id));

    try {
      await discountService.deleteDiscount(centerId, id);
      setMsg({ ok: true, text: "تخفیف با موفقیت حذف گردید." });
    } catch (err: any) {
      // Revert on error
      setDiscounts(prevList);
      setMsg({
        ok: false,
        text: err?.message || "خطا در حذف تخفیف از سرور.",
      });
    }
  };

  // Base price sample calculation for live preview (clearly a visual preview)
  const sampleBasePrice = 120000; // 120,000 Tomans
  const numericVal = Number(value) || 0;
  const calculatedDiscountedPrice =
    discountType === "PERCENTAGE"
      ? Math.max(0, Math.round(sampleBasePrice * (1 - numericVal / 100)))
      : Math.max(0, sampleBasePrice - numericVal);

  const filteredDiscounts = discounts.filter((d) => {
    if (filter === "ACTIVE") return d.isActive;
    if (filter === "INACTIVE") return !d.isActive;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="مدیریت و ایجاد تخفیف" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-5">
        {/* Banner Info Box */}
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
              <h2 className="text-sm font-bold text-[var(--primary)]">
                تخفیف‌های ویژه گیمنت {center?.name ?? ""}
              </h2>
            </div>
            <span className="text-xs font-bold bg-[var(--primary)]/15 text-[var(--primary)] px-3 py-1 rounded-full border border-[var(--primary)]/20">
              {toPersianDigits(discounts.filter((d) => d.isActive).length)} تخفیف فعال
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            شما می‌توانید برای یک دستگاه خاص (مثل PS5 یا PC)، تمام دستگاه‌ها، با محدودیت تعداد استفاده یا زمان مشخص تخفیف تعریف کنید. این تخفیف‌ها مستقیماً در کارت گیمنت شما روی برنامه سایرا نمایش داده می‌شوند.
          </p>
        </div>

        {/* Global Feedback Message */}
        {msg && (
          <div
            className={`p-3.5 rounded-card text-xs font-bold flex items-center justify-between ${
              msg.ok
                ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
            }`}
          >
            <span>{msg.text}</span>
            <button type="button" onClick={() => setMsg(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-card text-xs font-bold bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchDiscounts()}
              className="text-xs underline cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Quick Action Button */}
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpenModal(true);
          }}
          className="h-12 rounded-card bg-[var(--primary)] text-on-primary font-bold text-sm hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-base font-bold">+</span>
          <span>ایجاد تخفیف جدید (دستگاه خاص / همه دستگاه‌ها)</span>
        </button>

        {/* Filter Tabs & Discounts Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>لیست تخفیف‌های ثبت‌شده</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">
              ({toPersianDigits(filteredDiscounts.length)} مورد)
            </span>
          </h3>

          <div className="flex bg-[var(--foreground)]/40 p-1 rounded-card border border-[var(--border-subtle)] text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-child transition-colors cursor-pointer ${
                filter === "ALL"
                  ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              همه
            </button>
            <button
              type="button"
              onClick={() => setFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-child transition-colors cursor-pointer ${
                filter === "ACTIVE"
                  ? "bg-[var(--bg-card)] text-[var(--accent-green)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              فعال
            </button>
            <button
              type="button"
              onClick={() => setFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-child transition-colors cursor-pointer ${
                filter === "INACTIVE"
                  ? "bg-[var(--bg-card)] text-[var(--text-muted)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              غیرفعال
            </button>
          </div>
        </div>

        {/* Discounts List */}
        {loading ? (
          <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] py-12 px-4 text-center flex flex-col items-center gap-2">
            <p className="text-xs text-[var(--text-muted)] font-medium">در حال دریافت تخفیف‌ها...</p>
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] py-12 px-4 text-center flex flex-col items-center gap-2">
            <p className="text-xs text-[var(--text-muted)] font-medium">هیچ تخفیفی در این بخش یافت نشد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 desk:grid-cols-2 gap-3.5">
            {filteredDiscounts.map((item) => {
              const usagePercent = item.maxUsage
                ? Math.min(100, Math.round((item.usedCount / item.maxUsage) * 100))
                : 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-card bg-[var(--bg-card)] border p-4 flex flex-col justify-between gap-3 transition-all ${
                    item.isActive
                      ? "border-[var(--border-subtle)] hover:border-[var(--primary)]/50"
                      : "border-[var(--border-subtle)] opacity-70"
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/15 px-2.5 py-1 rounded-full border border-[var(--primary)]/20">
                          {item.discountType === "PERCENTAGE"
                            ? `${toPersianDigits(item.value)}٪ تخفیف`
                            : `${formatPrice(item.value)} تومان تخفیف`}
                        </span>

                        <span className="text-xs font-bold bg-[var(--foreground)] text-[var(--text-white)] px-2.5 py-0.5 rounded-full border border-white/10">
                          {item.targetDeviceName}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[var(--text-white)] mt-1 truncate">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStatus(item.id)}
                      className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 transition-colors cursor-pointer ${
                        item.isActive
                          ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                          : "bg-[var(--foreground)] text-[var(--text-muted)] border border-white/10"
                      }`}
                    >
                      {item.isActive ? "فعال" : "غیرفعال"}
                    </button>
                  </div>

                  {/* Code & Scope Info */}
                  {item.code && (
                    <div className="flex items-center justify-between text-xs bg-[var(--foreground)]/30 px-3 py-1.5 rounded-card border border-[var(--border-subtle)]">
                      <span className="text-[var(--text-muted)]">کد اختصاصی:</span>
                      <span className="font-mono font-black text-[var(--primary)] tracking-wider" dir="ltr">
                        {item.code}
                      </span>
                    </div>
                  )}

                  {/* Usage Progress Bar */}
                  <div className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">
                        تعداد استفاده:{" "}
                        <strong className="text-[var(--text-white)]">
                          {toPersianDigits(item.usedCount)}
                        </strong>
                        {item.maxUsage ? ` از ${toPersianDigits(item.maxUsage)} بار` : " (نامحدود)"}
                      </span>
                      <span className="text-[var(--text-subtle)]">{item.expiresAt}</span>
                    </div>

                    {item.maxUsage && (
                      <div className="w-full h-1.5 rounded-full bg-[var(--foreground)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] transition-all duration-300"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] pt-1">
                    <span>تاریخ ایجاد: {toPersianDigits(item.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => deleteDiscount(item.id)}
                      className="text-[var(--accent-red)] hover:underline font-bold cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE DISCOUNT MODAL WITH LIVE CARD PREVIEW */}
      {openModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => !submitting && setOpenModal(false)}
        >
          <div
            className="w-full max-w-[880px] max-h-[92vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-4 sm:p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  ایجاد تخفیف جدید برای گیمنت
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  تنظیم تخفیف بر اساس دستگاه، مدت زمان اعتبار و تعداد استفاده
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--foreground)] text-[var(--text-muted)] hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Section */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--primary)]">ساخت سریع با الگوی آماده:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2.5 rounded-card bg-[var(--foreground)]/40 hover:bg-[var(--foreground)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-right transition-all flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-white">{p.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {p.discountType === "PERCENTAGE" ? `${toPersianDigits(p.value)}٪` : `${formatPrice(Number(p.value))} تومان`} | {toPersianDigits(p.durationDays)} روز
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form & Live Preview Grid */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* 1. Target Scope / Device Selection */}
                <div className="flex flex-col gap-2 bg-[var(--foreground)]/20 p-3.5 rounded-card border border-[var(--border-subtle)]">
                  <label className="text-xs font-bold text-[var(--text-white)] flex items-center gap-1.5">
                    <span>دستگاه‌های تحت تخفیف (یک دستگاه یا همه)</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetScope("ALL");
                        setTargetDeviceName("همه دستگاه‌ها");
                      }}
                      className={`h-9 px-2 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                        targetScope === "ALL"
                          ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                          : "bg-[var(--foreground)]/50 text-[var(--text-muted)] border-transparent hover:text-white"
                      }`}
                    >
                      همه دستگاه‌ها
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetScope("STATION_TYPE");
                        setTargetDeviceName("PLAYSTATION");
                      }}
                      className={`h-9 px-2 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                        targetScope === "STATION_TYPE"
                          ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                          : "bg-[var(--foreground)]/50 text-[var(--text-muted)] border-transparent hover:text-white"
                      }`}
                    >
                      نوع دستگاه
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetScope("SPECIFIC_STATION");
                        if (stations.length > 0) setTargetDeviceName(stations[0].name);
                        else setTargetDeviceName("دستگاه انتخاب‌شده");
                      }}
                      className={`h-9 px-2 rounded-card text-xs font-bold border transition-all cursor-pointer ${
                        targetScope === "SPECIFIC_STATION"
                          ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                          : "bg-[var(--foreground)]/50 text-[var(--text-muted)] border-transparent hover:text-white"
                      }`}
                    >
                      یک دستگاه خاص
                    </button>
                  </div>

                  {/* Sub-selection for station type or specific station */}
                  {targetScope === "STATION_TYPE" && (
                    <select
                      className={inputClass}
                      value={targetDeviceName}
                      onChange={(e) => setTargetDeviceName(e.target.value)}
                    >
                      <option value="PLAYSTATION">کنسول پلی‌استیشن (PS5 / PS4)</option>
                      <option value="PC">کامپیوتر گیمینگ (PC)</option>
                      <option value="XBOX">ایکس‌باکس (Xbox Series X/S)</option>
                      <option value="VR">واقعیت مجازی (VR)</option>
                      <option value="SWITCH">نینتندو سوییچ (Switch)</option>
                      <option value="BILLIARD">میز بیلیارد / اسنوکر</option>
                    </select>
                  )}

                  {targetScope === "SPECIFIC_STATION" && (
                    <select
                      className={inputClass}
                      value={targetDeviceName}
                      onChange={(e) => setTargetDeviceName(e.target.value)}
                    >
                      {stations.length > 0 ? (
                        stations.map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name} ({st.stationType}) - {formatPrice(st.hourlyPrice)} تومان
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="PS5 VIP #1">سیستم PS5 VIP شماره ۱</option>
                          <option value="PC Master #4">سیستم PC گیمینگ شماره ۴</option>
                          <option value="VR Room #1">اتاق واقعیت مجازی VR</option>
                        </>
                      )}
                    </select>
                  )}

                  <p className="text-xs text-[var(--text-muted)]">
                    با انتخاب یک دستگاه، تخفیف تنها روی گزینه‌های همان دستگاه اعمال می‌شود.
                  </p>
                </div>

                {/* 2. Discount Type & Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">نوع تخفیف</label>
                    <select
                      className={inputClass}
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")
                      }
                    >
                      <option value="PERCENTAGE">درصدی (٪)</option>
                      <option value="FIXED_AMOUNT">مبلغ ثابت (تومان)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      {discountType === "PERCENTAGE" ? "درصد تخفیف (۱ تا ۱۰۰)" : "مقدار کسر شده (تومان)"}
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      max={discountType === "PERCENTAGE" ? 100 : 10000000}
                      placeholder={discountType === "PERCENTAGE" ? "20" : "50000"}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                </div>

                {/* 3. Duration Selection (x مدت) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)] flex items-center justify-between">
                    <span>مدت زمان اعتبار تخفیف</span>
                    <span className="text-xs text-[var(--primary)]">
                      {toPersianDigits(durationDays)} روز اعتبار
                    </span>
                  </label>

                  <select
                    className={inputClass}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                  >
                    <option value="1">۱ روز (تخفیف ۲۴ ساعته)</option>
                    <option value="3">۳ روز (تخفیف آخر هفته)</option>
                    <option value="7">۷ روز (۱ هفته)</option>
                    <option value="14">۱۴ روز (۲ هفته)</option>
                    <option value="30">۳۰ روز (۱ ماه کامل)</option>
                  </select>
                  <p className="text-xs text-[var(--text-muted)]">
                    تخفیف پس از گذشت این تعداد روز به‌صورت خودکار غیرفعال خواهد شد.
                  </p>
                </div>

                {/* 4. Usage Limit Selection (x تعداد استفاده) */}
                <div className="flex flex-col gap-2 bg-[var(--foreground)]/20 p-3.5 rounded-card border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      محدودیت تعداد استفاده
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hasUsageLimit}
                        onChange={(e) => setHasUsageLimit(!e.target.checked)}
                        className="rounded"
                      />
                      <span>بدون محدودیت</span>
                    </label>
                  </div>

                  {hasUsageLimit ? (
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      placeholder="مثال: 30 استفاده"
                      value={maxUsage}
                      onChange={(e) => setMaxUsage(e.target.value)}
                    />
                  ) : (
                    <div className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex items-center text-xs text-[var(--primary)] font-bold">
                      استفاده نامحدود تا انقضای زمان
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    حداکثر تعداد رزروهایی که می‌توانند از این تخفیف استفاده نمایند.
                  </p>
                </div>

                {/* 5. Optional Title & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">عنوان تخفیف (اختیاری)</label>
                    <input
                      className={inputClass}
                      placeholder="مثال: جشنواره بهاره PS5"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">عبارت کد تخفیف (اختیاری)</label>
                    <input
                      className={inputClass}
                      dir="ltr"
                      placeholder="مثال: GAMER20"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-12 rounded-card bg-[var(--primary)] text-on-primary font-bold text-sm disabled:opacity-60 transition-all shadow-md cursor-pointer"
                  >
                    {submitting ? "در حال ثبت تخفیف..." : "ثبت و فعال‌سازی تخفیف"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenModal(false)}
                    className="h-12 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold hover:bg-[var(--foreground)]/80 cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview Card */}
              <div className="lg:col-span-5 flex flex-col gap-3 sticky top-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--primary)]">
                    پیش‌نمایش کارت گیمنت برای کاربران
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">نمایش زنده</span>
                </div>

                {/* Simulated Game Center Card */}
                <div className="w-full flex flex-col bg-[var(--bg-card)] rounded-card overflow-hidden border border-[var(--primary)]/50 shadow-xl relative">
                  {/* Image & Badges Container */}
                  <div className="relative w-full aspect-[16/10] bg-[#151518] overflow-hidden">
                    <img
                      src="/context/sayra-slide-1.jpg"
                      onError={(e) => {
                        // Fallback image if local context photo is missing
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop";
                      }}
                      alt={center?.name ?? "گیمنت"}
                      className="w-full h-full object-cover"
                    />

                    {/* Discount Badge (Top-Left) */}
                    <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-[var(--primary)] text-on-primary font-bold text-xs shadow-lg flex items-center gap-1 z-10">
                      <span>
                        {discountType === "PERCENTAGE"
                          ? `${toPersianDigits(value || "0")}٪ تخفیف`
                          : `${formatPrice(Number(value) || 0)} تومان تخفیف`}
                      </span>
                    </div>

                    {/* Scope Badge (Top-Right) */}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/15 z-10">
                      {targetDeviceName}
                    </div>

                    {/* Duration Badge (Bottom-Right) */}
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-bold border border-white/10 z-10">
                      تا {toPersianDigits(durationDays)} روز دیگر
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 text-xs text-[var(--accent-star)] font-bold">
                      <span>۴.۸</span>
                      <span className="text-[var(--text-muted)] font-normal">(۴۲ نظر)</span>
                    </div>

                    <h4 className="text-sm font-bold text-[var(--text-white)]">
                      {center?.name ?? "گیمنت گرگدن"}
                    </h4>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                      {center?.description ?? "تبریز، ولیعصر، خیابان قانون"}
                    </p>

                    {/* Calculated Price Section */}
                    <div className="mt-2 h-10 rounded-full bg-[var(--foreground)]/50 px-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[var(--primary)] text-sm">
                          {formatPrice(calculatedDiscountedPrice)} تومان
                        </span>
                        <span className="text-xs line-through text-[var(--text-subtle)] font-medium">
                          {formatPrice(sampleBasePrice)}
                        </span>
                      </div>
                      <span className="text-[var(--text-muted)] text-xs">/ ۱ساعته</span>
                    </div>

                    {/* Usage Banner Indicator */}
                    {hasUsageLimit && maxUsage && (
                      <div className="mt-1 text-xs font-bold text-center text-[var(--primary)] bg-[var(--primary)]/10 py-1 rounded-card border border-[var(--primary)]/20">
                        سقف استفاده: {toPersianDigits(maxUsage)} نفر اول
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed">
                  <strong className="text-[var(--text-white)]">راهنمای صاحب گیمنت:</strong> این کارت همان شکل نمایشی است که بازیکنان هنگام مشاهده لیست گیمنت‌ها در اپلیکیشن دیده‌اند.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
