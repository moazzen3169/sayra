"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOwner } from "@/context/OwnerContext";
import { OwnerHeader } from "@/components/owner/OwnerHeader";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService, pickNumber } from "@/services/ownerService";
import type { MediaItem } from "@/types/owner";

const Icon = ({ d }: { d: string }) => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  edit: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M11 5.882a3 3 0 00-3-3H5a2 2 0 00-2 2v6a2 2 0 002 2h3a3 3 0 003-3",
  tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  support: "M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1v-4zm16 0h-3v5h2a1 1 0 001-1v-4zM17 19c0 1.5-2 2-5 2",
};

const TILES: { href: string; label: string; icon: string; badge?: "pending" }[] = [
  { href: "/owner/reservations", label: "رزروها", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z", badge: "pending" },
  { href: "/owner/withdraw", label: "برداشت موجودی", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { href: "/owner/stations", label: "دستگاه‌ها", icon: "M15 5M9 9h6M12 6v6M6 15h.01M18 15h.01M15 18h.01M9 18h.01" },
  { href: "/owner/reviews", label: "نظرات", icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
];

const MENU = [
  { href: "/owner/edit", label: "ویرایش گیمنت", icon: ICONS.edit },
  { href: "/owner/hours", label: "ساعات کاری و تعطیلات", icon: ICONS.clock },
  { href: "/owner/ads", label: "ایجاد تبلیغات", icon: ICONS.megaphone },
  { href: "/owner/discounts", label: "ایجاد تخفیف", icon: ICONS.tag },
  { href: "/owner/support", label: "پشتیبانی", icon: ICONS.support },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const {
    centerId,
    center,
    ownerName,
    verificationStatus,
    verificationData,
    submitVerification,
    setVerificationStatus,
  } = useOwner();

  const [query, setQuery] = useState("");

  // Verification Form State
  const [vOwnerName, setVOwnerName] = useState(verificationData?.ownerName || "");
  const [vNationalId, setVNationalId] = useState(verificationData?.nationalId || "");
  const [vCenterName, setVCenterName] = useState(verificationData?.centerName || "");
  const [vCenterAddress, setVCenterAddress] = useState(verificationData?.centerAddress || "");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vError, setVError] = useState<string | null>(null);

  const licenseInputRef = useRef<HTMLInputElement>(null);

  const isApproved = verificationStatus === "APPROVED";
  const [withdrawable, setWithdrawable] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [mediaToken, setMediaToken] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // درآمد + تعداد رزروهای در انتظار
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      ownerService.getAnalyticsSummary(centerId),
      ownerService.listReservations(centerId),
    ]).then(([summary, reservations]) => {
      if (!active) return;
      if (summary.status === "fulfilled") {
        setWithdrawable(
          pickNumber(summary.value, ["withdrawableAmount", "withdrawableRevenue", "netRevenue", "totalRevenue", "revenue"])
        );
      }
      if (reservations.status === "fulfilled") {
        setPendingCount(reservations.value.filter((r) => r.status === "PENDING").length);
      }
    });
    return () => {
      active = false;
    };
  }, [centerId]);

  // گالری
  useEffect(() => {
    if (!center?.slug) return;
    let active = true;
    ownerService
      .listMedia(center.slug)
      .then((items) => active && setMedia(items))
      .catch(() => active && setMedia([]));
    return () => {
      active = false;
    };
  }, [center?.slug, mediaToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApproved) return;
    const q = query.trim();
    router.push(q ? `/owner/reservations?q=${encodeURIComponent(q)}` : "/owner/reservations");
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vOwnerName.trim() || !vNationalId.trim() || !vCenterName.trim() || !vCenterAddress.trim()) {
      setVError("لطفاً تمامی اطلاعات خواسته شده را وارد کنید.");
      return;
    }
    if (!licenseFile && !verificationData?.licenseFileName) {
      setVError("لطفاً تصویر پروانه کسب را آپلود کنید.");
      return;
    }
    setVError(null);
    submitVerification({
      ownerName: vOwnerName.trim(),
      nationalId: vNationalId.trim(),
      centerName: vCenterName.trim(),
      centerAddress: vCenterAddress.trim(),
      licenseFileName: licenseFile?.name || verificationData?.licenseFileName,
    });
  };

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || uploading) return;
      setUploading(true);
      setGalleryError(null);
      try {
        await ownerService.uploadGalleryImage(centerId, file);
        setMediaToken((v) => v + 1);
      } catch (err) {
        setGalleryError(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
    },
    [centerId, uploading]
  );

  // تعداد کاشی‌های «+» تا ردیف ۴تایی کامل شود (حداقل یک کاشی)
  const addTiles = Math.max(1, Math.ceil((media.length + 1) / 4) * 4 - media.length);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerHeader title="پنل مدیریت" isSubpage={false} />

      <main className="flex-1 px-4 pt-20 flex flex-col gap-5 w-full max-w-[var(--max-profile-width)] mx-auto lg:px-0">

        {/* Verification Form / Notice section if not approved */}
        {!isApproved && (
          <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col gap-4">
            {verificationStatus === "NOT_SUBMITTED" && (
              <>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-bold text-[var(--text-white)]">احراز هویت صاحب گیمنت</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    برای دسترسی به سایر بخش‌ها و فعال‌سازی پنل مدیریت، اطلاعات و مدرک شغلی خود را ثبت کنید.
                  </p>
                </div>

                {vError && (
                  <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                    {vError}
                  </div>
                )}

                <form onSubmit={handleVerificationSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[var(--text-muted)]">نام و نام خانوادگی صاحب گیمنت</label>
                    <input
                      value={vOwnerName}
                      onChange={(e) => setVOwnerName(e.target.value)}
                      placeholder="مثلا: علی محمدی"
                      className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[var(--text-muted)]">کد ملی</label>
                    <input
                      value={vNationalId}
                      onChange={(e) => setVNationalId(e.target.value)}
                      placeholder="کد ۱۰ رقمی ملی"
                      className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[var(--text-muted)]">نام گیمنت</label>
                    <input
                      value={vCenterName}
                      onChange={(e) => setVCenterName(e.target.value)}
                      placeholder="مثلا: گیمنت گرگدن"
                      className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[var(--text-muted)]">آدرس گیمنت</label>
                    <textarea
                      value={vCenterAddress}
                      onChange={(e) => setVCenterAddress(e.target.value)}
                      placeholder="آدرس دقیق مجموعه"
                      rows={2}
                      className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[var(--text-muted)]">عکس پروانه کسب</label>
                    <div
                      onClick={() => licenseInputRef.current?.click()}
                      className="h-20 rounded-card border-2 border-dashed border-[var(--border-subtle)] bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/30 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-xs font-bold text-[var(--primary)]">
                        {licenseFile ? licenseFile.name : "انتخاب یا آپلود عکس پروانه کسب"}
                      </span>
                    </div>
                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 h-12 rounded-card bg-[var(--primary)] text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    ارسال جهت بررسی و احراز هویت
                  </button>
                </form>
              </>
            )}

            {verificationStatus === "PENDING" && (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/30 flex items-center justify-center text-[var(--accent-warning)] text-2xl">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h45m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-[var(--text-white)]">اطلاعات شما در صف انتظار بررسی است</h2>
                <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
                  مدارک و اطلاعات احراز هویت شما ارسال شده و توسط پشتیبانی در حال بررسی است. پس از تأیید، دسترسی شما به تمام بخش‌های پنل فعال خواهد شد.
                </p>
              </div>
            )}

            {verificationStatus === "REJECTED" && (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex items-center justify-center text-[var(--accent-red)] text-2xl">
                  ⚠️
                </div>
                <h2 className="text-base font-bold text-[var(--text-white)]">احراز هویت شما تایید نشد</h2>
                <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
                  اطلاعات یا پروانه کسب ارسال شده مورد تایید قرار نگرفت. لطفاً مجدداً اطلاعات صحیح را وارد کرده و تصویر خوانا ارسال کنید.
                </p>
                <button
                  type="button"
                  onClick={() => setVerificationStatus("NOT_SUBMITTED")}
                  className="mt-2 h-10 px-5 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold"
                >
                  ویرایش و تلاش مجدد
                </button>
              </div>
            )}
          </div>
        )}

        {/* Locked Content Overlay / Container when not approved */}
        <div className={!isApproved ? "pointer-events-none opacity-40 flex flex-col select-none" : "flex flex-col gap-5"}>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کد رزرو مشتری"
            className="w-full h-12 rounded-card bg-[var(--foreground)]/60 px-4 pl-11 text-sm text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <button type="submit" aria-label="جستجو" className="absolute left-3 top-3 text-[var(--text-muted)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </form>

        {/* Earnings card */}
        <Link
          href="/owner/withdraw"
          className="relative overflow-hidden rounded-card bg-[var(--primary)] text-on-primary p-4 min-h-[178px] flex flex-col justify-between"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background:
                "radial-gradient(circle at 50% 100%, transparent 0 22%, rgba(255,255,255,.55) 22% 23%, transparent 23% 38%, rgba(255,255,255,.4) 38% 39%, transparent 39% 56%, rgba(255,255,255,.3) 56% 57%, transparent 57%)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <img src="/design/sayra.svg" alt="سایرا" className="h-7 w-auto brightness-0" />
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
              <path d="M8.5 12l2.5 2.5 4.5-5" />
            </svg>
          </div>

          <div className="relative flex flex-col gap-1">
            <span className="text-xs opacity-80">درآمد قابل برداشت</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black">
                {withdrawable === null ? "—" : formatPrice(withdrawable)}
              </span>
              <span className="text-lg font-black">تومان</span>
            </div>
            <span className="text-xs opacity-80 mt-1">
              {ownerName} / {center?.name ?? "گیمنت"}
            </span>
          </div>
        </Link>

        {/* Quick tiles */}
        <div className="grid grid-cols-4 gap-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="flex flex-col items-center gap-2">
              <span className="relative w-full aspect-square rounded-card bg-[var(--foreground)]/70 flex items-center justify-center text-[var(--primary)]">
                <Icon d={t.icon} />
                {t.badge === "pending" && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full bg-[var(--primary)] text-on-primary text-xs font-bold flex items-center justify-center">
                    {toPersianDigits(pendingCount)}
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--text-white)] text-center leading-tight">{t.label}</span>
            </Link>
          ))}
        </div>

        {/* Menu */}
        <div className="rounded-card bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)]">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="flex items-center gap-3 px-5 h-16 hover:bg-[var(--foreground)]/20 transition-colors">
              <span className="text-[var(--text-white)]">
                <Icon d={m.icon} />
              </span>
              <span className="text-sm font-bold text-[var(--text-white)]">{m.label}</span>
            </Link>
          ))}
        </div>

        {/* Gallery */}
        <section className="flex flex-col gap-3 mt-3">
          <h2 className="text-xs text-[var(--text-white)]">گالری تصاویر شما</h2>

          {galleryError && (
            <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
              {galleryError}
            </div>
          )}

          <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
            {media.map((m, i) => (
              <div key={m.id ?? `${m.url}-${i}`} className="relative aspect-square rounded-card overflow-hidden bg-[var(--foreground)]">
                <img src={m.url} alt={m.altText ?? "تصویر گیمنت"} className="w-full h-full object-cover" />
              </div>
            ))}

            {Array.from({ length: addTiles }).map((_, i) => (
              <button
                key={`add-${i}`}
                type="button"
                disabled={uploading || !isApproved}
                onClick={() => fileRef.current?.click()}
                aria-label="افزودن تصویر"
                className="aspect-square rounded-card bg-[var(--bg-card)] flex items-center justify-center disabled:opacity-50"
              >
                <span className="w-[70%] h-[70%] rounded-md border-2 border-dashed border-[var(--text-subtle)] flex items-center justify-center text-[var(--text-muted)] text-3xl">
                  {uploading && i === 0 ? (
                    <span className="w-5 h-5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                  ) : (
                    "+"
                  )}
                </span>
              </button>
            ))}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </section>
        </div>
      </main>

    </div>
  );
}