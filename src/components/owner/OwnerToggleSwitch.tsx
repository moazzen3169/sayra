"use client";

import React from "react";

interface OwnerToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function OwnerToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: OwnerToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="flex items-center justify-between gap-3 p-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-color)] cursor-pointer text-right w-full disabled:opacity-60 disabled:cursor-not-allowed"
      role="switch"
      aria-checked={checked}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-bold text-[var(--text-white)]">{label}</span>
        {description && (
          <span className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {description}
          </span>
        )}
      </div>
      <span
        className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--foreground)]"
        } inline-flex items-center`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
            checked ? "translate-x-0" : "-translate-x-5"
          }`}
        />
      </span>
    </button>
  );
}
