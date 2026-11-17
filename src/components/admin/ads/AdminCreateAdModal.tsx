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

interface AdminCreateAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const AdminCreateAdModal: React.FC<AdminCreateAdModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [gamecenters, setGamecenters] = useState<AdminGamecenter[]>([]);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcError, setGcError] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<"CUSTOM" | "CATEGORY" | "GAMECENTER">("CUSTOM");
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

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setGcLoading(true);
    setGcError(null);

    adminService
      .getGamecenters({ pageSize: 100 }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setGamecenters(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setGamecenters([]);
        setGcError((err as Error)?.message || "خطا در دریافت لیست گیمنت‌ها");
      })
      .finally(() => {
        if (!controller.signal.aborted) setGcLoading(false);
      });

    return () => controller.abort();
  }, [isOpen]);

  const resetForm = () => {
    setTargetType("CUSTOM");
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
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectGamecenter = (id: string) => {
    setGamingCenterId(id);
    setErrorMessage(null);
    const gc = gamecenters.find((g) => g.id === id);
    if (gc && !destinationUrl.trim()) {
      setDestinationUrl(`/gamecenter/${gc.slug || gc.id}`);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("فقط بارگذاری فایل تصویری مجاز است.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("حجم تصویر بنر نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (targetType === "GAMECENTER" && !gamingCenterId) {
      setErrorMessage("گیمنت هدف را انتخاب کنید.");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("عنوان تبلیغ را وارد کنید.");
      return;
    }
    if (!bannerUrl.trim()) {
      setErrorMessage("تصویر بنر را آپلود کنید یا آدرس تصویر را وارد نمایید.");
      return;
    }

    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1) {
      setErrorMessage("مدت اعتبار تبلیغ باید حداقل ۱ روز باشد.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.createApprovedAd({
        gamingCenterId: targetType === "GAMECENTER" ? gamingCenterId : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        bannerUrl: bannerUrl.trim(),
        destinationUrl: destinationUrl.trim() || undefined,
        durationDays: days,
        priority: Number(priority) || 0,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        adminNote: adminNote.trim() || "ایجاد و تأیید مستقیم توسط مدیر سیستم",
      });
      resetForm();
      onCreated();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "خطا در ثبت تبلیغ تأیید شده.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ایجاد تبلیغ مستقیم (با وضعیت تأیید شده)"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <div className="p-3 rounded-card bg-accent-red/15 border border-accent-red/30 text-accent-red text-xs font-bold flex items-center gap-2">
            <Icon name="alert" size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Target Type Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-white">نوع مقصد تبلیغ</label>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-card bg-foreground/30 border border-border-subtle">
            {[
              { id: "CUSTOM", label: "لینک دلخواه / تخفیف کلی" },
              { id: "CATEGORY", label: "دسته‌بندی دستگاه‌ها" },
              { id: "GAMECENTER", label: "گیمنت مشخص" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTargetType(t.id as "CUSTOM" | "CATEGORY" | "GAMECENTER");
                  setErrorMessage(null);
                  if (t.id === "CATEGORY") {
                    setDestinationUrl(`/gamecenters?device=${selectedCategory}`);
                  }
                }}
                className={`py-2 px-2 rounded-child text-xs font-bold transition-colors cursor-pointer ${
                  targetType === t.id
                    ? "bg-primary text-on-primary"
                    : "text-text-muted hover:text-text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        {targetType === "CATEGORY" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-white">دسته‌بندی هدف</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setDestinationUrl(`/gamecenters?device=${e.target.value}`);
              }}
              className="h-11 px-3 rounded-card bg-foreground/40 border border-border-subtle text-xs text-text-white outline-none focus:border-primary cursor-pointer"
            >
              <option value="PC" className="bg-card-bg">کامپیوتر گیمینگ (PC)</option>
              <option value="PLAYSTATION" className="bg-card-bg">پلی‌استیشن (PlayStation)</option>
              <option value="XBOX" className="bg-card-bg">ایکس‌باکس (Xbox)</option>
              <option value="SWITCH" className="bg-card-bg">نینتندو سوییچ (Switch)</option>
              <option value="VR" className="bg-card-bg">واقعیت مجازی (VR)</option>
            </select>
          </div>
        )}

        {/* Gaming Center Selection (only when GAMECENTER is chosen) */}
        {targetType === "GAMECENTER" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-white">
              گیمنت مرتبط <span className="text-accent-red">*</span>
            </label>
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
                placeholder="انتخاب گیمنت..."
                searchPlaceholder="جستجو نام یا اسلاگ گیمنت..."
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="عنوان تبلیغ *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: جشنواره تخفیف تابستانی"
            required
          />
          <Input
            label="لینک مقصد (Destination URL)"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="/gamecenter/example یا https://..."
            dir="ltr"
          />
        </div>

        {/* Banner Upload or URL */}
        <div className="flex flex-col gap-2 p-3.5 rounded-card bg-foreground/20 border border-border-subtle">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-text-white">تصویر بنر تبلیغ *</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "در حال آپلود..." : "آپلود فایل بنر"}
              </Button>
            </div>
          </div>

          <Input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="آدرس تصویر بنر یا آپلود مستقیم از دکمه بالا"
            dir="ltr"
          />

          {bannerUrl.trim() && (
            <div className="relative h-36 w-full rounded-card overflow-hidden border border-border bg-body-bg">
              <SafeImage
                src={normalizeMediaUrl(bannerUrl.trim())}
                fallbackSrc={PLACEHOLDERS.banner}
                alt="پیش‌نمایش بنر تبلیغ"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-white">توضیحات تبلیغ</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="توضیحات کوتاه نمایش‌داده‌شده روی بنر یا صفحه جزئیات..."
            className="w-full p-3 rounded-card bg-foreground/40 border border-border-subtle text-xs text-text-white outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Admin Freedom Parameters: Duration, Priority, Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            label="مدت (روز) *"
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
          />
          <Input
            label="اولویت نمایش"
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
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

        <Input
          label="یادداشت مدیریتی (اختیاری)"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="ثبت مستقیم توسط ادمین کل"
        />

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <span className="text-xs text-accent-green font-medium">
            این تبلیغ بلافاصله با وضعیت «تأیید شده» منتشر می‌شود.
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "در حال ثبت..." : "ایجاد و تأیید تبلیغ"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
