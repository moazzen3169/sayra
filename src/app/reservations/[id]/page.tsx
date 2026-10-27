"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GamecenterDetailHeader } from "@/components/GamecenterDetailHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { AuthModal } from "@/components/AuthModal";
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

/* ---------- Small UI parts ---------- */

const STEPS: { status: ReservationStatus; label: string }[] = [
  { status: "PENDING", label: "ثبت شد" },
  { status: "CONFIRMED", label: "تایید شد" },
  { status: "IN_PROGRESS", label: "درحال انجام" },
  { status: "COMPLETED", label: "پایان" },
];

/** نمایش وضعیت؛ فقط بر اساس status دریافتی از Backend */
function StatusStepper({ status }: { status: ReservationStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <div className="flex items-start" dir="rtl">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <div key={step.status} className="flex-1 flex flex-col items-center gap-2 relative">
            {i > 0 && (
              <span
                className={`absolute top-3 right-1/2 w-full h-0.5 ${
                  i <= current ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"
                }`}
              />
            )}
            <span
              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${
                done
                  ? "bg-[var(--primary)] border-[var(--primary)] text-[#101014]"
                  : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-subtle)]"
              } ${i === current ? "shadow-[0_0_12px_rgba(255,255,61,0.35)]" : ""}`}
            >
              {done ? "✓" : toPersianDigits(i + 1)}
            </span>
            <span className={`text-[11px] ${done ? "text-[var(--text-white)] font-bold" : "text-[var(--text-subtle)]"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Countdown صرفاً نمایشی است؛ وضعیت واقعی همیشه از Backend می‌آید */
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
    <div className="rounded-card bg-[var(--primary-muted)] border border-[var(--primary)]/30 p-4 flex flex-col items-center gap-1">
      <span className="text-xs text-[var(--text-muted)]">زمان باقی‌مانده از رزرو</span>
      <span dir="ltr" className="text-3xl font-black text-[var(--primary)] tracking-wider">
        {toPersianDigits(text)}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--text-muted)] text-xs">{label}</span>
      <span className="font-bold text-[var(--text-white)] text-left">{value}</span>
    </div>
  );
}

/* ---------- Page ---------- */

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { isLoggedIn, login } = useAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [proposals, setProposals] = useState<ReservationTimeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
        if (r.status === "COMPLETED") {
          router.replace("/reservations");
          return;
        }
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
  }, [id, router, reloadToken, isLoggedIn]);

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
  const isFailedState = reservation?.status === "CANCELED" || reservation?.status === "NO_SHOW";

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <GamecenterDetailHeader
        title="جزئیات رزرو"
        location={reservation?.gamingCenterName ?? ""}
        showDetails
        onBackClick={() => router.push("/reservations")}
        onNotificationClick={() => {}}
      />

      <main className="flex-1 flex flex-col gap-4 mt-16 px-4 py-4 lg:max-w-[880px] lg:mx-auto lg:w-full lg:px-0">
        {/* Unauthenticated State */}
        {!isLoggedIn && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary)] shadow-lg">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h2 className="text-base font-black text-[var(--text-white)]">
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
                className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
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

        {/* Loading */}
        {isLoggedIn && loading && (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-40 rounded-card bg-[var(--bg-card)]" />
            <div className="h-24 rounded-card bg-[var(--bg-card)]" />
            <div className="h-48 rounded-card bg-[var(--bg-card)]" />
          </div>
        )}

        {/* Error */}
        {isLoggedIn && !loading && error && (
          <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-bold text-[var(--accent-red)]">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/reservations")}
              className="h-10 px-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold"
            >
              بازگشت به تاریخچه
            </button>
          </div>
        )}

        {isLoggedIn && !loading && !error && reservation && (
          <>
            {actionError && (
              <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
                {actionError}
              </div>
            )}

            {/* Hero */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h1 className="text-lg font-extrabold text-[var(--text-white)]">
                    {reservation.gamingCenterName ?? "گیمنت"}
                  </h1>
                  {reservation.gamingCenterAddress && (
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {reservation.gamingCenterAddress}
                    </p>
                  )}
                </div>
                <StatusBadge status={reservation.status} size="md" />
              </div>

              {isFailedState ? (
                <div className="rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 p-3 text-xs font-bold text-[var(--accent-red)] text-center">
                  {reservation.status === "CANCELED" ? "این رزرو لغو شده است." : "عدم حضور برای این رزرو ثبت شده است."}
                </div>
              ) : (
                <StatusStepper status={reservation.status} />
              )}
            </section>

            {reservation.status === "IN_PROGRESS" && <Countdown endTime={reservation.endTime} />}

            {/* Proposals */}
            {pendingProposals.map((p) => (
              <section
                key={p.id}
                className="rounded-card bg-[var(--primary-muted)] border border-[var(--primary)]/40 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--primary)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>پیشنهاد تغییر زمان از طرف گیمنت</span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">زمان فعلی</span>
                    <span className="text-[var(--text-white)] line-through opacity-70">
                      {formatDayLabel(p.originalStartTime)}، {formatClock(p.originalStartTime, true)} تا {formatClock(p.originalEndTime, true)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">زمان پیشنهادی</span>
                    <span className="font-black text-[var(--text-white)]">
                      {formatDayLabel(p.proposedStartTime)}، {formatClock(p.proposedStartTime, true)} تا {formatClock(p.proposedEndTime, true)}
                    </span>
                  </div>
                  {p.note && <p className="text-[var(--text-muted)] pt-1">{p.note}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busyProposalId !== null}
                    onClick={() => handleProposal(p.id, "accept")}
                    className="flex-1 h-11 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60 text-[#101014] font-black text-sm transition-all active:scale-[0.98]"
                  >
                    {busyProposalId === p.id ? "..." : "قبول پیشنهاد"}
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

            {/* Reservation code */}
            {reservation.reservationCode && (
              <section className="rounded-card bg-[var(--foreground)] p-4 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--text-muted)]">کد رزرو</span>
                  <span className="text-2xl font-black tracking-widest text-[var(--text-white)]">
                    {toPersianDigits(reservation.reservationCode)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="h-10 px-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--primary)]"
                >
                  {copied ? "کپی شد ✓" : "کپی کد"}
                </button>
              </section>
            )}

            {/* Details */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-3.5">
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-subtle)]">
                <div className="w-14 h-14 shrink-0 rounded-card bg-[var(--text-white)] flex items-center justify-center overflow-hidden">
                  <img
                    src={stationImageFor(reservation.stationSnapshot?.stationType)}
                    alt={reservation.stationSnapshot?.name ?? "ایستگاه"}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-extrabold text-[var(--text-white)] truncate">
                    {reservation.stationSnapshot?.name ?? "—"}
                  </span>
                  {reservation.stationSnapshot?.stationType && (
                    <span className="text-[11px] text-[var(--text-muted)]">{reservation.stationSnapshot.stationType}</span>
                  )}
                </div>
              </div>

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
                        ? "text-[var(--accent-green)]"
                        : reservation.paymentState === "FAILED"
                        ? "text-[var(--accent-red)]"
                        : "text-[var(--primary)]"
                    }
                  >
                    {getPaymentLabel(reservation.paymentState)}
                  </span>
                }
              />

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                <span className="text-sm font-bold text-[var(--text-white)]">مبلغ رزرو</span>
                <div className="flex items-baseline gap-1 text-[var(--primary)]">
                  <span className="text-xl font-black">{formatPrice(reservation.totalPrice)}</span>
                  <span className="text-xs text-[var(--text-white)]">تومان</span>
                </div>
              </div>
            </section>

            {/* Actions */}
            <section className="flex flex-col gap-3">
              {reservation.gamingCenterAddress && !isFailedState && (
                <a
                  href={mapsUrl(reservation.gamingCenterAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 w-full rounded-card bg-[var(--text-white)] text-[var(--bg-body)] text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 016 6v5" />
                  </svg>
                  <span>مسیر یابی تا گیمنت</span>
                </a>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="h-12 w-full rounded-card bg-transparent border border-[var(--accent-red)]/50 text-[var(--accent-red)] text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  لغو رزرو
                </button>
              )}
            </section>
          </>
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Cancel confirmation */}
      {isCancelConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => !isCancelling && setIsCancelConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-[var(--text-white)]">لغو رزرو</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              آیا از لغو این رزرو مطمئن هستید؟ امکان لغو و شرایط آن توسط سیستم بررسی می‌شود.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 h-12 rounded-card bg-[var(--accent-red)] disabled:opacity-60 text-[var(--text-white)] font-black text-sm active:scale-[0.98] transition-transform"
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
