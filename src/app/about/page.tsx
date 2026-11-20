import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "درباره سایرا | SAYRA — Enter the Universe",
  description:
    "با جهان سایرا آشنا شوید؛ بستری برای نزدیک‌تر کردن گیمرها و گیم‌نت‌ها.",
};

const pillars = [
  {
    number: "01",
    en: "DISCOVER",
    title: "کشف کن",
    description:
      "فضاهای بازی را پیدا کن، گزینه‌ها را بشناس و برای تجربه بعدی‌ات آگاهانه‌تر تصمیم بگیر.",
  },
  {
    number: "02",
    en: "CONNECT",
    title: "متصل شو",
    description:
      "سایرا پلی میان گیمرها و گیم‌نت‌هاست؛ ارتباطی ساده‌تر میان کسانی که بازی را زندگی می‌کنند.",
  },
  {
    number: "03",
    en: "PLAY",
    title: "بازی کن",
    description:
      "از جست‌وجو تا انتخاب، مسیر رسیدن به تجربه بازی را روان‌تر و در دسترس‌تر کن.",
  },
];

function PortalArtwork() {
  return (
    <svg
      viewBox="0 0 620 620"
      role="img"
      aria-label="دروازه نورانی جهان سایرا"
      className="h-full w-full"
      fill="none"
    >
      <defs>
        <radialGradient id="aura">
          <stop offset="0" stopColor="#B8F34A" stopOpacity=".22" />
          <stop offset=".55" stopColor="#B8F34A" stopOpacity=".06" />
          <stop offset="1" stopColor="#B8F34A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ring" x1="130" y1="80" x2="490" y2="540">
          <stop stopColor="#E8FFB8" />
          <stop offset=".48" stopColor="#B8F34A" stopOpacity=".8" />
          <stop offset="1" stopColor="#B8F34A" stopOpacity=".08" />
        </linearGradient>
        <linearGradient id="core" x1="310" y1="150" x2="310" y2="500">
          <stop stopColor="#B8F34A" stopOpacity=".2" />
          <stop offset="1" stopColor="#B8F34A" stopOpacity="0" />
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <circle cx="310" cy="310" r="285" fill="url(#aura)" />
      <ellipse
        cx="310"
        cy="510"
        rx="150"
        ry="18"
        fill="#B8F34A"
        opacity=".2"
        filter="url(#blur)"
      />
      <g stroke="url(#ring)">
        <ellipse cx="310" cy="310" rx="174" ry="244" opacity=".55" />
        <ellipse
          cx="310"
          cy="310"
          rx="148"
          ry="215"
          strokeWidth="2"
          opacity=".8"
        />
        <ellipse cx="310" cy="310" rx="122" ry="185" opacity=".32" />
        <path d="M160 470C210 535 410 535 460 470" opacity=".6" />
        <path d="M180 160C245 100 375 100 440 160" opacity=".45" />
      </g>
      <path
        d="M220 475V278c0-58 40-105 90-105s90 47 90 105v197c-53 30-127 30-180 0Z"
        fill="url(#core)"
        stroke="url(#ring)"
        strokeWidth="2"
      />
      <path
        d="M240 465V282c0-46 31-83 70-83s70 37 70 83v183"
        stroke="#B8F34A"
        strokeOpacity=".55"
      />
      <circle cx="310" cy="64" r="3" fill="#DFFFAD" />
      <circle cx="545" cy="310" r="3" fill="#DFFFAD" />
      <circle cx="75" cy="310" r="2.5" fill="#DFFFAD" />
      <circle
        cx="310"
        cy="310"
        r="265"
        stroke="#B8F34A"
        strokeOpacity=".18"
        strokeDasharray="2 13"
      />
      <circle
        cx="310"
        cy="310"
        r="290"
        stroke="#B8F34A"
        strokeOpacity=".12"
        strokeDasharray="1 18"
      />
      <path
        d="M310 64V28M545 310h35M75 310H40"
        stroke="#B8F34A"
        strokeOpacity=".5"
      />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#080A07] text-[#F4F5EF] selection:bg-[#B8F34A] selection:text-[#080A07]"
    >
      <Header />

      <main>
        {/* HERO */}
        <section className="relative isolate mt-[var(--header-h)] mx-auto grid min-h-[calc(100svh-76px)] max-w-[1440px] items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_45%,rgba(184,243,74,0.09),transparent_38%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px]"
          />
          <div className="relative z-10 order-2 max-w-2xl lg:order-1">
            <div
              className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#B8F34A]/20 bg-[#B8F34A]/5 px-4 py-2 text-[10px] tracking-[.24em] text-[#C8F78A] sm:text-xs"
              dir="ltr"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B8F34A]" />
              SAYRA / ABOUT THE UNIVERSE
            </div>
            <h1 className="text-5xl font-black leading-[1.25] tracking-tight sm:text-6xl lg:text-7xl xl:text-[88px]">
              بازی،
              <br />
              <span className="text-[#B8F34A]">فقط شروع</span>
              <br />
              ماجراست<span className="text-[#B8F34A]">.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-9 text-white/55 sm:text-lg sm:leading-10">
              سایرا در تلاش است فاصله میان گیمرها و جهان گیم‌نت‌ها را کمتر کند؛
              تا پیدا کردن، انتخاب کردن و تجربه کردن دنیای بازی، ساده‌تر و
              پیوسته‌تر باشد.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/gamecenters"
                className="group inline-flex items-center gap-4 rounded-full bg-[#B8F34A] px-7 py-4 text-sm font-bold text-[#10130A] transition duration-300 hover:-translate-y-1 hover:bg-[#D1FF78]"
              >
                کشف گیم‌نت‌ها
                <span
                  aria-hidden="true"
                  className="text-lg transition-transform group-hover:-translate-x-1"
                >
                  ↗
                </span>
              </Link>
              <a
                href="#origin"
                className="inline-flex items-center gap-3 px-4 py-3 text-sm text-white/65 transition hover:text-[#B8F34A]"
              >
                داستان سایرا <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="mt-16 flex items-center gap-5 border-t border-white/10 pt-6">
              <span
                className="text-[10px] tracking-[.28em] text-white/30"
                dir="ltr"
              >
                BUILT AROUND PLAY
              </span>
              <span className="h-px w-14 bg-[#B8F34A]/50" />
              <span className="text-xs text-white/40">
                یک جهان، برای تجربه‌های بیشتر
              </span>
            </div>
          </div>

          <div className="relative order-1 mx-auto aspect-square w-full max-w-[610px] lg:order-2">
            <div className="absolute inset-[12%] rounded-full bg-[#B8F34A]/10 blur-[80px]" />
            <div className="absolute inset-0 animate-[spin_90s_linear_infinite] rounded-full border border-dashed border-[#B8F34A]/15" />
            <div className="absolute inset-[8%] rounded-full border border-white/[0.06]" />
            <div className="relative h-full w-full">
              <PortalArtwork />
            </div>
            <div className="absolute bottom-[13%] left-[2%] rounded-xl border border-white/10 bg-[#0D100A]/80 px-4 py-3 shadow-2xl backdrop-blur">
              <div
                className="text-[9px] tracking-[.22em] text-[#B8F34A]"
                dir="ltr"
              >
                PORTAL 001
              </div>
              <div className="mt-1 text-xs text-white/65">
                ورود به جهان بازی
              </div>
            </div>
            <div
              className="absolute right-[3%] top-[17%] rounded-full border border-[#B8F34A]/25 bg-[#0D100A]/80 px-4 py-2 text-[9px] tracking-[.2em] text-[#D7F8A6]"
              dir="ltr"
            >
              THE NEXT LEVEL
            </div>
          </div>
        </section>

        {/* ORIGIN */}
        <section
          id="origin"
          className="border-y border-white/[0.07] bg-[#0D100B]"
        >
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-16 lg:py-32">
            <div>
              <p
                className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                dir="ltr"
              >
                01 — THE ORIGIN
              </p>
              <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
                از یک نیاز،
                <br />
                تا یک جهان.
              </h2>
            </div>
            <div className="max-w-3xl">
              <p className="text-xl font-medium leading-10 text-white/85 sm:text-2xl sm:leading-[2.2]">
                پیدا کردن یک گیم‌نت مناسب نباید خودش به یک مرحله سخت از بازی
                تبدیل شود.
              </p>
              <p className="mt-7 text-base leading-9 text-white/50">
                سایرا با یک ایده شکل گرفت: ساختن مسیری روشن‌تر برای ارتباط میان
                گیمرها و مراکز بازی. ما می‌خواهیم شناختن فضاهای بازی، بررسی
                انتخاب‌ها و رسیدن به تجربه‌ای که دنبالش هستی، شفاف‌تر و ساده‌تر
                باشد. سایرا یک نقطه شروع است؛ جهانی که قرار است با جامعه بازی
                رشد کند.
              </p>
              <div className="mt-12 grid grid-cols-2 gap-4 border-t border-white/10 pt-7 sm:grid-cols-3">
                <div>
                  <p className="text-3xl font-black text-[#B8F34A]" dir="ltr">
                    01
                  </p>
                  <p className="mt-2 text-xs text-white/45">یک نقطه شروع</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#B8F34A]" dir="ltr">
                    ∞
                  </p>
                  <p className="mt-2 text-xs text-white/45">
                    تجربه‌های بی‌پایان
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-3xl font-black text-[#B8F34A]" dir="ltr">
                    YOU
                  </p>
                  <p className="mt-2 text-xs text-white/45">مرکز این جهان</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UNIVERSE */}
        <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p
                className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                dir="ltr"
              >
                02 — THE UNIVERSE
              </p>
              <h2 className="mt-5 text-4xl font-black sm:text-5xl">
                جهان سایرا،
                <br className="sm:hidden" /> با حضور تو کامل می‌شود.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-8 text-white/45">
              سه بخش از یک تجربه مشترک؛ برای اینکه مسیر بازی، از جست‌وجو تا
              اجرا، به هم متصل باشد.
            </p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {pillars.map((item) => (
              <article
                key={item.number}
                className="group relative min-h-[290px] overflow-hidden rounded-2xl border border-white/10 bg-[#0D100B] p-7 transition duration-500 hover:-translate-y-2 hover:border-[#B8F34A]/40 sm:p-9"
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
                <h3 className="relative mt-16 text-3xl font-extrabold">
                  {item.title}
                </h3>
                <p className="relative mt-5 text-sm leading-8 text-white/45">
                  {item.description}
                </p>
                <div className="absolute bottom-0 right-0 h-px w-0 bg-[#B8F34A] transition-all duration-500 group-hover:w-full" />
              </article>
            ))}
          </div>
        </section>

        {/* BRAND PRINCIPLES */}
        <section className="relative overflow-hidden border-y border-white/[0.07] bg-[#0D100B]">
          <div
            aria-hidden="true"
            className="absolute -left-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#B8F34A]/[0.06] blur-[100px]"
          />
          <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:px-16 lg:py-32">
            <div>
              <p
                className="text-[10px] tracking-[.3em] text-[#B8F34A]"
                dir="ltr"
              >
                03 — OUR PRINCIPLES
              </p>
              <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
                فلسفه ما
                <br />
                در چند کلمه.
              </h2>
              <p className="mt-7 max-w-md text-sm leading-8 text-white/45">
                ما به تجربه‌ای باور داریم که ساده، قابل فهم و متصل باشد.
                تکنولوژی باید مسیر را هموار کند، نه پیچیده‌تر.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {[
                [
                  "01",
                  "سادگی، نه پیچیدگی",
                  "هر قدم باید قابل فهم و بی‌دردسر باشد.",
                ],
                [
                  "02",
                  "ارتباط، نه فاصله",
                  "گیمرها و گیم‌نت‌ها باید راحت‌تر همدیگر را پیدا کنند.",
                ],
                [
                  "03",
                  "تجربه، نه فقط ابزار",
                  "آنچه اهمیت دارد کیفیت تجربه‌ای است که شکل می‌گیرد.",
                ],
              ].map(([n, title, desc]) => (
                <div key={n} className="flex gap-5 py-6 sm:gap-8">
                  <span className="pt-1 text-xs text-[#B8F34A]" dir="ltr">
                    {n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/40">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FUTURE */}
        <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
          <div className="relative overflow-hidden rounded-[28px] border border-[#B8F34A]/20 bg-[radial-gradient(ellipse_at_85%_50%,rgba(184,243,74,0.12),transparent_45%),#0D100B] px-7 py-14 sm:px-12 sm:py-20 lg:px-20">
            <div
              className="absolute left-8 top-8 text-[9px] tracking-[.3em] text-white/25"
              dir="ltr"
            >
              SAYRA / BEYOND THE GAME
            </div>
            <p className="text-[10px] tracking-[.3em] text-[#B8F34A]" dir="ltr">
              04 — WHAT COMES NEXT
            </p>
            <h2 className="mt-7 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              این فقط آغاز
              <br />
              یک <span className="text-[#B8F34A]">جهان تازه</span> است.
            </h2>
            <p className="mt-7 max-w-xl text-sm leading-8 text-white/50">
              سایرا با جامعه‌ای که دور آن شکل می‌گیرد معنا پیدا می‌کند. مسیر پیش
              رو را با گیمرها و گیم‌نت‌ها می‌سازیم؛ قدم به قدم، تجربه به تجربه.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/gamecenters"
                className="inline-flex items-center gap-4 rounded-full bg-[#B8F34A] px-7 py-4 text-sm font-bold text-[#10130A] transition hover:bg-[#D1FF78]"
              >
                ورود به جهان سایرا <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/register-gamecenter"
                className="inline-flex items-center rounded-full border border-white/15 px-7 py-4 text-sm text-white/70 transition hover:border-[#B8F34A]/50 hover:text-[#B8F34A]"
              >
                معرفی گیم‌نت
              </Link>
            </div>
            <div
              className="mt-16 flex items-center justify-between border-t border-white/10 pt-5 text-[9px] tracking-[.25em] text-white/25"
              dir="ltr"
            >
              <span>ENTER THE UNIVERSE</span>
              <span>SAYRA © {new Date().getFullYear()}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] px-5 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-black tracking-[.25em] text-white/70" dir="ltr">
            SAYRA<span className="text-[#B8F34A]">.</span>
          </span>
          <p>جهانی برای نزدیک‌تر شدن به تجربه بازی.</p>
          <div className="flex gap-5">
            <Link
              href="/gamecenters"
              className="transition hover:text-[#B8F34A]"
            >
              گیم‌نت‌ها
            </Link>
            <Link href="/profile" className="transition hover:text-[#B8F34A]">
              پروفایل
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
