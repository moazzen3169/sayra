"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { APP_TIME_ZONE } from "@/lib/api/config";
import { isAbortError } from "@/lib/api/client";
import { mapWithConcurrency } from "@/lib/api/requestLimiter";
import {
  generateDays,
  mapCalendarDaysToDateOptions,
  type DateOption,
} from "@/lib/dates";
import { toPersianDigits } from "@/lib/format";
import {
  formatClock,
  formatDayLabel,
  getErrorMessage,
} from "@/lib/reservationUi";
import { calendarService } from "@/services/calendarService";
import {
  gamingCenterService,
  type AvailabilitySlot,
} from "@/services/gamingCenterService";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";
import type { OwnerReservation } from "@/types/owner";
import { cn } from "@/lib/utils";

interface GroupProposeTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startTime: string, endTime: string, note?: string) => Promise<void>;
  group: OwnerGroupBookingItem | null;
  single?: OwnerReservation | null;
  gamingCenterSlug?: string;
  busy: boolean;
}

interface MergedSlotOption {
  startTime: string;
  endTime: string;
  startLabel: string;
  endLabel: string;
  busyStations: string[];
}

interface DayAvailabilityCacheEntry {
  slots: MergedSlotOption[];
  closedNotice: string | null;
}

const HOUR_MS = 3_600_000;

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const GroupProposeTimeModal: React.FC<GroupProposeTimeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  group,
  single,
  gamingCenterSlug,
  busy,
}) => {
  const isGroup = Boolean(group);
  const referenceItem = group || single;

  const [dates, setDates] = useState<DateOption[]>(() => generateDays(10));
  const [selectedDateId, setSelectedDateId] = useState<string>(() => {
    const initialDates = generateDays(10);
    if (referenceItem?.startTime) {
      const currentDateKey = dateKeyFmt.format(new Date(referenceItem.startTime));
      const matchedDay = initialDates.find((d) => d.fullDate === currentDateKey);
      if (matchedDay) return matchedDay.id;
    }
    return initialDates[0]?.id ?? "day-0";
  });
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<MergedSlotOption[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Local session cache keyed by `${slug}|${date}|${stationIdsKey}` to prevent repeat fetches
  const sessionAvailabilityCache = useRef<Map<string, DayAvailabilityCacheEntry>>(new Map());
  const submitLockRef = useRef(false);

  // Target reservations that are eligible for time proposals
  const targetReservations = useMemo(() => {
    if (group) {
      return group.reservations.filter(
        (r) => r.status === "PENDING" || r.status === "CONFIRMED"
      );
    }
    if (single && (single.status === "PENDING" || single.status === "CONFIRMED")) {
      return [single];
    }
    return [];
  }, [group, single]);

  // Unique stations to check (prevents duplicate requests if a station appears multiple times)
  const uniqueStations = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of targetReservations) {
      if (r.stationId && !map.has(r.stationId)) {
        map.set(r.stationId, r.stationSnapshot?.name || r.station?.name || "ایستگاه");
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [targetReservations]);

  const stationIdsKey = useMemo(
    () => uniqueStations.map((s) => s.id).sort().join(","),
    [uniqueStations]
  );

  // Keep consistent duration per backend contract
  const targetDurationHours = useMemo(() => {
    if (!referenceItem) return 1;
    if (!isGroup && single?.totalHours && single.totalHours >= 1) {
      return Math.round(single.totalHours);
    }
    const start = new Date(referenceItem.startTime).getTime();
    const end = new Date(referenceItem.endTime).getTime();
    const diff = Math.round((end - start) / HOUR_MS);
    return diff > 0 ? diff : 1;
  }, [referenceItem, isGroup, single]);

  const selectedDay = useMemo(
    () => dates.find((d) => d.id === selectedDateId) ?? dates[0],
    [dates, selectedDateId]
  );

  // Load Iran calendar days once when modal opens (cached 5m in calendarService)
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const controller = new AbortController();

    calendarService
      .getUpcomingDays(10, controller.signal)
      .then((calDays) => {
        if (active && calDays.length > 0) {
          setDates(mapCalendarDaysToDateOptions(calDays));
        }
      })
      .catch(() => {
        // Fallback to local generated days silently
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen]);

  // Fetch availability ONCE per (slug, date, uniqueStations) — never on slot selection
  useEffect(() => {
    if (!isOpen || !gamingCenterSlug || !selectedDay?.fullDate) {
      return;
    }

    const cacheKey = `${gamingCenterSlug}|${selectedDay.fullDate}|${stationIdsKey}`;
    const cached = sessionAvailabilityCache.current.get(cacheKey);
    if (cached && retryToken === 0) {
      setDaySlots(cached.slots);
      setClosedNotice(cached.closedNotice);
      setSlotsError(null);
      setLoadingSlots(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoadingSlots(true);
    setSlotsError(null);
    setClosedNotice(null);

    (async () => {
      try {
        const closures = await gamingCenterService
          .getPublicClosures(gamingCenterSlug, controller.signal)
          .catch(() => []);

        if (!active) return;

        const fullyClosed = gamingCenterService.isDateFullyClosed(
          selectedDay.fullDate,
          closures
        );

        if (fullyClosed.isClosed) {
          const entry: DayAvailabilityCacheEntry = {
            slots: [],
            closedNotice: fullyClosed.reason || "گیم‌نت در این تاریخ تعطیل است.",
          };
          sessionAvailabilityCache.current.set(cacheKey, entry);
          setDaySlots([]);
          setClosedNotice(entry.closedNotice);
          return;
        }

        const stationList =
          uniqueStations.length > 0
            ? uniqueStations
            : [{ id: "", name: "ایستگاه" }];

        const stationResults = await mapWithConcurrency(
          stationList,
          3,
          async (st) => {
            const raw: AvailabilitySlot[] =
              await gamingCenterService.getAvailabilitySlots({
                slug: gamingCenterSlug,
                date: selectedDay.fullDate,
                stationId: st.id || undefined,
                signal: controller.signal,
              });
            return { stationName: st.name, raw };
          },
          controller.signal
        );

        if (!active) return;

        // Build unified timeline of 60-min slots for the selected date
        const slotMap = new Map<
          string,
          { startTime: string; endTime: string; busyStations: Set<string> }
        >();

        for (const { stationName, raw } of stationResults) {
          for (const s of raw) {
            if (!s?.startTime) continue;
            const endIso =
              s.endTime ||
              new Date(Date.parse(s.startTime) + HOUR_MS).toISOString();

            let rec = slotMap.get(s.startTime);
            if (!rec) {
              rec = {
                startTime: s.startTime,
                endTime: endIso,
                busyStations: new Set<string>(),
              };
              slotMap.set(s.startTime, rec);
            }

            const overlapsClosure =
              gamingCenterService.findOverlappingClosures(
                s.startTime,
                endIso,
                closures
              ).length > 0;

            const isSlotAvail =
              !overlapsClosure &&
              s.isAvailable !== false &&
              (s.status === undefined || s.status === "AVAILABLE");

            if (!isSlotAvail) {
              rec.busyStations.add(stationName);
            }
          }
        }

        const merged: MergedSlotOption[] = Array.from(slotMap.values())
          .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
          .map((item) => ({
            startTime: item.startTime,
            endTime: item.endTime,
            startLabel: formatClock(item.startTime, true),
            endLabel: formatClock(item.endTime, true),
            busyStations: Array.from(item.busyStations),
          }));

        const entry: DayAvailabilityCacheEntry = {
          slots: merged,
          closedNotice: null,
        };
        sessionAvailabilityCache.current.set(cacheKey, entry);
        setDaySlots(merged);
        setClosedNotice(null);
      } catch (err) {
        if (!active || isAbortError(err)) return;
        setSlotsError(getErrorMessage(err));
        setDaySlots([]);
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, gamingCenterSlug, selectedDay?.fullDate, stationIdsKey, retryToken, uniqueStations]);

  // Compute consecutive availability for each potential starting slot completely in memory
  const slotBlockStatus = useMemo(() => {
    const statusMap = new Map<
      string,
      { canStart: boolean; blockEndTime: string; busyReasons: string[] }
    >();

    for (let i = 0; i < daySlots.length; i++) {
      const first = daySlots[i];
      const neededEndIndex = i + targetDurationHours - 1;
      if (neededEndIndex >= daySlots.length) {
        statusMap.set(first.startTime, {
          canStart: false,
          blockEndTime: first.endTime,
          busyReasons: ["ساعت کافی تا پایان روز کاری باقی نمانده است."],
        });
        continue;
      }

      let contiguous = true;
      const busySet = new Set<string>();
      for (let offset = 0; offset < targetDurationHours; offset++) {
        const current = daySlots[i + offset];
        if (offset > 0) {
          const prev = daySlots[i + offset - 1];
          const gap = Date.parse(current.startTime) - Date.parse(prev.endTime);
          if (Math.abs(gap) > 60_000) {
            contiguous = false;
            break;
          }
        }
        for (const stName of current.busyStations) {
          busySet.add(stName);
        }
      }

      const last = daySlots[neededEndIndex];
      statusMap.set(first.startTime, {
        canStart: contiguous && busySet.size === 0,
        blockEndTime: last.endTime,
        busyReasons: contiguous
          ? Array.from(busySet)
          : ["ساعت‌های متوالی برای این مدت‌زمان در دسترس نیست."],
      });
    }

    return statusMap;
  }, [daySlots, targetDurationHours]);

  // Highlighted slots for the currently selected start time
  const selectedRangeInfo = useMemo(() => {
    if (!selectedStartTime) return null;
    const idx = daySlots.findIndex((s) => s.startTime === selectedStartTime);
    if (idx === -1) return null;
    const block = slotBlockStatus.get(selectedStartTime);
    if (!block || !block.canStart) return null;

    const highlightedStarts = new Set<string>();
    for (let offset = 0; offset < targetDurationHours; offset++) {
      if (daySlots[idx + offset]) {
        highlightedStarts.add(daySlots[idx + offset].startTime);
      }
    }

    const startIso = daySlots[idx].startTime;
    const endIso = block.blockEndTime;

    const isSameAsOriginal =
      referenceItem &&
      Math.abs(Date.parse(startIso) - Date.parse(referenceItem.startTime)) < 60_000 &&
      Math.abs(Date.parse(endIso) - Date.parse(referenceItem.endTime)) < 60_000;

    return {
      startIso,
      endIso,
      highlightedStarts,
      isSameAsOriginal: Boolean(isSameAsOriginal),
    };
  }, [selectedStartTime, daySlots, slotBlockStatus, targetDurationHours, referenceItem]);

  if (!isOpen) return null;

  const title = isGroup
    ? "پیشنهاد تاریخ و زمان جدید (رزرو گروهی)"
    : "پیشنهاد تاریخ و زمان جدید";

  const handleDateSelect = (dayId: string) => {
    if (dayId === selectedDateId) return;
    setSelectedDateId(dayId);
    setSelectedStartTime(null);
    setSubmitError(null);
    setRetryToken(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedRangeInfo ||
      selectedRangeInfo.isSameAsOriginal ||
      busy ||
      submitLockRef.current
    ) {
      return;
    }

    submitLockRef.current = true;
    setSubmitError(null);
    try {
      await onSubmit(
        selectedRangeInfo.startIso,
        selectedRangeInfo.endIso,
        note.trim() || undefined
      );
      setSelectedStartTime(null);
      setNote("");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={title}
      className="max-w-[560px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        {/* Current Reservation Time Reference */}
        {referenceItem && (
          <div className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-muted)]">زمان فعلی رزرو:</span>
              <span className="font-bold text-[var(--text-white)]">
                {formatDayLabel(referenceItem.startTime)}،{" "}
                {formatClock(referenceItem.startTime, true)} تا{" "}
                {formatClock(referenceItem.endTime, true)} (
                {toPersianDigits(targetDurationHours)} ساعت)
              </span>
            </div>
            {isGroup && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">تعداد دستگاه مشمول:</span>
                <span className="font-bold text-[var(--primary)]">
                  {toPersianDigits(targetReservations.length)} دستگاه
                </span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {isGroup
            ? "تاریخ و ساعت پیشنهادی برای تمامی دستگاه‌های فعال این رزرو گروهی ارسال می‌شود. زمان رزرو پس از تایید مشتری تغییر خواهد کرد."
            : "تاریخ و ساعت جدید را انتخاب کنید تا برای تایید مشتری ارسال شود."}
        </p>

        {/* Step 1: Date Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[var(--text-white)]">
            ۱. انتخاب تاریخ جدید
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dates.map((d) => {
              const active = d.id === selectedDateId;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handleDateSelect(d.id)}
                  className={cn(
                    "shrink-0 w-22 h-16 rounded-card flex flex-col items-center justify-center gap-0.5 border transition-colors cursor-pointer",
                    active
                      ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                      : "bg-[var(--foreground)]/40 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  )}
                >
                  <span className="text-xs font-bold">{d.dayName}</span>
                  <span
                    className={cn(
                      "text-xs",
                      active
                        ? "font-bold text-on-primary"
                        : d.isHoliday
                        ? "text-[var(--accent-red)]"
                        : "text-[var(--text-muted)]"
                    )}
                  >
                    {d.dateStr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Real Availability Slots */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-[var(--text-white)]">
              ۲. انتخاب ساعت شروع ({toPersianDigits(targetDurationHours)} ساعت متوالی)
            </label>
            {selectedStartTime && (
              <button
                type="button"
                onClick={() => setSelectedStartTime(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-white)] hover:underline cursor-pointer"
              >
                پاک کردن انتخاب
              </button>
            )}
          </div>

          {!gamingCenterSlug && (
            <InlineAlert variant="warning">
              <span className="text-xs">
                اطلاعات گیم‌نت برای بررسی ساعات خالی در دسترس نیست.
              </span>
            </InlineAlert>
          )}

          {loadingSlots && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-busy="true">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-11 w-full" />
              ))}
            </div>
          )}

          {!loadingSlots && slotsError && (
            <ErrorState
              title="ساعات خالی بارگذاری نشد"
              description={slotsError}
              onRetry={() => setRetryToken((v) => v + 1)}
            />
          )}

          {!loadingSlots && !slotsError && closedNotice && (
            <InlineAlert variant="error">
              <span className="text-xs font-bold">{closedNotice}</span>
            </InlineAlert>
          )}

          {!loadingSlots && !slotsError && !closedNotice && daySlots.length === 0 && (
            <InlineAlert variant="info">
              <span className="text-xs">
                برای این تاریخ ساعتی جهت پیشنهاد ثبت نشده است.
              </span>
            </InlineAlert>
          )}

          {!loadingSlots && !slotsError && !closedNotice && daySlots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1.5 border border-[var(--border-subtle)] rounded-card bg-[var(--bg-body)]/60">
              {daySlots.map((slot) => {
                const block = slotBlockStatus.get(slot.startTime);
                const isSelectedBlock =
                  selectedRangeInfo?.highlightedStarts.has(slot.startTime) ?? false;
                const isDirectlyBusy = slot.busyStations.length > 0;
                const canStartHere = Boolean(block?.canStart);

                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!canStartHere || busy}
                    onClick={() => setSelectedStartTime(slot.startTime)}
                    title={
                      !canStartHere && block?.busyReasons.length
                        ? `ناموجود: ${block.busyReasons.join("، ")}`
                        : `${slot.startLabel} تا ${slot.endLabel}`
                    }
                    className={cn(
                      "min-h-11 rounded-card border px-2 py-1.5 text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-colors",
                      isSelectedBlock
                        ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] cursor-pointer"
                        : canStartHere
                        ? "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer"
                        : "bg-[var(--foreground)]/40 text-[var(--text-muted)] border-transparent opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span>
                      {slot.startLabel} تا {slot.endLabel}
                    </span>
                    {isDirectlyBusy && (
                      <span className="text-xs font-medium opacity-80">پر</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Proposal Summary */}
        {selectedRangeInfo && (
          <InlineAlert
            variant={selectedRangeInfo.isSameAsOriginal ? "warning" : "success"}
          >
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-bold">
                {selectedRangeInfo.isSameAsOriginal
                  ? "زمان انتخاب‌شده با زمان فعلی رزرو یکسان است"
                  : `زمان پیشنهادی: ${selectedDay?.dayName} ${selectedDay?.dateStr}، از ${formatClock(
                      selectedRangeInfo.startIso,
                      true
                    )} تا ${formatClock(selectedRangeInfo.endIso, true)}`}
              </span>
            </div>
          </InlineAlert>
        )}

        {/* Note */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="propose-time-note"
            className="text-xs font-bold text-[var(--text-muted)]"
          >
            توضیح برای مشتری (اختیاری)
          </label>
          <textarea
            id="propose-time-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={busy}
            placeholder="دلیل تغییر تاریخ یا ساعت برای اطلاع‌رسانی به مشتری"
            className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-2.5 text-xs outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)]"
          />
        </div>

        {submitError && (
          <InlineAlert variant="error">
            <span className="text-xs font-bold">{submitError}</span>
          </InlineAlert>
        )}

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={busy}
            loadingLabel="در حال ارسال..."
            disabled={
              busy ||
              !selectedRangeInfo ||
              selectedRangeInfo.isSameAsOriginal ||
              targetReservations.length === 0
            }
            className="flex-1"
          >
            <Icon name="calendar" size={16} />
            <span>ارسال پیشنهاد جدید</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={onClose}
          >
            انصراف
          </Button>
        </div>
      </form>
    </Modal>
  );
};
