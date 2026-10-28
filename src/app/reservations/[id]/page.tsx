"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GamecenterDetailHeader } from "@/components/GamecenterDetailHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { AuthModal } from "@/components/AuthModal";
import { RatingModal } from "@/components/RatingModal";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import {
  formatClock,
  formatDayLabel,
  getErrorMessage,
  getPaymentLabel,
  mapsUrl,
  stationImageFor,
} from "@/lib/reservationUi";
import { reservationService } from "@/services/reservationService";
import type { Reservation, ReservationStatus, ReservationTimeProposal } from "@/types/reservation";

/* ---------- Stepper Component ---------- */

const STEPS: { status: ReservationStatus; label: string; subLabel: string }[] = [
  { status: "PENDING", label: "ثبت رزرو", subLabel: "در انتظار تأیید" },
  { status: "CONFIRMED", label: "تأیید گیمنت", subLabel: "تأیید شده" },
  { status: "IN_PROGRESS", label: "شروع رزرو", subLabel: "درحال انجام" },
  { status: "COMPLETED", label: "پایان رزرو", subLabel: "تکمیل شده" },
];

function StatusStepper({ status }: { status: ReservationStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-between relative" dir="rtl">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <React.Fragment key={step.status}>
              {/* Connector Line */}
              {i > 0 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${
                    i <= currentIndex ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"
                  }`}
                />
              )}

              {/* Step Circle */}
              <div className="flex flex-col items-center relative z-10 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCurrent
                      ? "bg-[var(--primary)] text-on-primary ring-4 ring-[var(--primary)]/25 scale-110 shadow-md"
                      : isDone
                      ? "bg-[var(--primary)] text-on-primary"
                      : "bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-subtle)]"
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    toPersianDigits(i + 1)
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Labels */}
      <div className="grid grid-cols-4 text-center text-xs gap-1" dir="rtl">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIndex;
          const isDone = i < currentIndex;
          return (
            <div key={step.status} className="flex flex-col items-center">
              <span
                className={`font-bold ${
                  isCurrent
                    ? "text-[var(--primary)]"
                    : isDone
                    ? "text-[var(--text-white)]"
                    : "text-[var(--text-subtle)]"
                }`}
              >
                {step.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {step.subLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Terminal Status Card (CANCELED / NO_SHOW) ---------- */

function TerminalStatusCard({ status }: { status: "CANCELED" | "NO_SHOW" }) {
  const isCanceled = status === "CANCELED";
  return (
    <div
      className={`rounded-card p-4 flex items-center gap-3.5 border ${
        isCanceled
          ? "bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)]"
          : "bg-[var(--foreground)]/40 border-[var(--border-color)] text-[var(--text-muted)]"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-current/15 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isCanceled ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          )}
        </svg>
      </div>
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-bold text-[var(--text-white)]">
          {isCanceled ? "رزرو لغو شده است" : "عدم حضور ثبت شده است"}
        </h4>
        <p className="text-xs opacity-90 leading-relaxed">
          {isCanceled
            ? "این رزرو لغو شده و دیگر فعال نمی‌باشد."
            : "عدم حضور شما در زمان تعیین‌شده توسط گیمنت ثبت گردیده است."}
        </p>
      </div>
    </div>
  );
}

/* ---------- Countdown Timer Component ---------- */

function Countdown({ endTime }: { endTime: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const total = Math.max(0, Math.floor((new Date(endTime).getTime() - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

  return (
    <div className="rounded-card bg-[var(--primary-muted)] border border-[var(--primary)]/30 p-4 flex flex-col items-center gap-1 shadow-inner">
      <span className="text-xs text-[var(--text-muted)]">زمان باقی‌مانده از رزرو</span>
      <span dir="ltr" className="text-3xl font-black text-[var(--primary)] tracking-widest font-mono">
        {toPersianDigits(text)}
      </span>
    </div>
  );
}

/* ---------- Responsive InfoRow Component ---------- */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm min-w-0 py-1 border-b border-[var(--border-subtle)]/50 last:border-b-0">
      <span className="text-[var(--text-muted)] text-xs shrink-0">{label}</span>
      <div className="font-bold text-[var(--text-white)] text-left min-w-0 break-words flex-1 flex justify-end">
        {value}
      </div>
    </div>
  );
}

/* ---------- Reservation Detail Page ---------- */

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { isLoggedIn, login } = useAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [proposals, setProposals] = useState<ReservationTimeProposal[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    reservationService
      .get(id, controller.signal)
      .then(async (r) => {
        if (!active) return;
        setReservation(r);
        setError(null);
        try {
          const props = await reservationService.listProposals(id, controller.signal);
          if (active) setProposals(props);
        } catch {
          if (active) setProposals([]);
        }
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, reloadToken, isLoggedIn]);

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    setActionError(null);
    try {
      await reservationService.cancel(id);
      setIsCancelConfirmOpen(false);
      setReloadToken((v) => v + 1);
    } catch (e) {
      setActionError(getErrorMessage(e));
      setIsCancelConfirmOpen(false);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleProposal = async (proposalId: string, action: "accept" | "reject") => {
    if (busyProposalId) return;
    setBusyProposalId(proposalId);
    setActionError(null);
    try {
      if (action === "accept") await reservationService.acceptProposal(id, proposalId);
      else await reservationService.rejectProposal(id, proposalId);
      setReloadToken((v) => v + 1);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setBusyProposalId(null);
    }
  };

  const handleCopyCode = async () => {
    if (!reservation?.reservationCode) return;
    try {
      await navigator.clipboard.writeText(reservation.reservationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleAuthSuccess = (fullName: string, phone: string, token?: string) => {
    login(fullName, phone, token);
    setIsAuthModalOpen(false);
  };

  const pendingProposals = proposals.filter((p) => p.status === "PENDING");
  const canCancel = reservation?.status === "PENDING" || reservation?.status === "CONFIRMED";
  const isTerminalState = reservation?.status === "CANCELED" || reservation?.status === "NO_SHOW";
  const showRate = reservation?.status === "COMPLETED" && reservation.canRate !== false && reservation.isRated !== true;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <GamecenterDetailHeader
        title="جزئیات رزرو"
        location={reservation?.gamingCenterName ?? ""}
        showDetails
        onBackClick={() => router.push("/reservations")}
        onNotificationClick={() => {}}
      />

      <main className="flex-1 flex flex-col gap-4 mt-16 px-4 py-4 max-w-[780px] desk:max-w-[880px] mx-auto w-full">
        {/* Unauthenticated State */}
        {!isLoggedIn && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary)] shadow-lg">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h2 className="text-base font-bold text-[var(--text-white)]">
                مشاهده جزییات رزرو نیازمند ورود است
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                برای دسترسی به اطلاعات کامل این رزرو و مدیریت آن، ابتدا وارد حساب کاربری شوید.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
              >
                <span>ورود / ثبت‌نام در حساب کاربری</span>
                <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => router.push("/reservations")}
                className="h-10 w-full rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-white)]"
              >
                بازگشت به تاریخچه رزروها
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoggedIn && loading && (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-44 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]" />
            <div className="h-28 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]" />
            <div className="h-52 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]" />
          </div>
        )}

        {/* Error State */}
        {isLoggedIn && !loading && error && (
          <div className="p-5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-bold text-[var(--accent-red)]">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/reservations")}
              className="h-10 px-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-white)]"
            >
              بازگشت به تاریخچه رزروها
            </button>
          </div>
        )}

        {/* Content */}
        {isLoggedIn && !loading && !error && reservation && (
          <>
            {actionError && (
              <div className="p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold text-center">
                {actionError}
              </div>
            )}

            {/* Top Unified Card: Center Info, Reservation Code, Status Badge, Stepper / Terminal Card */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 desk:p-5 flex flex-col gap-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 min-w-0">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <h1 className="text-lg font-bold text-[var(--text-white)] break-words leading-tight">
                    {reservation.gamingCenterName ?? "گیمنت"}
                  </h1>
                  {reservation.gamingCenterAddress && (
                    <p className="text-xs text-[var(--text-muted)] break-words leading-relaxed">
                      {reservation.gamingCenterAddress}
                    </p>
                  )}
                </div>
                <StatusBadge status={reservation.status} size="md" />
              </div>

              {/* Reservation Code integrated here cleanly */}
              {reservation.reservationCode && (
                <div className="flex items-center justify-between gap-3 bg-[var(--foreground)]/40 border border-[var(--border-subtle)] rounded-child p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)]">کد رزرو:</span>
                    <span className="text-base font-black tracking-wider text-[var(--text-white)] font-mono">
                      {toPersianDigits(reservation.reservationCode)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="h-8 px-3 rounded-child bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--primary)] hover:bg-[var(--foreground)]/50 transition-colors"
                  >
                    {copied ? "کپی شد ✓" : "کپی کد"}
                  </button>
                </div>
              )}

              <div className="h-[1px] w-full bg-[var(--border-subtle)]" />

              {/* Status Section: Stepper for Active or Terminal Status Card */}
              {isTerminalState ? (
                <TerminalStatusCard status={reservation.status as "CANCELED" | "NO_SHOW"} />
              ) : (
                <StatusStepper status={reservation.status} />
              )}
            </section>

            {/* Countdown timer when in progress */}
            {reservation.status === "IN_PROGRESS" && <Countdown endTime={reservation.endTime} />}

            {/* Time proposals from Gaming Center */}
            {pendingProposals.map((p) => (
              <section
                key={p.id}
                className="rounded-card bg-[var(--primary-muted)] border border-[var(--primary)]/40 p-4 flex flex-col gap-3.5"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>پیشنهاد تغییر زمان از طرف گیمنت</span>
                </div>

                <div className="flex flex-col gap-2 text-xs bg-[var(--bg-body)]/60 rounded-child p-3 border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text-muted)] shrink-0">زمان فعلی:</span>
                    <span className="text-[var(--text-white)] line-through opacity-70 text-left min-w-0 break-words">
                      {formatDayLabel(p.originalStartTime)}، {formatClock(p.originalStartTime, true)} تا {formatClock(p.originalEndTime, true)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text-muted)] shrink-0">زمان پیشنهادی:</span>
                    <span className="font-bold text-[var(--primary)] text-left min-w-0 break-words">
                      {formatDayLabel(p.proposedStartTime)}، {formatClock(p.proposedStartTime, true)} تا {formatClock(p.proposedEndTime, true)}
                    </span>
                  </div>
                  {p.note && <p className="text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">{p.note}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busyProposalId !== null}
                    onClick={() => handleProposal(p.id, "accept")}
                    className="flex-1 h-11 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60 text-on-primary font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    {busyProposalId === p.id ? "در حال ثبت..." : "قبول پیشنهاد"}
                  </button>
                  <button
                    type="button"
                    disabled={busyProposalId !== null}
                    onClick={() => handleProposal(p.id, "reject")}
                    className="flex-1 h-11 rounded-card bg-[var(--foreground)] disabled:opacity-60 text-[var(--text-white)] font-bold text-sm"
                  >
                    رد پیشنهاد
                  </button>
                </div>
              </section>
            ))}

            {/* Reservation Details Card */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 desk:p-5 flex flex-col gap-4 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--text-white)] pb-2 border-b border-[var(--border-subtle)]">
                اطلاعات دستگاه و زمان رزرو
              </h2>

              {/* Station Info Header */}
              <div className="flex items-center gap-3.5 min-w-0 pb-2">
                <div className="w-14 h-14 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={stationImageFor(reservation.stationSnapshot?.stationType)}
                    alt={reservation.stationSnapshot?.name ?? "ایستگاه"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-base font-bold text-[var(--text-white)] break-words">
                    {reservation.stationSnapshot?.name ?? "—"}
                  </span>
                  {reservation.stationSnapshot?.stationType && (
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      دستگاه: {reservation.stationSnapshot.stationType}
                    </span>
                  )}
                </div>
              </div>

              {/* Rows */}
              <div className="flex flex-col gap-2">
                <InfoRow label="روز رزرو" value={formatDayLabel(reservation.startTime)} />
                <InfoRow label="ساعت شروع" value={formatClock(reservation.startTime, true)} />
                <InfoRow label="ساعت پایان" value={formatClock(reservation.endTime, true)} />
                <InfoRow label="مدت زمان" value={`${toPersianDigits(reservation.totalHours)} ساعت`} />
                <InfoRow
                  label="وضعیت پرداخت"
                  value={
                    <span
                      className={
                        reservation.paymentState === "PAID"
                          ? "text-[var(--accent-green)] font-extrabold"
                          : reservation.paymentState === "FAILED"
                          ? "text-[var(--accent-red)] font-extrabold"
                          : "text-[var(--primary)] font-extrabold"
                      }
                    >
                      {getPaymentLabel(reservation.paymentState)}
                    </span>
                  }
                />
              </div>

              {/* Price Breakdown */}
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-body)]/40 p-3 rounded-child">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--text-muted)]">مبلغ کل پرداختی</span>
                  <span className="text-xs text-[var(--text-subtle)]">ثبت‌شده در سیستم</span>
                </div>
                <div className="flex items-baseline gap-1 text-[var(--primary)]">
                  <span className="text-xl font-black">{formatPrice(reservation.totalPrice)}</span>
                  <span className="text-xs text-[var(--text-white)]">تومان</span>
                </div>
              </div>
            </section>

            {/* Actions Section */}
            <section className="flex flex-col gap-3">
              {reservation.gamingCenterAddress && !isTerminalState && (
                <a
                  href={mapsUrl(reservation.gamingCenterAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 w-full rounded-card bg-[var(--text-white)] text-[var(--bg-body)] text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 016 6v5" />
                  </svg>
                  <span>مسیریابی تا گیمنت</span>
                </a>
              )}

              {showRate && (
                <button
                  type="button"
                  onClick={() => setIsRatingModalOpen(true)}
                  className="h-12 w-full rounded-card bg-[var(--accent-star)] text-on-primary text-sm font-bold active:scale-[0.98] transition-all shadow-md"
                >
                  ثبت و افزودن نظر برای این رزرو
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="h-12 w-full rounded-card bg-transparent border border-[var(--accent-red)]/50 hover:bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-sm font-bold active:scale-[0.98] transition-all"
                >
                  لغو رزرو
                </button>
              )}
            </section>
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={isRatingModalOpen}
        reservationId={reservation?.id ?? null}
        onClose={() => setIsRatingModalOpen(false)}
        onSuccess={() => {
          setIsRatingModalOpen(false);
          setReloadToken((v) => v + 1);
        }}
      />

      {/* Cancel Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => !isCancelling && setIsCancelConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--text-white)]">لغو رزرو</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              آیا از لغو این رزرو مطمئن هستید؟ امکان لغو و شرایط آن توسط سیستم بررسی می‌شود.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 h-12 rounded-card bg-[var(--accent-red)] disabled:opacity-60 text-[var(--text-white)] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                {isCancelling ? "در حال لغو..." : "بله، لغو شود"}
              </button>
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                disabled={isCancelling}
                className="flex-1 h-12 rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-sm"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
