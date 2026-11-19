"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const StickyRegisterBar: React.FC = () => {
  const [heroVisible, setHeroVisible] = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);

  useEffect(() => {
    const heroEl = document.getElementById("hero-primary-cta");
    const finalEl = document.getElementById("final-primary-cta");

    if (!heroEl && !finalEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === "hero-primary-cta") {
            setHeroVisible(entry.isIntersecting);
          } else if (entry.target.id === "final-primary-cta") {
            setFinalVisible(entry.isIntersecting);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (heroEl) observer.observe(heroEl);
    if (finalEl) observer.observe(finalEl);

    return () => observer.disconnect();
  }, []);

  const showBar = !heroVisible && !finalVisible;

  if (!showBar) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex justify-center lg:hidden pointer-events-none animate-fadeIn"
      role="region"
      aria-label="شروع سریع ثبت گیمنت"
    >
      <div className="pointer-events-auto flex w-full max-w-[var(--max-app-width)] items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--bg-body)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold text-[var(--text-white)]">
            آماده اتصال گیمنت هستید؟
          </span>
          <span className="truncate text-xs text-[var(--text-muted)]">
            ثبت اطلاعات اولیه در ۵ مرحله
          </span>
        </div>

        <Link
          href="/owner/new"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-card bg-[var(--primary)] px-5 text-sm font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span>شروع ثبت گیمنت</span>
          <Icon name="arrow-left" size={18} />
        </Link>
      </div>
    </div>
  );
};
