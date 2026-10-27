import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { getMockGamecenterDetail } from "@/lib/mocks/gamecenter.mock";
import type { GamecenterDetail, GamecenterReview } from "@/types/gamecenter";

export interface GamingCenterInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

export interface GameStationInfo {
  id: string;
  gamingCenterId: string;
  name: string;
  stationType: "PC" | "PLAYSTATION" | "XBOX" | "SWITCH" | "VR" | string;
  isVip?: boolean;
  hourlyPrice: number;
  minRentHours?: number;
  maxRentHours?: number;
  defaultDurationHours?: number;
  incrementMinutes?: number;
  isActive?: boolean;

  // ⚠️ فیلدهای زیر در OpenAPI فعلی (v1.0-LOCKED) وجود ندارند و نیازمند تأیید بک‌اند هستند.
  /** مدل دستگاه برای تفکیک PS5 / PS4 / BILLIARD؛ اگر نبود stationType استفاده می‌شود */
  deviceModel?: string;
  /** قیمت هر دسته‌ی اضافه (به ازای هر ساعت) که گیمنت تعیین می‌کند */
  extraControllerPrice?: number;
  /** تعداد دسته‌ی همراه هر کنسول */
  defaultControllers?: number;
  /** حداکثر دسته‌ی اضافه برای هر دستگاه */
  maxExtraControllers?: number;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime?: string;
  isAvailable?: boolean;
  status?: "AVAILABLE" | "UNAVAILABLE" | string;
}

export const gamingCenterService = {
  async getPublicGamingCenter(slug: string, signal?: AbortSignal): Promise<GamingCenterInfo> {
    const { data } = await apiClient.get<GamingCenterInfo>(ENDPOINTS.gamingCenter.detail(slug), {
      signal,
    });
    return data;
  },

  async getAvailabilitySlots(
    slug: string,
    date: string,
    stationId?: string,
    signal?: AbortSignal
  ): Promise<AvailabilitySlot[]> {
    const { data } = await apiClient.get<AvailabilitySlot[]>(
      ENDPOINTS.gamingCenter.availabilitySlots(slug),
      {
        query: { date, stationId },
        signal,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  async getStations(gamingCenterId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    const { data } = await apiClient.get<GameStationInfo[]>(
      ENDPOINTS.gamingCenter.stations(gamingCenterId),
      { signal }
    );
    return Array.isArray(data) ? data : [];
  },

  async getPublicRatings(slug: string, signal?: AbortSignal) {
    const { data } = await apiClient.get(ENDPOINTS.gamingCenter.ratings(slug), { signal });
    return data;
  },
};

export async function loadGamecenterDetail(
  slug: string,
  signal?: AbortSignal
): Promise<GamecenterDetail> {
  if (USE_MOCK_RESERVATIONS) {
    return getMockGamecenterDetail(slug);
  }

  try {
    const center = await gamingCenterService.getPublicGamingCenter(slug, signal);
    const stations = await gamingCenterService.getStations(center.id, signal);

    let reviews: GamecenterReview[] = [];
    try {
      const rawRatings = await gamingCenterService.getPublicRatings(slug, signal);
      if (Array.isArray(rawRatings)) {
        reviews = rawRatings;
      }
    } catch {
      reviews = [];
    }

    const mockDetail = getMockGamecenterDetail(slug);

    return {
      center,
      address: center.description || mockDetail.address,
      images: mockDetail.images,
      stations: stations.length > 0 ? stations : mockDetail.stations,
      reviews,
      games: mockDetail.games,
    };
  } catch (error) {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(slug);
    }
    throw error;
  }
}
