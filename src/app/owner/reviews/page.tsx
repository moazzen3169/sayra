"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { OwnerRating } from "@/types/owner";

export default function OwnerReviewsPage() {
  const { centerId, center } = useOwner();
  const [items, setItems] = useState<OwnerRating[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!center?.slug) return;
    let active = true;
    const c = new AbortController();
    ownerService
      .listRatings(center.slug, c.signal)
      .then((d) => {
        if (!active) return;
        setItems(d);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setItems([]);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [center?.slug, reload]);

  const moderate = async (id: string, status: "HIDDEN" | "DELETED") => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      await ownerService.setRatingStatus(centerId, id, status);
      setReload((v) => v + 1);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const avg =
    items && items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="نظرات" />

      <main className="flex-1 mt-16 px-4 desk:px-6 lg:px-8 py-4 flex flex-col gap-3">
        {!center?.slug && <p className="text-xs text-[var(--text-muted)]">اطلاعات گیمنت (slug) در دسترس نیست.</p>}
        {error && <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>}
        {items === null && center?.slug && <div className="h-24 rounded-card bg-[var(--bg-card)] animate-pulse" />}

        {avg !== null && (
          <div className="rounded-card bg-[var(--bg-card)] p-4 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">میانگین امتیاز</span>
            <span className="font-black text-[var(--accent-star)]">
              ★ {toPersianDigits(avg.toFixed(1))}{" "}
              <span className="text-xs text-[var(--text-muted)] font-normal">({toPersianDigits(items!.length)} نظر)</span>
            </span>
          </div>
        )}

        {items && items.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">هنوز نظری ثبت نشده است.</p>
        )}

        {items?.map((r) => (
          <div key={r.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{r.customerName ?? "کاربر سایرا"}</span>
              <span className="text-xs font-black text-[var(--accent-star)]">★ {toPersianDigits(r.rating)}</span>
            </div>
            {r.comment && <p className="text-xs text-[var(--text-muted)] leading-relaxed">{r.comment}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => moderate(r.id, "HIDDEN")}
                className="h-9 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold disabled:opacity-50"
              >
                مخفی کردن
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => moderate(r.id, "DELETED")}
                className="h-9 px-4 rounded-card border border-[var(--accent-red)]/50 text-[var(--accent-red)] text-xs font-bold disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
