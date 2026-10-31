"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";

const input =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none";

export default function OwnerHoursPage() {
  const { centerId } = useOwner();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tz, setTz] = useState("Asia/Tehran");
  const [allowOnline, setAllowOnline] = useState<boolean>(true);
  const [autoConfirm, setAutoConfirm] = useState<boolean>(false);
  const [preventOverlaps, setPreventOverlaps] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setMsg(null);

    if (!centerId) {
      setLoaded(true);
      return;
    }

    ownerService
      .getSettings(centerId)
      .then((s) => {
        if (!active) return;
        setStart(s?.workStartTime ?? "");
        setEnd(s?.workEndTime ?? "");
        setTz(s?.timeZone ?? "Asia/Tehran");
        setAllowOnline(s?.allowOnlineBooking !== false);
        setAutoConfirm(!!s?.onlineBookingAutoConfirm);
        setPreventOverlaps(s?.preventOverlaps !== false);
      })
      .catch((e) => active && setMsg({ ok: false, text: getErrorMessage(e) }))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [centerId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      await ownerService.updateSettings(centerId, {
        workStartTime: start,
        workEndTime: end,
        timeZone: tz || "Asia/Tehran",
        allowOnlineBooking: allowOnline,
        onlineBookingAutoConfirm: autoConfirm,
        preventOverlaps: preventOverlaps,
      });

      // Refresh data from backend to verify server state persistence
      const refreshed = await ownerService.getSettings(centerId);
      setStart(refreshed?.workStartTime ?? start);
      setEnd(refreshed?.workEndTime ?? end);
      setTz(refreshed?.timeZone ?? tz);
      setAllowOnline(refreshed?.allowOnlineBooking !== false);
      setAutoConfirm(!!refreshed?.onlineBookingAutoConfirm);
      setPreventOverlaps(refreshed?.preventOverlaps !== false);

      setMsg({ ok: true, text: "ساعات کاری و تنظیمات با موفقیت در سرور ذخیره شد." });
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="ساعات کاری و تعطیلات" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[var(--max-mini-app-width)] lg:mx-auto lg:w-full lg:px-0">
        {!loaded ? (
          <div className="h-32 rounded-card bg-[var(--bg-card)] animate-pulse" />
        ) : (
          <form onSubmit={save} className="flex flex-col gap-3">
            {msg && (
              <div
                className={`p-3 rounded-card text-xs font-bold ${
                  msg.ok
                    ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
                    : "bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
                }`}
              >
                {msg.text}
              </div>
            )}

            <label className="text-xs font-bold">ساعت شروع کار</label>
            <input type="time" className={input} dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} />
            <label className="text-xs font-bold">ساعت پایان کار</label>
            <input type="time" className={input} dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} />
            <label className="text-xs font-bold">منطقه زمانی</label>
            <input className={input} dir="ltr" placeholder="Asia/Tehran" value={tz} onChange={(e) => setTz(e.target.value)} />

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              ثبت روزهای تعطیل به‌زودی در این بخش فعال خواهد شد.
            </p>

            <button type="submit" disabled={saving} className="h-12 rounded-card bg-[var(--primary)] text-on-primary font-bold text-sm disabled:opacity-60">
              {saving ? "در حال ذخیره..." : "ذخیره"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}