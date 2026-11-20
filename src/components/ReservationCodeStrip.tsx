"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { toPersianDigits } from "@/lib/format";

interface ReservationCodeStripProps {
  code?: string | null;
  compact?: boolean;
}

/**
 * Displays the reservation check-in / tracking code with a one-tap copy button.
 */
export const ReservationCodeStrip: React.FC<ReservationCodeStripProps> = ({
  code,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const trimmedCode = code?.trim();
  if (!trimmedCode) return null;

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(trimmedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 bg-[var(--foreground)]/40 border border-[var(--border-subtle)] rounded-child ${
        compact ? "px-3 py-1.5" : "p-3"
      }`}
    >
      <div className="flex items-center gap-2 text-xs min-w-0">
        <span className="text-[var(--text-muted)] shrink-0">کد رزرو:</span>
        <span
          dir="ltr"
          className={`font-black tracking-wider text-[var(--text-white)] font-mono truncate ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {toPersianDigits(trimmedCode)}
        </span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="کپی کد رزرو"
        className="inline-flex items-center gap-1 shrink-0 h-7 px-2.5 rounded-child bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--foreground)]/50 transition-colors cursor-pointer"
      >
        <Icon name={copied ? "check" : "copy"} size={12} />
        <span>{copied ? "کپی شد" : "کپی کد"}</span>
      </button>
    </div>
  );
};
