"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { OwnerGroupReservationCard } from "@/components/owner/OwnerGroupReservationCard";
import {
  OwnerSingleReservationCard,
  type OwnerSessionAction,
} from "@/components/owner/OwnerSingleReservationCard";
import { GroupConfirmModal } from "@/components/owner/GroupConfirmModal";
import { GroupCancelModal } from "@/components/owner/GroupCancelModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { mapWithConcurrency } from "@/lib/api/requestLimiter";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import {
  groupOwnerReservations,
  type OwnerBookingEntry,
} from "@/lib/ownerGroupReservationGrouping";
import { ownerService } from "@/services/ownerService";
import type { OwnerReservation } from "@/types/owner";
import type { ReservationStatus } from "@/types/reservation";
import { cn } from "@/lib/utils";

const FILTERS: { id: "ALL" | ReservationStatus; label: string }[] = [
  { id: "ALL", label: "همه" },
  { id: "PENDING", label: "در انتظار" },
  { id: "CONFIRMED", label: "تایید شده" },
  { id: "IN_PROGRESS", label: "در حال انجام" },
  { id: "COMPLETED", label: "تکمیل شده" },
  { id: "CANCELED", label: "لغو شده" },
  { id: "NO_SHOW", label: "عدم حضور" },
];

const PAGE_SIZE = 50;

function Content() {
  const params = useSearchParams();
  const { centerId } = useOwner();

  const [items, setItems] = useState<OwnerReservation[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ReservationStatus>("ALL");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [serverSearch, setServerSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Action Modals State (Details moved to dedicated /owner/reservations/[id] page)
  const [confirmTarget, setConfirmTarget] = useState<OwnerBookingEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OwnerBookingEntry | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  const actionLockRef = useRef(false);

  // Debounce server search only when pagination has multiple pages
  useEffect(() => {
    if (totalPages <= 1 && !serverSearch) return;
    const timer = setTimeout(() => {
      setPage(1);
      setServerSearch(toEnglishDigits(query.trim()));
    }, 450);
    return () => clearTimeout(timer);
  }, [query, totalPages, serverSearch]);

  // Fetch reservations with server-side status filtering and OpenAPI pagination envelope
  useEffect(() => {
    if (!centerId) return;
    let active = true;
    const controller = new AbortController();

    ownerService
      .listReservationsPaginated(centerId, {
        page,
        pageSize: PAGE_SIZE,
        status: filter !== "ALL" ? filter : undefined,
        search: serverSearch || undefined,
        signal: controller.signal,
      })
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setTotalPages(Math.max(1, data.totalPages || 1));
        setTotalItems(data.total || data.items.length);
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
  }, [centerId, filter, page, serverSearch, reloadToken]);

  const groupedEntries = useMemo<OwnerBookingEntry[]>(() => {
    return groupOwnerReservations(items ?? []);
  }, [items]);

  const visibleEntries = useMemo(() => {
    const rawQ = query.trim().toLowerCase();
    const normQ = toEnglishDigits(rawQ);

    return groupedEntries.filter((entry) => {
      const entryStatus = entry.isGroup ? entry.status : entry.reservation.status;
      const statusMatch = filter === "ALL" || entryStatus === filter;

      if (!rawQ && !normQ) {
        return statusMatch;
      }

      if (entry.isGroup) {
        const codes = [entry.reservationCode, entry.checkInCode].filter(Boolean) as string[];
        const codeMatch = codes.some(
          (c) =>
            toEnglishDigits(c).toLowerCase().includes(normQ) ||
            c.toLowerCase().includes(rawQ)
        );

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
        if (!codeMatch && !textMatch) return false;
        return codeMatch ? true : statusMatch;
      }

      const r = entry.reservation;
      const codes = [r.reservationCode, r.checkInCode].filter(Boolean) as string[];
      const codeMatch = codes.some(
        (c) =>
          toEnglishDigits(c).toLowerCase().includes(normQ) ||
          c.toLowerCase().includes(rawQ)
      );

      const hay = [
        r.id,
        r.customer?.phone,
        r.customer?.fullName,
        r.user?.phone,
        r.user?.fullName,
        r.customerPhone,
        r.customerName,
        r.stationSnapshot?.name,
        r.station?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const textMatch = hay.includes(rawQ) || (normQ ? hay.includes(normQ) : false);
      if (!codeMatch && !textMatch) return false;
      return codeMatch ? true : statusMatch;
    });
  }, [groupedEntries, filter, query]);

  const handleFilterChange = (nextFilter: "ALL" | ReservationStatus) => {
    setFilter(nextFilter);
    setPage(1);
    setActionError(null);
    setActionSuccess(null);
  };

  // Confirm reservation(s)
  const handleConfirmAction = useCallback(async () => {
    if (!confirmTarget || modalBusy || actionLockRef.current) return;
    actionLockRef.current = true;
    setModalBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (confirmTarget.isGroup) {
        const pendingChildren = confirmTarget.reservations.filter(
          (res) => res.status === "PENDING"
        );
        await mapWithConcurrency(pendingChildren, 3, async (res) => {
          await ownerService.confirmReservation(centerId, res.id);
        });
      } else {
        await ownerService.confirmReservation(centerId, confirmTarget.reservation.id);
      }
      setConfirmTarget(null);
      setActionSuccess("رزرو با موفقیت تایید شد.");
      setReloadToken((v) => v + 1);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setModalBusy(false);
      actionLockRef.current = false;
    }
  }, [confirmTarget, modalBusy, centerId]);

  // Cancel reservation(s)
  const handleCancelAction = useCallback(
    async (reason?: string) => {
      if (!cancelTarget || modalBusy || actionLockRef.current) return;
      actionLockRef.current = true;
      setModalBusy(true);
      setActionError(null);
      setActionSuccess(null);
      try {
        if (cancelTarget.isGroup) {
          const activeChildren = cancelTarget.reservations.filter(
            (res) => res.status === "PENDING" || res.status === "CONFIRMED"
          );
          await mapWithConcurrency(activeChildren, 3, async (res) => {
            await ownerService.cancelReservation(centerId, res.id, reason);
          });
        } else {
          await ownerService.cancelReservation(
            centerId,
            cancelTarget.reservation.id,
            reason
          );
        }
        setCancelTarget(null);
        setActionSuccess("رزرو لغو شد.");
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setModalBusy(false);
        actionLockRef.current = false;
      }
    },
    [cancelTarget, modalBusy, centerId]
  );

  // Session actions (start / stop)
  const runSession = useCallback(
    async (r: OwnerReservation, action: OwnerSessionAction) => {
      if (busyId || actionLockRef.current) return;
      actionLockRef.current = true;
      setBusyId(r.id);
      setActionError(null);
      setActionSuccess(null);
      try {
        await ownerService.session(centerId, r.id, action);
        setActionSuccess("وضعیت سانس به‌روزرسانی شد.");
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setBusyId(null);
        actionLockRef.current = false;
      }
    },
    [busyId, centerId]
  );

  const getDetailsHref = (entry: OwnerBookingEntry) => {
    if (entry.isGroup) {
      return `/owner/reservations/${encodeURIComponent(entry.groupBookingId)}?type=group`;
    }
    return `/owner/reservations/${encodeURIComponent(entry.reservation.id)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="مدیریت رزروها" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس کد پذیرش، کد رزرو، نام یا شماره تماس مشتری"
            aria-label="جستجوی رزرو"
            className="w-full h-12 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] pr-10 pl-10 text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-subtle)] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setServerSearch("");
                setPage(1);
              }}
              aria-label="پاک کردن جستجو"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-white)] cursor-pointer"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="فیلتر وضعیت رزرو">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleFilterChange(f.id)}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-card text-xs font-bold border transition-colors cursor-pointer",
                  active
                    ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                    : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Summary count */}
        {items !== null && !error && (
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
            <span>
              نمایش {toPersianDigits(visibleEntries.length)} مورد
              {totalItems > items.length
                ? ` از مجموع ${toPersianDigits(totalItems)} رزرو`
                : ""}
            </span>
            <button
              type="button"
              onClick={() => setReloadToken((v) => v + 1)}
              className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
            >
              به‌روزرسانی لیست
            </button>
          </div>
        )}

        {actionSuccess && (
          <InlineAlert variant="success">
            <span className="text-xs font-bold">{actionSuccess}</span>
          </InlineAlert>
        )}

        {actionError && (
          <InlineAlert variant="error">
            <span className="text-xs font-bold">{actionError}</span>
          </InlineAlert>
        )}

        {/* Loading State */}
        {items === null && (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorState
            title="دریافت رزروها ناموفق بود"
            description={error}
            onRetry={() => setReloadToken((v) => v + 1)}
          />
        )}

        {/* Empty State */}
        {items && !error && visibleEntries.length === 0 && (
          <EmptyState
            title="رزروی پیدا نشد"
            description={
              query || filter !== "ALL"
                ? "با فیلتر یا عبارت جستجوی فعلی رزروی وجود ندارد."
                : "هنوز رزروی برای این گیم‌نت ثبت نشده است."
            }
            actionLabel={query || filter !== "ALL" ? "نمایش همه رزروها" : undefined}
            onAction={
              query || filter !== "ALL"
                ? () => {
                    setQuery("");
                    setServerSearch("");
                    setFilter("ALL");
                    setPage(1);
                  }
                : undefined
            }
          />
        )}

        {/* Reservation Cards List */}
        {items && !error && visibleEntries.length > 0 && (
          <div className="flex flex-col gap-4">
            {visibleEntries.map((entry) => {
              const detailsHref = getDetailsHref(entry);

              if (entry.isGroup) {
                const isBusy =
                  modalBusy &&
                  (confirmTarget === entry || cancelTarget === entry);

                return (
                  <OwnerGroupReservationCard
                    key={`group-${entry.groupBookingId}`}
                    groupBooking={entry}
                    busy={isBusy}
                    detailsHref={detailsHref}
                    onConfirm={() => setConfirmTarget(entry)}
                    onCancel={() => setCancelTarget(entry)}
                  />
                );
              }

              const r = entry.reservation;
              const isBusy =
                busyId === r.id ||
                (modalBusy &&
                  (confirmTarget === entry || cancelTarget === entry));

              return (
                <OwnerSingleReservationCard
                  key={`single-${r.id}`}
                  reservation={r}
                  busy={isBusy}
                  detailsHref={detailsHref}
                  onConfirm={() => setConfirmTarget(entry)}
                  onCancel={() => setCancelTarget(entry)}
                  onSessionAction={(action) => runSession(r, action)}
                />
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              صفحه قبل
            </Button>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              صفحه بعد
            </Button>
          </div>
        )}
      </main>

      {/* Modals mounted only when active to avoid idle effects */}
      {confirmTarget && (
        <GroupConfirmModal
          isOpen={true}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleConfirmAction}
          group={confirmTarget.isGroup ? confirmTarget : null}
          single={!confirmTarget.isGroup ? confirmTarget.reservation : null}
          busy={modalBusy}
        />
      )}

      {cancelTarget && (
        <GroupCancelModal
          isOpen={true}
          onClose={() => setCancelTarget(null)}
          onCancel={handleCancelAction}
          group={cancelTarget.isGroup ? cancelTarget : null}
          single={!cancelTarget.isGroup ? cancelTarget.reservation : null}
          busy={modalBusy}
        />
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
