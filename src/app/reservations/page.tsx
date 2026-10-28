"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomBar } from "@/components/BottomBar";
import { FirstReservationStrip } from "@/components/FirstReservationStrip";
import { ReservationHistoryCard } from "@/components/ReservationHistoryCard";
import { RatingModal } from "@/components/RatingModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { reservationService } from "@/services/reservationService";
import type { Reservation } from "@/types/reservation";

export default function ReservationsHistoryPage() {
  const { isLoggedIn, isLoading: isAuthLoading, login } = useAuth();
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<Reservation | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Only fetch history if the user is authenticated and auth initialization finished
    if (!isLoggedIn) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    reservationService
      .list(controller.signal)
      .then((data) => {
        if (!active) return;
        setItems(data);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setItems([]);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isLoggedIn, reloadToken]);

  const handleRetry = () => {
    setItems(null);
    setReloadToken((v) => v + 1);
  };

  const handleAuthSuccess = (fullName: string, phone: string, token?: string) => {
    login(fullName, phone, token);
    setIsAuthModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <Header locationName="تبریز" />

      <main className="flex-1 pt-[var(--header-h)] flex flex-col">


        {/* Loading State (Auth initializing or items fetching) */}
        {(isAuthLoading || (isLoggedIn && items === null)) && (
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-4 lg:px-8">
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

        {/* Unauthenticated State */}
        {!isAuthLoading && !isLoggedIn && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary)] shadow-lg">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h2 className="text-base font-black text-[var(--text-white)]">
                مشاهده تاریخچه رزروها نیازمند ورود است
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                جهت دسترسی به تاریخچه رزروهای اختصاصی خود، لطفاً ابتدا وارد حساب کاربری‌تان شوید.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="h-12 px-8 mt-2 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>ورود / ثبت‌نام در حساب کاربری</span>
              <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}

        {/* Error State */}
        {isLoggedIn && items !== null && error && (
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

        {/* Empty State */}
        {isLoggedIn && items !== null && !error && items.length === 0 && (
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

        {/* Reservation List */}
        {isLoggedIn && items !== null && !error && items.length > 0 && (
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-4 lg:px-8">
            {items.map((r) => (
              <ReservationHistoryCard key={r.id} reservation={r} onRate={setRatingTarget} />
            ))}
          </div>
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <RatingModal
        isOpen={!!ratingTarget}
        reservationId={ratingTarget?.id ?? null}
        onClose={() => setRatingTarget(null)}
        onSuccess={() => {
          setRatingTarget(null);
          setReloadToken((v) => v + 1);
        }}
      />

      <BottomBar activeTab="history" />
    </div>
  );
}
