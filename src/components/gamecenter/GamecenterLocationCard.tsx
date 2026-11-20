"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LeafletMap } from "@/components/map/LeafletMap";
import { Icon } from "@/components/ui/Icon";

const ReservationRouteMap = dynamic(
  () =>
    import("@/components/map/ReservationRouteMap").then(
      (mod) => mod.ReservationRouteMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 w-full h-full bg-[var(--bg-body)] flex items-center justify-center text-xs text-[var(--text-muted)]">
        در حال بارگذاری نقشه مسیریابی...
      </div>
    ),
  }
);

interface GamecenterLocationCardProps {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
}

export const GamecenterLocationCard: React.FC<GamecenterLocationCardProps> = ({
  lat,
  lng,
  title,
  address,
}) => {
  const [modalMode, setModalMode] = useState<"view" | "route" | null>(null);

  useEffect(() => {
    if (!modalMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalMode(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalMode]);

  return (
    <>
      <div className="flex items-center gap-2 lg:gap-3">
        <button
          type="button"
          onClick={() => setModalMode("view")}
          className="h-8 px-3 lg:h-11 lg:px-5 lg:gap-2 lg:text-sm inline-flex items-center justify-center gap-1.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
        >
          <Icon name="pin" size={14} />
          <span>مشاهده روی نقشه</span>
        </button>

        <button
          type="button"
          onClick={() => setModalMode("route")}
          className="h-8 px-3 lg:h-11 lg:px-5 lg:gap-2 lg:text-sm inline-flex items-center justify-center gap-1.5 rounded-card bg-[var(--primary)] text-[var(--text-on-primary)] text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 016 6v5" />
          </svg>
          <span>مسیریابی</span>
        </button>
      </div>

      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            modalMode === "route"
              ? "مسیریابی تا گیمنت روی نقشه"
              : "مشاهده موقعیت گیمنت روی نقشه"
          }
          className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-body)]"
        >
          <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="pin" size={18} className="text-[var(--primary)] shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[var(--text-white)] truncate">
                  {title || "موقعیت گیمنت"}
                </span>
                {address && (
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {address}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {modalMode === "view" ? (
                <button
                  type="button"
                  onClick={() => setModalMode("route")}
                  className="h-9 px-3 inline-flex items-center gap-1.5 rounded-card bg-[var(--primary)] text-[var(--text-on-primary)] text-xs font-bold hover:brightness-105 transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 016 6v5" />
                  </svg>
                  <span>مسیریابی</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalMode("view")}
                  className="h-9 px-3 inline-flex items-center gap-1.5 rounded-card bg-[var(--foreground)]/60 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  <Icon name="pin" size={14} />
                  <span>موقعیت گیمنت</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalMode(null)}
                aria-label="بستن نقشه"
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-card bg-[var(--foreground)]/60 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)] transition-colors cursor-pointer"
              >
                <Icon name="close" size={16} />
                <span>بستن</span>
              </button>
            </div>
          </header>

          <div className="relative flex-1 w-full flex flex-col">
            {modalMode === "route" ? (
              <ReservationRouteMap
                destLat={lat}
                destLng={lng}
                destName={title}
                destAddress={address}
                fullHeight
              />
            ) : (
              <LeafletMap
                latitude={lat}
                longitude={lng}
                zoom={16}
                interactive={false}
                markerLabel={title}
                className="!h-full w-full !rounded-none !border-0"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};
