import { apiClient, ApiError } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { TtlDedupeCache } from "@/lib/api/requestLimiter";
import { extractMediaUrl, normalizeMediaUrl } from "@/lib/media";
import type {
  CreateDeviceTypeInput,
  CreateGameCatalogInput,
  DeviceCatalogItem,
  DeviceCatalogQueryParams,
  DeviceTypeQueryParams,
  DynamicDeviceType,
  GameCatalogItem,
  GameCatalogQueryParams,
  UpdateDeviceTypeInput,
  UpdateGameCatalogInput,
} from "@/types/catalog";

const deviceListCache = new TtlDedupeCache<DeviceCatalogItem[]>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 30,
});

const deviceByIdCache = new TtlDedupeCache<DeviceCatalogItem>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 60,
});

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
    if (params?.page !== undefined) query.page = Math.max(1, params.page);
    if (params?.limit !== undefined) {
      query.limit = Math.min(Math.max(params.limit, 1), 100);
    }
    if (params?.deviceType) query.deviceType = params.deviceType;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const cacheKey = JSON.stringify(query);
    return deviceListCache.getOrFetch(
      cacheKey,
      async (internalSignal) => {
        const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.devices, {
          query,
          signal: internalSignal,
        });

        return unwrapListResponse<DeviceCatalogItem>(data);
      },
      signal
    );
  },

  /**
   * Get device from catalog by ID
   * GET /catalog/devices/{id}
   */
  async getDeviceById(id: string, signal?: AbortSignal): Promise<DeviceCatalogItem> {
    const cleanId = id.trim();
    return deviceByIdCache.getOrFetch(
      cleanId,
      async (internalSignal) => {
        const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.deviceById(cleanId), {
          signal: internalSignal,
        });
        return unwrapSingleResponse<DeviceCatalogItem>(data);
      },
      signal
    );
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
   * Browse game catalog with pagination metadata
   * GET /catalog/games
   */
  async listGamesPaginated(
    params?: GameCatalogQueryParams,
    signal?: AbortSignal
  ): Promise<{ items: GameCatalogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const requestedPage = params?.page ?? 1;
    const requestedLimit = params?.limit ?? 12;
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.platform) query.platform = params.platform;
    if (params?.genre) query.genre = params.genre;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const response = await apiClient.get<Record<string, unknown>>(
      ENDPOINTS.catalog.games,
      {
        query,
        signal,
      }
    );

    const resData = response.data as Record<string, unknown> | undefined;
    const rawItems = unwrapListResponse<GameCatalogItem>(resData);

    type PaginationShape = {
      total?: number;
      totalItems?: number;
      page?: number;
      limit?: number;
      pageSize?: number;
      totalPages?: number;
    };

    const metaObj = response.meta as Record<string, unknown> | undefined;
    const resMetaObj = resData?.meta as Record<string, unknown> | undefined;

    const candidates: Array<PaginationShape | undefined> = [
      resData?.pagination as PaginationShape | undefined,
      resMetaObj?.pagination as PaginationShape | undefined,
      resMetaObj as PaginationShape | undefined,
      metaObj?.pagination as PaginationShape | undefined,
      metaObj as PaginationShape | undefined,
      resData as PaginationShape | undefined,
    ];

    const pickNum = (key: keyof PaginationShape): number | undefined => {
      for (const c of candidates) {
        const val = c?.[key];
        if (typeof val === "number" && Number.isFinite(val)) return val;
      }
      return undefined;
    };

    const serverTotal = pickNum("total") ?? pickNum("totalItems");
    const serverTotalPages = pickNum("totalPages");
    const serverLimit = pickNum("limit") ?? pickNum("pageSize") ?? requestedLimit;
    const serverPage = pickNum("page") ?? requestedPage;

    // اگر سرور آرایه‌ای بزرگ‌تر از limit برگرداند و متادیتای صفحه‌بندی نفرستد، سمت کلاینت برش بزن
    if (serverTotal === undefined && serverTotalPages === undefined && rawItems.length > requestedLimit) {
      const total = rawItems.length;
      const totalPages = Math.max(1, Math.ceil(total / requestedLimit));
      const safePage = Math.min(Math.max(1, requestedPage), totalPages);
      const start = (safePage - 1) * requestedLimit;
      return {
        items: rawItems.slice(start, start + requestedLimit),
        total,
        page: safePage,
        limit: requestedLimit,
        totalPages,
      };
    }

    const total = serverTotal ?? rawItems.length;
    const totalPages = serverTotalPages ?? (Math.ceil(total / (serverLimit || 1)) || 1);

    return {
      items: rawItems,
      total,
      page: serverPage,
      limit: serverLimit,
      totalPages,
    };
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

    const response = await apiClient.get<{ pagination?: { total?: number; page?: number; limit?: number; totalPages?: number } }>(
      ENDPOINTS.catalog.adminDevices,
      {
        query,
        signal,
      }
    );

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
   * Upload image file for platform admin catalog (Platform Admin)
   * POST /platform-admin/media/upload
   */
  async uploadAdminMedia(file: File, signal?: AbortSignal): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiClient.post<unknown>(
      ENDPOINTS.platformAdmin.mediaUpload,
      fd,
      { signal }
    );
    const candidate = extractMediaUrl(data);
    if (!candidate) {
      throw new Error("آپلود تصویر با خطا مواجه شد.");
    }
    return normalizeMediaUrl(candidate);
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
    const { data } = await apiClient.post<unknown>(
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
    const { data } = await apiClient.get<unknown>(
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
    const { data } = await apiClient.patch<unknown>(
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

  /**
   * List all games in catalog (Platform Admin)
   * GET /platform-admin/catalog/games
   */
  async listAdminGames(
    params?: GameCatalogQueryParams,
    signal?: AbortSignal
  ): Promise<{ items: GameCatalogItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.platform) query.platform = params.platform;
    if (params?.genre) query.genre = params.genre;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const response = await apiClient.get<{ pagination?: { total?: number; page?: number; limit?: number; totalPages?: number } }>(
      ENDPOINTS.catalog.adminGames,
      {
        query,
        signal,
      }
    );

    const resData = response.data;
    const items = unwrapListResponse<GameCatalogItem>(resData);
    const pagination = resData?.pagination || response.meta?.pagination;
    const total = pagination?.total ?? items.length;
    const page = pagination?.page ?? (params?.page || 1);
    const limit = pagination?.limit ?? (params?.limit || 20);
    const totalPages = pagination?.totalPages ?? (Math.ceil(total / limit) || 1);

    return { items, total, page, limit, totalPages };
  },

  /**
   * Create new game in global catalog (Platform Admin)
   * POST /platform-admin/catalog/games
   */
  async createAdminGame(
    payload: CreateGameCatalogInput,
    signal?: AbortSignal
  ): Promise<GameCatalogItem> {
    const { data } = await apiClient.post<unknown>(
      ENDPOINTS.catalog.adminGames,
      payload,
      { signal }
    );
    return unwrapSingleResponse<GameCatalogItem>(data);
  },

  /**
   * Update game in catalog (Platform Admin)
   * PATCH /platform-admin/catalog/games/{id}
   */
  async updateAdminGame(
    id: string,
    payload: UpdateGameCatalogInput,
    signal?: AbortSignal
  ): Promise<GameCatalogItem> {
    const { data } = await apiClient.patch<unknown>(
      ENDPOINTS.catalog.adminGameById(id),
      payload,
      { signal }
    );
    return unwrapSingleResponse<GameCatalogItem>(data);
  },

  /**
   * Soft-delete game in catalog (Platform Admin)
   * DELETE /platform-admin/catalog/games/{id}
   */
  async deleteAdminGame(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(ENDPOINTS.catalog.adminGameById(id), { signal });
  },

  /* =========================================================================
     Device Types Endpoints (/catalog/device-types & /platform-admin/catalog/device-types)
     ========================================================================= */

  /**
   * List all active device types (public / gaming center manager)
   * GET /catalog/device-types
   */
  async listDeviceTypes(
    params?: DeviceTypeQueryParams,
    signal?: AbortSignal
  ): Promise<DynamicDeviceType[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.category) query.category = params.category;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.search) query.search = params.search;

    const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.deviceTypes, {
      query,
      signal,
    });
    return unwrapListResponse<DynamicDeviceType>(data);
  },

  /**
   * Get device type by ID (public / gaming center manager)
   * GET /catalog/device-types/{id}
   */
  async getDeviceTypeById(id: string, signal?: AbortSignal): Promise<DynamicDeviceType> {
    const { data } = await apiClient.get<unknown>(ENDPOINTS.catalog.deviceTypeById(id), {
      signal,
    });
    return unwrapSingleResponse<DynamicDeviceType>(data);
  },

  /**
   * List device types (Platform Admin)
   * GET /platform-admin/catalog/device-types (fallback to /platform-admin/device-types on 404)
   */
  async listAdminDeviceTypes(
    params?: DeviceTypeQueryParams,
    signal?: AbortSignal
  ): Promise<{ items: DynamicDeviceType[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.category) query.category = params.category;
    if (params?.isActive !== undefined) query.isActive = params.isActive;
    if (params?.extraControllerEnabled !== undefined) {
      query.extraControllerEnabled = params.extraControllerEnabled;
    }
    if (params?.search) query.search = params.search;

    let response;
    try {
      response = await apiClient.get<{ pagination?: { total?: number; page?: number; limit?: number; totalPages?: number } }>(
        ENDPOINTS.catalog.adminDeviceTypes,
        { query, signal, authScope: "admin" }
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        response = await apiClient.get<{ pagination?: { total?: number; page?: number; limit?: number; totalPages?: number } }>(
          ENDPOINTS.catalog.adminPlatformDeviceTypes,
          { query, signal, authScope: "admin" }
        );
      } else {
        throw err;
      }
    }

    const resData = response.data;
    const items = unwrapListResponse<DynamicDeviceType>(resData);
    const pagination = resData?.pagination || response.meta?.pagination;
    const total = pagination?.total ?? items.length;
    const page = pagination?.page ?? (params?.page || 1);
    const limit = pagination?.limit ?? (params?.limit || 20);
    const totalPages = pagination?.totalPages ?? (Math.ceil(total / limit) || 1);

    return { items, total, page, limit, totalPages };
  },

  /**
   * Create new dynamic device type (Platform Admin)
   * POST /platform-admin/catalog/device-types
   */
  async createAdminDeviceType(
    payload: CreateDeviceTypeInput,
    signal?: AbortSignal
  ): Promise<DynamicDeviceType> {
    try {
      const { data } = await apiClient.post<unknown>(
        ENDPOINTS.catalog.adminDeviceTypes,
        payload,
        { signal, authScope: "admin" }
      );
      return unwrapSingleResponse<DynamicDeviceType>(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        const { data } = await apiClient.post<unknown>(
          ENDPOINTS.catalog.adminPlatformDeviceTypes,
          payload,
          { signal, authScope: "admin" }
        );
        return unwrapSingleResponse<DynamicDeviceType>(data);
      }
      throw err;
    }
  },

  /**
   * Update device type (Platform Admin)
   * PATCH /platform-admin/catalog/device-types/{id}
   */
  async updateAdminDeviceType(
    id: string,
    payload: UpdateDeviceTypeInput,
    signal?: AbortSignal
  ): Promise<DynamicDeviceType> {
    try {
      const { data } = await apiClient.patch<unknown>(
        ENDPOINTS.catalog.adminDeviceTypeById(id),
        payload,
        { signal, authScope: "admin" }
      );
      return unwrapSingleResponse<DynamicDeviceType>(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        const { data } = await apiClient.patch<unknown>(
          ENDPOINTS.catalog.adminPlatformDeviceTypeById(id),
          payload,
          { signal, authScope: "admin" }
        );
        return unwrapSingleResponse<DynamicDeviceType>(data);
      }
      throw err;
    }
  },

  /**
   * Delete device type (Platform Admin)
   * DELETE /platform-admin/catalog/device-types/{id}
   */
  async deleteAdminDeviceType(id: string, signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.delete(ENDPOINTS.catalog.adminDeviceTypeById(id), {
        signal,
        authScope: "admin",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        await apiClient.delete(ENDPOINTS.catalog.adminPlatformDeviceTypeById(id), {
          signal,
          authScope: "admin",
        });
        return;
      }
      throw err;
    }
  },
};
