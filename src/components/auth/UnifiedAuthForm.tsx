"use client";

import React, { useState, useEffect } from "react";
import { cleanPhoneNumber, isValidIranPhone, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { authService, UserGamingCenterOption } from "@/services/authService";
import { setTokens } from "@/lib/token";

export interface UnifiedAuthSuccessData {
  fullName: string;
  phone: string;
  accessToken: string;
  refreshToken?: string;
  gamingCenterId?: string;
  role?: string;
}

export interface UnifiedAuthFormProps {
  onSuccess: (data: UnifiedAuthSuccessData) => void;
  title?: string;
  description?: string;
  initialMode?: "otp" | "password";
}

type AuthMode = "otp" | "password";
type OtpStep = "phone" | "otp" | "centerSelect";

export const UnifiedAuthForm: React.FC<UnifiedAuthFormProps> = ({
  onSuccess,
  title = "ورود یا ثبت‌نام در سایرا",
  description = "ورود و ثبت‌نام با پیامک یک‌بار مصرف (OTP) بدون نیاز به رمز عبور",
  initialMode = "otp",
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // OTP Flow States
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [centers, setCenters] = useState<UserGamingCenterOption[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [timer, setTimer] = useState(120);

  // Password Flow States
  const [passwordPhone, setPasswordPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCenterId, setPasswordCenterId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === "otp" && otpStep === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpStep, timer]);

  /* ---- OTP Step 1: Send Request ---- */
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = cleanPhoneNumber(phone);
    if (!isValidIranPhone(cleanPhone)) {
      setError("لطفاً شماره موبایل معتبر (۱۱ رقم با ۰۹ مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      // Primary: Request customer OTP (POST /auth/customer/otp/request)
      try {
        await authService.requestOtp(cleanPhone);
      } catch (custErr) {
        // Fallback to user/staff OTP endpoint if customer request fails
        try {
          await authService.requestUserOtp(cleanPhone);
        } catch {
          throw custErr;
        }
      }
      setOtpStep("otp");
      setTimer(120);
      setOtpCode(["", "", "", "", "", ""]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/[^\d]/g, "").slice(0, 6).split("");
      const newOtp = [...otpCode];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpCode(newOtp);
      return;
    }

    const clean = value.replace(/[^\d]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = clean;
    setOtpCode(newOtp);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`unified-otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`unified-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  /* ---- OTP Step 2: Verify Code & Fetch Centers ---- */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 4) {
      setError("لطفاً کد تایید را به طور کامل وارد کنید.");
      return;
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (!isValidIranPhone(cleanPhone)) {
      setError("لطفاً شماره موبایل معتبر (۱۱ رقم با ۰۹ مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP and authenticate customer (POST /auth/customer/otp/verify)
      // Login & Registration are unified: receiving tokens completes login / registration directly
      const authRes = await authService.verifyOtp(cleanPhone, fullCode);
      const token = authRes?.accessToken;

      if (!token) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      // Immediately save tokens to localStorage and cookies to ensure immediate availability
      setTokens(token, authRes.refreshToken);

      let resolvedName = authRes?.user?.fullName || "کاربر سایرا";
      if (!authRes?.user?.fullName) {
        try {
          const me = await authService.getMe();
          if (me?.fullName) resolvedName = me.fullName;
        } catch {
          // ignore
        }
      }

      onSuccess({
        fullName: resolvedName,
        phone: cleanPhone,
        accessToken: token,
        refreshToken: authRes.refreshToken,
        role: authRes?.user?.role || "USER",
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /* ---- OTP Step 3: Finalize Login with Center ---- */
  const finalizeOtpLogin = async (
    targetPhone: string,
    centerIdToUse?: string,
    verifiedCode?: string
  ) => {
    const cleanPhone = cleanPhoneNumber(targetPhone);
    setLoading(true);
    setError("");
    try {
      const loginRes = await authService.loginUserWithOtp(
        cleanPhone,
        centerIdToUse,
        verifiedCode || otpCode.join("")
      );

      const token = loginRes.accessToken;
      if (!token) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      // Immediately save tokens to localStorage and cookies
      setTokens(token, loginRes.refreshToken);

      const userName = loginRes.user?.fullName || loginRes.user?.name || "کاربر سایرا";
      const userRole = loginRes.user?.role || "MANAGER";
      onSuccess({
        fullName: userName,
        phone: cleanPhone,
        accessToken: token,
        refreshToken: loginRes.refreshToken,
        gamingCenterId: centerIdToUse || loginRes.user?.gamingCenterId,
        role: userRole,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCenterSelectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenterId) {
      setError("لطفاً یک شعبه را انتخاب نمایید.");
      return;
    }
    const cleanPhone = cleanPhoneNumber(phone);
    await finalizeOtpLogin(cleanPhone, selectedCenterId);
  };

  const handleResendCode = async () => {
    setError("");
    const cleanPhone = cleanPhoneNumber(phone);
    setLoading(true);
    try {
      try {
        await authService.requestOtp(cleanPhone);
      } catch {
        await authService.requestUserOtp(cleanPhone);
      }
      setTimer(120);
      setOtpCode(["", "", "", "", "", ""]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /* ---- Password Login Flow ---- */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = cleanPhoneNumber(passwordPhone);
    if (!isValidIranPhone(cleanPhone)) {
      setError("لطفاً شماره موبایل معتبر (۱۱ رقم با ۰۹ مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    if (!password) {
      setError("لطفاً رمز عبور خود را وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.loginUserWithPassword(
        cleanPhone,
        password,
        passwordCenterId.trim() || undefined
      );

      const token = res.accessToken;
      if (!token) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      // Immediately save tokens to localStorage and cookies
      setTokens(token, res.refreshToken);

      const userName = res.user?.fullName || res.user?.name || "مدیر گیم‌نت";
      const userRole = res.user?.role || "MANAGER";
      onSuccess({
        fullName: userName,
        phone: cleanPhone,
        accessToken: token,
        refreshToken: res.refreshToken,
        gamingCenterId: passwordCenterId.trim() || res.user?.gamingCenterId,
        role: userRole,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toPersianDigits(mins)}:${secs < 10 ? "۰" : ""}${toPersianDigits(secs)}`;
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Title & Description */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-[var(--text-white)]">{title}</h2>
        {description && <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>}
      </div>

      {/* Tab Toggle (OTP vs Password) */}
      {otpStep === "phone" && (
        <div className="flex bg-[var(--foreground)]/50 p-1 rounded-card border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-card transition-all ${
              mode === "otp"
                ? "bg-[var(--primary)] text-on-primary shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
            }`}
          >
            ورود و ثبت‌نام سریع (پیامک OTP)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-card transition-all ${
              mode === "password"
                ? "bg-[var(--primary)] text-on-primary shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
            }`}
          >
            ورود با رمز عبور
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed">
          {error}
        </div>
      )}

      {/* MODE 1: OTP FLOW */}
      {mode === "otp" && (
        <>
          {/* Step 1: Phone Input */}
          {otpStep === "phone" && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                شماره موبایل خود را وارد کنید تا کد تأیید یک‌بار مصرف برای شما ارسال شود. در صورت نداشتن حساب، به‌صورت خودکار ثبت‌نام خواهید شد.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">
                  شماره موبایل <span className="text-[var(--accent-red)]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  dir="ltr"
                  className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none transition-colors text-right"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? "در حال ارسال..." : "دریافت کد تأیید (ورود / ثبت‌نام)"}</span>
                {!loading && (
                  <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </form>
          )}

          {/* Step 2: 6-Digit OTP Verification */}
          {otpStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs">
                <p className="text-[var(--text-muted)]">
                  کد تایید به شماره <span className="text-[var(--primary)] font-bold">{toPersianDigits(cleanPhoneNumber(phone))}</span> ارسال شد.
                </p>
                <button
                  type="button"
                  onClick={() => setOtpStep("phone")}
                  className="text-[var(--primary)] underline hover:opacity-80 font-bold shrink-0 mr-1"
                >
                  ویرایش
                </button>
              </div>

              {/* 6-Digit OTP Inputs */}
              <div className="flex items-center justify-center gap-2 dir-ltr my-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`unified-otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 sm:w-11 h-14 text-center text-xl font-black rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-[var(--primary)] outline-none transition-colors shadow-inner"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Timer / Resend */}
              <div className="flex items-center justify-between text-xs pt-1">
                {timer > 0 ? (
                  <span className="text-[var(--text-muted)] flex items-center gap-1">
                    <span>ارسال مجدد کد تا:</span>
                    <strong className="text-[var(--primary)] font-mono">{formatTimer(timer)}</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-[var(--primary)] font-bold hover:underline"
                  >
                    ارسال مجدد کد ورود
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? "در حال اعتبارسنجی..." : "تأیید و ورود به حساب"}</span>
                {!loading && (
                  <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </form>
          )}

          {/* Step 3: Gaming Center Selection */}
          {otpStep === "centerSelect" && (
            <form onSubmit={handleCenterSelectSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                حساب شما به چند شعبه متصل است. لطفاً شعبه‌ای که قصد ورود به آن را دارید انتخاب کنید:
              </p>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {centers.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between p-3.5 rounded-card border cursor-pointer transition-colors ${
                      selectedCenterId === c.id
                        ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                        : "bg-[var(--foreground)]/40 border-[var(--border-subtle)] text-[var(--text-white)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <span className="text-xs font-bold">{c.name}</span>
                    <input
                      type="radio"
                      name="selectedCenter"
                      value={c.id}
                      checked={selectedCenterId === c.id}
                      onChange={() => setSelectedCenterId(c.id)}
                      className="accent-[var(--primary)]"
                    />
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedCenterId}
                className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? "در حال ورود..." : "ورود به شعبه انتخاب‌شده"}</span>
              </button>
            </form>
          )}
        </>
      )}

      {/* MODE 2: PASSWORD FLOW */}
      {mode === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            با شماره موبایل و رمز عبور حساب خود وارد شوید.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-white)]">
              شماره تماس <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              type="tel"
              value={passwordPhone}
              onChange={(e) => setPasswordPhone(e.target.value)}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              dir="ltr"
              className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none transition-colors text-right"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-white)]">
              رمز عبور <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none transition-colors text-left"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-white)]">
              شناسه مرکز بازی (اختیاری در صورت داشتن یک شعبه)
            </label>
            <input
              type="text"
              value={passwordCenterId}
              onChange={(e) => setPasswordCenterId(e.target.value)}
              placeholder="cuid_gaming_center_id"
              dir="ltr"
              className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none transition-colors text-left"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <span>{loading ? "در حال ورود..." : "ورود با رمز عبور"}</span>
            {!loading && (
              <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
