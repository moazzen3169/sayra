"use client";

import React, { useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end lg:items-center justify-center bg-black/75 animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full lg:max-w-[480px] max-h-[92dvh] bg-[var(--bg-card)] border-t lg:border border-[var(--border-color)] rounded-t-2xl lg:rounded-card flex flex-col overflow-hidden shadow-2xl animate-sheetUp",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
          <h3 id={titleId} className="text-section-title text-[var(--text-white)] truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-11 h-11 rounded-card text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
};
