"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { generateDays, type DateOption } from "@/lib/dates";
import { formatPrice, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { formatReservationWhen, getErrorMessage, getPaymentLabel } from "@/lib/reservationUi";
import { generateHourlySlots, type TimeSlotOption } from "@/lib/slots";
import { ownerService } from "@/services/ownerService";
import type { OwnerReservation } from "@/types/owner";
import type { ReservationStatus } from "@/types/reservation";

const FILTERS: { id: "ALL" | ReservationStatus; label: string }[] = [
  { id: "ALL", label: "همه" },
  { id: "PENDING", label: "در انتظار" },
  { id: "CONFIRMED", label: "تایید شده" },
  { id: "IN_PROGRESS", label: "در حال انجام" },
  { id: "COMPLETED", label: "تکمیل شده" },
  { id: "CANCELED", label: "لغو شده" },
];

type SessionAction = "start" | "stop" | "pause" | "resume";

function Content() {
  const params = useSearchParams();
  const { centerId } = useOwner();

  const [items, setItems] = useState<OwnerReservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ReservationStatus>("ALL");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [reloadToken, setReloadToken] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [proposeFor, setProposeFor] = useState<OwnerReservation | null>(null);
  const [pDateId, setPDateId] = useState<string>("day-0");
  const [selectedSlotHours, setSelectedSlotHours] = useState<number[]>([]);
  const [pNote, setPNote] = useState("");
  const [proposing, setProposing] = useState(false);

  const availableDays = useMemo(() => generateDays(10), []);
  const hourlySlots = useMemo(() => generateHourlySlots(), []);

  // Fetch reservations with server-side status filtering and OpenAPI pagination envelope support
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    ownerService
      .listReservationsPaginated(centerId, {
        page: 1,
        pageSize: 100,
        status: filter !== "ALL" ? filter : undefined,
        signal: controller.signal,
      })
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setItems([]);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, filter, reloadToken]);

  const visible = useMemo(() => {
    const rawQ = query.trim().toLowerCase();
    const normQ = toEnglishDigits(rawQ);
    if (!rawQ && !normQ) {
      return (items ?? []).filter((r) => filter === "ALL" || r.status === filter);
    }
    return (items ?? []).filter((r) => {
      const codeMatch =
        r.reservationCode &&
        (toEnglishDigits(r.reservationCode).toLowerCase().includes(normQ) ||
          r.reservationCode.toLowerCase().includes(rawQ));

      const hay = [
        r.id,
        r.customer?.phone,
        r.customer?.fullName,
        r.customerPhone,
        r.customerName,
        r.stationSnapshot?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const textMatch = hay.includes(rawQ) || (normQ ? hay.includes(normQ) : false);

      const isMatch = codeMatch || textMatch;
      if (!isMatch) return false;

      // If user typed exact or partial code, prioritize showing match regardless of filter
      if (codeMatch) return true;

      return filter === "ALL" || r.status === filter;
    });
  }, [items, filter, query]);

  const updateStatus = useCallback(
    async (r: OwnerReservation, newStatus: ReservationStatus) => {
      if (busyId) return;
      setBusyId(r.id);
      setActionError(null);
      try {
        await ownerService.updateReservationStatus(centerId, r.id, newStatus);
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, centerId]
  );

  const runSession = useCallback(
    async (r: OwnerReservation, action: SessionAction) => {
      if (busyId) return;
      setBusyId(r.id);
      setActionError(null);
      try {
        await ownerService.session(centerId, r.id, action);
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, centerId]
  );

  // Calculate required slot hours count to enforce reservation duration consistency (Part D)
  const targetDurationHours = useMemo(() => {
    if (!proposeFor) return 1;
    if (proposeFor.totalHours && proposeFor.totalHours > 0) {
      return Math.round(proposeFor.totalHours);
    }
    const start = new Date(proposeFor.startTime).getTime();
    const end = new Date(proposeFor.endTime).getTime();
    const diff = Math.round((end - start) / 3_600_000);
    return diff > 0 ? diff : 1;
  }, [proposeFor]);

  const toggleSlotHour = (hour: number) => {
    // When duration is strictly fixed, selecting a slot sets consecutive hours starting at that hour
    if (targetDurationHours > 1) {
      const consecutive: number[] = [];
      for (let i = 0; i < targetDurationHours; i++) {
        consecutive.push(hour + i);
      }
      setSelectedSlotHours(consecutive);
      return;
    }

    setSelectedSlotHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [hour]
    );
  };

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeFor || proposing || selectedSlotHours.length === 0) return;
    const selectedDay = availableDays.find((d) => d.id === pDateId) ?? availableDays[0];
    const minHour = Math.min(...selectedSlotHours);
    const maxHour = Math.max(...selectedSlotHours) + 1;

    // Use exact application timezone (Asia/Tehran +03:30) to avoid timezone shift
    const pad = (n: number) => String(n).padStart(2, "0");
    const startTime = new Date(`${selectedDay.fullDate}T${pad(minHour)}:00:00+03:30`).toISOString();
    const endTime = new Date(`${selectedDay.fullDate}T${pad(maxHour)}:00:00+03:30`).toISOString();

    setProposing(true);
    setActionError(null);
    try {
      await ownerService.proposeTime(centerId, proposeFor.id, {
        startTime,
        endTime,
        ...(pNote.trim() ? { note: pNote.trim() } : {}),
      });
      setProposeFor(null);
      setSelectedSlotHours([]);
      setPNote("");
      setReloadToken((v) => v + 1);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setProposing(false);
    }
  };

  const btn = "h-10 px-4 rounded-card text-xs font-bold disabled:opacity-50";

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="رزروها" />

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی کد رزرو، نام یا شماره مشتری"
          className="h-12 rounded-card bg-[var(--foreground)]/60 px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--text-muted)]"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                filter === f.id
                  ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
            {actionError}
          </div>
        )}

        {items === null && <div className="h-32 rounded-card bg-[var(--bg-card)] animate-pulse" />}

        {error && (
          <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-center text-sm font-bold text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {items && !error && visible.length === 0 && (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">رزروی پیدا نشد.</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((r) => {
            const customerName = r.customer?.fullName ?? r.customerName;
            const customerPhone = r.customer?.phone ?? r.customerPhone;
            const busy = busyId === r.id;
            return (
              <article key={r.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold truncate">{r.stationSnapshot?.name ?? "ایستگاه"}</h3>
                    <StatusBadge status={r.status} />
                  </div>

                  <p className="text-xs font-bold">{formatReservationWhen(r.startTime, r.endTime)}</p>

                  {(customerName || customerPhone) && (
                    <p className="text-xs text-[var(--text-muted)]">
                      مشتری: {customerName ?? ""} {customerPhone ? `(${toPersianDigits(customerPhone)})` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-1 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {r.reservationCode ? `کد: ${toPersianDigits(r.reservationCode)} • ` : ""}
                      {getPaymentLabel(r.paymentState)}
                    </span>
                    <span className="font-black text-[var(--primary)]">{formatPrice(r.totalPrice)} تومان</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateStatus(r, "CONFIRMED")}
                          className={`${btn} bg-[var(--primary)] text-on-primary hover:opacity-90`}
                        >
                          تایید رزرو
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateStatus(r, "CANCELED")}
                          className={`${btn} bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25`}
                        >
                          لغو رزرو
                        </button>
                      </>
                    )}

                    {r.status === "CONFIRMED" && (
                      <>
                        <button type="button" disabled={busy} onClick={() => runSession(r, "start")} className={`${btn} bg-[var(--primary)] text-on-primary`}>
                          شروع سانس
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateStatus(r, "CANCELED")}
                          className={`${btn} bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25`}
                        >
                          لغو رزرو
                        </button>
                      </>
                    )}

                    {r.status === "IN_PROGRESS" && (
                      <>
                        <button type="button" disabled={busy} onClick={() => runSession(r, "pause")} className={`${btn} bg-[var(--foreground)]`}>
                          توقف موقت
                        </button>
                        <button type="button" disabled={busy} onClick={() => runSession(r, "resume")} className={`${btn} bg-[var(--foreground)]`}>
                          ادامه
                        </button>
                        <button type="button" disabled={busy} onClick={() => runSession(r, "stop")} className={`${btn} bg-[var(--accent-red)] text-[var(--text-white)]`}>
                          پایان سانس
                        </button>
                      </>
                    )}

                    {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                      <button type="button" onClick={() => setProposeFor(r)} className={`${btn} border border-[var(--border-color)] hover:border-[var(--primary)]`}>
                        پیشنهاد زمان جدید
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {proposeFor && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !proposing && setProposeFor(null)}
        >
          <form
            onSubmit={submitProposal}
            className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-white)]">پیشنهاد تاریخ یا ساعت جدید</h3>
              <p className="text-xs text-[var(--text-muted)]">
                رزرو {proposeFor.stationSnapshot?.name ?? "دستگاه"} ({toPersianDigits(proposeFor.reservationCode || proposeFor.id)})
              </p>
            </div>

            {/* Step 1: Pick Date */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-white)]">۱. روز پیشنهادی را انتخاب کنید</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableDays.map((d) => {
                  const active = d.id === pDateId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPDateId(d.id)}
                      className={`shrink-0 w-[84px] h-16 rounded-card flex flex-col items-center justify-center gap-0.5 border transition-all ${
                        active
                          ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                          : "bg-[var(--foreground)]/40 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                      }`}
                    >
                      <span className="text-xs font-bold">{d.dayName}</span>
                      <span className={`text-[11px] ${active ? "font-bold opacity-80" : "text-[var(--text-muted)]"}`}>
                        {d.dateStr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Pick Slot(s) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-white)]">۲. ساعت‌های مورد نظر را انتخاب کنید</label>
                {selectedSlotHours.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSlotHours([])}
                    className="text-[11px] text-[var(--text-muted)] hover:underline"
                  >
                    پاک کردن انتخاب
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-[var(--border-subtle)] rounded-card bg-[var(--foreground)]/20">
                {hourlySlots.map((s) => {
                  const active = selectedSlotHours.includes(s.startHour);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSlotHour(s.startHour)}
                      className={`h-11 rounded-card border text-xs font-bold transition-all ${
                        active
                          ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                          : "bg-[var(--foreground)]/40 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--primary)]/60"
                      }`}
                    >
                      {s.timeLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">توضیح به مشتری (اختیاری)</label>
              <textarea
                value={pNote}
                onChange={(e) => setPNote(e.target.value)}
                rows={2}
                placeholder="علت تغییر زمان یا توضیحات تکمیلی..."
                className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="submit"
                disabled={proposing || selectedSlotHours.length === 0}
                className="flex-1 h-11 rounded-card bg-[var(--primary)] text-on-primary font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {proposing ? "در حال ارسال..." : "ارسال پیشنهاد جدید"}
              </button>
              <button
                type="button"
                onClick={() => setProposeFor(null)}
                className="h-11 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function OwnerReservationsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}