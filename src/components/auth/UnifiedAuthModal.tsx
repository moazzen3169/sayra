"use client";

import React from "react";
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
  title = "ورود یا ثبت‌نام",
  description = "ورود و ثبت‌نام سریع با پیامک یک‌بار مصرف (OTP)",
  initialPhone = "",
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[var(--text-white)]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
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
