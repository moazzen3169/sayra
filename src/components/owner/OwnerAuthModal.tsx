"use client";

import React, { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { authService, UserGamingCenterOption } from "@/services/authService";

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fullName: string, phone: string, token: string, refreshToken?: string, gamingCenterId?: string) => void;
}

type AuthMode = "otp" | "password";
type OtpStep = "phone" | "otp" | "centerSelect";

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>("otp");

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

  // Reset modal state when opened
  const prevIsOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setMode("otp");
      setOtpStep("phone");
      setError("");
      setOtpCode(["", "", "", "", "", ""]);
      setCenters([]);
      setSelectedCenterId("");
      setPasswordPhone("");
      setPassword("");
      setPasswordCenterId("");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

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

  if (!isOpen) return null;

  /* ---- OTP Step 1: Send Request ---- */
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("لطفاً شماره موبایل معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      await authService.requestUserOtp(cleanPhone);
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
      const nextInput = document.getElementById(`owner-otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`owner-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  /* ---- OTP Step 2: Verify Code & Fetch Centers ---- */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 6) {
      setError("لطفاً کد تایید ۶ رقمی را به طور کامل وارد کنید.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setLoading(true);
    try {
      const res = await authService.verifyUserOtp(cleanPhone, fullCode);
      const activeCenters = res.gamingCenters || [];
      setCenters(activeCenters);

      if (activeCenters.length === 1) {
        // Automatically proceed if only 1 center is connected
        setSelectedCenterId(activeCenters[0].id);
        await finalizeOtpLogin(cleanPhone, activeCenters[0].id, fullCode);
      } else if (activeCenters.length > 1) {
        // Prompt user to select gaming center
        setSelectedCenterId(activeCenters[0].id);
        setOtpStep("centerSelect");
      } else {
        // If no centers returned or direct tokens returned
        await finalizeOtpLogin(cleanPhone, undefined, fullCode);
      }
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
    setLoading(true);
    setError("");
    try {
      const loginRes = await authService.loginUserWithOtp(
        targetPhone,
        centerIdToUse,
        verifiedCode || otpCode.join("")
      );

      const token = loginRes.accessToken;
      if (!token) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      const userName = loginRes.user?.fullName || loginRes.user?.name || "مدیر گیم‌نت";
      onSuccess(userName, targetPhone, token, loginRes.refreshToken, centerIdToUse || loginRes.user?.gamingCenterId);
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
    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    await finalizeOtpLogin(cleanPhone, selectedCenterId);
  };

  const handleResendCode = async () => {
    setError("");
    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setLoading(true);
    try {
      await authService.requestUserOtp(cleanPhone);
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

    const cleanPhone = passwordPhone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("لطفاً شماره موبایل معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
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

      const userName = res.user?.fullName || res.user?.name || "مدیر گیم‌نت";
      onSuccess(userName, cleanPhone, token, res.refreshToken, passwordCenterId.trim() || res.user?.gamingCenterId);
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-5 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-white)]">
                ورود به پنل مدیریت گیم‌نت
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                مخصوص پرسنل و مدیران مراکز بازی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
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
              ورود با پیامک (OTP)
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
                  شماره موبایل ثبت‌شده در گیم‌نت را وارد کنید تا کد تأیید ورود برای شما ارسال شود.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    شماره تماس <span className="text-[var(--accent-red)]">*</span>
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
                  className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <span>{loading ? "در حال ارسال..." : "دریافت کد ورود"}</span>
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
                    کد تایید ۶ رقمی به شماره <span className="text-[var(--primary)] font-bold">{toPersianDigits(phone)}</span> ارسال شد.
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
                      id={`owner-otp-input-${index}`}
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
                  className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <span>{loading ? "در حال اعتبارسنجی..." : "تایید و ادامه"}</span>
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
                  حساب شما به چند شعبه متصل است. لطفاً شعبه‌ای که قصد مدیریت آن را دارید انتخاب کنید:
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
                  className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
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
              با شماره موبایل و رمز عبوری که مدیر گیم‌نت برای شما تعریف کرده است وارد شوید.
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
              className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
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
    </div>
  );
};
