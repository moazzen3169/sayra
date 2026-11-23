"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BannerSlider } from "@/components/BannerSlider";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { MediaItem } from "@/types/owner";

interface OwnerGallerySectionProps {
  centerId: string;
  centerSlug?: string;
  isApproved: boolean;
}

export function OwnerGallerySection({
  centerId,
  centerSlug,
  isApproved,
}: OwnerGallerySectionProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [localFallbacks, setLocalFallbacks] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleteConfirmMedia, setDeleteConfirmMedia] = useState<MediaItem | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

        const uploadedItem: MediaItem = {
          ...uploaded,
          url: uploaded.url || localPreviewUrl,
          purpose: uploaded.purpose === "LOGO" ? "GALLERY" : uploaded.purpose || "GALLERY",
        };

        if (uploaded.url) {
          setLocalFallbacks((prev) => ({
            ...prev,
            [uploaded.url]: localPreviewUrl,
          }));
        }

        setMedia((prev) => prev.map((m) => (m.id === tempId ? uploadedItem : m)));
        setGalleryMsg({ ok: true, text: "تصویر به گالری اضافه شد." });

        const hasPublicSlug = Boolean(isApproved && centerSlug && centerSlug !== centerId);
        if (hasPublicSlug) {
          const freshList = await ownerService.listOwnerMedia(
            centerId,
            centerSlug,
            undefined,
            { noCache: true }
          );
          if (Array.isArray(freshList) && freshList.length > 0) {
            const alreadyInServerList = freshList.some(
              (item) =>
                (Boolean(uploadedItem.id) && item.id === uploadedItem.id) ||
                (Boolean(uploadedItem.url) && item.url === uploadedItem.url)
            );
            setMedia(alreadyInServerList ? freshList : [uploadedItem, ...freshList]);
          }
        }
      } catch (err) {
        setMedia((prev) => prev.filter((m) => m.id !== tempId));
        URL.revokeObjectURL(localPreviewUrl);
        setGalleryMsg({ ok: false, text: getErrorMessage(err) });
      } finally {
        setUploading(false);
      }
    },
    [centerId, centerSlug, isApproved, uploading]
  );

  const handleConfirmDeleteMedia = useCallback(async () => {
    if (deletingImage || !deleteConfirmMedia || !centerId) return;

    const target = deleteConfirmMedia;
    const targetId = target.id || target.url;
    const isSameMedia = (item: MediaItem) =>
      item === target ||
      (Boolean(item.id) && Boolean(target.id)
        ? item.id === target.id
        : item.url === target.url);
    const remainingCount = media.filter((item) => !isSameMedia(item)).length;

    setDeletingImage(true);
    setGalleryMsg(null);

    try {
      await ownerService.deleteMedia(centerId, targetId);
      setMedia((prev) => prev.filter((item) => !isSameMedia(item)));
      setDeleteConfirmMedia(null);
      setGalleryMsg({ ok: true, text: "تصویر از گالری حذف شد." });

      if (isApproved && centerSlug && centerSlug !== centerId) {
        const updated = await ownerService.listOwnerMedia(
          centerId,
          centerSlug,
          undefined,
          { noCache: true }
        );
        if (Array.isArray(updated) && (updated.length > 0 || remainingCount === 0)) {
          setMedia(updated.filter((item) => !isSameMedia(item)));
        }
      }
    } catch (err) {
      setDeleteConfirmMedia(null);
      setGalleryMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setDeletingImage(false);
    }
  }, [centerId, centerSlug, deleteConfirmMedia, deletingImage, isApproved, media]);

  const galleryItems = useMemo(
    () => media.filter((m) => m.purpose !== "LOGO" && Boolean(m.url)),
    [media]
  );

  const galleryBanners = useMemo(
    () =>
      galleryItems.map((m, idx) => ({
        id: m.id || `owner-gallery-${idx}`,
        imageUrl: m.url,
        fallbackUrl: localFallbacks[m.url],
        alt: m.altText || "تصویر گالری گیمنت",
      })),
    [galleryItems, localFallbacks]
  );

  return (
    <>
      <section
        id="gallery"
        className="flex flex-col gap-4 p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-sm font-bold text-[var(--text-white)]">گالری تصاویر</h2>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="h-10 px-4 shrink-0 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-[var(--text-white)] text-xs font-bold hover:border-[var(--primary)] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                      fallbackSrc={localFallbacks[img.url] || PLACEHOLDERS.gallery}
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
                        className="absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full bg-black/80 hover:bg-[var(--accent-red)] text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                aria-label="افزودن تصویر به گالری"
                className="aspect-square rounded-card bg-[var(--foreground)]/30 border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <Icon name="plus" size={20} />
                <span className="text-xs font-bold">عکس جدید</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-card bg-[var(--foreground)]/10 border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-xs text-[var(--text-muted)]">
              هنوز تصویری برای گالری آپلود نشده است.
            </span>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="h-10 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {uploading ? "در حال آپلود..." : "آپلود اولین تصویر گالری"}
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </section>

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
              <h3 id="delete-media-title" className="text-sm font-bold text-[var(--text-white)]">
                تایید حذف تصویر
              </h3>
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
                onClick={handleConfirmDeleteMedia}
                className="flex-1 h-11 rounded-card bg-[var(--accent-red)] text-white font-bold text-xs disabled:opacity-60 cursor-pointer"
              >
                {deletingImage ? "در حال حذف..." : "حذف تصویر"}
              </button>
              <button
                type="button"
                disabled={deletingImage}
                onClick={() => setDeleteConfirmMedia(null)}
                className="h-11 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)] cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
