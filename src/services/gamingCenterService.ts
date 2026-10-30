import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { buildMockAvailabilitySlots, getMockGamecenterDetail } from "@/lib/mocks/gamecenter.mock";

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

  quantity?: number;
  deviceModel?: string;
  extraControllerPrice?: number;
  defaultControllers?: number;
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
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(slug).center;
    }
    try {
      const { data } = await apiClient.get<GamingCenterInfo>(ENDPOINTS.gamingCenter.detail(slug), {
        signal,
      });
      return data;
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) return getMockGamecenterDetail(slug).center;
      throw e;
    }
  },

  async getAvailabilitySlots(
    slug: string,
    date: string,
    stationId?: string,
    signal?: AbortSignal
  ): Promise<AvailabilitySlot[]> {
    if (USE_MOCK_RESERVATIONS) {
      return buildMockAvailabilitySlots(date);
    }
    try {
      const { data } = await apiClient.get<AvailabilitySlot[]>(
        ENDPOINTS.gamingCenter.availabilitySlots(slug),
        {
          query: { date, stationId },
          signal,
        }
      );
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) return buildMockAvailabilitySlots(date);
      throw e;
    }
  },

  async getStations(gamingCenterId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(gamingCenterId).stations;
    }
    try {
      const { data } = await apiClient.get<GameStationInfo[]>(
        ENDPOINTS.gamingCenter.stations(gamingCenterId),
        { signal }
      );
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) return getMockGamecenterDetail(gamingCenterId).stations;
      throw e;
    }
  },

  async getPublicRatings(slug: string, signal?: AbortSignal) {
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(slug).reviews;
    }
    try {
      const { data } = await apiClient.get(ENDPOINTS.gamingCenter.ratings(slug), { signal });
      return data;
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) return getMockGamecenterDetail(slug).reviews;
      throw e;
    }
  },
};
