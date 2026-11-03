"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { OwnerAuthModal } from "@/components/owner/OwnerAuthModal";
import { useAuth } from "@/context/AuthContext";
import { useOwner } from "@/context/OwnerContext";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { authService } from "@/services/authService";
import { ownerService } from "@/services/ownerService";
import type { CenterSettings, StationInput } from "@/types/owner";

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

const CITIES = [
  "تهران",
  "تبریز",
  "مشهد",
  "اصفهان",
  "شیراز",
  "کرج",
  "اهواز",
  "قم",
  "رشت",
  "ارومیه",
  "یزد",
  "کرمان",
  "کرمانشاه",
  "همدان",
  "ساری",
  "گرگان",
  "قزوین",
  "اراک",
  "اردبیل",
  "بندرعباس",
  "زنجان",
  "کیش",
];

const STATION_TYPES: { id: StationInput["stationType"]; label: string }[] = [
  { id: "PLAYSTATION", label: "پلی‌استیشن (PS5 / PS4)" },
  { id: "PC", label: "سیستم گیمینگ (PC)" },
  { id: "XBOX", label: "ایکس‌باکس (Xbox)" },
  { id: "VR", label: "واقعیت مجازی (VR)" },
  { id: "SWITCH", label: "نینتندو سوییچ" },
];

const inputClass =
  "w-full h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors";

export default function NewGamingCenterPage() {
  const router = useRouter();
  const { isLoggedIn, user, login } = useAuth();
  const { me } = useOwner();

  // Auth modal state for unauthenticated users
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Modal / Verification Step before creation if unauthenticated
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMode, setVerifyMode] = useState<"otp" | "password">("otp");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(120);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Password fallback state
  const [passwordValue, setPasswordValue] = useState("");

  // Current Step: 1 = Basic Info, 2 = Location & Contact, 3 = Hours & Booking, 4 = Media & Photos, 5 = Stations & Final
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Basic Information
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([
    "EA Sports FC 25",
    "Call of Duty: Modern Warfare III",
    "GTA V",
  ]);
  const [customGameInput, setCustomGameInput] = useState("");

  // Step 2: Location & Contact
  const [city, setCity] = useState("تهران");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  // Step 3: Hours & Settings
  const [workStartTime, setWorkStartTime] = useState("10:00");
  const [workEndTime, setWorkEndTime] = useState("23:30");
  const [allowOnlineBooking, setAllowOnlineBooking] = useState(true);
  const [onlineBookingAutoConfirm, setOnlineBookingAutoConfirm] = useState(false);

  // Step 4: Media Uploads (Files stored locally until submission or created center ID)
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Step 5: Initial Stations (optional initial device configuration)
  const [stationsToAdd, setStationsToAdd] = useState<
    Array<{
      name: string;
      stationType: StationInput["stationType"];
      hourlyPrice: number;
    }>
  >([
    { name: "سیستم ۱", stationType: "PLAYSTATION", hourlyPrice: 120000 },
  ]);

  // Submission Progress & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgressText, setSubmitProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  // Auto-generate English slug from name if not manually edited
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

  // Game selection toggles
  const togglePopularGame = (gameName: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameName)
        ? prev.filter((g) => g !== gameName)
        : [...prev, gameName]
    );
  };

  const addCustomGame = () => {
    const trimmed = customGameInput.trim();
    if (!trimmed) return;
    if (!selectedGames.includes(trimmed)) {
      setSelectedGames((prev) => [...prev, trimmed]);
    }
    setCustomGameInput("");
  };

  const removeGame = (gameName: string) => {
    setSelectedGames((prev) => prev.filter((g) => g !== gameName));
  };

  // Image Upload Handlers
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("حجم تصویر کاور نباید بیشتر از ۵ مگابایت باشد.");
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg("حجم لوگو نباید بیشتر از ۲ مگابایت باشد.");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles: File[] = [];
    const validUrls: string[] = [];

    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        setErrorMsg(`فایل ${f.name} بیش از ۵ مگابایت است و رد شد.`);
        continue;
      }
      validFiles.push(f);
      validUrls.push(URL.createObjectURL(f));
    }

    setGalleryFiles((prev) => [...prev, ...validFiles]);
    setGalleryPreviews((prev) => [...prev, ...validUrls]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation per step
  const validateStep = (s: number): boolean => {
    setErrorMsg(null);
    if (s === 1) {
      if (!name.trim()) {
        setErrorMsg("لطفاً نام گیم‌نت را وارد کنید.");
        return false;
      }
      if (!slug.trim()) {
        setErrorMsg("لطفاً شناسه انگلیسی گیم‌نت (Slug) را مشخص کنید.");
        return false;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(slug.trim())) {
        setErrorMsg("شناسه انگلیسی (Slug) فقط می‌تواند شامل حروف انگلیسی، اعداد، خط فاصله (-) و زیرخط (_) باشد.");
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!address.trim()) {
        setErrorMsg("لطفاً آدرس دقیق گیم‌نت را وارد کنید.");
        return false;
      }
      const cleanPhone = phone.trim().replace(/[^\d]/g, "");
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMsg("لطفاً شماره تماس معتبر (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
        return false;
      }
      return true;
    }
    if (s === 3) {
      if (!workStartTime || !workEndTime) {
        setErrorMsg("لطفاً ساعات شروع و پایان کار مجموعه را مشخص کنید.");
        return false;
      }
      return true;
    }
    return true;
  };

  const goToNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5) as any);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToPrevStep = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(prev - 1, 1) as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showVerifyModal && verifyMode === "otp" && otpStep === "verify" && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showVerifyModal, verifyMode, otpStep, otpTimer]);

  const handleOtpInput = (index: number, value: string) => {
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
      const nextInput = document.getElementById(`create-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`create-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toPersianDigits(mins)}:${secs < 10 ? "۰" : ""}${toPersianDigits(secs)}`;
  };

  // Perform Creation of Center with specific resolved ownerId
  const executeCenterCreation = async (resolvedOwnerId: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. POST /gamingCenters (Main creation)
      setSubmitProgressText("در حال ایجاد مرکز بازی در سامانه...");
      const createdCenter = await ownerService.createGamingCenter({
        name: name.trim(),
        slug: slug.trim(),
        ownerId: resolvedOwnerId,
        games: selectedGames,
      });

      const centerId = createdCenter.id || createdCenter.slug;

      // 2. POST /gamingCenters/{id}/addresses (Branch Address)
      if (address.trim()) {
        setSubmitProgressText("در حال ثبت اطلاعات آدرس و موقعیت...");
        await ownerService.createAddress(centerId, {
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim() || undefined,
        }).catch((err: any) => {
          console.warn("Address registration notice:", err);
        });
      }

      // 3. PUT /gamingCenters/{id}/settings (Working hours & online booking)
      setSubmitProgressText("در حال اعمال ساعات کاری و تنظیمات رزرو آنلاین...");
      const settingsPayload: CenterSettings = {
        timeZone: "Asia/Tehran",
        workStartTime: workStartTime,
        workEndTime: workEndTime,
        allowOnlineBooking: allowOnlineBooking,
        onlineBookingAutoConfirm: onlineBookingAutoConfirm,
        preventOverlaps: true,
      };
      await ownerService.updateSettings(centerId, settingsPayload).catch((err: any) => {
        console.warn("Settings update notice:", err);
      });

      // 4. POST /gamingCenters/{id}/links (Website & Instagram if provided)
      if (websiteUrl.trim()) {
        await ownerService.createLink(centerId, {
          platform: "WEBSITE",
          url: websiteUrl.trim(),
        }).catch(() => null);
      }
      if (instagramUrl.trim()) {
        await ownerService.createLink(centerId, {
          platform: "INSTAGRAM",
          url: instagramUrl.trim(),
        }).catch(() => null);
      }

      // 5. POST /gamingCenters/{id}/media/upload (Cover, Logo, Gallery)
      if (coverFile) {
        setSubmitProgressText("در حال آپلود تصویر کاور گیم‌نت...");
        await ownerService.uploadGalleryImage(centerId, coverFile, {
          purpose: "COVER",
          altText: `تصویر اصلی ${name}`,
        }).catch((err: any) => {
          console.warn("Cover image upload notice:", err);
        });
      }

      if (logoFile) {
        setSubmitProgressText("در حال آپلود لوگوی مجموعه...");
        await ownerService.uploadGalleryImage(centerId, logoFile, {
          purpose: "LOGO",
          altText: `لوگوی ${name}`,
        }).catch((err: any) => {
          console.warn("Logo upload notice:", err);
        });
      }

      if (galleryFiles.length > 0) {
        setSubmitProgressText("در حال بارگذاری تصاویر گالری...");
        for (const gFile of galleryFiles) {
          await ownerService.uploadGalleryImage(centerId, gFile, {
            purpose: "GALLERY",
            altText: gFile.name,
          }).catch((err: any) => {
            console.warn("Gallery upload error:", err);
          });
        }
      }

      // 6. POST /gamingCenters/{id}/stations (Initial stations)
      if (stationsToAdd.length > 0) {
        setSubmitProgressText("در حال ثبت دستگاه‌های اولیه...");
        for (const st of stationsToAdd) {
          if (st.name.trim() && st.hourlyPrice > 0) {
            await ownerService.createStation(centerId, {
              name: st.name.trim(),
              stationType: st.stationType,
              hourlyPrice: st.hourlyPrice,
            }).catch((err: any) => {
              console.warn("Station creation notice:", err);
            });
          }
        }
      }

      setCreatedResult({
        id: centerId,
        name: createdCenter.name || name,
        slug: createdCenter.slug || slug,
      });

      // Save as active owner center if in localStorage
      try {
        localStorage.setItem("sayra_owner_center_id", centerId);
      } catch {
        // ignore
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setSubmitProgressText("");
    }
  };

  // Trigger submission: if authenticated, proceed; if not, initiate verification
  const handleSubmitAll = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    const currentOwnerId = me?.id || user?.id;
    if (isLoggedIn && currentOwnerId) {
      await executeCenterCreation(currentOwnerId);
      return;
    }

    // Unauthenticated: initiate OTP send to the entered phone number
    setVerifyError(null);
    setVerifyMode("otp");
    setPasswordValue("");
    setShowVerifyModal(true);
    await sendOtpToPhone();
  };

  const sendOtpToPhone = async () => {
    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setVerifyError("شماره تماس گیم‌نت نامعتبر است. لطفاً در مرحله ۲ شماره موبایل معتبر وارد کنید.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    try {
      await authService.requestOtp(cleanPhone);
      setOtpStep("verify");
      setOtpTimer(120);
      setOtpCode(["", "", "", "", "", ""]);
    } catch (err) {
      setVerifyError(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtpAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const fullCode = otpCode.join("");
    if (fullCode.length < 6) {
      setVerifyError("لطفاً کد تایید ۶ رقمی را به طور کامل وارد کنید.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    setIsVerifying(true);

    try {
      const authRes = await authService.verifyOtp(cleanPhone, fullCode);
      const token = authRes.accessToken;
      if (!token) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      const userName = authRes.user?.fullName || name || "مالک گیم‌نت";
      login(userName, cleanPhone, token, authRes.refreshToken);

      const resolvedOwnerId = authRes.user?.id || `owner-${cleanPhone}`;
      setShowVerifyModal(false);

      // Now create the gaming center
      await executeCenterCreation(resolvedOwnerId);
    } catch (err) {
      setVerifyError(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordLoginAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setVerifyError("لطفاً شماره تماس معتبر وارد کنید.");
      return;
    }

    if (!passwordValue) {
      setVerifyError("لطفاً رمز عبور را وارد کنید.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await authService.loginUserWithPassword(cleanPhone, passwordValue);
      const token = res.accessToken;
      if (!token) {
        throw new Error("توکن ورود دریافت نشد.");
      }

      const userName = res.user?.fullName || res.user?.name || name || "مدیر گیم‌نت";
      login(userName, cleanPhone, token, res.refreshToken);

      const resolvedOwnerId = res.user?.id || `owner-${cleanPhone}`;
      setShowVerifyModal(false);

      // Create gaming center under this account
      await executeCenterCreation(resolvedOwnerId);
    } catch (err) {
      setVerifyError(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // Step Indicators UI
  const STEPS_LIST = [
    { num: 1, title: "مشخصات پایه" },
    { num: 2, title: "موقعیت و تماس" },
    { num: 3, title: "ساعات و قوانین" },
    { num: 4, title: "تصاویر و رسانه" },
    { num: 5, title: "تأیید و ثبت نهایی" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-16">
      <OwnerPageHeader title="ایجاد گیم‌نت جدید" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-6 max-w-3xl mx-auto w-full">
        {/* Banner / Intro */}
        <div className="mb-6 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-white)]">
              ثبت و راه‌اندازی مرکز بازی در سایرا
            </h2>
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              تمامی کاربران می‌توانند اطلاعات مجموعه خود را ثبت کرده و پس از احراز هویت، مدیریت کامل رزروها را در دست بگیرند.
            </p>
          </div>

          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-card text-xs font-bold bg-[var(--primary)] text-black shrink-0 hover:brightness-105 active:scale-95 transition-transform"
            >
              ورود به حساب کاربری
            </button>
          )}
        </div>

        {/* Stepper Wizard Indicator */}
        <div className="mb-6 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto">
          <div className="flex items-center justify-between min-w-[320px] gap-2">
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
                      {isPassed ? "✓" : s.num}
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

        {/* Inline Error State */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
                مرکز بازی «{createdResult.name}» با موفقیت ایجاد شد!
              </h3>
              <p className="text-xs text-[var(--text-subtle)] mt-1.5 max-w-md mx-auto">
                اطلاعات گیم‌نت، آدرس، ساعات کاری و تصاویر شما با موفقیت در سیستم ثبت گردید. هم‌اکنون می‌توانید وارد پنل مدیریت شوید.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full sm:w-auto">
              <Link
                href="/owner"
                className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform text-center"
              >
                ورود به پنل مدیریت گیم‌نت
              </Link>
              <Link
                href={`/gamecenter/${encodeURIComponent(createdResult.slug)}`}
                className="px-6 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-[var(--text-white)] text-xs font-bold hover:bg-[var(--foreground)]/80 active:scale-95 transition-transform text-center"
              >
                مشاهده صفحه عمومی گیم‌نت
              </Link>
            </div>
          </div>
        ) : (
          /* Main Form Wizard Steps */
          <div className="p-5 sm:p-6 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-6">
            {/* STEP 1: Basic Information */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">گام ۱: مشخصات پایه گیم‌نت</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    نام تجاری گیم‌نت و شناسه اختصاصی اینترنتی آن را وارد کنید.
                  </p>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    نام گیم‌نت <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="مثال: گیم‌نت گرگدن"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>

                {/* Slug */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      شناسه انگلیسی یکتا (Slug) <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <span className="text-[10px] text-[var(--text-subtle)]">
                      استفاده در آدرس اینترنتی صفحه شما
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      dir="ltr"
                      className={`${inputClass} text-left pl-3.5 pr-28 font-mono`}
                      placeholder="gamenet-gorgodan"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugManuallyEdited(true);
                      }}
                      required
                    />
                    <span className="absolute right-3 text-[11px] text-[var(--text-subtle)] select-none pointer-events-none">
                      /gamecenter/
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-subtle)]">
                    مجاز: حروف انگلیسی کوچک، اعداد و خط فاصله (-)
                  </span>
                </div>

                {/* Popular Games Selection */}
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    بازی‌های پرطرفدار موجود در گیم‌نت
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_GAMES.map((game) => {
                      const selected = selectedGames.includes(game);
                      return (
                        <button
                          key={game}
                          type="button"
                          onClick={() => togglePopularGame(game)}
                          className={`px-3 py-1.5 rounded-card text-xs font-bold border transition-colors ${
                            selected
                              ? "bg-[var(--primary)] text-black border-[var(--primary)]"
                              : "bg-[var(--foreground)]/30 text-[var(--text-subtle)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                          }`}
                        >
                          {selected ? `✓ ${game}` : `+ ${game}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Game Input */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="افزودن نام سایر بازی‌ها..."
                      value={customGameInput}
                      onChange={(e) => setCustomGameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomGame();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addCustomGame}
                      className="px-4 h-11 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--foreground)]/80 active:scale-95 transition-transform shrink-0"
                    >
                      افزودن
                    </button>
                  </div>

                  {/* Selected Games Badges */}
                  {selectedGames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 p-2.5 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-subtle)] self-center ml-1">
                        انتخاب‌شده‌ها:
                      </span>
                      {selectedGames.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-white)]"
                        >
                          {g}
                          <button
                            type="button"
                            onClick={() => removeGame(g)}
                            className="text-[var(--accent-red)] hover:text-red-400 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Location & Contact */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">گام ۲: موقعیت مکانی و راه‌های ارتباطی</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    آدرس و تلفن تماس را وارد کنید تا مشتریان به راحتی گیم‌نت شما را پیدا کنند.
                  </p>
                </div>

                {/* City */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">شهر</label>
                  <select
                    className={inputClass}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c} className="bg-[var(--bg-card)] text-[var(--text-white)]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    آدرس دقیق گیم‌نت <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] resize-none"
                    placeholder="خیابان، پلاک، طبقه و جزئیات دسترسی..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      شماره تماس گیم‌نت (شماره موبایل جهت احراز هویت مالک) <span className="text-[var(--accent-red)]">*</span>
                    </label>
                  </div>
                  <input
                    type="tel"
                    dir="ltr"
                    className={`${inputClass} text-left`}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-[var(--text-subtle)]">
                    کد تایید پیامکی (OTP) در مرحله نهایی به این شماره ارسال خواهد شد.
                  </span>
                </div>

                {/* Social Links (OpenAPI /links) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">صفحه اینستاگرام (اختیاری)</label>
                    <input
                      type="url"
                      dir="ltr"
                      className={`${inputClass} text-left`}
                      placeholder="https://instagram.com/..."
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">وب‌سایت اختصاصی (اختیاری)</label>
                    <input
                      type="url"
                      dir="ltr"
                      className={`${inputClass} text-left`}
                      placeholder="https://..."
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Working Hours & Booking Rules */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">گام ۳: ساعات کاری و تنظیمات رزرو</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    زمان‌بندی فعالیت و قوانین پذیرش رزرو آنلاین را تعیین نمایید.
                  </p>
                </div>

                {/* Working Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      ساعت شروع کار <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <input
                      type="time"
                      className={inputClass}
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      ساعت پایان کار <span className="text-[var(--accent-red)]">*</span>
                    </label>
                    <input
                      type="time"
                      className={inputClass}
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Online Booking Toggles */}
                <div className="flex flex-col gap-3 pt-2">
                  <label className="text-xs font-bold text-[var(--text-white)]">قوانین رزرو</label>

                  {/* Allow Online Booking */}
                  <button
                    type="button"
                    onClick={() => setAllowOnlineBooking(!allowOnlineBooking)}
                    className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-color)] cursor-pointer"
                    role="switch"
                    aria-checked={allowOnlineBooking}
                  >
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[var(--text-white)]">
                        امکان رزرو آنلاین فعال باشد
                      </span>
                      <span className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                        کاربران بتوانند از طریق سایت ساعت رزرو کنند.
                      </span>
                    </div>
                    <span
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        allowOnlineBooking ? "bg-[var(--primary)]" : "bg-[var(--foreground)]"
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-[#101014] transition-transform ${
                          allowOnlineBooking ? "-translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Auto-Confirm Booking */}
                  <button
                    type="button"
                    onClick={() => setOnlineBookingAutoConfirm(!onlineBookingAutoConfirm)}
                    className="flex items-center justify-between p-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-color)] cursor-pointer"
                    role="switch"
                    aria-checked={onlineBookingAutoConfirm}
                  >
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-[var(--text-white)]">
                        تأیید خودکار رزروها
                      </span>
                      <span className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                        رزروهای ثبت‌شده بدون نیاز به تایید دستی فوراً قطعی شوند.
                      </span>
                    </div>
                    <span
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        onlineBookingAutoConfirm ? "bg-[var(--primary)]" : "bg-[var(--foreground)]"
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-[#101014] transition-transform ${
                          onlineBookingAutoConfirm ? "-translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Media & Photos Uploads */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">گام ۴: تصاویر و رسانه</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    تصویر کاور اصلی، لوگو و عکس‌های محیط گیم‌نت را آپلود کنید (حداکثر ۵ مگابایت برای هر تصویر).
                  </p>
                </div>

                {/* Cover Photo */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--text-white)]">تصویر اصلی (Cover Image)</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-card border border-dashed border-[var(--border-subtle)] bg-[var(--foreground)]/20">
                    {coverPreview ? (
                      <div className="relative w-full sm:w-48 h-28 rounded-card overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverFile(null);
                            setCoverPreview(null);
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-[var(--accent-red)] flex items-center justify-center font-bold text-xs"
                          title="حذف کاور"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-full sm:w-48 h-28 rounded-card bg-[var(--foreground)]/40 flex flex-col items-center justify-center text-center p-3 text-[var(--text-subtle)] shrink-0">
                        <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[11px]">بدون کاور</span>
                      </div>
                    )}

                    <div className="flex-1 flex flex-col items-start gap-2">
                      <span className="text-xs text-[var(--text-subtle)]">
                        این تصویر در بالای صفحه گیم‌نت و در لیست کارت‌های مراکز بازی نمایش داده می‌شود.
                      </span>
                      <label className="cursor-pointer px-4 py-2 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80 active:scale-95 transition-transform">
                        انتخاب تصویر کاور
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleCoverSelect}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--text-white)]">لوگوی مجموعه (Logo)</label>
                  <div className="flex items-center gap-4 p-4 rounded-card border border-dashed border-[var(--border-subtle)] bg-[var(--foreground)]/20">
                    {logoPreview ? (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                          }}
                          className="absolute inset-0 bg-black/60 text-[var(--accent-red)] flex items-center justify-center font-bold text-sm opacity-0 hover:opacity-100 transition-opacity"
                          title="حذف لوگو"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[var(--foreground)]/40 flex items-center justify-center text-[var(--text-subtle)] shrink-0">
                        <span className="text-xs">لوگو</span>
                      </div>
                    )}

                    <div className="flex-1 flex flex-col items-start gap-1.5">
                      <label className="cursor-pointer px-4 py-2 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80 active:scale-95 transition-transform">
                        انتخاب لوگو
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleLogoSelect}
                        />
                      </label>
                      <span className="text-[10px] text-[var(--text-subtle)]">
                        تصویر مربع شکل، حداکثر ۲ مگابایت
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gallery Images */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">تصاویر گالری و محیط گیم‌نت</label>
                    <label className="cursor-pointer text-xs font-bold text-[var(--primary)] hover:underline">
                      + افزودن تصویر
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleGallerySelect}
                      />
                    </label>
                  </div>

                  {galleryPreviews.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
                      {galleryPreviews.map((url, idx) => (
                        <div key={idx} className="relative aspect-video rounded-card overflow-hidden border border-[var(--border-subtle)] group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-[var(--accent-red)] flex items-center justify-center font-bold text-xs"
                            title="حذف تصویر"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-card border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-subtle)]">
                      هنوز تصویری به گالری اضافه نشده است. می‌توانید عکس‌های دستگاه‌ها، اتاق VIP و محیط گیم‌نت را اضافه کنید.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Review & Initial Stations */}
            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-white)]">گام ۵: مرور و تایید نهایی</h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-1">
                    مشخصات ثبت‌شده را بازبینی کرده و در صورت نیاز دستگاه‌های اولیه را اضافه کنید.
                  </p>
                </div>

                {/* Summary Table Card */}
                <div className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col gap-3">
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)] text-xs">
                    <span className="text-[var(--text-subtle)]">نام مجموعه:</span>
                    <span className="font-bold text-[var(--text-white)]">{name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)] text-xs">
                    <span className="text-[var(--text-subtle)]">شناسه انگلیسی (Slug):</span>
                    <span className="font-mono text-[var(--primary)]">{slug}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)] text-xs">
                    <span className="text-[var(--text-subtle)]">شهر و آدرس:</span>
                    <span className="font-bold text-[var(--text-white)] text-left truncate max-w-[240px]">
                      {city} - {address}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)] text-xs">
                    <span className="text-[var(--text-subtle)]">ساعات کاری:</span>
                    <span className="font-bold text-[var(--text-white)]">
                      از {workStartTime} الی {workEndTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 text-xs">
                    <span className="text-[var(--text-subtle)]">تعداد بازی‌های انتخابی:</span>
                    <span className="font-bold text-[var(--text-white)]">{selectedGames.length} بازی</span>
                  </div>
                </div>

                {/* Initial Station Configuration */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-white)]">
                      تعریف دستگاه‌های اولیه (اختیاری)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setStationsToAdd((prev) => [
                          ...prev,
                          {
                            name: `دستگاه ${prev.length + 1}`,
                            stationType: "PLAYSTATION",
                            hourlyPrice: 100000,
                          },
                        ])
                      }
                      className="text-xs font-bold text-[var(--primary)] hover:underline"
                    >
                      + افزودن دستگاه
                    </button>
                  </div>

                  {stationsToAdd.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                    >
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="نام دستگاه (مثال: PS5 شماره ۱)"
                        value={st.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStationsToAdd((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                          );
                        }}
                      />

                      <select
                        className={inputClass}
                        value={st.stationType}
                        onChange={(e) => {
                          const val = e.target.value as StationInput["stationType"];
                          setStationsToAdd((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, stationType: val } : item))
                          );
                        }}
                      >
                        {STATION_TYPES.map((t) => (
                          <option key={t.id} value={t.id} className="bg-[var(--bg-card)]">
                            {t.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className={inputClass}
                          placeholder="قیمت ساعتی (تومان)"
                          value={st.hourlyPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setStationsToAdd((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, hourlyPrice: val } : item))
                            );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setStationsToAdd((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="w-10 h-11 rounded-card bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30 font-bold shrink-0 hover:bg-[var(--accent-red)]/20"
                          title="حذف دستگاه"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submitting Progress Indicator */}
                {isSubmitting && (
                  <div className="p-4 rounded-card bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-white)]">
                      {submitProgressText || "در حال ثبت اطلاعات..."}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons (Prev / Next / Submit) */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={goToPrevStep}
                  className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:bg-[var(--foreground)]/80 active:scale-95 transition-transform"
                >
                  مرحله قبلی
                </button>
              ) : (
                <Link
                  href="/owner"
                  className="px-5 py-2.5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-subtle)] hover:text-[var(--text-white)] transition-colors"
                >
                  انصراف
                </Link>
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-6 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-transform"
                >
                  مرحله بعدی
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitAll}
                  className="px-8 py-2.5 rounded-card bg-[var(--primary)] text-black text-xs font-black hover:brightness-105 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isSubmitting ? "در حال ارسال اطلاعات..." : "تأیید و ایجاد گیم‌نت"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Phone OTP & Password Verification Modal for Center Creation */}
      {showVerifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card p-5 flex flex-col gap-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  احراز هویت و تأیید نهایی ثبت گیم‌نت
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  جهت انتساب مالکیت گیم‌نت و ورود خودکار به حساب
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Toggle Mode: OTP vs Password */}
            <div className="flex bg-[var(--foreground)]/50 p-1 rounded-card border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setVerifyMode("otp");
                  setVerifyError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-card transition-all ${
                  verifyMode === "otp"
                    ? "bg-[var(--primary)] text-black shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                }`}
              >
                ارسال کد پیامکی (OTP)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerifyMode("password");
                  setVerifyError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-card transition-all ${
                  verifyMode === "password"
                    ? "bg-[var(--primary)] text-black shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                }`}
              >
                ورود با رمز عبور
              </button>
            </div>

            {/* Error banner */}
            {verifyError && (
              <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                {verifyError}
              </div>
            )}

            {/* Mode 1: OTP Flow */}
            {verifyMode === "otp" && (
              <form onSubmit={handleVerifyOtpAndCreate} className="flex flex-col gap-4">
                <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                  کد تایید ۶ رقمی به شماره{" "}
                  <strong className="text-[var(--primary)] font-bold font-mono">
                    {toPersianDigits(phone)}
                  </strong>{" "}
                  ارسال شده است. با وارد کردن کد، گیم‌نت ایجاد شده و به طور خودکار وارد حساب می‌شوید.
                </div>

                {/* 6-Digit OTP inputs */}
                <div className="flex items-center justify-center gap-2 dir-ltr my-2">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`create-otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 sm:w-11 h-14 text-center text-xl font-black rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-[var(--primary)] outline-none transition-colors shadow-inner"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {/* Resend timer */}
                <div className="flex items-center justify-between text-xs pt-1">
                  {otpTimer > 0 ? (
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span>ارسال مجدد کد تا:</span>
                      <strong className="text-[var(--primary)] font-mono">{formatTimer(otpTimer)}</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={sendOtpToPhone}
                      className="text-[var(--primary)] font-bold hover:underline"
                    >
                      ارسال مجدد کد تایید
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="h-11 mt-1 w-full rounded-card bg-[var(--primary)] hover:brightness-105 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {isVerifying ? "در حال تایید و ثبت گیم‌نت..." : "تایید کد و ایجاد نهایی گیم‌نت"}
                </button>
              </form>
            )}

            {/* Mode 2: Password Flow */}
            {verifyMode === "password" && (
              <form onSubmit={handlePasswordLoginAndCreate} className="flex flex-col gap-4">
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  در صورت داشتن حساب کاربری قبلی، با وارد کردن رمز عبور وارد شوید تا این گیم‌نت به حساب کاربری شما متصل شود:
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">شماره تماس</label>
                  <input
                    type="tel"
                    dir="ltr"
                    disabled
                    value={phone}
                    className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-sm text-[var(--text-muted)] outline-none text-right"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">رمز عبور حساب</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] outline-none transition-colors text-left"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="h-11 mt-1 w-full rounded-card bg-[var(--primary)] hover:brightness-105 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {isVerifying ? "در حال ورود و ثبت گیم‌نت..." : "ورود با رمز عبور و ثبت گیم‌نت"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Owner Auth Modal for unauthenticated user header login button */}
      <OwnerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(fullName, phoneNum, token, refreshToken) => {
          login(fullName, phoneNum, token, refreshToken);
          setAuthModalOpen(false);
        }}
      />
    </div>
  );
}
