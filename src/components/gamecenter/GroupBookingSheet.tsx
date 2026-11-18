"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroupReservation } from "@/hooks/gaming-center/use-group-reservation";
import { isAbortError } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { generateDays, mapCalendarDaysToDateOptions } from "@/lib/dates";
import type { DateOption } from "@/lib/dates";
import {
  cleanPhoneNumber,
  formatPrice,
  isValidIranPhone,
  toEnglishDigits,
  toPersianDigits,
} from "@/lib/format";
import { formatClock, formatSlotHourEnglish } from "@/lib/reservationUi";
import { getGroupReservationErrorMessage } from "@/lib/groupReservationErrors";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import {
  getExtraSelectionHourlyTotal,
  getStationExtraSelectionsList,
  setStationExtraControllerQuantity,
  toExtraControllerSelectionInputs,
  type ExtraControllerSelectionMap,
} from "@/lib/extraControllers";
import { calendarService } from "@/services/calendarService";
import { gamingCenterService } from "@/services/gamingCenterService";
import { stationApi } from "@/services/gaming-center/station.api";
import type { AvailabilitySlot } from "@/services/gamingCenterService";
import type {
  PhysicalStation,
  StationExtraController,
} from "@/types/gaming-center/station.types";
import type {
  GroupReservation,
  GroupReservationPayload,
} from "@/types/gaming-center/group-reservation.types";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { BookingStepper, type BookingStep } from "@/components/gamecenter/BookingStepper";
import { TimeStep, type SlotView } from "@/components/gamecenter/booking/TimeStep";
import { ReviewStep } from "@/components/gamecenter/booking/ReviewStep";
import { paymentService } from "@/services/paymentService";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";
import { createIdempotencyKey } from "@/services/bookingService";

type RawSlot = SlotView & { available: boolean };
type AvailabilityMap = Record<string, Record<string, boolean>>;

interface GroupBookingSheetProps {
  gamingCenterId?: string;
  gamingCenterSlug: string;
  gamingCenterName: string;
  gamingCenterAddress?: string;
  stations: PhysicalStation[];
  initialExtraSelection?: ExtraControllerSelectionMap;
  onExtraSelectionChange?: (next: ExtraControllerSelectionMap) => void;
  initialCustomer?: { fullName: string; phone: string; email?: string };
  onClose: () => void;
  onSuccess?: (reservation: GroupReservation) => void;
}

function mapSlots(raw: AvailabilitySlot[]): RawSlot[] {
  return raw
    .filter((s) => !!s?.startTime)
    .map((s) => ({
      key: s.startTime,
      startTime: s.startTime,
      endTime: s.endTime || undefined,
      startLabel: formatClock(s.startTime, true),
      endLabel: s.endTime ? formatClock(s.endTime, true) : undefined,
      hourNumber: formatSlotHourEnglish(s.startTime),
      available:
        s.isAvailable !== false &&
        (s.status === undefined || s.status === "AVAILABLE"),
    }));
}

const slotMinutes = (s: SlotView) =>
  s.endTime
    ? Math.max(
        1,
        Math.round((Date.parse(s.endTime) - Date.parse(s.startTime)) / 60000)
      )
    : 60;

const LEAD_TIME_MIN_MS = 15 * 60 * 1000;

export const GroupBookingSheet: React.FC<GroupBookingSheetProps> = ({
  gamingCenterId,
  gamingCenterSlug,
  gamingCenterName,
  gamingCenterAddress,
  stations,
  initialExtraSelection,
  onExtraSelectionChange,
  initialCustomer,
  onClose,
}) => {
  const router = useRouter();
  const { isLoggedIn, user, login } = useAuth();

  const savedDraft = useMemo(() => {
    const draft = bookingDraftStorage.get();
    if (draft && draft.gamingCenterSlug === gamingCenterSlug) {
      return draft;
    }
    return null;
  }, [gamingCenterSlug]);

  const [dates, setDates] = useState<DateOption[]>(() => generateDays(10));
  const [dateId, setDateId] = useState<string>(() => savedDraft?.date?.id ?? "day-0");
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [avail, setAvail] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dateClosedNotice, setDateClosedNotice] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    savedDraft?.slots ? savedDraft.slots.map((s) => s.key) : []
  );

  const [fullName, setFullName] = useState(
    () => user?.fullName || initialCustomer?.fullName || savedDraft?.customer?.fullName || ""
  );
  const [phone, setPhone] = useState(
    () => user?.phone || initialCustomer?.phone || savedDraft?.customer?.phone || ""
  );
  const [note, setNote] = useState(() => savedDraft?.note ?? "");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isLeadTimeError, setIsLeadTimeError] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [isReviewStage, setIsReviewStage] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [extraSelection, setExtraSelection] = useState<ExtraControllerSelectionMap>(() => {
    if (initialExtraSelection && Object.keys(initialExtraSelection).length > 0) {
      return initialExtraSelection;
    }
    if (savedDraft?.extraControllerSelections) {
      const restored: ExtraControllerSelectionMap = {};
      for (const [stId, items] of Object.entries(savedDraft.extraControllerSelections)) {
        if (!stations.some((s) => s.id === stId)) continue;
        restored[stId] = {};
        for (const item of items) {
          restored[stId][item.extraControllerId] = {
            extraController: {
              id: item.extraControllerId,
              stationId: stId,
              controllerType: item.controllerType,
              quantity: item.quantity,
              hourlyPrice: item.hourlyPrice,
              isActive: true,
            },
            quantity: item.quantity,
          };
        }
      }
      return restored;
    }
    return {};
  });
  const [extraByStation, setExtraByStation] = useState<
    Record<string, StationExtraController[]>
  >({});
  const [extraNotice, setExtraNotice] = useState<string | null>(null);

  const updateExtraSelection = (next: ExtraControllerSelectionMap) => {
    setExtraSelection(next);
    onExtraSelectionChange?.(next);
  };

  const { checkout, submit, isSubmitting, error: apiError, resetError } =
    useGroupReservation(gamingCenterSlug);

  const isActionBusy = isSubmitting || isPaying;
  const submitLockRef = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      try {
        const calDays = await calendarService.getUpcomingDays(10, controller.signal);
        if (active && calDays && calDays.length > 0) {
          setDates(mapCalendarDaysToDateOptions(calDays));
        }
      } catch (err) {
        if (!isAbortError(err)) {
          // fallback to local dates
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const date = dates.find((d) => d.id === dateId) ?? dates[0];
  const stationIds = useMemo(() => stations.map((s) => s.id), [stations]);
  const stationIdsKey = useMemo(() => [...stationIds].sort().join(","), [stationIds]);

  const minHours = useMemo(() => {
    const list = stations.map((s) => s.minRentHours || 1);
    return Math.max(1, ...list);
  }, [stations]);

  const maxHours = useMemo(() => {
    const list = stations.map((s) => s.maxRentHours || 24);
    return Math.min(24, ...list);
  }, [stations]);

  const totalHourly = useMemo(
    () =>
      stations.reduce((a, s) => {
        const { finalHourlyPrice } = getEffectiveStationPricing(s);
        return a + finalHourlyPrice;
      }, 0),
    [stations]
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setLoadError(null);
      setDateClosedNotice(null);

      try {
        const [results, closures, centerInfo] = await Promise.all([
          Promise.all(
            stationIds.map(async (stId) => {
              const raw = await gamingCenterService.getAvailabilitySlots({
                slug: gamingCenterSlug,
                date: date.fullDate,
                stationId: stId,
                signal: controller.signal,
              });
              return { stId, slots: mapSlots(raw) };
            })
          ),
          gamingCenterService.getPublicClosures(gamingCenterSlug, controller.signal).catch(() => []),
          gamingCenterService.getPublicGamingCenter(gamingCenterSlug, controller.signal).catch(() => null),
        ]);

        if (!active) return;

        const fullyClosed = gamingCenterService.isDateFullyClosed(
          date.fullDate,
          closures,
          centerInfo?.closedDays
        );

        if (fullyClosed.isClosed) {
          setDateClosedNotice(fullyClosed.reason || "این گیمنت در این تاریخ تعطیل است.");
          setSlots([]);
          setAvail({});
          setSelectedKeys([]);
          return;
        }

        const unionMap = new Map<string, SlotView>();
        const stAvail: AvailabilityMap = {};

        for (const { stId, slots: sList } of results) {
          stAvail[stId] = {};
          for (const s of sList) {
            const overlaps = s.startTime
              ? gamingCenterService.findOverlappingClosures(
                  s.startTime,
                  s.endTime || new Date(new Date(s.startTime).getTime() + 60 * 60 * 1000).toISOString(),
                  closures
                )
              : [];
            const hasConflict = overlaps.length > 0;

            if (!unionMap.has(s.key)) {
              unionMap.set(s.key, {
                key: s.key,
                startTime: s.startTime,
                endTime: s.endTime,
                startLabel: s.startLabel,
                endLabel: s.endLabel,
                hourNumber: s.hourNumber,
              });
            }
            stAvail[stId][s.key] = !hasConflict && s.available;
          }
        }

        const sorted = Array.from(unionMap.values()).sort(
          (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)
        );

        setSlots(sorted);
        setAvail(stAvail);

        setSelectedKeys((prev) => {
          const valid = prev.filter((k) =>
            stationIds.every((id) => stAvail[id]?.[k] === true)
          );
          return valid.length === prev.length ? prev : valid;
        });
      } catch (err) {
        if (!active || isAbortError(err)) return;
        setLoadError(
          getGroupReservationErrorMessage(err as { code?: string; message?: string })
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamingCenterSlug, stationIdsKey, date.fullDate, retryToken, stationIds]);

  const isBookable = (key: string) =>
    stationIds.length > 0 && stationIds.every((id) => avail[id]?.[key] === true);

  const handleSlotClick = (key: string) => {
    if (isActionBusy || !isBookable(key)) return;
    setClientError(null);

    const idx = slots.findIndex((s) => s.key === key);
    if (idx === -1) return;

    if (selectedKeys.length === 0) {
      setSelectedKeys([key]);
      return;
    }

    const idxs = selectedKeys
      .map((k) => slots.findIndex((s) => s.key === k))
      .filter((i) => i !== -1)
      .sort((a, b) => a - b);

    const lo = idxs[0];
    const hi = idxs[idxs.length - 1];

    if (idx >= lo && idx <= hi) {
      if (idxs.length === 1) setSelectedKeys([]);
      else if (idx === lo) setSelectedKeys(slots.slice(lo + 1, hi + 1).map((s) => s.key));
      else if (idx === hi) setSelectedKeys(slots.slice(lo, hi).map((s) => s.key));
      else setSelectedKeys([key]);
      return;
    }

    if (idx === hi + 1 || idx === lo - 1) {
      const nextLo = Math.min(lo, idx);
      const nextHi = Math.max(hi, idx);
      const range = slots.slice(nextLo, nextHi + 1);
      const allOk = range.every((s) => isBookable(s.key));
      if (allOk) {
        if (range.length > maxHours) {
          setClientError(`حداکثر ${toPersianDigits(maxHours)} ساعت`);
          return;
        }
        setSelectedKeys(range.map((s) => s.key));
        return;
      }
    }
    setSelectedKeys([key]);
  };

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedKeys.includes(s.key)),
    [slots, selectedKeys]
  );

  const durationMinutes = selectedSlots.reduce((a, s) => a + slotMinutes(s), 0);
  const durationHours = durationMinutes / 60;
  const extraHourly = useMemo(
    () => getExtraSelectionHourlyTotal(extraSelection, stations),
    [extraSelection, stations]
  );
  const estimate = Math.round((totalHourly + extraHourly) * durationHours);
  const has = selectedSlots.length > 0;
  const tooShort = has && durationHours < minHours;

  const selectedWindowStart = selectedSlots[0]?.startTime;
  const selectedWindowEnd = useMemo(() => {
    if (!selectedWindowStart || durationMinutes <= 0) return undefined;
    const last = selectedSlots[selectedSlots.length - 1];
    if (last?.endTime) return last.endTime;
    const ms = Date.parse(selectedWindowStart);
    if (Number.isNaN(ms)) return undefined;
    return new Date(ms + durationMinutes * 60_000).toISOString();
  }, [selectedWindowStart, selectedSlots, durationMinutes]);

  useEffect(() => {
    if (stationIds.length === 0) return;
    let active = true;
    const controller = new AbortController();

    const windowParams =
      selectedWindowStart && selectedWindowEnd
        ? { startTime: selectedWindowStart, endTime: selectedWindowEnd }
        : undefined;

    Promise.all(
      stationIds.map(async (stId) => {
        try {
          const list = await stationApi.getStationExtraControllers(
            gamingCenterSlug,
            stId,
            windowParams,
            controller.signal
          );
          return { stId, list };
        } catch (err) {
          if (isAbortError(err)) throw err;
          return { stId, list: [] as StationExtraController[] };
        }
      })
    )
      .then((results) => {
        if (!active) return;
        const map: Record<string, StationExtraController[]> = {};
        for (const r of results) {
          map[r.stId] = r.list.filter((c) => c.isActive !== false);
        }
        setExtraByStation(map);

        setExtraSelection((prev) => {
          let changed = false;
          let clampedAny = false;
          const next: ExtraControllerSelectionMap = { ...prev };

          for (const { stId, list } of results) {
            const prevForSt = prev[stId];
            if (!prevForSt) continue;
            const byId = new Map(list.map((c) => [c.id, c]));
            const updatedForSt = { ...prevForSt };

            for (const [ctrlId, entry] of Object.entries(prevForSt)) {
              const live = byId.get(ctrlId);
              if (!live || live.isActive === false) {
                delete updatedForSt[ctrlId];
                changed = true;
                clampedAny = true;
                continue;
              }
              const maxAvail = Math.max(
                0,
                live.availableQuantity ?? live.quantity ?? 0
              );
              const clampedQty = Math.min(entry.quantity, maxAvail);
              if (clampedQty !== entry.quantity) {
                clampedAny = true;
                changed = true;
              }
              if (clampedQty <= 0) {
                delete updatedForSt[ctrlId];
              } else {
                if (
                  live !== entry.extraController ||
                  clampedQty !== entry.quantity
                ) {
                  updatedForSt[ctrlId] = {
                    extraController: live,
                    quantity: clampedQty,
                  };
                  changed = true;
                }
              }
            }

            if (Object.keys(updatedForSt).length === 0) {
              delete next[stId];
            } else {
              next[stId] = updatedForSt;
            }
          }

          if (clampedAny) {
            setExtraNotice(
              "تعداد برخی دسته‌های اضافی بر اساس موجودی بازه زمانی انتخاب‌شده به‌روزرسانی شد."
            );
          } else {
            setExtraNotice(null);
          }

          if (changed) {
            onExtraSelectionChange?.(next);
            return next;
          }
          return prev;
        });
      })
      .catch(() => {
        // ignore abort
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    gamingCenterSlug,
    stationIdsKey,
    stationIds,
    selectedWindowStart,
    selectedWindowEnd,
    onExtraSelectionChange,
  ]);

  const disabledReason = !has
    ? "ساعت را انتخاب کنید"
    : tooShort
    ? `حداقل ${toPersianDigits(minHours)} ساعت انتخاب کنید`
    : null;

  useEffect(() => {
    if (has) {
      bookingDraftStorage.set({
        gamingCenterId,
        gamingCenterSlug,
        gamingCenterName,
        gamingCenterAddress,
        selectedStationIds: stationIds,
        stationSnapshots: stations.map((s) => {
          const pricing = getEffectiveStationPricing(s);
          return {
            id: s.id,
            name: s.name,
            hourlyPrice: pricing.finalHourlyPrice,
            stationType: s.stationType,
          };
        }),
        date: {
          id: date.id,
          dayName: date.dayName,
          dateStr: date.dateStr,
          fullDate: date.fullDate,
        },
        slots: selectedSlots,
        durationHours,
        customer: {
          fullName,
          phone,
        },
        note,
        extraControllerSelections: Object.fromEntries(
          stations
            .map((st) => {
              const list = getStationExtraSelectionsList(extraSelection, st.id);
              return [
                st.id,
                list.map((entry) => ({
                  extraControllerId: entry.extraController.id,
                  controllerType: entry.extraController.controllerType,
                  hourlyPrice: entry.extraController.hourlyPrice,
                  quantity: entry.quantity,
                })),
              ] as const;
            })
            .filter(([, list]) => list.length > 0)
        ),
        grandTotal: estimate,
      });
    }
  }, [
    gamingCenterId,
    gamingCenterSlug,
    gamingCenterName,
    gamingCenterAddress,
    stationIds,
    stations,
    date,
    selectedSlots,
    durationHours,
    fullName,
    phone,
    note,
    extraSelection,
    estimate,
    has,
  ]);

  const currentStep: BookingStep = useMemo(() => {
    if (isReviewStage) return 3;
    return 1;
  }, [isReviewStage]);

  const hasLessThanLeadTime = (startIso?: string): boolean => {
    if (!startIso) return false;
    const ms = new Date(startIso).getTime();
    if (Number.isNaN(ms)) return false;
    return ms - Date.now() < LEAD_TIME_MIN_MS;
  };

  const handleLeadTimeReset = () => {
    setClientError(null);
    setIsLeadTimeError(false);
    resetError();
    setSelectedKeys([]);
    setRetryToken((v) => v + 1);
    setIsReviewStage(false);
  };

  const handleEditTime = () => {
    setClientError(null);
    setIsLeadTimeError(false);
    resetError();
    setIsReviewStage(false);
  };

  const handleProceed = () => {
    if (isActionBusy) return;
    setClientError(null);
    setIsLeadTimeError(false);
    resetError();

    if (!has || tooShort) {
      setClientError(disabledReason);
      return;
    }

    if (hasLessThanLeadTime(selectedSlots[0]?.startTime)) {
      setIsLeadTimeError(true);
      setClientError(getGroupReservationErrorMessage({ code: "LEAD_TIME_TOO_SHORT" }));
      return;
    }

    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsReviewStage(true);
  };

  const handleConfirmAndPay = async () => {
    if (isActionBusy || submitLockRef.current) return;
    submitLockRef.current = true;
    setClientError(null);
    setIsLeadTimeError(false);
    resetError();

    try {
      if (hasLessThanLeadTime(selectedSlots[0]?.startTime)) {
        setIsLeadTimeError(true);
        setClientError(getGroupReservationErrorMessage({ code: "LEAD_TIME_TOO_SHORT" }));
        return;
      }

      const cleanPhone = cleanPhoneNumber(phone || user?.phone || "");
      const targetName = (fullName || user?.fullName || "").trim();

      if (targetName.length < 2) {
        setClientError("اطلاعات حساب کاربری ناقص است.");
        return;
      }
      if (!isValidIranPhone(cleanPhone)) {
        setClientError("شماره موبایل را با ۱۱ رقم وارد کنید.");
        return;
      }

      const payload: GroupReservationPayload = {
        startTime: selectedSlots[0].startTime,
        durationMinutes,
        items: stations.map((st) => {
          const extras = toExtraControllerSelectionInputs(extraSelection, st.id);
          return {
            stationId: st.id,
            ...(extras.length > 0 ? { extraControllers: extras } : {}),
          };
        }),
        customer: {
          fullName: targetName,
          phone: cleanPhone,
          ...(initialCustomer?.email ? { email: initialCustomer.email } : {}),
        },
        ...(note.trim() ? { note: note.trim() } : {}),
      };

      try {
        const checkoutRes = await checkout(payload);

        bookingDraftStorage.update({
          holdId: checkoutRes.holdId,
          paymentId: checkoutRes.paymentId,
          paymentUrl: checkoutRes.paymentUrl,
          holdExpiresAt: checkoutRes.expiresAt,
          gamingCenterId: checkoutRes.gamingCenterId || gamingCenterId,
          grandTotal: checkoutRes.amount || estimate,
        });

        if (checkoutRes.paymentUrl) {
          setIsPaying(true);
          window.location.href = checkoutRes.paymentUrl;
          return;
        }
      } catch (checkoutErr: unknown) {
        const ce = checkoutErr as { status?: number; code?: string };
        if (ce?.status !== 404 && ce?.code !== "NOT_FOUND") {
          throw checkoutErr;
        }

        const res = await submit(payload);
        bookingDraftStorage.update({
          reservationId: res.id,
          gamingCenterId: res.gamingCenterId || gamingCenterId,
        });

        const resolvedCenterId = res.gamingCenterId || gamingCenterId;
        if (resolvedCenterId) {
          setIsPaying(true);
          const idempotencyKey = createIdempotencyKey();
          try {
            const payRes = await paymentService.initPayment(
              resolvedCenterId,
              res.id,
              idempotencyKey
            );
            if (payRes.paymentUrl) {
              window.location.href = payRes.paymentUrl;
              return;
            }
          } catch {
            router.push(`/reservations/${encodeURIComponent(res.id)}?paymentError=1`);
            return;
          } finally {
            setIsPaying(false);
          }
        }

        router.push(`/reservations/${encodeURIComponent(res.id)}`);
        return;
      }
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string };
      if (e?.status === 401 || e?.code === "UNAUTHORIZED") {
        setIsAuthModalOpen(true);
      } else if (e?.code === "LEAD_TIME_TOO_SHORT") {
        setIsLeadTimeError(true);
        setClientError(getGroupReservationErrorMessage(e));
      } else if (
        e?.code === "SLOT_NOT_AVAILABLE" ||
        e?.code === "RESERVATION_OVERLAP" ||
        e?.code === "OVERLAP_CONFLICT"
      ) {
        setRetryToken((v) => v + 1);
        setClientError(getGroupReservationErrorMessage(e));
      } else {
        setClientError(getGroupReservationErrorMessage(e));
      }
    } finally {
      submitLockRef.current = false;
    }
  };

  const handleAuthSuccess = async (
    authFullName: string,
    authPhone: string,
    token?: string,
    refreshToken?: string,
    _centerId?: string,
    role?: string
  ) => {
    login(authFullName, authPhone, token, refreshToken, role);
    setIsAuthModalOpen(false);

    const resolvedName = (authFullName || fullName.trim() || user?.fullName || "").trim();
    const resolvedPhone = toEnglishDigits(authPhone || phone || user?.phone || "").trim();
    if (resolvedName) setFullName(resolvedName);
    if (resolvedPhone) setPhone(resolvedPhone);

    if (has && !tooShort) {
      setIsReviewStage(true);
    }
  };

  const rangeLabel = has
    ? `${selectedSlots[0].startLabel} تا ${
        selectedSlots[selectedSlots.length - 1].endLabel ??
        selectedSlots[selectedSlots.length - 1].startLabel
      }`
    : "ساعت را انتخاب کنید";

  const errorText =
    clientError || (apiError ? getGroupReservationErrorMessage(apiError) : null);
  const showLeadTimeAction =
    isLeadTimeError || apiError?.code === "LEAD_TIME_TOO_SHORT";

  const timeActionLabel = !isLoggedIn ? "ورود و ادامه" : "ادامه";

  const footer = !isReviewStage ? (
    <StickyActionBar
      inDialog
      className="lg:hidden"
      info={
        has ? (
          <div key={rangeLabel} className="flex flex-col gap-0.5 animate-fadeIn">
            <span className="text-card-title text-[var(--text-white)] truncate">
              {toPersianDigits(Math.round(durationHours * 10) / 10)} ساعت · {rangeLabel}
            </span>
            <span className="text-secondary text-[var(--primary)]">
              برآورد {formatPrice(estimate)} تومان
            </span>
          </div>
        ) : (
          <span className="text-secondary text-[var(--text-muted)]">
            ساعت را انتخاب کنید
          </span>
        )
      }
      actionLabel={timeActionLabel}
      onAction={handleProceed}
      disabled={isActionBusy || Boolean(disabledReason)}
      error={errorText ?? undefined}
    />
  ) : (
    <StickyActionBar
      inDialog
      className="lg:hidden"
      info={
        <div className="flex flex-col gap-0.5">
          <span className="text-secondary text-[var(--text-muted)]">برآورد مبلغ</span>
          <span className="text-key-number text-[var(--primary)]">
            {formatPrice(estimate)}{" "}
            <span className="text-xs font-normal text-[var(--text-white)]">تومان</span>
          </span>
        </div>
      }
      actionLabel="پرداخت"
      onAction={handleConfirmAndPay}
      disabled={isActionBusy}
      loading={isActionBusy}
      loadingLabel={isPaying ? "در حال انتقال" : "در حال ثبت"}
      caption="انتقال به درگاه بانکی"
      error={errorText ?? undefined}
    />
  );

  return (
    <>
      <FullScreenDialog
        isOpen={true}
        onClose={isReviewStage ? handleEditTime : onClose}
        disableClose={isActionBusy || isAuthModalOpen}
        title={isReviewStage ? "بررسی" : "روز و ساعت"}
        subtitle={`${gamingCenterName} · ${toPersianDigits(stations.length)} دستگاه`}
        footer={footer}
      >
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <BookingStepper
            currentStep={currentStep}
            loggedIn={isLoggedIn}
            onStepClick={(step) => {
              if (step === 1 && isReviewStage) {
                handleEditTime();
              }
            }}
          />
        </div>

        {!isReviewStage ? (
          <TimeStep
            dates={dates}
            dateId={dateId}
            onSelectDate={setDateId}
            slots={slots}
            selectedKeys={selectedKeys}
            isBookable={isBookable}
            onSlotClick={handleSlotClick}
            loading={loading}
            loadError={loadError}
            dateClosedNotice={dateClosedNotice}
            onRetry={() => setRetryToken((t) => t + 1)}
            stations={stations}
            selectedDate={date}
            rangeLabel={rangeLabel}
            durationHours={durationHours}
            estimate={estimate}
            hasSelection={has}
            isActionBusy={isActionBusy}
            disabledReason={disabledReason}
            actionLabel={timeActionLabel}
            onProceed={handleProceed}
            errorText={errorText}
            showLeadTimeAction={showLeadTimeAction}
            onLeadTimeReset={handleLeadTimeReset}
            extraByStation={extraByStation}
            extraSelection={extraSelection}
            onExtraQtyChange={(stationId, ctrl, nextQty) => {
              setExtraNotice(null);
              updateExtraSelection(
                setStationExtraControllerQuantity(
                  extraSelection,
                  stationId,
                  ctrl,
                  nextQty
                )
              );
            }}
            extraNotice={extraNotice}
          />
        ) : (
          <ReviewStep
            gamingCenterName={gamingCenterName}
            selectedDate={date}
            rangeLabel={rangeLabel}
            durationHours={durationHours}
            stations={stations}
            extraSelection={extraSelection}
            estimate={estimate}
            note={note}
            onNoteChange={setNote}
            customerName={fullName || user?.fullName || ""}
            customerPhone={phone || user?.phone || ""}
            onEditTime={handleEditTime}
            onPay={handleConfirmAndPay}
            isBusy={isActionBusy}
            isPaying={isPaying}
            errorText={errorText}
            showLeadTimeAction={showLeadTimeAction}
            onLeadTimeReset={handleLeadTimeReset}
          />
        )}
      </FullScreenDialog>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialPhone={phone}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};
