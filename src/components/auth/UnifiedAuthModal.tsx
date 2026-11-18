"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { UnifiedAuthForm, UnifiedAuthSuccessData } from "./UnifiedAuthForm";

export interface UnifiedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: UnifiedAuthSuccessData) => void;
  title?: string;
  description?: string;
  initialPhone?: string;
}

export const UnifiedAuthModal: React.FC<UnifiedAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "ورود / ثبت‌نام",
  description = "",
  initialPhone = "",
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card p-5 flex flex-col gap-4 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <Icon name="user" size={20} />
            </div>
            <h3 className="text-section-title text-[var(--text-white)]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-11 h-11 rounded-card text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <UnifiedAuthForm
          onSuccess={onSuccess}
          title=""
          description={description}
          initialPhone={initialPhone}
        />
      </div>
    </div>
  );
};
