"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UnifiedAuthForm, UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";
import { useAuth } from "@/context/AuthContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";
  const { login } = useAuth();

  const handleSuccess = (data: UnifiedAuthSuccessData) => {
    login(
      data.fullName,
      data.phone,
      data.accessToken,
      data.refreshToken,
      data.role || "USER"
    );

    if (data.gamingCenterId) {
      try {
        localStorage.setItem("sayra_owner_center_id", data.gamingCenterId);
      } catch {
        // ignore
      }
    }

    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }

    // Role-based navigation if no explicit redirect URL was specified
    const roleUpper = (data.role || "").toUpperCase();
    if (roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN" || roleUpper === "PLATFORM_ADMIN") {
      router.replace("/admin");
    } else if (roleUpper === "MANAGER" || roleUpper === "STAFF" || roleUpper === "OWNER") {
      router.replace("/owner");
    } else {
      router.replace("/profile");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-body)] px-4 py-8">
      <div className="w-full max-w-[460px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <Link href="/" className="flex items-center gap-2 text-[var(--primary)] font-bold text-sm">
            <span className="w-8 h-8 rounded-card bg-[var(--primary)]/10 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </span>
            <span>بازگشت به صفحه اصلی</span>
          </Link>
        </div>

        <UnifiedAuthForm
          onSuccess={handleSuccess}
          title="ورود و ثبت‌نام در سامانه سایرا"
          description="ورود و ثبت‌نام سریع با پیامک یک‌بار مصرف (OTP) بدون نیاز به رمز عبور"
        />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 py-8">
          <div className="w-full max-w-[460px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 animate-pulse">
            <div className="h-6 bg-[var(--foreground)] rounded w-1/3 mb-4" />
            <div className="h-4 bg-[var(--foreground)] rounded w-2/3 mb-6" />
            <div className="h-10 bg-[var(--foreground)] rounded w-full mb-3" />
            <div className="h-12 bg-[var(--foreground)] rounded w-full" />
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
