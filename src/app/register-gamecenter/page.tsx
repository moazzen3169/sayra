import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FaqAccordion } from "@/components/register-gamecenter/FaqAccordion";
import {
  BENEFIT_PILLARS,
  COOPERATION_RULES,
  FAQ_ITEMS,
  KEY_HIGHLIGHTS,
  REGISTRATION_STEPS,
} from "@/data/registerGamecenterContent";

import { SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "ثبت گیمنت و اتصال به سایرا | راهنمای مراحل، مزایا و قوانین همکاری",
  description:
    "گیمنت خود را در ۵ مرحله به سایرا متصل کنید؛ رزرو آنلاین با پیش‌پرداخت، پنل مدیریت یکپارچه، مهلت ۳۰ دقیقه‌ای تأیید رزرو و تسویه شفاف ۳ روز کاری.",
  keywords: [
    "ثبت گیمنت",
    "اتصال گیمنت به سایرا",
    "ایجاد گیمنت در سایرا",
    "رزرو آنلاین گیمنت",
    "پنل مدیریت گیمنت",
  ],
  alternates: {
    canonical: "/register-gamecenter",
  },
  openGraph: {
    title: "ثبت گیمنت و اتصال به سایرا",
    description:
      "رزرو آنلاین، پیش‌پرداخت مطمئن و پنل مدیریت یکپارچه برای گیم‌نت‌ها.",
    type: "website",
    locale: "fa_IR",
    url: "/register-gamecenter",
    images: [
      {
        url: `${SITE_URL}/design/sayra.svg`,
        width: 1200,
        height: 630,
        alt: "ثبت گیمنت در سایرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ثبت گیمنت و اتصال به سایرا",
    description:
      "رزرو آنلاین، پیش‌پرداخت مطمئن و پنل مدیریت یکپارچه برای گیم‌نت‌ها.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "ثبت گیمنت و اتصال به سایرا",
      description:
        "راهنمای کوتاه مراحل ثبت، مزایا و قوانین همکاری گیم‌نت‌ها در پلتفرم سایرا.",
      url: `${SITE_URL}/register-gamecenter`,
      inLanguage: "fa",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "خانه",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "ثبت گیمنت",
          item: `${SITE_URL}/register-gamecenter`,
        },
      ],
    },
  ],
};

export default function RegisterGamecenterPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-clip bg-[#080A07] text-[#F4F5EF] selection:bg-[#B8F34A] selection:text-[#080A07]"
    >
      <JsonLd data={STRUCTURED_DATA} />

      <Header />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative isolate mx-auto grid min-h-[calc(100svh-76px)] max-w-[1440px] items-center justify-items-center gap-10 px-5 pt-[calc(var(--header-m-h)+20px)] pb-16 sm:px-8 lg:px-16 lg:pt-[calc(var(--header-h)+24px)] lg:pb-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,rgba(184,243,74,0.09),transparent_45%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px]"
          />

          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <div
              className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#B8F34A]/20 bg-[#B8F34A]/5 px-4 py-2 text-[10px] tracking-[.24em] text-[#C8F78A] sm:text-xs"
              dir="ltr"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B8F34A]" />
              SAYRA / PARTNER WITH US
            </div>

            <h1 className="text-4xl font-black leading-[1.28] tracking-tight sm:text-6xl lg:text-7xl xl:text-[78px]">
              گیمنتت را
              <br />
              <span className="text-[#B8F34A]">به جهان سایرا</span>
              <br />
              متصل کن<span className="text-[#B8F34A]">.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-9 text-white/55 sm:text-lg sm:leading-10">
              رزرو آنلاین، پیش‌پرداخت مطمئن و پنل مدیریت یکپارچه؛ همه‌چیز برای
              دیده شدن و رشد گیمنت شما در یک بستر ساده و شفاف.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/owner/new"
                className="group inline-flex items-center gap-4 rounded-full bg-[#B8F34A] px-7 py-4 text-sm font-bold text-[#10130A] transition duration-300 hover:-translate-y-1 hover:bg-[#D1FF78]"
              >
                شروع ثبت گیمنت
                <span
                  aria-hidden="true"
                  className="text-lg transition-transform group-hover:-translate-x-1"
                >
                  ↗
                </span>
              </Link>

              <a
                href="#steps"
                className="inline-flex items-center gap-3 px-4 py-3 text-sm text-white/65 transition hover:text-[#B8F34A]"
              >
                مراحل و قوانین <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-5 border-t border-white/10 pt-6">
              <span
                className="text-[10px] tracking-[.28em] text-white/30"
                dir="ltr"
              >
                BUILT FOR OWNERS
              </span>
              <span className="h-px w-14 bg-[#B8F34A]/50" />
              <span className="text-xs text-white/40">
                ثبت اولیه در ۵ گام کوتاه
              </span>
            </div>
          </div>
        </section>

        {/* ================= 01 — WHY SAYRA ================= */}
        <section className="border-y border-white/[0.07] bg-[#0D100B]">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-16 lg:py-28">
            <div>
              <p
                className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                dir="ltr"
              >
                01 — WHY SAYRA
              </p>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
                دغدغه کمتر،
                <br />
                رزروهای قطعی.
              </h2>
            </div>

            <div className="max-w-3xl">
              <p className="text-xl font-medium leading-10 text-white/85 sm:text-2xl sm:leading-[2.1]">
                گیمرها همین حالا دنبال گیمنت مناسب در شهرشان هستند؛ سایرا آن‌ها را
                مستقیم به صندلی‌های خالی شما می‌رساند.
              </p>
              <p className="mt-6 text-base leading-9 text-white/50">
                با پیش‌پرداخت آنلاین، خبری از رزروهای بلاتکلیف نیست. تعیین
                تعرفه، تخفیف‌ها و ساعات کاری کاملاً در اختیار شماست.
              </p>

              <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
                {KEY_HIGHLIGHTS.map((item) => (
                  <div key={item.label}>
                    <p
                      className="text-2xl font-black text-[#B8F34A] sm:text-3xl"
                      dir="ltr"
                    >
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs text-white/45">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= 02 — ADVANTAGES ================= */}
        <section
          id="benefits"
          className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16 lg:py-28"
        >
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p
                className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                dir="ltr"
              >
                02 — THE ADVANTAGES
              </p>
              <h2 className="mt-5 text-3xl font-black sm:text-5xl">
                هرچه برای رشد
                <br className="sm:hidden" /> نیاز دارید.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-8 text-white/45">
              سه مزیت کلیدی برای نظم‌دهی سانس‌ها و درآمد پایدار گیمنت شما.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {BENEFIT_PILLARS.map((item) => (
              <article
                key={item.number}
                className="group relative min-h-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#0D100B] p-7 transition duration-500 hover:-translate-y-2 hover:border-[#B8F34A]/40 sm:p-9"
              >
                <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[#B8F34A]/[0.04] blur-3xl transition group-hover:bg-[#B8F34A]/10" />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm text-[#B8F34A]" dir="ltr">
                    {item.number}
                  </span>
                  <span
                    className="text-[9px] tracking-[.25em] text-white/30"
                    dir="ltr"
                  >
                    {item.en}
                  </span>
                </div>
                <h3 className="relative mt-14 text-2xl font-extrabold sm:text-3xl">
                  {item.title}
                </h3>
                <p className="relative mt-4 text-sm leading-8 text-white/45">
                  {item.description}
                </p>
                <div className="absolute bottom-0 right-0 h-px w-0 bg-[#B8F34A] transition-all duration-500 group-hover:w-full" />
              </article>
            ))}
          </div>
        </section>

        {/* ================= 03 — THE JOURNEY & DOCUMENTS ================= */}
        <section
          id="steps"
          className="relative overflow-hidden border-y border-white/[0.07] bg-[#0D100B] scroll-mt-24"
        >
          <div
            aria-hidden="true"
            className="absolute -left-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#B8F34A]/[0.06] blur-[100px]"
          />

          <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-16 lg:py-28">
            <div className="flex flex-col justify-between gap-10">
              <div>
                <p
                  className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                  dir="ltr"
                >
                  03 — THE JOURNEY
                </p>
                <h2 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
                  از ثبت‌نام
                  <br />
                  تا اولین رزرو.
                </h2>
                <p className="mt-6 max-w-md text-sm leading-8 text-white/45">
                  ثبت اولیه در ۵ گام ساده انجام می‌شود و پس از تأیید مدارک در
                  پنل، صفحه گیمنت شما در سایت منتشر خواهد شد.
                </p>
              </div>

              {/* Minimal Documents Summary */}
              <div className="max-w-md space-y-3 border-t border-white/10 pt-6 text-xs leading-7 text-white/55 sm:text-sm">
                <p>
                  <span className="font-bold text-[#B8F34A]">برای شروع: </span>
                  شماره موبایل مدیر، نشانی روی نقشه و ساعات کاری.
                </p>
                <p>
                  <span className="font-bold text-white/85">
                    برای انتشار و تسویه:{" "}
                  </span>
                  کد ملی مالک، تصویر پروانه کسب و شماره شبا در پنل.
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {REGISTRATION_STEPS.map((step) => (
                <div key={step.number} className="flex gap-5 py-5 sm:gap-8 sm:py-6">
                  <span className="pt-1 text-xs text-[#B8F34A]" dir="ltr">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-base font-bold sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-7 text-white/45">
                      {step.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 04 — RULES & FAQ ================= */}
        <section
          id="rules"
          className="mx-auto max-w-[1440px] space-y-20 px-5 py-20 sm:px-8 lg:space-y-28 lg:px-16 lg:py-28"
        >
          {/* Cooperation Rules */}
          <div>
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p
                  className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                  dir="ltr"
                >
                  04 — COMMITMENTS
                </p>
                <h2 className="mt-5 text-3xl font-black sm:text-5xl">
                  قوانین شفاف،
                  <br className="sm:hidden" /> همکاری مطمئن.
                </h2>
              </div>

              <Link
                href="/terms"
                className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-[#B8F34A]"
              >
                <span>مطالعه متن کامل قوانین (۲۲ ماده)</span>
                <span aria-hidden="true">←</span>
              </Link>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {COOPERATION_RULES.map((rule) => (
                <article
                  key={rule.number}
                  className="border-t border-white/10 pt-6"
                >
                  <span className="text-xs text-[#B8F34A]" dir="ltr">
                    {rule.number}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-[#F4F5EF]">
                    {rule.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-7 text-white/45">
                    {rule.summary}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* Concise FAQ */}
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div>
              <p
                className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                dir="ltr"
              >
                05 — FAQ
              </p>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">
                پرسش‌های رایج.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-8 text-white/45">
                پاسخ سریع نکات کلیدی پیش از شروع ثبت‌نام.
              </p>
              <div className="mt-7">
                <Link
                  href="/support"
                  className="inline-flex items-center gap-3 rounded-full border border-white/15 px-6 py-3 text-xs font-bold text-white/75 transition hover:border-[#B8F34A]/50 hover:text-[#B8F34A]"
                >
                  <span>ارتباط با پشتیبانی</span>
                  <span aria-hidden="true">←</span>
                </Link>
              </div>
            </div>

            <FaqAccordion />
          </div>
        </section>

        {/* ================= 05 — FINAL CTA ================= */}
        <section className="mx-auto max-w-[1440px] px-5 pt-4 pb-8 sm:px-8 lg:px-16 lg:pb-12">
          <div className="relative overflow-hidden rounded-[28px] border border-[#B8F34A]/20 bg-[radial-gradient(ellipse_at_85%_50%,rgba(184,243,74,0.12),transparent_45%),#0D100B] px-7 py-14 sm:px-12 sm:py-20 lg:px-20">
            <div
              className="hidden sm:block absolute left-8 top-8 text-[9px] tracking-[.3em] text-white/25"
              dir="ltr"
            >
              SAYRA / PARTNER PORTAL
            </div>
            <p
              className="text-[10px] tracking-[.3em] text-[#B8F34A]"
              dir="ltr"
            >
              06 — READY TO LAUNCH
            </p>
            <h2 className="mt-7 max-w-3xl text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
              گیمنت شما آماده
              <br />
              یک <span className="text-[#B8F34A]">شروع تازه</span> است.
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-8 text-white/50">
              فرم ثبت اولیه تنها چند دقیقه زمان می‌برد و بلافاصله بعد از تأیید،
              به پنل مدیریت گیمنت متصل می‌شوید.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/owner/new"
                className="inline-flex items-center gap-4 rounded-full bg-[#B8F34A] px-7 py-4 text-sm font-bold text-[#10130A] transition hover:bg-[#D1FF78]"
              >
                شروع ثبت گیمنت <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center rounded-full border border-white/15 px-7 py-4 text-sm text-white/70 transition hover:border-[#B8F34A]/50 hover:text-[#B8F34A]"
              >
                قوانین همکاری
              </Link>
            </div>
            <div
              className="mt-16 flex items-center justify-between border-t border-white/10 pt-5 text-[9px] tracking-[.25em] text-white/25"
              dir="ltr"
            >
              <span>PARTNER WITH SAYRA</span>
              <span>SAYRA © {new Date().getFullYear()}</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
