"use client";

import React, { useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { toPersianDigits } from "@/lib/format";

interface AdCampaign {
  id: string;
  title: string;
  description: string;
  bannerUrl?: string;
  status: "ACTIVE" | "PENDING" | "EXPIRED";
  daysLeft: number;
  createdAt: string;
}

const input =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--accent-red)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]";

export default function OwnerAdsPage() {
  const { center } = useOwner();
  const [ads] = useState<AdCampaign[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setMsg({ ok: false, text: "لطفا عنوان و توضیحات تبلیغ را وارد کنید." });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    // Contract gap: OpenAPI v1.0-LOCKED does not provide owner ad campaign endpoints.
    // Explicitly reject false simulation and display contract gap notice.
    setSubmitting(false);
    setMsg({
      ok: false,
      text: "سرویس ثبت و مدیریت تبلیغات نیازمند پیاده‌سازی وب‌سرویس اختصاصی در بک‌اند است (مستند شده در docs/OWNER_ADS_API_CONTRACT.md).",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="ایجاد تبلیغات" />

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-4">
        <div className="rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 p-4 flex flex-col gap-1 text-[var(--text-white)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
            <h2 className="text-sm font-bold text-[var(--accent-red)]">تبلیغات و دیده‌شدن بیشتر</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
            با ایجاد تبلیغ برای گیمنت <span className="text-[var(--text-white)] font-bold">{center?.name ?? ""}</span>، بنر گیمنت شما در جایگاه‌های ویژه برنامه سایرا نمایش داده خواهد شد.
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
          className="h-12 rounded-card bg-[var(--accent-red)] text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>ایجاد کمپین تبلیغاتی جدید</span>
        </button>

        <h3 className="text-sm font-bold mt-2">کمپین‌های فعال و قبلی</h3>

        {ads.length === 0 ? (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">هنوز کمپین تبلیغاتی ثبت نکرده‌اید.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            {ads.map((ad) => (
              <div key={ad.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-2 justify-between">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold truncate">{ad.title}</h4>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      ad.status === "ACTIVE"
                        ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                        : ad.status === "PENDING"
                        ? "bg-[var(--accent-star)]/20 text-[var(--accent-star)]"
                        : "bg-[var(--foreground)] text-[var(--text-muted)]"
                    }`}
                  >
                    {ad.status === "ACTIVE" ? "فعال" : ad.status === "PENDING" ? "در انتظار تایید" : "منقضی شده"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{ad.description}</p>
                <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] border-t border-[var(--border-subtle)] pt-2 mt-1">
                  <span>تاریخ: {toPersianDigits(ad.createdAt)}</span>
                  <span>اعتبار: {toPersianDigits(ad.daysLeft)} روز</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal for creating ad */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-white)]">ایجاد کمپین تبلیغاتی</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] text-sm"
              >
                ✕
              </button>
            </div>

            <label className="text-xs font-bold text-[var(--text-white)]">عنوان تبلیغ</label>
            <input
              className={input}
              placeholder="مثال: بنر بنفش صفحه اول - تخفیف رزرو گروهی"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label className="text-xs font-bold text-[var(--text-white)]">توضیحات یا پیام بنر</label>
            <textarea
              rows={3}
              placeholder="توضیحات کامل برای نمایش در بنر تبلیغاتی..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--accent-red)] p-3 text-sm outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]"
            />

            <label className="text-xs font-bold text-[var(--text-white)]">لینک تصویر بنر (اختیاری)</label>
            <input
              className={input}
              dir="ltr"
              placeholder="https://..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
            />

            <label className="text-xs font-bold text-[var(--text-white)]">مدت زمان نمایش (روز)</label>
            <select className={input} value={durationDays} onChange={(e) => setDurationDays(e.target.value)}>
              <option value="3">۳ روز</option>
              <option value="7">۷ روز (۱ هفته)</option>
              <option value="14">۱۴ روز (۲ هفته)</option>
              <option value="30">۳۰ روز (۱ ماه)</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-card bg-[var(--accent-red)] text-white font-bold text-sm disabled:opacity-60"
              >
                {submitting ? "در حال ارسال..." : "ثبت و ارسال تبلیغ"}
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
