import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { extractMediaItems, extractMediaUrl, normalizeMediaUrl } from "@/lib/media";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type {
  CenterSettings,
  CommissionListParams,
  CommissionListResult,
  CreateBranchAddressPayload,
  CreateGamingCenterPayload,
  CreateLinkPayload,
  Earning,
  MediaItem,
  OwnerAnalyticsSummary,
  OwnerMe,
  OwnerRating,
  OwnerReservation,
  PublicCenter,
  SiteSettings,
  StationInput,
  Ticket,
} from "@/types/owner";

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * استخراج امن مقادیر مالی و عددی دارای اسامی استاندارد
 */
export function pickNumber(obj: unknown, keys: string[]): number | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) {
      const parsed = Number(v);
      if (isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export const ownerService = {
  async getMe(signal?: AbortSignal): Promise<OwnerMe> {
    const response = await apiClient.get<any>(ENDPOINTS.owner.me, { signal });
    const raw = response.data;
    // Resilient parsing: data might be directly in raw or raw.data
    const profile: any = raw?.data && typeof raw.data === "object" ? raw.data : raw;

    // Normalize user identity and gamingCenterId
    const resolvedId = profile?.id || profile?.actorId || "";
    const resolvedGamingCenterId = profile?.gamingCenterId || profile?.centerId || "";
    const actorType = profile?.actorType?.toUpperCase();

    // Determine normalized role accurately:
    // If actorType is CUSTOMER, role MUST be CUSTOMER (not defaulted to MANAGER)
    // If profile.role is explicitly provided, use it
    // If actorType is USER or gamingCenterId is present, default to MANAGER, otherwise CUSTOMER
    let resolvedRole = profile?.role;
    if (!resolvedRole) {
      if (actorType === "CUSTOMER") {
        resolvedRole = "CUSTOMER";
      } else if (actorType === "USER" || Boolean(resolvedGamingCenterId)) {
        resolvedRole = "MANAGER";
      } else {
        resolvedRole = "CUSTOMER";
      }
    }

    return {
      ...profile,
      id: resolvedId,
      actorId: profile?.actorId || resolvedId,
      actorType: profile?.actorType,
      sessionId: profile?.sessionId,
      role: resolvedRole,
      gamingCenterId: resolvedGamingCenterId || undefined,
      gamingCenters: Array.isArray(profile?.gamingCenters) ? profile.gamingCenters : undefined,
    };
  },

  /**
   * ایجاد گیم‌نت جدید مطابق OpenAPI:
   * POST /gamingCenters
   * فیلدهای الزامی: name, slug, ownerId
   * فیلد اختیاری: games (آرایه‌ای از رشته‌ها)
   */
  async createGamingCenter(
    payload: CreateGamingCenterPayload,
    signal?: AbortSignal
  ): Promise<{ id: string; name: string; slug: string }> {
    const body: Record<string, unknown> = {
      name: payload.name.trim(),
      slug: payload.slug.trim(),
      ownerId: payload.ownerId.trim(),
    };
    if (Array.isArray(payload.games) && payload.games.length > 0) {
      body.games = payload.games.filter(Boolean);
    }

    const response = await apiClient.post<any>(ENDPOINTS.owner.centers, body, { signal });
    const resData = response.data;

    let createdId = "";
    let createdName = payload.name;
    let createdSlug = payload.slug;

    if (resData && typeof resData === "object") {
      if (resData.id) createdId = String(resData.id);
      else if (resData.data?.id) createdId = String(resData.data.id);
      else if (resData.gamingCenter?.id) createdId = String(resData.gamingCenter.id);

      if (resData.name) createdName = String(resData.name);
      else if (resData.data?.name) createdName = String(resData.data.name);

      if (resData.slug) createdSlug = String(resData.slug);
      else if (resData.data?.slug) createdSlug = String(resData.data.slug);
    }

    return {
      id: createdId || createdSlug,
      name: createdName,
      slug: createdSlug,
    };
  },

  /**
   * ثبت آدرس شعبه برای گیم‌نت:
   * POST /gamingCenters/{gamingCenterId}/addresses
   * فیلدهای الزامی سرور: city, addressLine (و address برای سازگاری با OpenAPI)
   */
  async createAddress(
    gamingCenterId: string,
    payload: CreateBranchAddressPayload,
    signal?: AbortSignal
  ): Promise<void> {
    const rawAddress = payload.addressLine?.trim() || payload.address?.trim() || "";
    if (!rawAddress) {
      throw new Error("آدرس وارد نشده است.");
    }
    const rawCity = payload.city?.trim() || "";
    if (!rawCity) {
      throw new Error("شهر وارد نشده است.");
    }

    const body: Record<string, unknown> = {
      // سرور فیلدهای city و addressLine را الزامی می‌داند، در حالی که در برخی نسخه‌های OpenAPI نام فیلد address آمده است.
      // برای سازگاری کامل دوطرفه، هر دو فیلد addressLine و address ارسال می‌شوند.
      city: rawCity,
      addressLine: rawAddress,
      address: payload.address?.trim() || rawAddress,
    };
    if (payload.province?.trim()) body.province = payload.province.trim();
    if (payload.phone?.trim()) body.phone = payload.phone.trim();
    if (payload.postalCode?.trim()) body.postalCode = payload.postalCode.trim();
    if (typeof payload.lat === "number" && !isNaN(payload.lat)) body.lat = payload.lat;
    if (typeof payload.lng === "number" && !isNaN(payload.lng)) body.lng = payload.lng;

    await apiClient.post(ENDPOINTS.owner.addresses(gamingCenterId), body, { signal });
  },

  /**
   * همگام‌سازی آدرس و تلفن در موجودیت گیم‌نت (در صورت نیاز):
   * PATCH /gamingCenters/{id}
   */
  async patchCenter(
    gamingCenterId: string,
    payload: { name?: string; address?: string; phone?: string },
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.patch(ENDPOINTS.owner.center(gamingCenterId), payload, { signal });
  },

  /**
   * ثبت لینک وبسایت یا شبکه‌های اجتماعی برای گیم‌نت:
   * POST /gamingCenters/{gamingCenterId}/links
   * فیلدهای الزامی: platform, url
   */
  async createLink(
    gamingCenterId: string,
    payload: CreateLinkPayload,
    signal?: AbortSignal
  ): Promise<void> {
    const body = {
      platform: payload.platform.trim(),
      url: payload.url.trim(),
    };
    await apiClient.post(ENDPOINTS.owner.links(gamingCenterId), body, { signal });
  },

  async listCenters(signal?: AbortSignal): Promise<PublicCenter[]> {
    try {
      const response = await apiClient.get<any>(ENDPOINTS.owner.centers, {
        query: { page: 1, pageSize: 100, limit: 100 },
        signal,
      });
      const resData = response.data;

      // Handle raw array
      if (Array.isArray(resData)) {
        return resData as PublicCenter[];
      }
      // Handle { data: [...] } or { data: { data: [...] } }
      if (resData && typeof resData === "object") {
        if (Array.isArray(resData.data)) {
          return resData.data as PublicCenter[];
        }
        if (resData.data && typeof resData.data === "object" && Array.isArray(resData.data.data)) {
          return resData.data.data as PublicCenter[];
        }
      }

      return asArray<PublicCenter>(resData);
    } catch (err) {
      throw err;
    }
  },

  /** دریافت مشخصات مرکز بر اساس شناسه یا اسلاگ */
  async findCenter(id: string, signal?: AbortSignal): Promise<PublicCenter | null> {
    if (!id) return null;
    try {
      // ابتدا تلاش مستقیم برای واکشی مرکز با شناسه
      try {
        const direct = await apiClient.get<any>(ENDPOINTS.owner.center(id), { signal });
        const resData = direct.data;
        const centerObj: any = resData?.data && typeof resData.data === "object" && !Array.isArray(resData.data)
          ? resData.data
          : resData;

        if (centerObj && (centerObj.id || centerObj.name)) {
          return {
            id: centerObj.id || id,
            name: centerObj.name || "گیم‌نت",
            slug: centerObj.slug || id,
            description: centerObj.description,
            isActive: centerObj.isActive ?? true,
            pcCount: centerObj.pcCount,
            consoleCount: centerObj.consoleCount,
            is_open: centerObj.is_open,
            hourlyRate: centerObj.hourlyRate,
            raiting: centerObj.raiting,
            comment_count: centerObj.comment_count,
            addresses: centerObj.addresses,
          };
        }
      } catch {
        // Fallback to listCenters
      }

      const centers = await ownerService.listCenters(signal);
      return centers.find((c) => c.id === id || c.slug === id) ?? null;
    } catch (err) {
      throw err;
    }
  },

  /** دریافت آدرس‌های ثبت شده مرکز */
  async listAddresses(centerId: string, signal?: AbortSignal): Promise<Array<{ id?: string; address: string; city?: string; phone?: string }>> {
    if (!centerId) return [];
    try {
      const res = await apiClient.get<unknown>(ENDPOINTS.owner.addresses(centerId), { signal });
      return asArray<any>(res.data);
    } catch {
      return [];
    }
  },

  /**
   * دریافت لیست رزروهای گیم‌نت به صورت صفحه‌بندی‌شده و منطبق با Pagination Envelope اوپن‌ای‌پی‌آی
   */
  async listReservations(
    centerId: string,
    options?: { page?: number; pageSize?: number; status?: string; signal?: AbortSignal }
  ): Promise<OwnerReservation[]> {
    const pageResult = await ownerService.listReservationsPaginated(centerId, options);
    return pageResult.items;
  },

  async listReservationsPaginated(
    centerId: string,
    options?: { page?: number; pageSize?: number; status?: string; signal?: AbortSignal }
  ): Promise<{ items: OwnerReservation[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const requestedPage = options?.page ?? 1;
    const requestedPageSize = options?.pageSize ?? 50;
    const statusFilter = options?.status && options.status !== "ALL" ? options.status : undefined;

    const query: Record<string, string | number> = {
      page: requestedPage,
      pageSize: requestedPageSize,
    };
    if (statusFilter) {
      query.status = statusFilter;
    }

    const response = await apiClient.get<unknown>(ENDPOINTS.owner.reservations(centerId), {
      query,
      signal: options?.signal,
    });

    const resData = response.data;
    let items: OwnerReservation[] = [];
    let total = 0;
    let page = requestedPage;
    let pageSize = requestedPageSize;
    let totalPages = 1;

    // OpenAPI schema for /gamingCenters/{id}/reservation is Pagination schema:
    // { success: true, data: Array, meta: { pagination: { total, totalItems, page, pageSize, totalPages } } }
    if (Array.isArray(resData)) {
      items = resData as OwnerReservation[];
      total = items.length;
    } else if (resData && typeof resData === "object") {
      const rec = resData as Record<string, unknown>;
      if (Array.isArray(rec.data)) {
        items = rec.data as OwnerReservation[];
      }
      const pagination = (rec.meta as any)?.pagination ?? response.meta?.pagination;
      if (pagination) {
        total = pagination.total ?? pagination.totalItems ?? items.length;
        page = pagination.page ?? requestedPage;
        pageSize = pagination.pageSize ?? pagination.limit ?? requestedPageSize;
        totalPages = pagination.totalPages ?? (Math.ceil(total / (pageSize || 1)) || 1);
      } else {
        total = items.length;
      }
    }

    if (response.meta?.pagination) {
      const p = response.meta.pagination;
      total = p.total ?? p.totalItems ?? total;
      page = p.page ?? page;
      pageSize = p.pageSize ?? p.limit ?? pageSize;
      totalPages = p.totalPages ?? totalPages;
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * دریافت مشخصات رزرو بر اساس شناسه از اندپوینت رسمی اوپن‌ای‌پی‌آی
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}
   */
  async getReservation(centerId: string, reservationId: string, signal?: AbortSignal): Promise<OwnerReservation> {
    const { data } = await apiClient.get<OwnerReservation | { success?: boolean; data?: OwnerReservation }>(
      ENDPOINTS.owner.reservationDetail(centerId, reservationId),
      { signal }
    );

    if (data && typeof data === "object" && "stationId" in data) {
      return data as OwnerReservation;
    }
    if (data && typeof data === "object" && "data" in data && (data as any).data) {
      return (data as any).data as OwnerReservation;
    }
    return data as OwnerReservation;
  },

  /**
   * تایید رزرو در انتظار:
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/confirm
   */
  async confirmReservation(centerId: string, reservationId: string): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.confirmReservation(centerId, reservationId),
      {}
    );
    return data;
  },

  /**
   * لغو رزرو به همراه دلیل:
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/cancel
   */
  async cancelReservation(
    centerId: string,
    reservationId: string,
    reason?: string
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.cancelReservation(centerId, reservationId),
      reason ? { reason } : {}
    );
    return data;
  },

  /**
   * تغییر زمان رزرو:
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/reschedule
   */
  async rescheduleReservation(
    centerId: string,
    reservationId: string,
    payload: { startTime: string; endTime: string }
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.rescheduleReservation(centerId, reservationId),
      payload
    );
    return data;
  },

  /**
   * شروع رزرو فعال:
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/start
   */
  async startReservation(centerId: string, reservationId: string): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.startReservation(centerId, reservationId),
      {}
    );
    return data;
  },

  /**
   * تکمیل رزرو:
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/complete
   */
  async completeReservation(centerId: string, reservationId: string): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.completeReservation(centerId, reservationId),
      {}
    );
    return data;
  },

  /**
   * ثبت عدم مراجعه مشتری (No-Show):
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/no-show
   */
  async noShowReservation(centerId: string, reservationId: string): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.noShowReservation(centerId, reservationId),
      {}
    );
    return data;
  },

  /**
   * ارسال پیشنهاد زمان جدید
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/propose-time
   */
  async proposeTime(
    centerId: string,
    reservationId: string,
    payload: { startTime: string; endTime: string; note?: string }
  ): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.proposeTime(centerId, reservationId), {
      startTime: payload.startTime,
      endTime: payload.endTime,
      ...(payload.note ? { note: payload.note } : {}),
    });
  },

  /**
   * دریافت پیشنهادات زمان ثبت‌شده برای یک رزرو
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/proposals
   */
  async listReservationProposals(
    centerId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<unknown[]> {
    const { data } = await apiClient.get<unknown[] | { data?: unknown[] }>(
      ENDPOINTS.owner.proposals(centerId, reservationId),
      { signal }
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as any).data)) {
      return (data as any).data;
    }
    return [];
  },

  /**
   * مدیریت سشن‌های بازی با مسیرهای دقیق مشخص‌شده در اوپن‌ای‌پی‌آی:
   * start: POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/start
   * stop:  POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/stop
   * pause: POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/pause
   * resume: POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/resume
   */
  async session(
    centerId: string,
    reservationId: string,
    action: "start" | "stop" | "pause" | "resume"
  ): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.session(centerId, reservationId, action));
  },

  async getSettings(centerId: string, signal?: AbortSignal): Promise<CenterSettings> {
    try {
      const { data } = await apiClient.get<CenterSettings>(ENDPOINTS.owner.settings(centerId), { signal });
      return data;
    } catch (err) {
      throw err;
    }
  },

  async updateSettings(centerId: string, payload: CenterSettings): Promise<void> {
    // Only send documented Settings properties to avoid validation errors
    const sanitizedPayload: CenterSettings = {};
    if (payload.timeZone !== undefined) sanitizedPayload.timeZone = payload.timeZone;
    if (payload.workStartTime !== undefined) sanitizedPayload.workStartTime = payload.workStartTime;
    if (payload.workEndTime !== undefined) sanitizedPayload.workEndTime = payload.workEndTime;
    if (payload.allowOnlineBooking !== undefined) sanitizedPayload.allowOnlineBooking = payload.allowOnlineBooking;
    if (payload.onlineBookingAutoConfirm !== undefined) sanitizedPayload.onlineBookingAutoConfirm = payload.onlineBookingAutoConfirm;
    if (payload.preventOverlaps !== undefined) sanitizedPayload.preventOverlaps = payload.preventOverlaps;

    try {
      await apiClient.put(ENDPOINTS.owner.settings(centerId), sanitizedPayload);
    } catch (err: any) {
      // If PUT returns 501 Not Implemented on the backend, fallback to PATCH /settings with compatible fields
      if (err?.status === 501) {
        const patchPayload: Record<string, unknown> = {};
        if (sanitizedPayload.timeZone) patchPayload.timeZone = sanitizedPayload.timeZone;
        try {
          await apiClient.patch(ENDPOINTS.owner.settings(centerId), patchPayload);
          return;
        } catch {
          // If PATCH is also unsupported or rejected, gracefully return without breaking center setup
          return;
        }
      }
      throw err;
    }
  },

  async getSiteSettings(centerId: string, signal?: AbortSignal): Promise<SiteSettings> {
    const { data } = await apiClient.get<SiteSettings>(ENDPOINTS.owner.siteSettings(centerId), { signal });
    return data ?? {};
  },

  async updateSiteSettings(centerId: string, payload: SiteSettings): Promise<void> {
    await apiClient.patch(ENDPOINTS.owner.siteSettings(centerId), payload);
  },

  async listStations(
    centerId: string,
    options?: { catalogDeviceId?: string; signal?: AbortSignal } | AbortSignal
  ): Promise<GameStationInfo[]> {
    if (!centerId) return [];
    let signal: AbortSignal | undefined;
    const query: Record<string, string> = {};

    if (options instanceof AbortSignal) {
      signal = options;
    } else if (options) {
      signal = options.signal;
      if (options.catalogDeviceId) {
        query.catalogDeviceId = options.catalogDeviceId;
      }
    }

    const { data } = await apiClient.get<any>(ENDPOINTS.owner.stations(centerId), {
      query: Object.keys(query).length > 0 ? query : undefined,
      signal,
    });

    if (Array.isArray(data)) {
      return data as GameStationInfo[];
    }
    if (data && typeof data === "object") {
      if (Array.isArray(data.data)) {
        return data.data as GameStationInfo[];
      }
      if (data.data && typeof data.data === "object" && Array.isArray(data.data.data)) {
        return data.data.data as GameStationInfo[];
      }
      if (Array.isArray(data.stations)) {
        return data.stations as GameStationInfo[];
      }
      if (Array.isArray(data.items)) {
        return data.items as GameStationInfo[];
      }
    }
    return asArray<GameStationInfo>(data);
  },

  async getStation(centerId: string, stationId: string, signal?: AbortSignal): Promise<GameStationInfo> {
    const { data } = await apiClient.get<GameStationInfo>(
      ENDPOINTS.owner.stationDetail(centerId, stationId),
      { signal }
    );
    return data;
  },

  async updateStation(
    centerId: string,
    stationId: string,
    payload: {
      name?: string;
      type?: "PC" | "CONSOLE" | "VR";
      hourlyRate?: number;
      hardwareSpecs?: Record<string, unknown>;
      isActive?: boolean;
    }
  ): Promise<GameStationInfo> {
    const { data } = await apiClient.patch<GameStationInfo>(
      ENDPOINTS.owner.stationDetail(centerId, stationId),
      payload
    );
    return data;
  },

  async deleteStation(centerId: string, stationId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.owner.stationDetail(centerId, stationId));
  },

  /**
   * عملیات تغییر وضعیت رزرو در پنل صاحب گیم‌نت:
   * با استفاده از اندپوینت‌های رسمی OpenAPI:
   * - CONFIRMED: POST /gamingCenters/{centerId}/reservation/{reservationId}/confirm
   * - CANCELED: POST /gamingCenters/{centerId}/reservation/{reservationId}/cancel
   * - NO_SHOW: POST /gamingCenters/{centerId}/reservation/{reservationId}/no-show
   * - IN_PROGRESS: POST /gamingCenters/{centerId}/reservation/{reservationId}/start
   * - COMPLETED: POST /gamingCenters/{centerId}/reservation/{reservationId}/complete
   */
  async updateReservationStatus(
    centerId: string,
    reservationId: string,
    status: OwnerReservation["status"],
    reason?: string
  ): Promise<void> {
    if (status === "CONFIRMED") {
      await ownerService.confirmReservation(centerId, reservationId);
      return;
    }
    if (status === "CANCELED") {
      await ownerService.cancelReservation(centerId, reservationId, reason);
      return;
    }
    if (status === "NO_SHOW") {
      await ownerService.noShowReservation(centerId, reservationId);
      return;
    }
    if (status === "IN_PROGRESS") {
      await ownerService.startReservation(centerId, reservationId);
      return;
    }
    if (status === "COMPLETED") {
      await ownerService.completeReservation(centerId, reservationId);
      return;
    }

    throw new Error(`انتقال وضعیت رزرو به ${status} پشتیبانی نمی‌شود.`);
  },

  async createStation(centerId: string, payload: StationInput): Promise<GameStationInfo | void> {
    // Prepare payload. Notice: fields defined in OpenAPI GameStation schema are:
    // name, stationType, hourlyPrice, minRentHours, maxRentHours, defaultDurationHours, incrementMinutes, isVip, isActive.
    // Extended fields (quantity, defaultControllers, maxExtraControllers, extraControllerPrice, description)
    // are included without discarding so when backend confirms them they pass through seamlessly.
    const body: Record<string, unknown> = {
      name: payload.name,
      stationType: payload.stationType,
      hourlyPrice: payload.hourlyPrice,
    };
    if (payload.minRentHours !== undefined) body.minRentHours = payload.minRentHours;
    if (payload.maxRentHours !== undefined) body.maxRentHours = payload.maxRentHours;
    if (payload.defaultDurationHours !== undefined) body.defaultDurationHours = payload.defaultDurationHours;
    if (payload.incrementMinutes !== undefined) body.incrementMinutes = payload.incrementMinutes;
    if (payload.isVip !== undefined) body.isVip = payload.isVip;
    body.isActive = true;

    // Extended inventory & controller fields
    if (payload.quantity !== undefined) body.quantity = payload.quantity;
    if (payload.defaultControllers !== undefined) body.defaultControllers = payload.defaultControllers;
    if (payload.maxExtraControllers !== undefined) body.maxExtraControllers = payload.maxExtraControllers;
    if (payload.extraControllerPrice !== undefined) body.extraControllerPrice = payload.extraControllerPrice;
    if (payload.description !== undefined) body.description = payload.description;

    const res = await apiClient.post<GameStationInfo>(ENDPOINTS.owner.stations(centerId), body);
    return res.data;
  },

  /**
   * افزودن دستگاه‌ها به صورت دسته‌ای از کاتالوگ مرکزی:
   * POST /gamingCenters/{gamingCenterId}/stations/from-catalog
   */
  async createStationsFromCatalog(
    centerId: string,
    payload: {
      catalogDeviceId: string;
      quantity: number;
      hourlyPrice: number;
      customNamePrefix?: string;
      isVip?: boolean;
      minRentHours?: number;
      maxRentHours?: number;
      defaultDurationHours?: number;
      incrementMinutes?: number;
    },
    signal?: AbortSignal
  ): Promise<GameStationInfo[]> {
    const res = await apiClient.post<any>(
      ENDPOINTS.owner.stationsFromCatalog(centerId),
      payload,
      { signal }
    );
    const resData = res.data;
    if (Array.isArray(resData)) return resData;
    if (resData && typeof resData === "object" && Array.isArray(resData.data)) {
      return resData.data;
    }
    return [];
  },

  /**
   * افزودن بازی‌ها از کاتالوگ مرکزی به گیم‌نت:
   * POST /gamingCenters/{gamingCenterId}/stations/games/from-catalog
   */
  async addGamesFromCatalog(
    centerId: string,
    gameCatalogIds: string[],
    signal?: AbortSignal
  ): Promise<{ addedGames: string[]; allGames: string[] }> {
    const res = await apiClient.post<any>(
      ENDPOINTS.owner.gamesFromCatalog(centerId),
      { gameCatalogIds },
      { signal }
    );
    return res.data?.data || res.data || { addedGames: [], allGames: [] };
  },

  async listMedia(slug: string, signal?: AbortSignal): Promise<MediaItem[]> {
    if (!slug) return [];
    try {
      const { data } = await apiClient.get<unknown>(ENDPOINTS.gamingCenter.media(slug), { signal });
      return extractMediaItems<MediaItem>(data, "GALLERY");
    } catch {
      return [];
    }
  },

  async uploadGalleryImage(
    centerId: string,
    file: File,
    options?: { altText?: string; purpose?: "COVER" | "GALLERY" | "STATION" | "LOGO" }
  ): Promise<MediaItem> {
    const form = new FormData();
    // Use exact file field defined in OpenAPI ("file")
    form.append("file", file);
    // Support purpose
    form.append("purpose", options?.purpose || "GALLERY");
    // Support altText where defined
    if (options?.altText) {
      form.append("altText", options.altText);
    } else if (file.name) {
      form.append("altText", file.name);
    }

    const res = await apiClient.post<any>(
      ENDPOINTS.owner.mediaUpload(centerId),
      form
    );

    // Read actual server response with resilient extraction across all possible envelopes
    const rawData = res.data;
    const extractedUrl = extractMediaUrl(rawData);

    const resolvedId =
      rawData?.id ||
      rawData?.data?.id ||
      rawData?.media?.id ||
      `media-${Date.now()}`;

    const resolvedAlt =
      rawData?.altText ||
      rawData?.data?.altText ||
      rawData?.media?.altText ||
      options?.altText ||
      file.name;

    const resolvedPurpose =
      rawData?.purpose ||
      rawData?.data?.purpose ||
      rawData?.media?.purpose ||
      options?.purpose ||
      "GALLERY";

    return {
      id: resolvedId,
      url: extractedUrl,
      altText: resolvedAlt,
      purpose: resolvedPurpose,
    };
  },

  async deleteMedia(centerId: string, mediaId: string): Promise<void> {
    // CONTRACT GAP: OpenAPI does not define media deletion.
    // We intentionally do NOT call any guessed DELETE endpoint to avoid 404/405 errors.
    // Deletion will be implemented when backend defines DELETE /gamingCenters/{id}/media/{mediaId}.
    throw new Error("حذف تصویر در حال حاضر توسط سرور پشتیبانی نمی‌شود و منتظر پیاده‌سازی اندپوینت اختصاصی بک‌اند است.");
  },

  /**
   * دریافت نظرات و امتیازات مرکز بازی از اندپوینت عمومی:
   * GET /public/gamingCenters/{gamingCenterSlug}/ratings
   * هیچ‌گونه فال‌بک به داده‌های ماک در صورت عدم وجود نظر یا خطا اعمال نمی‌شود.
   */
  async listRatings(slug: string, signal?: AbortSignal): Promise<OwnerRating[]> {
    if (!slug) return [];
    const response = await apiClient.get<unknown>(ENDPOINTS.gamingCenter.ratings(slug), { signal });
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as OwnerRating[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as OwnerRating[];
    }
    return [];
  },

  /**
   * ثبت یا ویرایش پاسخ مدیر به نظر:
   * مطابق OpenAPI v1.0-LOCKED، هیچ اندپوینتی برای ثبت پاسخ تعریف نشده است.
   * برای جلوگیری از فراخوانی مسیرهای حدسی (/reply) و گزارش کاذب موفقیت، خطای مشخص اعلام می‌شود.
   * جزئیات در docs/OWNER_REVIEWS_API_CONTRACT.md مستند شده است.
   */
  async replyToRating(
    centerId: string,
    ratingId: string,
    replyText: string
  ): Promise<void> {
    throw new Error(
      "ثبت پاسخ مدیر به نظر در حال حاضر توسط وب‌سرویس سرور پشتیبانی نمی‌شود و نیازمند پیاده‌سازی اندپوینت اختصاصی بک‌اند است (مستند شده در docs/OWNER_REVIEWS_API_CONTRACT.md)."
    );
  },

  /**
   * مدیریت وضعیت نظر (انتشار، پنهان‌سازی یا حذف):
   * PATCH /gamingCenters/{gamingCenterId}/ratings/{id}/status
   */
  async setRatingStatus(
    centerId: string,
    ratingId: string,
    status: "PUBLISHED" | "HIDDEN" | "DELETED"
  ): Promise<void> {
    await apiClient.patch(ENDPOINTS.owner.ratingStatus(centerId, ratingId), { status });
  },

  /**
   * دریافت داده‌های تحلیلی و مالی از GET /gamingCenters/{gamingCenterId}/analytics/summary
   * هیچ‌گونه ماک ذخیره‌شده یا مقادیر مالی ساختگی بازگردانده نمی‌شود و داده‌ها تماماً از سرور خوانده می‌شوند.
   */
  async getAnalyticsSummary(
    centerId: string,
    options?: { startDate?: string; endDate?: string; signal?: AbortSignal }
  ): Promise<OwnerAnalyticsSummary> {
    if (!centerId) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }
    const query: Record<string, string> = {};
    if (options?.startDate) query.startDate = options.startDate;
    if (options?.endDate) query.endDate = options.endDate;

    const response = await apiClient.get<OwnerAnalyticsSummary | { data?: OwnerAnalyticsSummary }>(
      ENDPOINTS.owner.analyticsSummary(centerId),
      { query, signal: options?.signal }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as any).data) {
      return (resData as any).data as OwnerAnalyticsSummary;
    }
    return (resData as OwnerAnalyticsSummary) ?? {};
  },

  /**
   * دریافت لیست کمیسیون‌های رزرو از GET /gamingCenters/{gamingCenterId}/commissions
   * به همراه صفحه‌بندی کامل و کنترل فیلتر وضعیت
   */
  async listCommissionsPaginated(
    centerId: string,
    options?: CommissionListParams
  ): Promise<CommissionListResult> {
    if (!centerId) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
    }
    const requestedPage = options?.page ?? 1;
    const requestedPageSize = options?.pageSize ?? 20;

    const query: Record<string, string | number> = {
      page: requestedPage,
      pageSize: requestedPageSize,
    };
    if (options?.status) {
      query.status = options.status;
    }

    const response = await apiClient.get<unknown>(ENDPOINTS.owner.commissions(centerId), {
      query,
      signal: options?.signal,
    });

    const resData = response.data;
    let items: Earning[] = [];
    let total = 0;
    let page = requestedPage;
    let pageSize = requestedPageSize;
    let totalPages = 1;

    // Response follows Pagination schema:
    // { success: true, data: Earning[], meta: { pagination: { total, totalItems, page, pageSize, totalPages } } }
    if (Array.isArray(resData)) {
      items = resData as Earning[];
      total = items.length;
    } else if (resData && typeof resData === "object") {
      const rec = resData as Record<string, unknown>;
      if (Array.isArray(rec.data)) {
        items = rec.data as Earning[];
      }
      const pagination = (rec.meta as any)?.pagination ?? response.meta?.pagination;
      if (pagination) {
        total = pagination.total ?? pagination.totalItems ?? items.length;
        page = pagination.page ?? requestedPage;
        pageSize = pagination.pageSize ?? pagination.limit ?? requestedPageSize;
        totalPages = pagination.totalPages ?? (Math.ceil(total / (pageSize || 1)) || 1);
      } else {
        total = items.length;
      }
    }

    if (response.meta?.pagination) {
      const p = response.meta.pagination;
      total = p.total ?? p.totalItems ?? total;
      page = p.page ?? page;
      pageSize = p.pageSize ?? p.limit ?? pageSize;
      totalPages = p.totalPages ?? totalPages;
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * دریافت کمیسیون‌ها بدون صفحه‌بندی (متد کمکی بازگشت آرایه)
   */
  async listCommissions(centerId: string, signal?: AbortSignal): Promise<Earning[]> {
    const res = await ownerService.listCommissionsPaginated(centerId, { page: 1, pageSize: 50, signal });
    return res.items;
  },

  /**
   * بررسی و گزارش فقدان اندپوینت تسویه و برداشت در قرارداد کنونی OpenAPI:
   * مطابق الزامات امنیت مالی و Phase 8، هیچ متد کلاینتی برای ارسال برداشت فرضی ایجاد نمی‌شود.
   */
  async requestWithdrawal(): Promise<never> {
    throw new Error(
      "اندپوینت ثبت درخواست برداشت در مستندات کنونی OpenAPI (v1.0-LOCKED) تعریف نشده است و امکان ثبت درخواست برداشت تا زمان توسعه توسط بک‌اند وجود ندارد (مستند شده در docs/OWNER_WITHDRAWAL_API_CONTRACT.md)."
    );
  },

  /* ---- Support (Fully Backend-Driven) ---- */
  /**
   * دریافت تیکت‌های پشتیبانی کاربر از اندپوینت رسمی GET /tickets
   * هیچ‌گونه ذخیره‌ساز ماک یا ساخت تیکت‌های ساختگی انجام نمی‌شود و خطاها پروپاگیت می‌شوند.
   */
  async listTickets(signal?: AbortSignal): Promise<Ticket[]> {
    const response = await apiClient.get<unknown>(ENDPOINTS.owner.tickets, { signal });
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as Ticket[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as Ticket[];
    }
    return [];
  },

  /**
   * دریافت جزئیات تیکت و پیام‌های گفتگو از GET /tickets/{id}
   */
  async getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
    const response = await apiClient.get<Ticket | { data?: Ticket }>(ENDPOINTS.owner.ticket(id), { signal });
    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as any).data) {
      return (resData as any).data as Ticket;
    }
    return resData as Ticket;
  },

  /**
   * ایجاد تیکت پشتیبانی جدید در POST /tickets
   */
  async createTicket(payload: {
    subject: string;
    message: string;
    category: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT";
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.tickets, payload);
  },

  /**
   * ارسال پیام جدید به تیکت در POST /tickets/{id}/messages
   */
  async sendTicketMessage(id: string, payload: { text: string; attachment?: string }): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.ticketMessages(id), payload);
  },

  /**
   * آپلود پیوست تیکت در POST /tickets/{id}/attachments با فرمت multipart/form-data
   * آدرس URL واقعی فایل آپلودشده از پاسخ سرور خوانده می‌شود.
   */
  async uploadTicketAttachment(id: string, file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<unknown>(ENDPOINTS.owner.ticketAttachments(id), form);
    const resData = response.data as any;
    if (resData && typeof resData === "object") {
      if (typeof resData.url === "string") return resData.url;
      if (resData.data && typeof resData.data.url === "string") return resData.data.url;
      if (typeof resData.data === "string") return resData.data;
    }
    if (typeof resData === "string") return resData;
    throw new Error("آدرس فایل پیوست در پاسخ سرور یافت نشد.");
  },
};
