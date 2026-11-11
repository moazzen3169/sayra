/**
 * Types for GameNet Physical Stations
 * Based on GET /api/v1/public/gamingCenters/:gamingCenterSlug/stations
 */

export interface StationPricing {
  originalPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  finalPrice?: number;
  hasDiscount?: boolean;
  durationHours?: number;
}

export interface PhysicalStation {
  id: string;
  gamingCenterId: string;
  name: string;
  stationType: string;
  catalogDeviceId: string | null;
  coverImageUrl: string | null;
  hourlyPrice: number;
  minRentHours: number;
  maxRentHours: number;
  defaultDurationHours: number;
  incrementMinutes: number;
  isVip: boolean;
  isActive: boolean;
  extraControllerPrice?: number;
  defaultControllers?: number;
  maxExtraControllers?: number;
  pricing?: StationPricing | null;
}

export interface PhysicalStationsFilter {
  catalogDeviceId?: string;
  stationType?: string;
  type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "ASC" | "DESC";
  minPrice?: number;
  maxPrice?: number;
  isVip?: boolean;
  search?: string;
}

export interface PhysicalStationsPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PhysicalStationsResponseData {
  data: PhysicalStation[];
  meta: PhysicalStationsPaginationMeta;
}
