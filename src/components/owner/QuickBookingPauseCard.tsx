"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setIsModalOpen(false);
      setCustomHours("");
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
    try {
      await ownerService.deleteClosure(centerId, activeClosure.id);
      setActiveClosure(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {activeClosure ? (
        <div className="h-full rounded-card bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Icon name="clock" size={20} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-bold text-amber-400 truncate">
                رزرو موقتاً بسته است
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                تا ساعت {formatEndTimeFa(activeClosure.endDate)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReopen}
            disabled={submitting}
            className="h-8 px-3 rounded-card bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {submitting ? "..." : "باز کردن"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="w-full h-full rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] p-3 flex items-center justify-between gap-3 text-right transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--foreground)]/50 text-[var(--text-muted)] flex items-center justify-center shrink-0">
              <Icon name="clock" size={20} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-bold text-[var(--text-white)] truncate">
                بستن موقت رزرو آنلاین
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                توقف ساعتی پذیرش
              </span>
            </div>
          </div>
          <Icon name="arrow-left" size={16} className="text-[var(--text-muted)] shrink-0" />
        </button>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => !submitting && setIsModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-booking-title"
            className="w-full max-w-[380px] rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Icon name="clock" size={18} className="text-[var(--primary)]" />
                <h3 id="pause-booking-title" className="text-sm font-bold text-[var(--text-white)]">
                  بستن موقت رزرو آنلاین
                </h3>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                aria-label="بستن"
                className="p-1 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              در این بازه مشتریان امکان ثبت رزرو جدید نخواهند داشت. هر زمان بخواهید می‌توانید دوباره رزرو را باز کنید.
            </p>

            {error && (
              <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handlePauseForHours(1)}
                className="h-11 rounded-card bg-[var(--foreground)]/50 hover:border-[var(--primary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                ۱ ساعت
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handlePauseForHours(3)}
                className="h-11 rounded-card bg-[var(--foreground)]/50 hover:border-[var(--primary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
                className="flex-1 h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !customHours.trim()}
                className="h-11 px-5 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {submitting ? "..." : "تأیید"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
