"use client";

import React, { useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { toPersianDigits } from "@/lib/format";

interface DiscountCode {
  id: string;
  code: string;
  percentage: number;
  maxUsage?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

const INITIAL_DISCOUNTS: DiscountCode[] = [
  {
    id: "disc-1",
    code: "SUMMER20",
    percentage: 20,
    maxUsage: 50,
    usedCount: 12,
    isActive: true,
    createdAt: "۱۴۰۳/۱۲/۰۱",
  },
  {
    id: "disc-2",
    code: "VIPGamer",
    percentage: 15,
    maxUsage: 20,
    usedCount: 20,
    isActive: false,
    createdAt: "۱۴۰۳/۱۱/۱۵",
  },
];

const input =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]";

export default function OwnerDiscountsPage() {
  const { center } = useOwner();
  const [discounts, setDiscounts] = useState<DiscountCode[]>(INITIAL_DISCOUNTS);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [percentage, setPercentage] = useState("10");
  const [maxUsage, setMaxUsage] = useState("30");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setMsg({ ok: false, text: "لطفا کد تخفیف را وارد کنید." });
      return;
    }
    const perc = Number(percentage);
    if (isNaN(perc) || perc <= 0 || perc > 100) {
      setMsg({ ok: false, text: "درصد تخفیف معتبر نیست (۱ تا ۱۰۰)." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    setTimeout(() => {
      const newDiscount: DiscountCode = {
        id: `disc-${Date.now()}`,
        code: code.trim().toUpperCase(),
        percentage: perc,
        maxUsage: Number(maxUsage) || undefined,
        usedCount: 0,
        isActive: true,
        createdAt: "امروز",
      };
      setDiscounts([newDiscount, ...discounts]);
      setSubmitting(false);
      setOpen(false);
      setCode("");
      setPercentage("10");
      setMaxUsage("30");
      setMsg({ ok: true, text: "کد تخفیف جدید با موفقیت ایجاد شد." });
    }, 300);
  };

  const toggleStatus = (id: string) => {
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d))
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="ایجاد تخفیف" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[880px] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-4">
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-1">
          <h2 className="text-sm font-extrabold text-[var(--primary)]">تخفیف‌های گیمنت</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
            با ایجاد کد تخفیف اختصاصی برای <span className="text-[var(--text-white)] font-bold">{center?.name ?? ""}</span>، مشتریان شما می‌توانند در هنگام ثبت رزرو آنلاین از کد تخفیف استفاده کنند.
          </p>
        </div>

        {msg && (
          <div
            className={`p-3.5 rounded-card text-xs font-bold ${
              msg.ok
                ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
            }`}
          >
            {msg.text}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>ایجاد کد تخفیف جدید</span>
        </button>

        <h3 className="text-sm font-extrabold mt-2">لیست کدهای تخفیف</h3>

        {discounts.length === 0 ? (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">هنوز کد تخفیفی ثبت نکرده‌اید.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            {discounts.map((d) => (
              <div key={d.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-3 justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-black tracking-wider text-[var(--primary)] bg-[var(--foreground)]/50 px-3 py-1 rounded-card" dir="ltr">
                    {d.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-[var(--primary)]/20 text-[var(--primary)] px-2.5 py-1 rounded-full">
                      {toPersianDigits(d.percentage)}٪ تخفیف
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleStatus(d.id)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                        d.isActive
                          ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                          : "bg-[var(--foreground)] text-[var(--text-muted)]"
                      }`}
                    >
                      {d.isActive ? "فعال" : "غیرفعال"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2">
                  <span>
                    استفاده شده: {toPersianDigits(d.usedCount)} {d.maxUsage ? `/ ${toPersianDigits(d.maxUsage)}` : ""}
                  </span>
                  <span>تاریخ: {toPersianDigits(d.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal for creating discount */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[var(--text-white)]">ایجاد کد تخفیف</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] text-sm"
              >
                ✕
              </button>
            </div>

            <label className="text-xs font-bold text-[var(--text-white)]">عبارت کد تخفیف</label>
            <input
              className={input}
              dir="ltr"
              placeholder="مثال: GAMER20"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <label className="text-xs font-bold text-[var(--text-white)]">درصد تخفیف (٪)</label>
            <input
              className={input}
              type="number"
              min={1}
              max={100}
              placeholder="10"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />

            <label className="text-xs font-bold text-[var(--text-white)]">حداکثر تعداد استفاده (اختیاری)</label>
            <input
              className={input}
              type="number"
              min={1}
              placeholder="30"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm disabled:opacity-60"
              >
                {submitting ? "در حال ایجاد..." : "ثبت و فعال‌سازی"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
