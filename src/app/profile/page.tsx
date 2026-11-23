"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { BottomBar } from "@/components/BottomBar";
import { OwnerCenterLink } from "@/components/OwnerCenterLink";
import { NotificationModal } from "@/components/NotificationModal";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { SUPPORT_PHONE } from "@/lib/contact";
import { authService } from "@/services/authService";
import {
  customerNotificationService,
  NOTIFICATIONS_REFRESH_EVENT,
} from "@/services/customerNotificationService";
import { walletService } from "@/services/walletService";
import type {
  CustomerWallet,
  WithdrawalRequest,
  WalletTransaction,
} from "@/types/wallet";
import {
  cleanPhoneNumber,
  isValidIranPhone,
  toPersianDigits,
  toEnglishDigits,
  formatPrice,
  formatToman,
  tomanToRial,
} from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import type { UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";
import { UserLoginPanel } from "@/components/auth/UserLoginPanel";

const WITHDRAW_STATUS_LABEL: Record<string, { label: string; color: string }> =
  {
    PENDING: {
      label: "در انتظار بررسی",
      color:
        "text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/30",
    },
    APPROVED: {
      label: "تأیید شده",
      color:
        "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30",
    },
    PROCESSING: {
      label: "در حال انتقال",
      color:
        "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30",
    },
    PAID: {
      label: "پرداخت موفق",
      color:
        "text-[var(--accent-green)] bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30",
    },
    REJECTED: {
      label: "رد شده",
      color:
        "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30",
    },
    FAILED: {
      label: "خطای انتقال",
      color:
        "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30",
    },
    CANCELLED: {
      label: "لغو شده",
      color:
        "text-[var(--text-muted)] bg-[var(--foreground)]/30 border-[var(--border-subtle)]",
    },
  };
  

const MenuIcon = ({ d }: { d: string }) => (
  <svg
    className="w-6 h-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

type ProfileMenuItem = {
  key: string;
  label: string;
  icon: string;
  href?: string;
  action?: "notifications" | "logout";
  danger?: boolean;
};

const PROFILE_MENU: ProfileMenuItem[] = [
  {
    key: "reservations",
    href: "/reservations",
    label: "رزروهای من",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    key: "notifications",
    label: "نوتیفیکیشن‌ها",
    icon: "M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    action: "notifications",
  },
  {
    key: "wallet",
    href: "/profile/wallet",
    label: "کیف پول",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    key: "support",
    href: "/support",
    label: "پشتیبانی",
    icon: "M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1v-4zm16 0h-3v5h2a1 1 0 001-1v-4zM17 19c0 1.5-2 2-5 2",
  },
  {
    key: "logout",
    label: "خروج از حساب",
    icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    action: "logout",
    danger: true,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, user, role, login, logout } = useAuth();
  const notificationScope =
    role === "MANAGER" || role === "ADMIN" ? "staff" : "customer";
  
  

  // Modal Visibility States
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

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
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletTab, setWalletTab] = useState<"charge" | "withdraw" | "history">(
    "charge",
  );
  const [walletChargeAmount, setWalletChargeAmount] = useState<number | null>(
    null,
  );
  const [customChargeAmount, setCustomChargeAmount] = useState("");
  const [walletCharging, setWalletCharging] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState("");
  const [walletError, setWalletError] = useState("");

  // Withdrawal form states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawHolder, setWithdrawHolder] = useState("");
  const [withdrawSheba, setWithdrawSheba] = useState("");
  const [withdrawCardNumber, setWithdrawCardNumber] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch wallet data when user is logged in
  const fetchWalletData = React.useCallback(async () => {
    if (!isLoggedIn) return;
    setWalletLoading(true);
    try {
      const data = await walletService.getWallet();
      setWallet(data);
    } catch {
      // Best effort - keep default zero state
    } finally {
      setWalletLoading(false);
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Fetch unread notifications count when user is logged in
  React.useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    const controller = new AbortController();

    const loadUnreadCount = () => {
      customerNotificationService
        .getUnreadCount(controller.signal, notificationScope)
        .then((count) => {
          if (active) setUnreadNotificationsCount(count);
        })
        .catch(() => {
          // Best effort
        });
    };

    loadUnreadCount();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, loadUnreadCount);

    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, loadUnreadCount);
      controller.abort();
    };
  }, [isLoggedIn, notificationScope]);

  const effectiveUnreadNotificationsCount = isLoggedIn
    ? unreadNotificationsCount
    : 0;

  // Fetch history when tab is opened
  const fetchWalletHistory = React.useCallback(async () => {
    if (!isLoggedIn) return;
    setHistoryLoading(true);
    try {
      const [wRes, tRes] = await Promise.allSettled([
        walletService.getWithdrawals({ page: 1, pageSize: 20 }),
        walletService.getTransactions({ page: 1, pageSize: 20 }),
      ]);
      if (wRes.status === "fulfilled") setWithdrawals(wRes.value.items);
      if (tRes.status === "fulfilled") setTransactions(tRes.value.items);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (isWalletModalOpen && walletTab === "history") {
      fetchWalletHistory();
    }
  }, [isWalletModalOpen, walletTab, fetchWalletHistory]);

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
      data.role || "USER",
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

    const cleanInputPhone = cleanPhoneNumber(editPhone);
    const cleanCurrentPhone = cleanPhoneNumber(user?.phone);

    if (!isValidIranPhone(cleanInputPhone)) {
      setEditError(
        "لطفاً شماره موبایل معتبر (۱۱ رقم با ۰۹ مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.",
      );
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
      const updatedUser = await authService.updateProfile(
        {
          fullName: cleanFullName,
        },
        {
          actorType: user?.actorType,
          role: user?.role,
        },
      );

      const resolvedName = updatedUser?.fullName || cleanFullName;

      login(
        resolvedName,
        cleanCurrentPhone,
        user?.token,
        undefined,
        updatedUser?.role || user?.role || "USER",
        updatedUser?.actorType || user?.actorType,
        updatedUser?.gamingCenterId || user?.gamingCenterId,
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
      const nextInput = document.getElementById(
        `profile-edit-otp-input-${index + 1}`,
      );
      nextInput?.focus();
    }
  };

  const handleEditOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !editOtpCode[index] && index > 0) {
      const prevInput = document.getElementById(
        `profile-edit-otp-input-${index - 1}`,
      );
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

      const newFullName =
        editFullName.trim() ||
        authRes?.user?.fullName ||
        user?.fullName ||
        "کاربر سایرا";
      const resolvedRole = authRes?.user?.role || user?.role || "USER";
      const resolvedActorType = authRes?.user?.actorType || user?.actorType;
      const resolvedCenterId =
        authRes?.user?.gamingCenterId || user?.gamingCenterId;

      const normalizedPhone = cleanPhoneNumber(pendingPhone);
      login(
        newFullName,
        normalizedPhone,
        token || user?.token,
        authRes?.refreshToken,
        resolvedRole,
        resolvedActorType,
        resolvedCenterId,
      );

      // If full name was updated during phone change, update profile via API
      if (editFullName.trim()) {
        try {
          await authService.updateProfile(
            {
              fullName: editFullName.trim(),
            },
            {
              actorType: resolvedActorType,
              role: resolvedRole,
            },
          );
        } catch {
          // ignore error if secondary to OTP verification
        }
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
  const handleChargeWallet = async () => {
    setWalletError("");
    setWalletSuccess("");

    const targetAmount = customChargeAmount.trim()
      ? Number(toEnglishDigits(customChargeAmount).replace(/[,٬،\s]/g, ""))
      : walletChargeAmount;

    if (!targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
      setWalletError(
        "لطفاً یک مبلغ معتبر جهت افزایش موجودی انتخاب یا وارد فرمایید.",
      );
      return;
    }

    if (targetAmount < 1000) {
      setWalletError("حداقل مبلغ شارژ کیف پول ۱,۰۰۰ تومان می‌باشد.");
      return;
    }

    setWalletCharging(true);
    try {
      const amountRial = tomanToRial(targetAmount);
      // Connect to real charge wallet flow
      const chargeRes = await walletService.chargeWallet({
        amount: amountRial,
        currency: "IRR",
        redirectUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}/profile?wallet=verify`
            : undefined,
        description: `افزایش موجودی کیف پول به مبلغ ${formatToman(targetAmount)} تومان`,
      });

      if (chargeRes?.paymentUrl) {
        setWalletSuccess("در حال اتصال و انتقال امن به درگاه بانکی...");
        window.location.href = chargeRes.paymentUrl;
      } else {
        setWalletSuccess(
          `پرداخت برای مبلغ ${formatToman(targetAmount)} تومان ثبت شد.`,
        );
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setWalletError(
        msg || "امکان شارژ مستقیم کیف پول در حال حاضر در سامانه فعال نشده است.",
      );
    } finally {
      setWalletCharging(false);
    }
  };

  /* --- Customer Withdrawal Handler --- */
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError("");
    setWalletSuccess("");

    const parsedAmt = Number(toEnglishDigits(withdrawAmount).replace(/[,٬،\s]/g, ""));
    const cleanHolder = withdrawHolder.trim();
    const cleanSheba = withdrawSheba
      .trim()
      .toUpperCase()
      .replace(/^IR/i, "")
      .replace(/[^0-9]/g, "");

    if (!cleanHolder) {
      setWalletError("لطفاً نام و نام خانوادگی صاحب حساب را وارد کنید.");
      return;
    }
    if (cleanSheba.length !== 24) {
      setWalletError("شماره شبا باید دقیقا ۲۴ رقم عددی معتبر (بدون IR) باشد.");
      return;
    }
    if (!parsedAmt || isNaN(parsedAmt) || parsedAmt <= 0) {
      setWalletError("لطفاً مبلغ معتبری برای برداشت وارد کنید.");
      return;
    }

    const amountRial = tomanToRial(parsedAmt);

    if (wallet && amountRial > wallet.availableBalance) {
      setWalletError("مبلغ درخواستی بیشتر از موجودی قابل برداشت شما است.");
      return;
    }

    if (wallet?.lastWithdrawalRequestAt) {
      const lastTime = new Date(wallet.lastWithdrawalRequestAt).getTime();
      const now = Date.now();
      if (now < lastTime + 24 * 60 * 60 * 1000) {
        setWalletError(
          "هر کاربر در هر ۲۴ ساعت صرفاً مجاز به ثبت یک درخواست برداشت است.",
        );
        return;
      }
    }

    setWithdrawSubmitting(true);
    try {
      await walletService.requestWithdrawal(
        {
          amount: amountRial,
          bankDetails: {
            sheba: cleanSheba,
            accountHolderName: cleanHolder,
            cardNumber: withdrawCardNumber.trim() || undefined,
            bankName: withdrawBankName.trim() || undefined,
          },
        },
        wallet || undefined,
      );

      setWalletSuccess(
        "درخواست برداشت وجه با موفقیت ثبت شد و در صف بررسی مدیر پلتفرم قرار گرفت.",
      );
      setWithdrawAmount("");
      await fetchWalletData();
      if (walletTab === "history") {
        await fetchWalletHistory();
      }
    } catch (err: unknown) {
      setWalletError(getErrorMessage(err));
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <ProfileHeader title="حساب کاربری" isSubpage={false} />

      <main className="flex-1 px-4 pt-20 pb-4 flex flex-col gap-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
        {/* Loading State */}
        {isLoading && (
          <div aria-busy="true" className="w-full flex flex-col gap-5">
            {/* User Info Card Skeleton */}
            <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-[var(--foreground)]/70 shrink-0" />
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 w-32 rounded bg-[var(--foreground)]/70" />
                  <div className="h-7 w-24 rounded-full bg-[var(--foreground)]/50 shrink-0" />
                </div>
                <div className="h-3 w-24 rounded bg-[var(--foreground)]/50" />
              </div>
            </div>

            {/* Wallet Summary Banner Skeleton */}
            <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--foreground)]/70 shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-20 rounded bg-[var(--foreground)]/50" />
                  <div className="h-4 w-28 rounded bg-[var(--foreground)]/70" />
                </div>
              </div>
              <div className="h-9 w-16 rounded-card bg-[var(--foreground)]/60 shrink-0" />
            </div>

            {/* Menu Links Skeleton */}
            <div className="rounded-card bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)] animate-pulse">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 h-16">
                  <div className="w-6 h-6 rounded bg-[var(--foreground)]/70 shrink-0" />
                  <div className="h-4 w-28 rounded bg-[var(--foreground)]/60" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unauthenticated State: Unified Login Form */}
        {!isLoading && !isLoggedIn && (
          <UserLoginPanel onSuccess={handleAuthSuccess} />
        )}

        {/* Authenticated State */}
        {!isLoading && isLoggedIn && user && (
          <div className="w-full flex flex-col gap-5 animate-fadeIn">
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
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
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
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-muted)] font-bold">
                    موجودی کیف پول
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-[var(--text-white)]">
                      {formatPrice(wallet?.walletBalance ?? 0)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-normal">
                      تومان
                    </span>
                    {wallet && wallet.reservedBalance > 0 ? (
                      <span className="text-[10px] text-[var(--text-muted)] mr-1">
                        ({formatPrice(wallet.reservedBalance)} رزروشده)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/profile/wallet")}
                className="h-9 px-3.5 rounded-card bg-[var(--primary)]/10 hover:bg-[var(--primary)] hover:text-on-primary text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold transition-all active:scale-95"
              >
                مدیریت
              </button>
            </div>

            {/* منو */}
            <div className="rounded-card bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)]">
              <OwnerCenterLink
                variant="card"
                fallback="none"
                hideArrow
                className="rounded-none border-0 px-5 h-16 hover:bg-[var(--foreground)]/20"
              />

              {PROFILE_MENU.map((item) => {
                const rowClass = `w-full flex items-center justify-between gap-3 px-5 h-16 text-right transition-colors ${
                  item.danger
                    ? "hover:bg-[var(--accent-red)]/10 cursor-pointer"
                    : "hover:bg-[var(--foreground)]/20 cursor-pointer"
                }`;
                const content = (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={
                          item.danger
                            ? "text-[var(--accent-red)]"
                            : "text-[var(--text-white)]"
                        }
                      >
                        <MenuIcon d={item.icon} />
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          item.danger
                            ? "text-[var(--accent-red)]"
                            : "text-[var(--text-white)]"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.action === "notifications" &&
                      effectiveUnreadNotificationsCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-bold text-on-primary shrink-0">
                          {effectiveUnreadNotificationsCount > 9
                            ? "+۹"
                            : toPersianDigits(effectiveUnreadNotificationsCount)}
                        </span>
                      )}
                  </>
                );

                if (item.href) {
                  return (
                    <Link key={item.key} href={item.href} className={rowClass}>
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={
                      item.action === "notifications"
                        ? () => setIsNotificationModalOpen(true)
                        : logout
                    }
                    className={rowClass}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Support Modal */}
      {isSupportModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setIsSupportModalOpen(false)}
        >
          <div
            className="w-full max-w-[440px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  پشتیبانی سایرا
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              تیم پشتیبانی سایرا ۷ روز هفته پاسخگوی سوالات و مشکلات شما در خصوص
              رزرو و خدمات گیم‌سنترها می‌باشد.
            </p>

            <div className="flex flex-col gap-3 my-1">
              {SUPPORT_PHONE ? (
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-white)]">
                        تماس تلفنی
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {SUPPORT_PHONE}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--primary)]">
                    تماس
                  </span>
                </a>
              ) : (
                <Link
                  href="/support"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-white)]">
                        سامانه پشتیبانی و تیکتینگ
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ارسال تیکت و پیگیری آنلاین
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--primary)]">
                    مشاهده
                  </span>
                </Link>
              )}

              <a
                href="https://t.me/SayraSupport"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-white)]">
                      پشتیبانی تلگرام
                    </span>
                    <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">
                      @SayraSupport
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">
                  چت تلگرام
                </span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsSupportModalOpen(false)}
              className="h-11 w-full rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs mt-1"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="w-full max-w-[440px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  ویرایش اطلاعات حساب
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg"
              >
                ✕
              </button>
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
              <form
                onSubmit={handleSaveProfile}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      شماره تلفن
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      در صورت تغییر شماره، کد تأیید پیامک می‌شود
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={editPhone}
                    placeholder="09123456789"
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
              <form
                onSubmit={handleVerifyEditPhoneOtp}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <p className="text-[var(--text-muted)]">
                    کد تأیید به شماره جدید{" "}
                    <span className="text-[var(--primary)] font-bold">
                      {toPersianDigits(pendingPhone)}
                    </span>{" "}
                    پیامک شد.
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
                      onChange={(e) =>
                        handleEditOtpChange(index, e.target.value)
                      }
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
                      <strong className="text-[var(--primary)] font-mono">
                        {formatTimer(editOtpTimer)}
                      </strong>
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
                    {editLoading
                      ? "در حال اعتبارسنجی..."
                      : "تأیید و به‌روزرسانی"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {isWalletModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setIsWalletModalOpen(false)}
        >
          <div
            className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  مدیریت کیف پول
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(false)}
                className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setWalletTab("charge");
                  setWalletError("");
                  setWalletSuccess("");
                }}
                className={`flex-1 py-2 rounded-card font-bold transition-all ${
                  walletTab === "charge"
                    ? "bg-[var(--primary)] text-on-primary shadow-sm"
                    : "bg-[var(--foreground)]/30 text-[var(--text-muted)] hover:text-[var(--text-white)]"
                }`}
              >
                افزایش موجودی
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletTab("withdraw");
                  setWalletError("");
                  setWalletSuccess("");
                }}
                className={`flex-1 py-2 rounded-card font-bold transition-all ${
                  walletTab === "withdraw"
                    ? "bg-[var(--primary)] text-on-primary shadow-sm"
                    : "bg-[var(--foreground)]/30 text-[var(--text-muted)] hover:text-[var(--text-white)]"
                }`}
              >
                درخواست برداشت
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletTab("history");
                  setWalletError("");
                  setWalletSuccess("");
                }}
                className={`flex-1 py-2 rounded-card font-bold transition-all ${
                  walletTab === "history"
                    ? "bg-[var(--primary)] text-on-primary shadow-sm"
                    : "bg-[var(--foreground)]/30 text-[var(--text-muted)] hover:text-[var(--text-white)]"
                }`}
              >
                تاریخچه
              </button>
            </div>

            {walletSuccess && (
              <div className="p-3 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-bold text-center leading-relaxed">
                {walletSuccess}
              </div>
            )}

            {walletError && (
              <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold text-center leading-relaxed">
                {walletError}
              </div>
            )}

            {/* Balances Card */}
            <div className="bg-[var(--foreground)]/40 p-4 rounded-card border border-[var(--border-subtle)] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)] font-bold">
                  موجودی کل کیف پول:
                </span>
                <span className="font-bold text-[var(--text-white)]">
                  {walletLoading
                    ? "..."
                    : formatPrice(wallet?.walletBalance ?? 0)}{" "}
                  تومان
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  موجودی رزروشده (در حال تسویه):
                </span>
                <span className="font-bold text-[var(--accent-red)]">
                  {walletLoading
                    ? "..."
                    : formatPrice(wallet?.reservedBalance ?? 0)}{" "}
                  تومان
                </span>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  موجودی قابل برداشت:
                </span>
                <span className="text-lg font-black text-[var(--primary)]">
                  {walletLoading
                    ? "..."
                    : formatPrice(wallet?.availableBalance ?? 0)}{" "}
                  <span className="text-xs text-[var(--text-white)] font-normal">
                    تومان
                  </span>
                </span>
              </div>
            </div>

            {/* TAB 1: CHARGE */}
            {walletTab === "charge" && (
              <div className="flex flex-col gap-4">
                {/* Notice banner regarding backend readiness */}
                <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
                  <svg
                    className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="leading-relaxed">
                    مبلغ دلخواه خود را وارد کنید یا از مبالغ پیشنهادی انتخاب
                    نمایید. پس از لمس دکمه پرداخت، به درگاه شاپرک/بانکی منتقل
                    شده و پس از بازگشت موفق، حساب شما شارژ می‌شود.
                  </p>
                </div>

                {/* Pre-defined quick amounts */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[var(--text-white)]">
                    مبالغ پیشنهادی:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[50000, 100000, 200000, 500000, 1000000, 2000000].map(
                      (amt) => {
                        const isSelected =
                          walletChargeAmount === amt && !customChargeAmount;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setWalletChargeAmount(amt);
                              setCustomChargeAmount("");
                              setWalletError("");
                            }}
                            className={`h-11 rounded-card border text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] shadow-md"
                                : "bg-[var(--foreground)]/40 border-[var(--border-subtle)] text-[var(--text-white)] hover:border-[var(--primary)]/50"
                            }`}
                          >
                            {formatToman(amt)} تومان
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Custom amount input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="custom-charge-amt"
                    className="text-xs font-bold text-[var(--text-white)]"
                  >
                    یا مبلغ دلخواه شما (تومان):
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="custom-charge-amt"
                      type="text"
                      inputMode="numeric"
                      value={
                        customChargeAmount
                          ? formatPrice(
                              Number(
                                customChargeAmount.replace(/[,٬،\s]/g, ""),
                              ),
                            )
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setCustomChargeAmount(raw);
                        if (raw) {
                          setWalletChargeAmount(Number(raw));
                        }
                        setWalletError("");
                      }}
                      placeholder="مثلاً: ۱۵۰,۰۰۰"
                      className="w-full h-11 px-3.5 pl-14 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] font-mono outline-none"
                    />
                    <span className="absolute left-3 text-xs text-[var(--text-muted)] select-none">
                      تومان
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    حداقل مبلغ قابل شارژ: ۱,۰۰۰ تومان
                  </span>
                </div>

                {/* Submit button */}
                {Boolean(walletChargeAmount || customChargeAmount) && (
                  <button
                    type="button"
                    disabled={walletCharging}
                    onClick={handleChargeWallet}
                    className="h-11 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {walletCharging ? (
                      <span>در حال اتصال به درگاه پرداخت...</span>
                    ) : (
                      <span>
                        انتقال به درگاه و شارژ{" "}
                        {formatPrice(
                          customChargeAmount
                            ? Number(customChargeAmount.replace(/[,٬،\s]/g, ""))
                            : (walletChargeAmount ?? 0),
                        )}{" "}
                        تومان
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* TAB 2: WITHDRAW */}
            {walletTab === "withdraw" && (
              <form
                onSubmit={handleWithdrawSubmit}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cw-holder"
                    className="text-xs font-bold text-[var(--text-muted)]"
                  >
                    نام و نام خانوادگی صاحب حساب{" "}
                    <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    id="cw-holder"
                    value={withdrawHolder}
                    onChange={(e) => setWithdrawHolder(e.target.value)}
                    placeholder="مثلاً: محمد رضایی"
                    className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cw-sheba"
                    className="text-xs font-bold text-[var(--text-muted)]"
                  >
                    شماره شبا (IBAN) بدون IR{" "}
                    <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-bold text-[var(--text-muted)] select-none">
                      IR
                    </span>
                    <input
                      id="cw-sheba"
                      value={withdrawSheba}
                      onChange={(e) => setWithdrawSheba(e.target.value)}
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={24}
                      placeholder="000000000000000000000000"
                      className="w-full h-11 px-3.5 pl-10 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] font-mono outline-none text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="cw-card"
                      className="text-xs font-bold text-[var(--text-muted)]"
                    >
                      شماره کارت (اختیاری)
                    </label>
                    <input
                      id="cw-card"
                      value={withdrawCardNumber}
                      onChange={(e) => setWithdrawCardNumber(e.target.value)}
                      dir="ltr"
                      maxLength={16}
                      placeholder="۶۰۳۷..."
                      className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] font-mono outline-none text-left"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="cw-bank"
                      className="text-xs font-bold text-[var(--text-muted)]"
                    >
                      نام بانک (اختیاری)
                    </label>
                    <input
                      id="cw-bank"
                      value={withdrawBankName}
                      onChange={(e) => setWithdrawBankName(e.target.value)}
                      placeholder="مثلاً: ملت"
                      className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="cw-amt"
                      className="text-xs font-bold text-[var(--text-muted)]"
                    >
                      مبلغ برداشت (تومان){" "}
                      <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    {wallet && wallet.availableBalance > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setWithdrawAmount(String(wallet.availableBalance))
                        }
                        className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                      >
                        کل موجودی قابل برداشت
                      </button>
                    ) : null}
                  </div>
                  <input
                    id="cw-amt"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder="مثلاً: ۵۰۰۰۰۰"
                    className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    توجه: هر کاربر در هر ۲۴ ساعت تقویمی صرفاً مجاز به ثبت ۱
                    درخواست برداشت است.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={
                    withdrawSubmitting || wallet?.canWithdrawIn24h === false
                  }
                  className="mt-1 h-11 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-md disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {withdrawSubmitting
                    ? "در حال ثبت درخواست..."
                    : "ثبت درخواست برداشت"}
                </button>
              </form>
            )}

            {/* TAB 3: HISTORY */}
            {walletTab === "history" && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-[var(--text-white)]">
                  درخواست‌های برداشت اخیر:
                </span>
                {historyLoading && (
                  <div className="h-20 rounded-card bg-[var(--foreground)]/30 animate-pulse" />
                )}
                {!historyLoading && withdrawals.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                    درخواست برداشتی یافت نشد.
                  </p>
                )}
                {!historyLoading && (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {withdrawals.map((w) => {
                      const st = WITHDRAW_STATUS_LABEL[w.status] || {
                        label: w.status,
                        color: "text-[var(--text-muted)]",
                      };
                      return (
                        <div
                          key={w.id}
                          className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-[var(--text-white)]">
                              {formatPrice(w.amount)} تومان
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] dir-ltr text-right">
                              {w.bankDetails?.sheba || "IR..."}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${st.color}`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <span className="text-xs font-bold text-[var(--text-white)] mt-2">
                  تراکنش‌های کیف پول:
                </span>
                {!historyLoading && transactions.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                    تراکنشی ثبت نشده است.
                  </p>
                )}
                {!historyLoading && (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {transactions.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                      >
                        <span className="text-[var(--text-muted)]">
                          {t.description || t.type}
                        </span>
                        <span className="font-bold text-[var(--text-white)]">
                          {formatPrice(t.amount)} تومان
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsWalletModalOpen(false)}
              className="h-11 w-full rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs mt-1"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        scope={notificationScope}
        onMarkAllAsRead={() => setUnreadNotificationsCount(0)}
        onUnreadCountChange={setUnreadNotificationsCount}
      />

      <BottomBar activeTab="profile" />
    </div>
  );
}
