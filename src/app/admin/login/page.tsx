
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

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // تبدیل اعداد فارسی و عربی به انگلیسی
  const normalizeDigits = (value: string) => {
    return value
      .replace(/[۰-۹]/g, (digit) =>
        String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
      )
      .replace(/[٠-٩]/g, (digit) =>
        String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedPhone = normalizeDigits(phone).trim();

    // اعتبارسنجی شماره موبایل
    if (!normalizedPhone) {
      setErrorMessage("لطفاً شماره موبایل خود را وارد کنید.");
      return;
    }

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setErrorMessage(
        "شماره موبایل معتبر نیست. شماره باید با 09 شروع شود و 11 رقم باشد."
      );
      return;
    }

    if (!password) {
      setErrorMessage("لطفاً رمز عبور خود را وارد کنید.");
      return;
    }

    setIsLoading(true);

    try {
      // ارسال درخواست ورود مدیر پلتفرم
      const res = await authService.loginPlatformAdmin(
        normalizedPhone,
        password
      );

      if (!res?.accessToken) {
        throw new Error("توکن معتبری از سمت سرور دریافت نشد.");
      }

      // ذخیره توکن‌ها
      setTokens({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });

      // دریافت اطلاعات مدیر
      const adminName =
        res.user?.fullName ||
        res.user?.name ||
        "مدیر سامانه";

      const adminPhone =
        res.user?.phone || normalizedPhone;

      // ثبت اطلاعات در AuthContext
      login(
        adminName,
        adminPhone,
        res.accessToken,
        res.refreshToken,
        "ADMIN"
      );

      // انتقال به پنل مدیریت
      router.replace("/admin");

    } catch (err: unknown) {
      const error = err as {
        message?: string;
        status?: number;
        response?: {
          status?: number;
          data?: {
            message?: string;
          };
        };
      };

      const status =
        error?.status || error?.response?.status;

      const msg =
        error?.response?.data?.message ||
        (status === 401
          ? "شماره موبایل یا رمز عبور اشتباه است."
          : status === 403
          ? "حساب کاربری شما دسترسی مدیر پلتفرم را ندارد."
          : error?.message ||
            "خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");

      setErrorMessage(msg);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 py-8"
    >
      <div
        className="w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-amber-400 flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-[var(--primary)]/20 mb-1"
          >
            <Icon name="gamepad" size={28} />
          </div>

          <h1 className="text-xl font-black text-[var(--text-white)] tracking-tight">
            ورود مدیر سامانه
          </h1>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            جهت ورود به پنل مدیریت کل پلتفرم،
            شماره موبایل و رمز عبور خود را وارد کنید.
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed flex items-start gap-2"
          >
            <Icon
              name="alert"
              size={16}
              className="shrink-0 mt-0.5"
            />

            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] text-right">
              شماره موبایل مدیر سامانه
            </label>

            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                placeholder="09121234567"
                value={phone}
                onChange={(e) => {
                  setPhone(
                    normalizeDigits(e.target.value)
                  );
                }}
                disabled={isLoading}
                dir="ltr"
                maxLength={11}
                required
                className="w-full h-11 px-3.5 pl-10 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] outline-none transition-colors"
              />

              <span className="absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none">
                <Icon name="user" size={18} />
              </span>
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)]">
              رمز عبور
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                disabled={isLoading}
                dir="ltr"
                required
                className="w-full h-11 px-3.5 pl-10 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] outline-none transition-colors"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                disabled={isLoading}
                className="absolute left-3 top-3 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                title={
                  showPassword
                    ? "مخفی کردن رمز"
                    : "نمایش رمز"
                }
              >
                <Icon
                  name={showPassword ? "close" : "info"}
                  size={18}
                />
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full h-11 font-bold mt-2 shadow-lg shadow-[var(--primary)]/20"
          >
            ورود به پنل مدیریت
          </Button>
        </form>

        {/* Footer */}
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
