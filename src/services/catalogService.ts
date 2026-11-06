import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  DeviceCatalogItem,
  DeviceCatalogQueryParams,
  GameCatalogItem,
  GameCatalogQueryParams,
} from "@/types/catalog";

function unwrapListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }
    if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).data)) {
      return (obj.data as Record<string, unknown>).data as T[];
    }
    if (Array.isArray(obj.items)) {
      return obj.items as T[];
    }
  }
  return [];
}

function unwrapSingleResponse<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if ("data" in obj && obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      return obj.data as T;
    }
  }
  return payload as T;
}

export const catalogService = {
  /**
   * Browse device catalog (public / gaming center manager)
   * GET /catalog/devices
   */
  async listDevices(
    params?: DeviceCatalogQueryParams,
    signal?: AbortSignal
  ): Promise<DeviceCatalogItem[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.deviceType) query.deviceType = params.deviceType;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.devices, {
      query,
      signal,
    });

    return unwrapListResponse<DeviceCatalogItem>(data);
  },

  /**
   * Get device from catalog by ID
   * GET /catalog/devices/{id}
   */
  async getDeviceById(id: string, signal?: AbortSignal): Promise<DeviceCatalogItem> {
    const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.deviceById(id), {
      signal,
    });
    return unwrapSingleResponse<DeviceCatalogItem>(data);
  },

  /**
   * Browse game catalog (public / gaming center manager)
   * GET /catalog/games
   */
  async listGames(
    params?: GameCatalogQueryParams,
    signal?: AbortSignal
  ): Promise<GameCatalogItem[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.platform) query.platform = params.platform;
    if (params?.genre) query.genre = params.genre;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.games, {
      query,
      signal,
    });

    return unwrapListResponse<GameCatalogItem>(data);
  },

  /**
   * Get game from catalog by ID
   * GET /catalog/games/{id}
   */
  async getGameById(id: string, signal?: AbortSignal): Promise<GameCatalogItem> {
    const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.gameById(id), {
      signal,
    });
    return unwrapSingleResponse<GameCatalogItem>(data);
  },

  /* =========================================================================
     Platform Admin Catalog Endpoints (/platform-admin/catalog/*)
     ========================================================================= */

  /**
   * List all devices in catalog (Platform Admin)
   * GET /platform-admin/catalog/devices
   */
  async listAdminDevices(
    params?: DeviceCatalogQueryParams,
    signal?: AbortSignal
  ): Promise<{ items: DeviceCatalogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.deviceType) query.deviceType = params.deviceType;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const response = await apiClient.get<any>(ENDPOINTS.catalog.adminDevices, {
      query,
      signal,
    });

    const resData = response.data;
    const items = unwrapListResponse<DeviceCatalogItem>(resData);
    const pagination = resData?.pagination || response.meta?.pagination;
    const total = pagination?.total ?? items.length;
    const page = pagination?.page ?? (params?.page || 1);
    const limit = pagination?.limit ?? (params?.limit || 20);
    const totalPages = pagination?.totalPages ?? (Math.ceil(total / limit) || 1);

    return { items, total, page, limit, totalPages };
  },

  /**
   * Create new device in global catalog (Platform Admin)
   * POST /platform-admin/catalog/devices
   */
  async createAdminDevice(
    payload: {
      name: string;
      deviceType?: string;
      coverImageUrl: string;
      description?: string;
      isActive?: boolean;
    },
    signal?: AbortSignal
  ): Promise<DeviceCatalogItem> {
    const { data } = await apiClient.post<any>(
      ENDPOINTS.catalog.adminDevices,
      payload,
      { signal }
    );
    return unwrapSingleResponse<DeviceCatalogItem>(data);
  },

  /**
   * Get device from catalog by ID (Platform Admin)
   * GET /platform-admin/catalog/devices/{id}
   */
  async getAdminDeviceById(id: string, signal?: AbortSignal): Promise<DeviceCatalogItem> {
    const { data } = await apiClient.get<any>(
      ENDPOINTS.catalog.adminDeviceById(id),
      { signal }
    );
    return unwrapSingleResponse<DeviceCatalogItem>(data);
  },

  /**
   * Update device in catalog (Platform Admin)
   * PATCH /platform-admin/catalog/devices/{id}
   */
  async updateAdminDevice(
    id: string,
    payload: {
      name?: string;
      deviceType?: string;
      coverImageUrl?: string;
      description?: string | null;
      isActive?: boolean;
    },
    signal?: AbortSignal
  ): Promise<DeviceCatalogItem> {
    const { data } = await apiClient.patch<any>(
      ENDPOINTS.catalog.adminDeviceById(id),
      payload,
      { signal }
    );
    return unwrapSingleResponse<DeviceCatalogItem>(data);
  },

  /**
   * Soft-delete device in catalog (Platform Admin)
   * DELETE /platform-admin/catalog/devices/{id}
   */
  async deleteAdminDevice(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(ENDPOINTS.catalog.adminDeviceById(id), { signal });
  },
};
