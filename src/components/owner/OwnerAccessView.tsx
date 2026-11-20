"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { BottomBar } from "@/components/BottomBar";

export type OwnerAccessVariant = "unauthenticated" | "forbidden" | "no_center" | "error";

const primaryBtn =
  "flex h-12 w-full items-center justify-center gap-2 rounded-card bg-[var(--primary)] px-6 text-sm font-bold text-on-primary transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer";

const secondaryBtn =
  "flex h-11 w-full items-center justify-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] px-5 text-xs font-bold text-[var(--text-white)] transition-colors hover:bg-[var(--border-color)] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer";

export const OwnerPanelSkeleton: React.FC<{ statusText?: string }> = ({
  statusText = "در حال بررسی دسترسی و بارگذاری پنل مدیریت...",
}) => {
  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)] pb-24 lg:pb-8"
      aria-busy="true"
      aria-label={statusText}
    >
      {/* Header Skeleton */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/70 px-4 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--foreground)] animate-pulse" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-28 rounded bg-[var(--foreground)] animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-[var(--foreground)]/70 animate-pulse" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-ping" />
            <span>{statusText}</span>
          </div>
        </div>
      </div>

      {/* Body Skeleton */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 animate-pulse">
        {/* Hero Card */}
        <div className="h-36 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col justify-between">
          <div className="h-3.5 w-32 rounded bg-[var(--foreground)]" />
          <div className="h-7 w-44 rounded bg-[var(--foreground)]" />
          <div className="h-9 w-28 rounded-card bg-[var(--foreground)]/80" />
        </div>

        {/* 2x2 Quick Action Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col items-center justify-center gap-2"
            >
              <div className="h-7 w-7 rounded-lg bg-[var(--foreground)]" />
              <div className="h-3 w-16 rounded bg-[var(--foreground)]" />
            </div>
          ))}
        </div>

        {/* Menu List Skeleton */}
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-[var(--foreground)]" />
                <div className="h-3.5 w-32 rounded bg-[var(--foreground)]" />
              </div>
              <div className="h-4 w-4 rounded bg-[var(--foreground)]/70" />
            </div>
          ))}
        </div>
      </div>

      <BottomBar />
    </div>
  );
};

interface OwnerAccessStateProps {
  variant: OwnerAccessVariant;
  pathname?: string;
  message?: string | null;
  onLoginClick?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const OwnerAccessState: React.FC<OwnerAccessStateProps> = ({
  variant,
  pathname = "/owner",
  message,
  onLoginClick,
  onRetry,
  isRetrying = false,
}) => {
  const loginHref = `/login?redirect=${encodeURIComponent(pathname || "/owner")}`;

  const config = {
    unauthenticated: {
      iconName: "user" as const,
      iconTone: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/25",
      title: "ورود به پنل مدیریت گیم‌نت",
      description:
        "این بخش مخصوص مدیران گیم‌نت است. برای مشاهده و مدیریت گیم‌نت خود، ابتدا وارد حساب کاربری شوید.",
    },
    forbidden: {
      iconName: "alert" as const,
      iconTone: "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/25",
      title: "دسترسی به پنل مدیریت مجاز نیست",
      description:
        message ||
        "حساب کاربری فعلی شما دسترسی مدیریتی به این بخش ندارد. اگر به تازگی گیم‌نت خود را ثبت کرده‌اید یا با حساب دیگری مدیر هستید، می‌توانید مجدداً بررسی کنید یا حساب خود را تغییر دهید.",
    },
    no_center: {
      iconName: "alert" as const,
      iconTone: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/25",
      title: "هنوز گیم‌نتی برای این حساب ثبت نشده است",
      description:
        message ||
        "برای استفاده از امکانات پنل مدیریت، ابتدا گیم‌نت خود را ثبت کنید یا در صورت ثبت قبلی، وضعیت را مجدداً بررسی نمایید.",
    },
    error: {
      iconName: "alert" as const,
      iconTone: "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/25",
      title: "خطا در دریافت اطلاعات پنل مدیریت",
      description:
        message ||
        "در برقراری ارتباط با سرور مشکلی پیش آمد. لطفاً اتصال خود را بررسی کرده و دوباره تلاش کنید.",
    },
  }[variant];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-body)] px-4 py-8 pb-28 lg:pb-8 text-[var(--text-white)]">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center shadow-xl shadow-black/20">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full border ${config.iconTone}`}
        >
          <Icon name={config.iconName} size={30} />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-base font-bold text-[var(--text-white)]">
            {config.title}
          </h1>
          <p className="text-xs leading-6 text-[var(--text-muted)]">
            {config.description}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5 pt-1">
          {variant === "unauthenticated" && (
            <>
              {onLoginClick ? (
                <button type="button" onClick={onLoginClick} className={primaryBtn}>
                  ورود به حساب کاربری
                </button>
              ) : (
                <Link href={loginHref} className={primaryBtn}>
                  ورود به حساب کاربری
                </Link>
              )}
              <Link href="/register-gamecenter" className={secondaryBtn}>
                ثبت گیم‌نت جدید
              </Link>
            </>
          )}

          {variant === "forbidden" && (
            <>
              <Link href="/register-gamecenter" className={primaryBtn}>
                ثبت گیم‌نت جدید
              </Link>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className={secondaryBtn}
                  >
                    {isRetrying ? "در حال بررسی..." : "بررسی مجدد دسترسی"}
                  </button>
                )}
                <Link href={loginHref} className={secondaryBtn}>
                  تغییر حساب کاربری
                </Link>
              </div>
            </>
          )}

          {variant === "no_center" && (
            <>
              <Link href="/register-gamecenter" className={primaryBtn}>
                ساخت گیم‌نت جدید
              </Link>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className={secondaryBtn}
                >
                  {isRetrying ? "در حال بررسی..." : "بررسی مجدد"}
                </button>
              )}
            </>
          )}

          {variant === "error" && (
            <>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className={primaryBtn}
                >
                  {isRetrying ? "در حال تلاش..." : "تلاش مجدد"}
                </button>
              )}
            </>
          )}

          <Link
            href="/"
            className="mt-1 inline-flex items-center justify-center py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-white)]"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>

      <BottomBar />
    </main>
  );
};
