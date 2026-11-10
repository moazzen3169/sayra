"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { OwnerGroupReservationCard } from "@/components/owner/OwnerGroupReservationCard";
import { GroupDetailsModal } from "@/components/owner/GroupDetailsModal";
import { GroupConfirmModal } from "@/components/owner/GroupConfirmModal";
import { GroupCancelModal } from "@/components/owner/GroupCancelModal";
import { GroupProposeTimeModal } from "@/components/owner/GroupProposeTimeModal";
import { StatusBadge } from "@/components/StatusBadge";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toEnglishDigits, toPersianDigits } from "@/lib/format";
import { formatReservationWhen, getErrorMessage, getPaymentLabel } from "@/lib/reservationUi";
import {
  groupOwnerReservations,
  type OwnerBookingEntry,
  type OwnerGroupBookingItem,
} from "@/lib/ownerGroupReservationGrouping";
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
  const { centerId, center } = useOwner();

  const [items, setItems] = useState<OwnerReservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ReservationStatus>("ALL");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [reloadToken, setReloadToken] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Group and Single Action Modals State
  const [detailsTarget, setDetailsTarget] = useState<OwnerBookingEntry | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<OwnerBookingEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OwnerBookingEntry | null>(null);
  const [proposeTarget, setProposeTarget] = useState<OwnerBookingEntry | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

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

  // Group raw reservations into aggregated Group Bookings and Single Bookings
  const groupedEntries = useMemo<OwnerBookingEntry[]>(() => {
    return groupOwnerReservations(items ?? []);
  }, [items]);

  const visibleEntries = useMemo(() => {
    const rawQ = query.trim().toLowerCase();
    const normQ = toEnglishDigits(rawQ);

    return groupedEntries.filter((entry) => {
      const entryStatus = entry.isGroup ? entry.status : entry.reservation.status;
      // 1. Filter match
      const statusMatch = filter === "ALL" || entryStatus === filter;

      // 2. Query search match
      if (!rawQ && !normQ) {
        return statusMatch;
      }

      if (entry.isGroup) {
        const codeMatch =
          entry.reservationCode &&
          (toEnglishDigits(entry.reservationCode).toLowerCase().includes(normQ) ||
            entry.reservationCode.toLowerCase().includes(rawQ));

        const hay = [
          entry.groupBookingId,
          entry.customerPhone,
          entry.customerName,
          ...entry.devices.map((d) => d.stationName),
          ...entry.reservations.map((r) => r.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const textMatch = hay.includes(rawQ) || (normQ ? hay.includes(normQ) : false);
        const matches = Boolean(codeMatch || textMatch);
        if (!matches) return false;
        if (codeMatch) return true;
        return statusMatch;
      } else {
        const r = entry.reservation;
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
        const matches = Boolean(codeMatch || textMatch);
        if (!matches) return false;
        if (codeMatch) return true;
        return statusMatch;
      }
    });
  }, [groupedEntries, filter, query]);

  // Execute group or single confirmation
  const handleConfirmAction = useCallback(async () => {
    if (!confirmTarget || modalBusy) return;
    setModalBusy(true);
    setActionError(null);
    try {
      if (confirmTarget.isGroup) {
        // Confirm all child reservations in the group
        for (const res of confirmTarget.reservations) {
          if (res.status === "PENDING") {
            await ownerService.confirmReservation(centerId, res.id);
          }
        }
      } else {
        await ownerService.confirmReservation(centerId, confirmTarget.reservation.id);
      }
      setConfirmTarget(null);
      setReloadToken((v) => v + 1);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setModalBusy(false);
    }
  }, [confirmTarget, modalBusy, centerId]);

  // Execute group or single cancellation
  const handleCancelAction = useCallback(
    async (reason?: string) => {
      if (!cancelTarget || modalBusy) return;
      setModalBusy(true);
      setActionError(null);
      try {
        if (cancelTarget.isGroup) {
          // Cancel all child reservations in the group
          for (const res of cancelTarget.reservations) {
            if (res.status !== "CANCELED") {
              await ownerService.cancelReservation(centerId, res.id, reason);
            }
          }
        } else {
          await ownerService.cancelReservation(centerId, cancelTarget.reservation.id, reason);
        }
        setCancelTarget(null);
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setModalBusy(false);
      }
    },
    [cancelTarget, modalBusy, centerId]
  );

  // Execute group or single time proposal
  const handleProposeTimeAction = useCallback(
    async (startTime: string, endTime: string, note?: string) => {
      if (!proposeTarget || modalBusy) return;
      setModalBusy(true);
      setActionError(null);
      try {
        if (proposeTarget.isGroup) {
          // Propose synchronized time across all child reservations in the group
          for (const res of proposeTarget.reservations) {
            await ownerService.proposeTime(centerId, res.id, {
              startTime,
              endTime,
              note,
            });
          }
        } else {
          await ownerService.proposeTime(centerId, proposeTarget.reservation.id, {
            startTime,
            endTime,
            note,
          });
        }
        setProposeTarget(null);
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setModalBusy(false);
      }
    },
    [proposeTarget, modalBusy, centerId]
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

  const btn = "h-9 px-3.5 rounded-card text-xs font-bold disabled:opacity-50 transition-all";

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
              className={`shrink-0 px-4 py-3 rounded-card text-xs font-bold border transition-colors ${
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

        {items && !error && visibleEntries.length === 0 && (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">رزروی پیدا نشد.</p>
        )}

        {/*
          Display exactly 1 card per row:
          Using grid-cols-1 or flex flex-col so that each card takes the full row.
        */}
        <div className="flex flex-col gap-4">
          {visibleEntries.map((entry) => {
            if (entry.isGroup) {
              const isBusy = modalBusy && (
                confirmTarget === entry ||
                cancelTarget === entry ||
                proposeTarget === entry
              );

              return (
                <OwnerGroupReservationCard
                  key={`group-${entry.groupBookingId}`}
                  groupBooking={entry}
                  busy={isBusy}
                  onConfirm={() => setConfirmTarget(entry)}
                  onCancel={() => setCancelTarget(entry)}
                  onProposeTime={() => setProposeTarget(entry)}
                  onViewDetails={() => setDetailsTarget(entry)}
                />
              );
            }

            const r = entry.reservation;
            const customerName = r.customer?.fullName ?? r.customerName;
            const customerPhone = r.customer?.phone ?? r.customerPhone;
            const busy = busyId === r.id;

            return (
              <article
                key={`single-${r.id}`}
                className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col justify-between gap-3 transition-all duration-200 hover:border-[var(--border-color)]"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold truncate">
                      {r.stationSnapshot?.name ?? "ایستگاه"}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>

                  <p className="text-xs font-bold">
                    {formatReservationWhen(r.startTime, r.endTime)}
                  </p>

                  {(customerName || customerPhone) && (
                    <p className="text-xs text-[var(--text-muted)]">
                      مشتری: {customerName ?? ""}{" "}
                      {customerPhone ? `(${toPersianDigits(customerPhone)})` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-1 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {r.reservationCode ? `کد: ${toPersianDigits(r.reservationCode)} • ` : ""}
                      {getPaymentLabel(r.paymentState)}
                    </span>
                    <span className="font-black text-[var(--primary)]">
                      {formatPrice(r.totalPrice)} تومان
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {r.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmTarget(entry)}
                            className={`${btn} bg-[var(--primary)] text-on-primary hover:opacity-90`}
                          >
                            تایید رزرو
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setCancelTarget(entry)}
                            className={`${btn} bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25`}
                          >
                            لغو رزرو
                          </button>
                        </>
                      )}

                      {r.status === "CONFIRMED" && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => runSession(r, "start")}
                            className={`${btn} bg-[var(--primary)] text-on-primary`}
                          >
                            شروع سانس
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setCancelTarget(entry)}
                            className={`${btn} bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25`}
                          >
                            لغو رزرو
                          </button>
                        </>
                      )}

                      {r.status === "IN_PROGRESS" && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => runSession(r, "pause")}
                            className={`${btn} bg-[var(--foreground)]`}
                          >
                            توقف موقت
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => runSession(r, "resume")}
                            className={`${btn} bg-[var(--foreground)]`}
                          >
                            ادامه
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => runSession(r, "stop")}
                            className={`${btn} bg-[var(--accent-red)] text-[var(--text-white)]`}
                          >
                            پایان سانس
                          </button>
                        </>
                      )}

                      {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setProposeTarget(entry)}
                          className={`${btn} border border-[var(--border-color)] text-[var(--text-white)] hover:border-[var(--primary)]`}
                        >
                          پیشنهاد زمان جدید
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailsTarget(entry)}
                      className={`${btn} bg-[var(--foreground)] text-[var(--text-white)] hover:bg-[var(--foreground)]/80`}
                    >
                      مشاهده جزئیات
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={Boolean(detailsTarget)}
        onClose={() => setDetailsTarget(null)}
        group={detailsTarget && detailsTarget.isGroup ? detailsTarget : null}
        single={detailsTarget && !detailsTarget.isGroup ? detailsTarget.reservation : null}
      />

      {/* Group Confirm Modal */}
      <GroupConfirmModal
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
        group={confirmTarget && confirmTarget.isGroup ? confirmTarget : null}
        single={confirmTarget && !confirmTarget.isGroup ? confirmTarget.reservation : null}
        busy={modalBusy}
      />

      {/* Group Cancel Modal */}
      <GroupCancelModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onCancel={handleCancelAction}
        group={cancelTarget && cancelTarget.isGroup ? cancelTarget : null}
        single={cancelTarget && !cancelTarget.isGroup ? cancelTarget.reservation : null}
        busy={modalBusy}
      />

      {/* Group Propose Time Modal */}
      <GroupProposeTimeModal
        isOpen={Boolean(proposeTarget)}
        onClose={() => setProposeTarget(null)}
        onSubmit={handleProposeTimeAction}
        group={proposeTarget && proposeTarget.isGroup ? proposeTarget : null}
        single={proposeTarget && !proposeTarget.isGroup ? proposeTarget.reservation : null}
        gamingCenterSlug={center?.slug}
        busy={modalBusy}
      />
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
