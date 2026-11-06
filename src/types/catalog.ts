/**
 * Catalog Data Types
 * Matches Central Hardware Device and Video Game Catalogs (Playnest / Sayra API)
 */

export type DeviceType = "PC" | "PLAYSTATION" | "XBOX" | "SWITCH" | "VR" | string;

export interface DeviceCatalogItem {
  id: string;
  name: string;
  deviceType: DeviceType;
  coverImageUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameCatalogItem {
  id: string;
  title: string;
  coverImageUrl?: string | null;
  supportedPlatforms: DeviceType[];
  genre?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeviceCatalogQueryParams {
  page?: number;
  limit?: number;
  deviceType?: DeviceType;
  isActive?: boolean;
  search?: string;
}

export interface CreateDeviceCatalogInput {
  name: string;
  deviceType?: DeviceType;
  coverImageUrl: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDeviceCatalogInput {
  name?: string;
  deviceType?: DeviceType;
  coverImageUrl?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateStationsFromCatalogInput {
  catalogDeviceId: string;
  quantity: number;
  hourlyPrice: number;
  customNamePrefix?: string;
  isVip?: boolean;
  minRentHours?: number;
  maxRentHours?: number;
  defaultDurationHours?: number;
  incrementMinutes?: number;
}

export interface AddGamesFromCatalogInput {
  gameCatalogIds: string[];
}

export interface GameCatalogQueryParams {
  page?: number;
  limit?: number;
  platform?: DeviceType;
  genre?: string;
  isActive?: boolean;
  search?: string;
}
