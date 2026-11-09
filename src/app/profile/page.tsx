"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { BottomBar } from "@/components/BottomBar";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { toPersianDigits, formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { UnifiedAuthForm, UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";

export default function ProfilePage() {
  const { isLoggedIn, isLoading, user, login, logout } = useAuth();

  // Modal Visibility States
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Edit Profile Form States
  const [editStep, setEditStep] = useState<"form" | "otp">("form");
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [editOtpCode, setEditOtpCode] = useState(["", "", "", "", "", ""]);
  const [editOtpTimer, setEditOtpTimer] = useState(120);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Wallet State
  const [walletBalance] = useState(0);
  const [walletChargeAmount, setWalletChargeAmount] = useState<number | null>(null);
  const [walletSuccess] = useState("");
  const [walletError, setWalletError] = useState("");

  // Countdown timer for edit profile phone OTP
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isEditModalOpen && editStep === "otp" && editOtpTimer > 0) {
      interval = setInterval(() => {
        setEditOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEditModalOpen, editStep, editOtpTimer]);

  // Open Edit Profile Modal and prefill data
  const handleOpenEditModal = () => {
    setEditStep("form");
    setEditFullName(user?.fullName || "");
    setEditPhone(user?.phone || "");
    setPendingPhone("");
    setEditOtpCode(["", "", "", "", "", ""]);
    setEditOtpTimer(120);
    setEditError("");
    setEditSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleAuthSuccess = (data: UnifiedAuthSuccessData) => {
    login(
      data.fullName || "کاربر سایرا",
      data.phone,
      data.accessToken,
      data.refreshToken,
      data.role || "USER"
    );
    if (data.gamingCenterId) {
      try {
        localStorage.setItem("sayra_owner_center_id", data.gamingCenterId);
      } catch {
        // ignore
      }
    }
  };

  /* --- Edit Profile Handler --- */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess(false);

    const cleanFullName = editFullName.trim();
    if (!cleanFullName) {
      setEditError("لطفاً نام و نام خانوادگی خود را وارد کنید.");
      return;
    }

    const cleanInputPhone = editPhone.trim().replace(/[^\d]/g, "");
    const cleanCurrentPhone = (user?.phone || "").trim().replace(/[^\d]/g, "");

    if (!cleanInputPhone || cleanInputPhone.length < 10) {
      setEditError("لطفاً شماره موبایل معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    // Scenario A: Phone number changed -> Need OTP verification
    if (cleanInputPhone !== cleanCurrentPhone) {
      setEditLoading(true);
      try {
        try {
          await authService.requestOtp(cleanInputPhone);
        } catch (custErr) {
          try {
            await authService.requestUserOtp(cleanInputPhone);
          } catch {
            throw custErr;
          }
        }
        setPendingPhone(cleanInputPhone);
        setEditStep("otp");
        setEditOtpTimer(120);
        setEditOtpCode(["", "", "", "", "", ""]);
      } catch (err) {
        setEditError(getErrorMessage(err));
      } finally {
        setEditLoading(false);
      }
      return;
    }

    // Scenario B: Phone number is the same, only updating name
    setEditLoading(true);
    try {
      // Try backend endpoint if available
      try {
        await authService.updateProfile({
          fullName: cleanFullName,
          phone: cleanCurrentPhone,
        });
      } catch {
        // Ignored if unsupported on backend
      }

      login(
        cleanFullName,
        cleanCurrentPhone,
        user?.token,
        undefined,
        user?.role || "USER"
      );

      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: unknown) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  };

  /* --- Edit OTP Change Handlers --- */
  const handleEditOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/[^\d]/g, "").slice(0, 6).split("");
      const newOtp = [...editOtpCode];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setEditOtpCode(newOtp);
      return;
    }

    const clean = value.replace(/[^\d]/g, "");
    const newOtp = [...editOtpCode];
    newOtp[index] = clean;
    setEditOtpCode(newOtp);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`profile-edit-otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleEditOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !editOtpCode[index] && index > 0) {
      const prevInput = document.getElementById(`profile-edit-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyEditPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess(false);

    const fullCode = editOtpCode.join("");
    if (fullCode.length < 4) {
      setEditError("لطفاً کد تایید را به طور کامل وارد کنید.");
      return;
    }

    setEditLoading(true);
    try {
      const authRes = await authService.verifyOtp(pendingPhone, fullCode);
      const token = authRes?.accessToken;

      const newFullName = editFullName.trim() || authRes?.user?.fullName || user?.fullName || "کاربر سایرا";
      const resolvedRole = authRes?.user?.role || user?.role || "USER";

      login(
        newFullName,
        pendingPhone,
        token || user?.token,
        authRes?.refreshToken,
        resolvedRole
      );

      // Best effort update on backend if endpoint exists
      try {
        await authService.updateProfile({
          fullName: newFullName,
          phone: pendingPhone,
        });
      } catch {
        // ignore
      }

      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setIsEditModalOpen(false);
        setEditStep("form");
      }, 1200);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  };

  const handleResendEditOtp = async () => {
    setEditError("");
    setEditLoading(true);
    try {
      try {
        await authService.requestOtp(pendingPhone);
      } catch {
        await authService.requestUserOtp(pendingPhone);
      }
      setEditOtpTimer(120);
      setEditOtpCode(["", "", "", "", "", ""]);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toPersianDigits(mins)}:${secs < 10 ? "۰" : ""}${toPersianDigits(secs)}`;
  };

  /* --- Wallet Charge Handler --- */
  const handleChargeWallet = () => {
    setWalletError("");
    try {
      authService.walletUnsupported();
    } catch {
      setWalletError("درگاه و افزایش موجودی کیف پول در حال حاضر در دسترس نیست.");
      setWalletChargeAmount(null);
      setTimeout(() => {
        setWalletError("");
      }, 4000);
    }
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

        {/* Unauthenticated State: Unified Login Form */}
        {!isLoading && !isLoggedIn && (
          <div className="w-full max-w-md lg:max-w-xl mx-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col gap-5 shadow-xl">
            <UnifiedAuthForm
              onSuccess={handleAuthSuccess}
              title="ورود یا ثبت‌نام در حساب کاربری"
              description="جهت استفاده از خدمات، رزرو نوبت و مدیریت حساب کاربری، با پیامک یک‌بار مصرف (OTP) وارد شوید یا ثبت‌نام کنید."
            />
          </div>
        )}

        {/* Authenticated State */}
        {!isLoading && isLoggedIn && user && (
          <div className="w-full max-w-[var(--max-mini-app-width)]  mx-auto flex flex-col gap-4 animate-fadeIn">
            {/* User Info Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex items-center gap-4 shadow-lg relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-[var(--foreground)] border-2 border-[var(--primary)] flex items-center justify-center text-[var(--primary)] text-2xl font-bold shrink-0 shadow-md">
                {user.fullName ? user.fullName.charAt(0) : "ک"}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-[var(--text-white)] truncate">
                    {user.fullName || "کاربر سایرا"}
                  </h2>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 hover:bg-[var(--primary)] hover:text-on-primary text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95"
                    title="ویرایش اطلاعات کاربر"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>ویرایش اطلاعات</span>
                  </button>
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
              {/* ۰. ثبت و راه‌اندازی گیم‌نت */}
              <Link
                href="/owner/new"
                className="w-full p-4 flex items-center justify-between hover:bg-[var(--foreground)]/30 transition-colors text-right group bg-[var(--primary)]/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-card bg-[var(--primary)] text-black flex items-center justify-center transition-colors group-hover:scale-105 font-black text-sm">
                    +
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--primary)]">ثبت و ایجاد گیم‌نت جدید</span>
                    <span className="text-xs text-[var(--text-muted)]">معرفی مجموعه و راه‌اندازی سامانه رزرو آنلاین</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[var(--primary)] transform rotate-180 group-hover:translate-x-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

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

              {/* 2. کیف پول */}
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4" onClick={() => setIsSupportModalOpen(false)}>
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4" onClick={() => setIsEditModalOpen(false)}>
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

            {editError && (
              <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold text-center">
                {editError}
              </div>
            )}

            {editStep === "form" && (
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">شماره تلفن</label>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      در صورت تغییر شماره، کد تأیید پیامک می‌شود
                    </span>
                  </div>
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
                    className="h-11 flex-1 rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="h-11 flex-1 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {editLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </button>
                </div>
              </form>
            )}

            {editStep === "otp" && (
              <form onSubmit={handleVerifyEditPhoneOtp} className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs">
                  <p className="text-[var(--text-muted)]">
                    کد تأیید به شماره جدید <span className="text-[var(--primary)] font-bold">{toPersianDigits(pendingPhone)}</span> پیامک شد.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditStep("form");
                      setEditError("");
                    }}
                    className="text-[var(--primary)] underline hover:opacity-80 font-bold shrink-0 mr-1 cursor-pointer"
                  >
                    ویرایش شماره
                  </button>
                </div>

                {/* 6-Digit OTP Inputs */}
                <div className="flex items-center justify-center gap-2 dir-ltr my-2">
                  {editOtpCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`profile-edit-otp-input-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleEditOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleEditOtpKeyDown(index, e)}
                      className="w-10 sm:w-11 h-14 text-center text-xl font-black rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-[var(--primary)] outline-none transition-colors shadow-inner"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {/* Timer / Resend */}
                <div className="flex items-center justify-between text-xs pt-1">
                  {editOtpTimer > 0 ? (
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span>ارسال مجدد کد تا:</span>
                      <strong className="text-[var(--primary)] font-mono">{formatTimer(editOtpTimer)}</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendEditOtp}
                      className="text-[var(--primary)] font-bold hover:underline cursor-pointer"
                    >
                      ارسال مجدد کد تأیید
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditStep("form");
                      setEditError("");
                    }}
                    className="h-11 flex-1 rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs cursor-pointer"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="h-11 flex-1 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {editLoading ? "در حال اعتبارسنجی..." : "تأیید و به‌روزرسانی"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4" onClick={() => setIsWalletModalOpen(false)}>
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

            {walletError && (
              <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold text-center">
                {walletError}
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
                onClick={handleChargeWallet}
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
