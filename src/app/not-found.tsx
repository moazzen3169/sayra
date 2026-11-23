import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "صفحه مورد نظر پیدا نشد | سایرا",
  description: "صفحه یا آدرس درخواستی در پلتفرم سایرا یافت نشد.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]"
    >
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-24 text-center lg:pt-[calc(var(--header-h)+48px)]">
        <div className="w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 sm:p-12">
          <span
            dir="ltr"
            className="inline-block rounded-full border border-[var(--primary)]/30 bg-[var(--primary-muted)] px-4 py-1 text-xs font-bold tracking-widest text-[var(--primary)]"
          >
            404 — NOT FOUND
          </span>

          <h1 className="mt-6 text-2xl font-black text-[var(--text-white)] sm:text-4xl">
            صفحه مورد نظر پیدا نشد
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[var(--text-muted)]">
            ممکن است آدرس صفحه تغییر کرده باشد، گیمنت یا مقاله مورد نظر حذف شده
            باشد یا لینک وارد شده اشتباه باشد.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-card bg-[var(--primary)] px-6 text-sm font-bold text-on-primary transition hover:brightness-105"
            >
              بازگشت به صفحه اصلی
            </Link>
            <Link
              href="/gamecenters"
              className="inline-flex h-11 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/50 px-6 text-sm font-bold text-[var(--text-white)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              مشاهده گیمنت‌ها
            </Link>
            <Link
              href="/blog"
              className="inline-flex h-11 items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 px-6 text-sm font-bold text-[var(--text-white)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              وبلاگ سایرا
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
