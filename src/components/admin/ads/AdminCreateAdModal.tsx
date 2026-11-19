"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { AdminGamecenter } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { PLACEHOLDERS, normalizeMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/format";

interface AdminCreateAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  onPartialCreated?: () => void;
}

type DestinationMode = "CUSTOM" | "GAMECENTER" | "CATEGORY" | "NONE";

const ALLOWED_IMAGE_EXTENSIONS = /\.(avif|webp|png|jpe?g|gif|svg)$/i;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const DURATION_PRESETS = [
  { days: 7, label: "۷ روز" },
  { days: 14, label: "۱۴ روز" },
  { days: 30, label: "۳۰ روز" },
  { days: 60, label: "۶۰ روز" },
  { days: 90, label: "۹۰ روز" },
];

const DEVICE_CATEGORIES = [
  { id: "PC", label: "کامپیوتر گیمینگ (PC)" },
  { id: "PLAYSTATION", label: "پلی‌استیشن" },
  { id: "XBOX", label: "ایکس‌باکس" },
  { id: "VR", label: "واقعیت مجازی (VR)" },
  { id: "SWITCH", label: "نینتندو سوییچ" },
];

function isSupportedImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  return ALLOWED_IMAGE_EXTENSIONS.test(file.name);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`;
  return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export const AdminCreateAdModal: React.FC<AdminCreateAdModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onPartialCreated,
}) => {
  const [gamecenters, setGamecenters] = useState<AdminGamecenter[]>([]);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcError, setGcError] = useState<string | null>(null);

  const [destinationMode, setDestinationMode] = useState<DestinationMode>("CUSTOM");
  const [gamingCenterId, setGamingCenterId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("PC");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [priority, setPriority] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    size: number;
    previewUrl: string;
  } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [submitStep, setSubmitStep] = useState<"creating" | "approving" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = submitStep !== null;

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let active = true;

    const loadCenters = async () => {
      await Promise.resolve();
      if (!active || controller.signal.aborted) return;

      setGcLoading(true);
      setGcError(null);

      try {
        const res = await adminService.getGamecenters(
          { pageSize: 100 },
          controller.signal
        );
        if (!active || controller.signal.aborted) return;
        setGamecenters(res.items);
      } catch (err: unknown) {
        if (!active || controller.signal.aborted) return;
        setGamecenters([]);
        setGcError((err as Error)?.message || "خطا در دریافت لیست گیمنت‌ها");
      } finally {
        if (active && !controller.signal.aborted) {
          setGcLoading(false);
        }
      }
    };

    void loadCenters();

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (selectedFileMeta?.previewUrl) {
        URL.revokeObjectURL(selectedFileMeta.previewUrl);
      }
    };
  }, [selectedFileMeta]);

  const clearPreview = () => {
    if (selectedFileMeta?.previewUrl) {
      URL.revokeObjectURL(selectedFileMeta.previewUrl);
    }
    setSelectedFileMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setDestinationMode("CUSTOM");
    setGamingCenterId("");
    setSelectedCategory("PC");
    setTitle("");
    setDescription("");
    setBannerUrl("");
    setDestinationUrl("");
    setDurationDays("30");
    setPriority("0");
    setStartDate("");
    setEndDate("");
    setAdminNote("");
    setShowUrlInput(false);
    setShowAdvanced(false);
    setIsDragging(false);
    setErrorMessage(null);
    setSubmitStep(null);
    clearPreview();
  };

  const handleClose = () => {
    if (isSubmitting || isUploading) return;
    resetForm();
    onClose();
  };

  const handleModeChange = (mode: DestinationMode) => {
    setDestinationMode(mode);
    setErrorMessage(null);
    if (mode === "CATEGORY") {
      setDestinationUrl(`/gamecenters?device=${selectedCategory}`);
    } else if (mode === "NONE") {
      setDestinationUrl("");
      setGamingCenterId("");
    } else if (mode === "GAMECENTER") {
      if (gamingCenterId) {
        const gc = gamecenters.find((g) => g.id === gamingCenterId);
        if (gc) setDestinationUrl(`/gamecenter/${gc.slug || gc.id}`);
      } else {
        setDestinationUrl("");
      }
    } else if (mode === "CUSTOM") {
      if (
        destinationUrl.startsWith("/gamecenters?device=") ||
        destinationUrl.startsWith("/gamecenter/")
      ) {
        setDestinationUrl("");
      }
    }
  };

  const handleSelectGamecenter = (id: string) => {
    setGamingCenterId(id);
    setErrorMessage(null);
    const gc = gamecenters.find((g) => g.id === id);
    if (gc && destinationMode === "GAMECENTER") {
      setDestinationUrl(`/gamecenter/${gc.slug || gc.id}`);
    }
  };

  const processFileUpload = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      setErrorMessage(
        "فرمت فایل انتخابی پشتیبانی نمی‌شود. فرمت‌های مجاز: AVIF، WebP، PNG، JPG"
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("حجم تصویر بنر نباید بیشتر از ۱۰ مگابایت باشد.");
      return;
    }

    clearPreview();
    const previewUrl = URL.createObjectURL(file);
    setSelectedFileMeta({
      name: file.name,
      size: file.size,
      previewUrl,
    });

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadedUrl = await adminService.uploadAdBanner(gamingCenterId, file);
      setBannerUrl(uploadedUrl);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "خطا در آپلود تصویر بنر.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading || isSubmitting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!bannerUrl.trim()) {
      setErrorMessage("لطفاً ابتدا تصویر بنر را آپلود کنید یا لینک تصویر را وارد نمایید.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("عنوان تبلیغ را وارد کنید.");
      return;
    }

    if (destinationMode === "GAMECENTER" && !gamingCenterId) {
      setErrorMessage("لطفاً گیمنت مورد نظر را انتخاب کنید.");
      return;
    }

    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1) {
      setErrorMessage("مدت اعتبار تبلیغ باید حداقل ۱ روز باشد.");
      return;
    }

    try {
      await adminService.createApprovedAd({
        gamingCenterId: gamingCenterId.trim() || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        bannerUrl: bannerUrl.trim(),
        destinationUrl:
          destinationMode === "NONE" ? undefined : destinationUrl.trim() || undefined,
        durationDays: days,
        priority: Number(priority) || 0,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        adminNote: adminNote.trim() || "ایجاد و تأیید خودکار توسط ادمین",
        onProgress: (step) => setSubmitStep(step),
      });

      resetForm();
      onCreated();
      onClose();
    } catch (err: unknown) {
      const anyErr = err as Error & { createdAdId?: string };
      if (anyErr?.createdAdId) {
        onPartialCreated?.();
      }
      setErrorMessage(anyErr?.message || "خطا در ثبت و انتشار تبلیغ.");
    } finally {
      setSubmitStep(null);
    }
  };

  const activePreviewSrc = bannerUrl.trim()
    ? normalizeMediaUrl(bannerUrl.trim())
    : selectedFileMeta?.previewUrl || "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="افزودن و انتشار فوری بنر تبلیغاتی"
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-card bg-accent-red/15 border border-accent-red/30 text-accent-red text-xs font-bold flex items-start gap-2.5 leading-relaxed"
          >
            <Icon name="alert" size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Banner Image Upload + Live Preview */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-text-white flex items-center gap-1.5">
              <Icon name="image" size={16} className="text-primary" />
              <span>تصویر بنر (پیش‌نمایش اسلایدر صفحه اصلی)</span>
              <span className="text-accent-red">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowUrlInput((prev) => !prev)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              {showUrlInput ? "بستن فیلد لینک مستقیم" : "یا وارد کردن لینک مستقیم تصویر"}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.avif,.webp,.png,.jpg,.jpeg"
            onChange={handleBannerFileChange}
            className="hidden"
          />

          {activePreviewSrc ? (
            <div className="rounded-card border border-border bg-body-bg overflow-hidden">
              <div className="relative aspect-[2.4/1] w-full bg-black/50">
                <SafeImage
                  src={activePreviewSrc}
                  fallbackSrc={PLACEHOLDERS.banner}
                  alt={title || "پیش‌نمایش بنر تبلیغاتی"}
                  className="w-full h-full object-cover"
                />

                {isUploading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white">
                    <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs font-bold">در حال آپلود تصویر در سرور...</span>
                  </div>
                )}

                {!isUploading && bannerUrl && (
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 border border-accent-green/40 text-accent-green text-[11px] font-bold flex items-center gap-1">
                    <Icon name="check" size={12} />
                    <span>آماده انتشار</span>
                  </div>
                )}
              </div>

              <div className="px-3.5 py-2.5 bg-foreground/20 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-xs text-text-muted">
                  <Icon name="file" size={14} className="text-primary shrink-0" />
                  <span className="truncate font-medium text-text-white">
                    {selectedFileMeta ? selectedFileMeta.name : "تصویر بنر انتخاب‌شده"}
                  </span>
                  {selectedFileMeta && (
                    <span className="text-[11px] text-text-subtle shrink-0">
                      ({formatFileSize(selectedFileMeta.size)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isSubmitting}
                  >
                    <Icon name="upload" size={14} />
                    <span>تغییر تصویر</span>
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setBannerUrl("");
                      clearPreview();
                    }}
                    disabled={isUploading || isSubmitting}
                  >
                    <Icon name="trash" size={14} />
                    <span>حذف</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => !isUploading && !isSubmitting && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isUploading && !isSubmitting) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`rounded-card border-2 border-dashed p-6 sm:p-8 transition-all flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border-subtle bg-foreground/20 hover:border-primary/60 hover:bg-foreground/30"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="upload" size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-text-white">
                  تصویر بنر را اینجا بکشید یا کلیک کنید
                </span>
                <span className="text-xs text-text-muted">
                  پشتیبانی کامل از فرمت‌های{" "}
                  <span className="text-primary font-bold">AVIF، WebP</span>، PNG و JPG (حداکثر ۱۰ مگابایت)
                </span>
              </div>
              <span className="text-[11px] text-text-subtle bg-body-bg/70 px-3 py-1 rounded-full border border-border-subtle">
                ابعاد پیشنهادی اسلایدر: نسبت ۳ به ۱ (مثلاً ۱۸۰۰×۶۰۰ پیکسل)
              </span>
            </div>
          )}

          {showUrlInput && (
            <Input
              label="آدرس مستقیم تصویر بنر"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://... یا /uploads/..."
              dir="ltr"
            />
          )}
        </div>

        {/* 2. Title & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="عنوان بنر *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: جشنواره تخفیف تابستانی سایرا"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">مدت زمان انتشار (روز) *</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {DURATION_PRESETS.map((preset) => {
                const active = Number(durationDays) === preset.days;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setDurationDays(String(preset.days))}
                    className={`h-11 px-3 rounded-card text-xs font-bold transition-colors cursor-pointer border ${
                      active
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-foreground/30 text-text-white border-border-subtle hover:border-primary/60"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <input
                type="number"
                min={1}
                aria-label="تعداد روز دلخواه"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="h-11 w-20 px-2.5 rounded-card bg-foreground/40 border border-border-subtle text-sm text-center text-text-white outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 3. Destination Mode */}
        <div className="flex flex-col gap-2.5 p-3.5 rounded-card bg-foreground/15 border border-border-subtle">
          <label className="text-xs font-bold text-text-white">مقصد کلیک روی بنر</label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-card bg-body-bg/60 border border-border-subtle">
            {[
              { id: "CUSTOM", label: "لینک دلخواه" },
              { id: "GAMECENTER", label: "صفحه یک گیمنت" },
              { id: "CATEGORY", label: "دسته‌بندی دستگاه" },
              { id: "NONE", label: "بدون لینک" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModeChange(item.id as DestinationMode)}
                className={`py-2 px-2.5 rounded-child text-xs font-bold transition-colors cursor-pointer ${
                  destinationMode === item.id
                    ? "bg-primary text-on-primary"
                    : "text-text-muted hover:text-text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {destinationMode === "CUSTOM" && (
            <div className="flex flex-col gap-2">
              <Input
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="/gamecenters یا https://..."
                dir="ltr"
              />
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-text-subtle">پیشنهاد سریع:</span>
                {[
                  { label: "لیست گیمنت‌ها", url: "/gamecenters" },
                  { label: "وبلاگ و اخبار", url: "/blog" },
                  { label: "ثبت گیمنت", url: "/register-gamecenter" },
                ].map((quick) => (
                  <button
                    key={quick.url}
                    type="button"
                    onClick={() => setDestinationUrl(quick.url)}
                    className="px-2 py-1 rounded-full bg-foreground/40 hover:bg-foreground/70 text-text-muted hover:text-text-white transition-colors cursor-pointer"
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {destinationMode === "GAMECENTER" && (
            <div className="flex flex-col gap-2">
              {gcLoading ? (
                <div className="h-11 rounded-card bg-foreground/30 border border-border-subtle px-3 flex items-center text-xs text-text-muted">
                  در حال دریافت لیست گیمنت‌ها...
                </div>
              ) : gcError ? (
                <div className="p-3 rounded-card bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red">
                  {gcError}
                </div>
              ) : (
                <SearchableSelect
                  options={gamecenters.map((gc) => ({
                    value: gc.id,
                    label: `${gc.name} (${gc.slug})`,
                  }))}
                  value={gamingCenterId}
                  onChange={handleSelectGamecenter}
                  placeholder="انتخاب گیمنت هدف..."
                  searchPlaceholder="جستجو نام یا اسلاگ گیمنت..."
                />
              )}
              {destinationUrl && (
                <span className="text-[11px] text-primary font-mono dir-ltr text-right">
                  {destinationUrl}
                </span>
              )}
            </div>
          )}

          {destinationMode === "CATEGORY" && (
            <div className="flex flex-wrap gap-2">
              {DEVICE_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setDestinationUrl(`/gamecenters?device=${cat.id}`);
                    }}
                    className={`px-3 py-2 rounded-card text-xs font-bold border transition-colors cursor-pointer ${
                      active
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-foreground/30 border-border-subtle text-text-muted hover:text-text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {destinationMode === "NONE" && (
            <p className="text-xs text-text-muted">
              این بنر صرفاً جهت اطلاع‌رسانی در اسلایدر نمایش داده می‌شود و با کلیک روی آن به صفحه‌ای هدایت نمی‌شود.
            </p>
          )}
        </div>

        {/* 4. Short Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-text-muted">
            توضیحات کوتاه یا متن جایگزین بنر (اختیاری)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="توضیحات کوتاه جهت یادآوری کمپین یا متن جایگزین تصویر..."
            className="w-full p-3 rounded-card bg-foreground/40 border border-border-subtle text-xs text-text-white placeholder:text-text-subtle outline-none focus:border-primary resize-none"
          />
        </div>

        {/* 5. Collapsible Advanced Settings */}
        <div className="rounded-card border border-border-subtle overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full px-4 py-3 bg-foreground/20 hover:bg-foreground/30 flex items-center justify-between text-xs font-bold text-text-white transition-colors cursor-pointer"
          >
            <span>تنظیمات پیشرفته (اولویت نمایش، بازه تاریخ و یادداشت)</span>
            <Icon
              name="chevron"
              size={16}
              className={`text-text-muted transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
          </button>

          {showAdvanced && (
            <div className="p-4 flex flex-col gap-4 bg-body-bg/40 border-t border-border-subtle">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="اولویت نمایش"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  helperText="عدد بالاتر یعنی نمایش زودتر"
                />
                <Input
                  label="تاریخ شروع (اختیاری)"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="تاریخ پایان (اختیاری)"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {destinationMode !== "GAMECENTER" && !gcLoading && gamecenters.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-text-muted">
                    اتصال اختیاری به یک گیمنت (در صورت نیاز)
                  </label>
                  <SearchableSelect
                    options={[
                      { value: "", label: "بدون اتصال به گیمنت خاص (بنر سراسری)" },
                      ...gamecenters.map((gc) => ({
                        value: gc.id,
                        label: `${gc.name} (${gc.slug})`,
                      })),
                    ]}
                    value={gamingCenterId}
                    onChange={(id) => setGamingCenterId(id)}
                    placeholder="انتخاب اختیاری گیمنت..."
                    searchPlaceholder="جستجوی گیمنت..."
                  />
                </div>
              )}

              <Input
                label="یادداشت مدیریتی (اختیاری)"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="مثال: بنر کمپین پاییز با تأیید مدیر"
              />
            </div>
          )}
        </div>

        {/* 6. Two-step Progress Indicator while submitting */}
        {isSubmitting && (
          <div className="p-3.5 rounded-card bg-primary/10 border border-primary/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              <span>
                {submitStep === "creating"
                  ? "مرحله ۱ از ۲: در حال ارسال درخواست تبلیغ ادمین..."
                  : "مرحله ۲ از ۲: در حال ارسال درخواست تأیید خودکار و انتشار بنر..."}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  submitStep === "creating" || submitStep === "approving"
                    ? "bg-primary"
                    : "bg-foreground"
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  submitStep === "approving" ? "bg-primary" : "bg-foreground/40"
                }`}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-1.5 text-xs text-accent-green font-medium">
            <Icon name="check" size={15} className="shrink-0" />
            <span>درخواست ثبت و بلافاصله به‌صورت خودکار تأیید و منتشر می‌شود.</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting || isUploading}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              loadingLabel={
                submitStep === "approving" ? "در حال تأیید و انتشار..." : "در حال ارسال درخواست..."
              }
              disabled={isUploading}
            >
              <Icon name="check" size={16} />
              <span>ثبت و انتشار فوری بنر</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
