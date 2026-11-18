"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AdminGamecenter, AdminGamecenterInput, AdminUser } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { cleanPhoneNumber, isValidIranPhone } from "@/lib/format";
import { LocationMapPicker } from "@/components/owner/LocationMapPicker";

const DEFAULT_URMIA_LAT = 37.5527;
const DEFAULT_URMIA_LNG = 45.0761;

const CITY_DEFAULT_COORDS: Record<string, { lat: number; lng: number }> = {
  ارومیه: { lat: 37.5527, lng: 45.0761 },
  تهران: { lat: 35.6892, lng: 51.389 },
  تبریز: { lat: 38.08, lng: 46.2919 },
  شیراز: { lat: 29.5918, lng: 52.5837 },
  اصفهان: { lat: 32.6546, lng: 51.668 },
  مشهد: { lat: 36.2972, lng: 59.6067 },
  کرج: { lat: 35.84, lng: 50.9391 },
};

interface GamecenterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AdminGamecenter | null;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  slug?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  city?: string;
  address?: string;
  description?: string;
}

/** ownerId جدا از فرم نگه داشته می‌شود و فقط از لیست کاربران واقعی سرور انتخاب می‌شود */
type GamecenterFormState = Omit<AdminGamecenterInput, "ownerId">;

export const GamecenterFormModal: React.FC<GamecenterFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<GamecenterFormState>({
    name: "",
    slug: "",
    ownerName: "مدیر گیم‌نت",
    ownerPhone: "",
    city: "ارومیه",
    address: "",
    lat: DEFAULT_URMIA_LAT,
    lng: DEFAULT_URMIA_LNG,
    primaryAddressId: undefined,
    description: "",
    isActive: true,
    phone: "",
  });

  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const initCity = initialData.city && initialData.city !== "-" ? initialData.city : "ارومیه";
      const cityFallback = CITY_DEFAULT_COORDS[initCity] ?? { lat: DEFAULT_URMIA_LAT, lng: DEFAULT_URMIA_LNG };
      setFormData({
        name: initialData.name || "",
        slug: initialData.slug || "",
        ownerName: initialData.ownerName || "",
        ownerPhone: initialData.ownerPhone || "",
        city: initCity,
        address: initialData.address || "",
        lat: typeof initialData.lat === "number" ? initialData.lat : cityFallback.lat,
        lng: typeof initialData.lng === "number" ? initialData.lng : cityFallback.lng,
        primaryAddressId: initialData.primaryAddressId,
        description: initialData.description || "",
        isActive: initialData.isActive ?? true,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        ownerName: "",
        ownerPhone: "",
        city: "ارومیه",
        address: "",
        lat: DEFAULT_URMIA_LAT,
        lng: DEFAULT_URMIA_LNG,
        primaryAddressId: undefined,
        description: "",
        isActive: true,
      });
    }
    setSelectedOwnerId("");
    setErrors({});
    setSubmitError(null);
  }, [initialData, isOpen]);

  // در حالت ویرایش، اگر مختصات در لیست اولیه نبود از سرور دریافت می‌کنیم
  useEffect(() => {
    if (!isOpen || !isEdit || !initialData) return;
    if (typeof initialData.lat === "number" && typeof initialData.lng === "number") return;

    const controller = new AbortController();
    adminService
      .getGamecenterById(initialData.id, controller.signal)
      .then((full) => {
        if (!full || controller.signal.aborted) return;
        setFormData((prev) => ({
          ...prev,
          lat: typeof full.lat === "number" ? full.lat : prev.lat,
          lng: typeof full.lng === "number" ? full.lng : prev.lng,
          primaryAddressId: full.primaryAddressId ?? prev.primaryAddressId,
        }));
      })
      .catch(() => {
        // ignore
      });

    return () => controller.abort();
  }, [isOpen, isEdit, initialData]);

  // دریافت کاربران واقعی برای انتخاب مالک (فقط هنگام ثبت گیمنت جدید)
  useEffect(() => {
    if (!isOpen || isEdit) return;

    const controller = new AbortController();
    setUsersLoading(true);
    setUsersError(null);

    adminService
      .getUsers({ pageSize: 100 }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setUsers(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setUsers([]);
        setUsersError(
          (err as Error)?.message || "دریافت فهرست کاربران انجام نشد. دوباره تلاش کنید."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setUsersLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, isEdit]);

  const handleChange = (field: keyof GamecenterFormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
  };

  const handleOwnerSelect = (userId: string) => {
    setSelectedOwnerId(userId);
    setErrors((prev) => ({ ...prev, ownerId: undefined }));
    setSubmitError(null);

    const user = users.find((u) => u.id === userId);
    if (user) {
      setFormData((prev) => ({
        ...prev,
        ownerName: user.fullName || prev.ownerName,
        ownerPhone: user.phone || prev.ownerPhone,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "نام گیمنت را وارد کنید";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "نام گیمنت باید حداقل ۳ کاراکتر باشد";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "شناسه اسلاگ را وارد کنید";
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.slug.trim())) {
      newErrors.slug = "اسلاگ باید شامل حروف انگلیسی، اعداد و خط تیره باشد";
    }

    if (!isEdit && !selectedOwnerId) {
      newErrors.ownerId = "یکی از کاربران را به‌عنوان مالک انتخاب کنید";
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = "نام مسئول/مالک را وارد کنید";
    }

    const cleanPhone = cleanPhoneNumber(formData.ownerPhone);
    if (!cleanPhone) {
      newErrors.ownerPhone = "شماره تماس مسئول را وارد کنید";
    } else if (!isValidIranPhone(cleanPhone)) {
      newErrors.ownerPhone = "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود";
    }

    if (!formData.city.trim()) {
      newErrors.city = "شهر را وارد کنید";
    }

    if (!formData.address.trim()) {
      newErrors.address = "آدرس کامل را وارد کنید";
    } else if (formData.address.trim().length < 5) {
      newErrors.address = "آدرس باید حداقل ۵ کاراکتر باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: GamecenterFormState = {
      ...formData,
      ownerPhone: cleanPhoneNumber(formData.ownerPhone),
    };

    try {
      if (isEdit && initialData) {
        await adminService.updateGamecenter(initialData.id, payload);
      } else {
        await adminService.createGamecenter({
          ...payload,
          ownerId: selectedOwnerId,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setSubmitError(error?.message || "خطا در ثبت اطلاعات گیمنت. لطفا مجددا تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "ویرایش گیمنت" : "ثبت گیمنت جدید"}
      className="max-w-[560px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {submitError && (
          <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)] font-medium">
            {submitError}
          </div>
        )}

        {/* گروه ۱: اطلاعات اصلی */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[var(--primary)] border-b border-[var(--border-subtle)] pb-1.5">
            اطلاعات اصلی گیمنت
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="نام گیمنت *"
              placeholder="مثلا: گیمنت ولکان"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={errors.name}
            />
            <Input
              label="شناسه یکتا (اسلاگ) *"
              placeholder="vulcan"
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              error={errors.slug}
              dir="ltr"
            />
          </div>
        </div>

        {/* گروه ۲: اطلاعات مسئول و آدرس */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[var(--primary)] border-b border-[var(--border-subtle)] pb-1.5">
            اطلاعات مسئول و موقعیت
          </h4>

          {!isEdit && (
            <div className="flex flex-col gap-1 w-full">
              <label
                htmlFor="gamecenter-owner"
                className="text-xs font-bold text-[var(--text-muted)]"
              >
                مالک گیمنت *
              </label>
              <select
                id="gamecenter-owner"
                value={selectedOwnerId}
                onChange={(e) => handleOwnerSelect(e.target.value)}
                disabled={usersLoading || isSubmitting}
                className={`h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)] disabled:opacity-50 ${
                  errors.ownerId
                    ? "border-[var(--accent-red)]"
                    : "border-[var(--border-subtle)]"
                }`}
              >
                <option value="" className="bg-[var(--bg-card)]">
                  {usersLoading ? "در حال دریافت کاربران..." : "انتخاب مالک"}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[var(--bg-card)]">
                    {u.fullName}
                    {u.phone ? ` — ${u.phone}` : ""}
                  </option>
                ))}
              </select>
              {errors.ownerId && (
                <span className="text-xs font-medium text-[var(--accent-red)]">
                  {errors.ownerId}
                </span>
              )}
              {usersError && (
                <span className="text-xs font-medium text-[var(--accent-red)]">
                  {usersError}
                </span>
              )}
              {!usersLoading && !usersError && users.length === 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  کاربری برای انتخاب پیدا نشد. ابتدا کاربر را از بخش کاربران ثبت کنید.
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="نام و نام خانوادگی مسئول *"
              placeholder="مثلا: علی محمدی"
              value={formData.ownerName}
              onChange={(e) => handleChange("ownerName", e.target.value)}
              error={errors.ownerName}
            />
            <Input
              label="شماره تماس مسئول *"
              placeholder="09123456789"
              value={formData.ownerPhone}
              onChange={(e) => handleChange("ownerPhone", e.target.value)}
              error={errors.ownerPhone}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-[var(--text-muted)]">شهر *</label>
              <select
                value={formData.city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  handleChange("city", newCity);
                  if (!isEdit && CITY_DEFAULT_COORDS[newCity]) {
                    setFormData((prev) => ({
                      ...prev,
                      city: newCity,
                      lat: CITY_DEFAULT_COORDS[newCity].lat,
                      lng: CITY_DEFAULT_COORDS[newCity].lng,
                    }));
                  }
                }}
                className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
              >
                <option value="ارومیه" className="bg-[var(--bg-card)]">ارومیه</option>
                <option value="تهران" className="bg-[var(--bg-card)]">تهران</option>
                <option value="تبریز" className="bg-[var(--bg-card)]">تبریز</option>
                <option value="شیراز" className="bg-[var(--bg-card)]">شیراز</option>
                <option value="اصفهان" className="bg-[var(--bg-card)]">اصفهان</option>
                <option value="مشهد" className="bg-[var(--bg-card)]">مشهد</option>
                <option value="کرج" className="bg-[var(--bg-card)]">کرج</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label="آدرس کامل *"
                placeholder="خیابان، پلاک، طبقه"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                error={errors.address}
              />
            </div>
          </div>

          <LocationMapPicker
            latitude={formData.lat ?? DEFAULT_URMIA_LAT}
            longitude={formData.lng ?? DEFAULT_URMIA_LNG}
            cityName={formData.city}
            onChange={(newLat, newLng) => {
              setFormData((prev) => ({
                ...prev,
                lat: newLat,
                lng: newLng,
              }));
              setSubmitError(null);
            }}
          />
        </div>

        {/* گروه ۳: توضیحات و وضعیت */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[var(--primary)] border-b border-[var(--border-subtle)] pb-1.5">
            توضیحات و وضعیت فعال‌سازی
          </h4>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات کوتاه</label>
            <textarea
              rows={3}
              placeholder="توضیحات درباره تجهیزات، امکانات و سیستم‌های این گیمنت"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-[var(--text-white)]">وضعیت فعال در سایت</span>
              <span className="text-xs text-[var(--text-muted)]">
                در صورت غیرفعال بودن، امکان رزرو این مرکز برای کاربران وجود نخواهد داشت.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--foreground)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
            </label>
          </div>
        </div>

        {/* دکمه‌های عملیاتی */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEdit ? "ذخیره تغییرات" : "ثبت گیمنت"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};