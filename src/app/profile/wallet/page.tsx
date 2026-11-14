"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { BottomBar } from "@/components/BottomBar";
import { useAuth } from "@/context/AuthContext";
import { walletService } from "@/services/walletService";
import type {
  CustomerWallet,
  WithdrawalRequest,
  WalletTransaction,
} from "@/types/wallet";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import {
  UnifiedAuthForm,
  UnifiedAuthSuccessData,
} from "@/components/auth/UnifiedAuthForm";

type WalletTab = "charge" | "withdraw" | "history";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "در انتظار بررسی",
    className:
      "text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/30",
  },
  APPROVED: {
    label: "تأیید شده",
    className:
      "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30",
  },
  PROCESSING: {
    label: "در حال انتقال",
    className:
      "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30",
  },
  PAID: {
    label: "پرداخت موفق",
    className:
      "text-[var(--accent-green)] bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30",
  },
  REJECTED: {
    label: "رد شده",
    className:
      "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30",
  },
  FAILED: {
    label: "خطای انتقال",
    className:
      "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30",
  },
  CANCELLED: {
    label: "لغو شده",
    className:
      "text-[var(--text-muted)] bg-[var(--foreground)]/30 border-[var(--border-subtle)]",
  },
};

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const inputClassName =
  "w-full h-12 px-4 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] focus:outline-none text-sm text-[var(--text-white)] placeholder:text-[var(--text-muted)] transition-colors";

const labelClassName = "text-xs font-bold text-[var(--text-muted)]";

function cleanAmount(value: string) {
  return Number(value.replace(/[,٬،\s]/g, ""));
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function WalletPage() {
  const { isLoggedIn, isLoading: authLoading, login } = useAuth();

  const [activeTab, setActiveTab] = useState<WalletTab>("charge");

  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [charging, setCharging] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawHolder, setWithdrawHolder] = useState("");
  const [withdrawSheba, setWithdrawSheba] = useState("");
  const [withdrawCardNumber, setWithdrawCardNumber] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  const fetchWalletData = useCallback(async () => {
    if (!isLoggedIn) return;

    setWalletLoading(true);

    try {
      const data = await walletService.getWallet();
      setWallet(data);
    } catch {
      // در صورت خطای دریافت موجودی، صفحه در حالت پیش‌فرض باقی می‌ماند.
    } finally {
      setWalletLoading(false);
    }
  }, [isLoggedIn]);

  const fetchWalletHistory = useCallback(async () => {
    if (!isLoggedIn) return;

    setHistoryLoading(true);

    try {
      const [withdrawalResult, transactionResult] = await Promise.allSettled([
        walletService.getWithdrawals({
          page: 1,
          pageSize: 20,
        }),
        walletService.getTransactions({
          page: 1,
          pageSize: 20,
        }),
      ]);

      if (withdrawalResult.status === "fulfilled") {
        setWithdrawals(withdrawalResult.value.items);
      }

      if (transactionResult.status === "fulfilled") {
        setTransactions(transactionResult.value.items);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchWalletHistory();
    }
  }, [activeTab, fetchWalletHistory]);

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

  const handleChargeWallet = async () => {
    clearMessages();

    const amount = customAmount.trim()
      ? cleanAmount(customAmount)
      : selectedAmount;

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setErrorMessage(
        "لطفاً یک مبلغ معتبر جهت افزایش موجودی انتخاب یا وارد فرمایید.",
      );
      return;
    }

    if (amount < 1000) {
      setErrorMessage("حداقل مبلغ شارژ کیف پول ۱,۰۰۰ تومان می‌باشد.");
      return;
    }

    setCharging(true);

    try {
      const result = await walletService.chargeWallet({
        amount,
        currency: "IRT",
        redirectUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}/profile?wallet=verify`
            : undefined,
        description: `افزایش موجودی کیف پول به مبلغ ${formatPrice(amount)} تومان`,
      });

      if (result?.paymentUrl) {
        setSuccessMessage("در حال اتصال و انتقال امن به درگاه بانکی...");
        window.location.href = result.paymentUrl;
      } else {
        setSuccessMessage(
          `پرداخت برای مبلغ ${formatPrice(amount)} تومان ثبت شد.`,
        );
      }
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error) ||
          "امکان شارژ مستقیم کیف پول در حال حاضر در سامانه فعال نشده است.",
      );
    } finally {
      setCharging(false);
    }
  };

  const handleWithdrawSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    clearMessages();

    const amount = cleanAmount(withdrawAmount);
    const holder = withdrawHolder.trim();

    const sheba = withdrawSheba
      .trim()
      .toUpperCase()
      .replace(/^IR/i, "")
      .replace(/[^0-9]/g, "");

    if (!holder) {
      setErrorMessage("لطفاً نام و نام خانوادگی صاحب حساب را وارد کنید.");
      return;
    }

    if (sheba.length !== 24) {
      setErrorMessage("شماره شبا باید دقیقا ۲۴ رقم عددی معتبر (بدون IR) باشد.");
      return;
    }

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setErrorMessage("لطفاً مبلغ معتبری برای برداشت وارد کنید.");
      return;
    }

    if (wallet && amount > wallet.availableBalance) {
      setErrorMessage("مبلغ درخواستی بیشتر از موجودی قابل برداشت شما است.");
      return;
    }

    if (wallet?.lastWithdrawalRequestAt) {
      const lastTime = new Date(wallet.lastWithdrawalRequestAt).getTime();

      if (Date.now() < lastTime + 24 * 60 * 60 * 1000) {
        setErrorMessage(
          "هر کاربر در هر ۲۴ ساعت صرفاً مجاز به ثبت یک درخواست برداشت است.",
        );
        return;
      }
    }

    setWithdrawSubmitting(true);

    try {
      await walletService.requestWithdrawal(
        {
          amount,
          bankDetails: {
            sheba,
            accountHolderName: holder,
            cardNumber: withdrawCardNumber.trim() || undefined,
            bankName: withdrawBankName.trim() || undefined,
          },
        },
        wallet || undefined,
      );

      setSuccessMessage(
        "درخواست برداشت وجه با موفقیت ثبت شد و در صف بررسی مدیر پلتفرم قرار گرفت.",
      );

      setWithdrawAmount("");

      await fetchWalletData();

      if (activeTab === "history") {
        await fetchWalletHistory();
      }
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const selectTab = (tab: WalletTab) => {
    clearMessages();
    setActiveTab(tab);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10"
    >
      <ProfileHeader title="کیف پول" isSubpage backUrl="/profile" />

      <main className="w-full max-w-[var(--max-mini-app-width)] mx-auto flex-1 px-4 pt-24 pb-8">
        {authLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-card bg-[var(--bg-card)]" />
            <div className="h-12 rounded-card bg-[var(--bg-card)]" />
            <div className="h-56 rounded-card bg-[var(--bg-card)]" />
          </div>
        )}

        {!authLoading && !isLoggedIn && (
          <div className="max-w-md mx-auto">
            <UnifiedAuthForm
              onSuccess={handleAuthSuccess}
              title="ورود به حساب کاربری"
              description="برای مشاهده و مدیریت کیف پول، ابتدا وارد حساب خود شوید."
            />
          </div>
        )}

        {!authLoading && isLoggedIn && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* Page heading */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-black">مدیریت کیف پول</h1>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  موجودی، شارژ و برداشت وجه
                </p>
              </div>

              <button
                type="button"
                onClick={fetchWalletData}
                disabled={walletLoading}
                aria-label="به‌روزرسانی موجودی"
                className="w-10 h-10 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--primary)] disabled:opacity-50"
              >
                <svg
                  className={`w-5 h-5 ${walletLoading ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7v5h-5M4 17v-5h5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.6 9a7 7 0 0111.8-2L20 12M4 12l2.6 5a7 7 0 0011.8-2"
                  />
                </svg>
              </button>
            </div>

            {/* Available balance */}
            <section className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-muted)]">
                  موجودی قابل برداشت
                </span>
                <span className="text-[10px] rounded-full px-2.5 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)]">
                  کیف پول شما
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--primary)]">
                  {walletLoading
                    ? "..."
                    : formatPrice(wallet?.availableBalance ?? 0)}
                </strong>
                <span className="text-xs text-[var(--text-muted)]">تومان</span>
              </div>

              <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    موجودی کل
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {walletLoading
                      ? "..."
                      : formatPrice(wallet?.walletBalance ?? 0)}{" "}
                    <span className="text-[10px] font-normal text-[var(--text-muted)]">
                      تومان
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    موجودی رزروشده
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {walletLoading
                      ? "..."
                      : formatPrice(wallet?.reservedBalance ?? 0)}{" "}
                    <span className="text-[10px] font-normal text-[var(--text-muted)]">
                      تومان
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="بخش‌های کیف پول"
              className="grid grid-cols-3 gap-1 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1"
            >
              {(
                [
                  ["charge", "شارژ کیف پول"],
                  ["withdraw", "برداشت وجه"],
                  ["history", "تاریخچه"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => selectTab(tab)}
                  className={`min-h-10 rounded-lg px-2 text-[11px] sm:text-xs font-bold transition-colors ${
                    activeTab === tab
                      ? "bg-[var(--primary)] text-on-primary shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Feedback */}
            {successMessage && (
              <div
                role="status"
                className="rounded-card border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 p-3 text-xs leading-6 text-[var(--accent-green)]"
              >
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs leading-6 text-[var(--accent-red)]"
              >
                {errorMessage}
              </div>
            )}

            {/* Charge tab */}
            {activeTab === "charge" && (
              <section className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-bold">افزایش موجودی</h2>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
                    مبلغ موردنظر را انتخاب کنید یا مبلغ دلخواه خود را وارد کنید.
                    برای تکمیل پرداخت به درگاه بانکی منتقل می‌شوید.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((amount) => {
                    const isSelected =
                      selectedAmount === amount && !customAmount;

                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount("");
                          clearMessages();
                        }}
                        className={`min-h-12 rounded-card border px-2 text-xs font-bold transition-colors ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 text-[var(--text-white)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        {formatPrice(amount)} تومان
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="wallet-custom-amount"
                    className={labelClassName}
                  >
                    مبلغ دلخواه (تومان)
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="wallet-custom-amount"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={
                        customAmount
                          ? Number(customAmount).toLocaleString("en-US")
                          : ""
                      }
                      onChange={(event) => {
                        const raw = event.target.value.replace(/[^0-9]/g, "");

                        setCustomAmount(raw);
                        setSelectedAmount(raw ? Number(raw) : null);
                        clearMessages();
                      }}
                      placeholder="مثلاً 150,000"
                      className={`${inputClassName} pl-16 text-left`}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                      تومان
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                    حداقل مبلغ شارژ ۱٬۰۰۰ تومان است.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleChargeWallet}
                  disabled={charging || (!selectedAmount && !customAmount)}
                  className="mt-5 w-full min-h-12 rounded-card bg-[var(--primary)] text-on-primary text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {charging ? "در حال اتصال به درگاه..." : "ادامه و پرداخت"}
                </button>

                <div className="mt-4 flex items-start gap-2 text-[11px] leading-6 text-[var(--text-muted)]">
                  <svg
                    className="w-4 h-4 mt-1 shrink-0 text-[var(--primary)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 11v5m0-8h.01" />
                  </svg>
                  <p>
                    پس از پرداخت موفق و بازگشت از درگاه، وضعیت موجودی کیف پول از
                    سرویس سامانه دریافت می‌شود.
                  </p>
                </div>
              </section>
            )}

            {/* Withdraw tab */}
            {activeTab === "withdraw" && (
              <section className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-bold">درخواست برداشت وجه</h2>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
                    اطلاعات حساب بانکی و مبلغ موردنظر را وارد کنید.
                  </p>
                </div>

                <form
                  onSubmit={handleWithdrawSubmit}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label htmlFor="wallet-holder" className={labelClassName}>
                      نام و نام خانوادگی صاحب حساب *
                    </label>
                    <input
                      id="wallet-holder"
                      value={withdrawHolder}
                      onChange={(event) =>
                        setWithdrawHolder(event.target.value)
                      }
                      placeholder="مثلاً محمد رضایی"
                      className={`${inputClassName} mt-2`}
                    />
                  </div>

                  <div>
                    <label htmlFor="wallet-sheba" className={labelClassName}>
                      شماره شبا *
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="wallet-sheba"
                        value={withdrawSheba}
                        onChange={(event) =>
                          setWithdrawSheba(
                            event.target.value.replace(/[^0-9]/g, ""),
                          )
                        }
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={24}
                        placeholder="۲۴ رقم شماره شبا"
                        className={`${inputClassName} pl-14 text-left font-mono`}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                        IR
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                      شماره شبا را بدون IR وارد کنید.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="wallet-card-number"
                        className={labelClassName}
                      >
                        شماره کارت (اختیاری)
                      </label>
                      <input
                        id="wallet-card-number"
                        value={withdrawCardNumber}
                        onChange={(event) =>
                          setWithdrawCardNumber(
                            event.target.value.replace(/[^0-9]/g, ""),
                          )
                        }
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={16}
                        placeholder="شماره کارت"
                        className={`${inputClassName} mt-2 text-left font-mono`}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="wallet-bank-name"
                        className={labelClassName}
                      >
                        نام بانک (اختیاری)
                      </label>
                      <input
                        id="wallet-bank-name"
                        value={withdrawBankName}
                        onChange={(event) =>
                          setWithdrawBankName(event.target.value)
                        }
                        placeholder="مثلاً ملت"
                        className={`${inputClassName} mt-2`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="wallet-withdraw-amount"
                        className={labelClassName}
                      >
                        مبلغ برداشت (تومان) *
                      </label>

                      {!!wallet?.availableBalance && (
                        <button
                          type="button"
                          onClick={() =>
                            setWithdrawAmount(String(wallet.availableBalance))
                          }
                          className="text-[11px] font-bold text-[var(--primary)]"
                        >
                          استفاده از کل موجودی
                        </button>
                      )}
                    </div>

                    <input
                      id="wallet-withdraw-amount"
                      value={withdrawAmount}
                      onChange={(event) =>
                        setWithdrawAmount(
                          event.target.value.replace(/[^0-9,٬،\s]/g, ""),
                        )
                      }
                      inputMode="numeric"
                      placeholder="مبلغ موردنظر"
                      className={`${inputClassName} mt-2`}
                    />

                    <p className="mt-2 text-[10px] leading-5 text-[var(--text-muted)]">
                      در هر بازه ۲۴ ساعته، فقط یک درخواست برداشت قابل ثبت است.
                    </p>
                  </div>

                  {wallet?.canWithdrawIn24h === false && (
                    <p className="rounded-lg bg-[var(--accent-red)]/10 p-3 text-xs leading-6 text-[var(--accent-red)]">
                      در حال حاضر امکان ثبت درخواست برداشت جدید وجود ندارد.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      withdrawSubmitting || wallet?.canWithdrawIn24h === false
                    }
                    className="w-full min-h-12 rounded-card bg-[var(--primary)] text-on-primary text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {withdrawSubmitting
                      ? "در حال ثبت درخواست..."
                      : "ثبت درخواست برداشت"}
                  </button>
                </form>
              </section>
            )}

            {/* History tab */}
            {activeTab === "history" && (
              <section className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-bold">تاریخچه کیف پول</h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    آخرین درخواست‌های برداشت و تراکنش‌های شما
                  </p>
                </div>

                {historyLoading && (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-16 rounded-card bg-[var(--foreground)]/30" />
                    <div className="h-16 rounded-card bg-[var(--foreground)]/30" />
                    <div className="h-16 rounded-card bg-[var(--foreground)]/30" />
                  </div>
                )}

                {!historyLoading && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 text-xs font-bold">
                        درخواست‌های برداشت
                      </h3>

                      {withdrawals.length === 0 ? (
                        <p className="rounded-card bg-[var(--foreground)]/20 p-4 text-center text-xs text-[var(--text-muted)]">
                          هنوز درخواست برداشتی ثبت نکرده‌اید.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {withdrawals.map((item) => {
                            const status = STATUS_LABEL[item.status] || {
                              label: item.status,
                              className:
                                "text-[var(--text-muted)] bg-[var(--foreground)]/20 border-[var(--border-subtle)]",
                            };

                            return (
                              <article
                                key={item.id}
                                className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <strong className="text-sm">
                                    {formatPrice(item.amount)} تومان
                                  </strong>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                                  <span dir="ltr">
                                    {item.bankDetails?.sheba
                                      ? `IR${item.bankDetails.sheba.replace(/^IR/i, "")}`
                                      : "شماره شبا ثبت نشده"}
                                  </span>
                                  <span>{formatDate(item.createdAt)}</span>
                                </div>

                                {item.rejectionReason && (
                                  <p className="mt-2 text-xs leading-5 text-[var(--accent-red)]">
                                    علت رد درخواست: {item.rejectionReason}
                                  </p>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-3 text-xs font-bold">تراکنش‌ها</h3>

                      {transactions.length === 0 ? (
                        <p className="rounded-card bg-[var(--foreground)]/20 p-4 text-center text-xs text-[var(--text-muted)]">
                          هنوز تراکنشی ثبت نشده است.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {transactions.map((item) => (
                            <article
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold">
                                  {item.description || item.type}
                                </p>
                                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                                  {formatDate(item.createdAt)}
                                </p>
                              </div>

                              <strong className="shrink-0 text-xs">
                                {formatPrice(item.amount)} تومان
                              </strong>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={fetchWalletHistory}
                  disabled={historyLoading}
                  className="mt-5 w-full min-h-10 rounded-card border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-white)] disabled:opacity-50"
                >
                  {historyLoading ? "در حال دریافت..." : "به‌روزرسانی تاریخچه"}
                </button>
              </section>
            )}

            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 18-6-6 6-6"
                />
              </svg>
              بازگشت به حساب کاربری
            </Link>
          </div>
        )}
      </main>

      <BottomBar activeTab="profile" />
    </div>
  );
}
