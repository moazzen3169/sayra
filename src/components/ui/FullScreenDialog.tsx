"use client";

import React, { useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface FullScreenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  disableClose?: boolean;
  maxWidthClass?: string;
  headerAction?: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const FullScreenDialog: React.FC<FullScreenDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  disableClose = false,
  maxWidthClass = "max-w-full lg:max-w-[1100px]",
  headerAction,
  className,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const disableCloseRef = useRef(disableClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    disableCloseRef.current = disableClose;
  }, [onClose, disableClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = dialogRef.current;
    if (container) {
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!disableCloseRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end lg:items-center justify-center bg-black/75 animate-fadeIn"
      onClick={() => {
        if (!disableClose) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full h-[100dvh] lg:h-[92dvh] bg-[var(--bg-body)] lg:bg-[var(--bg-card)] lg:border lg:border-[var(--border-color)] lg:rounded-card flex flex-col overflow-hidden shadow-2xl animate-sheetUp",
          maxWidthClass,
          className
        )}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (!disableClose) onClose();
              }}
              disabled={disableClose}
              aria-label="بازگشت"
              className="w-11 h-11 rounded-card text-[var(--text-white)] hover:bg-[var(--foreground)]/40 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 cursor-pointer"
            >
              <Icon name="back" size={20} />
            </button>
            <div className="flex flex-col min-w-0">
              <h2 id={titleId} className="text-section-title text-[var(--text-white)] truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-secondary text-[var(--text-muted)] truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>
  );
};
