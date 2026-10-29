import React, { useEffect } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-sheetUp",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          {title ? (
            <h3 className="text-base font-bold text-[var(--text-white)]">{title}</h3>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-9 h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 flex items-center justify-center transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
