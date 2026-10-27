"use client";

import React, { useState, useEffect } from "react";
import { ACCESS_TOKEN_KEY } from "@/lib/api/config";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { authService } from "@/services/authService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fullName: string, phone: string, token?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"info" | "otp">("info");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(120);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset modal state when opened
  const prevIsOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep("info");
      setError("");
      setOtpCode(["", "", "", ""]);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("لطفاً نام و نام خانوادگی خود را وارد کنید.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("لطفاً شماره تماس معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      await authService.requestOtp(cleanPhone);
      setStep("otp");
      setTimer(120);
      setOtpCode(["", "", "", ""]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/[^\d]/g, "").slice(0, 4).split("");
      const newOtp = [...otpCode];
      digits.forEach((d, i) => {
        if (i < 4) newOtp[i] = d;
      });
      setOtpCode(newOtp);
      return;
    }

    const clean = value.replace(/[^\d]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = clean;
    setOtpCode(newOtp);

    if (clean && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 4) {
      setError("لطفاً کد تایید ۴ رقمی را به طور کامل وارد کنید.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setLoading(true);
    try {
      const res = await authService.verifyOtp(cleanPhone, fullCode);
      const token = res?.accessToken;

      if (token) {
        try {
          localStorage.setItem(ACCESS_TOKEN_KEY, token);
        } catch {
          // Ignore
        }
      }

      let finalFullName = fullName.trim();
      try {
        const me = await authService.getMe();
        if (me && me.fullName) {
          finalFullName = me.fullName;
        }
      } catch {
        // Fallback to user entered full name
      }

      onSuccess(finalFullName || "کاربر سایرا", cleanPhone, token);
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

  const handleResendCode = async () => {
    setError("");
    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setLoading(true);
    try {
      await authService.requestOtp(cleanPhone);
      setTimer(120);
      setOtpCode(["", "", "", ""]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-[var(--text-white)]">
              {step === "info" ? "ورود یا ثبت‌نام" : "تایید شماره موبایل"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step 1: User Info (Name & Phone) */}
        {step === "info" ? (
          <form onSubmit={handleInfoSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              جهت ورود یا ایجاد حساب کاربری، لطفاً نام و شماره موبایل خود را وارد کنید.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-white)]">
                نام و نام خانوادگی <span className="text-[var(--accent-red)]">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: علی محمدی"
                className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none transition-colors"
              />
            </div>

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
              className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <span>{loading ? "در حال ارسال..." : "ارسال کد تایید"}</span>
              {!loading && (
                <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs">
              <p className="text-[var(--text-muted)]">
                کد تایید ۴ رقمی به شماره <span className="text-[var(--primary)] font-bold">{toPersianDigits(phone)}</span> ارسال شد.
              </p>
              <button
                type="button"
                onClick={() => setStep("info")}
                className="text-[var(--primary)] underline hover:opacity-80 font-bold shrink-0 mr-1"
              >
                ویرایش
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                {error}
              </div>
            )}

            {/* OTP Input Fields */}
            <div className="flex items-center justify-center gap-3 dir-ltr my-2">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-black rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-[var(--primary)] outline-none transition-colors shadow-inner"
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
                  ارسال مجدد کد تایید
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <span>{loading ? "در حال بررسی..." : "تایید و ورود"}</span>
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
