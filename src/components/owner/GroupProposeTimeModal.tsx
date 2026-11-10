"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { generateDays } from "@/lib/dates";
import { toPersianDigits } from "@/lib/format";
import { generateHourlySlots } from "@/lib/slots";
import { gamingCenterService } from "@/services/gamingCenterService";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";
import type { OwnerReservation } from "@/types/owner";

interface GroupProposeTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startTime: string, endTime: string, note?: string) => Promise<void>;
  group: OwnerGroupBookingItem | null;
  single?: OwnerReservation | null;
  gamingCenterSlug?: string;
  busy: boolean;
}

export const GroupProposeTimeModal: React.FC<GroupProposeTimeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  group,
  single,
  gamingCenterSlug,
  busy,
}) => {
  const [pDateId, setPDateId] = useState<string>("day-0");
  const [selectedSlotHours, setSelectedSlotHours] = useState<number[]>([]);
  const [pNote, setPNote] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const availableDays = useMemo(() => generateDays(10), []);
  const hourlySlots = useMemo(() => generateHourlySlots(), []);

  // Determine fixed duration hours to enforce booking duration consistency
  const targetDurationHours = useMemo(() => {
    const item = group || single;
    if (!item) return 1;
    const start = new Date(item.startTime).getTime();
    const end = new Date(item.endTime).getTime();
    const diff = Math.round((end - start) / 3_600_000);
    return diff > 0 ? diff : 1;
  }, [group, single]);

  const selectedDay = useMemo(
    () => availableDays.find((d) => d.id === pDateId) ?? availableDays[0],
    [availableDays, pDateId]
  );

  // Check station availability when slots or date change
  useEffect(() => {
    if (!isOpen || selectedSlotHours.length === 0 || !gamingCenterSlug) {
      setConflicts([]);
      return;
    }

    const stationsToCheck: { id: string; name: string }[] = [];
    if (group) {
      for (const r of group.reservations) {
        if (r.stationId) {
          stationsToCheck.push({
            id: r.stationId,
            name: r.stationSnapshot?.name || "ایستگاه",
          });
        }
      }
    } else if (single?.stationId) {
      stationsToCheck.push({
        id: single.stationId,
        name: single.stationSnapshot?.name || "ایستگاه",
      });
    }

    if (stationsToCheck.length === 0) return;

    let active = true;
    const controller = new AbortController();
    setCheckingAvailability(true);

    const minHour = Math.min(...selectedSlotHours);
    const maxHour = Math.max(...selectedSlotHours);

    Promise.all(
      stationsToCheck.map(async (st) => {
        try {
          const slots = await gamingCenterService.getAvailabilitySlots(
            gamingCenterSlug,
            selectedDay.fullDate,
            st.id,
            controller.signal
          );
          if (!active) return null;

          // Check if any selected hour is marked unavailable
          // Each slot from normalizeAvailabilitySlots has { startTime, isAvailable }
          const conflictingSlots = (slots || []).filter((s) => {
            const h = new Date(s.startTime).getHours();
            return h >= minHour && h <= maxHour && s.isAvailable === false;
          });

          if (conflictingSlots.length > 0) {
            return st.name;
          }
          return null;
        } catch {
          return null;
        }
      })
    )
      .then((results) => {
        if (!active) return;
        const found = results.filter((n): n is string => Boolean(n));
        setConflicts(found);
      })
      .finally(() => {
        if (active) setCheckingAvailability(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, selectedDay.fullDate, selectedSlotHours, group, single, gamingCenterSlug]);

  if (!isOpen) return null;

  const isGroup = Boolean(group);
  const title = isGroup ? "پیشنهاد زمان جدید برای رزرو گروهی" : "پیشنهاد زمان جدید";

  const toggleSlotHour = (hour: number) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlotHours.length === 0 || busy || conflicts.length > 0) return;

    const minHour = Math.min(...selectedSlotHours);
    const maxHour = Math.max(...selectedSlotHours) + 1;

    const pad = (n: number) => String(n).padStart(2, "0");
    const startTime = new Date(`${selectedDay.fullDate}T${pad(minHour)}:00:00+03:30`).toISOString();
    const endTime = new Date(`${selectedDay.fullDate}T${pad(maxHour)}:00:00+03:30`).toISOString();

    await onSubmit(startTime, endTime, pNote.trim() || undefined);
    setSelectedSlotHours([]);
    setPNote("");
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={title} className="max-w-[520px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        <p className="text-[var(--text-muted)] leading-relaxed">
          {isGroup ? (
            <>
              این پیشنهاد برای تمامی{" "}
              <strong className="text-[var(--primary)] font-bold">
                {toPersianDigits(group?.reservations.length ?? 0)} دستگاه این رزرو گروهی
              </strong>{" "}
              اعمال خواهد شد. زمان اصلی رزرو تغییر نمی‌کند تا زمانی که مشتری پیشنهاد را تایید نماید.
            </>
          ) : (
            <>زمان پیشنهادی جدید را تعیین نمایید تا برای تایید مشتری ارسال گردد.</>
          )}
        </p>

        {/* Step 1: Pick Date */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-[var(--text-white)]">۱. انتخاب روز پیشنهادی</label>
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

        {/* Step 2: Pick Slots */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[var(--text-white)]">
              ۲. انتخاب ساعت ({toPersianDigits(targetDurationHours)} ساعت متوالی)
            </label>
            {selectedSlotHours.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSlotHours([])}
                className="text-[11px] text-[var(--text-muted)] hover:underline"
              >
                پاک کردن
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

        {/* Conflict Warning */}
        {checkingAvailability && (
          <div className="p-2.5 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] flex items-center gap-2">
            <span className="animate-pulse">●</span>
            <span>در حال بررسی تداخل زمانی با سایر رزروها...</span>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="p-3 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex flex-col gap-1">
            <span>تداخل زمانی شناسایی شد!</span>
            <span className="text-[11px] font-normal">
              دستگاه‌های زیر در زمان انتخابی رزرو دیگری دارند و امکان پیشنهاد وجود ندارد:
            </span>
            <ul className="list-disc list-inside font-bold">
              {conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Note */}
        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-[var(--text-muted)]">توضیح به مشتری (اختیاری)</label>
          <textarea
            value={pNote}
            onChange={(e) => setPNote(e.target.value)}
            rows={2}
            placeholder="دلیل تغییر زمان و توضیحات تکمیلی برای مشتری..."
            className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-2.5 text-xs outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="submit"
            disabled={busy || selectedSlotHours.length === 0 || conflicts.length > 0}
            className="flex-1 h-10 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {busy ? "در حال ارسال..." : "ارسال پیشنهاد جدید"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)] hover:opacity-80 transition-opacity"
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  );
};
