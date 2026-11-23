"use client";

import React, { useEffect, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/api/config";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { GamingCenterClosure } from "@/types/owner";

function findActiveClosure(closures: GamingCenterClosure[]): GamingCenterClosure | null {
  const now = Date.now();
  return (
    closures.find((c) => {
      const start = Date.parse(c.startDate);
      const end = Date.parse(c.endDate);
      return Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now;
    }) ?? null
  );
}

function formatEndTimeFa(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: APP_TIME_ZONE,
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export function QuickBookingPauseCard({ centerId }: { centerId: string }) {
  const [activeClosure, setActiveClosure] = useState<GamingCenterClosure | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    ownerService
      .getClosures(centerId, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) {
          setActiveClosure(findActiveClosure(list));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [centerId]);

  const handlePauseForHours = async (hours: number) => {
    if (!centerId || submitting) return;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
      setError("لطفاً تعداد ساعت معتبر (بین ۰.۵ تا ۷۲۰ ساعت) وارد کنید.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatusMsg(null);

    try {
      const now = Date.now();
      const end = now + hours * 60 * 60 * 1000;
      const created = await ownerService.createClosure(centerId, {
        title: "توقف موقت رزرو آنلاین",
        reason: `بسته شدن موقت رزرو آنلاین به مدت ${toPersianDigits(hours)} ساعت توسط مدیر`,
        startDate: new Date(now).toISOString(),
        endDate: new Date(end).toISOString(),
      });
      setActiveClosure(created);
      setIsExpanded(false);
      setCustomHours("");
      const endTimeLabel = formatEndTimeFa(created.endDate || new Date(end).toISOString());
      setStatusMsg(
        endTimeLabel
          ? `رزرو آنلاین تا ساعت ${endTimeLabel} بسته شد.`
          : `رزرو آنلاین به مدت ${toPersianDigits(hours)} ساعت بسته شد.`
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = toEnglishDigits(customHours).trim();
    const parsed = Number(normalized);
    handlePauseForHours(parsed);
  };

  const handleReopen = async () => {
    if (!centerId || !activeClosure || submitting) return;
    setSubmitting(true);
    setError(null);
    setStatusMsg(null);
    try {
      await ownerService.deleteClosure(centerId, activeClosure.id);
      setActiveClosure(null);
      setStatusMsg("رزرو آنلاین دوباره باز شد.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 flex flex-col gap-2.5">
      {activeClosure ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-bold text-amber-400">
              رزرو آنلاین موقتاً بسته است
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              تا ساعت {formatEndTimeFa(activeClosure.endDate)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReopen}
            disabled={submitting}
            className="h-9 px-3 rounded-card bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {submitting ? "در حال باز کردن..." : "باز کردن رزرو"}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setIsExpanded((prev) => !prev);
              setError(null);
            }}
            className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 hover:bg-[var(--foreground)]/60 border border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-white)] transition-colors cursor-pointer"
          >
            <span>بستن موقت رزرو آنلاین</span>
            <span className="text-[11px] text-[var(--primary)]">
              {isExpanded ? "بستن منو" : "انتخاب مدت"}
            </span>
          </button>

          {isExpanded && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handlePauseForHours(1)}
                  className="h-9 rounded-card bg-[var(--foreground)]/50 hover:border-[var(--primary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  ۱ ساعت
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handlePauseForHours(3)}
                  className="h-9 rounded-card bg-[var(--foreground)]/50 hover:border-[var(--primary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  ۳ ساعت
                </button>
              </div>

              <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  placeholder="ساعت دلخواه (مثلاً ۲)"
                  disabled={submitting}
                  className="flex-1 h-9 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !customHours.trim()}
                  className="h-9 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {submitting ? "..." : "تأیید"}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {statusMsg && !error && (
        <p className="text-[11px] font-bold text-emerald-400">{statusMsg}</p>
      )}
      {error && (
        <p className="text-[11px] font-bold text-[var(--accent-red)]">{error}</p>
      )}
    </div>
  );
}
