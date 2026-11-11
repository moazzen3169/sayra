"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService, pickNumber } from "@/services/ownerService";
import { walletService } from "@/services/walletService";
import type { Earning } from "@/types/owner";
import type { WithdrawalRequest, CustomerWallet } from "@/types/wallet";

const STATUS_LABEL: Record<Earning["status"], string> = {
  PENDING: "در انتظار",
  ACCRUED: "محاسبه‌شده",
  CHARGED: "تسویه‌شده",
  WAIVED: "بخشوده",
  REFUNDED: "بازگشت‌شده",
};

const WITHDRAW_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "در انتظار بررسی", color: "text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/30" },
  APPROVED: { label: "تأیید شده", color: "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30" },
  PROCESSING: { label: "در حال انتقال", color: "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30" },
  PAID: { label: "پرداخت موفق", color: "text-[var(--accent-green)] bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30" },
  REJECTED: { label: "رد شده", color: "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30" },
  FAILED: { label: "خطای انتقال", color: "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30" },
  CANCELLED: { label: "لغو شده", color: "text-[var(--text-muted)] bg-[var(--foreground)]/30 border-[var(--border-subtle)]" },
};

export default function OwnerWithdrawPage() {
  const { centerId } = useOwner();
  const [amount, setAmount] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<Earning[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // فرم برداشت
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanHolder = accountHolder.trim();
    const cleanIban = iban.trim().toUpperCase().replace(/^IR/i, "").replace(/[^0-9]/g, "");
    const parsedAmt = Number(withdrawAmount.replace(/[,٬،\s]/g, ""));

    if (!cleanHolder) {
      setFormError("لطفاً نام و نام خانوادگی صاحب حساب را وارد کنید.");
      return;
    }
    if (cleanIban.length !== 24) {
      setFormError("شماره شبا باید دقیقا ۲۴ رقم عددی باشد.");
      return;
    }
    if (!parsedAmt || isNaN(parsedAmt) || parsedAmt <= 0) {
      setFormError("لطفاً مبلغ معتبری برای برداشت وارد کنید.");
      return;
    }
    if (amount !== null && parsedAmt > amount) {
      setFormError("مبلغ درخواستی بیشتر از موجودی قابل برداشت شما است.");
      return;
    }

    if (wallet?.lastWithdrawalRequestAt) {
      const lastTime = new Date(wallet.lastWithdrawalRequestAt).getTime();
      const now = Date.now();
      if (now < lastTime + 24 * 60 * 60 * 1000) {
        setFormError("هر کاربر در هر ۲۴ ساعت صرفاً مجاز به ثبت یک درخواست برداشت است.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. اول از وب‌سرویس جدید درخواست برداشت مشتری/مدیر استفاده می‌شود
      try {
        await walletService.requestWithdrawal(
          {
            amount: parsedAmt,
            bankDetails: {
              sheba: cleanIban,
              accountHolderName: cleanHolder,
              cardNumber: cardNumber.trim() || undefined,
              bankName: bankName.trim() || undefined,
            },
          },
          wallet || undefined
        );
      } catch (custWalletErr) {
        // در صورتی که مرکز سنتر محور بود، متد ownerService نیز فراخوانی می‌شود
        if (centerId) {
          try {
            await ownerService.requestWithdrawal({
              centerId,
              amount: parsedAmt,
              accountHolder: cleanHolder,
              iban: `IR${cleanIban}`,
            });
          } catch {
            throw custWalletErr;
          }
        } else {
          throw custWalletErr;
        }
      }

      setFormSuccess("درخواست برداشت وجه با موفقیت ثبت شد و در صف بررسی مالی قرار گرفت.");
      setWithdrawAmount("");
      // تازه سازی تاریخچه
      walletService.getWithdrawals({ page: 1, pageSize: 20 }).then((res) => {
        setRecentWithdrawals(res.items);
      }).catch(() => {});
      walletService.getWallet().then(setWallet).catch(() => {});
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;
    setError(null);
    setHistoryLoading(true);

    // دریافت تاریخچه برداشت‌ها و اطلاعات کیف پول
    Promise.allSettled([
      walletService.getWallet(),
      walletService.getWithdrawals({ page: 1, pageSize: 20 }),
    ]).then(([wRes, histRes]) => {
      if (!active) return;
      if (wRes.status === "fulfilled") {
        setWallet(wRes.value);
      }
      if (histRes.status === "fulfilled") {
        setRecentWithdrawals(histRes.value.items);
      }
      setHistoryLoading(false);
    });

    if (!centerId) {
      setAmount(null);
      setEarnings([]);
      return () => {
        active = false;
      };
    }

    Promise.allSettled([
      ownerService.getAnalyticsSummary(centerId),
      ownerService.listCommissionsPaginated(centerId, { page: 1, pageSize: 50 }),
    ]).then(([s, c]) => {
      if (!active) return;
      if (s.status === "fulfilled") {
        const val = s.value;
        const resolvedAmount = pickNumber(val, [
          "withdrawableAmount",
          "withdrawableRevenue",
          "netRevenue",
          "totalRevenue",
          "revenue",
          "totalIncome",
        ]);
        setAmount(resolvedAmount);
      } else {
        setError(getErrorMessage(s.reason));
      }

      if (c.status === "fulfilled") {
        setEarnings(c.value.items);
      } else {
        setEarnings([]);
        setError((prev) => prev || getErrorMessage(c.reason));
      }
    });

    return () => {
      active = false;
    };
  }, [centerId]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="برداشت موجودی" />

      <main className="flex-1 mt-16 px-4 py-4 flex flex-col gap-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
        <div className="rounded-card bg-[var(--primary)] text-on-primary p-5 flex flex-col gap-1">
          <span className="text-xs opacity-80">درآمد قابل برداشت</span>
          <span className="text-3xl font-black">{amount === null ? "—" : `${formatPrice(amount)} تومان`}</span>
        </div>

        {error && <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>}

        {/* فرم ثبت درخواست برداشت وجه */}
        <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-white)]">درخواست تسویه و برداشت وجه</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                اطلاعات حساب بانکی و مبلغ درخواستی خود را جهت واریز وارد نمایید.
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-bold leading-relaxed">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label htmlFor="w-holder-name" className="text-xs font-bold text-[var(--text-muted)]">
                نام و نام خانوادگی صاحب حساب
              </label>
              <input
                id="w-holder-name"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="مثال: علیرضا رضایی"
                className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="w-iban" className="text-xs font-bold text-[var(--text-muted)]">
                شماره شبا (IBAN) بدون IR <span className="text-[var(--accent-red)]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono font-bold text-[var(--text-muted)] select-none">
                  IR
                </span>
                <input
                  id="w-iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={24}
                  placeholder="000000000000000000000000"
                  className="w-full h-11 px-3.5 pl-10 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] font-mono outline-none text-left"
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                شماره شبا باید به نام صاحب گیم‌نت یا نماینده قانونی تایید شده باشد.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="w-card" className="text-xs font-bold text-[var(--text-muted)]">
                  شماره کارت (اختیاری)
                </label>
                <input
                  id="w-card"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  dir="ltr"
                  maxLength={16}
                  placeholder="۶۰۳۷..."
                  className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] font-mono outline-none text-left"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="w-bank" className="text-xs font-bold text-[var(--text-muted)]">
                  نام بانک (اختیاری)
                </label>
                <input
                  id="w-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثلاً: ملت"
                  className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="w-amount" className="text-xs font-bold text-[var(--text-muted)]">
                  مبلغ درخواستی برای برداشت (تومان)
                </label>
                {amount !== null && (
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(amount))}
                    className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                  >
                    کل موجودی قابل برداشت
                  </button>
                )}
              </div>
              <input
                id="w-amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً: ۵۰۰۰۰۰"
                className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || (wallet?.canWithdrawIn24h === false)}
              className="mt-1 h-11 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs shadow-md disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {submitting ? "در حال ارسال درخواست..." : "ثبت درخواست برداشت وجه"}
            </button>
          </form>
        </section>

        {/* لیست درخواست‌های برداشت اخیر */}
        <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col gap-3 shadow-sm">
          <h2 className="text-sm font-bold text-[var(--text-white)]">درخواست‌های تسویه اخیر</h2>
          {historyLoading && <div className="h-16 rounded-card bg-[var(--foreground)]/30 animate-pulse" />}
          {!historyLoading && recentWithdrawals.length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--text-muted)]">هیچ درخواست برداشتی ثبت نشده است.</p>
          )}
          {!historyLoading && recentWithdrawals.length > 0 && (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {recentWithdrawals.map((w) => {
                const st = WITHDRAW_STATUS_LABEL[w.status] || { label: w.status, color: "text-[var(--text-muted)]" };
                return (
                  <div key={w.id} className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[var(--text-white)]">{formatPrice(w.amount)} تومان</span>
                      <span className="text-[10px] text-[var(--text-muted)] dir-ltr text-right">{w.bankDetails?.sheba || "IR..."}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <h2 className="text-sm font-bold mt-2">کمیسیون‌های رزرو</h2>
        {earnings === null && <div className="h-20 rounded-card bg-[var(--bg-card)] animate-pulse" />}
        {earnings && earnings.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--text-muted)]">موردی ثبت نشده است.</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {earnings?.map((e) => (
            <div key={e.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">{STATUS_LABEL[e.status] ?? e.status}</span>
              <span className="font-black">{formatPrice(e.commissionAmount)} {e.currency ?? "تومان"}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}