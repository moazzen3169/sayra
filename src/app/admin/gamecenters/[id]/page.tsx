"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon, IconName } from "@/components/ui/Icon";
import { RatingHeartIcon } from "@/components/ui/RatingHeartIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AppImage } from "@/components/common/AppImage";
import { GamecenterFormModal } from "@/components/admin/gamecenters/GamecenterFormModal";
import { GamecenterMediaModal } from "@/components/admin/gamecenters/GamecenterMediaModal";
import { DeleteConfirmationModal } from "@/components/admin/gamecenters/DeleteConfirmationModal";
import {
  AdminGamecenter,
  AdminGamecenterSettings,
  AdminGamecenterStation,
  AdminGamecenterVerificationStatus,
  AdminTicket,
  AdminReview,
  AdminUserReservation,
} from "@/types/admin";
import { adminService } from "@/services/adminService";
import { normalizeMediaUrl } from "@/lib/media";

type DetailTab = "overview" | "stations" | "media" | "reservations" | "reviews" | "tickets";

const VERIFICATION_META: Record<
  AdminGamecenterVerificationStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  APPROVED: { label: "تأیید شده", variant: "success" },
  PENDING: { label: "در انتظار بررسی", variant: "warning" },
  REJECTED: { label: "رد شده", variant: "danger" },
  NOT_SUBMITTED: { label: "ثبت نشده", variant: "neutral" },
};

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  dir?: "rtl" | "ltr";
}

function InfoRow({ label, value, dir }: InfoRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2.5 border-b border-[var(--border-subtle)]/70 last:border-b-0">
      <span className="text-xs text-[var(--text-muted)] font-medium shrink-0">{label}</span>
      <div
        className={`text-sm font-medium text-[var(--text-white)] ${
          dir === "ltr" ? "dir-ltr text-left sm:text-left" : "text-right"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function GamecenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const gamecenterId = resolvedParams.id;

  const [gc, setGc] = useState<AdminGamecenter | null>(null);
  const [settings, setSettings] = useState<AdminGamecenterSettings | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<{
    verificationStatus: AdminGamecenterVerificationStatus;
    verifiedAt?: string;
    rejectionReason?: string;
    verificationId?: string;
    businessLicenseUrl?: string;
  } | null>(null);
  const [stations, setStations] = useState<AdminGamecenterStation[]>([]);
  const [mediaItems, setMediaItems] = useState<
    Array<{ id: string; url: string; altText?: string; purpose?: string }>
  >([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reservations, setReservations] = useState<AdminUserReservation[]>([]);

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Quick toggle loading states
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isTogglingBooking, setIsTogglingBooking] = useState(false);

  // Modals & Feedback
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const item = await adminService.getGamecenterById(gamecenterId);
      if (!item) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setGc(item);

      const [
        settingsRes,
        verificationRes,
        stationsRes,
        mediaRes,
        tktList,
        revList,
        resList,
      ] = await Promise.all([
        adminService.getGamecenterSettings(item.id),
        adminService.getGamecenterVerification(item.id),
        adminService.getGamecenterStations(item.id),
        adminService.getGamecenterMedia(item.slug || item.id),
        adminService.getGamecenterTickets(item.id),
        adminService.getGamecenterReviews(item.slug || item.id),
        adminService.getGamecenterReservations(item.id),
      ]);

      setSettings(settingsRes);
      setVerificationInfo(verificationRes);
      setStations(stationsRes);
      setMediaItems(mediaRes.length > 0 ? mediaRes : item.media || []);
      setTickets(tktList);
      setReviews(revList);
      setReservations(resList);

      // همگام‌سازی فیلدهای تکمیلی روی state اصلی گیمنت
      setGc((prev) =>
        prev
          ? {
              ...prev,
              allowOnlineBooking:
                typeof settingsRes?.allowOnlineBooking === "boolean"
                  ? settingsRes.allowOnlineBooking
                  : prev.allowOnlineBooking,
              verificationStatus:
                verificationRes?.verificationStatus ?? prev.verificationStatus ?? "NOT_SUBMITTED",
              verifiedAt: verificationRes?.verifiedAt ?? prev.verifiedAt,
              verificationRejectionReason:
                verificationRes?.rejectionReason ?? prev.verificationRejectionReason,
              stationsCount:
                stationsRes.length > 0 ? stationsRes.length : prev.stationsCount,
            }
          : prev
      );
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [gamecenterId]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      try {
        const item = await adminService.getGamecenterById(gamecenterId, controller.signal);
        if (!active) return;
        if (!item) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        setGc(item);

        const [
          settingsRes,
          verificationRes,
          stationsRes,
          mediaRes,
          tktList,
          revList,
          resList,
        ] = await Promise.all([
          adminService.getGamecenterSettings(item.id, controller.signal),
          adminService.getGamecenterVerification(item.id, controller.signal),
          adminService.getGamecenterStations(item.id, controller.signal),
          adminService.getGamecenterMedia(item.slug || item.id, controller.signal),
          adminService.getGamecenterTickets(item.id, controller.signal),
          adminService.getGamecenterReviews(item.slug || item.id, controller.signal),
          adminService.getGamecenterReservations(item.id, controller.signal),
        ]);

        if (!active) return;

        setSettings(settingsRes);
        setVerificationInfo(verificationRes);
        setStations(stationsRes);
        setMediaItems(mediaRes.length > 0 ? mediaRes : item.media || []);
        setTickets(tktList);
        setReviews(revList);
        setReservations(resList);
        setNotFound(false);

        setGc((prev) =>
          prev
            ? {
                ...prev,
                allowOnlineBooking:
                  typeof settingsRes?.allowOnlineBooking === "boolean"
                    ? settingsRes.allowOnlineBooking
                    : prev.allowOnlineBooking,
                verificationStatus:
                  verificationRes?.verificationStatus ?? prev.verificationStatus ?? "NOT_SUBMITTED",
                verifiedAt: verificationRes?.verifiedAt ?? prev.verifiedAt,
                verificationRejectionReason:
                  verificationRes?.rejectionReason ?? prev.verificationRejectionReason,
                stationsCount:
                  stationsRes.length > 0 ? stationsRes.length : prev.stationsCount,
              }
            : prev
        );
      } catch {
        if (!active || controller.signal.aborted) return;
        setNotFound(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamecenterId]);

  const handleToggleStatus = async () => {
    if (!gc || isTogglingStatus) return;
    setIsTogglingStatus(true);
    try {
      const updated = await adminService.toggleGamecenterStatus(gc.id);
      setGc((prev) => (prev ? { ...prev, isActive: updated.isActive } : prev));
      showFeedback(
        "success",
        `وضعیت مرکز به ${updated.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleToggleOnlineBooking = async () => {
    if (!gc || isTogglingBooking) return;
    const currentVal = settings?.allowOnlineBooking ?? gc.allowOnlineBooking ?? true;
    const nextVal = !currentVal;
    setIsTogglingBooking(true);
    try {
      await adminService.toggleGamecenterOnlineBooking(gc.id, nextVal);
      setSettings((prev) => ({ ...(prev ?? {}), allowOnlineBooking: nextVal }));
      setGc((prev) => (prev ? { ...prev, allowOnlineBooking: nextVal } : prev));
      showFeedback(
        "success",
        `وضعیت رزرو آنلاین این گیمنت به ${nextVal ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت رزرو آنلاین.");
    } finally {
      setIsTogglingBooking(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback("success", `${label} در حافظه کپی شد.`);
    } catch {
      showFeedback("danger", "امکان کپی در مرورگر وجود ندارد.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!gc) return;
    await adminService.deleteGamecenter(gc.id);
    router.push("/admin/gamecenters");
  };

  if (isLoading) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col gap-6 w-full">
          <Skeleton className="h-20 w-full rounded-card" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
          <Skeleton className="h-12 w-full rounded-card" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      </AdminPageContainer>
    );
  }

  if (notFound || !gc) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col gap-6 w-full items-center py-12">
          <EmptyState
            title="گیمنت مورد نظر یافت نشد"
            description="شناسه یا اطلاعات گیمنت مورد نظر در سیستم پیدا نشد."
          />
          <Link href="/admin/gamecenters">
            <Button variant="secondary" className="flex items-center gap-2">
              <Icon name="back" size={18} />
              <span>بازگشت به لیست گیمنت‌ها</span>
            </Button>
          </Link>
        </div>
      </AdminPageContainer>
    );
  }

  const verificationStatus: AdminGamecenterVerificationStatus =
    verificationInfo?.verificationStatus ?? gc.verificationStatus ?? "NOT_SUBMITTED";
  const verificationMeta = VERIFICATION_META[verificationStatus];
  const bookingEnabled = settings?.allowOnlineBooking ?? gc.allowOnlineBooking ?? true;
  const totalStations = stations.length > 0 ? stations.length : gc.stationsCount ?? 0;

  const tabs: Array<{ id: DetailTab; label: string; icon: IconName; count?: number }> = [
    { id: "overview", label: "اطلاعات کلی و تنظیمات", icon: "info" },
    { id: "stations", label: "دستگاه‌ها", icon: "gamepad", count: totalStations },
    { id: "media", label: "تصاویر و رسانه", icon: "image", count: mediaItems.length },
    { id: "reservations", label: "رزروها", icon: "calendar", count: reservations.length },
    { id: "reviews", label: "نظرات کاربران", icon: "star", count: reviews.length },
    { id: "tickets", label: "تیکت‌ها", icon: "ticket", count: tickets.length },
  ];

  const workHoursText =
    settings?.workStartTime && settings?.workEndTime
      ? `${settings.workStartTime} تا ${settings.workEndTime}`
      : "تنظیم نشده";

  const cancellationText =
    typeof settings?.cancellationWindowMinutes === "number"
      ? `${settings.cancellationWindowMinutes} دقیقه قبل از شروع`
      : typeof gc.cancellationWindowMinutes === "number"
        ? `${gc.cancellationWindowMinutes} دقیقه قبل از شروع`
        : typeof settings?.cancellationHours === "number"
          ? `${settings.cancellationHours} ساعت قبل از شروع`
          : typeof gc.cancellationHours === "number"
            ? `${gc.cancellationHours} ساعت قبل از شروع`
            : "-";

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Bar */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <Link
              href="/admin/gamecenters"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors shrink-0"
              title="بازگشت به لیست گیمنت‌ها"
              aria-label="بازگشت به لیست گیمنت‌ها"
            >
              <Icon name="back" size={20} />
            </Link>

            {gc.logoUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--foreground)]/30 shrink-0">
                <AppImage
                  src={normalizeMediaUrl(gc.logoUrl)}
                  alt={gc.name}
                  className="w-full h-full object-cover"
                  objectFit="cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--foreground)]/30 flex items-center justify-center text-[var(--primary)] shrink-0">
                <Icon name="gamepad" size={22} />
              </div>
            )}

            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-page-title text-[var(--text-white)] truncate">{gc.name}</h1>
                <Badge variant={gc.isActive ? "success" : "danger"}>
                  {gc.isActive ? "فعال" : "غیرفعال"}
                </Badge>
                <Badge variant={verificationMeta.variant}>
                  احراز هویت: {verificationMeta.label}
                </Badge>
                <Badge variant={bookingEnabled ? "success" : "danger"}>
                  {bookingEnabled ? "رزرو فعال" : "رزرو غیرفعال"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Icon name="pin" size={14} />
                  <span>{gc.city || "-"}</span>
                </span>
                <span className="opacity-40">•</span>
                <button
                  type="button"
                  onClick={() => handleCopy(gc.slug, "اسلاگ")}
                  className="inline-flex items-center gap-1 hover:text-[var(--text-white)] transition-colors cursor-pointer dir-ltr"
                  title="کپی اسلاگ"
                >
                  <span>/{gc.slug}</span>
                  <Icon name="copy" size={13} />
                </button>
                <span className="opacity-40">•</span>
                <button
                  type="button"
                  onClick={() => handleCopy(gc.id, "شناسه گیمنت")}
                  className="inline-flex items-center gap-1 hover:text-[var(--text-white)] transition-colors cursor-pointer dir-ltr"
                  title="کپی شناسه"
                >
                  <span>ID: {gc.id.slice(0, 12)}{gc.id.length > 12 ? "…" : ""}</span>
                  <Icon name="copy" size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Icon name="edit" size={16} />
              <span>ویرایش اطلاعات</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsMediaModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Icon name="image" size={16} />
              <span>مدیریت تصاویر</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Icon name="trash" size={16} />
              <span>حذف</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-card text-xs font-bold flex items-center gap-2 transition-all ${
              feedback.type === "success"
                ? "bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                : "bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]"
            }`}
          >
            <Icon name={feedback.type === "success" ? "check" : "alert"} size={18} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">دستگاه‌های ثبت‌شده</span>
              <span className="text-lg font-bold text-[var(--text-white)]">
                {totalStations.toLocaleString("fa-IR")} دستگاه
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
              <Icon name="gamepad" size={20} />
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">امتیاز و نظرات</span>
              <div className="flex items-center gap-1.5 text-lg font-bold text-[var(--text-white)]">
                <RatingHeartIcon size={16} />
                <span>
                  {typeof gc.rating === "number" ? gc.rating.toFixed(1) : "-"}
                </span>
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  ({(gc.commentCount ?? reviews.length).toLocaleString("fa-IR")} نظر)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] flex items-center justify-center shrink-0">
              <Icon name="star" size={20} />
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">سوابق رزرو</span>
              <span className="text-lg font-bold text-[var(--text-white)]">
                {reservations.length.toLocaleString("fa-IR")} رزرو
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center shrink-0">
              <Icon name="calendar" size={20} />
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">تیکت‌های پشتیبانی</span>
              <span className="text-lg font-bold text-[var(--text-white)]">
                {tickets.length.toLocaleString("fa-IR")} تیکت
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--foreground)]/50 text-[var(--text-white)] flex items-center justify-center shrink-0">
              <Icon name="ticket" size={20} />
            </div>
          </div>
        </div>

        {/* Categorized Tab Navigation */}
        <div
          role="tablist"
          aria-label="بخش‌های جزئیات گیمنت"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/20"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none ${
                      isActive
                        ? "bg-[var(--primary)] text-on-primary"
                        : "bg-[var(--foreground)]/60 text-[var(--text-muted)]"
                    }`}
                  >
                    {tab.count.toLocaleString("fa-IR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Overview & Settings */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Identity & Management */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="user" size={18} className="text-[var(--primary)]" />
                  <h2 className="text-section-title text-[var(--text-white)]">
                    مشخصات هویتی و مدیریتی
                  </h2>
                </div>
              </div>
              <div className="flex flex-col">
                <InfoRow label="نام گیمنت" value={gc.name} />
                <InfoRow label="اسلاگ (نشانی یکتا)" value={gc.slug} dir="ltr" />
                <InfoRow label="نام مسئول / مالک" value={gc.ownerName || "-"} />
                <InfoRow label="شماره تماس مسئول" value={gc.ownerPhone || "-"} dir="ltr" />
                {gc.phone && gc.phone !== gc.ownerPhone && (
                  <InfoRow label="تلفن مرکز" value={gc.phone} dir="ltr" />
                )}
                {gc.subscriptionStatus && (
                  <InfoRow label="وضعیت اشتراک" value={gc.subscriptionStatus} />
                )}
                <InfoRow label="تاریخ ثبت در پلتفرم" value={gc.createdAt || "-"} />
                {gc.updatedAt && <InfoRow label="آخرین بروزرسانی" value={gc.updatedAt} />}
              </div>
            </section>

            {/* Card 2: Operational Status & Verification */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="shield" size={18} className="text-[var(--primary)]" />
                  <h2 className="text-section-title text-[var(--text-white)]">
                    وضعیت عملیاتی و احراز هویت
                  </h2>
                </div>
              </div>

              {/* Quick Interactive Controls */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--text-white)]">
                      وضعیت فعال بودن در پلتفرم
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {gc.isActive
                        ? "این گیمنت هم‌اکنون فعال و قابل مشاهده است."
                        : "این گیمنت غیرفعال است و در سایت نمایش داده نمی‌شود."}
                    </span>
                  </div>
                  <Button
                    variant={gc.isActive ? "secondary" : "primary"}
                    size="sm"
                    isLoading={isTogglingStatus}
                    onClick={handleToggleStatus}
                  >
                    {gc.isActive ? "غیرفعال کردن" : "فعال‌سازی"}
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--text-white)]">
                      وضعیت فعال بودن رزرو آنلاین
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {bookingEnabled
                        ? "کاربران می‌توانند به صورت آنلاین سانس رزرو کنند."
                        : "رزرو آنلاین برای این گیمنت موقتاً متوقف است."}
                    </span>
                  </div>
                  <Button
                    variant={bookingEnabled ? "secondary" : "primary"}
                    size="sm"
                    isLoading={isTogglingBooking}
                    onClick={handleToggleOnlineBooking}
                  >
                    {bookingEnabled ? "توقف رزرو" : "فعال‌سازی رزرو"}
                  </Button>
                </div>
              </div>

              {/* Verification Details */}
              <div className="flex flex-col">
                <InfoRow
                  label="وضعیت احراز هویت (KYC)"
                  value={<Badge variant={verificationMeta.variant}>{verificationMeta.label}</Badge>}
                />
                {gc.verifiedAt && <InfoRow label="تاریخ تأیید هویت" value={gc.verifiedAt} />}
                {gc.verificationRejectionReason && (
                  <InfoRow
                    label="دلیل رد احراز هویت"
                    value={
                      <span className="text-[var(--accent-red)]">
                        {gc.verificationRejectionReason}
                      </span>
                    }
                  />
                )}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <Link
                    href="/admin/owners"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    <span>مدیریت درخواست‌های احراز هویت</span>
                    <Icon name="external-link" size={14} />
                  </Link>
                  {verificationInfo?.businessLicenseUrl && (
                    <a
                      href={verificationInfo.businessLicenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-white)] hover:text-[var(--primary)] transition-colors"
                    >
                      <span>مشاهده تصویر پروانه کسب</span>
                      <Icon name="external-link" size={14} />
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Card 3: Location & Address */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="pin" size={18} className="text-[var(--primary)]" />
                  <h2 className="text-section-title text-[var(--text-white)]">
                    موقعیت مکانی و آدرس
                  </h2>
                </div>
                {typeof gc.lat === "number" && typeof gc.lng === "number" && (
                  <a
                    href={`https://www.google.com/maps?q=${gc.lat},${gc.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    <span>مشاهده روی نقشه</span>
                    <Icon name="external-link" size={14} />
                  </a>
                )}
              </div>
              <div className="flex flex-col">
                <InfoRow
                  label="شهر"
                  value={<span className="text-[var(--primary)] font-bold">{gc.city || "-"}</span>}
                />
                <InfoRow label="آدرس کامل" value={gc.address || "ثبت نشده"} />
                <InfoRow
                  label="مختصات جغرافیایی"
                  dir="ltr"
                  value={
                    typeof gc.lat === "number" && typeof gc.lng === "number"
                      ? `${gc.lat.toFixed(5)}, ${gc.lng.toFixed(5)}`
                      : "ثبت نشده"
                  }
                />
              </div>
            </section>

            {/* Card 4: Booking & Pricing Settings */}
            <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="clock" size={18} className="text-[var(--primary)]" />
                  <h2 className="text-section-title text-[var(--text-white)]">
                    تنظیمات رزرو، ساعات کاری و تعرفه
                  </h2>
                </div>
              </div>
              <div className="flex flex-col">
                <InfoRow label="ساعات کاری" value={workHoursText} />
                <InfoRow
                  label="تأیید خودکار رزرو آنلاین"
                  value={
                    settings?.onlineBookingAutoConfirm === undefined
                      ? "-"
                      : settings.onlineBookingAutoConfirm
                        ? "فعال"
                        : "غیرفعال (تأیید دستی)"
                  }
                />
                <InfoRow label="مهلت لغو رزرو" value={cancellationText} />
                {typeof settings?.maxAdvanceBookingDays === "number" && (
                  <InfoRow
                    label="حداکثر رزرو پیش‌ازموعد"
                    value={`${settings.maxAdvanceBookingDays} روز`}
                  />
                )}
                {typeof gc.hourlyRate === "number" && (
                  <InfoRow
                    label="شروع تعرفه ساعتی"
                    value={`${gc.hourlyRate.toLocaleString("fa-IR")} تومان`}
                  />
                )}
                {gc.pricing?.hasDiscount && (
                  <InfoRow
                    label="تخفیف فعال"
                    value={
                      <Badge variant="warning">
                        {gc.pricing.discountPercentage}٪ تخفیف (نهایی:{" "}
                        {gc.pricing.finalPrice.toLocaleString("fa-IR")} تومان)
                      </Badge>
                    }
                  />
                )}
              </div>
            </section>

            {/* Card 5: Description & Games (Full Width) */}
            {(gc.description || (gc.games && gc.games.length > 0)) && (
              <section className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <Icon name="file" size={18} className="text-[var(--primary)]" />
                  <h2 className="text-section-title text-[var(--text-white)]">
                    توضیحات، امکانات و بازی‌ها
                  </h2>
                </div>
                {gc.description && (
                  <p className="text-sm text-[var(--text-white)] leading-relaxed whitespace-pre-line">
                    {gc.description}
                  </p>
                )}
                {gc.games && gc.games.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-[var(--text-muted)]">
                      بازی‌های ثبت‌شده ({gc.games.length.toLocaleString("fa-IR")})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {gc.games.map((game) => (
                        <Badge key={game} variant="neutral">
                          {game}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* TAB 2: Stations & Equipment */}
        {activeTab === "stations" && (
          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Icon name="gamepad" size={18} className="text-[var(--primary)]" />
                <h2 className="text-section-title text-[var(--text-white)]">
                  دستگاه‌ها و تجهیزات ({totalStations.toLocaleString("fa-IR")})
                </h2>
              </div>

              {gc.deviceCounts && Object.keys(gc.deviceCounts).length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(gc.deviceCounts)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <Badge key={type} variant="neutral">
                        {type}: {count.toLocaleString("fa-IR")}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {stations.length === 0 ? (
              <EmptyState
                title="دستگاهی ثبت نشده است"
                description="هنوز فهرست دستگاه‌های این گیمنت ثبت یا دریافت نشده است."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                      <th className="py-2.5 px-3">نام دستگاه</th>
                      <th className="py-2.5 px-3">نوع / دسته</th>
                      <th className="py-2.5 px-3">تعرفه ساعتی</th>
                      <th className="py-2.5 px-3">ظرفیت</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {stations.map((st) => (
                      <tr key={st.id} className="hover:bg-[var(--foreground)]/10">
                        <td className="py-3 px-3 font-bold text-[var(--text-white)]">{st.name}</td>
                        <td className="py-3 px-3 text-[var(--text-muted)]">
                          {st.deviceTypeName || st.type || "-"}
                        </td>
                        <td className="py-3 px-3 font-bold text-[var(--text-white)]">
                          {typeof st.hourlyRate === "number"
                            ? `${st.hourlyRate.toLocaleString("fa-IR")} تومان`
                            : "-"}
                        </td>
                        <td className="py-3 px-3 text-[var(--text-white)]">
                          {typeof st.capacity === "number" ? `${st.capacity} نفر` : "-"}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={st.isActive !== false ? "success" : "danger"}>
                            {st.isActive !== false ? "فعال" : "غیرفعال"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: Media & Gallery */}
        {activeTab === "media" && (
          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Icon name="image" size={18} className="text-[var(--primary)]" />
                <h2 className="text-section-title text-[var(--text-white)]">
                  تصاویر و رسانه‌های گیمنت ({mediaItems.length.toLocaleString("fa-IR")})
                </h2>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsMediaModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Icon name="upload" size={16} />
                <span>آپلود و مدیریت تصاویر</span>
              </Button>
            </div>

            {mediaItems.length === 0 ? (
              <EmptyState
                title="تصویری ثبت نشده است"
                description="از دکمه بالا برای بارگذاری لوگو، کاور یا تصاویر گالری استفاده کنید."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaItems.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[var(--foreground)]/10 flex flex-col"
                  >
                    <div className="relative aspect-video w-full bg-[var(--foreground)]/30 overflow-hidden">
                      <AppImage
                        src={normalizeMediaUrl(m.url)}
                        alt={m.altText || gc.name}
                        className="w-full h-full object-cover"
                        objectFit="cover"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/75 text-white">
                        {m.purpose === "COVER"
                          ? "کاور"
                          : m.purpose === "LOGO"
                            ? "لوگو"
                            : "گالری"}
                      </span>
                    </div>
                    <div className="p-2.5 text-xs text-[var(--text-muted)] truncate">
                      {m.altText || "بدون عنوان"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: Reservations */}
        {activeTab === "reservations" && (
          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <Icon name="calendar" size={18} className="text-[var(--primary)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                سوابق رزروهای مرکز ({reservations.length.toLocaleString("fa-IR")})
              </h2>
            </div>

            {reservations.length === 0 ? (
              <EmptyState
                title="رزروی ثبت نشده است"
                description="هیچ سابقه رزروی برای این مرکز در سیستم یافت نشد."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                      <th className="py-2.5 px-3">کد رزرو</th>
                      <th className="py-2.5 px-3">کاربر</th>
                      <th className="py-2.5 px-3">دستگاه</th>
                      <th className="py-2.5 px-3">تاریخ و سانس</th>
                      <th className="py-2.5 px-3">مبلغ</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-[var(--foreground)]/10">
                        <td className="py-3 px-3 font-bold text-[var(--primary)] dir-ltr text-right">
                          #{res.reservationCode}
                        </td>
                        <td className="py-3 px-3 text-[var(--text-white)]">
                          {res.userId ? (
                            <Link
                              href={`/admin/users/${res.userId}`}
                              className="hover:text-[var(--primary)] transition-colors"
                            >
                              کاربر #{res.userId}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-3 text-[var(--text-white)]">{res.deviceName}</td>
                        <td className="py-3 px-3 text-[var(--text-white)]">
                          {res.date} • {res.timeSlot}
                        </td>
                        <td className="py-3 px-3 font-bold text-[var(--text-white)]">
                          {Number(res.amount ?? 0).toLocaleString("fa-IR")} تومان
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              res.status === "CONFIRMED" || res.status === "COMPLETED"
                                ? "success"
                                : res.status === "PENDING"
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {res.status === "CONFIRMED"
                              ? "تأیید شده"
                              : res.status === "COMPLETED"
                                ? "تکمیل شده"
                                : res.status === "PENDING"
                                  ? "در انتظار"
                                  : "لغو شده"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: Reviews */}
        {activeTab === "reviews" && (
          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <RatingHeartIcon size={18} />
              <h2 className="text-section-title text-[var(--text-white)]">
                نظرات ثبت‌شده کاربران ({reviews.length.toLocaleString("fa-IR")})
              </h2>
            </div>

            {reviews.length === 0 ? (
              <EmptyState
                title="نظری ثبت نشده است"
                description="هنوز نظری توسط کاربران برای این گیمنت ثبت نگردیده است."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[var(--text-white)]">
                        {r.userName}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-[var(--text-white)]">
                        <RatingHeartIcon size={14} />
                        <span>{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-white)] leading-relaxed">{r.comment}</p>
                    <span className="text-[11px] text-[var(--text-subtle)]">{r.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 6: Support Tickets */}
        {activeTab === "tickets" && (
          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Icon name="ticket" size={18} className="text-[var(--primary)]" />
                <h2 className="text-section-title text-[var(--text-white)]">
                  تیکت‌های پشتیبانی مرتبط ({tickets.length.toLocaleString("fa-IR")})
                </h2>
              </div>
              <Link
                href={`/admin/tickets?gamecenterId=${gc.id}`}
                className="text-xs font-bold text-[var(--primary)] hover:underline"
              >
                مشاهده در بخش تیکت‌ها
              </Link>
            </div>

            {tickets.length === 0 ? (
              <EmptyState
                title="تیکتی یافت نشد"
                description="تاکنون هیچ تیکت پشتیبانی برای این گیمنت ثبت نشده است."
              />
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm text-[var(--text-white)]">
                        {t.subject}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ارسال کننده: {t.userName || "ناشناس"} • تاریخ: {t.createdAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          t.status === "OPEN"
                            ? "danger"
                            : t.status === "ANSWERED"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {t.status === "OPEN"
                          ? "باز / جدید"
                          : t.status === "ANSWERED"
                            ? "پاسخ داده شده"
                            : t.status === "CLOSED"
                              ? "بسته شده"
                              : "در حال بررسی"}
                      </Badge>
                      <Link
                        href={`/admin/tickets?ticketId=${t.id}`}
                        className="text-xs font-bold text-[var(--primary)] hover:underline"
                      >
                        مشاهده تیکت
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Edit Form Modal */}
      <GamecenterFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={gc}
        onSuccess={() => {
          showFeedback("success", "تغییرات گیمنت با موفقیت ذخیره شد.");
          loadData();
        }}
      />

      {/* Media Management Modal */}
      <GamecenterMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        gamecenter={gc}
        onUpdated={loadData}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemTitle={gc.name}
        itemType="gamecenter"
        relatedInfo={{
          ticketsCount: tickets.length,
          reviewsCount: reviews.length,
          reservationsCount: reservations.length,
        }}
        onConfirm={handleDeleteConfirm}
      />
    </AdminPageContainer>
  );
}
