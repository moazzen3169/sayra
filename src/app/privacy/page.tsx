import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SUPPORT_PHONE } from "@/lib/contact";

export const metadata: Metadata = {
  title: "حریم خصوصی کاربران | سایرا",
  description:
    "سیاست حریم خصوصی و اصول جمع‌آوری، پردازش، نگهداری و حفاظت از اطلاعات کاربران و گیم‌نت‌ها در پلتفرم سایرا مطابق ماده ۱۷ قوانین و مقررات.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "حریم خصوصی کاربران | سایرا",
    description:
      "نحوه جمع‌آوری، نگهداری، دسترسی و حفاظت از اطلاعات کاربران و گیم‌نت‌ها در پلتفرم رزرو آنلاین سایرا.",
    url: "/privacy",
    type: "website",
    locale: "fa_IR",
  },
};

const PRIVACY_PRINCIPLES = [
  {
    number: "۰۱",
    title: "اطلاعات مشتریان",
    description:
      "اطلاعات مورد نیاز در زمان ثبت‌نام شامل شماره تلفن همراه است. سایر اطلاعات ضروری در جریان استفاده از سایت، ثبت رزرو، پرداخت یا پشتیبانی، صرفاً به تناسب نیاز هر خدمت دریافت می‌شود.",
  },
  {
    number: "۰۲",
    title: "اطلاعات گیم‌نت‌ها",
    description:
      "اطلاعات گیم‌نت‌ها شامل اطلاعات هویتی، تماس، نشانی، مدارک فعالیت و اطلاعات بانکی است که برای احراز هویت، بررسی صلاحیت، مدیریت همکاری و تسویه‌حساب دریافت و بررسی می‌شود.",
  },
  {
    number: "۰۳",
    title: "هدفمند بودن پردازش اطلاعات",
    description:
      "پلتفرم سایرا اطلاعات کاربران را صرفاً در چارچوب ارائه خدمات معرفی و رزرو، پردازش پرداخت‌ها، پاسخگویی پشتیبانی و الزامات قانونی پردازش می‌کند.",
  },
  {
    number: "۰۴",
    title: "کنترل دسترسی و محرمانگی",
    description:
      "دسترسی کارکنان و اشخاص مجاز به داده‌های حساب کاربری و سوابق رزرو، محدود به حدود وظایف و نیاز عملیاتی آنان است.",
  },
  {
    number: "۰۵",
    title: "سوابق و اصلاح یا پیگیری درخواست‌ها",
    description:
      "سوابق ثبت‌نام، پذیرش مقررات، رزروها و تراکنش‌ها مطابق مقررات نگهداری می‌شود و کاربران می‌توانند درخواست‌های اصلاح یا پیگیری حریم خصوصی خود را از طریق پشتیبانی رسمی ثبت کنند.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-clip bg-[#080A07] text-[#F4F5EF] selection:bg-[#B8F34A] selection:text-[#080A07]"
    >
      <Header />

      <main className="mx-auto max-w-[1120px] px-5 pt-[calc(var(--header-m-h)+32px)] pb-16 sm:px-8 lg:px-12 lg:pt-[calc(var(--header-h)+48px)]">
        <section className="border-b border-white/10 pb-10">
          <p
            className="text-[10px] tracking-[.3em] text-[#B8F34A]"
            dir="ltr"
          >
            SAYRA / PRIVACY POLICY
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
            سیاست <span className="text-[#B8F34A]">حریم خصوصی</span> کاربران
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-white/65 sm:text-base">
            پلتفرم سایرا اطلاعات مورد نیاز برای ایجاد حساب کاربری، ثبت رزرو،
            پرداخت، پشتیبانی و ارائه خدمات گیم‌نت‌ها را مطابق ماده ۱۷ سند
            قوانین و مقررات و قوانین لازم‌الاجرا جمع‌آوری و حفاظت می‌کند.
          </p>
        </section>

        <section className="mt-10 divide-y divide-white/10 border-b border-white/10">
          {PRIVACY_PRINCIPLES.map((item) => (
            <article key={item.number} className="flex gap-5 py-7 sm:gap-8">
              <span className="pt-1 text-xs font-bold text-[#B8F34A]">
                {item.number}
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-[#F4F5EF] sm:text-xl">
                  {item.title}
                </h2>
                <p className="mt-2.5 text-sm leading-8 text-white/60 sm:text-base">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-[#0D100B] p-6 sm:p-8">
          <h2 className="text-base font-bold text-[#F4F5EF] sm:text-lg">
            ارتباط با واحد پشتیبانی و مطالعه قوانین کامل
          </h2>
          <p className="mt-2 text-xs leading-7 text-white/55 sm:text-sm">
            در صورت وجود هرگونه سؤال درباره نحوه نگهداری، اصلاح یا حفاظت از
            اطلاعات کاربری، می‌توانید از طریق سامانه تیکتینگ پشتیبانی با ما در
            ارتباط باشید{SUPPORT_PHONE ? ` یا با شماره ${SUPPORT_PHONE} تماس بگیرید` : ""}.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/support"
              className="inline-flex h-11 items-center rounded-full bg-[#B8F34A] px-6 text-xs font-bold text-[#10130A] transition hover:bg-[#D1FF78] sm:text-sm"
            >
              ثبت تیکت پشتیبانی
            </Link>
            <Link
              href="/terms#article-17"
              className="inline-flex h-11 items-center rounded-full border border-white/15 px-6 text-xs font-bold text-white/75 transition hover:border-[#B8F34A]/50 hover:text-[#B8F34A] sm:text-sm"
            >
              مشاهده ماده ۱۷ در قوانین و مقررات
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
