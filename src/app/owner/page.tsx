"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOwner } from "@/context/OwnerContext";
import { OwnerHeader } from "@/components/owner/OwnerHeader";
import { BottomBar } from "@/components/BottomBar";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { QuickBookingPauseCard } from "@/components/owner/QuickBookingPauseCard";
import { PLACEHOLDERS } from "@/lib/media";
import type { MediaItem } from "@/types/owner";

const TileIcon = ({ d }: { d: string }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  reservations:
    "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  stations: "M15 5M9 9h6M12 6v6M6 15h.01M18 15h.01M15 18h.01M9 18h.01",
  reviews:
    "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  edit: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  shield: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z M9 12l2 2 4-4",
  tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  megaphone:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M11 5.882a3 3 0 00-3-3H5a2 2 0 00-2 2v6a2 2 0 002 2h3a3 3 0 003-3",
  support:
    "M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1v-4zm16 0h-3v5h2a1 1 0 001-1v-4zM17 19c0 1.5-2 2-5 2",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

interface MenuItem {
  href?: string;
  label: string;
  icon: string;
  badge?: "pending";
  isVerification?: boolean;
  comingSoon?: boolean;
}

interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "operations",
    title: "مدیریت روزانه",
    items: [
      {
        href: "/owner/reservations",
        label: "رزروها",
        icon: ICONS.reservations,
        badge: "pending",
      },
      {
        href: "/owner/stations",
        label: "دستگاه‌ها و بازی‌ها",
        icon: ICONS.stations,
      },
      {
        href: "/owner/reviews",
        label: "نظرات",
        icon: ICONS.reviews,
      },
    ],
  },
  {
    id: "configuration",
    title: "تنظیمات",
    items: [
      {
        href: "/owner/edit",
        label: "اطلاعات و گالری",
        icon: ICONS.edit,
      },
      {
        href: "/owner/hours",
        label: "ساعات کاری و رزرو",
        icon: ICONS.clock,
      },
      {
        href: "/owner/verification",
        label: "احراز هویت",
        icon: ICONS.shield,
        isVerification: true,
      },
    ],
  },
  {
    id: "growth",
    title: "فروش و پشتیبانی",
    items: [
      {
        href: "/owner/discounts",
        label: "تخفیف‌ها",
        icon: ICONS.tag,
      },
      {
        label: "تبلیغات",
        icon: ICONS.megaphone,
        comingSoon: true,
      },
      {
        href: "/owner/support",
        label: "پشتیبانی",
        icon: ICONS.support,
      },
    ],
  },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    me,
    centerId,
    center,
    centers,
    isCenterLoading,
    centerError,
    ownerName,
    verificationStatus,
    verificationInfo,
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
        router.push("/register-gamecenter");
      }
    }
  }, [isCenterLoading, centers.length, centerId, me?.gamingCenterId, router]);

  const [query, setQuery] = useState("");
  const isApproved = verificationStatus === "APPROVED";
  const [withdrawable, setWithdrawable] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);

  // واکشی داده‌های زنده: درآمد و تعداد رزروهای در انتظار
  useEffect(() => {
    if (!centerId) {
      setWithdrawable(null);
      setPendingCount(0);
      return;
    }
    let active = true;
    setDashboardError(null);

    Promise.allSettled([
      ownerService.getAnalyticsSummary(centerId),
      ownerService.listReservations(centerId),
    ]).then(([summaryRes, reservationsRes]) => {
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
    });

    return () => {
      active = false;
    };
  }, [centerId]);

  const centerSlug = center?.slug;

  useEffect(() => {
    if (!centerId) return;
    let active = true;
    const controller = new AbortController();

    ownerService
      .listOwnerMedia(centerId, centerSlug, controller.signal, { noCache: true })
      .then((items) => {
        if (!active) return;
        setMedia(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        // در صورت خطا وضعیت فعلی حفظ می‌شود
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, centerSlug]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/owner/reservations?q=${encodeURIComponent(q)}` : "/owner/reservations");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      try {
        localStorage.removeItem("sayra_owner_center_id");
      } catch {
        // ignore
      }
      await logout();
      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  };

  const logoMedia = React.useMemo(
    () => (centerId ? media.find((m) => m.purpose === "LOGO" || m.purpose === "COVER") : undefined),
    [centerId, media]
  );

  if (isCenterLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
        <OwnerHeader title="پنل مدیریت" isSubpage={false} showSearch={false} />
        <main className="flex-1 px-4 pt-20 flex flex-col gap-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
          <div className="h-16 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse" />
          <div className="min-h-[164px] rounded-card bg-[var(--bg-card)] animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-16 rounded-card bg-[var(--bg-card)] animate-pulse" />
            <div className="h-16 rounded-card bg-[var(--bg-card)] animate-pulse" />
          </div>
          {[3, 3, 3].map((count, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-2">
              <div className="h-4 w-24 rounded bg-[var(--bg-card)] animate-pulse" />
              <div className="rounded-card bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)] animate-pulse">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 h-14">
                    <div className="w-8 h-8 rounded-lg bg-[var(--foreground)]/70 shrink-0" />
                    <div className="h-3.5 w-28 rounded bg-[var(--foreground)]/60" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <OwnerHeader
        title="پنل مدیریت"
        isSubpage={false}
        showSearch={true}
        searchValue={query}
        onSearchChange={setQuery}
        onSearchSubmit={handleSearch}
        searchPlaceholder="جستجوی کد رزرو مشتری..."
      />

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

        {/* کارت هویت گیم‌نت */}
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {logoMedia?.url ? (
              <SafeImage
                src={logoMedia.url}
                alt={center?.name || "لوگو"}
                fallbackSrc={PLACEHOLDERS.avatar}
                className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Icon name="gamepad" size={20} />
              </div>
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-bold text-[var(--text-white)] truncate">
                  {center?.name || "مرکز بازی"}
                </span>
                <Link
                  href="/owner/edit"
                  aria-label="ویرایش گیم‌نت"
                  title="ویرایش گیم‌نت"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--foreground)]/60 hover:text-[var(--primary)] transition-colors shrink-0"
                >
                  <Icon name="edit" size={14} />
                </Link>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                مدیریت: {ownerName || "مدیر گیم‌نت"}
              </span>
            </div>
          </div>

          {isApproved && centerSlug ? (
            <Link
              href={`/gamecenter/${centerSlug}`}
              className="flex h-9 items-center gap-1.5 px-3 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-white)] transition-colors shrink-0"
            >
              <span>صفحه عمومی</span>
              <Icon name="external-link" size={14} className="text-[var(--primary)]" />
            </Link>
          ) : (
            <Link
              href="/owner/edit"
              className="flex h-9 items-center gap-1 px-3 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--primary)] transition-colors shrink-0"
            >
              <span>تکمیل مشخصات</span>
            </Link>
          )}
        </div>

        {/* بنر غیرمسدودکننده وضعیت فعال‌سازی و احراز هویت */}
        {!isApproved && (
          <div
            className={`rounded-card border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              verificationStatus === "PENDING"
                ? "bg-amber-500/10 border-amber-500/30"
                : verificationStatus === "REJECTED"
                  ? "bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30"
                  : "bg-[var(--bg-card)] border-[var(--primary)]/30"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  verificationStatus === "PENDING"
                    ? "bg-amber-500/15 text-amber-400"
                    : verificationStatus === "REJECTED"
                      ? "bg-[var(--accent-red)]/15 text-[var(--accent-red)]"
                      : "bg-[var(--primary)]/15 text-[var(--primary)]"
                }`}
              >
                <Icon
                  name={
                    verificationStatus === "PENDING"
                      ? "clock"
                      : verificationStatus === "REJECTED"
                        ? "alert"
                        : "shield"
                  }
                  size={20}
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-[var(--text-white)]">
                  {verificationStatus === "PENDING"
                    ? "گیم‌نت غیرفعال است • درخواست احراز هویت در حال بررسی"
                    : verificationStatus === "REJECTED"
                      ? "گیم‌نت غیرفعال است • درخواست احراز هویت لغو شده است"
                      : "گیم‌نت شما در انتظار احراز هویت و فعال‌سازی است"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {verificationStatus === "PENDING"
                    ? "درخواست شما ثبت شده است. تا زمان تایید ادمین، می‌توانید دستگاه‌ها، ساعات کاری و تخفیف‌ها را تکمیل کنید."
                    : verificationStatus === "REJECTED"
                      ? verificationInfo?.rejectionReason
                        ? `دلیل لغو: ${verificationInfo.rejectionReason}`
                        : "درخواست احراز هویت شما تایید نشد. می‌توانید علت را مشاهده کرده و درخواست جدید ثبت کنید."
                      : "تا پیش از تایید احراز هویت، گیم‌نت برای کاربران نمایش داده نمی‌شود؛ اما همین حالا می‌توانید اطلاعات مرکز را تکمیل کنید."}
                </p>
              </div>
            </div>

            <Link
              href="/owner/verification"
              className="h-10 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center shrink-0"
            >
              {verificationStatus === "PENDING"
                ? "وضعیت درخواست"
                : verificationStatus === "REJECTED"
                  ? "بررسی و ارسال مجدد"
                  : "احراز هویت و فعال‌سازی"}
            </Link>
          </div>
        )}

        {/* جستجوی موبایل */}
        <form onSubmit={handleSearch} className="relative md:hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی کد رزرو مشتری"
            placeholder="جستجوی کد رزرو مشتری..."
            className="w-full h-11 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 pl-11 text-sm text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
          />
          <button
            type="submit"
            aria-label="جستجو"
            className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center text-[var(--text-muted)]"
          >
            <Icon name="search" size={20} />
          </button>
        </form>

        {/* کارت درآمد قابل برداشت + وضعیت‌های سریع */}
        <div className="flex flex-col gap-3">
          <Link
            href="/owner/withdraw"
            className="relative overflow-hidden rounded-card bg-[var(--primary)] text-on-primary p-4 min-h-[156px] flex flex-col justify-between group"
          >
            <div className="relative flex items-center justify-between">
              <SafeImage src="/design/sayra.svg" alt="سایرا" className="h-6 w-auto brightness-0" />
              <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-3 py-1 text-[11px] font-bold">
                <span>تسویه و تاریخچه مالی</span>
                <Icon name="arrow-left" size={14} />
              </span>
            </div>

            <div className="relative flex flex-col gap-1 pt-4">
              <span className="text-xs opacity-85">درآمد قابل برداشت</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight">
                  {withdrawable === null ? "—" : formatPrice(withdrawable)}
                </span>
                <span className="text-base font-black">تومان</span>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
            {/* کارت وضعیت رزروهای در انتظار */}
            <Link
              href="/owner/reservations"
              className={`h-full rounded-card border p-3 flex items-center justify-between gap-3 transition-colors ${
                pendingCount > 0
                  ? "bg-[var(--primary)]/10 border-[var(--primary)]/40 hover:border-[var(--primary)]"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    pendingCount > 0
                      ? "bg-[var(--primary)] text-on-primary"
                      : "bg-[var(--foreground)]/50 text-[var(--text-muted)]"
                  }`}
                >
                  <TileIcon d={ICONS.reservations} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-[var(--text-white)]">
                    {pendingCount > 0
                      ? `${toPersianDigits(pendingCount)} رزرو در انتظار تایید`
                      : "رزرو در انتظاری نیست"}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    مشاهده و مدیریت رزروها
                  </span>
                </div>
              </div>
              <Icon name="arrow-left" size={16} className="text-[var(--text-muted)] shrink-0" />
            </Link>

            {/* کنترل سریع توقف موقت رزرو آنلاین */}
            {centerId && <QuickBookingPauseCard key={centerId} centerId={centerId} />}
          </div>
        </div>

        {/* دسته‌بندی منوهای پنل مدیریت */}
        <div className="flex flex-col gap-5">
          {MENU_GROUPS.map((group) => (
            <section key={group.id} className="flex flex-col gap-2">
              <h2 className="text-xs font-bold text-[var(--text-muted)] px-1">
                {group.title}
              </h2>

              <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)]">
                {group.items.map((m) =>
                  m.comingSoon ? (
                    <div
                      key={m.label}
                      aria-disabled="true"
                      className="flex items-center justify-between gap-3 px-4 h-14 opacity-60 cursor-not-allowed select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-[var(--foreground)]/40 text-[var(--text-muted)] flex items-center justify-center shrink-0">
                          <TileIcon d={m.icon} />
                        </span>
                        <span className="text-sm font-bold text-[var(--text-muted)] truncate">
                          {m.label}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 shrink-0">
                        به‌زودی
                      </span>
                    </div>
                  ) : (
                    <Link
                      key={m.href}
                      href={m.href!}
                      className="flex items-center justify-between gap-3 px-4 h-14 hover:bg-[var(--foreground)]/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            m.isVerification
                              ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                              : "bg-[var(--foreground)]/50 text-[var(--text-white)]"
                          }`}
                        >
                          <TileIcon d={m.icon} />
                        </span>
                        <span className="text-sm font-bold text-[var(--text-white)] truncate">
                          {m.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {m.badge === "pending" && pendingCount > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-2 text-xs font-bold text-on-primary">
                            {toPersianDigits(pendingCount)}
                          </span>
                        )}

                        {m.isVerification && (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              verificationStatus === "APPROVED"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : verificationStatus === "PENDING"
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30"
                            }`}
                          >
                            {verificationStatus === "APPROVED"
                              ? "تایید شده"
                              : verificationStatus === "PENDING"
                                ? "در حال انتظار"
                                : verificationStatus === "REJECTED"
                                  ? "لغو شده"
                                  : "احراز نشده"}
                          </span>
                        )}

                        <Icon name="arrow-left" size={16} className="text-[var(--text-muted)]" />
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        {/* خروج از حساب */}
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-between gap-3 px-4 h-14 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors cursor-pointer disabled:opacity-60"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[var(--accent-red)]/15 text-[var(--accent-red)] flex items-center justify-center shrink-0">
                <TileIcon d={ICONS.logout} />
              </span>
              <span className="text-sm font-bold truncate">
                {loggingOut ? "در حال خروج..." : "خروج از حساب"}
              </span>
            </div>
            <Icon name="arrow-left" size={16} className="text-[var(--accent-red)]/70 shrink-0" />
          </button>
        </div>
      </main>

      <BottomBar />
    </div>
  );
}
