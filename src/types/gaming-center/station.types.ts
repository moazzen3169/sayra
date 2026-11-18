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

export interface StationExtraController {
  id: string;
  stationId: string;
  gamingCenterId?: string;
  controllerType: string;
  quantity: number;
  availableQuantity?: number;
  hourlyPrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtraControllerConfigInput {
  controllerType: string;
  quantity: number;
  hourlyPrice: number;
  isActive?: boolean;
}

export interface ExtraControllerSelectionInput {
  extraControllerId: string;
  quantity: number;
}

export interface ReservationExtraController {
  id: string;
  reservationId?: string;
  extraControllerId?: string | null;
  controllerType: string;
  quantity: number;
  hourlyPrice: number;
  totalCost: number;
  createdAt?: string;
}

export interface StationExtraControllersResult {
  extraControllerEnabled?: boolean;
  extraControllers: StationExtraController[];
}

export interface PhysicalStation {
  id: string;
  gamingCenterId: string;
  name: string;
  stationType: string;
  deviceTypeId?: string | null;
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
  extraControllers?: StationExtraController[];
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
