"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OwnerVerificationBadge } from "@/components/owner/OwnerVerificationBadge";

export const OwnerPageHeader: React.FC<{ title: string }> = ({ title }) => {
  const router = useRouter();
  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full max-w-[var(--max-app-width)] mx-auto h-16 px-4 lg:px-8 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => router.push("/owner")}
          aria-label="بازگشت"
          className="w-10 h-10 flex items-center justify-center shrink-0 hover:bg-[var(--foreground)]/30 rounded-full transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-sm font-bold text-[var(--text-white)] truncate">{title}</h1>
      </div>
      <div className="shrink-0">
        <OwnerVerificationBadge size="sm" />
      </div>
    </header>
  );
};