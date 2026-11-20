import React from "react";
import Link from "next/link";
import { SayraNetworkAnimation } from "./SayraNetworkAnimation";

export const OwnerGrowthSection: React.FC = () => {
  return (
    <section
      aria-labelledby="owner-growth-heading"
      className="group relative isolate overflow-hidden rounded-[28px]  py-10 text-[#F4F5EF] sm:px-10 sm:py-14 lg:px-14 lg:py-16"
    >
      {/* Subtle architectural grid & lime aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_50%,rgba(184,243,74,0.11),transparent_44%),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px]"
      />

      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        {/* Right side (RTL): Editorial Text */}
        <div className="order-2 max-w-2xl lg:order-1">
          <div
            className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#B8F34A]/20 bg-[#B8F34A]/5 px-4 py-2 text-[10px] tracking-[.24em] text-[#C8F78A] sm:text-xs"
            dir="ltr"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B8F34A]" />
            SAYRA / FOR OWNERS
          </div>

          <h2
            id="owner-growth-heading"
            className="text-3xl font-black leading-[1.3] tracking-tight text-[#F4F5EF] sm:text-5xl lg:text-[54px]"
          >
            گیمنت تو،
            <br />
            در مسیر <span className="text-[#B8F34A]">بزرگ‌تر شدن</span>
            <span className="text-[#B8F34A]">.</span>
          </h2>

          <p className="mt-6 max-w-lg text-sm leading-8 text-white/55 sm:text-base sm:leading-9">
            گیمنتت را به سایرا متصل کن تا گیمرهای شهر راحت‌تر پیدایت کنند،
            دستگاه‌ها را ببینند و آنلاین رزرو کنند.
          </p>

          {/* Clean editorial value highlights */}
          <div className="mt-8 grid max-w-md grid-cols-2 gap-6 border-t border-white/10 pt-6">
            <div>
              <span className="text-xs text-[#B8F34A]" dir="ltr">
                01
              </span>
              <p className="mt-1.5 text-sm font-bold text-[#F4F5EF]">
                دیده‌شدن هدفمند
              </p>
              <p className="mt-1 text-xs text-white/45">
                در معرض انتخاب گیمرها
              </p>
            </div>

            <div>
              <span className="text-xs text-[#B8F34A]" dir="ltr">
                02
              </span>
              <p className="mt-1.5 text-sm font-bold text-[#F4F5EF]">
                رزرو آنلاین قطعی
              </p>
              <p className="mt-1 text-xs text-white/45">
                پیش‌پرداخت و مدیریت سانس
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/register-gamecenter"
              className="group/btn inline-flex items-center gap-4 rounded-full bg-[#B8F34A] px-7 py-4 text-sm font-bold text-[#10130A] transition duration-300 hover:-translate-y-1 hover:bg-[#D1FF78]"
            >
              <span>اتصال گیمنت به سایرا</span>
              <span
                aria-hidden="true"
                className="text-lg transition-transform group-hover/btn:-translate-x-1"
              >
                ↗
              </span>
            </Link>

            <Link
              href="/register-gamecenter"
              className="inline-flex items-center gap-2 px-3 py-3 text-sm text-white/65 transition hover:text-[#B8F34A]"
            >
              <span>شرایط، مزایا و مراحل ثبت</span>
              <span aria-hidden="true">←</span>
            </Link>
          </div>
        </div>

        {/* Left side (RTL): Continuous SAYRA Network Animation (4:5) */}
        <div className="relative order-1 mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:order-2 lg:max-w-[380px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 rounded-full bg-[#B8F34A]/10 blur-[64px]"
          />

          <SayraNetworkAnimation />
        </div>
      </div>
    </section>
  );
};
