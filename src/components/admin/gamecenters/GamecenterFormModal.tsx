"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AdminGamecenter, AdminGamecenterInput } from "@/types/admin";
import { adminService } from "@/services/adminService";

interface GamecenterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AdminGamecenter | null;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  slug?: string;
  ownerName?: string;
  ownerPhone?: string;
  city?: string;
  address?: string;
  description?: string;
}

export const GamecenterFormModal: React.FC<GamecenterFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<AdminGamecenterInput>({
    name: "",
    slug: "",
    ownerName: "",
    ownerPhone: "",
    city: "تهران",
    address: "",
    description: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        slug: initialData.slug || "",
        ownerName: initialData.ownerName || "",
        ownerPhone: initialData.ownerPhone || "",
        city: initialData.city || "تهران",
        address: initialData.address || "",
        description: initialData.description || "",
        isActive: initialData.isActive ?? true,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        ownerName: "",
        ownerPhone: "",
        city: "تهران",
        address: "",
        description: "",
        isActive: true,
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [initialData, isOpen]);

  const handleChange = (field: keyof AdminGamecenterInput, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
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

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = "نام مسئول/مالک را وارد کنید";
    }

    const cleanPhone = formData.ownerPhone.trim();
    if (!cleanPhone) {
      newErrors.ownerPhone = "شماره تماس مسئول را وارد کنید";
    } else if (!/^09\d{9}$/.test(cleanPhone)) {
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

    try {
      if (isEdit && initialData) {
        await adminService.updateGamecenter(initialData.id, formData);
      } else {
        await adminService.createGamecenter(formData);
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
                onChange={(e) => handleChange("city", e.target.value)}
                className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
              >
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
