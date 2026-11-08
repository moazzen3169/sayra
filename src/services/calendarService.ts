import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { APP_TIME_ZONE } from "@/lib/api/config";
import type {
  IranCalendarDaysResponse,
  IranCalendarDayItem,
} from "@/types/customerApi";

export interface GetIranCalendarDaysParams {
  from: string;
  to: string;
  includeEvents?: boolean;
  includeHolidays?: boolean;
  signal?: AbortSignal;
}

/**
 * Returns Jalali date string (YYYY-MM-DD) for a given Date in the specified timezone
 */
export function formatJalaliKey(date: Date, timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1405";
  const month = parts.find((p) => p.type === "month")?.value?.padStart(2, "0") ?? "01";
  const day = parts.find((p) => p.type === "day")?.value?.padStart(2, "0") ?? "01";

  return `${year}-${month}-${day}`;
}

export const calendarService = {
  /**
   * دریافت روزهای تقویم رسمی ایران برای یک بازه زمانی
   * GET /iran-calendar/days?from=...&to=...&includeEvents=...&includeHolidays=...
   */
  async getDays(
    params: GetIranCalendarDaysParams
  ): Promise<IranCalendarDayItem[]> {
    const { from, to, includeEvents = true, includeHolidays = true, signal } = params;

    const response = await apiClient.get<IranCalendarDaysResponse | { data?: IranCalendarDaysResponse } | IranCalendarDayItem[]>(
      ENDPOINTS.calendar.days,
      {
        query: {
          from,
          to,
          includeEvents,
          includeHolidays,
        },
        signal,
      }
    );

    const resData = response.data;
    if (!resData) return [];

    // Support both direct IranCalendarDaysResponse, array, or wrapped envelope { data: ... }
    if (Array.isArray(resData)) {
      return resData;
    }

    if ("days" in resData && Array.isArray((resData as IranCalendarDaysResponse).days)) {
      return (resData as IranCalendarDaysResponse).days;
    }

    if ("data" in resData && resData.data && typeof resData.data === "object") {
      const wrapped = resData.data as IranCalendarDaysResponse;
      if (Array.isArray(wrapped.days)) {
        return wrapped.days;
      }
    }

    return [];
  },

  /**
   * دریافت روزهای آینده تقویم بر اساس تعداد روز
   * به طور خودکار بازه Jalali را محاسبه و روزها را برمی‌گرداند.
   */
  async getUpcomingDays(count = 10, signal?: AbortSignal): Promise<IranCalendarDayItem[]> {
    const now = new Date();
    const from = formatJalaliKey(now);
    const futureDate = new Date(now.getTime() + (count + 1) * 24 * 60 * 60 * 1000);
    const to = formatJalaliKey(futureDate);

    const days = await calendarService.getDays({
      from,
      to,
      includeEvents: true,
      includeHolidays: true,
      signal,
    });

    return days.slice(0, count);
  },
};
