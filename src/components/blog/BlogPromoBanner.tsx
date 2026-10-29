"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export interface BlogPromoBannerProps {
  /** نوع نمایش بنر */
  variant?: "mobile" | "desktop" | "responsive";
  /** آدرس مقصد دکمه‌ی فراخوان (CTA) */
  href?: string;
  /** عنوان تبلیغ */
  title?: string;
  /** توضیح کوتاه */
  description?: string;
  /** متن دکمه‌ی فراخوان */
  ctaText?: string;
  /** تصویر بنر در دسکتاپ */
  imageUrl?: string;
  /** شناسه یا نشان ویژه */
  badgeText?: string;
}

/**
 * کامپوننت تبلیغ خودی در صفحه جزییات وبلاگ
 * - mobile: فقط بنر موبایل
 * - desktop: فقط کارت دسکتاپ
 * - responsive: نمایش نسخه متناسب با اندازه صفحه
 */
export const BlogPromoBanner: React.FC<BlogPromoBannerProps> = ({
  variant = "responsive",
  href = "/?discount=true",
  title = "گیم‌نت‌های تخفیف‌دار سایرا",
  description = "رزرو آنلاین سانس‌های بازی با تخفیف‌های استثنایی در برترین گیم‌نت‌ها",
  ctaText = "مشاهده و رزرو",
  imageUrl = "/img/gamnet-1.webp",
  badgeText = "پیشنهاد ویژه",
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  return (
    <>
      {/* ================= MOBILE PROMO BANNER ================= */}
      {/* نمایش در زیر هدر موبایل با ارتفاع دقیق ۸۰px و دکمه‌ی مخفی‌سازی */}
      {variant !== "desktop" && !isDismissed && (
        <div className="sticky top-14 z-30 flex h-[80px] w-full items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 shadow-md lg:hidden">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="primary" className="shrink-0 px-2 py-0.5 text-[11px]">
                {badgeText}
              </Badge>
              <h3 className="truncate text-xs font-bold text-[var(--text-white)]">
                {title}
              </h3>
            </div>
            <p className="line-clamp-1 text-xs text-[var(--text-muted)]">
              {description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={href}
              className="flex h-9 items-center justify-center rounded-card bg-[var(--primary)] px-3 text-xs font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)]"
            >
              {ctaText}
            </Link>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="مخفی کردن تبلیغ"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--foreground)]/50 hover:text-[var(--text-white)]"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ================= DESKTOP PROMO CARD ================= */}
      {/* کارت دسکتاپ برای ستون تبلیغات */}
      {variant !== "mobile" && (
        <aside className="hidden w-full flex-col gap-3.5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-lg lg:flex">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-child border border-[var(--border-subtle)] bg-[var(--foreground)]">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
            <div className="absolute top-2.5 right-2.5">
              <Badge variant="primary" className="shadow-sm">
                {badgeText}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-bold text-[var(--text-white)] leading-6">
              {title}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-5">
              {description}
            </p>
          </div>

          <Link
            href={href}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-card bg-[var(--primary)] px-4 text-xs font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          >
            <span>{ctaText}</span>
            <Icon name="back" size={16} className="rotate-180" />
          </Link>
        </aside>
      )}
    </>
  );
};
