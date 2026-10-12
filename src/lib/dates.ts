import { toPersianDigits } from "./format";

export interface DateOption {
  id: string;
  dayName: string;
  dateStr: string;
  fullDate: string;
}

const PERSIAN_DAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
];

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function generateTenDays(): DateOption[] {
  const options: DateOption[] = [];
  const baseDate = new Date();

  for (let i = 0; i < 10; i++) {
    const current = new Date(baseDate);
    current.setDate(baseDate.getDate() + i);

    let dayName = "";
    if (i === 0) {
      dayName = "امروز";
    } else if (i === 1) {
      dayName = "فردا";
    } else if (i === 2) {
      dayName = "پس‌فردا";
    } else {
      const dayIndex = current.getDay();
      dayName = PERSIAN_DAYS[dayIndex];
    }

    // Convert gregorian date to Jalali approximate or format
    // Simple Jalali converter for immediate display
    const { month, day } = toJalali(
      current.getFullYear(),
      current.getMonth() + 1,
      current.getDate()
    );

    const monthName = PERSIAN_MONTHS[month - 1];
    const dateStr = `${toPersianDigits(day)} ${monthName}`;
    const isoDate = current.toISOString().split("T")[0];

    options.push({
      id: `day-${i}`,
      dayName,
      dateStr,
      fullDate: isoDate,
    });
  }

  return options;
}

// Simple Gregorian to Jalali converter function
function toJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy =
    gy <= 1600
      ? 0
      : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm =
    days < 186
      ? 1 + Math.floor(days / 31)
      : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { year: jy, month: jm, day: jd };
}
