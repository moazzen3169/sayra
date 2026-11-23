"use client";

import React, { useEffect, useState, useMemo } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { OwnerToggleSwitch } from "@/components/owner/OwnerToggleSwitch";
import { TimePicker } from "@/components/owner/TimePicker";
import { Icon } from "@/components/ui/Icon";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import type { GamingCenterClosure, GamingCenterSchedule } from "@/types/owner";

// روزهای هفته به ترتیب تقویم ایران (۰: شنبه، ۱: یک‌شنبه، ...، ۶: جمعه)
export const DAYS_OF_WEEK_OPTIONS = [
  { dayOfWeek: 0, label: "شنبه" },
  { dayOfWeek: 1, label: "یک‌شنبه" },
  { dayOfWeek: 2, label: "دوشنبه" },
  { dayOfWeek: 3, label: "سه‌شنبه" },
  { dayOfWeek: 4, label: "چهارشنبه" },
  { dayOfWeek: 5, label: "پنج‌شنبه" },
  { dayOfWeek: 6, label: "جمعه" },
];

export default function OwnerHoursPage() {
  const { centerId, center, isCenterLoading } = useOwner();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Form State
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("23:00");
  const [tz, setTz] = useState("Asia/Tehran");
  const [allowOnline, setAllowOnline] = useState<boolean>(true);
  const [autoConfirm, setAutoConfirm] = useState<boolean>(false);
  const [preventOverlaps, setPreventOverlaps] = useState<boolean>(true);

  // روزهای تعطیل هفتگی (closedDays: 0 تا 6)
  const [closedDays, setClosedDays] = useState<number[]>([]);
  // ساعات کاری اختصاصی هر روز
  const [schedules, setSchedules] = useState<GamingCenterSchedule[]>([]);

  // تعطیلات موقت یا مناسبتی (Closures)
  const [closures, setClosures] = useState<GamingCenterClosure[]>([]);
  const [isLoadingClosures, setIsLoadingClosures] = useState(false);

  // فرم ایجاد تعطیلی موقت
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [isSubmittingClosure, setIsSubmittingClosure] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);
  const [deletingClosureId, setDeletingClosureId] = useState<string | null>(null);

  // Normalize time strings to strict "HH:mm"
  const normalizeTime = (t: string): string => {
    if (!t) return "10:00";
    const cleaned = toEnglishDigits(t).trim();
    const parts = cleaned.split(":");
    let h = parseInt(parts[0] || "0", 10);
    let m = parseInt(parts[1] || "0", 10);
    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const loadCenterData = async (cid: string, activeSignal?: { active: boolean }) => {
    try {
      const [s, cls, sch] = await Promise.allSettled([
        ownerService.getSettings(cid),
        ownerService.getClosures(cid),
        ownerService.getSchedules(cid),
      ]);

      if (activeSignal && !activeSignal.active) return;

      if (s.status === "fulfilled" && s.value) {
        setStart(s.value.workStartTime ? normalizeTime(s.value.workStartTime) : "10:00");
        setEnd(s.value.workEndTime ? normalizeTime(s.value.workEndTime) : "23:00");
        setTz(s.value.timeZone || "Asia/Tehran");
        setAllowOnline(s.value.allowOnlineBooking !== false);
        setAutoConfirm(!!s.value.onlineBookingAutoConfirm);
        setPreventOverlaps(s.value.preventOverlaps !== false);
        if (Array.isArray(s.value.closedDays)) {
          setClosedDays(s.value.closedDays);
        }
      }

      if (cls.status === "fulfilled" && Array.isArray(cls.value)) {
        setClosures(cls.value);
      }

      if (sch.status === "fulfilled" && Array.isArray(sch.value) && sch.value.length > 0) {
        setSchedules(sch.value);
      }
    } catch (e) {
      if (activeSignal && activeSignal.active) {
        setMsg({ ok: false, text: getErrorMessage(e) });
      }
    } finally {
      if (activeSignal && activeSignal.active) {
        setLoaded(true);
      }
    }
  };

  useEffect(() => {
    const activeSignal = { active: true };
    setMsg(null);

    if (isCenterLoading) return;

    if (!centerId) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    loadCenterData(centerId, activeSignal);

    return () => {
      activeSignal.active = false;
    };
  }, [centerId, isCenterLoading]);

  // Operational metrics and overnight crossing calculation
  const { isOvernight, durationHours, durationMinutesRemainder } = useMemo(() => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const startTotal = (startH || 0) * 60 + (startM || 0);
    let endTotal = (endH || 0) * 60 + (endM || 0);

    const overnight = endTotal < startTotal;
    if (overnight) {
      endTotal += 24 * 60;
    }

    const diff = endTotal - startTotal;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    return {
      isOvernight: overnight,
      durationHours: hours,
      durationMinutesRemainder: minutes,
    };
  }, [start, end]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!centerId) {
      setMsg({
        ok: false,
        text: "شناسه مرکز گیم‌نت یافت نشد. لطفاً ابتدا گیم‌نت خود را ثبت کنید یا وارد حساب خود شوید.",
      });
      return;
    }

    setSaving(true);
    setMsg(null);

    const cleanStart = normalizeTime(start);
    const cleanEnd = normalizeTime(end);

    // ساخت schedules برای تک‌تک روزهای هفته
    const builtSchedules: GamingCenterSchedule[] = DAYS_OF_WEEK_OPTIONS.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      startTime: cleanStart,
      endTime: cleanEnd,
      isClosed: closedDays.includes(day.dayOfWeek),
    }));

    try {
      // 1. Send update conforming to Settings schema
      await ownerService.updateSettings(centerId, {
        workStartTime: cleanStart,
        workEndTime: cleanEnd,
        timeZone: tz.trim() || "Asia/Tehran",
        allowOnlineBooking: allowOnline,
        onlineBookingAutoConfirm: autoConfirm,
        preventOverlaps: preventOverlaps,
        closedDays,
        schedules: builtSchedules,
      });

      // در صورت وجود اندپوینت schedules
      await ownerService.updateSchedules(centerId, builtSchedules).catch(() => {});

      // 2. Re-fetch data from backend to verify server state persistence
      const refreshed = await ownerService.getSettings(centerId);
      if (refreshed) {
        setStart(refreshed.workStartTime ? normalizeTime(refreshed.workStartTime) : cleanStart);
        setEnd(refreshed.workEndTime ? normalizeTime(refreshed.workEndTime) : cleanEnd);
        setTz(refreshed.timeZone || tz);
        setAllowOnline(refreshed.allowOnlineBooking !== false);
        setAutoConfirm(!!refreshed.onlineBookingAutoConfirm);
        setPreventOverlaps(refreshed.preventOverlaps !== false);
        if (Array.isArray(refreshed.closedDays)) {
          setClosedDays(refreshed.closedDays);
        }
      }

      setMsg({
        ok: true,
        text: "ساعات کاری و قوانین رزرو با موفقیت ذخیره شد.",
      });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // ایجاد تعطیلی موقت بر اساس مدت ساعت
  const handlePauseForHours = async (hours: number) => {
    if (!centerId || isSubmittingClosure) return;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
      setClosureError("لطفاً تعداد ساعت معتبر (بین ۰.۵ تا ۷۲۰ ساعت) وارد کنید.");
      return;
    }

    setIsSubmittingClosure(true);
    setClosureError(null);

    try {
      const now = Date.now();
      const end = now + hours * 60 * 60 * 1000;
      const created = await ownerService.createClosure(centerId, {
        title: "توقف موقت رزرو آنلاین",
        reason: `بسته شدن موقت رزرو آنلاین به مدت ${toPersianDigits(hours)} ساعت توسط مدیر`,
        startDate: new Date(now).toISOString(),
        endDate: new Date(end).toISOString(),
      });

      setClosures((prev) => [created, ...prev]);
      setShowClosureModal(false);
      setCustomHours("");
      setMsg({ ok: true, text: `رزرو آنلاین به مدت ${toPersianDigits(hours)} ساعت بسته شد.` });
    } catch (err) {
      setClosureError(getErrorMessage(err));
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  const handleCustomClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(toEnglishDigits(customHours).trim());
    handlePauseForHours(parsed);
  };

  // حذف تعطیلی
  const handleDeleteClosure = async (closureId: string) => {
    if (!centerId || deletingClosureId) return;
    if (!confirm("آیا از حذف این تعطیلی اطمینان دارید؟")) return;

    setDeletingClosureId(closureId);
    try {
      await ownerService.deleteClosure(centerId, closureId);
      setClosures((prev) => prev.filter((c) => c.id !== closureId));
      setMsg({ ok: true, text: "تعطیلی مورد نظر با موفقیت حذف شد." });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setDeletingClosureId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="ساعات کاری و رزرو" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-5 lg:max-w-[var(--max-mini-app-width)] lg:mx-auto lg:w-full lg:px-0">
        {!loaded || isCenterLoading ? (
          <div className="flex flex-col gap-4">
            <div className="h-28 rounded-card bg-[var(--bg-card)] animate-pulse" />
            <div className="h-64 rounded-card bg-[var(--bg-card)] animate-pulse" />
            <div className="h-40 rounded-card bg-[var(--bg-card)] animate-pulse" />
          </div>
        ) : !centerId ? (
          <div className="p-6 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/15 text-[var(--accent-red)] flex items-center justify-center">
              <Icon name="alert" size={24} />
            </div>
            <h2 className="text-base font-bold text-[var(--text-white)]">گیم‌نت فعالی یافت نشد</h2>
            <p className="text-xs text-[var(--text-subtle)] max-w-sm">
              برای مدیریت و تنظیم ساعات کاری و تعطیلات، لطفاً ابتدا گیم‌نت خود را ایجاد کرده یا وارد حساب مدیر شوید.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Notification Banner */}
            {msg && (
              <div
                className={`p-4 rounded-card text-xs font-bold flex items-center gap-2.5 transition-all animate-in fade-in ${
                  msg.ok
                    ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                    : "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                }`}
              >
                <Icon name={msg.ok ? "check" : "alert"} size={18} className="shrink-0" />
                <span>{msg.text}</span>
              </div>
            )}

            {/* بخش ۱: ساعات کاری و قوانین رزرو */}
            <form onSubmit={save} className="flex flex-col gap-5">
              {/* ساعات کاری */}
              <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="clock" size={18} className="text-[var(--primary)]" />
                    <h2 className="text-sm font-bold text-[var(--text-white)]">ساعات کاری</h2>
                  </div>

                  {/* Duration Badge */}
                  <div className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--foreground)]/60 text-[var(--text-white)] border border-[var(--border-subtle)] flex items-center gap-1.5">
                    <span>
                      {toPersianDigits(durationHours)} ساعت
                      {durationMinutesRemainder > 0 ? ` و ${toPersianDigits(durationMinutesRemainder)} دقیقه` : ""}{" "}
                      فعالیت روزانه
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <TimePicker
                    label="ساعت شروع"
                    value={start}
                    onChange={setStart}
                    presetTimes={["09:00", "10:00", "11:00", "12:00", "14:00"]}
                    disabled={saving}
                  />

                  <TimePicker
                    label="ساعت پایان"
                    value={end}
                    onChange={setEnd}
                    presetTimes={["22:00", "23:00", "00:00", "02:00", "04:00"]}
                    disabled={saving}
                  />
                </div>

                {/* Overnight Indicator */}
                {isOvernight && (
                  <div className="p-3.5 rounded-card bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold flex items-center gap-2.5">
                    <Icon name="clock" size={18} className="shrink-0" />
                    <span>
                      شیفت شبانه تا ساعت {toPersianDigits(end)} بامداد روز بعد فعال است.
                    </span>
                  </div>
                )}
              </div>

              {/* قوانین رزرو آنلاین */}
              <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  <h3 className="text-sm font-bold text-[var(--text-white)]">قوانین رزرو آنلاین</h3>
                </div>

                <div className="flex flex-col gap-3">
                  <OwnerToggleSwitch
                    label="فعال بودن رزرو آنلاین"
                    description="مشتریان می‌توانند سانس‌های گیم‌نت را به‌صورت آنلاین رزرو کنند"
                    checked={allowOnline}
                    onChange={setAllowOnline}
                    disabled={saving}
                  />
                  <OwnerToggleSwitch
                    label="تایید خودکار رزروها"
                    description="رزروها بدون نیاز به تایید دستی مستقیماً ثبت قطعی شوند"
                    checked={autoConfirm}
                    onChange={setAutoConfirm}
                    disabled={saving}
                  />
                  <OwnerToggleSwitch
                    label="جلوگیری از تداخل زمانی"
                    description="عدم اجازه ثبت دو رزرو همزمان روی یک دستگاه"
                    checked={preventOverlaps}
                    onChange={setPreventOverlaps}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* دکمه ذخیره */}
              <button
                type="submit"
                disabled={saving}
                className="h-12 w-full rounded-card bg-[var(--primary)] hover:brightness-105 active:scale-[0.99] text-on-primary font-bold text-sm disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={18} />
                    <span>ذخیره تنظیمات</span>
                  </>
                )}
              </button>
            </form>

            {/* بخش ۲: تعطیلات موقت */}
            <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" size={18} className="text-[var(--accent-red)]" />
                  <h2 className="text-sm font-bold text-[var(--text-white)]">تعطیلات موقت</h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setClosureError(null);
                    setShowClosureModal(true);
                  }}
                  className="px-3.5 h-9 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow shrink-0"
                >
                  <Icon name="plus" size={14} />
                  <span>ثبت تعطیلی</span>
                </button>
              </div>

              {/* لیست تعطیلات ثبت‌شده */}
              {closures.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                  <Icon name="calendar" size={24} className="opacity-40" />
                  <span>تعطیلی موقتی ثبت نشده است.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {closures.map((closure) => {
                    const startStr = new Date(closure.startDate).toLocaleString("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });
                    const endStr = new Date(closure.endDate).toLocaleString("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div
                        key={closure.id}
                        className="p-4 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-red)] shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-[var(--text-white)] truncate">
                              {closure.title}
                            </span>
                          </div>

                          {closure.reason && (
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed pr-4">
                              {closure.reason}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-subtle)] pr-4">
                            <span>از {startStr}</span>
                            <span className="opacity-50">•</span>
                            <span>تا {endStr}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteClosure(closure.id)}
                          disabled={deletingClosureId === closure.id}
                          className="w-full sm:w-auto h-9 px-3.5 rounded-card bg-[var(--accent-red)]/15 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25 text-xs font-bold border border-[var(--accent-red)]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                        >
                          {deletingClosureId === closure.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-[var(--accent-red)] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon name="trash" size={14} />
                          )}
                          <span>لغو تعطیلی</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* مودال ثبت تعطیلی موقت */}
            {showClosureModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
                onClick={() => !isSubmittingClosure && setShowClosureModal(false)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="hours-pause-booking-title"
                  className="w-full max-w-[380px] rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col gap-4 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-2">
                      <Icon name="clock" size={18} className="text-[var(--primary)]" />
                      <h3 id="hours-pause-booking-title" className="text-sm font-bold text-[var(--text-white)]">
                        بستن موقت رزرو آنلاین
                      </h3>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmittingClosure}
                      onClick={() => setShowClosureModal(false)}
                      aria-label="بستن"
                      className="p-1 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    در این بازه مشتریان امکان ثبت رزرو جدید نخواهند داشت. هر زمان بخواهید می‌توانید دوباره رزرو را باز کنید.
                  </p>

                  {closureError && (
                    <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                      {closureError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmittingClosure}
                      onClick={() => handlePauseForHours(1)}
                      className="h-11 rounded-card bg-[var(--foreground)]/50 hover:border-[var(--primary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      ۱ ساعت
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingClosure}
                      onClick={() => handlePauseForHours(3)}
                      className="h-11 rounded-card bg-[var(--foreground)]/50 hover:border-[var(--primary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      ۳ ساعت
                    </button>
                  </div>

                  <form onSubmit={handleCustomClosureSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="ساعت دلخواه (مثلاً ۲)"
                      disabled={isSubmittingClosure}
                      className="flex-1 h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingClosure || !customHours.trim()}
                      className="h-11 px-5 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isSubmittingClosure ? "..." : "تأیید"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
