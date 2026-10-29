"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService, pickNumber } from "@/services/ownerService";
import type { Earning } from "@/types/owner";

const STATUS_LABEL: Record<Earning["status"], string> = {
  PENDING: "در انتظار",
  ACCRUED: "محاسبه‌شده",
  CHARGED: "تسویه‌شده",
  WAIVED: "بخشوده",
  REFUNDED: "بازگشت‌شده",
};

export default function OwnerWithdrawPage() {
  const { centerId } = useOwner();
  const [amount, setAmount] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<Earning[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([ownerService.getAnalyticsSummary(centerId), ownerService.listCommissions(centerId)]).then(
      ([s, c]) => {
        if (!active) return;
        if (s.status === "fulfilled") {
          setAmount(pickNumber(s.value, ["withdrawableAmount", "withdrawableRevenue", "netRevenue", "totalRevenue", "revenue"]));
        } else setError(getErrorMessage(s.reason));
        setEarnings(c.status === "fulfilled" ? c.value : []);
      }
    );
    return () => {
      active = false;
    };
  }, [centerId]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="برداشت موجودی" />

      <main className="flex-1 mt-16 px-4 py-4 flex flex-col gap-4 w-full max-w-[var(--max-profile-width)] mx-auto lg:px-0">
        <div className="rounded-card bg-[var(--primary)] text-on-primary p-5 flex flex-col gap-1">
          <span className="text-xs opacity-80">درآمد قابل برداشت</span>
          <span className="text-3xl font-black">{amount === null ? "—" : `${formatPrice(amount)} تومان`}</span>
        </div>

        {error && <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>}

        <button
          type="button"
          disabled
          className="h-12 rounded-card bg-[var(--foreground)] text-[var(--text-muted)] font-bold text-sm opacity-70"
        >
          ثبت درخواست برداشت (به‌زودی)
        </button>

        <h2 className="text-sm font-bold mt-2">کمیسیون‌های رزرو</h2>
        {earnings === null && <div className="h-20 rounded-card bg-[var(--bg-card)] animate-pulse" />}
        {earnings && earnings.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--text-muted)]">موردی ثبت نشده است.</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {earnings?.map((e) => (
            <div key={e.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">{STATUS_LABEL[e.status] ?? e.status}</span>
              <span className="font-black">{formatPrice(e.commissionAmount)} {e.currency ?? "تومان"}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}