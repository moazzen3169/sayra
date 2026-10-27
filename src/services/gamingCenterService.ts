import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

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
