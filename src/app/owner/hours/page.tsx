"use client";

import React, { useEffect, useState, useMemo } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
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

  // فرم ایجاد تعطیلی جدید
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureTitle, setClosureTitle] = useState("");
  const [closureReason, setClosureReason] = useState("");
  const [closureStartDate, setClosureStartDate] = useState("");
  const [closureStartTime, setClosureStartTime] = useState("00:00");
  const [closureEndDate, setClosureEndDate] = useState("");
  const [closureEndTime, setClosureEndTime] = useState("23:59");
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

  // تاگل کردن روزهای تعطیل هفته
  const toggleClosedDay = (dayOfWeek: number) => {
    setClosedDays((prev) => {
      if (prev.includes(dayOfWeek)) {
        return prev.filter((d) => d !== dayOfWeek);
      } else {
        return [...prev, dayOfWeek].sort((a, b) => a - b);
      }
    });
  };

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
        text: "ساعات کاری، روزهای تعطیل هفتگی و تنظیمات عملیاتی مرکز با موفقیت ذخیره شد.",
      });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // ایجاد تعطیلی جدید (Closures)
  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId || isSubmittingClosure) return;

    if (!closureTitle.trim()) {
      setClosureError("لطفاً عنوان تعطیلی را وارد کنید.");
      return;
    }
    if (!closureStartDate || !closureEndDate) {
      setClosureError("لطفاً تاریخ شروع و پایان تعطیلی را مشخص کنید.");
      return;
    }

    const startIso = new Date(`${closureStartDate}T${closureStartTime}:00`).toISOString();
    const endIso = new Date(`${closureEndDate}T${closureEndTime}:00`).toISOString();

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setClosureError("تاریخ و زمان شروع باید قبل از تاریخ و زمان پایان باشد.");
      return;
    }

    setIsSubmittingClosure(true);
    setClosureError(null);

    try {
      await ownerService.createClosure(centerId, {
        title: closureTitle.trim(),
        reason: closureReason.trim() || undefined,
        startDate: startIso,
        endDate: endIso,
      });

      // تازه سازی لیست تعطیلات
      const updated = await ownerService.getClosures(centerId);
      setClosures(updated);

      setShowClosureModal(false);
      setClosureTitle("");
      setClosureReason("");
      setClosureStartDate("");
      setClosureEndDate("");
      setMsg({ ok: true, text: "تعطیلی موقت/مناسبتی با موفقیت ثبت شد." });
    } catch (err) {
      setClosureError(getErrorMessage(err));
    } finally {
      setIsSubmittingClosure(false);
    }
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
      <OwnerPageHeader title="ساعات کاری و روزهای تعطیل" backUrl="/owner" />

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

            {/* بخش ۱: تعطیلات هفتگی و ساعات کاری معمول */}
            <form onSubmit={save} className="flex flex-col gap-5">
              {/* بخش انتخاب روزهای تعطیل هفتگی */}
              <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-bold text-[var(--text-white)] flex items-center gap-2">
                      <Icon name="calendar" size={18} className="text-[var(--primary)]" />
                      <span>تعیین روزهای تعطیل هفتگی (ثابت)</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      روزهایی که در طول هفته گیم‌نت کاملاً تعطیل است و مشتریان نمی‌توانند سانسی رزرو کنند.
                    </p>
                  </div>
                  {closedDays.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent-red)]/15 text-[var(--accent-red)] font-bold border border-[var(--accent-red)]/30">
                      {toPersianDigits(closedDays.length)} روز تعطیل در هفته
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {DAYS_OF_WEEK_OPTIONS.map((day) => {
                    const isClosed = closedDays.includes(day.dayOfWeek);
                    return (
                      <button
                        key={day.dayOfWeek}
                        type="button"
                        onClick={() => toggleClosedDay(day.dayOfWeek)}
                        disabled={saving}
                        className={`px-4 py-2.5 rounded-card text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          isClosed
                            ? "bg-[var(--accent-red)] text-white shadow-md ring-2 ring-[var(--accent-red)]/40"
                            : "bg-[var(--foreground)]/50 text-[var(--text-white)] hover:bg-[var(--foreground)]/80 border border-[var(--border-subtle)]"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isClosed ? "bg-white" : "bg-[var(--text-subtle)]"}`} />
                        <span>{day.label}</span>
                        {isClosed ? (
                          <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded">تعطیل</span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">دایر</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-[var(--text-subtle)]">
                  {closedDays.length === 0
                    ? "مرکز در تمام ایام هفته (۷ روز هفته) فعال و دایر است."
                    : `مرکز در روزهای «${closedDays
                        .map((d) => DAYS_OF_WEEK_OPTIONS.find((opt) => opt.dayOfWeek === d)?.label)
                        .filter(Boolean)
                        .join("، ")}» پذیرش و رزرو نخواهد داشت.`}
                </p>
              </div>

              {/* Time Pickers Section */}
              <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-bold text-[var(--text-white)]">تنظیم ساعات کار مرکز</h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      مرکز: {center?.name || "گیم‌نت شما"}
                    </p>
                  </div>

                  {/* Duration Badge */}
                  <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--foreground)]/60 text-[var(--text-white)] border border-[var(--border-subtle)] flex items-center gap-1.5">
                    <Icon name="clock" size={14} className="text-[var(--primary)]" />
                    <span>
                      {toPersianDigits(durationHours)} ساعت
                      {durationMinutesRemainder > 0 ? ` و ${toPersianDigits(durationMinutesRemainder)} دقیقه` : ""}{" "}
                      فعالیت روزانه
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <TimePicker
                    label="ساعت شروع کار"
                    value={start}
                    onChange={setStart}
                    helperText="آغاز پذیرش مشتریان"
                    presetTimes={["09:00", "10:00", "11:00", "12:00", "14:00"]}
                    disabled={saving}
                  />

                  <TimePicker
                    label="ساعت پایان کار"
                    value={end}
                    onChange={setEnd}
                    helperText="پایان سرویس‌دهی و رزروها"
                    presetTimes={["22:00", "23:00", "00:00", "02:00", "04:00"]}
                    disabled={saving}
                  />
                </div>

                {/* Overnight Indicator */}
                {isOvernight && (
                  <div className="p-3.5 rounded-card bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold flex items-center gap-2.5">
                    <Icon name="clock" size={18} className="shrink-0" />
                    <div>
                      <span>شیفت شبانه فعال است: </span>
                      <span className="font-normal text-[var(--text-white)]">
                        ساعات کاری از نیمه‌شب عبور می‌کند و در بامداد روز بعد در ساعت {toPersianDigits(end)} به پایان می‌رسد.
                      </span>
                    </div>
                  </div>
                )}

                {/* Time Zone Input */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)] flex items-center justify-between">
                    <span>منطقه زمانی سیستم نوبت‌دهی (Time Zone)</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-normal">استاندارد ایران: Asia/Tehran</span>
                  </label>
                  <div className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus-within:border-[var(--primary)] flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] shrink-0">منطقه:</span>
                    <input
                      type="text"
                      dir="ltr"
                      value={tz}
                      onChange={(e) => setTz(e.target.value)}
                      placeholder="Asia/Tehran"
                      disabled={saving}
                      className="w-full bg-transparent text-xs font-mono font-bold text-[var(--text-white)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Booking & Operational Controls */}
              <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  <h3 className="text-xs font-bold text-[var(--text-white)]">تنظیمات پذیرش و رزرو آنلاین</h3>
                </div>

                {/* Toggle 1: Allow Online Booking */}
                <label className="flex items-center justify-between p-3 rounded-card bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/30 border border-[var(--border-subtle)] cursor-pointer transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--text-white)]">امکان ثبت رزرو آنلاین توسط کاربران</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowOnline}
                    onChange={(e) => setAllowOnline(e.target.checked)}
                    disabled={saving}
                    className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                  />
                </label>

                {/* Toggle 2: Auto Confirm */}
                <label className="flex items-center justify-between p-3 rounded-card bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/30 border border-[var(--border-subtle)] cursor-pointer transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--text-white)]">تأیید خودکار رزروها (Auto Confirm)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoConfirm}
                    onChange={(e) => setAutoConfirm(e.target.checked)}
                    disabled={saving}
                    className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                  />
                </label>

                {/* Toggle 3: Prevent Overlaps */}
                <label className="flex items-center justify-between p-3 rounded-card bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/30 border border-[var(--border-subtle)] cursor-pointer transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--text-white)]">جلوگیری از هم‌پوشانی نوبت‌ها (Prevent Overlaps)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preventOverlaps}
                    onChange={(e) => setPreventOverlaps(e.target.checked)}
                    disabled={saving}
                    className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={saving}
                className="h-12 rounded-card bg-[var(--primary)] hover:brightness-105 active:scale-[0.99] text-black font-bold text-sm disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>در حال ذخیره در سرور...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={18} />
                    <span>ذخیره تغییرات ساعات کاری و روزهای تعطیل</span>
                  </>
                )}
              </button>
            </form>

            {/* بخش ۲: تعطیلات مناسبتی، موقت یا خاص (Closures) */}
            <div className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-sm font-bold text-[var(--text-white)] flex items-center gap-2">
                    <Icon name="clock" size={18} className="text-[var(--accent-red)]" />
                    <span>تعطیلات مناسبتی و موقت (Closures)</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    ثبت تعطیلات تاریخ‌دار مانند «تعطیلات نوروز»، «تعمیرات سرور»، یا «عزاداری رسمی».
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowClosureModal(true)}
                  className="px-3.5 py-1.5 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Icon name="plus" size={14} />
                  <span>ثبت تعطیلی جدید</span>
                </button>
              </div>

              {/* لیست تعطیلات ثبت‌شده */}
              {closures.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-subtle)] flex flex-col items-center gap-2">
                  <Icon name="calendar" size={28} className="opacity-40" />
                  <span>هیچ تعطیلی مناسبتی یا موقتی برای این مرکز ثبت نشده است.</span>
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
                        className="p-3.5 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-red)]" />
                            <span className="text-xs font-bold text-[var(--text-white)]">
                              {closure.title}
                            </span>
                            {closure.reason && (
                              <span className="text-[11px] text-[var(--text-muted)]">
                                ({closure.reason})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-subtle)] flex items-center gap-2">
                            <span>از: {startStr}</span>
                            <span>•</span>
                            <span>تا: {endStr}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteClosure(closure.id)}
                          disabled={deletingClosureId === closure.id}
                          className="px-3 py-1.5 rounded-card bg-[var(--accent-red)]/15 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25 text-xs font-bold border border-[var(--accent-red)]/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
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

            {/* مودال ثبت تعطیلی جدید */}
            {showClosureModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
                dir="rtl"
              >
                <div className="w-full max-w-md rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--text-white)] flex items-center gap-2">
                      <Icon name="alert" size={18} className="text-[var(--accent-red)]" />
                      <span>ثبت بازه تعطیلی جدید</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowClosureModal(false)}
                      className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>

                  {closureError && (
                    <div className="p-3 rounded-card text-xs font-bold bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30">
                      {closureError}
                    </div>
                  )}

                  <form onSubmit={handleCreateClosure} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[var(--text-white)]">
                        عنوان تعطیلی <span className="text-[var(--accent-red)]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: تعطیلات نوروز، تعمیرات سرور، سوگواری رسمی"
                        value={closureTitle}
                        onChange={(e) => setClosureTitle(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[var(--text-white)]">علت یا توضیحات (اختیاری)</label>
                      <textarea
                        rows={2}
                        placeholder="علت تعطیلی یا توضیح تکمیلی برای اطلاع کاربران"
                        value={closureReason}
                        onChange={(e) => setClosureReason(e.target.value)}
                        className="w-full p-2.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] outline-none resize-none"
                      />
                    </div>

                    {/* تاریخ و ساعت شروع */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-[var(--text-white)]">تاریخ شروع</label>
                        <input
                          type="date"
                          value={closureStartDate}
                          onChange={(e) => setClosureStartDate(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-[var(--text-white)]">ساعت شروع</label>
                        <input
                          type="time"
                          value={closureStartTime}
                          onChange={(e) => setClosureStartTime(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none"
                        />
                      </div>
                    </div>

                    {/* تاریخ و ساعت پایان */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-[var(--text-white)]">تاریخ پایان</label>
                        <input
                          type="date"
                          value={closureEndDate}
                          onChange={(e) => setClosureEndDate(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-[var(--text-white)]">ساعت پایان</label>
                        <input
                          type="time"
                          value={closureEndTime}
                          onChange={(e) => setClosureEndTime(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setShowClosureModal(false)}
                        className="px-4 h-10 rounded-card bg-[var(--foreground)]/40 text-[var(--text-subtle)] hover:text-white text-xs font-bold cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingClosure}
                        className="px-5 h-10 rounded-card bg-[var(--primary)] text-black text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isSubmittingClosure ? "در حال ثبت..." : "ثبت تعطیلی"}
                      </button>
                    </div>
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
