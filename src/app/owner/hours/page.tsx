"use client";

import React, { useEffect, useState, useMemo } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { TimePicker } from "@/components/owner/TimePicker";
import { Icon } from "@/components/ui/Icon";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";

// Preset shifts popular among game centers in Iran
const SHIFT_PRESETS = [
  { label: "عادی روزانه", start: "10:00", end: "23:00", desc: "۱۰ صبح تا ۱۱ شب" },
  { label: "شبانه‌روزی کامل", start: "00:00", end: "23:59", desc: "۲۴ ساعته بدون وقفه" },
  { label: "عصر تا پاسی از شب", start: "14:00", end: "02:00", desc: "۲ بعدازظهر تا ۲ بامداد" },
  { label: "گیمینگ نیمه‌شب", start: "12:00", end: "04:00", desc: "۱۲ ظهر تا ۴ صبح (شبانه)" },
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

  useEffect(() => {
    let active = true;
    setMsg(null);

    if (isCenterLoading) return;

    if (!centerId) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    ownerService
      .getSettings(centerId)
      .then((s) => {
        if (!active) return;
        setStart(s?.workStartTime ? normalizeTime(s.workStartTime) : "10:00");
        setEnd(s?.workEndTime ? normalizeTime(s.workEndTime) : "23:00");
        setTz(s?.timeZone || "Asia/Tehran");
        setAllowOnline(s?.allowOnlineBooking !== false);
        setAutoConfirm(!!s?.onlineBookingAutoConfirm);
        setPreventOverlaps(s?.preventOverlaps !== false);
      })
      .catch((e) => {
        if (active) setMsg({ ok: false, text: getErrorMessage(e) });
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
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

    try {
      // 1. Send update conforming to OpenAPI Settings schema
      await ownerService.updateSettings(centerId, {
        workStartTime: cleanStart,
        workEndTime: cleanEnd,
        timeZone: tz.trim() || "Asia/Tehran",
        allowOnlineBooking: allowOnline,
        onlineBookingAutoConfirm: autoConfirm,
        preventOverlaps: preventOverlaps,
      });

      // 2. Re-fetch data from backend to verify server state persistence
      const refreshed = await ownerService.getSettings(centerId);
      setStart(refreshed?.workStartTime ? normalizeTime(refreshed.workStartTime) : cleanStart);
      setEnd(refreshed?.workEndTime ? normalizeTime(refreshed.workEndTime) : cleanEnd);
      setTz(refreshed?.timeZone || tz);
      setAllowOnline(refreshed?.allowOnlineBooking !== false);
      setAutoConfirm(!!refreshed?.onlineBookingAutoConfirm);
      setPreventOverlaps(refreshed?.preventOverlaps !== false);

      setMsg({
        ok: true,
        text: "ساعات کاری و تنظیمات عملیاتی مرکز با موفقیت در سرور ذخیره شد.",
      });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="ساعات کاری و نوبت‌دهی" backUrl="/owner" />

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
              برای مدیریت و تنظیم ساعات کاری، لطفاً ابتدا گیم‌نت خود را ایجاد کرده یا وارد حساب مدیر شوید.
            </p>
          </div>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-5">
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

            {/* Shift Presets Bar */}
            <div className="p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-white)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  الگوهای شیفت متداول
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">انتخاب سریع با یک کلیک</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SHIFT_PRESETS.map((p) => {
                  const isActive = start === p.start && end === p.end;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setStart(p.start);
                        setEnd(p.end);
                      }}
                      className={`p-2.5 rounded-card text-right flex flex-col gap-1 transition-all border ${
                        isActive
                          ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text-white)]"
                          : "bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/50 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-bold">{p.label}</span>
                      <span className="text-[11px] text-[var(--text-subtle)] font-normal">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
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
                  <span className="text-[11px] text-[var(--text-muted)]">در صورت غیرفعال بودن، کاربران تنها می‌توانند مشخصات گیم‌نت را ببینند.</span>
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
                  <span className="text-[11px] text-[var(--text-muted)]">رزروهای جدید بدون نیاز به تایید دستی مدیر بلافاصله ثبت شوند.</span>
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
                  <span className="text-[11px] text-[var(--text-muted)]">سیستم از رزرو همزمان یک سیستم در ساعات یکسان جلوگیری کند.</span>
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

            {/* Note on Holidays and API Contract */}
            <div className="p-4 rounded-card bg-[var(--foreground)]/15 border border-[var(--border-subtle)] text-[var(--text-muted)] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[var(--text-white)] text-xs font-bold">
                <Icon name="info" size={16} className="text-[var(--primary)]" />
                <span>تقویم تعطیلات و روزهای غیرکاری</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                طبق نسخه جاری قرارداد بک‌اند (OpenAPI v1.0-LOCKED)، ساعات کاری و شیفت از طریق مسیر{" "}
                <code className="text-xs font-mono text-[var(--primary)]">PUT/PATCH /gamingCenters/{centerId}/settings</code>{" "}
                به صورت بلادرنگ در سرور ذخیره می‌شود. ماژول تعطیلات اختصاصی هفتگی و تقویم رسمی نیز طبق برنامه در آپدیت آتی بک‌اند اضافه خواهد شد.
              </p>
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
                  <span>ذخیره تغییرات ساعات کاری</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
