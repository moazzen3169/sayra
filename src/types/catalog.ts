/**
 * Catalog Data Types
 * Matches Central Hardware Device and Video Game Catalogs (Playnest / Sayra API)
 */

export type DeviceTypeCategory =
  | "PC"
  | "PLAYSTATION"
  | "PLAYSTATION 4"
  | "PLAYSTATION 5"
  | "XBOX"
  | "SWITCH"
  | "VR";
export type DeviceType = DeviceTypeCategory | string;

export interface DynamicDeviceType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  category: DeviceTypeCategory | string;
  isActive: boolean;
  extraControllerEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceTypeQueryParams {
  page?: number;
  limit?: number;
  category?: DeviceTypeCategory | string;
  isActive?: boolean;
  extraControllerEnabled?: boolean;
  search?: string;
}

export interface CreateDeviceTypeInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  category?: DeviceTypeCategory | string;
  isActive?: boolean;
  extraControllerEnabled?: boolean;
}

export interface UpdateDeviceTypeInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  category?: DeviceTypeCategory | string;
  isActive?: boolean;
  extraControllerEnabled?: boolean;
}

export interface DeviceCatalogItem {
  id: string;
  name: string;
  deviceType: DeviceType;
  deviceTypeId?: string | null;
  deviceTypeRef?: DynamicDeviceType | null;
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

export interface CreateGameCatalogInput {
  title: string;
  coverImageUrl?: string;
  supportedPlatforms: DeviceType[];
  genre?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateGameCatalogInput {
  title?: string;
  coverImageUrl?: string | null;
  supportedPlatforms?: DeviceType[];
  genre?: string | null;
  description?: string | null;
  isActive?: boolean;
}
