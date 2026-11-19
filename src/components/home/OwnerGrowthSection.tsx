
import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

export const OwnerGrowthSection: React.FC = () => {
  return (
    <section
      aria-labelledby="owner-growth-heading"
      className="group relative isolate min-h-[620px] w-full overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-body-2)] sm:min-h-[680px] lg:min-h-[700px]"
    >
      {/* Background */}
      <SafeImage
        src="/img/gamnet-2.webp"
        alt="فضای حرفه‌ای و تجهیزات یک گیمنت"
        fallbackSrc={PLACEHOLDERS.center}
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-[1200ms] group-hover:scale-[1.025]"
      />

      {/* Overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20 lg:bg-gradient-to-r lg:from-black/95 lg:via-black/75 lg:via-55% lg:to-black/10"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-l from-[var(--primary)]/10 via-transparent to-transparent"
      />

      {/* Ambient light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-0 h-[450px] w-[450px] rounded-full bg-[var(--primary)]/10 blur-[140px]"
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[620px] items-center px-6 py-16 sm:min-h-[680px] sm:px-12 lg:min-h-[700px] lg:px-20">
        <div className="w-full max-w-2xl">

          {/* Eyebrow */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-xl">
            <Icon
              name="list"
              size={16}
              className="text-[var(--primary)]"
            />
            <span className="text-xs font-bold tracking-wide text-white/90 sm:text-sm">
              فرصتی برای رشد گیمنت تو
            </span>
          </div>

          {/* Heading */}
          <h2
            id="owner-growth-heading"
            className="text-4xl font-black leading-[1.4] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            گیمنت تو،
            <br />
            <span className="text-white/90">در مسیر</span>{" "}
            <span className="text-[var(--primary)]">بزرگ‌تر شدن.</span>
          </h2>

          {/* Description */}
          <p className="mt-7 max-w-lg text-sm leading-8 text-white/65 sm:text-base sm:leading-9">
            گیمنتت رو به سایرا متصل کن تا گیمرهای شهرت راحت‌تر پیدات کنن،
            دستگاه‌هات رو ببینن و آنلاین رزرو کنن.
            <span className="font-bold text-white/90">
              {" "}وقتشه بیشتر دیده بشی.
            </span>
          </p>

          {/* Value proposition */}
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">

            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15">
                <Icon
                  name="gamepad"
                  size={20}
                  className="text-[var(--primary)]"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  دیده‌شدن بیشتر
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  در معرض انتخاب گیمرها
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15">
                <Icon
                  name="list"
                  size={20}
                  className="text-[var(--primary)]"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  رزرو آنلاین
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  انتخاب و رزرو توسط گیمرها
                </p>
              </div>
            </div>

          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/owner/new"
              className="group/btn inline-flex h-14 w-full items-center justify-center gap-4 rounded-xl bg-white px-8 text-sm font-black text-black shadow-[0_12px_40px_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--primary)] hover:text-on-primary active:translate-y-0 sm:w-auto sm:min-w-[220px]"
            >
              <span>اتصال گیمنت به سایرا</span>
              <Icon
                name="arrow-left"
                size={19}
                className="transition-transform duration-300 group-hover/btn:-translate-x-1"
              />
            </Link>

            <Link
              href="/register-gamecenter"
              className="text-xs font-bold text-[var(--primary)] underline underline-offset-4 transition-colors hover:text-white"
            >
              آشنایی با شرایط، مزایا و مراحل ثبت گیمنت
            </Link>
          </div>

        </div>
      </div>

      {/* Bottom accent */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-1 w-1/3 bg-gradient-to-r from-[var(--primary)] to-transparent"
      />
    </section>
  );
};
