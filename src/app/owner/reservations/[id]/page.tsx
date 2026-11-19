"use client";

import React, {
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { GroupConfirmModal } from "@/components/owner/GroupConfirmModal";
import { GroupCancelModal } from "@/components/owner/GroupCancelModal";
import { GroupProposeTimeModal } from "@/components/owner/GroupProposeTimeModal";
import { StatusBadge } from "@/components/StatusBadge";
import { AppImage } from "@/components/common/AppImage";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { ApiError, isAbortError } from "@/lib/api/client";
import { mapWithConcurrency } from "@/lib/api/requestLimiter";
import { formatPrice, toPersianDigits } from "@/lib/format";
import {
  groupOwnerReservations,
  type OwnerBookingEntry,
} from "@/lib/ownerGroupReservationGrouping";
import {
  formatClock,
  formatDayLabel,
  formatFullJalaliDateTime,
  getErrorMessage,
  getPaymentLabel,
  getProposalStatusUi,
  getStationTypeLabel,
  getStatusUi,
  stationImageFor,
} from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { ReservationPaymentStatusInfo } from "@/types/owner";
import type {
  ReservationStatus,
  ReservationTimeProposal,
} from "@/types/reservation";
import { cn } from "@/lib/utils";

/* ---------- Stepper & Terminal Status ---------- */

const STEPS: { status: ReservationStatus; label: string }[] = [
  { status: "PENDING", label: "ثبت رزرو" },
  { status: "CONFIRMED", label: "تایید گیم‌نت" },
  { status: "IN_PROGRESS", label: "در حال انجام" },
  { status: "COMPLETED", label: "تکمیل‌شده" },
];

function StatusStepper({ status }: { status: ReservationStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex flex-col gap-3 py-1" dir="rtl">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <React.Fragment key={step.status}>
              {i > 0 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1.5 transition-colors",
                    i <= currentIndex
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border-color)]"
                  )}
                />
              )}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isCurrent
                      ? "bg-[var(--primary)] text-on-primary ring-4 ring-[var(--primary)]/20"
                      : isDone
                      ? "bg-[var(--primary)] text-on-primary"
                      : "bg-[var(--bg-body)] border-2 border-[var(--border-color)] text-[var(--text-muted)]"
                  )}
                >
                  {isDone ? (
                    <Icon name="check" size={14} strokeWidth={2.5} />
                  ) : (
                    toPersianDigits(i + 1)
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex justify-between text-center text-xs gap-1">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIndex;
          const isDone = i < currentIndex;
          return (
            <span
              key={step.status}
              className={cn(
                "font-bold",
                isCurrent
                  ? "text-[var(--primary)]"
                  : isDone
                  ? "text-[var(--text-white)]"
                  : "text-[var(--text-muted)]"
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TerminalStatusCard({
  status,
  reason,
}: {
  status: "CANCELED" | "NO_SHOW";
  reason?: string | null;
}) {
  const isCanceled = status === "CANCELED";
  return (
    <InlineAlert variant={isCanceled ? "error" : "warning"}>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-[var(--text-white)]">
          {isCanceled ? "رزرو لغو شده است" : "عدم حضور مشتری ثبت شده است"}
        </span>
        {reason ? (
          <span className="text-xs text-[var(--text-muted)]">
            علت ثبت‌شده: {reason}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">
            {isCanceled
              ? "این رزرو لغو شده و در وضعیت پایانی قرار دارد."
              : "عدم حضور مشتری در زمان تعیین‌شده ثبت شده است."}
          </span>
        )}
      </div>
    </InlineAlert>
  );
}

function LiveCountdown({ endTime }: { endTime: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const total = Math.max(
    0,
    Math.floor((new Date(endTime).getTime() - now) / 1000)
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = `${pad(Math.floor(total / 3600))}:${pad(
    Math.floor((total % 3600) / 60)
  )}:${pad(total % 60)}`;

  return (
    <div className="rounded-card bg-[var(--primary-muted)] border border-[var(--primary)]/30 p-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-white)]">
        <Icon name="clock" size={18} className="text-[var(--primary)]" />
        <span>زمان باقی‌مانده سانس</span>
      </div>
      <span
        dir="ltr"
        className="text-key-number text-[var(--primary)] font-mono tracking-wider"
      >
        {toPersianDigits(text)}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--border-subtle)]/60 last:border-b-0 min-w-0">
      <span className="text-xs text-[var(--text-muted)] shrink-0">{label}</span>
      <div
        dir={dir}
        className="text-xs sm:text-sm font-bold text-[var(--text-white)] text-left break-words min-w-0"
      >
        {value}
      </div>
    </div>
  );
}

const KNOWN_RESERVATION_KEYS = new Set([
  "id",
  "gamingCenterId",
  "stationId",
  "staffId",
  "staff",
  "customerAccountId",
  "customer",
  "user",
  "customerName",
  "customerPhone",
  "startTime",
  "endTime",
  "status",
  "paymentState",
  "totalHours",
  "totalPrice",
  "extraControllersTotalCost",
  "extraControllers",
  "checkInCode",
  "reservationCode",
  "stationSnapshot",
  "station",
  "gamingCenter",
  "gamingCenterName",
  "gamingCenterAddress",
  "groupBookingId",
  "groupBooking",
  "items",
  "note",
  "cancelReason",
  "cancellationReason",
  "discountAmount",
  "originalPrice",
  "finalPrice",
  "discountCode",
  "createdAt",
  "updatedAt",
  "confirmedAt",
  "startedAt",
  "completedAt",
  "canceledAt",
  "proposals",
  "session",
  "payment",
  "canRate",
  "isRated",
  "__v",
]);

const EXTRA_FIELD_LABELS: Record<string, string> = {
  source: "منبع ثبت رزرو",
  bookingSource: "کانال رزرو",
  channel: "کانال ارتباطی",
  platform: "پلتفرم",
  currency: "واحد پول",
  gateway: "درگاه پرداخت",
  refId: "شناسه مرجع تراکنش",
  authority: "کد مرجع درگاه",
  trackingCode: "کد پیگیری",
  paymentId: "شناسه پرداخت",
  paidAmount: "مبلغ پرداخت‌شده",
  amount: "مبلغ",
  paidAt: "زمان پرداخت",
  expiresAt: "مهلت انقضا",
  confirmedBy: "تاییدکننده",
  canceledBy: "لغوکننده",
  createdByUserId: "ثبت‌شده توسط کاربر",
  discountPercent: "درصد تخفیف",
  taxAmount: "مالیات",
  serviceFee: "کارمزد خدمات",
  durationMinutes: "مدت زمان (دقیقه)",
};

function formatDynamicValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "boolean") return val ? "بله" : "خیر";
  if (typeof val === "number") {
    if (/amount|price|cost|fee/i.test(key)) {
      return `${formatPrice(val)} تومان`;
    }
    return toPersianDigits(val);
  }
  if (typeof val === "string") {
    if (
      /At$|Date$|Time$/i.test(key) &&
      !isNaN(Date.parse(val)) &&
      val.includes("-")
    ) {
      return formatFullJalaliDateTime(val) || val;
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.length > 0 ? toPersianDigits(val.length) + " مورد" : "";
  }
  return "";
}

/* ---------- Detail Content Component ---------- */

function ReservationDetailContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const isGroupQuery = searchParams.get("type") === "group";
  const { centerId, center } = useOwner();

  const [entry, setEntry] = useState<OwnerBookingEntry | null>(null);
  const [proposals, setProposals] = useState<ReservationTimeProposal[]>([]);
  const [paymentStatus, setPaymentStatus] =
    useState<ReservationPaymentStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Action states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [noShowConfirm, setNoShowConfirm] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manager note edit state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const actionLockRef = useRef(false);

  useEffect(() => {
    if (!centerId || !id) return;
    let active = true;
    const controller = new AbortController();

    async function loadReservationDetail() {
      let resolvedEntry: OwnerBookingEntry | null = null;

      if (!isGroupQuery) {
        try {
          const single = await ownerService.getReservation(
            centerId,
            id,
            controller.signal
          );
          if (!active) return;

          if (single.groupBookingId || single.groupBooking?.id) {
            const gId = single.groupBookingId || single.groupBooking?.id || "";
            const listRes = await ownerService
              .listReservationsPaginated(centerId, {
                page: 1,
                pageSize: 100,
                signal: controller.signal,
              })
              .catch(() => null);

            if (!active) return;
            const siblings = listRes
              ? listRes.items.filter(
                  (r) => (r.groupBookingId || r.groupBooking?.id) === gId
                )
              : [];

            if (siblings.length > 1) {
              const grouped = groupOwnerReservations(siblings);
              resolvedEntry = grouped[0] ?? { isGroup: false, reservation: single };
            } else {
              resolvedEntry = { isGroup: false, reservation: single };
            }
          } else {
            resolvedEntry = { isGroup: false, reservation: single };
          }
        } catch (err: unknown) {
          if (isAbortError(err)) throw err;
          if (!(err instanceof ApiError) || err.status !== 404) {
            throw err;
          }
        }
      }

      if (!resolvedEntry) {
        const listRes = await ownerService.listReservationsPaginated(centerId, {
          page: 1,
          pageSize: 100,
          signal: controller.signal,
        });
        if (!active) return;

        const groupMatches = listRes.items.filter(
          (r) =>
            r.groupBookingId === id ||
            r.groupBooking?.id === id ||
            r.id === id ||
            r.reservationCode === id ||
            r.checkInCode === id
        );

        if (groupMatches.length === 0) {
          throw new Error("رزرو مورد نظر یافت نشد.");
        }

        const grouped = groupOwnerReservations(groupMatches);
        resolvedEntry = grouped[0];
      }

      if (!active || !resolvedEntry) return;

      setEntry(resolvedEntry);
      setError(null);

      const primaryRes = resolvedEntry.isGroup
        ? resolvedEntry.reservations[0]
        : resolvedEntry.reservation;

      setNoteDraft(primaryRes?.note ?? "");

      // Fetch proposals and payment status in parallel (graceful fallback if unavailable)
      if (primaryRes?.id) {
        const [proposalsRes, paymentRes] = await Promise.allSettled([
          ownerService.listReservationProposals(
            centerId,
            primaryRes.id,
            controller.signal
          ),
          ownerService.getReservationPaymentStatus(
            centerId,
            primaryRes.id,
            controller.signal
          ),
        ]);

        if (!active) return;

        const embeddedProposals = Array.isArray(primaryRes.proposals)
          ? primaryRes.proposals
          : [];
        if (
          proposalsRes.status === "fulfilled" &&
          proposalsRes.value.length > 0
        ) {
          setProposals(proposalsRes.value);
        } else {
          setProposals(embeddedProposals);
        }

        if (paymentRes.status === "fulfilled") {
          setPaymentStatus(paymentRes.value);
        } else {
          setPaymentStatus(null);
        }
      }
    }

    loadReservationDetail()
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(e instanceof Error && e.message === "رزرو مورد نظر یافت نشد." ? e.message : getErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, id, isGroupQuery, reloadToken]);

  const primaryReservation = useMemo(() => {
    if (!entry) return null;
    return entry.isGroup ? entry.reservations[0] ?? null : entry.reservation;
  }, [entry]);

  const allReservations = useMemo(() => {
    if (!entry) return [];
    return entry.isGroup ? entry.reservations : [entry.reservation];
  }, [entry]);

  const status: ReservationStatus = entry
    ? entry.isGroup
      ? entry.status
      : entry.reservation.status
    : "PENDING";

  const paymentState = entry
    ? entry.isGroup
      ? entry.paymentState
      : entry.reservation.paymentState
    : "PENDING";

  const startTime = entry
    ? entry.isGroup
      ? entry.startTime
      : entry.reservation.startTime
    : "";
  const endTime = entry
    ? entry.isGroup
      ? entry.endTime
      : entry.reservation.endTime
    : "";

  const totalHours = useMemo(() => {
    if (!primaryReservation) return 1;
    if (!entry?.isGroup && primaryReservation.totalHours) {
      return primaryReservation.totalHours;
    }
    const diff = Math.round(
      (Date.parse(endTime) - Date.parse(startTime)) / 3_600_000
    );
    return diff > 0 ? diff : primaryReservation.totalHours || 1;
  }, [entry?.isGroup, primaryReservation, startTime, endTime]);

  const totalPrice = entry
    ? entry.isGroup
      ? entry.totalPrice
      : entry.reservation.totalPrice
    : 0;

  const customerName = useMemo(() => {
    for (const r of allReservations) {
      const name = r.customer?.fullName || r.user?.fullName || r.customerName;
      if (name) return name;
    }
    return "";
  }, [allReservations]);

  const customerPhone = useMemo(() => {
    for (const r of allReservations) {
      const phone = r.customer?.phone || r.user?.phone || r.customerPhone;
      if (phone) return phone;
    }
    return "";
  }, [allReservations]);

  const customerEmail = primaryReservation?.customer?.email || "";
  const customerVerifiedAt = primaryReservation?.customer?.phoneVerifiedAt || null;
  const customerAccountId = primaryReservation?.customerAccountId || primaryReservation?.customer?.id || "";

  const checkInCode = useMemo(() => {
    for (const r of allReservations) {
      if (r.checkInCode) return r.checkInCode;
    }
    return "";
  }, [allReservations]);

  const reservationCode = useMemo(() => {
    for (const r of allReservations) {
      if (r.reservationCode) return r.reservationCode;
      if (r.groupBooking?.trackingCode) return r.groupBooking.trackingCode;
    }
    return "";
  }, [allReservations]);

  const cancelReason = useMemo(() => {
    for (const r of allReservations) {
      if (r.cancelReason) return r.cancelReason;
      if (r.cancellationReason) return r.cancellationReason;
    }
    return null;
  }, [allReservations]);

  const extraControllersTotalCost = useMemo(
    () =>
      allReservations.reduce(
        (sum, r) => sum + (r.extraControllersTotalCost ?? 0),
        0
      ),
    [allReservations]
  );

  // Extract any extra non-empty fields returned by server that aren't in the primary sections
  const extraResponseEntries = useMemo(() => {
    if (!primaryReservation) return [];
    const list: { key: string; label: string; value: string }[] = [];

    for (const [k, v] of Object.entries(primaryReservation)) {
      if (KNOWN_RESERVATION_KEYS.has(k)) continue;
      const formatted = formatDynamicValue(k, v);
      if (formatted) {
        list.push({
          key: k,
          label: EXTRA_FIELD_LABELS[k] || k,
          value: formatted,
        });
      }
    }

    if (paymentStatus) {
      const handledPaymentKeys = new Set([
        "paymentState",
        "status",
        "amount",
        "paidAmount",
        "currency",
        "gateway",
        "authority",
        "refId",
        "trackingCode",
        "paymentId",
        "paidAt",
      ]);
      for (const [k, v] of Object.entries(paymentStatus)) {
        if (handledPaymentKeys.has(k)) continue;
        const formatted = formatDynamicValue(k, v);
        if (formatted) {
          list.push({
            key: `pay_${k}`,
            label: EXTRA_FIELD_LABELS[k] || k,
            value: formatted,
          });
        }
      }
    }

    return list;
  }, [primaryReservation, paymentStatus]);

  const copyValue = async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  /* ---------- Mutations (Single-flight protected) ---------- */

  const handleConfirm = useCallback(async () => {
    if (!entry || modalBusy || actionLockRef.current) return;
    actionLockRef.current = true;
    setModalBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const pending = allReservations.filter((r) => r.status === "PENDING");
      await mapWithConcurrency(pending, 3, async (r) => {
        await ownerService.confirmReservation(centerId, r.id);
      });
      setConfirmOpen(false);
      setActionSuccess("رزرو با موفقیت تایید شد.");
      setReloadToken((v) => v + 1);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setModalBusy(false);
      actionLockRef.current = false;
    }
  }, [entry, modalBusy, allReservations, centerId]);

  const handleCancel = useCallback(
    async (reason?: string) => {
      if (!entry || modalBusy || actionLockRef.current) return;
      actionLockRef.current = true;
      setModalBusy(true);
      setActionError(null);
      setActionSuccess(null);
      try {
        const cancellable = allReservations.filter(
          (r) => r.status === "PENDING" || r.status === "CONFIRMED"
        );
        await mapWithConcurrency(cancellable, 3, async (r) => {
          await ownerService.cancelReservation(centerId, r.id, reason);
        });
        setCancelOpen(false);
        setActionSuccess("رزرو لغو شد.");
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setModalBusy(false);
        actionLockRef.current = false;
      }
    },
    [entry, modalBusy, allReservations, centerId]
  );

  const handleProposeTime = useCallback(
    async (newStartTime: string, newEndTime: string, note?: string) => {
      if (!entry || modalBusy || actionLockRef.current) return;
      actionLockRef.current = true;
      setModalBusy(true);
      setActionError(null);
      setActionSuccess(null);
      try {
        const eligible = allReservations.filter(
          (r) => r.status === "PENDING" || r.status === "CONFIRMED"
        );
        await mapWithConcurrency(eligible, 3, async (r) => {
          await ownerService.proposeTime(centerId, r.id, {
            startTime: newStartTime,
            endTime: newEndTime,
            note,
          });
        });
        setProposeOpen(false);
        setActionSuccess("پیشنهاد تاریخ و زمان جدید برای مشتری ارسال شد.");
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
        throw e;
      } finally {
        setModalBusy(false);
        actionLockRef.current = false;
      }
    },
    [entry, modalBusy, allReservations, centerId]
  );

  const handleSessionAction = useCallback(
    async (action: "start" | "pause" | "resume" | "stop") => {
      if (!entry || actionBusy || actionLockRef.current) return;
      actionLockRef.current = true;
      setActionBusy(true);
      setActionError(null);
      setActionSuccess(null);
      try {
        const targetList = allReservations.filter((r) =>
          action === "start" ? r.status === "CONFIRMED" : r.status === "IN_PROGRESS"
        );
        await mapWithConcurrency(targetList, 3, async (r) => {
          await ownerService.session(centerId, r.id, action);
        });
        setActionSuccess("وضعیت سانس با موفقیت به‌روزرسانی شد.");
        setReloadToken((v) => v + 1);
      } catch (e) {
        setActionError(getErrorMessage(e));
      } finally {
        setActionBusy(false);
        actionLockRef.current = false;
      }
    },
    [entry, actionBusy, allReservations, centerId]
  );

  const handleNoShow = useCallback(async () => {
    if (!entry || actionBusy || actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const confirmed = allReservations.filter((r) => r.status === "CONFIRMED");
      await mapWithConcurrency(confirmed, 3, async (r) => {
        await ownerService.noShowReservation(centerId, r.id);
      });
      setNoShowConfirm(false);
      setActionSuccess("عدم حضور مشتری ثبت شد.");
      setReloadToken((v) => v + 1);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setActionBusy(false);
      actionLockRef.current = false;
    }
  }, [entry, actionBusy, allReservations, centerId]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryReservation || savingNote || actionLockRef.current) return;
    actionLockRef.current = true;
    setSavingNote(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await ownerService.updateReservation(centerId, primaryReservation.id, {
        note: noteDraft.trim(),
      });
      setIsEditingNote(false);
      setActionSuccess("یادداشت رزرو ذخیره شد.");
      setReloadToken((v) => v + 1);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSavingNote(false);
      actionLockRef.current = false;
    }
  };

  const isTerminalState = status === "CANCELED" || status === "NO_SHOW";
  const canManagePendingOrConfirmed =
    status === "PENDING" || status === "CONFIRMED";

  const sortedProposals = useMemo(
    () =>
      [...proposals].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      ),
    [proposals]
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader
        title={entry?.isGroup ? "جزئیات رزرو گروهی" : "جزئیات رزرو"}
        backUrl="/owner/reservations"
      />

      <main className="flex-1 mt-16 px-4 py-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-4">
        {loading && (
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="بارگذاری جزئیات رزرو ناموفق بود"
            description={error}
            onRetry={() => {
              setLoading(true);
              setError(null);
              setReloadToken((v) => v + 1);
            }}
          />
        )}

        {!loading && !error && entry && primaryReservation && (
          <>
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

            {/* 1. Top Status & Codes Card */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-section-title text-[var(--text-white)]">
                      {entry.isGroup
                        ? `رزرو گروهی (${toPersianDigits(
                            entry.reservations.length
                          )} دستگاه)`
                        : primaryReservation.stationSnapshot?.name ||
                          primaryReservation.station?.name ||
                          "رزرو ایستگاه"}
                    </h2>
                    {primaryReservation.station?.isVip && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--primary-muted)] text-[var(--primary)] text-xs font-bold">
                        VIP
                      </span>
                    )}
                  </div>
                  {(primaryReservation.gamingCenterName ||
                    primaryReservation.gamingCenter?.name ||
                    center?.name) && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {primaryReservation.gamingCenterName ||
                        primaryReservation.gamingCenter?.name ||
                        center?.name}
                    </span>
                  )}
                </div>

                <StatusBadge status={status} size="md" />
              </div>

              {/* Codes Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {checkInCode && (
                  <div className="flex items-center justify-between gap-2 rounded-child bg-[var(--foreground)]/40 border border-[var(--border-subtle)] px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        کد پذیرش حضوری
                      </span>
                      <span className="text-base font-black text-[var(--primary)] font-mono tracking-wider">
                        {toPersianDigits(checkInCode)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyValue("checkIn", checkInCode)}
                    >
                      <Icon
                        name={copiedKey === "checkIn" ? "check" : "copy"}
                        size={14}
                      />
                      <span>
                        {copiedKey === "checkIn" ? "کپی شد" : "کپی"}
                      </span>
                    </Button>
                  </div>
                )}

                {reservationCode && (
                  <div className="flex items-center justify-between gap-2 rounded-child bg-[var(--foreground)]/40 border border-[var(--border-subtle)] px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        کد پیگیری رزرو
                      </span>
                      <span className="text-base font-black text-[var(--text-white)] font-mono tracking-wider">
                        {toPersianDigits(reservationCode)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyValue("resCode", reservationCode)}
                    >
                      <Icon
                        name={copiedKey === "resCode" ? "check" : "copy"}
                        size={14}
                      />
                      <span>
                        {copiedKey === "resCode" ? "کپی شد" : "کپی"}
                      </span>
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 rounded-child bg-[var(--bg-body)]/60 border border-[var(--border-subtle)] px-3 py-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-[var(--text-muted)]">
                      {entry.isGroup ? "شناسه رزرو گروهی" : "شناسه رزرو"}
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-mono text-[var(--text-white)] truncate"
                    >
                      {entry.isGroup ? entry.groupBookingId : primaryReservation.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        "id",
                        entry.isGroup
                          ? entry.groupBookingId
                          : primaryReservation.id
                      )
                    }
                    className="text-xs font-bold text-[var(--primary)] hover:underline shrink-0 cursor-pointer"
                  >
                    {copiedKey === "id" ? "کپی شد" : "کپی شناسه"}
                  </button>
                </div>
              </div>

              <div className="h-[1px] w-full bg-[var(--border-subtle)]" />

              {isTerminalState ? (
                <TerminalStatusCard
                  status={status as "CANCELED" | "NO_SHOW"}
                  reason={cancelReason}
                />
              ) : (
                <StatusStepper status={status} />
              )}

              {status === "IN_PROGRESS" && endTime && (
                <LiveCountdown endTime={endTime} />
              )}
            </section>

            {/* 2. Manager Actions */}
            {(canManagePendingOrConfirmed || status === "IN_PROGRESS") && (
              <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
                <h2 className="text-section-title text-[var(--text-white)]">
                  اقدامات مدیریت رزرو
                </h2>

                <div className="flex flex-wrap gap-2.5">
                  {status === "PENDING" && (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={modalBusy || actionBusy}
                      onClick={() => setConfirmOpen(true)}
                    >
                      <Icon name="check" size={16} />
                      <span>تایید رزرو</span>
                    </Button>
                  )}

                  {status === "CONFIRMED" && (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      isLoading={actionBusy}
                      disabled={modalBusy || actionBusy}
                      onClick={() => handleSessionAction("start")}
                    >
                      <Icon name="clock" size={16} />
                      <span>شروع سانس</span>
                    </Button>
                  )}

                  {canManagePendingOrConfirmed && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        disabled={modalBusy || actionBusy}
                        onClick={() => setProposeOpen(true)}
                      >
                        <Icon name="calendar" size={16} />
                        <span>پیشنهاد تاریخ و زمان جدید</span>
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        size="md"
                        disabled={modalBusy || actionBusy}
                        onClick={() => setCancelOpen(true)}
                      >
                        <Icon name="close" size={16} />
                        <span>لغو رزرو</span>
                      </Button>
                    </>
                  )}

                  {status === "CONFIRMED" && !noShowConfirm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      disabled={modalBusy || actionBusy}
                      onClick={() => setNoShowConfirm(true)}
                    >
                      <Icon name="alert" size={16} />
                      <span>ثبت عدم حضور</span>
                    </Button>
                  )}

                  {status === "IN_PROGRESS" && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        disabled={actionBusy}
                        onClick={() => handleSessionAction("pause")}
                      >
                        توقف موقت سانس
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        disabled={actionBusy}
                        onClick={() => handleSessionAction("resume")}
                      >
                        ادامه سانس
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="md"
                        isLoading={actionBusy}
                        disabled={actionBusy}
                        onClick={() => handleSessionAction("stop")}
                      >
                        پایان سانس
                      </Button>
                    </>
                  )}
                </div>

                {noShowConfirm && status === "CONFIRMED" && (
                  <InlineAlert
                    variant="warning"
                    action={
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          isLoading={actionBusy}
                          onClick={handleNoShow}
                        >
                          تایید عدم حضور
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => setNoShowConfirm(false)}
                        >
                          انصراف
                        </Button>
                      </div>
                    }
                  >
                    <span className="text-xs font-bold">
                      آیا از ثبت عدم حضور مشتری در این سانس اطمینان دارید؟
                    </span>
                  </InlineAlert>
                )}
              </section>
            )}

            {/* 3. Time Proposals History */}
            {sortedProposals.length > 0 && (
              <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-section-title text-[var(--text-white)]">
                    تاریخچه پیشنهادات تغییر زمان ({toPersianDigits(sortedProposals.length)})
                  </h2>
                </div>

                <div className="flex flex-col gap-2.5">
                  {sortedProposals.map((p) => {
                    const pUi = getProposalStatusUi(p.status);
                    return (
                      <div
                        key={p.id}
                        className="rounded-child bg-[var(--bg-body)]/60 border border-[var(--border-subtle)] p-3 flex flex-col gap-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold",
                              pUi.className
                            )}
                          >
                            {pUi.label}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            ثبت: {formatFullJalaliDateTime(p.createdAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[var(--text-muted)]">
                              زمان قبلی:
                            </span>
                            <span className="text-[var(--text-white)] opacity-80">
                              {formatDayLabel(p.originalStartTime)}،{" "}
                              {formatClock(p.originalStartTime, true)} تا{" "}
                              {formatClock(p.originalEndTime, true)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[var(--text-muted)]">
                              زمان پیشنهادی جدید:
                            </span>
                            <span className="font-bold text-[var(--primary)]">
                              {formatDayLabel(p.proposedStartTime)}،{" "}
                              {formatClock(p.proposedStartTime, true)} تا{" "}
                              {formatClock(p.proposedEndTime, true)}
                            </span>
                          </div>
                        </div>

                        {p.note && (
                          <p className="text-xs text-[var(--text-muted)] pt-1.5 border-t border-[var(--border-subtle)]/50">
                            توضیح: {p.note}
                          </p>
                        )}

                        {p.customerRespondedAt && (
                          <span className="text-xs text-[var(--text-muted)]">
                            زمان پاسخ مشتری:{" "}
                            {formatFullJalaliDateTime(p.customerRespondedAt)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Two-Column Grid on Desktop for Customer + Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 4. Customer Info */}
              <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                  <h2 className="text-section-title text-[var(--text-white)]">
                    مشخصات مشتری
                  </h2>
                  {customerPhone && (
                    <a
                      href={`tel:${customerPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-[var(--primary-muted)] text-[var(--primary)] text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      <span>تماس با مشتری</span>
                    </a>
                  )}
                </div>

                <div className="flex flex-col">
                  <InfoRow
                    label="نام و نام خانوادگی"
                    value={customerName || "ثبت نشده"}
                  />
                  <InfoRow
                    label="شماره تماس"
                    dir="ltr"
                    value={
                      customerPhone
                        ? toPersianDigits(customerPhone)
                        : "ثبت نشده"
                    }
                  />
                  {customerEmail && (
                    <InfoRow label="ایمیل" dir="ltr" value={customerEmail} />
                  )}
                  {customerVerifiedAt && (
                    <InfoRow
                      label="تایید شماره تماس"
                      value={formatFullJalaliDateTime(customerVerifiedAt)}
                    />
                  )}
                  {customerAccountId && (
                    <InfoRow
                      label="شناسه حساب مشتری"
                      dir="ltr"
                      value={
                        <span className="font-mono text-xs">
                          {customerAccountId}
                        </span>
                      }
                    />
                  )}
                </div>
              </section>

              {/* 5. Schedule & Timing Info */}
              <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
                <h2 className="text-section-title text-[var(--text-white)] pb-2 border-b border-[var(--border-subtle)]">
                  اطلاعات زمان و وضعیت
                </h2>

                <div className="flex flex-col">
                  <InfoRow
                    label="روز سانس"
                    value={`${formatDayLabel(startTime)}`}
                  />
                  <InfoRow
                    label="بازه ساعتی"
                    value={`از ${formatClock(startTime, true)} تا ${formatClock(
                      endTime,
                      true
                    )}`}
                  />
                  <InfoRow
                    label="مدت زمان"
                    value={`${toPersianDigits(totalHours)} ساعت`}
                  />
                  <InfoRow
                    label="زمان ثبت رزرو"
                    value={
                      formatFullJalaliDateTime(primaryReservation.createdAt) ||
                      "—"
                    }
                  />
                  {primaryReservation.confirmedAt && (
                    <InfoRow
                      label="زمان تایید"
                      value={formatFullJalaliDateTime(
                        primaryReservation.confirmedAt
                      )}
                    />
                  )}
                  {primaryReservation.startedAt && (
                    <InfoRow
                      label="زمان شروع واقعی"
                      value={formatFullJalaliDateTime(
                        primaryReservation.startedAt
                      )}
                    />
                  )}
                  {primaryReservation.completedAt && (
                    <InfoRow
                      label="زمان پایان"
                      value={formatFullJalaliDateTime(
                        primaryReservation.completedAt
                      )}
                    />
                  )}
                  {primaryReservation.canceledAt && (
                    <InfoRow
                      label="زمان لغو"
                      value={formatFullJalaliDateTime(
                        primaryReservation.canceledAt
                      )}
                    />
                  )}
                  {primaryReservation.updatedAt && (
                    <InfoRow
                      label="آخرین به‌روزرسانی"
                      value={formatFullJalaliDateTime(
                        primaryReservation.updatedAt
                      )}
                    />
                  )}
                  {(primaryReservation.staff?.publicName ||
                    primaryReservation.staff?.fullName ||
                    primaryReservation.staffId) && (
                    <InfoRow
                      label="اپراتور مسئول"
                      value={
                        primaryReservation.staff?.publicName ||
                        primaryReservation.staff?.fullName ||
                        primaryReservation.staffId
                      }
                    />
                  )}
                </div>
              </section>
            </div>

            {/* 6. Devices & Extra Controllers */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <h2 className="text-section-title text-[var(--text-white)]">
                  دستگاه‌ها و تجهیزات ({toPersianDigits(allReservations.length)})
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {allReservations.map((res, idx) => {
                  const stName =
                    res.stationSnapshot?.name ||
                    res.station?.name ||
                    "ایستگاه بازی";
                  const stType =
                    res.stationSnapshot?.stationType ||
                    res.station?.stationType ||
                    "PC";
                  const hourly =
                    res.stationSnapshot?.hourlyPrice ??
                    res.station?.hourlyPrice;
                  const imgSrc =
                    res.stationSnapshot?.coverImageUrl ||
                    stationImageFor(stType);
                  const stStatus = getStatusUi(res.status);

                  return (
                    <div
                      key={res.id || idx}
                      className="rounded-child bg-[var(--bg-body)]/60 border border-[var(--border-subtle)] p-3 flex flex-col gap-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 shrink-0 rounded-child bg-[var(--foreground)]/40 border border-[var(--border-subtle)] p-1.5 flex items-center justify-center overflow-hidden">
                            <AppImage
                              src={imgSrc}
                              fallbackSrc={stationImageFor(stType)}
                              alt={stName}
                              className="w-full h-full object-contain"
                              objectFit="contain"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[var(--text-white)] truncate">
                                {stName}
                              </span>
                              {entry.isGroup && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                    stStatus.className
                                  )}
                                >
                                  {stStatus.label}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">
                              {getStationTypeLabel(stType)}
                              {hourly
                                ? ` · ساعتی ${formatPrice(hourly)} تومان`
                                : ""}
                            </span>
                            {res.stationId && (
                              <span
                                dir="ltr"
                                className="text-xs text-[var(--text-muted)] font-mono truncate"
                              >
                                {res.stationId}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-sm font-black text-[var(--primary)]">
                            {formatPrice(res.totalPrice)} تومان
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {toPersianDigits(res.totalHours)} ساعت
                          </span>
                        </div>
                      </div>

                      {res.extraControllers && res.extraControllers.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]/60">
                          <span className="text-xs font-bold text-[var(--text-muted)]">
                            دسته‌های اضافی:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {res.extraControllers.map((ec) => (
                              <span
                                key={ec.id}
                                className="px-2.5 py-1 rounded-full bg-[var(--primary-muted)] text-[var(--primary)] text-xs font-bold"
                              >
                                {toPersianDigits(ec.quantity)} ×{" "}
                                {ec.controllerType} (
                                {formatPrice(ec.totalCost)} تومان)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 7. Financial & Payment Details */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
              <h2 className="text-section-title text-[var(--text-white)] pb-2 border-b border-[var(--border-subtle)]">
                اطلاعات مالی و پرداخت
              </h2>

              <div className="flex flex-col">
                <InfoRow
                  label="وضعیت پرداخت"
                  value={
                    <span
                      className={cn(
                        "font-bold",
                        paymentState === "PAID"
                          ? "text-[var(--accent-green)]"
                          : paymentState === "FAILED"
                          ? "text-[var(--accent-red)]"
                          : "text-[var(--accent-warning)]"
                      )}
                    >
                      {getPaymentLabel(paymentState)}
                    </span>
                  }
                />

                {typeof primaryReservation.originalPrice === "number" && (
                  <InfoRow
                    label="مبلغ پایه قبل از تخفیف"
                    value={`${formatPrice(primaryReservation.originalPrice)} تومان`}
                  />
                )}

                {typeof primaryReservation.discountAmount === "number" &&
                  primaryReservation.discountAmount > 0 && (
                    <InfoRow
                      label={
                        primaryReservation.discountCode
                          ? `تخفیف (${primaryReservation.discountCode})`
                          : "مبلغ تخفیف"
                      }
                      value={
                        <span className="text-[var(--accent-green)]">
                          {formatPrice(primaryReservation.discountAmount)} تومان
                        </span>
                      }
                    />
                  )}

                {extraControllersTotalCost > 0 && (
                  <InfoRow
                    label="هزینه دسته‌های اضافی"
                    value={`${formatPrice(extraControllersTotalCost)} تومان`}
                  />
                )}

                {paymentStatus?.gateway && (
                  <InfoRow label="درگاه پرداخت" value={paymentStatus.gateway} />
                )}

                {(paymentStatus?.refId ||
                  paymentStatus?.trackingCode ||
                  paymentStatus?.authority) && (
                  <InfoRow
                    label="شماره پیگیری تراکنش"
                    dir="ltr"
                    value={
                      <span className="font-mono">
                        {paymentStatus.refId ||
                          paymentStatus.trackingCode ||
                          paymentStatus.authority}
                      </span>
                    }
                  />
                )}

                {paymentStatus?.paidAt && (
                  <InfoRow
                    label="زمان پرداخت"
                    value={formatFullJalaliDateTime(paymentStatus.paidAt)}
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-body)]/50 p-3 rounded-child">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  مبلغ نهایی رزرو
                </span>
                <div className="flex items-baseline gap-1 text-[var(--primary)]">
                  <span className="text-key-number">
                    {formatPrice(primaryReservation.finalPrice ?? totalPrice)}
                  </span>
                  <span className="text-xs text-[var(--text-white)]">تومان</span>
                </div>
              </div>
            </section>

            {/* 8. Session Info & Manager Note */}
            <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <h2 className="text-section-title text-[var(--text-white)]">
                  یادداشت و جزئیات سانس
                </h2>
                {!isEditingNote && !entry.isGroup && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoteDraft(primaryReservation.note ?? "");
                      setIsEditingNote(true);
                    }}
                  >
                    <Icon name="edit" size={14} />
                    <span>ویرایش یادداشت</span>
                  </Button>
                )}
              </div>

              {primaryReservation.session && (
                <div className="flex flex-col pb-2 border-b border-[var(--border-subtle)]/60">
                  {primaryReservation.session.status && (
                    <InfoRow
                      label="وضعیت سشن"
                      value={primaryReservation.session.status}
                    />
                  )}
                  {primaryReservation.session.startedAt && (
                    <InfoRow
                      label="شروع سشن"
                      value={formatFullJalaliDateTime(
                        primaryReservation.session.startedAt
                      )}
                    />
                  )}
                  {primaryReservation.session.pausedAt && (
                    <InfoRow
                      label="زمان توقف"
                      value={formatFullJalaliDateTime(
                        primaryReservation.session.pausedAt
                      )}
                    />
                  )}
                  {primaryReservation.session.stoppedAt && (
                    <InfoRow
                      label="پایان سشن"
                      value={formatFullJalaliDateTime(
                        primaryReservation.session.stoppedAt
                      )}
                    />
                  )}
                  {typeof primaryReservation.session.durationMinutes ===
                    "number" && (
                    <InfoRow
                      label="مدت زمان ثبت‌شده سشن"
                      value={`${toPersianDigits(
                        primaryReservation.session.durationMinutes
                      )} دقیقه`}
                    />
                  )}
                </div>
              )}

              {isEditingNote ? (
                <form onSubmit={handleSaveNote} className="flex flex-col gap-3">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    disabled={savingNote}
                    placeholder="یادداشت مدیر یا توضیحات مربوط به این رزرو..."
                    className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-xs outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)]"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={savingNote}
                      disabled={savingNote}
                    >
                      ذخیره یادداشت
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={savingNote}
                      onClick={() => setIsEditingNote(false)}
                    >
                      انصراف
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {primaryReservation.note || "یادداشتی برای این رزرو ثبت نشده است."}
                </p>
              )}
            </section>

            {/* 9. Any Additional Response Metadata */}
            {extraResponseEntries.length > 0 && (
              <section className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col gap-3">
                <h2 className="text-section-title text-[var(--text-white)] pb-2 border-b border-[var(--border-subtle)]">
                  سایر اطلاعات ثبت‌شده
                </h2>
                <div className="flex flex-col">
                  {extraResponseEntries.map((item) => (
                    <InfoRow
                      key={item.key}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Action Modals */}
      {confirmOpen && entry && (
        <GroupConfirmModal
          isOpen={true}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          group={entry.isGroup ? entry : null}
          single={!entry.isGroup ? entry.reservation : null}
          busy={modalBusy}
        />
      )}

      {cancelOpen && entry && (
        <GroupCancelModal
          isOpen={true}
          onClose={() => setCancelOpen(false)}
          onCancel={handleCancel}
          group={entry.isGroup ? entry : null}
          single={!entry.isGroup ? entry.reservation : null}
          busy={modalBusy}
        />
      )}

      {proposeOpen && entry && (
        <GroupProposeTimeModal
          isOpen={true}
          onClose={() => setProposeOpen(false)}
          onSubmit={handleProposeTime}
          group={entry.isGroup ? entry : null}
          single={!entry.isGroup ? entry.reservation : null}
          gamingCenterSlug={center?.slug || centerId}
          busy={modalBusy}
        />
      )}
    </div>
  );
}

export default function OwnerReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <ReservationDetailContent id={id} />
    </Suspense>
  );
}
