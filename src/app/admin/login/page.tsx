
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { BLOG_API_BASE_URL } from "@/lib/api/config";
import { setBlogTokens } from "@/lib/token";

interface BlogLoginResponse {
  data?: {
    access?: string;
    refresh?: string;
  };
  messagesList?: string[];
  error?: {
    message?: string;
  };
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isLoading) return;

    setErrorMessage("");

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setErrorMessage(
        "لطفاً نام کاربری و رمز عبور را وارد کنید."
      );
      return;
    }

    setIsLoading(true);

    try {
      /**
       * Blog Platform Login
       *
       * OpenAPI:
       * POST /api/auth/admin-login/
       *
       * Request:
       * { username, password }
       *
       * Response:
       * { data: { access, refresh }, messagesList: [] }
       */
      const base = BLOG_API_BASE_URL.replace(/\/+$/, "");

      const response = await fetch(
        `${base}/auth/admin-login/`,
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

      const result: BlogLoginResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "نام کاربری یا رمز عبور اشتباه است."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "دسترسی به پنل وبلاگ فقط برای کاربران Staff مجاز است."
          );
        }

        throw new Error(
          result?.error?.message ||
          result?.messagesList?.[0] ||
          "خطا در ورود به سامانه وبلاگ."
        );
      }

      const accessToken = result?.data?.access;
      const refreshToken = result?.data?.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error(
          "پاسخ ورود فاقد Access Token یا Refresh Token معتبر است."
        );
      }

      /**
       * Save only Blog tokens.
       * Do NOT call AuthContext.login here.
       * Platform tokens must remain untouched.
       */
      setBlogTokens({
        accessToken,
        refreshToken,
      });

      // Verify Blog token storage.
      const savedAccessToken = localStorage.getItem(
        "sayra_blog_access_token"
      );

      const savedRefreshToken = localStorage.getItem(
        "sayra_blog_refresh_token"
      );

      if (!savedAccessToken || !savedRefreshToken) {
        throw new Error(
          "ذخیره توکن‌های وبلاگ در مرورگر با مشکل مواجه شد."
        );
      }

      console.log("Blog admin login successful.");

      // Blog admin must enter the Blog section.
      router.replace("/admin/blog");

    } catch (error: unknown) {
      console.error("Blog Admin Login Error:", error);

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

        {/* Logo and title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white shadow-lg shadow-blue-600/20">
            B
          </div>

          <h1 className="text-2xl font-bold text-white">
            مدیریت وبلاگ سایرا
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            برای ورود به سامانه مدیریت وبلاگ اطلاعات خود را وارد کنید.
          </p>
        </div>

        {/* Login form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Username */}
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
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="نام کاربری خود را وارد کنید"
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              />
            </div>

            {/* Password */}
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
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="رمز عبور خود را وارد کنید"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pl-20 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
                >
                  {showPassword
                    ? "مخفی کردن"
                    : "نمایش"}
                </button>
              </div>
            </div>

            {/* Error */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
              >
                {errorMessage}
              </div>
            )}

            {/* Submit */}
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
                "ورود به مدیریت وبلاگ"
              )}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          این بخش مخصوص کاربران Staff مجاز وبلاگ است.
        </p>

      </div>
    </main>
  );
}
