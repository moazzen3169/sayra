"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOwner } from "@/context/OwnerContext";
import { OwnerHeader } from "@/components/owner/OwnerHeader";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { BannerSlider } from "@/components/BannerSlider";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type { MediaItem } from "@/types/owner";

const TileIcon = ({ d }: { d: string }) => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

const verificationInput =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const {
    me,
    centerId,
    center,
    centers,
    isCenterLoading,
    centerError,
    ownerName,
    verificationStatus,
    verificationData,
    submitVerification,
    setVerificationStatus,
  } = useOwner();

  // اگر احراز هویت شده ولی هیچ گیم‌نتی وجود ندارد، به ساخت گیم‌نت هدایت کن
  useEffect(() => {
    if (!isCenterLoading && centers.length === 0 && !centerId && !me?.gamingCenterId) {
      let storedCenterId: string | null = null;
      try {
        storedCenterId = localStorage.getItem("sayra_owner_center_id");
      } catch {
        storedCenterId = null;
      }

      if (!storedCenterId) {
        router.push("/owner/new");
      }
    }
  }, [isCenterLoading, centers.length, centerId, me?.gamingCenterId, router]);

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
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Gallery state
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mediaToken, setMediaToken] = useState(0);
  const [deleteConfirmMedia, setDeleteConfirmMedia] = useState<MediaItem | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // واکشی داده‌های زنده: درآمد، تعداد رزروهای در انتظار و تصاویر گالری
  useEffect(() => {
    if (!centerId) {
      setWithdrawable(null);
      setPendingCount(0);
      return;
    }
    let active = true;
    setDashboardError(null);

    const targetSlug = center?.slug || centerId;

    Promise.allSettled([
      ownerService.getAnalyticsSummary(centerId),
      ownerService.listReservations(centerId),
      ownerService.listMedia(targetSlug),
    ]).then(([summaryRes, reservationsRes, mediaRes]) => {
      if (!active) return;

      if (summaryRes.status === "fulfilled") {
        const data = summaryRes.value;
        if (typeof data?.withdrawableAmount === "number") {
          setWithdrawable(data.withdrawableAmount);
        } else if (typeof data?.withdrawableRevenue === "number") {
          setWithdrawable(data.withdrawableRevenue);
        } else if (typeof data?.netRevenue === "number") {
          setWithdrawable(data.netRevenue);
        } else if (typeof data?.totalRevenue === "number") {
          setWithdrawable(data.totalRevenue);
        } else {
          setWithdrawable(null);
        }
      } else {
        setDashboardError(getErrorMessage(summaryRes.reason));
      }

      if (reservationsRes.status === "fulfilled") {
        const resList = Array.isArray(reservationsRes.value) ? reservationsRes.value : [];
        setPendingCount(resList.filter((r) => r?.status === "PENDING").length);
      } else {
        setDashboardError((prev) => prev || getErrorMessage(reservationsRes.reason));
      }

      if (mediaRes.status === "fulfilled") {
        setMedia(Array.isArray(mediaRes.value) ? mediaRes.value : []);
      }
    });

    return () => {
      active = false;
    };
  }, [centerId, center?.slug, mediaToken]);

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

  // آپلود عکس به همراه پیش‌نمایش آنی (Optimistic Preview)
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || uploading || !centerId) return;

      const localPreviewUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}`;
      const tempItem: MediaItem = {
        id: tempId,
        url: localPreviewUrl,
        altText: file.name,
        purpose: "GALLERY",
      };

      setMedia((prev) => [tempItem, ...prev]);
      setUploading(true);
      setGalleryMsg(null);

      try {
        const uploaded = await ownerService.uploadGalleryImage(centerId, file, {
          altText: file.name,
          purpose: "GALLERY",
        });

        setMedia((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...uploaded, url: uploaded.url || localPreviewUrl }
              : m
          )
        );
        setGalleryMsg({ ok: true, text: "تصویر به گالری اضافه شد." });
        setMediaToken((v) => v + 1);
      } catch (err) {
        setMedia((prev) => prev.filter((m) => m.id !== tempId));
        URL.revokeObjectURL(localPreviewUrl);
        setGalleryMsg({ ok: false, text: getErrorMessage(err) });
      } finally {
        setUploading(false);
      }
    },
    [centerId, uploading]
  );

  const galleryItems = React.useMemo(
    () => media.filter((m) => m.purpose !== "LOGO" && Boolean(m.url)),
    [media]
  );

  const galleryBanners = React.useMemo(
    () =>
      galleryItems.map((m, idx) => ({
        id: m.id || `owner-gallery-${idx}`,
        imageUrl: m.url,
        alt: m.altText || "تصویر گالری گیمنت",
      })),
    [galleryItems]
  );

  const logoMedia = React.useMemo(
    () => media.find((m) => m.purpose === "LOGO" || m.purpose === "COVER"),
    [media]
  );

  if (isCenterLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
        <OwnerHeader title="پنل مدیریت" isSubpage={false} />
        <main className="flex-1 px-4 pt-20 flex flex-col gap-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
          <div className="h-12 rounded-card bg-[var(--bg-card)] animate-pulse" />
          <div className="h-44 rounded-card bg-[var(--bg-card)] animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square rounded-card bg-[var(--bg-card)] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerHeader title="پنل مدیریت" isSubpage={false} />

      <main className="flex-1 px-4 pt-20 flex flex-col gap-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
        {centerError && (
          <div className="p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--accent-red)] text-xs font-bold leading-relaxed">
            {centerError}
          </div>
        )}

        {dashboardError && !centerError && (
          <div className="p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed">
            {dashboardError}
          </div>
        )}

        {/* گیمنت کاربر (هر مدیر یک گیمنت دارد) */}
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {logoMedia?.url ? (
              <SafeImage
                src={logoMedia.url}
                alt={center?.name || "لوگو"}
                fallbackSrc={PLACEHOLDERS.avatar}
                className="w-8 h-8 rounded-full object-cover border border-[var(--border-subtle)] shrink-0"
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" aria-hidden="true" />
            )}
            <span className="text-sm font-bold text-[var(--text-white)] truncate">
              {center?.name || "مرکز بازی"}
            </span>
          </div>

          <Link
            href="/owner/edit"
            className="flex h-11 items-center px-3 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--primary)] hover:border-[var(--primary)] active:scale-95 transition-all shrink-0"
          >
            ویرایش گیم‌نت
          </Link>
        </div>

        {/* احراز هویت اگر تأیید نشده */}
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
                  <div role="alert" className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                    {vError}
                  </div>
                )}

                <form onSubmit={handleVerificationSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="v-owner-name" className="text-xs font-bold text-[var(--text-muted)]">نام و نام خانوادگی صاحب گیمنت</label>
                    <input
                      id="v-owner-name"
                      value={vOwnerName}
                      onChange={(e) => setVOwnerName(e.target.value)}
                      placeholder="مثلا: علی محمدی"
                      className={verificationInput}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="v-national-id" className="text-xs font-bold text-[var(--text-muted)]">کد ملی</label>
                    <input
                      id="v-national-id"
                      value={vNationalId}
                      onChange={(e) => setVNationalId(e.target.value)}
                      inputMode="numeric"
                      placeholder="کد ۱۰ رقمی ملی"
                      className={verificationInput}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="v-center-name" className="text-xs font-bold text-[var(--text-muted)]">نام گیمنت</label>
                    <input
                      id="v-center-name"
                      value={vCenterName}
                      onChange={(e) => setVCenterName(e.target.value)}
                      placeholder="مثلا: گیمنت گرگدن"
                      className={verificationInput}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="v-center-address" className="text-xs font-bold text-[var(--text-muted)]">آدرس گیمنت</label>
                    <textarea
                      id="v-center-address"
                      value={vCenterAddress}
                      onChange={(e) => setVCenterAddress(e.target.value)}
                      placeholder="آدرس دقیق مجموعه"
                      rows={2}
                      className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[var(--text-muted)]">عکس پروانه کسب</span>
                    <button
                      type="button"
                      onClick={() => licenseInputRef.current?.click()}
                      className="h-20 w-full rounded-card border-2 border-dashed border-[var(--border-subtle)] bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/30 transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <Icon name="upload" size={24} className="text-[var(--text-muted)]" />
                      <span className="text-xs font-bold text-[var(--primary)]">
                        {licenseFile ? licenseFile.name : "انتخاب یا آپلود عکس پروانه کسب"}
                      </span>
                    </button>
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
                    className="mt-2 h-12 rounded-card bg-[var(--primary)] text-on-primary text-sm font-bold hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    ارسال جهت بررسی و احراز هویت
                  </button>
                </form>
              </>
            )}

            {verificationStatus === "PENDING" && (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/30 flex items-center justify-center text-[var(--accent-warning)]">
                  <Icon name="clock" size={32} />
                </div>
                <h2 className="text-base font-bold text-[var(--text-white)]">اطلاعات شما در صف انتظار بررسی است</h2>
                <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
                  مدارک و اطلاعات احراز هویت شما ارسال شده و توسط پشتیبانی در حال بررسی است. پس از تأیید، دسترسی شما به تمام بخش‌های پنل فعال خواهد شد.
                </p>
              </div>
            )}

            {verificationStatus === "REJECTED" && (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex items-center justify-center text-[var(--accent-red)]">
                  <Icon name="alert" size={28} />
                </div>
                <h2 className="text-base font-bold text-[var(--text-white)]">احراز هویت شما تایید نشد</h2>
                <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
                  اطلاعات یا پروانه کسب ارسال شده مورد تایید قرار نگرفت. لطفاً مجدداً اطلاعات صحیح را وارد کرده و تصویر خوانا ارسال کنید.
                </p>
                <button
                  type="button"
                  onClick={() => setVerificationStatus("NOT_SUBMITTED")}
                  className="mt-2 h-11 px-5 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  ویرایش و تلاش مجدد
                </button>
              </div>
            )}
          </div>
        )}

        {/* محتوای قفل‌شده تا زمان تأیید */}
        <div className={!isApproved ? "pointer-events-none opacity-40 flex flex-col gap-5 select-none" : "flex flex-col gap-5"}>
          {/* جستجو */}
          <form onSubmit={handleSearch} className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="جستجوی کد رزرو مشتری"
              placeholder="جستجوی کد رزرو مشتری"
              className="w-full h-12 rounded-card bg-[var(--foreground)]/60 px-4 pl-12 text-sm text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button type="submit" aria-label="جستجو" className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center text-[var(--text-muted)]">
              <Icon name="search" size={24} />
            </button>
          </form>

          {/* درآمد */}
          <Link
            href="/owner/withdraw"
            className="relative overflow-hidden rounded-card bg-[var(--primary)] text-on-primary p-4 min-h-[178px] flex flex-col justify-between"
          >
            <div className="relative flex items-center justify-between">
              <SafeImage src="/design/sayra.svg" alt="سایرا" className="h-7 w-auto brightness-0" />
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

          {/* میانبرها */}
          <div className="grid grid-cols-4 gap-3">
            {TILES.map((t) => (
              <Link key={t.href} href={t.href} className="flex flex-col items-center gap-2">
                <span className="relative w-full aspect-square rounded-card bg-[var(--foreground)]/70 flex items-center justify-center text-[var(--primary)]">
                  <TileIcon d={t.icon} />
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

          {/* منو */}
          <div className="rounded-card bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)]">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className="flex items-center gap-3 px-5 h-16 hover:bg-[var(--foreground)]/20 transition-colors">
                <span className="text-[var(--text-white)]">
                  <TileIcon d={m.icon} />
                </span>
                <span className="text-sm font-bold text-[var(--text-white)]">{m.label}</span>
              </Link>
            ))}
          </div>

          {/* گالری */}
          <section className="flex flex-col gap-3 mt-3 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[var(--text-white)]">گالری تصاویر گیمنت</h2>
                <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                  نمایش، افزودن یا حذف تصاویر گالری
                </span>
              </div>
              <button
                type="button"
                disabled={uploading || !isApproved}
                onClick={() => fileRef.current?.click()}
                className="h-11 px-4 shrink-0 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-[var(--text-white)] text-xs font-bold hover:bg-[var(--border-color)] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>در حال آپلود...</span>
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={16} />
                    <span>افزودن عکس</span>
                  </>
                )}
              </button>
            </div>

            {galleryMsg && (
              <div
                role="status"
                className={`p-3 rounded-card text-xs font-bold ${
                  galleryMsg.ok
                    ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                    : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                }`}
              >
                {galleryMsg.text}
              </div>
            )}

            {galleryBanners.length > 0 ? (
              <div className="w-full flex flex-col gap-3">
                <BannerSlider
                  banners={galleryBanners}
                  aspectClassName="aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3/1]"
                  ariaLabel="گالری تصاویر گیمنت"
                />

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                  {galleryItems.map((img, idx) => {
                    const imgKey = img.id || `${img.url}-${idx}`;
                    const isOptimistic = String(img.id).startsWith("temp-");
                    return (
                      <div
                        key={imgKey}
                        className="relative aspect-square rounded-card overflow-hidden bg-[var(--foreground)] border border-[var(--border-subtle)] group"
                      >
                        <SafeImage
                          src={img.url}
                          alt={img.altText ?? "تصویر گیمنت"}
                          fallbackSrc={PLACEHOLDERS.gallery}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />

                        {isOptimistic && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                            <span className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                            <span className="text-xs font-bold text-white">در حال ثبت...</span>
                          </div>
                        )}

                        {!isOptimistic && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmMedia(img)}
                            aria-label="حذف عکس"
                            className="absolute top-1.5 right-1.5 w-9 h-9 rounded-full bg-black/80 hover:bg-[var(--accent-red)] text-white flex items-center justify-center transition-colors shadow-md"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    disabled={uploading || !isApproved}
                    onClick={() => fileRef.current?.click()}
                    aria-label="افزودن تصویر به گالری"
                    className="aspect-square rounded-card bg-[var(--foreground)]/30 border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:text-white transition-all disabled:opacity-50"
                  >
                    <Icon name="plus" size={20} />
                    <span className="text-xs font-bold">عکس جدید</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-card bg-[var(--foreground)]/10 border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-xs text-[var(--text-muted)]">هنوز تصویری برای گالری آپلود نشده است.</span>
                <button
                  type="button"
                  disabled={uploading || !isApproved}
                  onClick={() => fileRef.current?.click()}
                  className="h-11 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
                >
                  {uploading ? "در حال آپلود..." : "آپلود اولین تصویر گالری"}
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </section>
        </div>
      </main>

      {/* تأیید حذف تصویر */}
      {deleteConfirmMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => !deletingImage && setDeleteConfirmMedia(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-media-title"
            className="w-full max-w-[380px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex flex-col gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] mx-auto flex items-center justify-center">
              <Icon name="trash" size={24} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 id="delete-media-title" className="text-sm font-bold text-[var(--text-white)]">تایید حذف تصویر</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                آیا از حذف این تصویر اطمینان دارید؟
              </p>
            </div>

            {deleteConfirmMedia.url && (
              <div className="w-24 h-24 mx-auto rounded-card overflow-hidden border border-[var(--border-subtle)]">
                <SafeImage
                  src={deleteConfirmMedia.url}
                  alt="پیش‌نمایش تصویر"
                  fallbackSrc={PLACEHOLDERS.gallery}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={deletingImage}
                onClick={async () => {
                  if (deletingImage || !deleteConfirmMedia) return;
                  setDeletingImage(true);
                  try {
                    const targetId = deleteConfirmMedia.id || deleteConfirmMedia.url;
                    await ownerService.deleteMedia(centerId, targetId);
                    const updated = await ownerService.listMedia(center?.slug || centerId);
                    setMedia(Array.isArray(updated) ? updated : []);
                    setDeleteConfirmMedia(null);
                    setGalleryMsg({ ok: true, text: "تصویر از گالری حذف شد." });
                  } catch (err) {
                    setDeleteConfirmMedia(null);
                    setGalleryMsg({ ok: false, text: getErrorMessage(err) });
                  } finally {
                    setDeletingImage(false);
                  }
                }}
                className="flex-1 h-11 rounded-card bg-[var(--accent-red)] text-white font-bold text-xs disabled:opacity-60"
              >
                {deletingImage ? "در حال حذف..." : "حذف تصویر"}
              </button>
              <button
                type="button"
                disabled={deletingImage}
                onClick={() => setDeleteConfirmMedia(null)}
                className="h-11 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)]"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}