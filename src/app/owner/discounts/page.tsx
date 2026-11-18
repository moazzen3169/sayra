"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatDiscountBadge } from "@/lib/discount";
import { toPersianDigits } from "@/lib/format";
import { discountService, type Discount } from "@/services/discountService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import { ownerService } from "@/services/ownerService";

type FilterStatus = "ALL" | "ACTIVE" | "INACTIVE";

function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function getExpiryStatus(endAtIso?: string): {
  label: string;
  expired: boolean;
} {
  if (!endAtIso) return { label: "بدون تاریخ", expired: false };
  const end = new Date(endAtIso).getTime();
  if (isNaN(end)) return { label: "نامشخص", expired: false };
  const diffMs = end - Date.now();
  if (diffMs <= 0) return { label: "منقضی شده", expired: true };
  const days = Math.ceil(diffMs / 86400000);
  if (days === 1) return { label: "۱ روز مانده", expired: false };
  return { label: `${toPersianDigits(days)} روز مانده`, expired: false };
}

function OwnerDiscountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { centerId, isCenterLoading } = useOwner();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [stations, setStations] = useState<GameStationInfo[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    searchParams.get("created") === "1"
      ? { ok: true, text: "تخفیف جدید ثبت و فعال شد." }
      : null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    ownerService
      .listStations(centerId, controller.signal)
      .then(setStations)
      .catch((err) => {
        if (!isAbortError(err)) {
          // Non-critical: station names fall back to generic label
        }
      });
    return () => controller.abort();
  }, [centerId]);

  const fetchDiscounts = useCallback(
    async (signal?: AbortSignal) => {
      if (!centerId) return;
      setLoading(true);
      setError(null);
      try {
        const list = await discountService.listDiscounts(centerId, { signal });
        setDiscounts(list);
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "خطا در دریافت تخفیف‌ها";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [centerId]
  );

  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    let active = true;
    discountService
      .listDiscounts(centerId, { signal: controller.signal })
      .then((list) => {
        if (!active) return;
        setDiscounts(list);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active || isAbortError(err)) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "خطا در دریافت تخفیف‌ها";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId]);

  const stationMap = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations]
  );

  const filteredDiscounts = useMemo(() => {
    if (filter === "ACTIVE") return discounts.filter((d) => d.isActive);
    if (filter === "INACTIVE") return discounts.filter((d) => !d.isActive);
    return discounts;
  }, [discounts, filter]);

  const activeCount = useMemo(
    () => discounts.filter((d) => d.isActive).length,
    [discounts]
  );

  const toggleStatus = async (item: Discount) => {
    if (!centerId) return;
    const nextState = !item.isActive;
    setDiscounts((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, isActive: nextState } : d))
    );

    try {
      await discountService.updateDiscountStatus(centerId, item.id, nextState);
    } catch (err: unknown) {
      setDiscounts((prev) =>
        prev.map((d) =>
          d.id === item.id ? { ...d, isActive: item.isActive } : d
        )
      );
      const message =
        err instanceof Error && err.message
          ? err.message
          : "تغییر وضعیت انجام نشد.";
      setNotice({ ok: false, text: message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!centerId) return;
    const prevList = discounts;
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteId(null);

    try {
      await discountService.deleteDiscount(centerId, id);
      setNotice({ ok: true, text: "تخفیف حذف شد." });
    } catch (err: unknown) {
      setDiscounts(prevList);
      const message =
        err instanceof Error && err.message ? err.message : "حذف تخفیف انجام نشد.";
      setNotice({ ok: false, text: message });
    }
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "ALL", label: "همه", count: discounts.length },
    { key: "ACTIVE", label: "فعال", count: activeCount },
    {
      key: "INACTIVE",
      label: "غیرفعال",
      count: discounts.length - activeCount,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="تخفیف‌ها" isSubpage backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-5 lg:max-w-[var(--max-mini-app-width)] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-4">
        {/* Top Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-[var(--foreground)]/40 p-1 rounded-card border border-[var(--border-subtle)] text-xs font-bold w-full sm:w-auto">
            {filterTabs.map((tab) => {
              const selected = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-child transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    selected
                      ? "bg-[var(--bg-card)] text-[var(--text-white)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[11px] opacity-70">
                    {toPersianDigits(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>

          <Link
            href="/owner/discounts/new"
            className="h-11 px-5 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Icon name="plus" size={18} />
            <span>تخفیف جدید</span>
          </Link>
        </div>

        {/* Alerts */}
        {notice && (
          <InlineAlert
            variant={notice.ok ? "success" : "error"}
            action={
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
                aria-label="بستن"
              >
                ✕
              </button>
            }
          >
            {notice.text}
          </InlineAlert>
        )}

        {error && (
          <InlineAlert
            variant="error"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchDiscounts()}
              >
                تلاش مجدد
              </Button>
            }
          >
            {error}
          </InlineAlert>
        )}

        {/* List */}
        {isCenterLoading || loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <EmptyState
              title={
                discounts.length === 0
                  ? "هنوز تخفیفی ندارید"
                  : "تخفیفی در این بخش نیست"
              }
              description={
                discounts.length === 0
                  ? "یک تخفیف برای کل گیم‌نت یا یک دستگاه خاص بسازید."
                  : undefined
              }
              actionLabel={discounts.length === 0 ? "ساخت تخفیف" : undefined}
              onAction={
                discounts.length === 0
                  ? () => router.push("/owner/discounts/new")
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredDiscounts.map((item) => {
              const targetLabel =
                item.targetType === "STATION"
                  ? stationMap.get(item.targetId) ?? "دستگاه اختصاصی"
                  : "کل گیم‌نت";
              const expiry = getExpiryStatus(item.endAt);
              const isConfirming = confirmDeleteId === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-card bg-[var(--bg-card)] border p-4 flex flex-col justify-between gap-3.5 transition-all ${
                    item.isActive
                      ? "border-[var(--border-subtle)]"
                      : "border-[var(--border-subtle)] opacity-65"
                  }`}
                >
                  {/* Top: Amount + Status Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black text-[var(--primary)]">
                      {formatDiscountBadge(item.valueType, item.value)}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                        item.isActive
                          ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border-[var(--accent-green)]/30"
                          : "bg-[var(--foreground)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                      }`}
                    >
                      {item.isActive ? "فعال" : "غیرفعال"}
                    </button>
                  </div>

                  {/* Middle: Scope + Expiry */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Badge variant="neutral">{targetLabel}</Badge>
                    <span
                      className={
                        expiry.expired
                          ? "text-[var(--accent-red)] font-bold"
                          : "text-[var(--text-muted)]"
                      }
                    >
                      {expiry.label}
                    </span>
                  </div>

                  {/* Footer: Dates + Delete */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] border-t border-[var(--border-subtle)] pt-2.5">
                    <span>
                      {formatShortDate(item.startAt)} تا{" "}
                      {formatShortDate(item.endAt)}
                    </span>

                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-[var(--accent-red)] font-bold hover:underline cursor-pointer"
                        >
                          تایید حذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[var(--text-muted)] hover:text-[var(--text-white)] cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-red)] font-bold transition-colors cursor-pointer"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function OwnerDiscountsPage() {
  return (
    <Suspense>
      <OwnerDiscountsContent />
    </Suspense>
  );
}
