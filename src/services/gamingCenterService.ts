import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { buildMockAvailabilitySlots, getMockGamecenterDetail } from "@/lib/mocks/gamecenter.mock";
import {
  PublicGamingCenter,
  GameStation,
  AvailabilitySlot,
  PublicRating,
  PublicMediaItem,
  PublicAddress,
  PublicSocialLink,
  ContractGapError,
  AvailabilitySlotsParams,
} from "@/types/customerApi";
import type { GamingCenterClosure, GamingCenterSchedule } from "@/types/owner";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CUID_OR_SLUG_ID_REGEX = /^[a-z0-9_-]+$/i;

/**
 * اعتبارسنجی پارامترهای درخواست اسلات‌های زمانی در لایه کلاینت
 * از ارسال تاریخ نادرست یا جابجایی stationId و date به بک‌اند جلوگیری می‌کند.
 */
export function validateAvailabilityParams(params: {
  slug: string;
  date: string;
  stationId?: string;
}): void {
  const { slug, date, stationId } = params;
  if (!slug || typeof slug !== "string" || !slug.trim()) {
    throw new Error("Invalid gaming center slug.");
  }

  if (!date || typeof date !== "string" || !DATE_REGEX.test(date.trim())) {
    throw new Error("Date must be formatted as YYYY-MM-DD");
  }

  if (stationId !== undefined && stationId !== null) {
    if (typeof stationId !== "string" || !stationId.trim()) {
      throw new Error("Invalid station ID format");
    }
    const cleanStationId = stationId.trim();
    // جلوگیری از جابجایی ناخواسته date و stationId
    if (DATE_REGEX.test(cleanStationId)) {
      throw new Error("Invalid station ID format: stationId appears to be a date string");
    }
  }
}

/**
 * نرمال‌سازی پاسخ اندپوینت /availability/slots
 * پشتیبانی از هر دو فرمت:
 * ۱) آرایه تخت از اسلات‌ها: AvailabilitySlot[]
 * ۲) انولوپ مبتنی بر ایستگاه: [{ date, gamingCenter, station, slots: [...] }]
 * ۳) شیء والد دارای کلید slots: { slots: [...] }
 */
export function normalizeAvailabilitySlots(raw: unknown): AvailabilitySlot[] {
  if (!raw) return [];

  // اگر داده شیء باشد
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.slots)) {
      return normalizeAvailabilitySlots(obj.slots);
    }
    if (Array.isArray(obj.data)) {
      return normalizeAvailabilitySlots(obj.data);
    }
    return [];
  }

  // اگر داده آرایه باشد
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];

    // بررسی آیا آیتم‌های آرایه شامل آرایه slots هستند (مثل فرمت چندگانه ایستگاه‌ها)
    const hasNestedSlots = raw.some(
      (item) => item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).slots)
    );

    if (hasNestedSlots) {
      const flattened: AvailabilitySlot[] = [];
      for (const item of raw) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const stationId =
            typeof rec.station === "object" && rec.station !== null
              ? (rec.station as Record<string, unknown>).id
              : rec.stationId;

          if (Array.isArray(rec.slots)) {
            for (const slot of rec.slots) {
              if (slot && typeof slot === "object" && (slot as Record<string, unknown>).startTime) {
                flattened.push({
                  ...(slot as AvailabilitySlot),
                  stationId:
                    (slot as AvailabilitySlot).stationId || (typeof stationId === "string" ? stationId : undefined),
                });
              }
            }
          }
        }
      }
      return flattened;
    }

    // آرایه تخت اسلات‌ها
    return raw.filter(
      (item): item is AvailabilitySlot =>
        Boolean(item && typeof item === "object" && (item as Record<string, unknown>).startTime)
    );
  }

  return [];
}

export type GamingCenterInfo = PublicGamingCenter;

export interface GameStationInfo extends GameStation {
  quantity?: number;
  deviceModel?: string;
  extraControllerPrice?: number;
  defaultControllers?: number;
  maxExtraControllers?: number;
}

export type { AvailabilitySlot, AvailabilitySlotsParams };

export const gamingCenterService = {
  /**
   * دریافت لیست عمومی گیمنت‌ها
   * GET /gamingCenters
   */
  async listGamingCenters(signal?: AbortSignal): Promise<PublicGamingCenter[]> {
    const response = await apiClient.get<unknown>(ENDPOINTS.gamingCenter.list, { signal });
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as PublicGamingCenter[];
    }
    if (resData && typeof resData === "object" && "data" in resData && Array.isArray((resData as { data: unknown }).data)) {
      return (resData as { data: PublicGamingCenter[] }).data;
    }
    return [];
  },

  /**
   * دریافت لیست صفحه‌بندی‌شده گیمنت‌ها همراه با اطلاعات Pagination
   * GET /gamingCenters
   */
  async listGamingCentersPaginated(signal?: AbortSignal): Promise<{
    items: PublicGamingCenter[];
    meta?: import("@/types/customerApi").ApiMeta;
  }> {
    const response = await apiClient.get<unknown>(ENDPOINTS.gamingCenter.list, { signal });
    const raw = response.data;
    let items: PublicGamingCenter[] = [];
    if (Array.isArray(raw)) {
      items = raw as PublicGamingCenter[];
    } else if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
      items = (raw as { data: PublicGamingCenter[] }).data;
    }
    const meta = (raw && typeof raw === "object" && "meta" in raw)
      ? (raw as { meta?: import("@/types/customerApi").ApiMeta }).meta
      : response.meta;
    return {
      items,
      meta,
    };
  },

  /**
   * دریافت اطلاعات عمومی یک گیمنت بر اساس slug
   * GET /public/gamingCenters/{slug}
   */
  async getPublicGamingCenter(slug: string, signal?: AbortSignal): Promise<GamingCenterInfo> {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(slug).center;
    }
    const { data } = await apiClient.get<GamingCenterInfo>(ENDPOINTS.gamingCenter.detail(slug), {
      signal,
    });
    return data;
  },

  /**
   * دریافت اسلات‌های زمانی در دسترس
   * GET /public/gamingCenters/{slug}/availability/slots?date=...&stationId=...
   * پشتیبانی همزمان از آبجکت پارامتر Type-Safe یا آرگومان‌های پوزیشنی
   */
  async getAvailabilitySlots(
    paramsOrSlug: AvailabilitySlotsParams | string,
    legacyDate?: string,
    legacyStationId?: string,
    legacySignal?: AbortSignal
  ): Promise<AvailabilitySlot[]> {
    const isObjectParam = typeof paramsOrSlug === "object" && paramsOrSlug !== null;
    const slug = isObjectParam ? paramsOrSlug.slug : paramsOrSlug;
    const date = isObjectParam ? paramsOrSlug.date : (legacyDate as string);
    const stationId = isObjectParam ? paramsOrSlug.stationId : legacyStationId;
    const signal = isObjectParam ? paramsOrSlug.signal : legacySignal;

    validateAvailabilityParams({ slug, date, stationId });

    if (USE_MOCK_RESERVATIONS) {
      return buildMockAvailabilitySlots(date);
    }

    const query: Record<string, string> = { date };
    if (stationId) {
      query.stationId = stationId;
    }

    const { data } = await apiClient.get<unknown>(
      ENDPOINTS.gamingCenter.availabilitySlots(slug),
      {
        query,
        signal,
      }
    );
    return normalizeAvailabilitySlots(data);
  },

  /**
   * دریافت تعطیلات ثبت‌شده عمومی یک گیم‌نت بر اساس slug
   * GET /public/gamingCenters/{slug}/closures
   */
  async getPublicClosures(slug: string, signal?: AbortSignal): Promise<GamingCenterClosure[]> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.gamingCenter.publicClosures(slug),
        { signal }
      );
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.items)) return raw.items;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * دریافت برنامه‌کاری عمومی گیم‌نت بر اساس slug
   * GET /public/gamingCenters/{slug}/schedules
   */
  async getPublicSchedules(slug: string, signal?: AbortSignal): Promise<GamingCenterSchedule[]> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.gamingCenter.publicSchedules(slug),
        { signal }
      );
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.items)) return raw.items;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * بررسی هم‌پوشانی بازه زمانی انتخابی با تعطیلات ثبت‌شده گیم‌نت (findOverlappingClosures)
   */
  findOverlappingClosures(
    startTimeIso: string,
    endTimeIso: string,
    closures: GamingCenterClosure[]
  ): GamingCenterClosure[] {
    if (!closures || closures.length === 0) return [];
    const targetStart = new Date(startTimeIso).getTime();
    const targetEnd = new Date(endTimeIso).getTime();
    if (isNaN(targetStart) || isNaN(targetEnd)) return [];

    return closures.filter((c) => {
      const cStart = new Date(c.startDate).getTime();
      const cEnd = new Date(c.endDate).getTime();
      if (isNaN(cStart) || isNaN(cEnd)) return false;
      return targetStart < cEnd && targetEnd > cStart;
    });
  },

  /**
   * بررسی آیا یک تاریخ خاص (YYYY-MM-DD) شامل تعطیلی کامل است یا خیر
   */
  isDateFullyClosed(
    dateStr: string,
    closures: GamingCenterClosure[],
    closedDays?: number[],
    schedules?: GamingCenterSchedule[]
  ): { isClosed: boolean; reason?: string } {
    const d = new Date(dateStr + "T12:00:00Z");
    const utcDay = d.getUTCDay();
    const persianDayOfWeek = (utcDay + 1) % 7;

    if (closedDays && closedDays.includes(persianDayOfWeek)) {
      return { isClosed: true, reason: "تعطیلی هفتگی گیم‌نت" };
    }

    if (schedules && schedules.length > 0) {
      const daySchedule = schedules.find((s) => s.dayOfWeek === persianDayOfWeek);
      if (daySchedule && daySchedule.isClosed) {
        return { isClosed: true, reason: "تعطیلی هفتگی طبق زمان‌بندی" };
      }
    }

    if (closures && closures.length > 0) {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`).getTime();
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`).getTime();

      const matched = closures.find((c) => {
        const cStart = new Date(c.startDate).getTime();
        const cEnd = new Date(c.endDate).getTime();
        return dayStart < cEnd && dayEnd > cStart;
      });

      if (matched) {
        return {
          isClosed: true,
          reason: matched.title + (matched.reason ? ` (${matched.reason})` : ""),
        };
      }
    }

    return { isClosed: false };
  },

  /**
   * دریافت لیست ایستگاه‌های یک گیمنت
   * GET /gamingCenters/{id}/stations
   */
  async getStations(gamingCenterId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(gamingCenterId).stations;
    }
    const { data } = await apiClient.get<any>(
      ENDPOINTS.gamingCenter.stations(gamingCenterId),
      { signal }
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      if (Array.isArray(data.data)) return data.data;
      if (data.data && typeof data.data === "object" && Array.isArray(data.data.data)) {
        return data.data.data;
      }
      if (Array.isArray(data.stations)) return data.stations;
      if (Array.isArray(data.items)) return data.items;
    }
    return [];
  },

  /**
   * دریافت اطلاعات کامل یک گیمنت بر اساس ID
   * GET /gamingCenters/{id}
   */
  async getCenter(centerId: string, signal?: AbortSignal): Promise<GamingCenterInfo> {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(centerId).center;
    }

    const { data } = await apiClient.get<GamingCenterInfo>(
      ENDPOINTS.gamingCenter.detail(centerId),
      { signal }
    );

    return data;
  },

  /**
   * دریافت نظرات و امتیازات عمومی گیمنت
   * GET /public/gamingCenters/{slug}/ratings
   */
  async getPublicRatings(slug: string, signal?: AbortSignal): Promise<PublicRating[]> {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(slug).reviews as unknown as PublicRating[];
    }
    const { data } = await apiClient.get<PublicRating[]>(ENDPOINTS.gamingCenter.ratings(slug), { signal });
    return Array.isArray(data) ? data : [];
  },

  /**
   * دریافت مدیاها و تصاویر عمومی گیمنت
   * GET /public/gamingCenters/{slug}/media
   */
  async getPublicMedia(slug: string, signal?: AbortSignal): Promise<PublicMediaItem[]> {
    const { data } = await apiClient.get<PublicMediaItem[]>(ENDPOINTS.gamingCenter.media(slug), { signal });
    return Array.isArray(data) ? data : [];
  },

  /**
   * دریافت آدرس‌های ثبت شده گیمنت
   * GET /public/gamingCenters/{slug}/addresses
   */
  async getPublicAddresses(slug: string, signal?: AbortSignal): Promise<PublicAddress[]> {
    const { data } = await apiClient.get<PublicAddress[]>(ENDPOINTS.gamingCenter.addresses(slug), { signal });
    return Array.isArray(data) ? data : [];
  },

  /**
   * دریافت لینک‌های شبکه‌های اجتماعی گیمنت
   * GET /public/gamingCenters/{slug}/links
   */
  async getPublicLinks(slug: string, signal?: AbortSignal): Promise<PublicSocialLink[]> {
    const { data } = await apiClient.get<PublicSocialLink[]>(ENDPOINTS.gamingCenter.links(slug), { signal });
    return Array.isArray(data) ? data : [];
  },

  /**
   * دریافت صفحه استاتیک CMS مربوط به گیمنت
   * GET /public/gamingCenters/{slug}/pages/{pageSlug}
   */
  async getPublicPage(slug: string, pageSlug: string, signal?: AbortSignal): Promise<unknown> {
    const { data } = await apiClient.get(ENDPOINTS.gamingCenter.page(slug, pageSlug), { signal });
    return data;
  },

  /**
   * فیلتر پیشرفته یا جستجوی گیمنت در کاتالوگ با تخفیف، رتبه، شهر
   * در نسخه v1.0-LOCKED اندپوینتی برای این کار وجود ندارد.
   */
  filterCatalogUnsupported(): never {
    throw new ContractGapError(
      "GamingCenterCatalogFilter",
      "GET /gamingCenters does not support filtering by city, category, rating, or discounts in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * دریافت فهرست شهرهای سراسری یا مناطق (Provinces, Cities, Regions)
   * در نسخه v1.0-LOCKED هیچ اندپوینتی برای مدیریت یا دریافت لیست شهرها/مناطق وجود ندارد.
   */
  getCitiesUnsupported(): never {
    throw new ContractGapError(
      "CustomerCitiesList",
      "Global cities and regions listing endpoint is not defined in OpenAPI v1.0-LOCKED."
    );
  },
};
