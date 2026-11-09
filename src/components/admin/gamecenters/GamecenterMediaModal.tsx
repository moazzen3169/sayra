"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AdminGamecenter } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { normalizeMediaUrl } from "@/lib/media";

interface GamecenterMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamecenter: AdminGamecenter | null;
  onUpdated: () => void;
}

interface MediaItem {
  id: string;
  url: string;
  altText?: string;
  purpose?: string;
}

export const GamecenterMediaModal: React.FC<GamecenterMediaModalProps> = ({
  isOpen,
  onClose,
  gamecenter,
  onUpdated,
}) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPurpose, setUploadPurpose] = useState<"GALLERY" | "COVER" | "LOGO">("GALLERY");
  const [altText, setAltText] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadMedia = async () => {
    if (!gamecenter) return;
    setIsLoading(true);
    try {
      const items = await adminService.getGamecenterMedia(gamecenter.slug || gamecenter.id);
      setMediaList(items);
    } catch {
      setMediaList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && gamecenter) {
      loadMedia();
    } else {
      setMediaList([]);
      setFeedback(null);
    }
  }, [isOpen, gamecenter]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gamecenter) return;

    if (!file.type.startsWith("image/")) {
      showFeedback("danger", "فقط بارگذاری فایل‌های تصویری مجاز است.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFeedback("danger", "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    try {
      const uploaded = await adminService.uploadGamecenterMedia(
        gamecenter.id,
        file,
        uploadPurpose,
        altText.trim() || file.name
      );

      setMediaList((prev) => [uploaded, ...prev]);
      showFeedback("success", "تصویر با موفقیت در سرور آپلود و ثبت گردید.");
      setAltText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUpdated();
    } catch (err: any) {
      showFeedback("danger", err?.message || "خطا در آپلود تصویر.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaItem: MediaItem) => {
    if (!gamecenter) return;
    try {
      await adminService.deleteGamecenterMedia(gamecenter.id, mediaItem.id);
      setMediaList((prev) => prev.filter((m) => m.id !== mediaItem.id));
      showFeedback("success", "تصویر حذف شد.");
      onUpdated();
    } catch (err: any) {
      showFeedback(
        "danger",
        err?.message ||
          "طبق مستندات OpenAPI، اندپوینت حذف عکس توسط بک‌اند ارائه نشده است."
      );
    }
  };

  if (!gamecenter) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`مدیریت تصاویر و رسانه‌های گیمنت: ${gamecenter.name}`}
      className="max-w-[700px]"
    >
      <div className="flex flex-col gap-5">
        {feedback && (
          <div
            className={`p-3 rounded-card text-xs font-bold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                : "bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]"
            }`}
          >
            <Icon name={feedback.type === "success" ? "check" : "alert"} size={16} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* بخش آپلود تصویر جدید */}
        <div className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[var(--text-white)] flex items-center gap-1.5">
            <Icon name="gamepad" size={16} className="text-[var(--primary)]" />
            <span>بارگذاری تصویر جدید در پلتفرم</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)] font-medium">نوع تصویر</label>
              <select
                value={uploadPurpose}
                onChange={(e) => setUploadPurpose(e.target.value as any)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="GALLERY" className="bg-[var(--bg-card)]">گالری تصاویر</option>
                <option value="COVER" className="bg-[var(--bg-card)]">تصویر شاخص (کاور)</option>
                <option value="LOGO" className="bg-[var(--bg-card)]">لوگوی اختصاصی</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-[var(--text-muted)] font-medium">عنوان یا متن جایگزین (Alt)</label>
              <input
                type="text"
                placeholder="مثال: نمای داخلی سالن PC"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Icon name="user" size={16} />
              <span>انتخاب و آپلود تصویر</span>
            </Button>
            <span className="text-xs text-[var(--text-muted)]">
              فرمت‌های مجاز: JPG, PNG, WEBP (حداکثر ۵ مگابایت)
            </span>
          </div>
        </div>

        {/* لیست تصاویر ثبت شده */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <h4 className="text-xs font-bold text-[var(--text-white)]">
              تصاویر ثبت‌شده گیمنت ({mediaList.length})
            </h4>
            <Button variant="secondary" size="sm" onClick={loadMedia} disabled={isLoading}>
              بروزرسانی لیست
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              در حال دریافت تصاویر از سرور...
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] bg-[var(--foreground)]/10 rounded-card">
              تاکنون تصویری برای این گیمنت در سامانه ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto p-1">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  className="group relative rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col"
                >
                  <div className="relative aspect-video w-full bg-[var(--foreground)]/30 overflow-hidden">
                    <img
                      src={normalizeMediaUrl(m.url)}
                      alt={m.altText || "تصویر گیمنت"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white">
                      {m.purpose === "COVER" ? "کاور" : m.purpose === "LOGO" ? "لوگو" : "گالری"}
                    </span>
                  </div>
                  <div className="p-2 flex items-center justify-between gap-1 text-xs">
                    <span className="truncate text-[var(--text-muted)] text-[11px]" title={m.altText}>
                      {m.altText || "بدون عنوان"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m)}
                      title="حذف تصویر"
                      className="p-1 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </Modal>
  );
};
