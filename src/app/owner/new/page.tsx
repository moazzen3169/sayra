"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useAuth } from "@/context/AuthContext";
import { useOwner } from "@/context/OwnerContext";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { authService } from "@/services/authService";
import { ownerService } from "@/services/ownerService";
import { Icon } from "@/components/ui/Icon";
import { IRAN_PROVINCES, type ProvinceInfo } from "@/data/iranLocations";
import { LocationMapPicker } from "@/components/owner/LocationMapPicker";
import { BannerSlider } from "@/components/BannerSlider";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type { CenterSettings } from "@/types/owner";

const DAYS_OF_WEEK = [
  { id: "saturday", label: "شنبه" },
  { id: "sunday", label: "یک‌شنبه" },
  { id: "monday", label: "دوشنبه" },
  { id: "tuesday", label: "سه‌شنبه" },
  { id: "wednesday", label: "چهارشنبه" },
  { id: "thursday", label: "پنج‌شنبه" },
  { id: "friday", label: "جمعه" },
];

const inputClass =
  "w-full h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors";

export default function NewGamingCenterPage() {
  const router = useRouter();
  const { isLoggedIn, user, login } = useAuth();
  const { me, refreshCenters } = useOwner();

  // 6 Steps Wizard State
  // 1: اطلاعات اولیه & احراز هویت مدیر
  // 2: آدرس و موقعیت مکانی
  // 3: ساعات کاری و روزهای تعطیل
  // 4: تصاویر و لوگو
  // 5: پیش‌نمایش (Preview)
  // 6: ثبت نهایی
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // --- مرحله اول: اطلاعات اولیه و مدیر ---
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [managerFullName, setManagerFullName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");

  // OTP State in Step 1
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(120);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Popular Games (included in creation)
  const [selectedGames, setSelectedGames] = useState<string[]>([
    "EA Sports FC 25",
    "Call of Duty: Modern Warfare III",
    "GTA V",
  ]);

  // --- مرحله دوم: آدرس و موقعیت مکانی ---
  const [province, setProvince] = useState("تهران");
  const [city, setCity] = useState("تهران");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(35.6892);
  const [longitude, setLongitude] = useState(51.3890);

  // --- مرحله سوم: ساعات کاری و روزهای تعطیل ---
  const [workStartTime, setWorkStartTime] = useState("10:00");
  const [workEndTime, setWorkEndTime] = useState("02:00"); // Overnight supported
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [allowOnlineBooking, setAllowOnlineBooking] = useState(true);
  const [onlineBookingAutoConfirm, setOnlineBookingAutoConfirm] = useState(false);

  // --- مرحله چهارم: تصاویر ---
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Submission Progress & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgressText, setSubmitProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  // Populate manager defaults if already logged in
  useEffect(() => {
    if (isLoggedIn && user) {
      if (!managerFullName && user.fullName) setManagerFullName(user.fullName);
      if (!managerPhone && user.phone) setManagerPhone(user.phone);
      setOtpVerified(true);
    }
  }, [isLoggedIn, user, managerFullName, managerPhone]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && otpTimer > 0 && !otpVerified) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer, otpVerified]);

  // Handle Province Change & update city list + default coordinates
  const handleProvinceChange = (provName: string) => {
    setProvince(provName);
    const found = IRAN_PROVINCES.find((p) => p.name === provName);
    if (found) {
      if (found.cities.length > 0) {
        setCity(found.cities[0]);
      }
      setLatitude(found.defaultLat);
      setLongitude(found.defaultLng);
    }
  };

  // Auto-generate English slug from center name if not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      setSlug(generated || "");
    }
  };

  // Toggle closed days
  const toggleClosedDay = (dayId: string) => {
    setClosedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Check if hours cross midnight
  const isOvernight = (() => {
    if (!workStartTime || !workEndTime) return false;
    const [startH, startM] = workStartTime.split(":").map(Number);
    const [endH, endM] = workEndTime.split(":").map(Number);
    return endH < startH || (endH === startH && endM < startM);
  })();

  // OTP Step 1 Handlers
  const handleSendOtp = async () => {
    setOtpError(null);
    const cleanPhone = managerPhone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setOtpError("لطفاً شماره تماس معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    setIsSendingOtp(true);
    try {
      try {
        await authService.requestUserOtp(cleanPhone);
      } catch {
        // Fallback to general OTP endpoint
        await authService.requestOtp(cleanPhone);
      }
      setOtpSent(true);
      setOtpTimer(120);
      setOtpCode(["", "", "", "", "", ""]);
    } catch (err) {
      setOtpError(getErrorMessage(err));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/[^\d]/g, "").slice(0, 6).split("");
      const newOtp = [...otpCode];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpCode(newOtp);
      return;
    }

    const clean = value.replace(/[^\d]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = clean;
    setOtpCode(newOtp);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`creator-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`creator-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    const fullCode = otpCode.join("");
    if (fullCode.length < 6) {
      setOtpError("لطفاً کد تایید ۶ رقمی را کامل وارد کنید.");
      return;
    }

    const cleanPhone = managerPhone.trim().replace(/[^\d]/g, "");
    setIsVerifyingOtp(true);
    try {
      // Authenticate via customer OTP verification which directly verifies and returns tokens
      const authRes = await authService.verifyOtp(cleanPhone, fullCode);
      const accessToken = authRes?.accessToken;
      const refreshToken = authRes?.refreshToken || "";
      const resUser = authRes?.user;

      if (!accessToken) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      const userName = managerFullName.trim() || resUser?.fullName || "مدیر گیم‌نت";
      login(userName, cleanPhone, accessToken, refreshToken, "MANAGER");
      setOtpVerified(true);
      setOtpError(null);
    } catch (err) {
      setOtpError(getErrorMessage(err));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Image Upload Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setGalleryFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Validations for each step
  const validateStep = (stepNumber: number): boolean => {
    setErrorMsg(null);

    if (stepNumber === 1) {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMsg("لطفاً نام GameCenter را وارد کنید (حداقل ۲ نویسه).");
        return false;
      }
      if (!managerFullName.trim() || managerFullName.trim().length < 2) {
        setErrorMsg("لطفاً نام و نام خانوادگی Manager را وارد کنید.");
        return false;
      }
      const cleanPhone = managerPhone.trim().replace(/[^\d]/g, "");
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMsg("لطفاً شماره تماس معتبر برای مدیر وارد کنید.");
        return false;
      }
      if (!otpVerified && !isLoggedIn) {
        setErrorMsg("لطفاً کد تایید شماره تماس (OTP) را دریافت و تایید کنید.");
        return false;
      }
      return true;
    }

    if (stepNumber === 2) {
      if (!province.trim()) {
        setErrorMsg("لطفاً استان را انتخاب کنید.");
        return false;
      }
      if (!city.trim()) {
        setErrorMsg("لطفاً شهر را مشخص کنید.");
        return false;
      }
      if (!address.trim() || address.trim().length < 5) {
        setErrorMsg("لطفاً آدرس دقیق و کامل با جزئیات را وارد کنید.");
        return false;
      }
      if (latitude === 0 || longitude === 0) {
        setErrorMsg("لطفاً موقعیت مکانی را روی نقشه انتخاب کنید.");
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      if (!workStartTime || !workEndTime) {
        setErrorMsg("لطفاً ساعت شروع و پایان فعالیت را مشخص کنید.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => (Math.min(6, prev + 1) as any));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => (Math.max(1, prev - 1) as any));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Jump to step from Preview
  const handleEditSection = (targetStep: 1 | 2 | 3 | 4) => {
    setErrorMsg(null);
    setStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submission (Step 6)
  const handleFinalSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSubmitProgressText("در حال آغاز ثبت اطلاعات مرکز بازی...");

    try {
      const resolvedOwnerId = me?.id || user?.id || `owner-${managerPhone.replace(/[^\d]/g, "")}`;
      const effectiveSlug = (slug.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-") || `gc-${Date.now()}`;

      // 1. POST /gamingCenters
      setSubmitProgressText("در حال ایجاد مرکز بازی در سامانه...");
      const createdCenter = await ownerService.createGamingCenter({
        name: name.trim(),
        slug: effectiveSlug,
        ownerId: resolvedOwnerId,
        games: selectedGames,
      });

      const centerId = createdCenter.id || createdCenter.slug;

      // 2. POST /gamingCenters/{id}/addresses & PATCH /gamingCenters/{id}
      setSubmitProgressText("در حال ثبت آدرس و موقعیت مکانی...");
      const userEnteredAddress = address.trim();
      const fullAddressString = `${province}، ${city.trim()}، ${userEnteredAddress} (مختصات: ${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
      await ownerService.createAddress(centerId, {
        addressLine: userEnteredAddress,
        address: fullAddressString,
        city: city.trim(),
        province: province.trim() || undefined,
        phone: managerPhone.trim() || undefined,
        lat: latitude,
        lng: longitude,
      });
      await ownerService.patchCenter(centerId, {
        address: fullAddressString,
        phone: managerPhone.trim() || undefined,
      }).catch((err) => {
        console.warn("Center address patch warning:", err);
      });

      // 3. PUT /gamingCenters/{id}/settings
      setSubmitProgressText("در حال ثبت ساعات کاری و تنظیمات...");
      const settingsPayload: CenterSettings = {
        timeZone: "Asia/Tehran",
        workStartTime: workStartTime,
        workEndTime: workEndTime,
        allowOnlineBooking: allowOnlineBooking,
        onlineBookingAutoConfirm: onlineBookingAutoConfirm,
        preventOverlaps: true,
      };
      await ownerService.updateSettings(centerId, settingsPayload).catch((err) => {
        console.warn("Settings submission warning:", err);
      });

      // 4. POST /gamingCenters/{id}/media/upload (Logo & Gallery)
      if (logoFile) {
        setSubmitProgressText("در حال آپلود لوگوی مجموعه...");
        await ownerService.uploadGalleryImage(centerId, logoFile, {
          purpose: "LOGO",
          altText: `لوگوی ${name}`,
        }).catch((err) => {
          console.warn("Logo upload warning:", err);
        });
      }

      if (galleryFiles.length > 0) {
        setSubmitProgressText("در حال آپلود تصاویر گالری...");
        for (const gFile of galleryFiles) {
          await ownerService.uploadGalleryImage(centerId, gFile, {
            purpose: "GALLERY",
            altText: gFile.name,
          }).catch((err) => {
            console.warn("Gallery upload warning:", err);
          });
        }
      }

      setCreatedResult({
        id: centerId,
        name: createdCenter.name || name,
        slug: createdCenter.slug || effectiveSlug,
      });

      try {
        localStorage.setItem("sayra_owner_center_id", centerId);
      } catch {
        // ignore
      }

      // Refresh OwnerContext so the newly created gaming center is reflected immediately in memory
      try {
        await refreshCenters();
      } catch {
        // ignore
      }
    } catch (err) {
      // Keep all entered state untouched so user can retry
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setSubmitProgressText("");
    }
  };

  // Step Indicators Configuration
  const STEPS_LIST = [
    { num: 1, title: "اطلاعات اولیه" },
    { num: 2, title: "موقعیت مکانی" },
    { num: 3, title: "ساعات کاری" },
    { num: 4, title: "تصاویر" },
    { num: 5, title: "پیش‌نمایش" },
    { num: 6, title: "ثبت نهایی" },
  ];

  const currentProvinceInfo = IRAN_PROVINCES.find((p) => p.name === province) || IRAN_PROVINCES[0];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-16">
      <OwnerPageHeader title="ایجاد GameCenter جدید" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-6 max-w-3xl mx-auto w-full">
        {/* Stepper Wizard Indicator */}
        <div className="mb-6 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto">
          <div className="flex items-center justify-between min-w-[340px] gap-2">
            {STEPS_LIST.map((s, idx) => {
              const isActive = step === s.num;
              const isPassed = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2 flex-1 last:flex-initial">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                        isActive
                          ? "bg-[var(--primary)] text-black ring-2 ring-[var(--primary)]/30"
                          : isPassed
                          ? "bg-[var(--accent-green)] text-black"
                          : "bg-[var(--foreground)]/60 text-[var(--text-subtle)]"
                      }`}
                    >
                      {isPassed ? "✓" : toPersianDigits(s.num)}
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap font-bold ${
                        isActive
                          ? "text-[var(--text-white)]"
                          : isPassed
                          ? "text-[var(--accent-green)]"
                          : "text-[var(--text-subtle)]"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>

                  {idx < STEPS_LIST.length - 1 && (
                    <div
                      className={`flex-1 h-[2px] mx-1 transition-colors ${
                        step > s.num ? "bg-[var(--accent-green)]" : "bg-[var(--border-subtle)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
            <Icon name="alert" size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Screen after complete submission */}
        {createdResult ? (
          <div className="p-6 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-green)]/20 text-[var(--accent-green)] flex items-center justify-center text-2xl font-black">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-white)]">
                GameCenter «{createdResult.name}» با موفقیت ثبت شد!
              </h3>
              <p className="text-xs text-[var(--text-subtle)] mt-1.5 max-w-md mx-auto">
                شناسه مرکز با موفقیت دریافت گردید. هم‌اکنون می‌توانید وارد پنل مدیریت Manager شوید.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await refreshCenters();
                  } catch {
                    // ignore
                  }
                  router.push("/owner");
                }}
                className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform text-center cursor-pointer"
              >
                ورود به پنل Manager
              </button>
              <Link
                href={`/gamecenter/${encodeURIComponent(createdResult.slug)}`}
                className="px-6 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-[var(--text-white)] text-xs font-bold hover:bg-[var(--foreground)]/80 active:scale-95 transition-transform text-center"
              >
                مشاهده صفحه عمومی گیم‌نت
              </Link>
            </div>
          </div>
        ) : (
          /* Wizard Main Container */
          <div className="p-5 sm:p-6 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-6">

            {/* ============================================================ */}
            {/* مرحله اول: اطلاعات اولیه & مدیر */}
            {/* ============================================================ */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">مرحله اول: اطلاعات اولیه</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    نام GameCenter، مشخصات Manager و شماره تماس جهت احراز هویت را وارد کنید.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* نام GameCenter */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      نام GameCenter <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="مثال: گیم‌نت گرگدن"
                      className={inputClass}
                    />
                  </div>

                  {/* نام و نام خانوادگی Manager */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      نام و نام خانوادگی Manager <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={managerFullName}
                      onChange={(e) => setManagerFullName(e.target.value)}
                      placeholder="مثال: علی احمدی"
                      className={inputClass}
                    />
                  </div>

                  {/* شماره تماس Manager */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      شماره تماس Manager <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        dir="ltr"
                        value={managerPhone}
                        onChange={(e) => {
                          setManagerPhone(e.target.value);
                          if (otpVerified) setOtpVerified(false);
                        }}
                        disabled={otpVerified}
                        placeholder="09123456789"
                        className={`${inputClass} text-left font-mono ${
                          otpVerified ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/40 text-[var(--accent-green)]" : ""
                        }`}
                      />
                      {!otpVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || (otpSent && otpTimer > 0)}
                          className="px-4 py-2 rounded-card bg-[var(--primary)] text-black text-xs font-bold shrink-0 hover:brightness-105 disabled:opacity-50 transition-opacity"
                        >
                          {isSendingOtp
                            ? "ارسال..."
                            : otpSent && otpTimer > 0
                            ? `${toPersianDigits(otpTimer)} ثانیه`
                            : "ارسال OTP"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* OTP Verification Box */}
                  {otpSent && !otpVerified && (
                    <div className="p-4 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-white)]">
                          کد تایید پیامک‌شده را وارد کنید:
                        </span>
                        {otpTimer > 0 ? (
                          <span className="text-xs text-[var(--primary)] font-bold">
                            زمان باقیمانده: {toPersianDigits(otpTimer)} ثانیه
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="text-xs text-[var(--primary)] font-bold hover:underline"
                          >
                            ارسال مجدد کد
                          </button>
                        )}
                      </div>

                      <div className="flex justify-center gap-2 dir-ltr">
                        {otpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`creator-otp-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="w-11 h-12 text-center text-lg font-black rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-[var(--text-white)] outline-none"
                          />
                        ))}
                      </div>

                      {otpError && (
                        <p className="text-xs text-[var(--accent-red)] font-bold">{otpError}</p>
                      )}

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || otpCode.join("").length < 6}
                        className="w-full py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 disabled:opacity-50 transition-opacity"
                      >
                        {isVerifyingOtp ? "در حال تایید..." : "تایید شماره و صدور توکن احراز هویت"}
                      </button>
                    </div>
                  )}

                  {/* Verification Success Badge */}
                  {otpVerified && (
                    <div className="p-3 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Icon name="check" size={16} />
                        شماره تماس تایید شد و حساب Manager متصل گردید.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpVerified(false);
                          setOtpSent(false);
                        }}
                        className="text-[11px] underline text-[var(--text-subtle)] hover:text-white"
                      >
                        تغییر شماره
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    <span>مرحله بعد: آدرس و موقعیت</span>
                    <Icon name="back" size={16} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* مرحله دوم: آدرس و موقعیت مکانی */}
            {/* ============================================================ */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">مرحله دوم: آدرس و موقعیت مکانی</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    استان، شهر، آدرس دقیق و موقعیت مکانی روی نقشه را تعیین کنید.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* استان */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      استان <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <select
                      value={province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className={inputClass}
                    >
                      {IRAN_PROVINCES.map((prov) => (
                        <option key={prov.name} value={prov.name} className="bg-[var(--bg-card)]">
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* شهر */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      شهر <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                    >
                      {currentProvinceInfo.cities.map((c) => (
                        <option key={c} value={c} className="bg-[var(--bg-card)]">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* آدرس دقیق */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                    آدرس دقیق با جزئیات <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: خیابان ولیعصر، نرسیده به میدان ونک، پلاک ۱۲، طبقه منفی ۱"
                    className="w-full p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors resize-none"
                  />
                </div>

                {/* نقشه و مختصات جغرافیایی */}
                <LocationMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  cityName={city}
                  provinceName={province}
                  onChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80"
                  >
                    مرحله قبل
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    <span>مرحله بعد: ساعات کاری</span>
                    <Icon name="back" size={16} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* مرحله سوم: ساعات کاری */}
            {/* ============================================================ */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">مرحله سوم: ساعات کاری و روزهای فعالیت</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    ساعات شروع و پایان و روزهای تعطیل را مشخص کنید. امکان تنظیم ساعات شبانه‌روزی و عبور از نیمه‌شب وجود دارد.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ساعت شروع فعالیت */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      ساعت شروع فعالیت <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <input
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* ساعت پایان فعالیت */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                      ساعت پایان فعالیت <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <input
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* نشانگر عبور از نیمه‌شب */}
                {isOvernight && (
                  <div className="p-3 rounded-card bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold flex items-center gap-2">
                    <Icon name="clock" size={16} />
                    <span>
                      ساعات کاری از نیمه‌شب عبور می‌کند (پایان در بامداد روز بعد: ساعت {toPersianDigits(workEndTime)}).
                    </span>
                  </div>
                )}

                {/* روزهای تعطیل */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-white)] mb-2">
                    روزهای تعطیل مجموعه
                  </label>
                  <p className="text-[11px] text-[var(--text-subtle)] mb-2.5">
                    در صورتی که در روزهای خاصی از هفته تعطیل هستید، آن‌ها را انتخاب کنید (عدم انتخاب = بدون تعطیلی).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const isClosed = closedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleClosedDay(day.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isClosed
                              ? "bg-[var(--accent-red)] text-white shadow-sm"
                              : "bg-[var(--foreground)]/60 text-[var(--text-subtle)] hover:text-white border border-[var(--border-subtle)]"
                          }`}
                        >
                          {day.label} {isClosed ? "(تعطیل)" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* رزرو آنلاین */}
                <div className="p-4 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-white)] block">
                      امکان رزرو آنلاین فعال باشد
                    </span>
                    <span className="text-[11px] text-[var(--text-subtle)] block mt-0.5">
                      مشتریان می‌توانند از طریق پلتفرم سِیرَن نوبت رزرو کنند.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowOnlineBooking}
                    onChange={(e) => setAllowOnlineBooking(e.target.checked)}
                    className="w-5 h-5 accent-[var(--primary)] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80"
                  >
                    مرحله قبل
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    <span>مرحله بعد: تصاویر</span>
                    <Icon name="back" size={16} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* مرحله چهارم: تصاویر */}
            {/* ============================================================ */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--text-white)]">مرحله چهارم: تصاویر مجموعه</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                      کاملاً اختیاری
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    تصویر پروفایل/لوگو و تصاویر گالری را بارگذاری کنید. عدم آپلود تصاویر مانع ادامه فرآیند نمی‌شود.
                  </p>
                </div>

                {/* Logo / Profile Image */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                    تصویر پروفایل یا Logo (اختیاری)
                  </label>
                  {logoPreview ? (
                    <div className="relative w-28 h-28 rounded-card overflow-hidden border border-[var(--border-subtle)]">
                      <SafeImage
                        src={logoPreview}
                        alt="Logo Preview"
                        fallbackSrc={PLACEHOLDERS.avatar}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[var(--accent-red)] transition-colors"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full sm:w-64 h-28 rounded-card border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer bg-[var(--foreground)]/20 transition-colors">
                      <Icon name="upload" size={24} className="text-[var(--text-subtle)] mb-1" />
                      <span className="text-xs text-[var(--text-subtle)] font-bold">انتخاب تصویر لوگو</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-white)] mb-1.5">
                    تصاویر گالری (اختیاری)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {galleryPreviews.map((previewUrl, idx) => (
                      <div
                        key={idx}
                        className="relative h-24 rounded-card overflow-hidden border border-[var(--border-subtle)] group"
                      >
                        <SafeImage
                          src={previewUrl}
                          alt={`Gallery ${idx + 1}`}
                          fallbackSrc={PLACEHOLDERS.gallery}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[var(--accent-red)] transition-colors"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}

                    <label className="flex flex-col items-center justify-center h-24 rounded-card border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer bg-[var(--foreground)]/20 transition-colors">
                      <Icon name="upload" size={20} className="text-[var(--text-subtle)] mb-1" />
                      <span className="text-[11px] text-[var(--text-subtle)] font-bold">+ افزودن تصویر</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80"
                  >
                    مرحله قبل
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    <span>مرحله بعد: پیش‌نمایش (Preview)</span>
                    <Icon name="back" size={16} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* مرحله پنجم: Preview */}
            {/* ============================================================ */}
            {step === 5 && (
              <div className="flex flex-col gap-6">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">مرحله پنجم: پیش‌نمایش (Preview)</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    تمام اطلاعات واردشده را بازبینی کنید. با کلیک روی «ویرایش» در هر بخش می‌توانید مستقیماً اطلاعات را تغییر دهید.
                  </p>
                </div>

                {/* بخش ۱: اطلاعات پایه */}
                <div className="p-4 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                      <Icon name="user" size={16} />
                      اطلاعات اولیه و Manager
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditSection(1)}
                      className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1"
                    >
                      <Icon name="edit" size={14} />
                      ویرایش
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-subtle)] block">نام GameCenter:</span>
                      <span className="font-bold text-[var(--text-white)]">{name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-subtle)] block">نام و نام خانوادگی Manager:</span>
                      <span className="font-bold text-[var(--text-white)]">{managerFullName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-subtle)] block">شماره تماس:</span>
                      <span className="font-mono text-[var(--text-white)] dir-ltr block text-right">
                        {managerPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* بخش ۲: آدرس و موقعیت مکانی */}
                <div className="p-4 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                      <Icon name="pin" size={16} />
                      آدرس و موقعیت مکانی
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditSection(2)}
                      className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1"
                    >
                      <Icon name="edit" size={14} />
                      ویرایش
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-subtle)] block">استان و شهر:</span>
                      <span className="font-bold text-[var(--text-white)]">{province} - {city}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-subtle)] block">مختصات جغرافیایی:</span>
                      <span className="font-mono text-[var(--text-white)] dir-ltr block text-right">
                        {latitude.toFixed(5)}, {longitude.toFixed(5)}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[var(--text-subtle)] block">آدرس دقیق:</span>
                      <span className="font-bold text-[var(--text-white)]">{address || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* بخش ۳: ساعات کاری */}
                <div className="p-4 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                      <Icon name="clock" size={16} />
                      ساعات کاری و روزهای فعالیت
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditSection(3)}
                      className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1"
                    >
                      <Icon name="edit" size={14} />
                      ویرایش
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-subtle)] block">ساعت فعالیت:</span>
                      <span className="font-bold text-[var(--text-white)]">
                        {toPersianDigits(workStartTime)} تا {toPersianDigits(workEndTime)}
                        {isOvernight ? " (بامداد روز بعد)" : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-subtle)] block">روزهای تعطیل:</span>
                      <span className="font-bold text-[var(--text-white)]">
                        {closedDays.length > 0
                          ? closedDays.map((id) => DAYS_OF_WEEK.find((d) => d.id === id)?.label).join("، ")
                          : "بدون روز تعطیل (فعال در تمام ایام هفته)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-subtle)] block">وضعیت رزرو آنلاین:</span>
                      <span className="font-bold text-[var(--accent-green)]">
                        {allowOnlineBooking ? "فعال" : "غیرفعال"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* بخش ۴: تصاویر */}
                <div className="p-4 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                      <Icon name="upload" size={16} />
                      تصاویر و رسانه
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditSection(4)}
                      className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1"
                    >
                      <Icon name="edit" size={14} />
                      ویرایش
                    </button>
                  </div>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[var(--text-subtle)] block mb-1">لوگو:</span>
                        {logoPreview ? (
                          <SafeImage
                            src={logoPreview}
                            alt="Logo"
                            fallbackSrc={PLACEHOLDERS.avatar}
                            className="w-12 h-12 rounded object-cover border"
                          />
                        ) : (
                          <span className="text-[var(--text-subtle)]">بارگذاری نشده</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[var(--text-subtle)] block mb-1">تصاویر گالری:</span>
                        <span className="font-bold text-[var(--text-white)]">
                          {toPersianDigits(galleryFiles.length)} تصویر انتخاب شده
                        </span>
                      </div>
                    </div>
                    {galleryPreviews.length > 0 && (
                      <div className="w-full mt-2">
                        <BannerSlider
                          banners={galleryPreviews.map((p, idx) => ({
                            id: `preview-${idx}`,
                            imageUrl: p,
                            alt: `پیش‌نمایش گالری ${idx + 1}`,
                          }))}
                          aspectClassName="aspect-[2.2/1] sm:aspect-[2.8/1] lg:aspect-[3.2/1]"
                          ariaLabel="پیش‌نمایش گالری تصاویر"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80"
                  >
                    مرحله قبل
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    <span>مرحله بعد: ثبت نهایی</span>
                    <Icon name="back" size={16} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* مرحله ششم: ثبت نهایی */}
            {/* ============================================================ */}
            {step === 6 && (
              <div className="flex flex-col gap-6">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">مرحله ششم: ثبت نهایی اطلاعات</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    اطلاعات را برای ذخیره نهایی در سرور ارسال کنید. در صورت بروز هرگونه خطا، اطلاعات شما محفوظ مانده و امکان تلاش مجدد وجود دارد.
                  </p>
                </div>

                {/* Confirmation Box */}
                <div className="p-4 rounded-card bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                    <Icon name="check" size={18} />
                    <span>آماده ثبت نهایی GameCenter «{name}»</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-subtle)] leading-relaxed">
                    با کلیک بر روی دکمه ثبت نهایی، مرکز بازی شما با شناسه اختصاصی ایجاد شده و پس از ثبت موقعیت و ساعات کاری، مستقیماً وارد پنل مدیریت خواهید شد.
                  </p>
                </div>

                {/* Loading / Progress indicator */}
                {isSubmitting && (
                  <div className="p-4 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin shrink-0"></div>
                    <span className="text-xs text-[var(--text-white)] font-bold">{submitProgressText}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80 disabled:opacity-50"
                  >
                    بازگشت به پیش‌نمایش
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
                    className="px-8 py-3 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? "در حال ثبت اطلاعات..." : "تأیید و ثبت نهایی GameCenter"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
