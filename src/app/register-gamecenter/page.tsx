import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ImageGuideSlot } from "@/components/register-gamecenter/ImageGuideSlot";
import { StepJourneySection } from "@/components/register-gamecenter/StepJourneySection";
import { OnboardingReadinessChecklist } from "@/components/register-gamecenter/OnboardingReadinessChecklist";
import { FaqAccordion } from "@/components/register-gamecenter/FaqAccordion";
import { StickyRegisterBar } from "@/components/register-gamecenter/StickyRegisterBar";
import {
  BENEFITS,
  COOPERATION_RULES,
  FAQ_ITEMS,
  IMAGE_GUIDES,
  KEY_HIGHLIGHTS,
  QUICK_NAV_LINKS,
  REGISTRATION_STEPS,
} from "@/data/registerGamecenterContent";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ثبت گیمنت و اتصال به سایرا | راهنمای مراحل، مزایا و قوانین همکاری",
  description:
    "گیمنت خود را به سایرا متصل کنید؛ راهنمای کامل مزایای رزرو آنلاین، مراحل ۵ گانه ثبت گیمنت، مدارک احراز هویت، مهلت ۳۰ دقیقه‌ای تأیید رزرو، کمیسیون و تسویه‌حساب ۳ روز کاری.",
  keywords: [
    "ثبت گیمنت",
    "اتصال گیمنت به سایرا",
    "ایجاد گیمنت در سایرا",
    "رزرو آنلاین گیمنت",
    "پنل مدیریت گیمنت",
    "قوانین همکاری گیمنت سایرا",
    "مدارک ثبت گیمنت",
  ],
  alternates: {
    canonical: "/register-gamecenter",
  },
  openGraph: {
    title: "ثبت گیمنت و اتصال به سایرا | راهنمای مراحل، مزایا و قوانین همکاری",
    description:
      "همه آنچه برای اتصال گیمنت به پلتفرم رزرو آنلاین سایرا نیاز دارید: مزایا، مراحل ثبت، مدارک لازم و قوانین شفاف همکاری.",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ثبت گیمنت و اتصال به سایرا",
    description:
      "راهنمای جامع آماده‌سازی، قوانین، مزایا و ثبت آنلاین گیمنت در پلتفرم سایرا.",
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
      name: "ثبت گیمنت و اتصال به سایرا | راهنمای مراحل، مزایا و قوانین همکاری",
      description:
        "راهنمای جامع مدیران و صاحبان گیمنت برای اتصال مجموعه به پلتفرم سایرا، آشنایی با مزایا، مدارک، قوانین همکاری و شروع فرایند ثبت گیمنت.",
      inLanguage: "fa",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "صفحه اصلی",
          item: "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "ثبت و اتصال گیمنت",
          item: "/register-gamecenter",
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "نحوه ثبت و اتصال گیمنت به پلتفرم سایرا",
      description:
        "مراحل گام‌به‌گام ثبت اطلاعات اولیه، تأیید شماره، تعیین موقعیت و ساعات کاری و احراز هویت گیمنت در سایرا.",
      step: REGISTRATION_STEPS.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.title,
        text: step.summary,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

const RULE_TONE_STYLES = {
  primary: {
    badge: "primary" as const,
    iconWrap: "bg-[var(--primary-muted)] text-[var(--primary)] border-[var(--primary)]/30",
    topBorder: "border-t-[var(--primary)]",
  },
  success: {
    badge: "success" as const,
    iconWrap: "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border-[var(--accent-green)]/30",
    topBorder: "border-t-[var(--accent-green)]",
  },
  warning: {
    badge: "warning" as const,
    iconWrap: "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border-[var(--accent-warning)]/30",
    topBorder: "border-t-[var(--accent-warning)]",
  },
};

export default function RegisterGamecenterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)] selection:bg-[var(--primary)] selection:text-on-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c"),
        }}
      />

      <Header />

      <main className="mx-auto flex w-full max-w-[var(--max-app-width)] flex-1 flex-col gap-6 px-4 pt-[calc(var(--header-m-h)+4px)] pb-24 lg:gap-10 lg:px-8 lg:pt-[calc(var(--header-h)+20px)] lg:pb-12">
        {/* Breadcrumb */}
        <nav
          aria-label="مسیر راهنما"
          className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]"
        >
          <Link
            href="/"
            className="transition-colors hover:text-[var(--text-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-child"
          >
            صفحه اصلی
          </Link>
          <span aria-hidden="true" className="text-[var(--border-color)]">
            /
          </span>
          <span className="font-bold text-[var(--primary)]">
            ثبت و اتصال گیمنت
          </span>
        </nav>

        {/* Quick Section Navigation (Mobile-first scrollable strip) */}
        <nav
          aria-label="دسترسی سریع بخش‌های راهنما"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          {QUICK_NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* ================= 1. HERO SECTION ================= */}
        <section
          aria-labelledby="register-hero-title"
          className="grid grid-cols-1 items-center gap-6 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-6 lg:grid-cols-12 lg:gap-8 lg:p-8"
        >
          <div className="flex flex-col gap-5 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">راهنمای رسمی پذیرش گیمنت‌ها</Badge>
              <Badge variant="neutral">شروع در ۵ مرحله</Badge>
            </div>

            <h1
              id="register-hero-title"
              className="text-xl font-bold leading-9 text-[var(--text-white)] sm:text-2xl sm:leading-10 lg:text-3xl lg:leading-[1.45]"
            >
              اتصال گیمنت به سایرا؛{" "}
              <span className="text-[var(--primary)]">
                راهنمای ثبت، مزایا و قوانین همکاری
              </span>
            </h1>

            <p className="text-sm font-medium leading-7 text-[var(--text-muted)]">
              اگر مدیریت یک گیمنت را بر عهده دارید، سایرا مسیر دیده‌شدن مجموعه شما در میان گیمرهای شهرتان را هموار می‌کند. در این صفحه تمام مزایا، مراحل ۵ گانه ثبت اولیه، مدارک احراز هویت و قوانین شفاف رزرو و تسویه‌حساب را پیش از شروع مرور می‌کنید.
            </p>

            {/* Hero Actions — visible above the fold on mobile, single primary CTA in viewport */}
            <div
              id="hero-primary-cta"
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/owner/new"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-card bg-[var(--primary)] px-6 text-sm font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto sm:min-w-[200px]"
              >
                <span>شروع ثبت گیمنت</span>
                <Icon name="arrow-left" size={18} />
              </Link>

              <a
                href="#steps"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] px-5 text-sm font-bold text-[var(--text-white)] transition-colors hover:border-[var(--border-color)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
              >
                <span>مرور مراحل و قوانین</span>
                <Icon name="chevron" size={18} />
              </a>
            </div>

            {/* 3 Key Highlights */}
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
              {KEY_HIGHLIGHTS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-body)]/70 p-3"
                >
                  <span className="text-lg font-black leading-7 text-[var(--primary)]">
                    {item.value}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-white)]">
                    {item.label}
                  </span>
                  <span className="text-xs leading-5 text-[var(--text-muted)]">
                    {item.sublabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual Guide Slot */}
          <div className="lg:col-span-5">
            <ImageGuideSlot guide={IMAGE_GUIDES.hero} priority />
          </div>
        </section>

        {/* ================= 2. BENEFITS SECTION ================= */}
        <section
          id="benefits"
          aria-labelledby="benefits-heading"
          className="flex flex-col gap-4 scroll-mt-36 lg:scroll-mt-28"
        >
          <SectionTitle
            title="چرا گیمنت خود را به سایرا متصل کنید؟"
            subtitle="امکانات واقعی برای جذب مشتری، نظم‌دهی به رزروها و مدیریت مالی شفاف"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.id}
                className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-color)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-[var(--primary)]/30 bg-[var(--primary-muted)] text-[var(--primary)]">
                    <Icon name={benefit.icon} size={20} />
                  </div>
                  <Badge variant="neutral">{benefit.badge}</Badge>
                </div>

                <h3 className="text-sm font-bold leading-6 text-[var(--text-white)]">
                  {benefit.title}
                </h3>

                <p className="text-xs font-medium leading-6 text-[var(--text-muted)]">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>

          {/* Panel Capabilities Strip + Image Slot 2 */}
          <div className="grid grid-cols-1 items-center gap-6 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-6 lg:grid-cols-12">
            <div className="flex flex-col gap-4 lg:col-span-6">
              <div className="flex items-center gap-2">
                <Icon name="gamepad" size={20} className="text-[var(--primary)]" />
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  بعد از ثبت گیمنت چه ابزارهایی در پنل دارید؟
                </h3>
              </div>

              <p className="text-xs font-medium leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
                پس از تکمیل مراحل ثبت اولیه و تأیید مدارک، تمام ابزارهای روزمره اداره آنلاین گیمنت در یک پنل موبایل‌محور در اختیار شما قرار می‌گیرد:
              </p>

              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  "مدیریت دستگاه‌ها، بازی‌ها و دسته‌های اضافه",
                  "تأیید یا رد رزروهای جدید و رزروهای گروهی",
                  "تنظیم ساعات کاری و روزهای تعطیل مجموعه",
                  "ایجاد تخفیف اختصاصی برای ساعت‌ها یا دستگاه‌ها",
                  "بارگذاری گالری تصاویر سالن و لوگوی گیمنت",
                  "مشاهده نظرات مشتریان، گزارش مالی و برداشت وجه",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-3 text-xs font-medium leading-5 text-[var(--text-white)]"
                  >
                    <Icon
                      name="check"
                      size={16}
                      className="mt-0.5 shrink-0 text-[var(--primary)]"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-6">
              <ImageGuideSlot guide={IMAGE_GUIDES.panel} />
            </div>
          </div>
        </section>

        {/* ================= 3. STEP-BY-STEP REGISTRATION ================= */}
        <section
          id="steps"
          aria-labelledby="steps-heading"
          className="flex flex-col gap-4 scroll-mt-36 lg:scroll-mt-28"
        >
          <SectionTitle
            title="نحوه ثبت و اتصال گیمنت در سایرا"
            subtitle="از ورود اطلاعات اولیه تا احراز هویت و نمایش عمومی در سایت"
          />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <StepJourneySection />
            </div>

            <div className="lg:sticky lg:top-28 lg:col-span-5">
              <ImageGuideSlot guide={IMAGE_GUIDES.location} />
            </div>
          </div>
        </section>

        {/* ================= 4. READINESS & REQUIRED DOCUMENTS ================= */}
        <section
          id="documents"
          aria-labelledby="documents-heading"
          className="flex flex-col gap-4 scroll-mt-36 lg:scroll-mt-28"
        >
          <SectionTitle
            title="آماده‌سازی اطلاعات و مدارک احراز هویت"
            subtitle="مواردی که برای شروع سریع و تأیید بدون تأخیر نیاز دارید"
          />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <OnboardingReadinessChecklist />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-5">
              <ImageGuideSlot guide={IMAGE_GUIDES.verification} />

              <div className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <div className="flex items-center gap-2">
                  <Icon
                    name="alert"
                    size={18}
                    className="text-[var(--accent-warning)]"
                  />
                  <h3 className="text-sm font-bold text-[var(--text-white)]">
                    نکته مهم درباره احراز هویت و تغییر اطلاعات
                  </h3>
                </div>
                <p className="text-xs leading-6 text-[var(--text-muted)]">
                  مسئولیت صحت و به‌روز بودن مدارک، اطلاعات بانکی و مشخصات فنی دستگاه‌ها با مدیر گیمنت است. در صورت تغییر در مدیریت، نشانی، شماره شبا یا مجوز فعالیت، اطلاعات جدید باید بدون تأخیر اعلام و به‌روزرسانی شود.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 5. COOPERATION RULES ================= */}
        <section
          id="rules"
          aria-labelledby="rules-heading"
          className="flex flex-col gap-4 scroll-mt-36 lg:scroll-mt-28"
        >
          <SectionTitle
            title="قوانین و شرایط کلیدی همکاری گیمنت‌ها"
            subtitle="خلاصه تعهدات متقابل برای رزرو مطمئن، شفافیت مالی و حفظ حقوق طرفین"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {COOPERATION_RULES.map((rule) => {
              const tone = RULE_TONE_STYLES[rule.tone];
              return (
                <article
                  key={rule.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] border-t-2 bg-[var(--bg-card)] p-4",
                    tone.topBorder
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-card border",
                        tone.iconWrap
                      )}
                    >
                      <Icon name={rule.icon} size={20} />
                    </div>
                    <Badge variant={tone.badge}>{rule.articleRef}</Badge>
                  </div>

                  <h3 className="text-sm font-bold leading-6 text-[var(--text-white)]">
                    {rule.title}
                  </h3>

                  <p className="text-xs font-medium leading-6 text-[var(--text-muted)]">
                    {rule.summary}
                  </p>

                  <ul className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
                    {rule.points.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs leading-6 text-[var(--text-white)]"
                      >
                        <Icon
                          name="check"
                          size={16}
                          className="mt-1 shrink-0 text-[var(--primary)]"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          {/* Link to full legal terms */}
          <div className="flex flex-col justify-between gap-3 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-[var(--foreground)]/60 text-[var(--primary)]">
                <Icon name="shield" size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-[var(--text-white)]">
                  متن کامل و رسمی قوانین پلتفرم سایرا
                </p>
                <p className="text-xs leading-5 text-[var(--text-muted)]">
                  تمامی جزئیات حقوقی در ۲۲ ماده قانونی در صفحه قوانین و مقررات در دسترس است.
                </p>
              </div>
            </div>

            <Link
              href="/terms"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-xs font-bold text-[var(--primary)] underline underline-offset-4 transition-colors hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-child"
            >
              <span>مطالعه ۲۲ ماده قوانین و مقررات</span>
              <Icon name="arrow-left" size={16} />
            </Link>
          </div>
        </section>

        {/* ================= 6. FAQ SECTION ================= */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="grid grid-cols-1 gap-6 scroll-mt-36 lg:grid-cols-12 lg:scroll-mt-28"
        >
          <div className="flex flex-col gap-3 lg:col-span-4">
            <SectionTitle
              title="سؤالات متداول صاحبان گیمنت"
              subtitle="پاسخ پرسش‌های رایج پیش از ثبت مجموعه"
              className="mb-0"
            />
            <p className="text-xs font-medium leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
              اگر پیش از شروع ثبت گیمنت درباره مدارک، نحوه تسویه یا مدیریت رزروها ابهامی دارید، پاسخ پرسش‌های پرتکرار را اینجا ببینید یا با پشتیبانی در ارتباط باشید.
            </p>
            <div className="pt-1">
              <Link
                href="/support"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>ارسال سؤال به پشتیبانی</span>
                <Icon name="arrow-left" size={16} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8">
            <FaqAccordion />
          </div>
        </section>

        {/* ================= 7. FINAL CONVERSION CTA ================= */}
        <section
          id="final-primary-cta"
          aria-labelledby="final-cta-heading"
          className="flex flex-col gap-5 rounded-card border border-[var(--primary)]/40 bg-[var(--bg-card)] p-5 sm:p-8"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <Badge variant="primary" className="w-fit">
                آماده شروع همکاری
              </Badge>
              <h2
                id="final-cta-heading"
                className="text-lg font-bold leading-8 text-[var(--text-white)] sm:text-2xl sm:leading-9"
              >
                همین حالا گیمنت خود را در سایرا ثبت کنید
              </h2>
              <p className="text-xs font-medium leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
                ثبت اولیه در ۵ مرحله کوتاه انجام می‌شود و بلافاصله بعد از تأیید نهایی، به پنل مدیریت گیمنت منتقل خواهید شد.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Link
                href="/owner/new"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-card bg-[var(--primary)] px-6 text-sm font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto sm:min-w-[200px]"
              >
                <span>ایجاد گیمنت جدید</span>
                <Icon name="arrow-left" size={18} />
              </Link>

              <Link
                href="/terms"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] px-5 text-sm font-bold text-[var(--text-white)] transition-colors hover:border-[var(--border-color)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
              >
                <span>مشاهده قوانین کامل</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <StickyRegisterBar />
    </div>
  );
}
