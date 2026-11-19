"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SafeImage } from "@/components/ui/SafeImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { cleanPhoneNumber, isValidIranPhone, toPersianDigits } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import { formatClock, formatDayLabel, getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { VerificationStatus } from "@/types/owner";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // ۵ مگابایت مطابق قرارداد OpenAPI

function formatPersianDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const day = formatDayLabel(iso);
  const clock = formatClock(iso, true);
  if (day && clock) return `${day} • ساعت ${clock}`;
  return day || clock || "—";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${toPersianDigits(kb)} کیلوبایت`;
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  return `${toPersianDigits(mb)} مگابایت`;
}

function getStatusBadge(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success">تایید شده</Badge>;
    case "PENDING":
      return <Badge variant="warning">در حال انتظار</Badge>;
    case "REJECTED":
      return <Badge variant="danger">لغو شده</Badge>;
    case "NOT_SUBMITTED":
    default:
      return <Badge variant="neutral">ثبت نشده</Badge>;
  }
}

export default function OwnerVerificationPage() {
  const {
    me,
    centerId,
    center,
    isCenterLoading,
    verificationStatus,
    verificationInfo,
    isVerificationLoading,
    verificationError,
    refreshVerification,
    applyVerificationSubmission,
  } = useOwner();

  const latest = verificationInfo?.latestVerification ?? null;

  // فیلدهای فرم مطابق با SubmitVerificationInput در OpenAPI (با مقدار پیش‌فرض مشتق‌شده)
  const [ownerFullNameDraft, setOwnerFullNameDraft] = useState<string | null>(null);
  const [phoneNumberDraft, setPhoneNumberDraft] = useState<string | null>(null);
  const [gamingCenterNameDraft, setGamingCenterNameDraft] = useState<string | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const ownerFullName =
    ownerFullNameDraft ?? (latest?.ownerFullName || me?.fullName || "");
  const phoneNumber =
    phoneNumberDraft ?? (latest?.phoneNumber || me?.phone || "");
  const gamingCenterName =
    gamingCenterNameDraft ??
    (latest?.gamingCenterName || verificationInfo?.name || center?.name || "");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // مدیریت Object URL برای پیش‌نمایش تصویر انتخاب‌شده
  const licensePreviewUrl = React.useMemo(
    () => (licenseFile ? URL.createObjectURL(licenseFile) : ""),
    [licenseFile]
  );

  useEffect(() => {
    if (!licensePreviewUrl) return;
    return () => {
      URL.revokeObjectURL(licensePreviewUrl);
    };
  }, [licensePreviewUrl]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshVerification();
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("لطفاً فقط فایل تصویر (JPG، PNG یا WEBP) مربوط به پروانه کسب را انتخاب کنید.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFormError("حجم تصویر پروانه کسب نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }

    setFormError(null);
    setLicenseFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !centerId) return;

    const trimmedName = ownerFullName.trim();
    const cleanedPhone = cleanPhoneNumber(phoneNumber);
    const trimmedCenterName = gamingCenterName.trim();

    if (trimmedName.length < 2) {
      setFormError("نام و نام خانوادگی را به‌صورت کامل وارد کنید (حداقل ۲ کاراکتر).");
      return;
    }
    if (!isValidIranPhone(cleanedPhone)) {
      setFormError("شماره موبایل معتبر وارد کنید (مثلاً 09123456789).");
      return;
    }
    if (trimmedCenterName.length < 2) {
      setFormError("نام گیم‌نت را وارد کنید (حداقل ۲ کاراکتر).");
      return;
    }
    if (!licenseFile) {
      setFormError("لطفاً تصویر پروانه کسب گیم‌نت را انتخاب و آپلود کنید.");
      return;
    }

    setFormError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await ownerService.submitVerification(centerId, {
        ownerFullName: trimmedName,
        phoneNumber: cleanedPhone,
        gamingCenterName: trimmedCenterName,
        businessLicense: licenseFile,
      });

      applyVerificationSubmission(result);
      setLicenseFile(null);
      setSubmitSuccess(
        result.message ||
          "درخواست احراز هویت با موفقیت ارسال شد و اکنون در وضعیت «در حال انتظار» قرار دارد."
      );
      await refreshVerification();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!centerId && !isCenterLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
        <OwnerPageHeader title="احراز هویت گیم‌نت" backUrl="/owner" isSubpage />
        <main className="mx-auto mt-16 flex w-full max-w-[var(--max-mini-app-width)] flex-1 flex-col px-4 py-8 lg:px-0">
          <EmptyState
            title="گیم‌نتی یافت نشد"
            description="ابتدا گیم‌نت خود را ایجاد کنید، سپس از این بخش درخواست احراز هویت را ثبت نمایید."
          />
        </main>
      </div>
    );
  }

  const showForm =
    verificationStatus === "NOT_SUBMITTED" || verificationStatus === "REJECTED";
  const isApproved = verificationStatus === "APPROVED";
  const isPending = verificationStatus === "PENDING";
  const isRejected = verificationStatus === "REJECTED";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-14 text-[var(--text-white)]">
      <OwnerPageHeader title="احراز هویت گیم‌نت" backUrl="/owner" isSubpage />

      <main className="mx-auto mt-16 flex w-full max-w-[var(--max-mini-app-width)] flex-1 flex-col gap-5 px-4 py-5 lg:px-0">
        {/* کارت وضعیت کلی فعال‌سازی گیم‌نت */}
        <section className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${
                  isApproved
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : isPending
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      : "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/30 text-[var(--accent-red)]"
                }`}
              >
                <Icon
                  name={
                    isApproved
                      ? "check"
                      : isPending
                        ? "clock"
                        : isRejected
                          ? "alert"
                          : "shield"
                  }
                  size={22}
                />
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--text-white)]">
                    {isApproved
                      ? "گیم‌نت شما فعال و تایید شده است"
                      : isPending
                        ? "گیم‌نت غیرفعال • درخواست در حال انتظار بررسی"
                        : isRejected
                          ? "گیم‌نت غیرفعال • درخواست احراز هویت لغو شده است"
                          : "گیم‌نت غیرفعال • در انتظار ارسال احراز هویت"}
                  </h2>
                  {getStatusBadge(verificationStatus)}
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {isApproved
                    ? "احراز هویت این گیم‌نت توسط ادمین تایید شده و صفحه گیم‌نت به‌صورت عمومی برای کاربران و رزرو آنلاین در دسترس است."
                    : isPending
                      ? "درخواست احراز هویت شما ثبت شده است و تا زمان تایید ادمین، گیم‌نت برای کاربران نمایش داده نمی‌شود. در این فاصله می‌توانید دستگاه‌ها، بازی‌ها، آدرس و تخفیف‌های خود را تکمیل کنید."
                      : isRejected
                        ? "درخواست قبلی شما توسط ادمین لغو (رد) شده است. دلیل لغو را در زیر مشاهده کنید و پس از اصلاح، درخواست جدید ارسال نمایید."
                        : "هر گیم‌نت پس از ایجاد، تا زمان تایید احراز هویت به‌صورت غیرفعال است و برای کاربران نمایش داده نمی‌شود. با تکمیل فرم زیر، درخواست خود را برای بررسی ادمین ارسال کنید."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isVerificationLoading || isRefreshing}
              className="h-9 px-3 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 hover:bg-[var(--foreground)]/50 text-xs font-bold text-[var(--text-white)] transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span
                className={`inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full ${
                  isVerificationLoading || isRefreshing ? "animate-spin" : "hidden"
                }`}
              />
              <span>بروزرسانی وضعیت</span>
            </button>
          </div>

          {/* دلیل لغو توسط ادمین در صورت REJECTED */}
          {isRejected && (verificationInfo?.rejectionReason || latest?.rejectionReason) && (
            <div
              role="alert"
              className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3.5 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-red)]">
                <Icon name="alert" size={16} />
                <span>دلیل لغو درخواست توسط ادمین:</span>
              </div>
              <p className="text-xs text-[var(--text-white)] leading-relaxed pr-5">
                {verificationInfo?.rejectionReason || latest?.rejectionReason}
              </p>
              {latest?.reviewedAt && (
                <span className="text-[11px] text-[var(--text-muted)] pr-5">
                  تاریخ بررسی: {formatPersianDateTime(latest.reviewedAt)}
                </span>
              )}
            </div>
          )}

          {/* تاریخ تایید در صورت APPROVED */}
          {isApproved && (verificationInfo?.verifiedAt || latest?.reviewedAt) && (
            <div className="rounded-card border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Icon name="check" size={16} />
              <span>
                تاریخ تایید نهایی:{" "}
                <strong className="font-bold">
                  {formatPersianDateTime(verificationInfo?.verifiedAt || latest?.reviewedAt)}
                </strong>
              </span>
            </div>
          )}

          {verificationError && (
            <div
              role="alert"
              className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold text-[var(--accent-red)]"
            >
              {verificationError}
            </div>
          )}
        </section>

        {isVerificationLoading && !verificationInfo && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-64 rounded-card" />
          </div>
        )}

        {submitSuccess && (
          <div
            role="status"
            className="rounded-card border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 flex items-center gap-2"
          >
            <Icon name="check" size={18} />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* فرم ثبت درخواست احراز هویت (فقط زمانی که ثبت نشده یا رد/لغو شده باشد) */}
        {showForm && (
          <section className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-white)]">
                {isRejected
                  ? "ارسال مجدد درخواست احراز هویت"
                  : "فرم ثبت درخواست احراز هویت گیم‌نت"}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                لطفاً مشخصات مالک یا مدیر گیم‌نت و تصویر خوانای پروانه کسب را وارد و ارسال کنید.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3.5 text-xs font-bold text-[var(--accent-red)] flex items-start gap-2"
              >
                <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="نام و نام خانوادگی"
                  value={ownerFullName}
                  onChange={(e) => setOwnerFullNameDraft(e.target.value)}
                  placeholder="مثلاً: علی رضایی"
                  disabled={isSubmitting}
                  required
                />

                <Input
                  label="شماره موبایل"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumberDraft(e.target.value)}
                  placeholder="09123456789"
                  inputMode="tel"
                  dir="ltr"
                  className="text-left"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Input
                label="نام گیم‌نت"
                value={gamingCenterName}
                onChange={(e) => setGamingCenterNameDraft(e.target.value)}
                placeholder="مثلاً: گیم‌نت شتاب"
                disabled={isSubmitting}
                required
              />

              {/* آپلود فایل تصویر پروانه کسب */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  تصویر پروانه کسب گیم‌نت (حداکثر ۵ مگابایت)
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />

                {!licenseFile ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-32 w-full rounded-card border-2 border-dashed border-[var(--border-subtle)] bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/30 hover:border-[var(--primary)]/60 transition-colors p-4 flex flex-col items-center justify-center gap-2 text-center disabled:opacity-50"
                  >
                    <div className="w-11 h-11 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                      <Icon name="upload" size={22} />
                    </div>
                    <span className="text-xs font-bold text-[var(--primary)]">
                      انتخاب عکس پروانه کسب از فایل‌ها
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      فرمت‌های مجاز: JPG، PNG، WEBP • حداکثر حجم ۵ مگابایت
                    </span>
                  </button>
                ) : (
                  <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3 flex flex-col sm:flex-row items-center gap-4">
                    {licensePreviewUrl && (
                      <div className="w-full sm:w-36 h-28 rounded-card overflow-hidden bg-black/40 border border-[var(--border-subtle)] shrink-0 flex items-center justify-center">
                        <SafeImage
                          src={licensePreviewUrl}
                          alt="پیش‌نمایش پروانه کسب"
                          fallbackSrc={PLACEHOLDERS.gallery}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-1 w-full">
                      <span className="text-xs font-bold text-[var(--text-white)] truncate">
                        {licenseFile.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        حجم فایل: {formatFileSize(licenseFile.size)}
                      </span>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 px-3 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] transition-colors"
                        >
                          تغییر تصویر
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setLicenseFile(null)}
                          className="h-9 px-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-colors"
                        >
                          حذف انتخاب
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1"
                >
                  {isRejected ? "ارسال مجدد درخواست احراز هویت" : "ارسال درخواست احراز هویت"}
                </Button>
                <Link href="/owner" className="w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    بازگشت به پنل
                  </Button>
                </Link>
              </div>
            </form>
          </section>
        )}

        {/* نمایش درخواست ارسال‌شده در زیر (بدون امکان ویرایش یا حذف) */}
        {latest && (
          <section
            aria-label="جزئیات درخواست احراز هویت ثبت‌شده"
            className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Icon name="file" size={18} className="text-[var(--primary)]" />
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-white)]">
                  درخواست احراز هویت ثبت‌شده
                </h3>
              </div>
              {getStatusBadge(latest.status || verificationStatus)}
            </div>

            {isPending && (
              <div className="rounded-card border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
                <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                <span>
                  درخواست شما با وضعیت «در حال انتظار» ثبت شده است و تا زمان بررسی ادمین امکان ویرایش یا حذف آن وجود ندارد.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] p-3 flex flex-col gap-1">
                <span className="text-[var(--text-muted)]">نام و نام خانوادگی</span>
                <span className="font-bold text-[var(--text-white)]">
                  {latest.ownerFullName || "—"}
                </span>
              </div>

              <div className="rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] p-3 flex flex-col gap-1">
                <span className="text-[var(--text-muted)]">شماره موبایل</span>
                <span className="font-bold text-[var(--text-white)] dir-ltr text-right">
                  {latest.phoneNumber || "—"}
                </span>
              </div>

              <div className="rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] p-3 flex flex-col gap-1">
                <span className="text-[var(--text-muted)]">نام گیم‌نت</span>
                <span className="font-bold text-[var(--text-white)]">
                  {latest.gamingCenterName || verificationInfo?.name || center?.name || "—"}
                </span>
              </div>

              <div className="rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] p-3 flex flex-col gap-1">
                <span className="text-[var(--text-muted)]">تاریخ ثبت درخواست</span>
                <span className="font-bold text-[var(--text-white)]">
                  {formatPersianDateTime(latest.createdAt)}
                </span>
              </div>
            </div>

            {latest.businessLicenseUrl && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  تصویر پروانه کسب ارسال‌شده
                </span>
                <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(latest.businessLicenseUrl)}
                    className="relative w-full sm:w-48 h-32 rounded-card overflow-hidden bg-black/40 border border-[var(--border-subtle)] group shrink-0"
                  >
                    <SafeImage
                      src={latest.businessLicenseUrl}
                      alt="تصویر پروانه کسب ارسال‌شده"
                      fallbackSrc={PLACEHOLDERS.gallery}
                      className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                      بزرگ‌نمایی تصویر
                    </span>
                  </button>

                  <div className="flex flex-col gap-2 w-full">
                    <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                      فایل پروانه کسب به همراه درخواست شما ذخیره شده است.
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewModalUrl(latest.businessLicenseUrl)}
                        className="h-9 px-3 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] transition-colors"
                      >
                        مشاهده تصویر
                      </button>
                      <a
                        href={latest.businessLicenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs font-bold text-[var(--primary)] hover:border-[var(--primary)] transition-colors inline-flex items-center gap-1"
                      >
                        <span>باز کردن در تب جدید</span>
                        <Icon name="external-link" size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {latest.status === "REJECTED" && latest.rejectionReason && (
              <div className="rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs text-[var(--accent-red)] leading-relaxed">
                <strong>دلیل لغو: </strong>
                <span className="text-[var(--text-white)]">{latest.rejectionReason}</span>
              </div>
            )}
          </section>
        )}
      </main>

      {/* مودال پیش‌نمایش تصویر پروانه کسب */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="پیش‌نمایش تصویر پروانه کسب"
            className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-4 max-w-2xl w-full max-h-[85vh] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-sm font-bold text-[var(--text-white)]">
                تصویر پروانه کسب
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                aria-label="بستن پیش‌نمایش"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/40 rounded-card p-2">
              <SafeImage
                src={previewModalUrl}
                alt="پیش‌نمایش پروانه کسب"
                fallbackSrc={PLACEHOLDERS.gallery}
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
