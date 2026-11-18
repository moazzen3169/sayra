"use client";

import React, { useEffect, useState } from "react";
import { LeafletMap } from "@/components/map/LeafletMap";
import { Icon } from "@/components/ui/Icon";
import { neshanCoordsUrl } from "@/lib/reservationUi";

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
  const [isMapOpen, setIsMapOpen] = useState(false);
  const neshanHref = neshanCoordsUrl(lat, lng);

  useEffect(() => {
    if (!isMapOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMapOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMapOpen]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsMapOpen(true)}
          className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
        >
          <Icon name="pin" size={14} />
          <span>مشاهده روی نقشه</span>
        </button>

        <a
          href={neshanHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-card bg-[var(--primary)] text-[var(--text-on-primary)] text-xs font-bold hover:brightness-105 active:scale-95 transition-all"
        >
          <span>مسیریابی</span>
          <Icon name="external-link" size={14} />
        </a>
      </div>

      {isMapOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="مشاهده موقعیت گیمنت روی نقشه"
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
              <a
                href={neshanHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-card bg-[var(--primary)] text-[var(--text-on-primary)] text-xs font-bold hover:brightness-105 transition-all"
              >
                <span>مسیریابی</span>
                <Icon name="external-link" size={14} />
              </a>

              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                aria-label="بستن نقشه"
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-card bg-[var(--foreground)]/60 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)] transition-colors cursor-pointer"
              >
                <Icon name="close" size={16} />
                <span>بستن</span>
              </button>
            </div>
          </header>

          <div className="relative flex-1 w-full">
            <LeafletMap
              latitude={lat}
              longitude={lng}
              zoom={16}
              interactive={false}
              markerLabel={title}
              className="!h-full w-full !rounded-none !border-0"
            />
          </div>
        </div>
      )}
    </>
  );
};
