
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Icon } from "@/components/ui/Icon";
import { BottomBar } from "@/components/BottomBar";

/** مسیرهایی که برای ساخت گیمنت آزاد هستند */
const OPEN_PATHS = ["/owner/new"];

/** نقش‌های مجاز برای پنل مدیریت */
const ALLOWED_ROLES = ["MANAGER", "ADMIN"];

const primaryLink =
  "flex h-12 w-full items-center justify-center rounded-card bg-[var(--primary)] px-6 text-sm font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const secondaryLink =
  "flex h-12 w-full items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] px-6 text-sm font-bold text-[var(--text-white)] transition-colors hover:bg-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export const OwnerAccessGuard: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const pathname = usePathname();

  const {
    isLoggedIn,
    role,
    user,
    isLoading,
  } = useAuth();

  // مسیر ثبت گیمنت برای همه آزاد است.
  const isOpenPath = OPEN_PATHS.some(
    (path) =>
      pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isOpenPath) {
    return <>{children}</>;
  }

  // جلوگیری از نمایش محتوای اشتباه هنگام بررسی نشست کاربر
  if (isLoading) {
    return null;
  }

  const normalizedRole = String(role ?? user?.role ?? "")
    .trim()
    .toUpperCase();

  const actorType = String(user?.actorType ?? "")
    .trim()
    .toUpperCase();

  const isCustomerActor = actorType === "CUSTOMER";

  const hasAccess =
    isLoggedIn === true &&
    !isCustomerActor &&
    ALLOWED_ROLES.includes(normalizedRole);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-body)] px-4 py-8 pb-28 lg:pb-8 text-[var(--text-white)]">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center">

        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)]/40 text-[var(--text-muted)]">
          <Icon
            name={isLoggedIn ? "alert" : "user"}
            size={32}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-base font-bold">
            {isLoggedIn
              ? "به پنل مدیریت دسترسی ندارید"
              : "برای ورود به پنل مدیریت وارد شوید"}
          </h1>

          <p className="text-xs leading-6 text-[var(--text-muted)]">
            {isLoggedIn
              ? "حساب شما دسترسی مدیریتی ندارد. برای استفاده از پنل مدیریت، گیمنت خود را ثبت کنید."
              : "این بخش مخصوص مدیران گیمنت است. ابتدا وارد حساب کاربری خود شوید یا گیمنت خود را ثبت کنید."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          {isLoggedIn ? (
            <>
              <Link href="/owner/new" className={primaryLink}>
                ایجاد گیمنت
              </Link>

              <Link href="/" className={secondaryLink}>
                بازگشت به صفحه اصلی
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname)}`}
                className={primaryLink}
              >
                ورود به حساب کاربری
              </Link>

              <Link href="/owner/new" className={secondaryLink}>
                ایجاد گیمنت
              </Link>
            </>
          )}
        </div>
      </div>
      <BottomBar />
    </main>
  );
};
