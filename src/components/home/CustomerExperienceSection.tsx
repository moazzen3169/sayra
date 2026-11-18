
import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

export const CustomerExperienceSection: React.FC = () => {
  return (
    <section
      aria-labelledby="customer-experience-heading"
      className="group relative isolate min-h-[620px] w-full overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-body)] sm:min-h-[680px] lg:min-h-[700px]"
    >
      {/* Background */}
      <SafeImage
        src="/img/gamnet-5.webp"
        alt="فضای داخلی یک گیمنت حرفه‌ای"
        fallbackSrc={PLACEHOLDERS.center}
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-[1200ms] group-hover:scale-[1.025]"
      />

      {/* Cinematic overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10 lg:bg-gradient-to-l lg:from-black/95 lg:via-black/75 lg:via-55% lg:to-black/5"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/10 via-transparent to-transparent"
      />

      {/* Decorative light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-0 h-[450px] w-[450px] rounded-full bg-[var(--primary)]/10 blur-[130px]"
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[620px] items-center px-6 py-16 sm:min-h-[680px] sm:px-12 lg:min-h-[700px] lg:px-20">
        <div className="w-full max-w-2xl">

          {/* Eyebrow */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--primary)]" />
            </span>
            <span className="text-xs font-bold tracking-wide text-white/90 sm:text-sm">
              تجربه متفاوت گیمینگ، از همین‌جا
            </span>
          </div>

          {/* Heading */}
          <h2
            id="customer-experience-heading"
            className="text-4xl font-black leading-[1.4] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            بازی بعدی‌ات
            <br />
            <span className="text-white/90">از اینجا</span>{" "}
            <span className="text-[var(--primary)]">شروع می‌شه.</span>
          </h2>

          {/* Description */}
          <p className="mt-7 max-w-lg text-sm leading-8 text-white/65 sm:text-base sm:leading-9">
            بهترین گیمنت‌های اطرافت رو پیدا کن، دستگاه موردعلاقه‌ات رو انتخاب کن
            و قبل از رسیدن، جای خودت رو رزرو کن.
            <span className="font-bold text-white/90">
              {" "}وقتشه فقط روی بازی تمرکز کنی.
            </span>
          </p>

          {/* Discount */}
          <div className="mt-9 flex items-center gap-4">
            <div className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center rounded-2xl border border-[var(--primary)]/40 bg-[var(--primary)]/15 backdrop-blur-xl sm:h-[88px] sm:w-[88px]">
              <span className="text-3xl font-black leading-none text-[var(--primary)] sm:text-4xl">
                ۱۰٪
              </span>
              <span className="mt-1 text-[10px] font-bold text-white/80">
                تخفیف
              </span>
            </div>

            <div>
              <p className="text-base font-black text-white sm:text-lg">
                اولین رزروت، با تخفیف ویژه
              </p>
              <p className="mt-1.5 text-xs text-white/55 sm:text-sm">
                شروع تجربه سایرا با ۱۰ درصد تخفیف
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/gamecenters"
              className="group/btn inline-flex h-14 w-full items-center justify-center gap-4 rounded-xl bg-[var(--primary)] px-8 text-sm font-black text-on-primary shadow-[0_12px_40px_var(--primary)]/20 transition-all duration-300 hover:-translate-y-1 hover:brightness-110 active:translate-y-0 sm:w-auto sm:min-w-[220px]"
            >
              <span>پیدا کردن گیمنت</span>
              <Icon
                name="arrow-left"
                size={19}
                className="transition-transform duration-300 group-hover/btn:-translate-x-1"
              />
            </Link>

            <span className="text-xs font-medium text-white/45">
              انتخاب کن، رزرو کن، بازی کن.
            </span>
          </div>

        </div>
      </div>

      {/* Bottom accent */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-1 w-1/3 bg-gradient-to-l from-[var(--primary)] to-transparent"
      />
    </section>
  );
};
