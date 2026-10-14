"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomBar } from "@/components/BottomBar";
import { FirstReservationStrip } from "@/components/FirstReservationStrip";
import { ReservationHistoryCard } from "@/components/ReservationHistoryCard";
import { RatingModal } from "@/components/RatingModal";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { reservationService } from "@/services/reservationService";
import type { Reservation } from "@/types/reservation";

export default function ReservationsHistoryPage() {
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<Reservation | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const data = await reservationService.list(signal);
      setItems(data);
    } catch (e) {
      if (isAbortError(e)) return;
      setError(getErrorMessage(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleRetry = () => {
    setItems(null);
    load();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28">
      <Header locationName="تبریز" />

      <main className="flex-1 mt-[124px] flex flex-col">
        <div className="px-4 py-3">
          <FirstReservationStrip />
        </div>

        {/* Loading */}
        {items === null && (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-5 flex flex-col gap-3.5 border-b border-[var(--border-color)] animate-pulse">
                <div className="flex justify-between">
                  <div className="h-5 w-32 rounded-child bg-[var(--bg-card)]" />
                  <div className="h-5 w-16 rounded-child bg-[var(--bg-card)]" />
                </div>
                <div className="h-4 w-full rounded-child bg-[var(--bg-card)]" />
                <div className="h-12 w-full rounded-card bg-[var(--bg-card)]" />
                <div className="h-12 w-full rounded-card bg-[var(--bg-card)]" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {items !== null && error && (
          <div className="mx-4 mt-4 p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-bold text-[var(--accent-red)]">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="h-10 px-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-white)]"
            >
              تلاش دوباره
            </button>
          </div>
        )}

        {/* Empty */}
        {items !== null && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-subtle)]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5M12 7v5l3 2" />
              </svg>
            </div>
            <p className="text-sm font-extrabold text-[var(--text-white)]">هنوز رزروی ثبت نکرده‌اید</p>
            <p className="text-xs text-[var(--text-muted)]">رزروهای شما اینجا نمایش داده می‌شوند.</p>
          </div>
        )}

        {/* List */}
        {items !== null && !error && items.length > 0 && (
          <div className="flex flex-col">
            {items.map((r) => (
              <ReservationHistoryCard key={r.id} reservation={r} onRate={setRatingTarget} />
            ))}
          </div>
        )}
      </main>

      <RatingModal
        isOpen={!!ratingTarget}
        reservationId={ratingTarget?.id ?? null}
        onClose={() => setRatingTarget(null)}
        onSuccess={() => {
          setRatingTarget(null);
          load();
        }}
      />

      <BottomBar activeTab="history" />
    </div>
  );
}