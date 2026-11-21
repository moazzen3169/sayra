import React from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

export const CustomerExperienceSection: React.FC = () => {
  return (
    <section
      aria-labelledby="customer-experience-heading"
      className="group relative isolate overflow-hidden rounded-[28px]  py-10 text-[#F4F5EF] sm:px-10 sm:py-14 lg:px-14 lg:py-16"
    >
      {/* Subtle architectural grid & lime aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_50%,rgba(184,243,74,0.09),transparent_42%),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px]"
      />

      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        {/* Right side (RTL): Editorial Text */}
        <div className="order-2 max-w-2xl lg:order-1">
          <div
            className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#B8F34A]/20 bg-[#B8F34A]/5 px-4 py-2 text-[10px] tracking-[.24em] text-[#C8F78A] sm:text-xs"
            dir="ltr"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B8F34A]" />
            SAYRA / FOR GAMERS
          </div>

          <h2
            id="customer-experience-heading"
            className="text-3xl font-black leading-[1.3] tracking-tight text-[#F4F5EF] sm:text-5xl lg:text-[54px]"
          >
            بازی بعدی‌ات
            <br />
            از اینجا <span className="text-[#B8F34A]">شروع می‌شه</span>
            <span className="text-[#B8F34A]">.</span>
          </h2>

          <p className="mt-6 max-w-lg text-sm leading-8 text-white/55 sm:text-base sm:leading-9">
            بهترین گیمنت‌های اطرافت را پیدا کن، سیستم دلخواهت را انتخاب کن و
            پیش از رسیدن، جای خودت را قطعی کن.
          </p>

          {/* Clean editorial highlight */}
          <div className="mt-8 flex max-w-md items-center gap-5 border-t border-white/10 pt-6">
            <span className="text-3xl font-black text-[#B8F34A] sm:text-4xl">
              ۱۰٪
            </span>
            <div>
              <p className="text-sm font-bold text-[#F4F5EF] sm:text-base">
                تخفیف ویژه اولین رزرو
              </p>
              <p className="mt-1 text-xs text-white/45">
                شروع تجربه سایرا با ۱۰ درصد تخفیف
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/gamecenters"
              className="group/btn inline-flex items-center gap-4 rounded-full bg-[#B8F34A] px-7 py-4 text-sm font-bold text-[#10130A] transition duration-300 hover:-translate-y-1 hover:bg-[#D1FF78]"
            >
              <span>پیدا کردن گیمنت</span>
              <span
                aria-hidden="true"
                className="text-lg transition-transform group-hover/btn:-translate-x-1"
              >
                ↗
              </span>
            </Link>

            <span className="px-2 text-xs text-white/40">
              انتخاب کن، رزرو کن، بازی کن.
            </span>
          </div>
        </div>

        {/* Left side (RTL): Vertical 4:6 Photo Slot */}
        <div className="relative order-1 mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:order-2 lg:max-w-[380px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 rounded-full bg-[#B8F34A]/10 blur-[64px]"
          />

          <div className="relative  w-full overflow-hidden ">
            <SafeImage
              src="/img/sayra-game-center.webp"
              alt="فضای داخلی یک گیمنت حرفه‌ای"
              width={380}
              height={472}
              sizes="(max-width: 640px) 300px, (max-width: 1024px) 340px, 380px"
              fallbackSrc={PLACEHOLDERS.center}
              className="h-full w-full object-contain object-center transition-transform duration-700"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 unselectable"
            />
          </div>

          <div
            className="absolute right-3 top-4 rounded-full border border-[#B8F34A]/25 bg-[#0D100A]/80 px-4 py-1.5 text-[9px] tracking-[.2em] text-[#D7F8A6] backdrop-blur"
            dir="ltr"
          >
            PLAY NOW
          </div>

          <div className="absolute bottom-4 left-3 rounded-xl border border-white/10 bg-[#0D100A]/80 px-4 py-2.5 shadow-2xl backdrop-blur">
            <div
              className="text-[9px] tracking-[.22em] text-[#B8F34A]"
              dir="ltr"
            >
              FIRST BOOKING
            </div>
            <div className="mt-1 text-xs text-white/75">۱۰٪ تخفیف شروع</div>
          </div>
        </div>
      </div>
    </section>
  );
};
