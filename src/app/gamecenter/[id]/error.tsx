"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GamecenterError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]"
    >
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-24 lg:pt-[calc(var(--header-h)+48px)]">
        <ErrorState
          title="خطا در بارگذاری گیمنت"
          description="در حال حاضر امکان دریافت اطلاعات این گیمنت وجود ندارد. لطفاً چند لحظه بعد دوباره تلاش کنید."
          onRetry={reset}
          className="w-full"
        />
        <Link
          href="/gamecenters"
          className="mt-5 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          مشاهده لیست گیمنت‌ها
        </Link>
      </main>
    </div>
  );
}
