"use client";

import React, { useState, useEffect, useRef } from "react";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

interface TimePickerProps {
  label: string;
  value: string; // "HH:mm"
  onChange: (val: string) => void;
  helperText?: string;
  presetTimes?: string[];
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  helperText,
  presetTimes = ["10:00", "12:00", "14:00", "16:00", "20:00", "22:00", "23:00", "00:00", "02:00", "04:00"],
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize HH and mm
  const parts = (value || "10:00").split(":");
  let rawH = parseInt(toEnglishDigits(parts[0] || "10"), 10);
  let rawM = parseInt(toEnglishDigits(parts[1] || "00"), 10);
  if (isNaN(rawH) || rawH < 0 || rawH > 23) rawH = 10;
  if (isNaN(rawM) || rawM < 0 || rawM > 59) rawM = 0;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelectHour = (h: number) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(rawM).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const handleSelectMinute = (m: number) => {
    const hh = String(rawH).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const formattedDisplay = `${toPersianDigits(String(rawH).padStart(2, "0"))}:${toPersianDigits(String(rawM).padStart(2, "0"))}`;

  return (
    <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-[var(--text-white)] flex items-center justify-between">
        <span>{label}</span>
        {helperText && <span className="text-[11px] text-[var(--text-muted)] font-normal">{helperText}</span>}
      </label>

      {/* Main Trigger Input Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`h-12 px-3.5 rounded-card bg-[var(--foreground)]/40 border transition-all flex items-center justify-between cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed border-[var(--border-subtle)]" : isOpen ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border-subtle)] hover:border-[var(--primary)]/60"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <Icon name="clock" size={18} />
          </div>
          <span className="text-base font-bold text-[var(--text-white)] tracking-wider">
            ساعت {formattedDisplay}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Native HTML5 fallback button for mobile convenience */}
          <input
            type="time"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 opacity-0 absolute left-3 z-10 cursor-pointer"
            aria-label={label}
          />
          <Icon name="chevron" size={16} className={`text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Quick Presets Pills */}
      {presetTimes && presetTimes.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          <span className="text-[10px] text-[var(--text-subtle)] shrink-0 ml-1">پیش‌فرض:</span>
          {presetTimes.map((preset) => {
            const isSelected = value === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => onChange(preset)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? "bg-[var(--primary)] text-black font-bold shadow-sm"
                    : "bg-[var(--foreground)]/30 hover:bg-[var(--foreground)]/60 text-[var(--text-muted)] hover:text-[var(--text-white)] border border-[var(--border-subtle)]"
                }`}
              >
                {toPersianDigits(preset)}
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown Interactive Picker */}
      {isOpen && (
        <div className="absolute top-[102%] right-0 left-0 z-50 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl flex flex-col gap-3.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-white)]">انتخاب زمان دقیق</span>
            <div className="text-xs font-mono font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-md">
              {formattedDisplay}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Hour Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[var(--text-muted)] text-center">ساعت (۰ تا ۲۳)</span>
              <div className="max-h-44 overflow-y-auto grid grid-cols-3 gap-1 p-1 bg-[var(--foreground)]/20 rounded-lg border border-[var(--border-subtle)]/40 scrollbar-thin">
                {hours.map((h) => {
                  const isHSelected = h === rawH;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`h-8 rounded-md text-xs font-bold transition-all ${
                        isHSelected
                          ? "bg-[var(--primary)] text-black shadow-sm"
                          : "text-[var(--text-white)] hover:bg-[var(--foreground)]/60"
                      }`}
                    >
                      {toPersianDigits(String(h).padStart(2, "0"))}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[var(--text-muted)] text-center">دقیقه</span>
              <div className="max-h-44 overflow-y-auto flex flex-col gap-1 p-1 bg-[var(--foreground)]/20 rounded-lg border border-[var(--border-subtle)]/40">
                {minutes.map((m) => {
                  const isMSelected = m === rawM;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`h-9 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isMSelected
                          ? "bg-[var(--primary)] text-black shadow-sm"
                          : "text-[var(--text-white)] hover:bg-[var(--foreground)]/60"
                      }`}
                    >
                      <span>{toPersianDigits(String(m).padStart(2, "0"))}</span>
                      <span className="text-[10px] font-normal opacity-70">دقیقه</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 transition-all mt-1"
          >
            تایید زمان
          </button>
        </div>
      )}
    </div>
  );
};
