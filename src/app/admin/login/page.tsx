
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = "https://blog.sayra-booking.ir";

interface LoginResponse {
  data?: {
    access?: string;
    refresh?: string;
  };
  messagesList?: string[];
}

export default function AdminLoginPage() {
  const router = useRouter();

  // اتصال به سیستم احراز هویت پروژه
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) return;

    setErrorMessage("");

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setErrorMessage("لطفاً نام کاربری و رمز عبور را وارد کنید.");
      return;
    }

    setIsLoading(true);

    try {
      // ارسال درخواست ورود به API
      const response = await fetch(
        `${BASE_URL}/api/auth/admin-login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: normalizedUsername,
            password,
          }),
        }
      );

      // دریافت پاسخ سرور
      const result: LoginResponse = await response
        .json()
        .catch(() => ({}));

      // بررسی خطاهای API
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("نام کاربری یا رمز عبور اشتباه است.");
        }

        if (response.status === 403) {
          throw new Error(
            "دسترسی به پنل مدیریت فقط برای کاربران Staff مجاز است."
          );
        }

        throw new Error(
          result?.messagesList?.[0] ||
            "خطا در ورود به سامانه. لطفاً مجدداً تلاش کنید."
        );
      }

      // استخراج توکن‌ها از ساختار واقعی پاسخ API
      const accessToken = result?.data?.access;
      const refreshToken = result?.data?.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error(
          "ورود موفق بود اما توکن‌های معتبر از سرور دریافت نشدند."
        );
      }

      // ثبت اطلاعات ورود در AuthContext
      // تابع login مسئول ذخیره توکن‌ها و به‌روزرسانی وضعیت کاربر است.
      login(
        "مدیر سامانه",
        normalizedUsername,
        accessToken,
        refreshToken,
        "ADMIN"
      );

      console.log("Admin login successful.");

      // انتقال به پنل مدیریت
      router.replace("/admin");

    } catch (error: unknown) {
      console.error("Admin Login Error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "خطای غیرمنتظره‌ای رخ داده است.";

      setErrorMessage(message);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10"
    >
      <div className="w-full max-w-md">

        {/* لوگو و عنوان */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white shadow-lg shadow-blue-600/20">
            A
          </div>

          <h1 className="text-2xl font-bold text-white">
            پنل مدیریت
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            برای ورود به سامانه اطلاعات خود را وارد کنید.
          </p>
        </div>

        {/* فرم ورود */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">

          <form onSubmit={handleLogin} className="space-y-5">

            {/* نام کاربری */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                نام کاربری
              </label>

              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="نام کاربری خود را وارد کنید"
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              />
            </div>

            {/* رمز عبور */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                رمز عبور
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="رمز عبور خود را وارد کنید"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pl-16 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
                >
                  {showPassword ? "مخفی کردن" : "نمایش"}
                </button>
              </div>
            </div>

            {/* پیام خطا */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
              >
                {errorMessage}
              </div>
            )}

            {/* دکمه ورود */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  در حال ورود...
                </span>
              ) : (
                "ورود به پنل مدیریت"
              )}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          ورود به این بخش مخصوص مدیران مجاز سامانه است.
        </p>

      </div>
    </main>
  );
}
