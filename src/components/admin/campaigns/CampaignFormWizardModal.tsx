"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import type {
  AdminCampaign,
  AdminCampaignInput,
  DiscountType,
  CampaignScopeType,
  TargetAudienceType,
  CampaignStatus,
  AdminGamecenter,
  AdminUser,
} from "@/types/admin";
import { adminService } from "@/services/adminService";

interface CampaignFormWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AdminCampaign | null;
  onSuccess: (campaign: AdminCampaign) => void;
}

const AVAILABLE_DEVICE_OPTIONS = [
  { id: "PS5", label: "کنسول پلی‌استیشن ۵ (PS5)" },
  { id: "PC_VIP", label: "سیستم گیمینگ VIP (PC VIP)" },
  { id: "PC_STANDARD", label: "سیستم استاندارد (PC Standard)" },
  { id: "XBOX", label: "کنسول ایکس‌باکس (Xbox Series X/S)" },
  { id: "VR", label: "واقعیت مجازی (VR)" },
];

export const CampaignFormWizardModal: React.FC<CampaignFormWizardModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded Options for Selection
  const [gamecenters, setGamecenters] = useState<AdminGamecenter[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Step 1: Main Info
  const [title, setTitle] = useState(initialData?.title || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [status, setStatus] = useState<CampaignStatus>(initialData?.status || "ACTIVE");

  // Step 2: Execution Scope
  const [scopeType, setScopeType] = useState<CampaignScopeType>(initialData?.scopeType || "GLOBAL");
  const [selectedGamecenterIds, setSelectedGamecenterIds] = useState<string[]>(
    initialData?.applicableGamecenterIds || []
  );
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>(
    initialData?.applicableDeviceTypes || []
  );

  // Step 3: Target Audience
  const [targetAudience, setTargetAudience] = useState<TargetAudienceType>(
    initialData?.targetAudience || "ALL"
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    initialData?.specificUserIds || []
  );

  // Step 4: Discount Value & Financial Limits
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialData?.discountType || "PERCENTAGE"
  );
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discountValue || 20);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>(
    initialData?.maxDiscountAmount
  );
  const [minOrderAmount, setMinOrderAmount] = useState<number | undefined>(
    initialData?.minOrderAmount
  );

  // Step 5: Time Period & Usage Limits
  const [startDate, setStartDate] = useState(initialData?.startDate || "۱۴۰۳/۰۷/۰۱");
  const [endDate, setEndDate] = useState(initialData?.endDate || "۱۴۰۳/۰۷/۳۰");
  const [totalUsageLimit, setTotalUsageLimit] = useState<number | undefined>(
    initialData?.totalUsageLimit
  );
  const [perUserUsageLimit, setPerUserUsageLimit] = useState<number | undefined>(
    initialData?.perUserUsageLimit || 1
  );

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      adminService.getGamecenters({ pageSize: 100 }).then((res) => setGamecenters(res.items)).catch(console.warn);
      adminService.getUsers({ pageSize: 100 }).then((res) => setUsers(res.items)).catch(console.warn);

      setCurrentStep(1);
      setError(null);
      setTitle(initialData?.title || "");
      setCode(initialData?.code || "");
      setDescription(initialData?.description || "");
      setStatus(initialData?.status || "ACTIVE");
      setScopeType(initialData?.scopeType || "GLOBAL");
      setSelectedGamecenterIds(initialData?.applicableGamecenterIds || []);
      setSelectedDeviceTypes(initialData?.applicableDeviceTypes || []);
      setTargetAudience(initialData?.targetAudience || "ALL");
      setSelectedUserIds(initialData?.specificUserIds || []);
      setDiscountType(initialData?.discountType || "PERCENTAGE");
      setDiscountValue(initialData?.discountValue || 20);
      setMaxDiscountAmount(initialData?.maxDiscountAmount);
      setMinOrderAmount(initialData?.minOrderAmount);
      setStartDate(initialData?.startDate || "۱۴۰۳/۰۷/۰۱");
      setEndDate(initialData?.endDate || "۱۴۰۳/۰۷/۳۰");
      setTotalUsageLimit(initialData?.totalUsageLimit);
      setPerUserUsageLimit(initialData?.perUserUsageLimit || 1);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let res = "SAYRA";
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(res);
  };

  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    if (stepNumber === 1) {
      if (!title.trim()) {
        setError("لطفاً نام یا عنوان کمپین را وارد کنید.");
        return false;
      }
      if (!code.trim()) {
        setError("لطفاً کد تخفیف را وارد کنید.");
        return false;
      }
    }

    if (stepNumber === 2) {
      if (scopeType === "SPECIFIC_GAMECENTERS" && selectedGamecenterIds.length === 0) {
        setError("لطفاً حداقل یک گیمنت را برای اجرای کمپین انتخاب کنید.");
        return false;
      }
      if (scopeType === "DEVICE_TYPES" && selectedDeviceTypes.length === 0) {
        setError("لطفاً حداقل یک نوع دستگاه را انتخاب کنید.");
        return false;
      }
    }

    if (stepNumber === 3) {
      if (targetAudience === "SPECIFIC_USERS" && selectedUserIds.length === 0) {
        setError("لطفاً حداقل یک کاربر هدف را انتخاب کنید.");
        return false;
      }
    }

    if (stepNumber === 4) {
      if (!discountValue || discountValue <= 0) {
        setError("مقدار تخفیف باید یک عدد مثبت باشد.");
        return false;
      }
      if (discountType === "PERCENTAGE" && (discountValue < 1 || discountValue > 100)) {
        setError("درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد.");
        return false;
      }
    }

    if (stepNumber === 5) {
      if (!startDate.trim() || !endDate.trim()) {
        setError("لطفاً بازه زمانی شروع و پایان کمپین را مشخص کنید.");
        return false;
      }
      if (endDate.localeCompare(startDate, "fa") < 0) {
        setError("تاریخ پایان کمپین نمی‌تواند پیش از تاریخ شروع باشد.");
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(6, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    const payload: AdminCampaignInput = {
      title: title.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      status,
      scopeType,
      applicableGamecenterIds: scopeType === "SPECIFIC_GAMECENTERS" ? selectedGamecenterIds : undefined,
      applicableDeviceTypes: scopeType === "DEVICE_TYPES" ? selectedDeviceTypes : undefined,
      targetAudience,
      specificUserIds: targetAudience === "SPECIFIC_USERS" ? selectedUserIds : undefined,
      discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : undefined,
      perUserUsageLimit: perUserUsageLimit ? Number(perUserUsageLimit) : undefined,
    };

    try {
      let result: AdminCampaign;
      if (initialData) {
        result = await adminService.updateCampaign(initialData.id, payload);
      } else {
        result = await adminService.createCampaign(payload);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "خطا در ذخیره‌سازی کمپین تخفیف.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    "اطلاعات اصلی",
    "دامنه اجرا",
    "مخاطب هدف",
    "مقدار تخفیف",
    "بازه و حدود",
    "مرور و ثبت",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "ویرایش کمپین تخفیف" : "ایجاد کمپین تخفیف جدید"}
      className="max-w-[720px] max-h-[90vh] overflow-y-auto"
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Step Wizard Progress Header */}
        <div className="flex flex-col gap-2 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--primary)]">
              مرحله {currentStep} از ۶: {stepTitles[currentStep - 1]}
            </span>
            <span className="text-[var(--text-subtle)] font-normal">
              درصد پیشرفت: {Math.round((currentStep / 6) * 100)}٪
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {stepTitles.map((titleText, idx) => {
              const stepNum = idx + 1;
              const isActive = stepNum === currentStep;
              const isPassed = stepNum < currentStep;

              return (
                <button
                  key={stepNum}
                  type="button"
                  onClick={() => {
                    if (isPassed) setCurrentStep(stepNum);
                  }}
                  disabled={!isPassed && !isActive}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isActive
                      ? "bg-[var(--primary)]"
                      : isPassed
                      ? "bg-[var(--accent-green)] cursor-pointer"
                      : "bg-[var(--foreground)]"
                  }`}
                  title={`${stepNum}. ${titleText}`}
                />
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Main Info */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-4 p-4 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۱. عنوان، کد تخفیف و توضیحات کمپین
            </span>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                عنوان یا نام کمپین *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: تخفیف خوش‌آمدگویی کاربران جدید"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  کد تخفیف (کوپن) *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
                >
                  تولید کد تصادفی
                </button>
              </div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME50"
                className="dir-ltr text-right font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                توضیحات تکمیلی کمپین
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاهی درباره شرایط استفاده از این کمپین تخفیفی..."
                rows={3}
                className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                وضعیت اولیه کمپین
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="w-full h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
              >
                <option value="ACTIVE" className="bg-[var(--bg-card)]">فعال (ACTIVE)</option>
                <option value="INACTIVE" className="bg-[var(--bg-card)]">غیرفعال (INACTIVE)</option>
                <option value="SCHEDULED" className="bg-[var(--bg-card)]">زمان‌بندی‌شده (SCHEDULED)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Execution Scope */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-4 p-4 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۲. دامنه اجرا و شمول تخفیف
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setScopeType("GLOBAL")}
                className={`p-3.5 rounded-card border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                  scopeType === "GLOBAL"
                    ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-white)] font-bold"
                    : "bg-[var(--foreground)]/30 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
                }`}
              >
                <span className="text-xs">سراسری (تمام پلتفرم)</span>
                <span className="text-[11px] font-normal text-[var(--text-subtle)]">
                  شامل تمامی گیمنت‌ها و رزروها
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScopeType("SPECIFIC_GAMECENTERS")}
                className={`p-3.5 rounded-card border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                  scopeType === "SPECIFIC_GAMECENTERS"
                    ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-white)] font-bold"
                    : "bg-[var(--foreground)]/30 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
                }`}
              >
                <span className="text-xs">گیمنت‌های مشخص</span>
                <span className="text-[11px] font-normal text-[var(--text-subtle)]">
                  انتخاب یک یا چند مرکز خاص
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScopeType("DEVICE_TYPES")}
                className={`p-3.5 rounded-card border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                  scopeType === "DEVICE_TYPES"
                    ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-white)] font-bold"
                    : "bg-[var(--foreground)]/30 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
                }`}
              >
                <span className="text-xs">نوع دستگاه / سرویس</span>
                <span className="text-[11px] font-normal text-[var(--text-subtle)]">
                  مخصوص PS5، PC VIP و غیره
                </span>
              </button>
            </div>

            {/* Sub-selection for Specific Gamecenters */}
            {scopeType === "SPECIFIC_GAMECENTERS" && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  گیمنت‌های مشمول را انتخاب کنید:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[var(--foreground)]/20 rounded-card border border-[var(--border-subtle)]">
                  {gamecenters.map((gc) => {
                    const isChecked = selectedGamecenterIds.includes(gc.id);
                    return (
                      <label
                        key={gc.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-[var(--foreground)]/40 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGamecenterIds((prev) => [...prev, gc.id]);
                            } else {
                              setSelectedGamecenterIds((prev) =>
                                prev.filter((id) => id !== gc.id)
                              );
                            }
                          }}
                          className="accent-[var(--primary)]"
                        />
                        <span className="font-bold text-[var(--text-white)]">{gc.name}</span>
                        <span className="text-[var(--text-subtle)] text-[11px]">({gc.city})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-selection for Device Types */}
            {scopeType === "DEVICE_TYPES" && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  انواع دستگاه‌های مشمول:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-[var(--foreground)]/20 rounded-card border border-[var(--border-subtle)]">
                  {AVAILABLE_DEVICE_OPTIONS.map((dev) => {
                    const isChecked = selectedDeviceTypes.includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-[var(--foreground)]/40 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDeviceTypes((prev) => [...prev, dev.id]);
                            } else {
                              setSelectedDeviceTypes((prev) =>
                                prev.filter((id) => id !== dev.id)
                              );
                            }
                          }}
                          className="accent-[var(--primary)]"
                        />
                        <span className="font-bold text-[var(--text-white)]">{dev.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Target Audience */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-4 p-4 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۳. مخاطبان و گروه‌های هدف
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: "ALL", title: "همه کاربران", desc: "بدون محدودیت برای تمام مشتریان" },
                { type: "NEW_USERS", title: "کاربران جدید", desc: "کاربران تازه ثبت‌نام‌شده" },
                { type: "FIRST_RESERVATION", title: "اولین رزرو", desc: "کاربرانی که رزرو قبلی ندارند" },
                { type: "REGULAR_CUSTOMERS", title: "مشتریان دائمی", desc: "کاربران فعال با رزروهای متعدد" },
                { type: "SPECIFIC_USERS", title: "کاربران خاص", desc: "انتخاب دستی کاربران هدف" },
              ].map((aud) => (
                <button
                  key={aud.type}
                  type="button"
                  onClick={() => setTargetAudience(aud.type as TargetAudienceType)}
                  className={`p-3.5 rounded-card border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                    targetAudience === aud.type
                      ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-white)] font-bold"
                      : "bg-[var(--foreground)]/30 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  <span className="text-xs">{aud.title}</span>
                  <span className="text-[11px] font-normal text-[var(--text-subtle)]">
                    {aud.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Sub-selection for Specific Users */}
            {targetAudience === "SPECIFIC_USERS" && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  کاربران مورد نظر را انتخاب کنید:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[var(--foreground)]/20 rounded-card border border-[var(--border-subtle)]">
                  {users.map((u) => {
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-[var(--foreground)]/40 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds((prev) => [...prev, u.id]);
                            } else {
                              setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                            }
                          }}
                          className="accent-[var(--primary)]"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-white)]">{u.fullName}</span>
                          <span className="text-[var(--text-subtle)] text-[11px]">{u.phone}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Discount Value & Limits */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-4 p-4 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۴. تنظیم میزان تخفیف و سقف‌های مالی
            </span>

            <div className="flex items-center gap-4 p-3 bg-[var(--foreground)]/20 rounded-card border border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-[var(--text-muted)]">نوع تخفیف:</span>
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-white)] cursor-pointer">
                <input
                  type="radio"
                  name="discountType"
                  checked={discountType === "PERCENTAGE"}
                  onChange={() => setDiscountType("PERCENTAGE")}
                  className="accent-[var(--primary)]"
                />
                <span>درصدی (٪)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-white)] cursor-pointer">
                <input
                  type="radio"
                  name="discountType"
                  checked={discountType === "FIXED_AMOUNT"}
                  onChange={() => setDiscountType("FIXED_AMOUNT")}
                  className="accent-[var(--primary)]"
                />
                <span>مبلغ ثابت (تومان)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  {discountType === "PERCENTAGE" ? "میزان تخفیف (درصد) *" : "میزان تخفیف (تومان) *"}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder={discountType === "PERCENTAGE" ? "مثلاً ۲۰" : "مثلاً ۵۰۰۰۰"}
                />
              </div>

              {discountType === "PERCENTAGE" && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                    حداکثر سقف تخفیف (تومان)
                  </label>
                  <Input
                    type="number"
                    value={maxDiscountAmount || ""}
                    onChange={(e) =>
                      setMaxDiscountAmount(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="مثلاً ۱۰۰۰۰۰ (خالی یعنی بدون سقف)"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  حداقل مبلغ سفارش برای تخفیف (تومان)
                </label>
                <Input
                  type="number"
                  value={minOrderAmount || ""}
                  onChange={(e) =>
                    setMinOrderAmount(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="مثلاً ۱۵۰۰۰۰ (خالی یعنی بدون حداقل)"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Time Period & Usage Limits */}
        {currentStep === 5 && (
          <div className="flex flex-col gap-4 p-4 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۵. بازه زمانی و محدودیت تعداد استفاده
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  تاریخ شروع کمپین *
                </label>
                <Input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="۱۴۰۳/۰۷/۰۱"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  تاریخ پایان کمپین *
                </label>
                <Input
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="۱۴۰۳/۰۷/۳۰"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  حداکثر کل تعداد استفاده (سقف عمومی)
                </label>
                <Input
                  type="number"
                  value={totalUsageLimit || ""}
                  onChange={(e) =>
                    setTotalUsageLimit(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="مثلاً ۵۰۰ (خالی یعنی نامحدود)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  سقف استفاده برای هر کاربر
                </label>
                <Input
                  type="number"
                  value={perUserUsageLimit || ""}
                  onChange={(e) =>
                    setPerUserUsageLimit(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="مثلاً ۱ (خالی یعنی نامحدود)"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Submit */}
        {currentStep === 6 && (
          <div className="flex flex-col gap-4 p-4 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۶. مرور نهایی اطلاعات و تأیید ثبت
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--primary)]">اطلاعات اصلی</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-[var(--text-subtle)] hover:text-white"
                  >
                    ویرایش
                  </button>
                </div>
                <span className="font-bold text-[var(--text-white)]">{title}</span>
                <span className="font-mono text-[var(--primary)] font-bold">کد: {code}</span>
              </div>

              <div className="p-3 bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--primary)]">دامنه اجرا</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] text-[var(--text-subtle)] hover:text-white"
                  >
                    ویرایش
                  </button>
                </div>
                <span className="text-[var(--text-white)]">
                  {scopeType === "GLOBAL"
                    ? "سراسر پلتفرم"
                    : scopeType === "SPECIFIC_GAMECENTERS"
                    ? `${selectedGamecenterIds.length} گیمنت انتخاب‌شده`
                    : `${selectedDeviceTypes.length} نوع دستگاه`}
                </span>
              </div>

              <div className="p-3 bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--primary)]">مخاطب هدف</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-[11px] text-[var(--text-subtle)] hover:text-white"
                  >
                    ویرایش
                  </button>
                </div>
                <span className="text-[var(--text-white)]">
                  {targetAudience === "ALL"
                    ? "همه کاربران"
                    : targetAudience === "NEW_USERS"
                    ? "کاربران جدید"
                    : targetAudience === "FIRST_RESERVATION"
                    ? "اولین رزرو"
                    : targetAudience === "REGULAR_CUSTOMERS"
                    ? "مشتریان دائمی"
                    : `${selectedUserIds.length} کاربر خاص`}
                </span>
              </div>

              <div className="p-3 bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--primary)]">مقدار تخفیف</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-[11px] text-[var(--text-subtle)] hover:text-white"
                  >
                    ویرایش
                  </button>
                </div>
                <span className="text-[var(--text-white)] font-bold">
                  {discountType === "PERCENTAGE"
                    ? `${discountValue}٪ (سقف ${maxDiscountAmount ? maxDiscountAmount.toLocaleString("fa-IR") + " تومان" : "نامحدود"})`
                    : `${discountValue.toLocaleString("fa-IR")} تومان`}
                </span>
              </div>

              <div className="p-3 bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] flex flex-col gap-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--primary)]">بازه زمانی و سقف استفاده</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="text-[11px] text-[var(--text-subtle)] hover:text-white"
                  >
                    ویرایش
                  </button>
                </div>
                <span className="text-[var(--text-white)]">
                  از {startDate} تا {endDate} • سقف کل: {totalUsageLimit ? totalUsageLimit : "نامحدود"} • سقف هر کاربر: {perUserUsageLimit ? perUserUsageLimit : "نامحدود"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <div>
            {currentStep > 1 && (
              <Button variant="secondary" onClick={handlePrevStep} disabled={isSubmitting}>
                مرحله قبلی
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              انصراف
            </Button>

            {currentStep < 6 ? (
              <Button variant="primary" onClick={handleNextStep}>
                مرحله بعدی
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                {initialData ? "ذخیره تغییرات" : "تأیید و ایجاد کمپین"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
