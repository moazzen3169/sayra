"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { CenterSettings, MediaItem } from "@/types/owner";

const inputClass =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)]";

const POPULAR_GAMES = [
  "EA Sports FC 25",
  "Call of Duty: Modern Warfare III",
  "GTA V",
  "Mortal Kombat 1",
  "Tekken 8",
  "Counter-Strike 2",
  "Dota 2",
  "Elden Ring",
  "Apex Legends",
  "Rocket League",
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-color)] cursor-pointer"
      role="switch"
      aria-checked={checked}
    >
      <span className="text-xs font-bold text-[var(--text-white)]">{label}</span>
      <span
        className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--foreground)]"
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-[#101014] transition-transform ${
            checked ? "-translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function OwnerEditPage() {
  const { centerId, center } = useOwner();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ۱. نام گیمنت
  const [name, setName] = useState(center?.name || "");

  // ۲. آدرس گیمنت
  const [address, setAddress] = useState(center?.description || "");

  // ۳. انتخاب از روی نقشه (Latitude / Longitude)
  const [lat, setLat] = useState<number>(38.08);
  const [lng, setLng] = useState<number>(46.29);
  const [geoLocating, setGeoLocating] = useState(false);

  // ۴. لیست تمامی بازی‌ها
  const [games, setGames] = useState<string[]>([
    "EA Sports FC 25",
    "Call of Duty: Modern Warfare III",
    "GTA V",
    "Mortal Kombat 1",
  ]);
  const [newGameInput, setNewGameInput] = useState("");

  // ۵ & ۶. رزرو آنلاین و تایید خودکار
  const [allowOnline, setAllowOnline] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(false);

  // تصاویر گالری
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmMedia, setDeleteConfirmMedia] = useState<MediaItem | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    if (center) {
      setName(center.name || "");
      setAddress(center.description || "");
    }

    if (!centerId) {
      setLoaded(true);
      return;
    }

    const controller = new AbortController();

    Promise.allSettled([
      ownerService.getSettings(centerId, controller.signal),
      ownerService.listMedia(center?.slug || centerId, controller.signal),
    ]).then(([settingsRes, mediaRes]) => {
      if (!active) return;
      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        setAllowOnline(settingsRes.value.allowOnlineBooking !== false);
        setAutoConfirm(!!settingsRes.value.onlineBookingAutoConfirm);
      }
      if (mediaRes.status === "fulfilled" && Array.isArray(mediaRes.value)) {
        setMedia(mediaRes.value);
      }
      setLoaded(true);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, center]);

  const addGame = (gameName: string) => {
    const trimmed = gameName.trim();
    if (!trimmed) return;
    if (!games.includes(trimmed)) {
      setGames((prev) => [...prev, trimmed]);
    }
    setNewGameInput("");
  };

  const removeGame = (gameName: string) => {
    setGames((prev) => prev.filter((g) => g !== gameName));
  };

  const togglePopularGame = (gameName: string) => {
    if (games.includes(gameName)) {
      removeGame(gameName);
    } else {
      addGame(gameName);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMsg({ ok: false, text: "مرورگر شما از قابلیت Geolocation پشتیبانی نمی‌کند." });
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(Number(position.coords.latitude.toFixed(6)));
        setLng(Number(position.coords.longitude.toFixed(6)));
        setGeoLocating(false);
        setMsg({ ok: true, text: "موقعیت کنونی شما روی نقشه تنظیم شد." });
      },
      () => {
        setGeoLocating(false);
        setMsg({ ok: false, text: "امکان دریافت موقعیت مکانی شما وجود نداشت." });
      }
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      // فقط فیلدهای پشتیبانی شده توسط اندپوینت settings ارسال می‌شوند
      const settings: CenterSettings = {
        allowOnlineBooking: allowOnline,
        onlineBookingAutoConfirm: autoConfirm,
      };
      await ownerService.updateSettings(centerId, settings);

      // به‌روزرسانی مجدد تنظیمات از سرور جهت اطمینان از تطابق با بک‌اند
      const freshSettings = await ownerService.getSettings(centerId).catch(() => null);
      if (freshSettings) {
        setAllowOnline(freshSettings.allowOnlineBooking !== false);
        setAutoConfirm(!!freshSettings.onlineBookingAutoConfirm);
      }

      // پیام شفاف که به کاربر اعلام می‌کند تنظیمات رزرو در بک‌اند ثبت شد و سایر فیلدها منتظر قرارداد بک‌اند هستند
      setMsg({
        ok: true,
        text: "تنظیمات رزرو آنلاین با موفقیت در سرور ذخیره شد. (تغییر نام، آدرس و بازی‌ها پس از فعال‌سازی اندپوینت مربوطه در بک‌اند اعمال خواهند شد)",
      });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="ویرایش گیمنت" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[var(--max-mini-app-width)] lg:mx-auto lg:w-full lg:px-0">
        {!loaded ? (
          <div className="h-60 rounded-card bg-[var(--bg-card)] animate-pulse" />
        ) : (
          <form onSubmit={save} className="flex flex-col gap-5">
            {msg && (
              <div
                className={`p-3.5 rounded-card text-xs font-bold ${
                  msg.ok
                    ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                    : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* ۱. نام گیمنت */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-white)]">نام گیمنت</label>
              <input
                type="text"
                className={inputClass}
                placeholder="نام گیمنت را وارد کنید"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* ۲. آدرس گیمنت */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-white)]">آدرس گیمنت</label>
              <textarea
                rows={3}
                placeholder="آدرس دقیق گیمنت را وارد کنید"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)]"
                required
              />
            </div>

            {/* ۳. انتخاب از روی نقشه */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-white)]">انتخاب از روی نقشه</label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={geoLocating}
                  className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {geoLocating ? "در حال دریافت..." : "موقعیت کنونی من"}
                </button>
              </div>

              <div className="relative rounded-card border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-card)]">
                {/* Map iframe preview */}
                <iframe
                  title="موقعیت روی نقشه"
                  className="w-full h-48 border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    lng - 0.01
                  }%2C${lat - 0.01}%2C${lng + 0.01}%2C${
                    lat + 0.01
                  }&layer=mapnik&marker=${lat}%2C${lng}`}
                />

                <div className="p-3 bg-[var(--foreground)]/30 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] dir-ltr">
                    <span>📍 Lat: <strong className="text-[var(--text-white)]">{lat}</strong></span>
                    <span>Lng: <strong className="text-[var(--text-white)]">{lng}</strong></span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    برای تغییر موقعیت می‌توانید مختصات را وارد کنید یا موقعیت کنونی را بزنید
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 pt-0 bg-[var(--foreground)]/30">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="عرض جغرافیایی (Lat)"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="h-9 px-3 rounded-card bg-[var(--foreground)]/60 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-left text-[var(--text-white)] outline-none"
                    dir="ltr"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="طول جغرافیایی (Lng)"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="h-9 px-3 rounded-card bg-[var(--foreground)]/60 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-left text-[var(--text-white)] outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* ۴. لیست تمامی بازی‌ها */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-[var(--text-white)]">لیست تمامی بازی‌ها</label>

              {/* Selected games chips */}
              <div className="flex flex-wrap gap-2 min-h-[38px] p-2.5 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
                {games.length === 0 ? (
                  <span className="text-xs text-[var(--text-subtle)] py-0.5">هیچ بازی انتخاب نشده است.</span>
                ) : (
                  games.map((game) => (
                    <span
                      key={game}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold"
                    >
                      {game}
                      <button
                        type="button"
                        onClick={() => removeGame(game)}
                        className="hover:text-white transition-colors cursor-pointer"
                        aria-label={`حذف ${game}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add custom game input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="نام بازی جدید را وارد کنید..."
                  value={newGameInput}
                  onChange={(e) => setNewGameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGame(newGameInput);
                    }
                  }}
                  className="flex-1 h-10 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] outline-none placeholder:text-[var(--text-subtle)]"
                />
                <button
                  type="button"
                  onClick={() => addGame(newGameInput)}
                  className="h-10 px-4 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] transition-colors cursor-pointer"
                >
                  افزودن
                </button>
              </div>

              {/* Quick toggle popular games */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-xs text-[var(--text-muted)]">انتخاب سریع از بازی‌های محبوب:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_GAMES.map((gameName) => {
                    const selected = games.includes(gameName);
                    return (
                      <button
                        key={gameName}
                        type="button"
                        onClick={() => togglePopularGame(gameName)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                          selected
                            ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                            : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                        }`}
                      >
                        {selected ? gameName : `+ ${gameName}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ۵ & ۶. رزرو آنلاین و تایید خودکار */}
            <div className="flex flex-col gap-3 mt-1">
              <h2 className="text-xs font-bold text-[var(--text-white)]">تنظیمات رزرو</h2>
              <Toggle label="فعال بودن رزرو آنلاین" checked={allowOnline} onChange={setAllowOnline} />
              <Toggle label="تایید خودکار رزروهای آنلاین" checked={autoConfirm} onChange={setAutoConfirm} />
            </div>

            {/* ۷. گالری تصاویر و حذف با دکمه X */}
            <div className="flex flex-col gap-3 mt-2 border-t border-[var(--border-subtle)] pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-[var(--text-white)]">تصاویر موجود در گیمنت</h2>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  + افزودن عکس جدید
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file || uploadingImage) return;
                    setUploadingImage(true);
                    try {
                      await ownerService.uploadGalleryImage(centerId, file);
                      const updated = await ownerService.listMedia(center?.slug || centerId);
                      setMedia(updated);
                    } catch (err) {
                      setMsg({ ok: false, text: getErrorMessage(err) });
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                />
              </div>

              {media.length === 0 ? (
                <div className="p-4 rounded-card border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                  هیچ تصویری برای این گیمنت آپلود نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {media.map((img, idx) => {
                    const imgId = img.id || `${img.url}-${idx}`;
                    return (
                      <div
                        key={imgId}
                        className="relative aspect-square rounded-card border border-[var(--border-subtle)] overflow-hidden group bg-[var(--foreground)]/30"
                      >
                        <img
                          src={img.url}
                          alt={img.altText || "تصویر گیمنت"}
                          className="w-full h-full object-cover"
                        />
                        {/* Delete X Button on top right */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmMedia(img)}
                          aria-label="حذف عکس"
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-[var(--accent-red)] text-white font-black text-xs flex items-center justify-center transition-colors shadow-md cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-12 mt-2 rounded-card bg-[var(--primary)] text-on-primary font-bold text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </button>
          </form>
        )}
      </main>

      {/* Confirmation Modal for Image Deletion */}
      {deleteConfirmMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => !deletingImage && setDeleteConfirmMedia(null)}
        >
          <div
            className="w-full max-w-[380px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex flex-col gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] mx-auto flex items-center justify-center text-xl font-bold">
              🗑️
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-[var(--text-white)]">تایید حذف تصویر</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                آیا از حذف این تصویر اطمینان دارید؟ این عمل قابل بازگشت نیست.
              </p>
            </div>

            {deleteConfirmMedia.url && (
              <div className="w-24 h-24 mx-auto rounded-card overflow-hidden border border-[var(--border-subtle)]">
                <img src={deleteConfirmMedia.url} alt="پیش‌نمایش" className="w-full h-full object-cover" />
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
                    setMedia((prev) => prev.filter((m) => (m.id || m.url) !== targetId));
                    setDeleteConfirmMedia(null);
                    setMsg({ ok: true, text: "تصویر با موفقیت حذف شد." });
                  } catch (err) {
                    setMsg({ ok: false, text: getErrorMessage(err) });
                  } finally {
                    setDeletingImage(false);
                  }
                }}
                className="flex-1 h-10 rounded-card bg-[var(--accent-red)] text-white font-bold text-xs disabled:opacity-60"
              >
                {deletingImage ? "در حال حذف..." : "حذف تصویر"}
              </button>
              <button
                type="button"
                disabled={deletingImage}
                onClick={() => setDeleteConfirmMedia(null)}
                className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)]"
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
