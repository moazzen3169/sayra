"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import { QrCodeDisplay } from "@/components/admin/security/QrCodeDisplay";
import { RecoveryCodesPanel } from "@/components/admin/security/RecoveryCodesPanel";
import {
  ADMIN_ACCESS_TOKEN_KEY,
  ADMIN_AUTH_USER_KEY,
  BLOG_API_BASE_URL,
} from "@/lib/api/config";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import { setAdminTokens, setBlogTokens } from "@/lib/token";
import {
  authService,
  type PlatformAdmin2faSetupResponse,
  type PlatformAdminProfile,
} from "@/services/authService";

type LoginTab = "platform-admin" | "blog";
type AdminAuthStep =
  | "credentials"
  | "verify-2fa"
  | "setup-2fa"
  | "recovery-codes";
type Verify2faMode = "totp" | "recovery";

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

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return toPersianDigits(
    `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  );
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<LoginTab>("platform-admin");
  const adminTabRef = useRef<HTMLButtonElement | null>(null);
  const blogTabRef = useRef<HTMLButtonElement | null>(null);

  // Main Platform Admin multi-step state
  const [adminStep, setAdminStep] = useState<AdminAuthStep>("credentials");
  const [adminIdentifier, setAdminIdentifier] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminErrorMessage, setAdminErrorMessage] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Ephemeral challenge / setup state (never grants API access)
  const [challengeToken, setChallengeToken] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [pendingAdmin, setPendingAdmin] = useState<PlatformAdminProfile | null>(
    null
  );
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Step 2: Verify 2FA state
  const [verifyMode, setVerifyMode] = useState<Verify2faMode>("totp");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  // Step 2a/2b: Mandatory 2FA setup state
  const [setupData, setSetupData] =
    useState<PlatformAdmin2faSetupResponse | null>(null);
  const [setupConfirmCode, setSetupConfirmCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isRegeneratingSetup, setIsRegeneratingSetup] = useState(false);

  // Step 3: One-time Recovery Codes after initial setup
  const [issuedRecoveryCodes, setIssuedRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesSavedAck, setRecoveryCodesSavedAck] = useState(false);

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

  // Live countdown for ephemeral challengeToken / pending 2FA setup
  useEffect(() => {
    if (!expiresAtMs || (adminStep !== "verify-2fa" && adminStep !== "setup-2fa")) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAtMs, adminStep]);

  const remainingSeconds =
    expiresAtMs && (adminStep === "verify-2fa" || adminStep === "setup-2fa")
      ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000))
      : null;

  const resetAdminChallengeFlow = useCallback(() => {
    setAdminStep("credentials");
    setAdminErrorMessage("");
    setChallengeToken("");
    setSetupToken("");
    setPendingAdmin(null);
    setExpiresAtMs(null);
    setVerifyMode("totp");
    setTotpCode("");
    setRecoveryCode("");
    setSetupData(null);
    setSetupConfirmCode("");
    setIssuedRecoveryCodes([]);
    setRecoveryCodesSavedAck(false);
  }, []);

  const persistAdminSession = useCallback(
    (params: {
      accessToken?: string;
      refreshToken?: string;
      admin?: PlatformAdminProfile;
    }) => {
      if (!params.accessToken) {
        throw new Error("پاسخ سرور فاقد Access Token معتبر است.");
      }

      setAdminTokens({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken ?? null,
      });

      const profileToSave = params.admin ?? pendingAdmin;
      if (profileToSave && typeof window !== "undefined") {
        sessionStorage.setItem(
          ADMIN_AUTH_USER_KEY,
          JSON.stringify(profileToSave)
        );
      }

      const savedAccessToken = sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
      if (!savedAccessToken) {
        throw new Error(
          "ذخیره توکن‌های پنل ادمین در session مرورگر با مشکل مواجه شد."
        );
      }
    },
    [pendingAdmin]
  );

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

  // Step 1: Verify identifier + password -> TOTP_REQUIRED or TOTP_SETUP_REQUIRED
  const handlePlatformAdminStep1 = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (isAdminLoading) return;

    setAdminErrorMessage("");
    const normalizedIdentifier = adminIdentifier.trim();

    if (!normalizedIdentifier || !adminPassword) {
      setAdminErrorMessage(
        "لطفاً نام کاربری، ایمیل یا شماره موبایل و رمز عبور را وارد کنید."
      );
      return;
    }

    setIsAdminLoading(true);

    try {
      const challenge = await authService.loginPlatformAdmin(
        normalizedIdentifier,
        adminPassword
      );

      setPendingAdmin(challenge.admin ?? null);

      if (challenge.status === "TOTP_SETUP_REQUIRED") {
        const token = challenge.setupToken || challenge.challengeToken;
        if (!token) {
          throw new Error(
            "توکن راه‌اندازی احراز هویت دومرحله‌ای از سرور دریافت نشد."
          );
        }

        setSetupToken(token);
        const enrollment = await authService.setupPlatformAdmin2fa({
          setupToken: token,
          mode: "INITIAL",
        });

        setSetupData(enrollment);
        setSetupConfirmCode("");
        const ttlSec = enrollment.expiresIn ?? challenge.expiresIn ?? 600;
        const now = Date.now();
        setNowMs(now);
        setExpiresAtMs(now + ttlSec * 1000);
        setAdminStep("setup-2fa");
        return;
      }

      // Default: TOTP_REQUIRED
      const token = challenge.challengeToken;
      if (!token) {
        throw new Error("توکن چالش احراز هویت دومرحله‌ای از سرور دریافت نشد.");
      }

      setChallengeToken(token);
      setVerifyMode("totp");
      setTotpCode("");
      setRecoveryCode("");
      const ttlSec = challenge.expiresIn ?? 300;
      const now = Date.now();
      setNowMs(now);
      setExpiresAtMs(now + ttlSec * 1000);
      setAdminStep("verify-2fa");
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

  // Step 2 (existing 2FA): Verify 6-digit TOTP or single-use Recovery Code
  const handleVerify2faSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAdminLoading) return;

    setAdminErrorMessage("");

    if (remainingSeconds === 0) {
      setAdminErrorMessage(
        "زمان اعتبار این چالش به پایان رسیده است. لطفاً دوباره وارد شوید."
      );
      return;
    }

    if (verifyMode === "totp") {
      const cleanCode = toEnglishDigits(totpCode).replace(/\D/g, "");
      if (cleanCode.length !== 6) {
        setAdminErrorMessage("لطفاً کد ۶ رقمی اپلیکیشن Authenticator را کامل وارد کنید.");
        return;
      }

      setIsAdminLoading(true);
      try {
        const result = await authService.verifyPlatformAdmin2fa({
          challengeToken,
          code: cleanCode,
        });

        persistAdminSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          admin: result.admin,
        });

        router.replace("/admin");
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "کد واردشده نامعتبر یا منقضی است.";
        setAdminErrorMessage(message);
      } finally {
        setIsAdminLoading(false);
      }
      return;
    }

    // Recovery code mode
    const cleanRecovery = toEnglishDigits(recoveryCode).trim();
    if (!cleanRecovery) {
      setAdminErrorMessage("لطفاً یکی از کدهای بازیابی یکبارمصرف را وارد کنید.");
      return;
    }

    setIsAdminLoading(true);
    try {
      const result = await authService.verifyPlatformAdmin2fa({
        challengeToken,
        recoveryCode: cleanRecovery,
      });

      persistAdminSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        admin: result.admin,
      });

      router.replace("/admin");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "کد بازیابی نامعتبر یا قبلاً استفاده شده است.";
      setAdminErrorMessage(message);
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Step 2a retry: Regenerate pending QR / secret if needed
  const handleRegenerateInitialSetup = async () => {
    if (!setupToken || isRegeneratingSetup) return;

    setAdminErrorMessage("");
    setIsRegeneratingSetup(true);
    try {
      const enrollment = await authService.setupPlatformAdmin2fa({
        setupToken,
        mode: "INITIAL",
      });
      setSetupData(enrollment);
      setSetupConfirmCode("");
      const ttlSec = enrollment.expiresIn ?? 600;
      const now = Date.now();
      setNowMs(now);
      setExpiresAtMs(now + ttlSec * 1000);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "تولید مجدد کد QR ممکن نشد. لطفاً دوباره وارد شوید.";
      setAdminErrorMessage(message);
    } finally {
      setIsRegeneratingSetup(false);
    }
  };

  // Step 2b: Confirm mandatory initial 2FA setup with first 6-digit code
  const handleConfirm2faSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAdminLoading) return;

    setAdminErrorMessage("");

    const cleanCode = toEnglishDigits(setupConfirmCode).replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setAdminErrorMessage(
        "لطفاً کد ۶ رقمی نمایش‌داده‌شده در اپلیکیشن Authenticator را وارد کنید."
      );
      return;
    }

    setIsAdminLoading(true);
    try {
      const result = await authService.confirmPlatformAdmin2fa({
        setupToken,
        deviceId: setupData?.deviceId,
        code: cleanCode,
        mode: "INITIAL",
      });

      persistAdminSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        admin: result.admin,
      });

      if (result.recoveryCodes && result.recoveryCodes.length > 0) {
        setIssuedRecoveryCodes(result.recoveryCodes);
        setRecoveryCodesSavedAck(false);
        setExpiresAtMs(null);
        setAdminStep("recovery-codes");
        return;
      }

      router.replace("/admin");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "کد تأیید نامعتبر است. لطفاً ساعت دستگاه خود را بررسی کرده و دوباره تلاش کنید.";
      setAdminErrorMessage(message);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleCopyManualSecret = async () => {
    const key = setupData?.manualEntryKey || setupData?.secret;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key.replace(/\s+/g, ""));
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleBlogLogin = async (event: FormEvent<HTMLFormElement>) => {
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
      const base = BLOG_API_BASE_URL.replace(/\/+$/, "");

      const response = await fetch(`${base}/auth/admin-login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });

      const result: BlogLoginResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("نام کاربری یا رمز عبور اشتباه است.");
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

      setBlogTokens({
        accessToken,
        refreshToken,
      });

      const savedAccessToken = localStorage.getItem("sayra_blog_access_token");
      const savedRefreshToken = localStorage.getItem(
        "sayra_blog_refresh_token"
      );

      if (!savedAccessToken || !savedRefreshToken) {
        throw new Error("ذخیره توکن‌های وبلاگ در مرورگر با مشکل مواجه شد.");
      }

      router.replace("/admin/blog");
    } catch (error: unknown) {
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
  const isExpired = remainingSeconds === 0;
  const adminDisplayLabel =
    pendingAdmin?.fullName ||
    pendingAdmin?.username ||
    pendingAdmin?.email ||
    adminIdentifier;

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10"
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
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-black text-white shadow-lg shadow-blue-600/20">
              S
            </div>

            <h1 className="text-2xl font-bold text-white">
              {adminStep === "credentials" && "پنل ادمین اصلی سایرا"}
              {adminStep === "verify-2fa" && "تأیید احراز هویت دومرحله‌ای"}
              {adminStep === "setup-2fa" && "راه‌اندازی اجباری 2FA"}
              {adminStep === "recovery-codes" && "ذخیره کدهای بازیابی"}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {adminStep === "credentials" &&
                "نام کاربری، ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید."}
              {adminStep === "verify-2fa" &&
                "برای تکمیل ورود، کد ۶ رقمی اپلیکیشن Authenticator یا کد بازیابی را وارد کنید."}
              {adminStep === "setup-2fa" &&
                "برای فعال‌سازی دسترسی ادمین، کد QR زیر را در Google یا Microsoft Authenticator اسکن کنید."}
              {adminStep === "recovery-codes" &&
                "احراز هویت دومرحله‌ای با موفقیت فعال شد. کدهای بازیابی زیر را در جای امن نگه دارید."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
            {/* STEP 1: Credentials */}
            {adminStep === "credentials" && (
              <form onSubmit={handlePlatformAdminStep1} className="space-y-5">
                <div>
                  <label
                    htmlFor="admin-identifier"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    نام کاربری، ایمیل یا شماره موبایل
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
                    onChange={(event) => setAdminIdentifier(event.target.value)}
                    placeholder="superadmin یا admin@sayra.ir یا 09121234567"
                    disabled={isAdminLoading}
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />
                </div>

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
                      onChange={(event) => setAdminPassword(event.target.value)}
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

                {adminErrorMessage && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
                  >
                    {adminErrorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAdminLoading}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdminLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      در حال بررسی اطلاعات...
                    </span>
                  ) : (
                    "ادامه به مرحله دوم (2FA)"
                  )}
                </button>
              </form>
            )}

            {/* STEP 2 (existing 2FA): Verify TOTP or Recovery Code */}
            {adminStep === "verify-2fa" && (
              <form onSubmit={handleVerify2faSubmit} className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs">
                  <div className="min-w-0">
                    <span className="block text-slate-400">حساب ادمین</span>
                    <span className="mt-0.5 block truncate font-semibold text-slate-100">
                      {adminDisplayLabel}
                    </span>
                  </div>
                  {remainingSeconds !== null && (
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-mono font-semibold ${
                        isExpired
                          ? "bg-red-500/15 text-red-400"
                          : "bg-blue-500/15 text-blue-300"
                      }`}
                    >
                      {isExpired
                        ? "منقضی شد"
                        : formatCountdown(remainingSeconds)}
                    </span>
                  )}
                </div>

                {/* Switch between TOTP and Recovery Code */}
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyMode("totp");
                      setAdminErrorMessage("");
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      verifyMode === "totp"
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    کد ۶ رقمی Authenticator
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyMode("recovery");
                      setAdminErrorMessage("");
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      verifyMode === "recovery"
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    کد بازیابی یکبارمصرف
                  </button>
                </div>

                {verifyMode === "totp" ? (
                  <div>
                    <label
                      htmlFor="admin-totp-code"
                      className="mb-2 block text-sm font-medium text-slate-200"
                    >
                      کد ۶ رقمی تایید دومرحله‌ای
                    </label>
                    <input
                      id="admin-totp-code"
                      name="totpCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      autoFocus
                      dir="ltr"
                      value={totpCode}
                      onChange={(event) =>
                        setTotpCode(
                          toEnglishDigits(event.target.value)
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      placeholder="123456"
                      disabled={isAdminLoading || isExpired}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.45em] text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="admin-recovery-code"
                      className="mb-2 block text-sm font-medium text-slate-200"
                    >
                      کد بازیابی اضطراری (یکبارمصرف)
                    </label>
                    <input
                      id="admin-recovery-code"
                      name="recoveryCode"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      autoFocus
                      dir="ltr"
                      value={recoveryCode}
                      onChange={(event) =>
                        setRecoveryCode(
                          toEnglishDigits(event.target.value).toUpperCase()
                        )
                      }
                      placeholder="A1B2-C3D4-E5F6-0718"
                      disabled={isAdminLoading || isExpired}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center font-mono text-base tracking-wider text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      هر کد بازیابی فقط یک‌بار قابل استفاده است.
                    </p>
                  </div>
                )}

                {adminErrorMessage && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
                  >
                    {adminErrorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAdminLoading || isExpired}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdminLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      در حال تأیید...
                    </span>
                  ) : (
                    "تأیید و ورود به پنل ادمین"
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetAdminChallengeFlow}
                  disabled={isAdminLoading}
                  className="w-full rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  بازگشت به مرحله ورود
                </button>
              </form>
            )}

            {/* STEP 2a/2b (mandatory initial 2FA setup) */}
            {adminStep === "setup-2fa" && setupData && (
              <form onSubmit={handleConfirm2faSetup} className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs">
                  <div className="min-w-0">
                    <span className="block text-slate-400">
                      راه‌اندازی اولیه برای
                    </span>
                    <span className="mt-0.5 block truncate font-semibold text-slate-100">
                      {setupData.accountName || adminDisplayLabel}
                    </span>
                  </div>
                  {remainingSeconds !== null && (
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-mono font-semibold ${
                        isExpired
                          ? "bg-red-500/15 text-red-400"
                          : "bg-blue-500/15 text-blue-300"
                      }`}
                    >
                      {isExpired
                        ? "منقضی شد"
                        : formatCountdown(remainingSeconds)}
                    </span>
                  )}
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <QrCodeDisplay
                    qrCodeDataUrl={setupData.qrCodeDataUrl}
                    qrCodeSvg={setupData.qrCodeSvg}
                    otpauthUrl={setupData.otpauthUrl}
                    size={196}
                  />

                  <div className="w-full space-y-1.5 text-center">
                    <p className="text-[11px] text-slate-400">
                      امکان اسکن ندارید؟ کلید زیر را به‌صورت دستی وارد کنید:
                    </p>
                    <div
                      dir="ltr"
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                    >
                      <code className="truncate font-mono text-xs text-slate-200 select-all">
                        {setupData.manualEntryKey || setupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyManualSecret}
                        className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-blue-400 transition hover:bg-slate-700"
                      >
                        {copiedSecret ? "کپی شد ✓" : "کپی"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm 6-digit code */}
                <div>
                  <label
                    htmlFor="admin-setup-code"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    کد ۶ رقمی نمایش‌داده‌شده در اپلیکیشن
                  </label>
                  <input
                    id="admin-setup-code"
                    name="setupCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    dir="ltr"
                    value={setupConfirmCode}
                    onChange={(event) =>
                      setSetupConfirmCode(
                        toEnglishDigits(event.target.value)
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="123456"
                    disabled={isAdminLoading || isExpired}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.45em] text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />
                </div>

                {adminErrorMessage && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
                  >
                    {adminErrorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAdminLoading || isExpired}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdminLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      در حال فعال‌سازی 2FA...
                    </span>
                  ) : (
                    "تأیید و فعال‌سازی 2FA"
                  )}
                </button>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateInitialSetup}
                    disabled={isRegeneratingSetup || isAdminLoading}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isRegeneratingSetup ? "در حال تولید..." : "تولید مجدد QR"}
                  </button>
                  <button
                    type="button"
                    onClick={resetAdminChallengeFlow}
                    disabled={isAdminLoading}
                    className="flex-1 rounded-xl border border-slate-700 bg-transparent px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    انصراف و بازگشت
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: One-Time Recovery Codes */}
            {adminStep === "recovery-codes" && (
              <div className="space-y-5">
                <RecoveryCodesPanel codes={issuedRecoveryCodes} />

                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={recoveryCodesSavedAck}
                    onChange={(event) =>
                      setRecoveryCodesSavedAck(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="leading-5">
                    کدهای بازیابی یکبارمصرف را در مکانی امن ذخیره کردم و می‌دانم
                    که مجدداً نمایش داده نخواهند شد.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!recoveryCodesSavedAck}
                  onClick={() => router.replace("/admin")}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ادامه و ورود به پنل ادمین
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            ورود به پنل ادمین اصلی محافظت‌شده با احراز هویت دومرحله‌ای (TOTP) و
            چرخش خودکار توکن نشست است.
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
            <form onSubmit={handleBlogLogin} className="space-y-5">
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
                  onChange={(event) => setUsername(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="رمز عبور خود را وارد کنید"
                    disabled={isLoading}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pl-20 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
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
