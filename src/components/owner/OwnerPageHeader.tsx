"use client";

import React from "react";
import { useRouter } from "next/navigation";

export const OwnerPageHeader: React.FC<{ title: string }> = ({ title }) => {
  const router = useRouter();
  return (
    <header className="fixed top-0 z-40 w-full max-w-[780px] h-16 px-4 bg-[var(--bg-card)] flex items-center gap-3">
      <button
        type="button"
        onClick={() => router.push("/owner")}
        aria-label="بازگشت"
        className="w-10 h-10 flex items-center justify-center shrink-0"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </button>
      <h1 className="text-sm font-extrabold text-[var(--text-white)] truncate">{title}</h1>
    </header>
  );
};