"use client";

import React, { useState, useEffect } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminBreadcrumbs } from "@/components/admin/layout/AdminBreadcrumbs";
import { Icon, IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SiteSettings } from "@/types/admin";
import { adminService } from "@/services/adminService";

type TabType = "general" | "reservation" | "notification" | "security";

interface TabItem {
  id: TabType;
  label: string;
  iconName: IconName;
  badge?: string;
}

const TABS: TabItem[] = [
  { id: "general", label: "تنظیمات عمومی", iconName: "info" },
  { id: "reservation", label: "رزرو و قوانین", iconName: "calendar" },
  { id: "notification", label: "اعلان‌ها و محتوا", iconName: "ticket" },
  { id: "security", label: "زیرساخت و امنیت", iconName: "star", badge: "محرمانه" },
];

export default function SettingsAdminPage() {
  const [savedSettings, setSavedSettings] = useState<SiteSettings | null>(null);
  const [formData, setFormData] = useState<SiteSettings | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getSiteSettings();
      setSavedSettings(data);
      setFormData(JSON.parse(JSON.stringify(data)));
    } catch (e) {
      console.error("Failed to load settings:", e);
      setSaveErrorMessage("خطا در بارگیری تنظیمات سیستم.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasUnsavedChanges = (): boolean => {
    if (!savedSettings || !formData) return false;
    return JSON.stringify(savedSettings) !== JSON.stringify(formData);
  };

  const handleGeneralChange = (
    field: keyof SiteSettings["general"],
    value: string | boolean
  ) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        general: {
          ...prev.general,
          [field]: value,
        },
      };
    });
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleReservationChange = (
    field: keyof SiteSettings["reservation"],
    value: number
  ) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reservation: {
          ...prev.reservation,
          [field]: value,
        },
      };
    });
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleNotificationChange = (
    field: keyof SiteSettings["notification"],
    value: string | boolean
  ) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notification: {
          ...prev.notification,
          [field]: value,
        },
      };
    });
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    const newErrors: Record<string, string> = {};

    // General validations
    if (!formData.general.siteTitle.trim()) {
      newErrors.siteTitle = "عنوان سامانه نمی‌تواند خالی باشد.";
    }

    const cleanPhone = formData.general.supportPhone.trim();
    if (!cleanPhone) {
      newErrors.supportPhone = "شماره پشتیبانی الزامی است.";
    } else if (!/^0\d{8,10}$/.test(cleanPhone)) {
      newErrors.supportPhone = "شماره تماس ناپایدار است (مانند 02188889999 یا 09123456789).";
    }

    const cleanEmail = formData.general.supportEmail.trim();
    if (!cleanEmail) {
      newErrors.supportEmail = "ایمیل پشتیبانی الزامی است.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.supportEmail = "فرمت ایمیل وارد شده معتبر نیست.";
    }

    // Reservation validations
    if (
      isNaN(formData.reservation.platformCommissionPercent) ||
      formData.reservation.platformCommissionPercent < 0 ||
      formData.reservation.platformCommissionPercent > 100
    ) {
      newErrors.platformCommissionPercent = "درصد کارمزد باید بین ۰ تا ۱۰۰ باشد.";
    }

    if (
      isNaN(formData.reservation.maxAdvanceBookingDays) ||
      formData.reservation.maxAdvanceBookingDays < 1 ||
      formData.reservation.maxAdvanceBookingDays > 90
    ) {
      newErrors.maxAdvanceBookingDays = "حداکثر روزهای رزرو باید بین ۱ تا ۹۰ روز باشد.";
    }

    if (
      isNaN(formData.reservation.onlinePaymentTimeoutMinutes) ||
      formData.reservation.onlinePaymentTimeoutMinutes < 1 ||
      formData.reservation.onlinePaymentTimeoutMinutes > 60
    ) {
      newErrors.onlinePaymentTimeoutMinutes = "مهلت پرداخت آنلاین باید بین ۱ تا ۶۰ دقیقه باشد.";
    }

    if (
      isNaN(formData.reservation.cancellationPenaltyPercent) ||
      formData.reservation.cancellationPenaltyPercent < 0 ||
      formData.reservation.cancellationPenaltyPercent > 100
    ) {
      newErrors.cancellationPenaltyPercent = "درصد جریمه لغو باید بین ۰ تا ۱۰۰ باشد.";
    }

    if (
      isNaN(formData.reservation.freeCancellationHours) ||
      formData.reservation.freeCancellationHours < 0
    ) {
      newErrors.freeCancellationHours = "مهلت لغو رایگان نباید عدد منفی باشد.";
    }

    // Notification validations
    if (!formData.notification.welcomeSmsTemplate.trim()) {
      newErrors.welcomeSmsTemplate = "متن الگوی پیامک خوش‌آمدگویی الزامی است.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!formData) return;
    if (!validateForm()) {
      setSaveErrorMessage("لطفاً خطاهای مشخص‌شده در فرم را برطرف نمایید.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    try {
      const updated = await adminService.updateSiteSettings(formData);
      setSavedSettings(updated);
      setFormData(JSON.parse(JSON.stringify(updated)));
      setSaveSuccessMessage("تنظیمات با موفقیت ذخیره گردید.");
    } catch (e: unknown) {
      const err = e as Error;
      setSaveErrorMessage(err.message || "خطا در ذخیره تنظیمات.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (savedSettings) {
      setFormData(JSON.parse(JSON.stringify(savedSettings)));
      setErrors({});
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);
    }
  };

  if (isLoading || !formData) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">در حال بارگیری تنظیمات سیستم...</span>
        </div>
      </AdminPageContainer>
    );
  }

  const unsaved = hasUnsavedChanges();

  return (
    <AdminPageContainer>
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-2 mb-6">
        <AdminBreadcrumbs items={[{ label: "تنظیمات سیستم" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-white">تنظیمات سیستم</h1>
            <p className="text-sm text-text-muted mt-1">
              پیکربندی پارامترهای عمومی، قوانین رزرو، سامانه پیامکی و وضعیت زیرساخت پلتفرم
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            {unsaved && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                لغو تغییرات
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!unsaved && !isSaving}
            >
              <Icon name="check" size={16} />
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </div>

      {/* Save Success / Error Banners */}
      {saveSuccessMessage && (
        <div className="mb-6 p-4 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-xs text-[var(--accent-green)] font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Icon name="check" size={18} />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            type="button"
            className="p-1 hover:bg-[var(--accent-green)]/20 rounded"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="mb-6 p-4 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)] font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Icon name="alert" size={18} />
            <span>{saveErrorMessage}</span>
          </div>
          <button
            onClick={() => setSaveErrorMessage(null)}
            type="button"
            className="p-1 hover:bg-[var(--accent-red)]/20 rounded"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Unsaved Changes Sticky Floating Notice */}
      {unsaved && (
        <div className="mb-6 p-4 rounded-card bg-primary-muted/30 border border-primary/40 text-sm text-text-white flex items-center justify-between flex-wrap gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-bold text-primary">تغییرات ذخیره‌نشده موجود است.</span>
            <span className="text-text-muted text-xs hidden sm:inline">
              جهت اعمال تغییرات در کل سیستم، دکمه ذخیره را فشار دهید.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              لغو
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-border mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-text-muted hover:text-text-white"
              }`}
            >
              <Icon name={tab.iconName} size={18} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/50 text-text-subtle font-normal">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: General Settings */}
      {activeTab === "general" && (
        <div className="bg-card-bg border border-border rounded-card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-white">تنظیمات عمومی پلتفرم</h2>
            <p className="text-xs text-text-muted mt-0.5">
              اطلاعات اصلی برند، راه‌های ارتباطی و وضعیت نگهداری سامانه
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <Input
                label="نام و عنوان سامانه *"
                placeholder="سامانه رزرو گیمنت سایرا"
                value={formData.general.siteTitle}
                onChange={(e) => handleGeneralChange("siteTitle", e.target.value)}
                error={errors.siteTitle}
              />
              <span className="text-[11px] text-text-subtle">
                عنوان رسمی که در سربرگ، پاورقی و پیامک‌های اطلاع‌رسانی نمایش داده می‌شود.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Input
                label="شماره تماس پشتیبانی *"
                placeholder="02188889999"
                value={formData.general.supportPhone}
                onChange={(e) => handleGeneralChange("supportPhone", e.target.value)}
                error={errors.supportPhone}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                شماره اصلی جهت پاسخگویی تلفنی پشتیبانی به کاربران و صاحبان گیمنت.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Input
                label="ایمیل پشتیبانی *"
                placeholder="support@sayra.ir"
                value={formData.general.supportEmail}
                onChange={(e) => handleGeneralChange("supportEmail", e.target.value)}
                error={errors.supportEmail}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                ایمیل رسمی جهت دریافت گزارش‌ها و مکاتبات تیکت‌های پشتیبانی.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <Input
                label="آدرس دفتر مرکزی"
                placeholder="تهران، خیابان ولیعصر..."
                value={formData.general.centralAddress}
                onChange={(e) => handleGeneralChange("centralAddress", e.target.value)}
              />
              <span className="text-[11px] text-text-subtle">
                نشانی فیزیکی شرکت جهت درج در بخش تماس با ما و قوانین سایت.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 rounded-card bg-foreground/20 border border-border">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-text-white">حالت نگهداری سیستم (Maintenance Mode)</span>
                <span className="text-xs text-text-muted">
                  با فعال‌سازی این گزینه، دسترسی کاربران عادی به رزرو موقتاً مسدود شده و پیام نگهداری نمایش داده می‌شود.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.general.maintenanceMode}
                  onChange={(e) => handleGeneralChange("maintenanceMode", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-foreground peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-red)]"></div>
              </label>
            </div>

            {formData.general.maintenanceMode && (
              <div className="flex flex-col gap-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-text-white">متن اطلاعیه حالت نگهداری</label>
                <textarea
                  rows={3}
                  value={formData.general.maintenanceMessage || ""}
                  onChange={(e) => handleGeneralChange("maintenanceMessage", e.target.value)}
                  placeholder="علت به‌روزرسانی یا بازه زمانی عدم دسترسی..."
                  className="p-3 rounded-card bg-foreground/40 border border-border text-sm text-text-white outline-none focus:border-primary placeholder:text-text-subtle"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Reservation & Policies */}
      {activeTab === "reservation" && (
        <div className="bg-card-bg border border-border rounded-card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-white">تنظیمات رزرو و قوانین مالی</h2>
            <p className="text-xs text-text-muted mt-0.5">
              نرخ کارمزد پلتفرم، مهلت‌های زمانی پرداخت و قوانین لغو رزرو
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-white">درصد کارمزد پلتفرم (%) *</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.reservation.platformCommissionPercent}
                onChange={(e) =>
                  handleReservationChange("platformCommissionPercent", parseFloat(e.target.value) || 0)
                }
                error={errors.platformCommissionPercent}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                درصد سهم پلتفرم سایرا از هر صورتحساب رزرو موفق گیمنت‌ها.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-white">حداکثر روزهای رزرو از قبل (روز) *</label>
              <Input
                type="number"
                min={1}
                max={90}
                value={formData.reservation.maxAdvanceBookingDays}
                onChange={(e) =>
                  handleReservationChange("maxAdvanceBookingDays", parseInt(e.target.value, 10) || 1)
                }
                error={errors.maxAdvanceBookingDays}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                کاربران حداکثر تا چند روز آینده امکان ثبت رزرو ایستگاه را دارند.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-white">مهلت زمان پرداخت آنلاین (دقیقه) *</label>
              <Input
                type="number"
                min={1}
                max={60}
                value={formData.reservation.onlinePaymentTimeoutMinutes}
                onChange={(e) =>
                  handleReservationChange("onlinePaymentTimeoutMinutes", parseInt(e.target.value, 10) || 1)
                }
                error={errors.onlinePaymentTimeoutMinutes}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                مدت زمان معتبر بودن سانس رزروشده جهت تکمیل پرداخت در درگاه بانکی.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-white">درصد جریمه لغو رزرو (%) *</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.reservation.cancellationPenaltyPercent}
                onChange={(e) =>
                  handleReservationChange("cancellationPenaltyPercent", parseFloat(e.target.value) || 0)
                }
                error={errors.cancellationPenaltyPercent}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                درصد کسرشده از مبلغ پرداختی کاربر در صورت لغو پس از مهلت رایگان.
              </span>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-bold text-text-white">مهلت زمانی لغو بدون جریمه (ساعت قبل از شروع سانس) *</label>
              <Input
                type="number"
                min={0}
                value={formData.reservation.freeCancellationHours}
                onChange={(e) =>
                  handleReservationChange("freeCancellationHours", parseFloat(e.target.value) || 0)
                }
                error={errors.freeCancellationHours}
                dir="ltr"
              />
              <span className="text-[11px] text-text-subtle">
                اگر کاربر تا این تعداد ساعت پیش از شروع سانس اقدام به لغو کند، کل مبلغ بازگردانده می‌شود.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Notifications & Content */}
      {activeTab === "notification" && (
        <div className="bg-card-bg border border-border rounded-card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-white">تنظیمات اعلان‌ها و انتشار محتوا</h2>
            <p className="text-xs text-text-muted mt-0.5">
              مدیریت ارسال پیامک‌های خودکار و سیاست تأیید نظرات گیمنت‌ها
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-card bg-foreground/20 border border-border">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-text-white">ارسال پیامک خودکار تأیید رزرو</span>
                <span className="text-xs text-text-muted">
                  ارسال پیامک حاوی کد پیگیری و جزئیات سانس بلافاصله پس از پرداخت موفق به کاربر.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification.autoSendBookingSms}
                  onChange={(e) => handleNotificationChange("autoSendBookingSms", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-foreground peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-card bg-foreground/20 border border-border">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-text-white">ارسال پیامک یادآوری ۱ ساعت قبل از سانس</span>
                <span className="text-xs text-text-muted">
                  ارسال یادآوری خودکار زمان رزرو برای جلوگیری از تاخیر کاربر.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification.autoSendReminderSms}
                  onChange={(e) => handleNotificationChange("autoSendReminderSms", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-foreground peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-white">الگوی پیامک خوش‌آمدگویی ثبت‌نام *</label>
              <textarea
                rows={3}
                value={formData.notification.welcomeSmsTemplate}
                onChange={(e) => handleNotificationChange("welcomeSmsTemplate", e.target.value)}
                placeholder="متن پیامک خوش‌آمدگویی..."
                className="p-3 rounded-card bg-foreground/40 border border-border text-sm text-text-white outline-none focus:border-primary placeholder:text-text-subtle"
              />
              {errors.welcomeSmsTemplate && (
                <span className="text-xs text-[var(--accent-red)]">{errors.welcomeSmsTemplate}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-white">سیاست انتشار نظرات کاربران</label>
              <select
                value={formData.notification.reviewApprovalPolicy}
                onChange={(e) =>
                  handleNotificationChange("reviewApprovalPolicy", e.target.value as "AUTO" | "MANUAL")
                }
                className="h-11 px-3.5 rounded-card bg-foreground/40 border border-border text-sm text-text-white outline-none focus:border-primary"
              >
                <option value="AUTO" className="bg-card-bg">
                  انتشار مستقیم و خودکار (توصیه‌شده)
                </option>
                <option value="MANUAL" className="bg-card-bg">
                  نیازمند بررسی و تأیید پیش از انتشار توسط مدیریت
                </option>
              </select>
              <span className="text-[11px] text-text-subtle">
                در حالت انتشار مستقیم، نظرات کاربران بلافاصله نمایش داده شده و مدیران امکان مخفی‌سازی بعدی را دارند.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: Security & Infrastructure (Read-only / Security) */}
      {activeTab === "security" && (
        <div className="bg-card-bg border border-border rounded-card p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-white">اطلاعات زیرساخت و امنیت سیستم</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)] font-bold">
                پایدار
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              ارزیابی وضعیت سرویس‌های جانبی، کلیدهای ارتباطی و گواهی‌نامه‌های امنیتی
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-card bg-foreground/20 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-card bg-primary-muted text-primary shrink-0">
                <Icon name="ticket" size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-muted">سامانه ارسال پیامک (SMS Gateway)</span>
                <span className="text-sm font-bold text-text-white">
                  {formData.securityInfo.smsGatewayProvider}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-[var(--accent-green)] mt-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-ping" />
                  <span>اتصال برقرار و فعال</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-card bg-foreground/20 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-card bg-primary-muted text-primary shrink-0">
                <Icon name="wallet" size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-muted">درگاه پرداخت الکترونیک</span>
                <span className="text-sm font-bold text-text-white">
                  {formData.securityInfo.paymentGatewayProvider}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-[var(--accent-green)] mt-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                  <span>آماده پذیرش تراکنش</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-card bg-foreground/20 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-card bg-primary-muted text-primary shrink-0">
                <Icon name="star" size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-muted">گواهی امنیتی SSL</span>
                <span className="text-sm font-bold text-text-white">
                  {formData.securityInfo.sslCertificateStatus}
                </span>
                <span className="text-xs text-text-subtle mt-1">رمزنگاری TLS 1.3 فعال است</span>
              </div>
            </div>

            <div className="p-4 rounded-card bg-foreground/20 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-card bg-primary-muted text-primary shrink-0">
                <Icon name="monitor" size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-text-muted">نسخه API و آخرین بک‌آپ</span>
                <span className="text-sm font-bold text-text-white">
                  نسخه {formData.securityInfo.apiVersion}
                </span>
                <span className="text-xs text-text-subtle mt-1">
                  آخرین پشتیبان‌گیری: {formData.securityInfo.lastBackupDate}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-card bg-foreground/30 border border-border text-xs text-text-muted flex items-start gap-3">
            <Icon name="info" size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-text-white">تذکر امنیتی:</strong> توکن‌های دسترسی API، کلیدهای ارتباطی درگاه و کلمه‌های عبور محرمانه در فایل‌های محیطی سرور (.env) به صورت انحصاری محافظت می‌شوند و به دلایل امنیتی از طریق این فرم قابل مشاهده یا تغییر مستقیم نیستند.
            </div>
          </div>
        </div>
      )}
    </AdminPageContainer>
  );
}
