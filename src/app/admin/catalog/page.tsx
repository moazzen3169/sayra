"use client";

import React, { useEffect, useState } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminBreadcrumbs } from "@/components/admin/layout/AdminBreadcrumbs";
import { catalogService } from "@/services/catalogService";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type { DeviceCatalogItem, DeviceType } from "@/types/catalog";

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: "PC", label: "کامپیوتر گیمینگ (PC)" },
  { value: "PLAYSTATION", label: "پلی‌استیشن (PlayStation)" },
  { value: "XBOX", label: "ایکس‌باکس (Xbox)" },
  { value: "SWITCH", label: "نینتندو سوییچ (Switch)" },
  { value: "VR", label: "واقعیت مجازی (VR)" },
];

export default function AdminCatalogPage() {
  const [devices, setDevices] = useState<DeviceCatalogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("PC");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Filter State
  const [selectedFilterType, setSelectedFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    catalogService
      .listAdminDevices(
        {
          limit: 100,
          deviceType: selectedFilterType === "ALL" ? undefined : selectedFilterType,
          search: searchQuery.trim() || undefined,
        },
        controller.signal
      )
      .then((res) => {
        if (!active) return;
        setDevices(res.items);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        // Fallback to public list if admin endpoint returns error in development
        catalogService
          .listDevices({ limit: 100 }, controller.signal)
          .then((items) => {
            if (active) setDevices(items);
          })
          .catch(() => {
            if (active) setError("خطا در بارگذاری فهرست دستگاه‌های کاتالوگ.");
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload, selectedFilterType, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coverImageUrl.trim()) {
      setFormError("نام دستگاه و آدرس تصویر الزامی هستند.");
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      await catalogService.createAdminDevice({
        name: name.trim(),
        deviceType,
        coverImageUrl: coverImageUrl.trim(),
        description: description.trim() || undefined,
        isActive,
      });
      setIsModalOpen(false);
      setName("");
      setCoverImageUrl("");
      setDescription("");
      setIsActive(true);
      setReload((v) => v + 1);
    } catch (err: any) {
      setFormError(err?.message || "خطا در ثبت دستگاه در کاتالوگ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از غیرفعال‌سازی این دستگاه در کاتالوگ اطمینان دارید؟")) return;
    try {
      await catalogService.deleteAdminDevice(id);
      setReload((v) => v + 1);
    } catch (err: any) {
      alert(err?.message || "خطا در حذف دستگاه.");
    }
  };

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <AdminBreadcrumbs items={[{ label: "داشبورد", href: "/admin" }, { label: "کاتالوگ دستگاه‌ها" }]} />
            <h1 className="text-xl font-bold text-[var(--text-white)] mt-1">کاتالوگ سراسری تجهیزات و دستگاه‌ها</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              مدیریت دستگاه‌های استاندارد و پایه که مدیران گیم‌نت‌ها می‌توانند به مجموعه‌های خود اضافه کنند.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-4 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow cursor-pointer"
          >
            + افزودن دستگاه به کاتالوگ
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="جستجوی نام یا مشخصات دستگاه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">دسته‌بندی:</span>
            <select
              value={selectedFilterType}
              onChange={(e) => setSelectedFilterType(e.target.value)}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
            >
              <option value="ALL">همه دسته‌ها</option>
              {DEVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Devices Grid */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-card bg-[var(--bg-card)] animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {!loading && devices && devices.length === 0 && (
          <div className="p-12 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
            دستگاهی در کاتالوگ یافت نشد. می‌توانید با کلیک بر روی دکمه بالای صفحه اولین دستگاه را اضافه کنید.
          </div>
        )}

        {!loading && devices && devices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-[var(--primary)]/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                    <SafeImage
                      src={device.coverImageUrl || ""}
                      alt={device.name}
                      fallbackSrc={PLACEHOLDERS.center}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-white)] truncate">{device.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                        {device.deviceType}
                      </span>
                    </div>
                    {device.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{device.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                  <span className={`font-bold ${device.isActive ? "text-[var(--accent-green)]" : "text-[var(--text-muted)]"}`}>
                    {device.isActive ? "فعال در کاتالوگ" : "غیرفعال"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(device.id)}
                    className="text-xs text-[var(--accent-red)] hover:underline cursor-pointer"
                  >
                    غیرفعال‌سازی
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal افزودن دستگاه جدید به کاتالوگ پلتفرم */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col gap-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[var(--text-white)]">افزودن دستگاه جدید به کاتالوگ ادمین</h3>
            {formError && <p className="text-xs font-bold text-[var(--accent-red)]">{formError}</p>}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نام دستگاه</label>
              <input
                type="text"
                placeholder="مثلاً PlayStation 5 Slim یا PC گیمینگ نسل ۱۴"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نوع پلتفرم</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
              >
                {DEVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">آدرس تصویر دستگاه (URL)</label>
              <input
                type="url"
                placeholder="https://example.com/ps5.png یا /img/PS5.png"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات و مشخصات</label>
              <textarea
                rows={3}
                placeholder="مشخصات سخت‌افزاری و ویژگی‌ها..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActiveCatalog"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="isActiveCatalog" className="text-xs text-[var(--text-white)] cursor-pointer">
                این دستگاه بلافاصله برای صاحبان گیم‌نت‌ها فعال باشد
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-10 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? "در حال ثبت..." : "افزودن به کاتالوگ"}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminPageContainer>
  );
}
