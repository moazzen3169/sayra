"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AdminUser, AdminUserInput } from "@/types/admin";
import { adminService } from "@/services/adminService";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AdminUser | null;
  onSuccess: () => void;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<AdminUserInput>({
    fullName: "",
    phone: "",
    email: "",
    role: "USER",
    isActive: true,
    nationalId: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        role: initialData.role || "USER",
        isActive: initialData.isActive ?? true,
        nationalId: initialData.nationalId || "",
      });
    } else {
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        role: "USER",
        isActive: true,
        nationalId: "",
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [initialData, isOpen]);

  const handleChange = (field: keyof AdminUserInput, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "نام و نام خانوادگی را وارد کنید";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد";
    }

    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      newErrors.phone = "شماره همراه را وارد کنید";
    } else if (!/^09\d{9}$/.test(cleanPhone)) {
      newErrors.phone = "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود";
    }

    if (formData.email && formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = "فرمت ایمیل وارد شده معتبر نیست";
      }
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
        await adminService.updateUser(initialData.id, formData);
      } else {
        await adminService.createUser(formData);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setSubmitError(error?.message || "خطا در ثبت اطلاعات کاربر. لطفا مجددا تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "ویرایش حساب کاربر" : "ثبت کاربر جدید"}
      className="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {submitError && (
          <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)] font-medium">
            {submitError}
          </div>
        )}

        {/* گروه ۱: اطلاعات هویت کاربر */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[var(--primary)] border-b border-[var(--border-subtle)] pb-1.5">
            اطلاعات هویتی
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="نام و نام خانوادگی *"
              placeholder="مثلا: امیرحسین امیری"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              error={errors.fullName}
            />
            <Input
              label="شماره همراه *"
              placeholder="09121112233"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              error={errors.phone}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="آدرس ایمیل (اختیاری)"
              placeholder="user@example.com"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errors.email}
              dir="ltr"
            />
            <Input
              label="کد ملی (اختیاری)"
              placeholder="0012345678"
              value={formData.nationalId || ""}
              onChange={(e) => handleChange("nationalId", e.target.value)}
              error={errors.nationalId}
              dir="ltr"
            />
          </div>
        </div>

        {/* گروه ۲: نقش و وضعیت */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-[var(--primary)] border-b border-[var(--border-subtle)] pb-1.5">
            سطح دسترسی و وضعیت
          </h4>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-xs font-bold text-[var(--text-muted)]">نقش کاربر *</label>
            <select
              value={formData.role}
              onChange={(e) =>
                handleChange("role", e.target.value as "USER" | "OWNER" | "ADMIN")
              }
              className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
            >
              <option value="USER" className="bg-[var(--bg-card)]">کاربر عادی (مشتری)</option>
              <option value="OWNER" className="bg-[var(--bg-card)]">صاحب / مدیر گیمنت</option>
              <option value="ADMIN" className="bg-[var(--bg-card)]">مدیر سیستم (ادمین)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-[var(--text-white)]">وضعیت فعال حساب</span>
              <span className="text-xs text-[var(--text-muted)]">
                در صورت غیرفعال بودن، امکان ورود کاربر به سیستم وجود نخواهد داشت.
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
            {isEdit ? "ذخیره تغییرات" : "ثبت کاربر"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
