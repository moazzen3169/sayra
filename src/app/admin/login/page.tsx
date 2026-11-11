"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { setTokens } from "@/lib/token";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("لطفاً آدرس ایمیل را وارد کنید.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isIranPhone = /^09\d{9}$/.test(trimmedEmail);
    if (!emailRegex.test(trimmedEmail) && !isIranPhone) {
      setErrorMessage("لطفاً آدرس ایمیل معتبر یا شماره موبایل (۰۹...) را وارد نمایید.");
      return;
    }

    if (!password) {
      setErrorMessage("لطفاً کلمه عبور را وارد کنید.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.loginPlatformAdminWithEmail(trimmedEmail, password);

      if (!res.accessToken) {
        throw new Error("توکن معتبری از سمت سرور دریافت نشد.");
      }

      setTokens({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });

      const adminName = res.user?.fullName || res.user?.name || "مدیر سامانه";
      const adminPhone = res.user?.phone || trimmedEmail;
      login(adminName, adminPhone, res.accessToken, res.refreshToken, "ADMIN");

      router.replace("/admin");
    } catch (err: any) {
      const msg =
        err?.message ||
        (err?.status === 401
          ? "ایمیل یا رمز عبور اشتباه است."
          : err?.status === 403
          ? "حساب کاربری شما سطح دسترسی مدیر پلتفرم را ندارد."
          : "خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 py-8">
      <div className="w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-amber-400 flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-[var(--primary)]/20 mb-1">
            <Icon name="gamepad" size={28} />
          </div>
          <h1 className="text-xl font-black text-[var(--text-white)] tracking-tight">
            ورود مدیر سامانه
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            جهت ورود به پنل مدیریت کل پلتفرم، ایمیل سازمانی و رمز عبور خود را وارد کنید
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed flex items-start gap-2"
          >
            <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] text-right">
              ایمیل مدیر سامانه
            </label>
            <div className="relative">
              <input
                type="email"
                autoComplete="email"
                placeholder="admin@sayra.ir"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                dir="ltr"
                required
                className="w-full h-11 px-3.5 pl-10 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] outline-none transition-colors"
              />
              <span className="absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none">
                <Icon name="user" size={18} />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                رمز عبور
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                dir="ltr"
                required
                className="w-full h-11 px-3.5 pl-10 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute left-3 top-3 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "مخفی کردن" : "نمایش رمز"}
              >
                <Icon name={showPassword ? "close" : "info"} size={18} />
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full h-11 font-bold mt-2 shadow-lg shadow-[var(--primary)]/20"
          >
            ورود به پنل مدیریت
          </Button>
        </form>

        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-center">
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors flex items-center gap-1.5"
          >
            <Icon name="back" size={14} />
            <span>بازگشت به صفحه اصلی سایت</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
