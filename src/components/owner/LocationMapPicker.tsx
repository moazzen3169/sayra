"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { LeafletMap } from "@/components/map/LeafletMap";

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  onChange: (lat: number, lng: number) => void;
  cityName?: string;
  provinceName?: string;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  zoom = 14,
  onChange,
  cityName,
}) => {
  const safeLat = Number.isFinite(latitude) ? latitude : 37.5527;
  const safeLng = Number.isFinite(longitude) ? longitude : 45.0761;
  const markerLabel = cityName ? `موقعیت گیم‌نت (${cityName})` : "موقعیت گیم‌نت";

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[var(--text-white)] flex items-center gap-1.5">
          <Icon name="pin" size={16} className="text-[var(--primary)]" />
          انتخاب موقعیت روی نقشه
        </label>
        <div className="text-[11px] font-black text-[var(--text-subtle)] font-mono dir-ltr">
          {safeLat.toFixed(5)}, {safeLng.toFixed(5)}
        </div>
      </div>

      {/* Interactive Leaflet + OpenStreetMap Container */}
      <div className="relative w-full">
        <LeafletMap
          latitude={safeLat}
          longitude={safeLng}
          zoom={zoom}
          interactive={true}
          onSelect={onChange}
          markerLabel={markerLabel}
        />

        {/* Location Hint at bottom right */}
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-[400] px-2.5 py-1 rounded bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-[10px] text-[var(--text-subtle)] flex items-center gap-1.5 shadow">
          <span>برای ثبت یا جابجایی نشانگر، روی نقشه کلیک کنید</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--text-subtle)]">عرض جغرافیایی (Latitude):</span>
          <input
            type="number"
            step="any"
            value={safeLat}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) onChange(val, safeLng);
            }}
            className="w-full h-9 px-2.5 rounded bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-white)] focus:border-[var(--primary)] outline-none dir-ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--text-subtle)]">طول جغرافیایی (Longitude):</span>
          <input
            type="number"
            step="any"
            value={safeLng}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) onChange(safeLat, val);
            }}
            className="w-full h-9 px-2.5 rounded bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-white)] focus:border-[var(--primary)] outline-none dir-ltr"
          />
        </div>
      </div>
    </div>
  );
};
