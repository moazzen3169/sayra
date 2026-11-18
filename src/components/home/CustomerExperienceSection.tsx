import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

export const CustomerExperienceSection: React.FC = () => {
  return (
    <section
      aria-labelledby="customer-experience-heading"
      className="relative min-h-[100dvh] w-full overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-body)] flex items-end lg:items-center"
    >
      {/* تصویر تمام‌صفحه فضای گیمنت */}
      <SafeImage
        src="/img/gamnet-5.webp"
        alt="فضای داخلی گیمنت با نورپردازی گیمینگ"
        fallbackSrc={PLACEHOLDERS.center}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* لایه کنتراست برای خوانایی کامل تیتر */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/75 to-[var(--bg-body)]/25 lg:bg-gradient-to-l lg:from-[var(--bg-body)] lg:via-[var(--bg-body)]/80 lg:to-transparent"
      />

      <div className="relative z-10 w-full p-6 sm:p-10 lg:p-16">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/40 bg-[var(--bg-body)]/80 px-3.5 py-1.5 text-xs font-bold text-[var(--primary)]">
            <Icon name="gamepad" size={16} />
            <span>امتحانش کن</span>
          </span>

          <h2
            id="customer-experience-heading"
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight text-[var(--text-white)]"
          >
            اولین رزروت با{" "}
            <span className="text-[var(--primary)]">۱۰٪ تخفیف</span>
          </h2>

          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-md">
            گیمنت‌های شهرت را ببین، دستگاهت را انتخاب کن و قبل از رسیدن بازی را
            قطعی کن.
          </p>

          <Link
            href="/gamecenters"
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-3 rounded-card bg-[var(--primary)] px-8 text-sm font-bold text-on-primary shadow-[4px_4px_0_0_var(--text-white)] transition-all hover:bg-[var(--primary-hover)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--text-white)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>رزرو گیمنت</span>
            <Icon name="arrow-left" size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
};
