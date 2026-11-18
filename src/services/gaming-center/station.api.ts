import { apiClient, type Query } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  PhysicalStation,
  PhysicalStationsFilter,
  PhysicalStationsPaginationMeta,
  StationExtraController,
} from "@/types/gaming-center/station.types";

export interface GetStationsResult {
  stations: PhysicalStation[];
  meta: PhysicalStationsPaginationMeta;
}

export const stationApi = {
  /**
   * دریافت دستگاه‌های فیزیکی یک گیمنت
   * GET /api/v1/public/gamingCenters/:gamingCenterSlug/stations
   */
  async getPhysicalStations(
    gamingCenterSlug: string,
    filter: PhysicalStationsFilter = {},
    signal?: AbortSignal
  ): Promise<GetStationsResult> {
    if (!gamingCenterSlug?.trim()) {
      throw new Error("اسلاگ گیمنت نامعتبر است.");
    }

    const query: Query = {};

    // For catalog-backed category, send catalogDeviceId
    if (filter.catalogDeviceId !== undefined && filter.catalogDeviceId !== null) {
      query.catalogDeviceId = filter.catalogDeviceId;
    } else if (filter.stationType !== undefined && filter.stationType !== null) {
      // For category with catalogId: null, send stationType (never send catalogDeviceId=null)
      query.stationType = filter.stationType;
    }

    if (filter.type) query.type = filter.type;
    if (filter.page !== undefined) query.page = filter.page;
    if (filter.limit !== undefined) {
      query.limit = Math.min(Math.max(filter.limit, 1), 100);
    }
    if (filter.sortBy) query.sortBy = filter.sortBy;
    if (filter.sortOrder) query.sortOrder = filter.sortOrder;
    if (filter.minPrice !== undefined) query.minPrice = filter.minPrice;
    if (filter.maxPrice !== undefined) query.maxPrice = filter.maxPrice;
    if (filter.isVip !== undefined) query.isVip = filter.isVip;
    if (filter.search?.trim()) query.search = filter.search.trim();

    const response = await apiClient.get<unknown>(
      ENDPOINTS.gamingCenter.publicStations(gamingCenterSlug.trim()),
      {
        query,
        signal,
      }
    );

    const resData = response.data;

    let stationsList: PhysicalStation[] = [];
    let meta: PhysicalStationsPaginationMeta = {
      page: filter.page ?? 1,
      limit: filter.limit ?? 10,
      total: 0,
      totalPages: 0,
    };

    // Unwrapping nested responses:
    // Format 1: { data: { data: [...], meta: { page, limit, total, totalPages } } }
    // Format 2: { data: [...], meta: { page, limit, total, totalPages } }
    // Format 3: Array direct
    if (resData && typeof resData === "object") {
      const rec = resData as Record<string, unknown>;
      if (Array.isArray(rec.data)) {
        stationsList = rec.data as PhysicalStation[];
        if (rec.meta && typeof rec.meta === "object") {
          const m = rec.meta as Record<string, unknown>;
          meta = {
            page: typeof m.page === "number" ? m.page : meta.page,
            limit: typeof m.limit === "number" ? m.limit : meta.limit,
            total: typeof m.total === "number" ? m.total : stationsList.length,
            totalPages: typeof m.totalPages === "number" ? m.totalPages : Math.ceil(stationsList.length / meta.limit) || 1,
          };
        }
      } else if (Array.isArray(resData)) {
        stationsList = resData as PhysicalStation[];
        meta.total = stationsList.length;
        meta.totalPages = Math.ceil(stationsList.length / meta.limit) || 1;
      }
    }

    if (response.meta?.pagination) {
      const p = response.meta.pagination;
      meta.page = p.page ?? meta.page;
      meta.limit = p.limit ?? p.pageSize ?? meta.limit;
      meta.total = p.total ?? p.totalItems ?? meta.total;
      meta.totalPages = p.totalPages ?? meta.totalPages;
    }

    // Public endpoint only shows active stations; ensure inactive ones are excluded safely
    const activeStations = stationsList.filter((s) => s.isActive !== false);

    return {
      stations: activeStations,
      meta,
    };
  },

  /**
   * دریافت دسته‌های اضافی موجود برای یک دستگاه در بازه زمانی مشخص
   * GET /public/gamingCenters/{gamingCenterSlug}/stations/{stationId}/extra-controllers
   */
  async getStationExtraControllers(
    gamingCenterSlug: string,
    stationId: string,
    params?: { startTime?: string; endTime?: string },
    signal?: AbortSignal
  ): Promise<StationExtraController[]> {
    if (!gamingCenterSlug?.trim() || !stationId?.trim()) {
      return [];
    }

    const query: Query = {};
    if (params?.startTime) query.startTime = params.startTime;
    if (params?.endTime) query.endTime = params.endTime;

    const response = await apiClient.get<unknown>(
      ENDPOINTS.gamingCenter.stationExtraControllers(
        gamingCenterSlug.trim(),
        stationId.trim()
      ),
      {
        query: Object.keys(query).length > 0 ? query : undefined,
        signal,
      }
    );

    const resData = response.data;
    const payload =
      resData && typeof resData === "object" && "data" in resData && (resData as { data?: unknown }).data !== undefined
        ? (resData as { data: unknown }).data
        : resData;

    let list: StationExtraController[] = [];
    if (Array.isArray(payload)) {
      list = payload as StationExtraController[];
    } else if (payload && typeof payload === "object") {
      const rec = payload as Record<string, unknown>;
      if (Array.isArray(rec.extraControllers)) {
        list = rec.extraControllers as StationExtraController[];
      } else if (Array.isArray(rec.items)) {
        list = rec.items as StationExtraController[];
      } else if (Array.isArray(rec.data)) {
        list = rec.data as StationExtraController[];
      }
    }

    return list.filter((c) => c && c.id && c.isActive !== false);
  },
};
