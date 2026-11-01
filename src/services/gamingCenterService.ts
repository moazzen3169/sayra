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
} from "@/types/customerApi";

export type GamingCenterInfo = PublicGamingCenter;

export interface GameStationInfo extends GameStation {
  quantity?: number;
  deviceModel?: string;
  extraControllerPrice?: number;
  defaultControllers?: number;
  maxExtraControllers?: number;
}

export type { AvailabilitySlot };

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
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as PublicGamingCenter[];
    }
    return [];
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
   */
  async getAvailabilitySlots(
    slug: string,
    date: string,
    stationId?: string,
    signal?: AbortSignal
  ): Promise<AvailabilitySlot[]> {
    if (USE_MOCK_RESERVATIONS) {
      return buildMockAvailabilitySlots(date);
    }
    const { data } = await apiClient.get<AvailabilitySlot[]>(
      ENDPOINTS.gamingCenter.availabilitySlots(slug),
      {
        query: { date, stationId },
        signal,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  /**
   * دریافت لیست ایستگاه‌های یک گیمنت
   * GET /gamingCenters/{id}/stations
   */
  async getStations(gamingCenterId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(gamingCenterId).stations;
    }
    const { data } = await apiClient.get<GameStationInfo[]>(
      ENDPOINTS.gamingCenter.stations(gamingCenterId),
      { signal }
    );
    return Array.isArray(data) ? data : [];
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
