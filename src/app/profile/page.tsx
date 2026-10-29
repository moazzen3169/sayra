"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { BottomBar } from "@/components/BottomBar";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { ACCESS_TOKEN_KEY } from "@/lib/api/config";
import { toPersianDigits, formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";

export default function ProfilePage() {
  const { isLoggedIn, isLoading, user, login, logout } = useAuth();

  // Unauthenticated Login/OTP Form States
  const [authStep, setAuthStep] = useState<"info" | "otp">("info");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(120);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Modal Visibility States
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Edit Profile Form States
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Wallet State
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletChargeAmount, setWalletChargeAmount] = useState<number | null>(null);
  const [walletSuccess, setWalletSuccess] = useState("");

  // Open Edit Profile Modal and prefill data
  const handleOpenEditModal = () => {
    setEditFullName(user?.fullName || "");
    setEditPhone(user?.phone || "");
    setEditSuccess(false);
    setIsEditModalOpen(true);
  };

  // Timer countdown for OTP
  useEffect(() => {
    if (authStep !== "otp") return;
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [authStep, timer]);

  /* --- Auth Handlers --- */
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!fullName.trim()) {
      setAuthError("لطفاً نام و نام خانوادگی خود را وارد کنید.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setAuthError("لطفاً شماره موبایل معتبر (۱۱ رقم) وارد کنید.");
      return;
    }

    setAuthLoading(true);
    try {
      await authService.requestOtp(cleanPhone);
      setAuthStep("otp");
      setTimer(120);
      setOtpCode(["", "", "", ""]);
    } catch (err) {
      setAuthError(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/[^\d]/g, "").split("");
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
      const nextInput = document.getElementById(`profile-otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`profile-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 4) {
      setAuthError("لطفاً کد تایید ۴ رقمی را به طور کامل وارد کنید.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setAuthLoading(true);
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

      let finalName = fullName.trim();
      try {
        const me = await authService.getMe();
        if (me && me.fullName) {
          finalName = me.fullName;
        }
      } catch {
        // Fallback to entered name
      }

      login(finalName || "کاربر سایرا", cleanPhone, token);
      setAuthStep("info");
      setFullName("");
      setPhone("");
    } catch (err) {
      setAuthError(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthError("");
    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setAuthLoading(true);
    try {
      await authService.requestOtp(cleanPhone);
      setTimer(120);
      setOtpCode(["", "", "", ""]);
    } catch (err) {
      setAuthError(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  /* --- Edit Profile Handler --- */
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) return;

    login(editFullName.trim(), editPhone.trim() || user?.phone || "", user?.token);
    setEditSuccess(true);
    setTimeout(() => {
      setEditSuccess(false);
      setIsEditModalOpen(false);
    }, 1200);
  };

  /* --- Wallet Charge Handler --- */
  const handleChargeWallet = (amount: number) => {
    setWalletBalance((prev) => prev + amount);
    setWalletSuccess(`مبلغ ${formatPrice(amount)} تومان با موفقیت به کیف پول افزوده شد.`);
    setWalletChargeAmount(null);
    setTimeout(() => {
      setWalletSuccess("");
    }, 3000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toPersianDigits(mins)}:${secs < 10 ? "۰" : ""}${toPersianDigits(secs)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <ProfileHeader title="حساب کاربری" isSubpage={false} />

      <main className="flex-1 pt-20 px-4 py-4 flex flex-col gap-5">
        {/* Loading State */}
        {isLoading && (
          <div className="w-full max-w-md lg:max-w-xl mx-auto p-6 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse flex flex-col gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--foreground)] mx-auto" />
            <div className="h-5 w-32 bg-[var(--foreground)] rounded mx-auto" />
            <div className="h-4 w-24 bg-[var(--foreground)] rounded mx-auto" />
          </div>
        )}

        {/* Unauthenticated State: Login & Registration Form */}
        {!isLoading && !isLoggedIn && (
          <div className="w-full max-w-md lg:max-w-xl mx-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col gap-5 shadow-xl">
            <div className="flex flex-col items-center text-center gap-2 border-b border-[var(--border-subtle)] pb-4">
              <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20 shadow-inner">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-base font-bold text-[var(--text-white)]">
                {authStep === "info" ? "ورود یا ثبت‌نام در سایرا" : "تایید شماره موبایل"}
              </h1>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs">
                {authStep === "info"
                  ? "جهت استفاده از خدمات، رزرو نوبت و مدیریت حساب کاربری، لطفاً اطلاعات زیر را وارد کنید."
                  : `کد تایید ارسال شده به شماره ${toPersianDigits(phone)} را وارد نمایید.`}
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold text-center">
                {authError}
              </div>
            )}

            {/* Step 1: User Info */}
            {authStep === "info" ? (
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
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
                  disabled={authLoading}
                  className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <span>{authLoading ? "در حال ارسال..." : "ارسال کد تایید"}</span>
                  {!authLoading && (
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
                  <span className="text-[var(--text-muted)]">شماره: <strong className="text-[var(--text-white)]">{toPersianDigits(phone)}</strong></span>
                  <button
                    type="button"
                    onClick={() => setAuthStep("info")}
                    className="text-[var(--primary)] underline hover:opacity-80 font-bold"
                  >
                    ویرایش شماره
                  </button>
                </div>

                {/* OTP Inputs */}
                <div className="flex items-center justify-center gap-3 dir-ltr my-2">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`profile-otp-input-${index}`}
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

                {/* Resend / Timer */}
                <div className="flex items-center justify-between text-xs pt-1">
                  {timer > 0 ? (
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span>ارسال مجدد کد تا:</span>
                      <strong className="text-[var(--primary)] font-mono">{formatTimer(timer)}</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-[var(--primary)] font-bold hover:underline"
                    >
                      ارسال مجدد کد تایید
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="h-12 mt-2 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <span>{authLoading ? "در حال بررسی..." : "تایید و ورود"}</span>
                  {!authLoading && (
                    <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Authenticated State */}
        {!isLoading && isLoggedIn && user && (
          <div className="w-full max-w-md lg:max-w-xl mx-auto flex flex-col gap-4 animate-fadeIn">
            {/* User Info Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex items-center gap-4 shadow-lg relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-[var(--foreground)] border-2 border-[var(--primary)] flex items-center justify-center text-[var(--primary)] text-2xl font-bold shrink-0 shadow-md">
                {user.fullName ? user.fullName.charAt(0) : "ک"}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--text-white)] truncate">
                    {user.fullName || "کاربر سایرا"}
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                    کاربر سایرا
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono dir-ltr text-right">
                  {user.phone ? toPersianDigits(user.phone) : "بدون شماره"}
                </p>
              </div>
            </div>

            {/* Wallet Summary Banner */}
            <div className="bg-gradient-to-r from-[var(--bg-card)] via-[var(--foreground)]/40 to-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-muted)] font-bold">موجودی کیف پول</span>
                  <span className="text-sm font-black text-[var(--text-white)]">
                    {formatPrice(walletBalance)} <span className="text-xs text-[var(--text-muted)] font-normal">تومان</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="h-9 px-3.5 rounded-card bg-[var(--primary)]/10 hover:bg-[var(--primary)] hover:text-on-primary text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold transition-all active:scale-95"
              >
                + افزایش
              </button>
            </div>

            {/* Menu Options Group */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card overflow-hidden divide-y divide-[var(--border-subtle)] shadow-lg">
              {/* 1. پشتیبانی */}
              <Link
                href="/support"
                className="w-full p-4 flex items-center justify-between hover:bg-[var(--foreground)]/30 transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-card bg-[var(--foreground)] text-[var(--primary)] flex items-center justify-center transition-colors group-hover:scale-105">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text-white)]">پشتیبانی</span>
                    <span className="text-xs text-[var(--text-muted)]">ارتباط با کارشناسان و پاسخ به سوالات</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[var(--text-subtle)] transform rotate-180 group-hover:translate-x-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 2. ویرایش اطلاعات */}
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="w-full p-4 flex items-center justify-between hover:bg-[var(--foreground)]/30 transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-card bg-[var(--foreground)] text-[var(--primary)] flex items-center justify-center transition-colors group-hover:scale-105">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text-white)]">ویرایش اطلاعات</span>
                    <span className="text-xs text-[var(--text-muted)]">ویرایش نام و اطلاعات کاربری</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[var(--text-subtle)] transform rotate-180 group-hover:translate-x-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 3. کیف پول */}
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-[var(--foreground)]/30 transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-card bg-[var(--foreground)] text-[var(--primary)] flex items-center justify-center transition-colors group-hover:scale-105">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text-white)]">کیف پول</span>
                    <span className="text-xs text-[var(--text-muted)]">افزایش موجودی و مدیریت تراکنش‌ها</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[var(--text-subtle)] transform rotate-180 group-hover:translate-x-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 4. خروج از حساب */}
              <button
                type="button"
                onClick={logout}
                className="w-full p-4 flex items-center justify-between hover:bg-[var(--accent-red)]/10 transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-card bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex items-center justify-center transition-colors group-hover:scale-105">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--accent-red)]">خروج از حساب</span>
                    <span className="text-xs text-[var(--text-muted)]">خروج از حساب کاربری فعلی</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[var(--accent-red)]/60 transform rotate-180 group-hover:translate-x-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4" onClick={() => setIsSupportModalOpen(false)}>
          <div className="w-full max-w-[440px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-white)]">پشتیبانی سایرا</h3>
              </div>
              <button type="button" onClick={() => setIsSupportModalOpen(false)} className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg">✕</button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              تیم پشتیبانی سایرا ۷ روز هفته پاسخگوی سوالات و مشکلات شما در خصوص رزرو و خدمات گیم‌سنترها می‌باشد.
            </p>

            <div className="flex flex-col gap-3 my-1">
              <a href="tel:02191000000" className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-white)]">تماس تلفنی</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">۰۲۱-۹۱۰۰۰۰۰۰</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">تماس</span>
              </a>

              <a href="https://t.me/SayraSupport" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-white)]">پشتیبانی تلگرام</span>
                    <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">@SayraSupport</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">چت تلگرام</span>
              </a>
            </div>

            <button type="button" onClick={() => setIsSupportModalOpen(false)} className="h-11 w-full rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs mt-1">
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="w-full max-w-[440px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-white)]">ویرایش اطلاعات حساب</h3>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg">✕</button>
            </div>

            {editSuccess && (
              <div className="p-3 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-bold text-center">
                اطلاعات حساب با موفقیت بروزرسانی شد.
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">شماره تلفن</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  dir="ltr"
                  className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none text-right"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-11 flex-1 rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-11 flex-1 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-md"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4" onClick={() => setIsWalletModalOpen(false)}>
          <div className="w-full max-w-[440px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-white)]">مدیریت کیف پول</h3>
              </div>
              <button type="button" onClick={() => setIsWalletModalOpen(false)} className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg">✕</button>
            </div>

            {walletSuccess && (
              <div className="p-3 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-bold text-center">
                {walletSuccess}
              </div>
            )}

            <div className="bg-[var(--foreground)]/40 p-4 rounded-card border border-[var(--border-subtle)] flex flex-col gap-1 items-center justify-center text-center">
              <span className="text-xs text-[var(--text-muted)] font-bold">موجودی فعلی حساب شما</span>
              <span className="text-xl font-black text-[var(--primary)]">
                {formatPrice(walletBalance)} <span className="text-xs text-[var(--text-white)] font-normal">تومان</span>
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--text-white)]">انتخاب مبلغ جهت افزایش موجودی:</span>
              <div className="grid grid-cols-3 gap-2">
                {[100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWalletChargeAmount(amt)}
                    className={`h-11 rounded-card border text-xs font-bold transition-all ${
                      walletChargeAmount === amt
                        ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] shadow-md"
                        : "bg-[var(--foreground)]/40 border-[var(--border-subtle)] text-[var(--text-white)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    {formatPrice(amt)}
                  </button>
                ))}
              </div>
            </div>

            {walletChargeAmount && (
              <button
                type="button"
                onClick={() => handleChargeWallet(walletChargeAmount)}
                className="h-11 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-lg mt-1 transition-all active:scale-[0.98]"
              >
                پرداخت و شارژ {formatPrice(walletChargeAmount)} تومان
              </button>
            )}

            <button type="button" onClick={() => setIsWalletModalOpen(false)} className="h-11 w-full rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs mt-1">
              بستن
            </button>
          </div>
        </div>
      )}

      <BottomBar activeTab="profile" />
    </div>
  );
}
