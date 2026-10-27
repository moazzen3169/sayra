import { APP_TIME_ZONE } from "./api/config";

export interface DateOption {
  id: string;
  dayName: string;
  dateStr: string;
  /** کلید تاریخ YYYY-MM-DD بر اساس Timezone اپ؛ مستقیم به پارامتر date در Availability API می‌رود */
  fullDate: string;
}

/** «امروز» را بر اساس Timezone تعریف‌شده اپ (نه ساعت دستگاه) می‌گیرد */
const todayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// روزهای بعد با ظهر UTC ساخته می‌شوند تا جابه‌جایی روز رخ ندهد
const weekdayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "UTC",
  weekday: "long",
});
const dayMonthFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

/** فقط برای UX انتخاب تاریخ است؛ Availability را محاسبه نمی‌کند */
export function generateDays(count = 10): DateOption[] {
  const [y, m, d] = todayKeyFmt.format(new Date()).split("-").map(Number);
  const options: DateOption[] = [];

  for (let i = 0; i < count; i++) {
    const noonUtc = new Date(Date.UTC(y, m - 1, d + i, 12));
    const dayName =
      i === 0 ? "امروز" : i === 1 ? "فردا" : i === 2 ? "پس‌فردا" : weekdayFmt.format(noonUtc);

    options.push({
      id: `day-${i}`,
      dayName,
      dateStr: dayMonthFmt.format(noonUtc),
      fullDate: noonUtc.toISOString().slice(0, 10),
    });
  }

  return options;
}

/** برای سازگاری با کدهای قبلی */
export const generateTenDays = (): DateOption[] => generateDays(10);