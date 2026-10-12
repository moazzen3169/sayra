import { toPersianDigits } from "./format";

export interface TimeSlotOption {
  id: string;
  timeLabel: string; // e.g. "۱۳:۰۰ - ۱۴:۰۰"
  startHour: number;
}

export function generateHourlySlots(): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [];
  // Slots from 10:00 to 24:00 (10 AM to 12 Midnight)
  for (let hour = 10; hour < 24; hour++) {
    const nextHour = hour + 1;
    const hourStr = hour.toString().padStart(2, "0");
    const nextHourStr = nextHour === 24 ? "۰۰" : nextHour.toString().padStart(2, "0");
    
    slots.push({
      id: `slot-${hour}`,
      timeLabel: `${toPersianDigits(hourStr)}:۰۰ - ${toPersianDigits(nextHourStr)}:۰۰`,
      startHour: hour,
    });
  }
  return slots;
}
