"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { toPersianDigits } from "@/lib/format";

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  cityName?: string;
  provinceName?: string;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  cityName,
  provinceName,
}) => {
  const [zoomLevel, setZoomLevel] = useState(14);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x - rect.width / 2) / (rect.width / 2);
    const normY = (y - rect.height / 2) / (rect.height / 2);

    const spread = 0.04 / Math.max(1, zoomLevel - 10);
    const newLng = Number((longitude + normX * spread).toFixed(6));
    const newLat = Number((latitude - normY * spread).toFixed(6));

    onChange(newLat, newLng);
  };

  const handleStep = (direction: "up" | "down" | "left" | "right") => {
    const delta = 0.002;
    if (direction === "up") onChange(Number((latitude + delta).toFixed(6)), longitude);
    if (direction === "down") onChange(Number((latitude - delta).toFixed(6)), longitude);
    if (direction === "left") onChange(latitude, Number((longitude - delta).toFixed(6)));
    if (direction === "right") onChange(latitude, Number((longitude + delta).toFixed(6)));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[var(--text-white)] flex items-center gap-1.5">
          <Icon name="pin" size={16} className="text-[var(--primary)]" />
          انتخاب موقعیت روی نقشه
        </label>
        <div className="text-[11px] font-black text-[var(--text-subtle)] font-mono dir-ltr">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-56 sm:h-64 rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[#1e232a] select-none">
        {/* Stylized Vector Grid Background */}
        <div
          onClick={handleMapClick}
          className="absolute inset-0 cursor-crosshair overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(184, 243, 74, 0.08) 0%, transparent 60%),
              linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 32px 32px, 32px 32px",
          }}
        >
          {/* Simulated Roads / Geometry Lines */}
          <svg className="w-full h-full pointer-events-none opacity-30">
            <line x1="0" y1="35%" x2="100%" y2="40%" stroke="#4a5568" strokeWidth="4" />
            <line x1="15%" y1="0" x2="25%" y2="100%" stroke="#4a5568" strokeWidth="3" />
            <line x1="70%" y1="0" x2="60%" y2="100%" stroke="#4a5568" strokeWidth="4" />
            <line x1="0" y1="75%" x2="100%" y2="70%" stroke="#718096" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="50%" cy="50%" r="80" stroke="rgba(184, 243, 74, 0.15)" strokeWidth="1" fill="none" />
          </svg>

          {/* Centered Map Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center">
            <div className="px-2 py-0.5 rounded bg-[var(--bg-card)]/90 border border-[var(--primary)] text-[10px] font-bold text-[var(--primary)] mb-1 shadow-lg whitespace-nowrap">
              موقعیت گیم‌نت {cityName ? `(${cityName})` : ""}
            </div>
            <div className="relative">
              <Icon
                name="pin"
                size={34}
                className="text-[var(--primary)] drop-shadow-[0_4px_10px_rgba(184,243,74,0.5)] fill-[var(--primary)]"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 rounded-full bg-black/60 blur-[1px]"></span>
            </div>
          </div>
        </div>

        {/* Floating Zoom Controls Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(18, z + 1))}
            className="w-8 h-8 rounded bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-[var(--text-white)] text-sm font-black flex items-center justify-center hover:bg-[var(--foreground)] active:scale-95 transition-all shadow"
            title="بزرگنمایی"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(8, z - 1))}
            className="w-8 h-8 rounded bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-[var(--text-white)] text-sm font-black flex items-center justify-center hover:bg-[var(--foreground)] active:scale-95 transition-all shadow"
            title="کوچک‌نمایی"
          >
            -
          </button>
        </div>

        {/* Direction Controls */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 z-10 bg-[var(--bg-card)]/80 p-1 rounded border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => handleStep("up")}
            className="w-6 h-6 text-xs text-[var(--text-white)] hover:text-[var(--primary)] flex items-center justify-center font-bold"
            title="حرکت به بالا"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => handleStep("down")}
            className="w-6 h-6 text-xs text-[var(--text-white)] hover:text-[var(--primary)] flex items-center justify-center font-bold"
            title="حرکت به پایین"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => handleStep("right")}
            className="w-6 h-6 text-xs text-[var(--text-white)] hover:text-[var(--primary)] flex items-center justify-center font-bold"
            title="حرکت به راست"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => handleStep("left")}
            className="w-6 h-6 text-xs text-[var(--text-white)] hover:text-[var(--primary)] flex items-center justify-center font-bold"
            title="حرکت به چپ"
          >
            ←
          </button>
        </div>

        {/* Location Hint at bottom right */}
        <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded bg-[var(--bg-card)]/85 border border-[var(--border-subtle)] text-[10px] text-[var(--text-subtle)] flex items-center gap-1.5 shadow">
          <span>برای جابجایی نشانگر، روی نقشه کلیک کنید</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--text-subtle)]">عرض جغرافیایی (Latitude):</span>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, longitude)}
            className="w-full h-9 px-2.5 rounded bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-white)] focus:border-[var(--primary)] outline-none dir-ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--text-subtle)]">طول جغرافیایی (Longitude):</span>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onChange(latitude, parseFloat(e.target.value) || 0)}
            className="w-full h-9 px-2.5 rounded bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-white)] focus:border-[var(--primary)] outline-none dir-ltr"
          />
        </div>
      </div>
    </div>
  );
};
