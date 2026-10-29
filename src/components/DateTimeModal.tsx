"use client";

import React, { useState, useRef, useEffect } from "react";
import { generateTenDays, DateOption } from "@/lib/dates";
import { generateHourlySlots, TimeSlotOption } from "@/lib/slots";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatClock } from "@/lib/reservationUi";
import { gamingCenterService } from "@/services/gamingCenterService";
import { Icon } from "@/components/ui/Icon";
import { CartItem } from "./CartModal";

interface DateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  gamingCenterSlug?: string;
  onConfirmReservation: (details: {
    selectedDate: DateOption;
    selectedSlots: TimeSlotOption[];
    totalHours: number;
    grandTotal: number;
  }) => void;
  extraControllerPricePerHour?: number;
}

export const DateTimeModal: React.FC<DateTimeModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  gamingCenterSlug,
  onConfirmReservation,
  extraControllerPricePerHour = 30000,
}) => {
  const [dateOptions] = useState<DateOption[]>(() => generateTenDays());
  const [selectedDateId, setSelectedDateId] = useState<string>("day-0");

  const [defaultTimeSlots] = useState<TimeSlotOption[]>(() => generateHourlySlots());
  const [apiSlots, setApiSlots] = useState<TimeSlotOption[] | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(["slot-14", "slot-15"]);

  const dateListRef = useRef<HTMLDivElement>(null);

  const selectedDateObj = dateOptions.find((d) => d.id === selectedDateId) || dateOptions[0];
  const stationId = cartItems[0]?.device.id;

  useEffect(() => {
    let isCancelled = false;
    if (isOpen && gamingCenterSlug && selectedDateObj?.fullDate) {
      gamingCenterService
        .getAvailabilitySlots(gamingCenterSlug, selectedDateObj.fullDate, stationId)
        .then((rawSlots) => {
          if (isCancelled) return;
          if (rawSlots && rawSlots.length > 0) {
            const mapped: TimeSlotOption[] = rawSlots.map((s, idx) => {
              const startH = s.startTime ? new Date(s.startTime).getHours() : idx;
              const endH = s.endTime ? new Date(s.endTime).getHours() : startH + 1;
              const label =
                s.startTime && s.endTime
                  ? `${formatClock(s.startTime, true)} تا ${formatClock(s.endTime, true)}`
                  : `ساعت ${toPersianDigits(startH)} تا ${toPersianDigits(endH)}`;
              const isAvail = s.isAvailable !== false && s.status !== "UNAVAILABLE";
              return {
                id: `slot-${startH}`,
                timeLabel: label,
                startHour: startH,
                isAvailable: isAvail,
              };
            });
            setApiSlots(mapped);
          }
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, gamingCenterSlug, selectedDateObj?.fullDate, stationId]);

  const timeSlots = apiSlots || defaultTimeSlots;

  if (!isOpen) return null;

  const scrollDates = (direction: "left" | "right") => {
    if (dateListRef.current) {
      const scrollAmount = direction === "right" ? -180 : 180;
      dateListRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleToggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) => {
      if (prev.includes(slotId)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((id) => id !== slotId);
      } else {
        return [...prev, slotId];
      }
    });
  };

  const totalHours = selectedSlotIds.length;

  const totalPricePerHour = cartItems.reduce((acc, item) => {
    const base = item.device.pricePerHour * item.quantity;
    const extra = item.extraControllersCount * extraControllerPricePerHour;
    return acc + base + extra;
  }, 0);

  const grandTotal = totalPricePerHour * totalHours;

  const selectedSlots = timeSlots.filter((s) => selectedSlotIds.includes(s.id));

  const handleFinalConfirm = () => {
    onConfirmReservation({
      selectedDate: selectedDateObj,
      selectedSlots,
      totalHours,
      grandTotal,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[780px] lg:max-w-[720px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-4 sm:p-5 flex justify-between flex-col gap-4 max-h-[92vh] lg:max-h-[88vh] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[var(--text-white)]">انتخاب تاریخ و تایم رزرو</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto pr-0.5">
          {/* Reservation Summary Brief */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="font-bold text-[var(--primary)]">خلاصه رزرو شما:</div>
            <div className="flex flex-wrap gap-2 text-[var(--text-white)]">
              {cartItems.map((item) => (
                <span key={item.device.id} className="bg-[var(--bg-body)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs">
                  {toPersianDigits(item.quantity)}× {item.device.name}
                  {item.extraControllersCount > 0 ? ` (+${toPersianDigits(item.extraControllersCount)} دسته)` : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[var(--text-white)]">
                ۱. انتخاب روز رزرو
              </h4>
              <div className="flex items-center gap-1 bg-[var(--foreground)]/30 rounded-lg p-0.5 border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => scrollDates("right")}
                  className="w-6 h-6 rounded bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-on-primary transition-colors"
                  title="روز قبلی"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollDates("left")}
                  className="w-6 h-6 rounded bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-on-primary transition-colors"
                  title="روز بعدی"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              ref={dateListRef}
              className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
            >
              {dateOptions.map((dateObj) => {
                const isSelected = selectedDateId === dateObj.id;
                return (
                  <button
                    key={dateObj.id}
                    type="button"
                    onClick={() => setSelectedDateId(dateObj.id)}
                    className={`w-24 min-w-[96px] h-16 shrink-0 rounded-card flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold shadow-lg scale-[1.02]"
                        : "bg-[var(--foreground)]/50 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    <span className="text-xs font-bold truncate w-full text-center px-1">
                      {dateObj.dayName}
                    </span>
                    <span
                      className={`text-xs ${
                        isSelected ? "text-on-primary/80 font-bold" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {dateObj.dateStr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Selection */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[var(--text-white)]">
                ۲. انتخاب ساعات بازی (۱ ساعته)
              </h4>
              <span className="text-xs text-[var(--text-muted)]">
                امکان انتخاب چند ساعت
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {timeSlots.map((slot) => {
                const isSelected = selectedSlotIds.includes(slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleToggleSlot(slot.id)}
                    className={`h-11 rounded-card flex items-center justify-between px-3 text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold shadow-md"
                        : "bg-[var(--foreground)]/50 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    <span>{slot.timeLabel}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[#101014] text-[var(--primary)] text-xs flex items-center justify-center font-bold">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pricing & Final Action Footer */}
        <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--text-muted)]">
                مدت زمان: {toPersianDigits(totalHours)} ساعت ({selectedDateObj.dayName})
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--text-muted)]">مبلغ نهایی:</span>
                <span className="text-lg font-black text-[var(--primary)]">
                  {formatPrice(grandTotal)}
                </span>
                <span className="text-xs text-[var(--text-white)]">تومان</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalConfirm}
              className="h-12 px-6 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>تکمیل و ثبت رزرو</span>
              <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
