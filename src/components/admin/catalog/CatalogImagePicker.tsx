"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { catalogService } from "@/services/catalogService";
import { PLACEHOLDERS } from "@/lib/media";
import { getErrorMessage } from "@/lib/reservationUi";

interface CatalogImagePickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
}

export const CatalogImagePicker: React.FC<CatalogImagePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadedUrl = await catalogService.uploadAdminMedia(file);
      onChange(uploadedUrl);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[var(--text-muted)]">
        {label}
        {required && <span className="text-[var(--accent-red)] mr-1">*</span>}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3 p-2.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)]">
          <div className="w-16 h-16 shrink-0 rounded-card overflow-hidden bg-[var(--foreground)] border border-[var(--border-subtle)]">
            <SafeImage
              src={value}
              alt={label}
              fallbackSrc={PLACEHOLDERS.center}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              title="تغییر تصویر"
              aria-label="تغییر تصویر"
              className="h-9 px-3 rounded-card bg-[var(--foreground)] hover:bg-[var(--foreground)]/80 text-xs font-bold text-[var(--text-white)] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Icon name="upload" size={15} />
              <span>{isUploading ? "در حال آپلود..." : "تغییر فایل"}</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                setUploadError(null);
                onChange("");
              }}
              title="حذف تصویر"
              aria-label="حذف تصویر"
              className="w-9 h-9 rounded-card bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)] inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="h-24 rounded-card border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/35 flex flex-col items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors cursor-pointer disabled:opacity-60"
        >
          <Icon name={isUploading ? "upload" : "image"} size={22} />
          <span className="font-bold">
            {isUploading ? "در حال آپلود تصویر..." : "انتخاب تصویر از فایل‌ها"}
          </span>
          <span className="text-[11px] opacity-75">
            PNG, JPG, WEBP (حداکثر ۵ مگابایت)
          </span>
        </button>
      )}

      {uploadError && (
        <p className="text-xs font-bold text-[var(--accent-red)]">{uploadError}</p>
      )}
    </div>
  );
};
