"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import {
  ADMIN_ACCESS_TOKEN_KEY,
  ADMIN_AUTH_USER_KEY,
  BLOG_API_BASE_URL,
} from "@/lib/api/config";
import { setAdminTokens, setBlogTokens } from "@/lib/token";
import { authService } from "@/services/authService";

type LoginTab = "platform-admin" | "blog";

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

  const [activeTab, setActiveTab] = useState<LoginTab>("platform-admin");
  const adminTabRef = useRef<HTMLButtonElement | null>(null);
  const blogTabRef = useRef<HTMLButtonElement | null>(null);

  // Main Platform Admin state
  const [adminIdentifier, setAdminIdentifier] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminErrorMessage, setAdminErrorMessage] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Blog Admin state (kept independent and untouched)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "blog") {
      queueMicrotask(() => setActiveTab("blog"));
    }
  }, []);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextTab: LoginTab =
        activeTab === "platform-admin" ? "blog" : "platform-admin";
      setActiveTab(nextTab);
      if (nextTab === "platform-admin") {
        adminTabRef.current?.focus();
      } else {
        blogTabRef.current?.focus();
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveTab("platform-admin");
      adminTabRef.current?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveTab("blog");
      blogTabRef.current?.focus();
    }
  };

  const handlePlatformAdminLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isAdminLoading) return;

    setAdminErrorMessage("");

    const normalizedIdentifier = adminIdentifier.trim();

    if (!normalizedIdentifier || !adminPassword) {
      setAdminErrorMessage(
        "لطفاً شماره موبایل یا ایمیل و رمز عبور را وارد کنید."
      );
      return;
    }

    setIsAdminLoading(true);

    try {
      const result = await authService.loginPlatformAdminWithEmail(
        normalizedIdentifier,
        adminPassword
      );

      if (!result.accessToken || !result.refreshToken) {
        throw new Error(
          "پاسخ ورود فاقد Access Token یا Refresh Token معتبر است."
        );
      }

      // Store Main Platform Admin tokens in sessionStorage
      setAdminTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      if (result.user && typeof window !== "undefined") {
        sessionStorage.setItem(
          ADMIN_AUTH_USER_KEY,
          JSON.stringify(result.user)
        );
      }

      const savedAccessToken = sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
      if (!savedAccessToken) {
        throw new Error(
          "ذخیره توکن‌های پنل ادمین در session مرورگر با مشکل مواجه شد."
        );
      }

      router.replace("/admin");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "خطای غیرمنتظره‌ای در ورود به پنل ادمین رخ داده است.";

      setAdminErrorMessage(message);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleBlogLogin = async (
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

  const isMainAdmin = activeTab === "platform-admin";

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10"
    >
      <div className="w-full max-w-md">
        {/* Top Tabs */}
        <div
          role="tablist"
          aria-label="انتخاب بخش ورود پنل مدیریت"
          className="mb-6 grid grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900 p-1.5 shadow-lg"
        >
          <button
            ref={adminTabRef}
            id="tab-platform-admin"
            type="button"
            role="tab"
            aria-selected={isMainAdmin}
            tabIndex={isMainAdmin ? 0 : -1}
            onClick={() => setActiveTab("platform-admin")}
            onKeyDown={handleTabKeyDown}
            className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isMainAdmin
                ? "bg-slate-800 text-white after:absolute after:inset-x-4 after:bottom-0 after:border-b-2 after:border-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            پنل ادمین اصلی
          </button>

          <button
            ref={blogTabRef}
            id="tab-blog"
            type="button"
            role="tab"
            aria-selected={!isMainAdmin}
            tabIndex={!isMainAdmin ? 0 : -1}
            onClick={() => setActiveTab("blog")}
            onKeyDown={handleTabKeyDown}
            className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              !isMainAdmin
                ? "bg-slate-800 text-white after:absolute after:inset-x-4 after:bottom-0 after:border-b-2 after:border-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            وبلاگ
          </button>
        </div>

        {/* Main Platform Admin Panel Tab */}
        <div
          role="tabpanel"
          aria-labelledby="tab-platform-admin"
          hidden={!isMainAdmin}
        >
          {/* Logo and title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-black text-white shadow-lg shadow-blue-600/20">
              S
            </div>

            <h1 className="text-2xl font-bold text-white">
              پنل ادمین اصلی سایرا
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              برای ورود به پنل مدیریت پلتفرم، شماره موبایل یا ایمیل و رمز عبور خود را وارد کنید.
            </p>
          </div>

          {/* Login form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <form
              onSubmit={handlePlatformAdminLogin}
              className="space-y-5"
            >
              {/* Phone or Email */}
              <div>
                <label
                  htmlFor="admin-identifier"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  شماره موبایل یا ایمیل
                </label>

                <input
                  id="admin-identifier"
                  name="username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  value={adminIdentifier}
                  onChange={(event) =>
                    setAdminIdentifier(event.target.value)
                  }
                  placeholder="09121234567"
                  disabled={isAdminLoading}
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  رمز عبور
                </label>

                <div className="relative">
                  <input
                    id="admin-password"
                    name="password"
                    type={showAdminPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={adminPassword}
                    onChange={(event) =>
                      setAdminPassword(event.target.value)
                    }
                    placeholder="رمز عبور خود را وارد کنید"
                    disabled={isAdminLoading}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pl-20 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowAdminPassword((previous) => !previous)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {showAdminPassword ? "مخفی کردن" : "نمایش"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {adminErrorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
                >
                  {adminErrorMessage}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isAdminLoading}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdminLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    در حال ورود...
                  </span>
                ) : (
                  "ورود به پنل ادمین اصلی"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            نشست کاربری پنل ادمین اصلی به صورت امن در session مرورگر نگهداری می‌شود.
          </p>
        </div>

        {/* Blog Admin Panel Tab (Untouched behavior & requests) */}
        <div
          role="tabpanel"
          aria-labelledby="tab-blog"
          hidden={isMainAdmin}
        >
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
              onSubmit={handleBlogLogin}
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
                  name="username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
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
                    {showPassword ? "مخفی کردن" : "نمایش"}
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
      </div>
    </main>
  );
}
