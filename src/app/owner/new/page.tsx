"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { LocationMapPicker } from "@/components/owner/LocationMapPicker";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { cleanPhoneNumber, isValidIranPhone, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { onboardingService } from "@/services/onboardingService";
import type {
  LocationOption,
  OnboardingCompletion,
  OnboardingPreview,
  OnboardingStep,
} from "@/types/onboarding";

const DRAFT_KEY = "sayra_onboarding_draft_id";

// ترتیب روزها مطابق صفحهٔ ساعات کاری (۰ = شنبه)
const DAYS = [
  { id: 0, label: "شنبه" },
  { id: 1, label: "یک‌شنبه" },
  { id: 2, label: "دوشنبه" },
  { id: 3, label: "سه‌شنبه" },
  { id: 4, label: "چهارشنبه" },
  { id: 5, label: "پنج‌شنبه" },
  { id: 6, label: "جمعه" },
];

const STEPS: { id: OnboardingStep; title: string }[] = [
  { id: "info", title: "اطلاعات اولیه" },
  { id: "otp", title: "تأیید شماره" },
  { id: "location", title: "موقعیت" },
  { id: "hours", title: "ساعات کاری" },
  { id: "preview", title: "بازبینی" },
];

const inputClass =
  "w-full h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors";
const primaryBtn =
  "h-12 px-6 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary text-sm font-bold transition-colors active:scale-[0.98] disabled:opacity-60";
const secondaryBtn =
  "h-12 px-5 rounded-card bg-[var(--foreground)] border border-[var(--border-subtle)] text-sm font-bold text-[var(--text-white)] disabled:opacity-60";

const pick = (obj: OnboardingPreview, keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
};

export default function NewGamingCenterPage() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const { refreshCenters } = useOwner();

  const [step, setStep] = useState<OnboardingStep>("info");
  const [onboardingId, setOnboardingId] = useState<string | null>(null);

  // مرحله ۱
  const [centerName, setCenterName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  // مرحله ۲
  const [otp, setOtp] = useState("");
  // مرحله ۳
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupToken, setLookupToken] = useState(0);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(35.6892);
  const [longitude, setLongitude] = useState(51.389);
  // مرحله ۴
  const [openingTime, setOpeningTime] = useState("10:00");
  const [closingTime, setClosingTime] = useState("23:00");
  const [closedDays, setClosedDays] = useState<number[]>([]);
  // مرحله ۵
  const [preview, setPreview] = useState<OnboardingPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingCompletion | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const submittingRef = useRef(false);

  /** اجرای یک عمل async با قفل ارسال مضاعف */
  const run = useCallback(async (fn: () => Promise<void>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (!isAbortError(e)) setError(getErrorMessage(e));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }, []);

  // استان‌ها (وقتی به مرحلهٔ موقعیت رسیدیم)
  useEffect(() => {
    if (step !== "location") return;
    const c = new AbortController();
    setLookupLoading(true);
    setLookupError(null);
    onboardingService
      .getProvinces(c.signal)
      .then((list) => {
        setProvinces(list);
        if (list.length === 0) setLookupError("فهرست استان‌ها در دسترس نیست.");
      })
      .catch((e) => {
        if (!isAbortError(e)) setLookupError(getErrorMessage(e));
      })
      .finally(() => setLookupLoading(false));
    return () => c.abort();
  }, [step, lookupToken]);

  // شهرها
  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    const c = new AbortController();
    setLookupLoading(true);
    setLookupError(null);
    onboardingService
      .getCities(provinceId, c.signal)
      .then(setCities)
      .catch((e) => {
        if (!isAbortError(e)) setLookupError(getErrorMessage(e));
      })
      .finally(() => setLookupLoading(false));
    return () => c.abort();
  }, [provinceId, lookupToken]);

  /* ---------- مرحله ۱: شروع ---------- */
  const handleStart = () =>
    run(async () => {
      if (centerName.trim().length < 2) throw new Error("نام گیمنت را وارد کنید.");
      if (managerName.trim().length < 2) throw new Error("نام و نام خانوادگی مدیر را وارد کنید.");
      if (!isValidIranPhone(cleanPhoneNumber(managerPhone))) {
        throw new Error("شماره موبایل را با ۱۱ رقم و با ۰۹ وارد کنید.");
      }
      const { onboardingId: id } = await onboardingService.start({
        gameCenterName: centerName,
        managerFullName: managerName,
        managerPhone,
      });
      setOnboardingId(id);
      try {
        sessionStorage.setItem(DRAFT_KEY, id);
      } catch {
        // ignore
      }
      setOtp("");
      setStep("otp");
    });

  /* ---------- مرحله ۲: OTP ---------- */
  const handleVerifyOtp = () =>
    run(async () => {
      const code = toEnglishDigits(otp).replace(/\D/g, "");
      if (!onboardingId) throw new Error("فرایند ثبت پیدا نشد. از ابتدا شروع کنید.");
      if (code.length < 4) throw new Error("کد تأیید را کامل وارد کنید.");
      await onboardingService.verifyOtp(onboardingId, code);
      setStep("location");
    });

  /* ---------- مرحله ۳: موقعیت ---------- */
  const handleSaveLocation = () =>
    run(async () => {
      if (!onboardingId) throw new Error("فرایند ثبت پیدا نشد.");
      if (!provinceId) throw new Error("استان را انتخاب کنید.");
      if (!cityId) throw new Error("شهر را انتخاب کنید.");
      if (address.trim().length < 5) throw new Error("آدرس دقیق را وارد کنید.");
      await onboardingService.saveLocation(onboardingId, {
        provinceId,
        cityId,
        address,
        latitude,
        longitude,
      });
      setStep("hours");
    });

  /* ---------- مرحله ۴: ساعات کاری ---------- */
  const handleSaveHours = () =>
    run(async () => {
      if (!onboardingId) throw new Error("فرایند ثبت پیدا نشد.");
      if (!openingTime || !closingTime) throw new Error("ساعت شروع و پایان را مشخص کنید.");
      await onboardingService.saveWorkingHours(onboardingId, {
        openingTime,
        closingTime,
        closedDays,
        timezone: "Asia/Tehran",
      });
      // بازبینی از روی داده‌ی ذخیره‌شده در سرور
      setPreview(await onboardingService.getPreview(onboardingId));
      setConfirmed(false);
      setStep("preview");
    });

  /* ---------- مرحله ۷: تکمیل ---------- */
  const handleComplete = () =>
    run(async () => {
      if (!onboardingId) throw new Error("فرایند ثبت پیدا نشد.");
      if (!confirmed) throw new Error("برای ثبت نهایی، تأیید اطلاعات را علامت بزنید.");

      const completion = await onboardingService.complete(onboardingId);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      if (completion.gamingCenterId) {
        try {
          localStorage.setItem("sayra_owner_center_id", completion.gamingCenterId);
        } catch {
          // ignore
        }
      }

      if (completion.tokens) {
        // نقش را محلی تعیین نمی‌کنیم؛ بعد از ورود، نقش واقعی از سرور خوانده می‌شود
        login(managerName.trim(), cleanPhoneNumber(managerPhone), completion.tokens.accessToken, completion.tokens.refreshToken);
        await refreshUser();
        await refreshCenters().catch(() => undefined);
        setResult(completion);
        setStep("done");
        router.replace("/owner");
        return;
      }

      // توکن در پاسخ نبود: موفقیت ساخت گیمنت را اعلام می‌کنیم، اما نشست جعلی نمی‌سازیم
      setNeedsLogin(true);
      setResult(completion);
      setStep("done");
    });

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const toggleDay = (id: number) =>
    setClosedDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id].sort()));
  const provinceName = provinces.find((p) => p.id === provinceId)?.name;
  const cityName = cities.find((c) => c.id === cityId)?.name;

  const backTo = (s: OnboardingStep) => {
    setError(null);
    setStep(s);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-16">
      <OwnerPageHeader title="ساخت گیمنت" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-4">
        {step !== "done" && (
          <ol
            aria-label="مراحل ثبت گیمنت"
            className="flex items-center justify-between gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 overflow-x-auto"
          >
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                aria-current={i === stepIndex ? "step" : undefined}
                className={`flex items-center gap-2 shrink-0 text-xs font-bold ${
                  i === stepIndex
                    ? "text-[var(--primary)]"
                    : i < stepIndex
                      ? "text-[var(--accent-green)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">
                  {i < stepIndex ? <Icon name="check" size={14} /> : toPersianDigits(i + 1)}
                </span>
                <span>{s.title}</span>
              </li>
            ))}
          </ol>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
          >
            <Icon name="alert" size={16} className="mt-1 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="flex flex-col gap-5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          {/* ---- مرحله ۱ ---- */}
          {step === "info" && (
            <>
              <h2 className="text-base font-bold">اطلاعات اولیه</h2>
              <p className="text-xs leading-6 text-[var(--text-muted)]">
                بعد از ثبت، کد تأیید به شمارهٔ مدیر پیامک می‌شود.
              </p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ob-center" className="text-xs font-bold">نام گیمنت</label>
                <input id="ob-center" className={inputClass} value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="مثلاً گیمنت گرگدن" disabled={busy} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ob-manager" className="text-xs font-bold">نام و نام خانوادگی مدیر</label>
                <input id="ob-manager" className={inputClass} value={managerName} onChange={(e) => setManagerName(e.target.value)} disabled={busy} autoComplete="name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ob-phone" className="text-xs font-bold">شماره موبایل مدیر</label>
                <input
                  id="ob-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  className={`${inputClass} text-right`}
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  disabled={busy}
                />
              </div>
              <button type="button" className={primaryBtn} onClick={handleStart} disabled={busy}>
                {busy ? "در حال ارسال…" : "ارسال کد تأیید"}
              </button>
            </>
          )}

          {/* ---- مرحله ۲ ---- */}
          {step === "otp" && (
            <>
              <h2 className="text-base font-bold">تأیید شماره موبایل</h2>
              <p className="text-xs leading-6 text-[var(--text-muted)]">
                کد تأیید به شمارهٔ{" "}
                <span className="font-bold text-[var(--primary)]">{toPersianDigits(cleanPhoneNumber(managerPhone))}</span>{" "}
                ارسال شد.
              </p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ob-otp" className="text-xs font-bold">کد تأیید</label>
                <input
                  id="ob-otp"
                  className={`${inputClass} text-center text-lg font-black tracking-[0.5em]`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button type="button" className={`${primaryBtn} sm:flex-1`} onClick={handleVerifyOtp} disabled={busy}>
                  {busy ? "در حال بررسی…" : "تأیید کد"}
                </button>
                <button type="button" className={secondaryBtn} onClick={() => backTo("info")} disabled={busy}>
                  ویرایش شماره
                </button>
              </div>
            </>
          )}

          {/* ---- مرحله ۳ ---- */}
          {step === "location" && (
            <>
              <h2 className="text-base font-bold">آدرس و موقعیت</h2>

              {lookupError && (
                <div className="flex items-center justify-between gap-3 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold text-[var(--accent-red)]">
                  <span>{lookupError}</span>
                  <button type="button" className="h-11 px-2 underline text-[var(--text-white)]" onClick={() => setLookupToken((v) => v + 1)}>
                    تلاش دوباره
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ob-province" className="text-xs font-bold">استان</label>
                  <select
                    id="ob-province"
                    className={inputClass}
                    value={provinceId}
                    onChange={(e) => {
                      setProvinceId(e.target.value);
                      setCityId("");
                    }}
                    disabled={busy || lookupLoading}
                  >
                    <option value="">انتخاب استان</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[var(--bg-card)]">{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ob-city" className="text-xs font-bold">شهر</label>
                  <select
                    id="ob-city"
                    className={inputClass}
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    disabled={busy || lookupLoading || !provinceId}
                  >
                    <option value="">انتخاب شهر</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[var(--bg-card)]">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ob-address" className="text-xs font-bold">آدرس دقیق</label>
                <textarea
                  id="ob-address"
                  rows={3}
                  className="w-full p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] resize-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={busy}
                />
              </div>

              <LocationMapPicker
                latitude={latitude}
                longitude={longitude}
                cityName={cityName}
                provinceName={provinceName}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button type="button" className={`${primaryBtn} sm:flex-1`} onClick={handleSaveLocation} disabled={busy}>
                  {busy ? "در حال ذخیره…" : "ذخیره و ادامه"}
                </button>
              </div>
            </>
          )}

          {/* ---- مرحله ۴ ---- */}
          {step === "hours" && (
            <>
              <h2 className="text-base font-bold">ساعات کاری</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ob-open" className="text-xs font-bold">ساعت شروع</label>
                  <input id="ob-open" type="time" className={inputClass} value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} disabled={busy} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ob-close" className="text-xs font-bold">ساعت پایان</label>
                  <input id="ob-close" type="time" className={inputClass} value={closingTime} onChange={(e) => setClosingTime(e.target.value)} disabled={busy} />
                </div>
              </div>

              <div role="group" aria-label="روزهای تعطیل" className="flex flex-col gap-2">
                <span className="text-xs font-bold">روزهای تعطیل (اختیاری)</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const on = closedDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(d.id)}
                        disabled={busy}
                        className={`h-11 rounded-full border px-4 text-xs font-bold transition-colors ${
                          on
                            ? "border-[var(--accent-red)] bg-[var(--accent-red)]/15 text-[var(--accent-red)]"
                            : "border-[var(--border-subtle)] bg-[var(--foreground)]/40 text-[var(--text-white)]"
                        }`}
                      >
                        {d.label}
                        {on ? " (تعطیل)" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button type="button" className={`${primaryBtn} sm:flex-1`} onClick={handleSaveHours} disabled={busy}>
                  {busy ? "در حال ذخیره…" : "ذخیره و بازبینی"}
                </button>
                <button type="button" className={secondaryBtn} onClick={() => backTo("location")} disabled={busy}>
                  مرحلهٔ قبل
                </button>
              </div>
            </>
          )}

          {/* ---- مرحله ۵: بازبینی ---- */}
          {step === "preview" && preview && (
            <>
              <h2 className="text-base font-bold">بازبینی نهایی</h2>
              <p className="text-xs leading-6 text-[var(--text-muted)]">
                اطلاعات زیر از سرور خوانده شده است. بعد از ثبت نهایی، گیمنت ساخته می‌شود و حساب مدیر برای شما فعال می‌شود.
              </p>
              <dl className="flex flex-col gap-3 text-xs">
                {[
                  ["نام گیمنت", pick(preview, ["gameCenterName", "name"]) ?? centerName],
                  ["مدیر", pick(preview, ["managerFullName"]) ?? managerName],
                  ["شماره مدیر", toPersianDigits(pick(preview, ["managerPhone"]) ?? cleanPhoneNumber(managerPhone))],
                  ["آدرس", pick(preview, ["address"]) ?? address],
                  ["ساعات کاری", `${toPersianDigits(pick(preview, ["openingTime"]) ?? openingTime)} تا ${toPersianDigits(pick(preview, ["closingTime"]) ?? closingTime)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
                    <dt className="shrink-0 text-[var(--text-muted)]">{k}</dt>
                    <dd className="text-left font-bold">{v}</dd>
                  </div>
                ))}
              </dl>

              <label htmlFor="ob-confirm" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
                <input id="ob-confirm" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={busy} className="h-5 w-5 accent-[var(--primary)]" />
                <span>اطلاعات بالا را بررسی کرده‌ام و تأیید می‌کنم.</span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button type="button" className={`${primaryBtn} sm:flex-1`} onClick={handleComplete} disabled={busy || !confirmed}>
                  {busy ? "در حال ثبت…" : "ثبت نهایی گیمنت"}
                </button>
                <button type="button" className={secondaryBtn} onClick={() => backTo("hours")} disabled={busy}>
                  ویرایش
                </button>
              </div>
              {!confirmed && <p className="text-xs text-[var(--text-muted)]">برای ثبت، ابتدا تأیید اطلاعات را علامت بزنید.</p>}
            </>
          )}

          {/* ---- پایان ---- */}
          {step === "done" && result && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-green)]/15 text-[var(--accent-green)]">
                <Icon name="check" size={28} />
              </span>
              <h2 className="text-base font-bold">گیمنت شما ساخته شد</h2>
              {needsLogin ? (
                <>
                  <p className="text-xs leading-6 text-[var(--text-muted)]">
                    برای ورود به پنل مدیریت، با همین شماره وارد شوید.
                  </p>
                  <Link
                    href="/login?redirect=/owner"
                    className="flex h-12 w-full items-center justify-center rounded-card bg-[var(--primary)] px-6 text-sm font-bold text-on-primary sm:w-auto"
                  >
                    ورود به حساب کاربری
                  </Link>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">در حال انتقال به پنل مدیریت…</p>
              )}
              {result.slug && (
                <Link href={`/gamecenter/${encodeURIComponent(result.slug)}`} className="text-xs font-bold text-[var(--primary)] underline">
                  مشاهدهٔ صفحهٔ گیمنت
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}