"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatReservationWhen, getErrorMessage, getPaymentLabel } from "@/lib/reservationUi";
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
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [pNote, setPNote] = useState("");
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    ownerService
      .listReservations(centerId, controller.signal)
      .then((data) => {
        if (!active) return;
        setItems(data);
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
  }, [centerId, reloadToken]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((r) => {
      if (filter !== "ALL" && r.status !== filter) return false;
      if (!q) return true;
      const hay = [
        r.reservationCode,
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
      return hay.includes(q);
    });
  }, [items, filter, query]);

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

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeFor || proposing || !pStart || !pEnd) return;
    setProposing(true);
    setActionError(null);
    try {
      // datetime-local بر اساس ساعت دستگاه است؛ تایم‌زون نهایی را Backend تأیید کند
      await ownerService.proposeTime(centerId, proposeFor.id, {
        startTime: new Date(pStart).toISOString(),
        endTime: new Date(pEnd).toISOString(),
        ...(pNote.trim() ? { note: pNote.trim() } : {}),
      });
      setProposeFor(null);
      setPStart("");
      setPEnd("");
      setPNote("");
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

      <main className="flex-1 mt-16 px-4 desk:px-6 lg:px-8 py-4 flex flex-col gap-4">
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
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                filter === f.id
                  ? "bg-[var(--primary)] text-[#101014] border-[var(--primary)]"
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

        {visible.map((r) => {
          const customerName = r.customer?.fullName ?? r.customerName;
          const customerPhone = r.customer?.phone ?? r.customerPhone;
          const busy = busyId === r.id;
          return (
            <article key={r.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold truncate">{r.stationSnapshot?.name ?? "ایستگاه"}</h3>
                <StatusBadge status={r.status} />
              </div>

              <p className="text-xs font-bold">{formatReservationWhen(r.startTime, r.endTime)}</p>

              {(customerName || customerPhone) && (
                <p className="text-xs text-[var(--text-muted)]">
                  مشتری: {customerName ?? ""} {customerPhone ? `(${toPersianDigits(customerPhone)})` : ""}
                </p>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  {r.reservationCode ? `کد: ${toPersianDigits(r.reservationCode)} • ` : ""}
                  {getPaymentLabel(r.paymentState)}
                </span>
                <span className="font-black text-[var(--primary)]">{formatPrice(r.totalPrice)} تومان</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {r.status === "CONFIRMED" && (
                  <button type="button" disabled={busy} onClick={() => runSession(r, "start")} className={`${btn} bg-[var(--primary)] text-[#101014]`}>
                    شروع سانس
                  </button>
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
                  <button type="button" onClick={() => setProposeFor(r)} className={`${btn} border border-[var(--border-color)]`}>
                    پیشنهاد زمان جدید
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </main>

      {proposeFor && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !proposing && setProposeFor(null)}
        >
          <form
            onSubmit={submitProposal}
            className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black">پیشنهاد زمان جدید</h3>
            <label className="text-xs font-bold">شروع</label>
            <input type="datetime-local" required value={pStart} onChange={(e) => setPStart(e.target.value)} dir="ltr" className="h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm outline-none" />
            <label className="text-xs font-bold">پایان</label>
            <input type="datetime-local" required value={pEnd} onChange={(e) => setPEnd(e.target.value)} dir="ltr" className="h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm outline-none" />
            <textarea value={pNote} onChange={(e) => setPNote(e.target.value)} rows={2} placeholder="توضیح (اختیاری)" className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] p-3 text-sm outline-none resize-none" />
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={proposing} className="flex-1 h-11 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm disabled:opacity-60">
                {proposing ? "در حال ارسال..." : "ارسال پیشنهاد"}
              </button>
              <button type="button" onClick={() => setProposeFor(null)} className="h-11 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold">
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