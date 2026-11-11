"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { toPersianDigits } from "@/lib/format";
import { ownerService } from "@/services/ownerService";
import type { OwnerAdvertisement } from "@/types/owner";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

const inputClass =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--accent-red)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]";

export default function OwnerAdsPage() {
  const { center, centerId } = useOwner();
  const [ads, setAds] = useState<OwnerAdvertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // File upload state
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated destination URL for this gaming center
  const targetCenterId = centerId || center?.id || "";
  const centerSlug = center?.slug || center?.id || "";
  const autoDestinationUrl = centerSlug ? `/gamecenter/${centerSlug}` : "";

  const loadAds = useCallback(async () => {
    if (!targetCenterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await ownerService.listAdvertisements(targetCenterId);
      setAds(items);
    } catch {
      // Graceful fallback to empty
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [targetCenterId]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!targetCenterId) {
      setMsg({ ok: false, text: "شناسه گیم‌نت یافت نشد." });
      return;
    }

    // Client validation: Max 10MB image
    if (file.size > 10 * 1024 * 1024) {
      setMsg({ ok: false, text: "حجم تصویر بنر نباید بیشتر از ۱۰ مگابایت باشد." });
      return;
    }

    setIsUploadingBanner(true);
    setMsg(null);
    try {
      const result = await ownerService.uploadAdvertisementBanner(targetCenterId, file);
      setBannerUrl(result.url);
      setMsg({ ok: true, text: "بنر تبلیغاتی با موفقیت آپلود شد." });
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || "خطا در آپلود بنر تبلیغاتی.";
      setMsg({ ok: false, text: errorMsg });
    } finally {
      setIsUploadingBanner(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setMsg({ ok: false, text: "لطفاً عنوان تبلیغ را وارد کنید." });
      return;
    }
    if (!bannerUrl.trim()) {
      setMsg({ ok: false, text: "لطفاً تصویر یا بنر تبلیغاتی را آپلود کرده یا آدرس آن را وارد کنید." });
      return;
    }
    if (!targetCenterId) {
      setMsg({ ok: false, text: "شناسه گیم‌نت یافت نشد." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const proposedDays = parseInt(durationDays, 10) || 30;
      await ownerService.createAdvertisement(targetCenterId, {
        title: title.trim(),
        description: description.trim() || undefined,
        bannerUrl: bannerUrl.trim(),
        destinationUrl: autoDestinationUrl,
        proposedDurationDays: proposedDays,
      });

      setMsg({
        ok: true,
        text: "درخواست تبلیغات با موفقیت ارسال شد و پس از بررسی و تأیید ادمین در اسلایدر اصلی نمایش داده خواهد شد.",
      });
      setTitle("");
      setDescription("");
      setBannerUrl("");
      setDurationDays("30");
      setOpen(false);
      loadAds();
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || "خطا در ثبت درخواست تبلیغات.";
      setMsg({ ok: false, text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: OwnerAdvertisement["status"]) => {
    switch (status) {
      case "ACTIVE":
      case "APPROVED":
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-[var(--accent-green)]/20 text-[var(--accent-green)]">تأیید شده / فعال</span>;
      case "REJECTED":
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-[var(--accent-red)]/20 text-[var(--accent-red)]">رد شده</span>;
      case "EXPIRED":
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-[var(--foreground)] text-[var(--text-muted)]">منقضی شده</span>;
      case "PENDING":
      default:
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-[var(--accent-star)]/20 text-[var(--accent-star)]">در انتظار تایید</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="ایجاد تبلیغات" />

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-4">
        {/* Banner Info Box */}
        <div className="rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 p-4 flex flex-col gap-1 text-[var(--text-white)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
            <h2 className="text-sm font-bold text-[var(--accent-red)]">تبلیغات و دیده‌شدن بیشتر در صفحه اصلی</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
            با ایجاد تبلیغ برای گیم‌نت <span className="text-[var(--text-white)] font-bold">{center?.name ?? ""}</span>، بنر ارسالی شما پس از تأیید تیم مدیریت در اسلایدر اصلی سایت قرار گرفته و به صفحه اختصاصی گیم‌نت شما متصل خواهد شد.
          </p>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--accent-red)]/20 pt-2 flex items-center justify-between">
            <span>مقصد کلیک بنر به صورت خودکار:</span>
            <span className="font-mono text-[var(--primary)] dir-ltr">{autoDestinationUrl || "—"}</span>
          </div>
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
          onClick={() => {
            setMsg(null);
            setOpen(true);
          }}
          className="h-12 rounded-card bg-[var(--accent-red)] text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
        >
          <span>+</span>
          <span>ثبت درخواست تبلیغات جدید</span>
        </button>

        <h3 className="text-sm font-bold mt-2">درخواست‌های تبلیغاتی ثبت‌شده</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">در حال بارگذاری درخواست‌ها...</div>
        ) : ads.length === 0 ? (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">هنوز درخواستی برای تبلیغات ثبت نکرده‌اید.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            {ads.map((ad) => {
              const displayDays = ad.durationDays || ad.proposedDurationDays || 30;
              return (
                <div key={ad.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-3 justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold truncate">{ad.title}</h4>
                    {getStatusBadge(ad.status)}
                  </div>

                  {ad.bannerUrl && (
                    <div className="relative aspect-video rounded-card overflow-hidden bg-black/40 border border-[var(--border-subtle)]">
                      <SafeImage
                        src={ad.bannerUrl}
                        alt={ad.title}
                        fallbackSrc={PLACEHOLDERS.banner}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {ad.description && (
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{ad.description}</p>
                  )}

                  <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-subtle)]">
                    <div className="flex items-center justify-between">
                      <span>مدت درخواستی: {toPersianDigits(displayDays)} روز</span>
                      <span>تاریخ ثبت: {toPersianDigits(ad.createdAt?.slice(0, 10) || "—")}</span>
                    </div>
                    {ad.decisionReason && (
                      <div className="text-[11px] text-[var(--accent-star)] mt-1">
                        توضیحات ادمین: {ad.decisionReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal for creating ad */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !submitting && !isUploadingBanner && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-white)]">ثبت درخواست تبلیغات جدید</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <label className="text-xs font-bold text-[var(--text-white)]">
              عنوان تبلیغ <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="مثال: بنر جشنواره نوروزی - ۳۰٪ تخفیف رزرو"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label className="text-xs font-bold text-[var(--text-white)]">توضیحات یا پیام تبلیغاتی</label>
            <textarea
              rows={3}
              placeholder="توضیحات تکمیلی درباره کمپین و تخفیف‌ها..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--accent-red)] p-3 text-sm outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]"
            />

            {/* Banner Upload / URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-white)]">
                تصویر بنر تبلیغاتی <span className="text-[var(--accent-red)]">*</span>
              </label>
              <p className="text-[11px] text-[var(--text-muted)]">
                نسبت بهینه بنر اسلایدر: ۲ به ۱ (موبایل) و حدود ۳ به ۱ (دسکتاپ) با کیفیت مناسب
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingBanner || submitting}
                  className="h-10 px-4 rounded-card bg-[var(--foreground)]/60 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)] transition-colors disabled:opacity-50"
                >
                  {isUploadingBanner ? "در حال آپلود فایل..." : "بارگذاری فایل بنر"}
                </button>
                <span className="text-xs text-[var(--text-muted)]">یا وارد کردن آدرس مستقیم:</span>
              </div>

              <input
                className={inputClass}
                dir="ltr"
                placeholder="https://... یا پس از آپلود بنر"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                required
              />

              {bannerUrl && (
                <div className="relative aspect-[2.4/1] rounded-card overflow-hidden bg-black/40 border border-[var(--border-subtle)] mt-1 flex items-center justify-center">
                  <SafeImage
                    src={bannerUrl}
                    alt="پیش‌نمایش بنر"
                    fallbackSrc={PLACEHOLDERS.banner}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Auto Destination URL */}
            <label className="text-xs font-bold text-[var(--text-white)]">مقصد کلیک بنر (خودکار)</label>
            <input
              className={`${inputClass} opacity-80 cursor-not-allowed`}
              dir="ltr"
              value={autoDestinationUrl}
              readOnly
            />

            {/* Duration */}
            <label className="text-xs font-bold text-[var(--text-white)]">مدت زمان نمایش پیشنهادی (روز)</label>
            <select
              className={inputClass}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            >
              <option value="7">۷ روز (۱ هفته)</option>
              <option value="14">۱۴ روز (۲ هفته)</option>
              <option value="30">۳۰ روز (۱ ماه)</option>
              <option value="60">۶۰ روز (۲ ماه)</option>
              <option value="90">۹۰ روز (۳ ماه)</option>
            </select>

            <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="submit"
                disabled={submitting || isUploadingBanner}
                className="flex-1 h-11 rounded-card bg-[var(--accent-red)] text-white font-bold text-sm disabled:opacity-60 transition-opacity"
              >
                {submitting ? "در حال ارسال درخواست..." : "ارسال درخواست تبلیغات"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting || isUploadingBanner}
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
