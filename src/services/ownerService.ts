
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  extractMediaItems,
  extractMediaUrl,
  normalizeMediaUrl,
} from "@/lib/media";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type {
  CenterSettings,
  CommissionListParams,
  CommissionListResult,
  CreateAdvertisementInput,
  CreateBranchAddressPayload,
  CreateClosureInput,
  CreateGamingCenterPayload,
  CreateLinkPayload,
  Earning,
  GamingCenterClosure,
  GamingCenterSchedule,
  MediaItem,
  OwnerAdvertisement,
  OwnerAnalyticsSummary,
  OwnerMe,
  OwnerRating,
  OwnerReservation,
  PublicCenter,
  SiteSettings,
  StationInput,
  Ticket,
} from "@/types/owner";

const asArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : [];

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
    const response = await apiClient.get<any>(ENDPOINTS.owner.me, {
      signal,
    });

    const raw = response.data;
    const profile: any =
      raw?.data && typeof raw.data === "object" ? raw.data : raw;

    const resolvedId = profile?.id || profile?.actorId || "";
    const resolvedGamingCenterId =
      profile?.gamingCenterId || profile?.centerId || "";

    const actorType = profile?.actorType?.toUpperCase();

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
      gamingCenters: Array.isArray(profile?.gamingCenters)
        ? profile.gamingCenters
        : undefined,
    };
  },

  /**
   * ایجاد گیم‌نت جدید مطابق قرارداد فعلی OpenAPI:
   * POST /gamingCenters
   *
   * فیلدهای الزامی: name, slug, ownerId
   * فیلد اختیاری: games
   *
   * name: نام فارسی گیم‌نت
   * slug: شناسه انگلیسی تولیدشده از نام انگلیسی
   *
   * englishName در قرارداد فعلی Backend تعریف نشده و ارسال نمی‌شود.
   */
  async createGamingCenter(
    payload: CreateGamingCenterPayload,
    signal?: AbortSignal
  ): Promise<{ id: string; name: string; slug: string }> {
    const normalizedName = payload.name.trim();
    const normalizedSlug = payload.slug.trim();
    const normalizedOwnerId = payload.ownerId.trim();

    if (!normalizedName) {
      throw new Error("نام فارسی گیم‌نت وارد نشده است.");
    }

    if (!normalizedSlug) {
      throw new Error("شناسه لاتین گیم‌نت وارد نشده است.");
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      throw new Error(
        "شناسه لاتین باید شامل حروف کوچک انگلیسی، اعداد و خط تیره باشد."
      );
    }

    if (!normalizedOwnerId) {
      throw new Error("شناسه مالک گیم‌نت مشخص نشده است.");
    }

    // فقط فیلدهای پشتیبانی‌شده در قرارداد Backend ارسال می‌شوند.
    const body: Record<string, unknown> = {
      name: normalizedName,
      slug: normalizedSlug,
      ownerId: normalizedOwnerId,
    };

    if (Array.isArray(payload.games) && payload.games.length > 0) {
      body.games = payload.games.filter(Boolean);
    }

    const response = await apiClient.post<any>(
      ENDPOINTS.owner.centers,
      body,
      { signal }
    );

    const resData = response.data;
    const centerData =
      resData?.data && typeof resData.data === "object"
        ? resData.data
        : resData?.gamingCenter &&
            typeof resData.gamingCenter === "object"
          ? resData.gamingCenter
          : resData;

    const createdId = centerData?.id
      ? String(centerData.id)
      : "";

    const createdName = centerData?.name
      ? String(centerData.name)
      : normalizedName;

    const createdSlug = centerData?.slug
      ? String(centerData.slug)
      : normalizedSlug;

    return {
      id: createdId || createdSlug,
      name: createdName,
      slug: createdSlug,
    };
  },

  /**
   * ثبت آدرس شعبه برای گیم‌نت:
   * POST /gamingCenters/{gamingCenterId}/addresses
   */
  async createAddress(
    gamingCenterId: string,
    payload: CreateBranchAddressPayload,
    signal?: AbortSignal
  ): Promise<void> {
    const rawAddress =
      payload.addressLine?.trim() || payload.address?.trim() || "";

    if (!rawAddress) {
      throw new Error("آدرس وارد نشده است.");
    }

    const rawCity = payload.city?.trim() || "";

    if (!rawCity) {
      throw new Error("شهر وارد نشده است.");
    }

    const body: Record<string, unknown> = {
      city: rawCity,
      addressLine: rawAddress,
      address: payload.address?.trim() || rawAddress,
    };

    if (payload.province?.trim()) {
      body.province = payload.province.trim();
    }

    if (payload.phone?.trim()) {
      body.phone = payload.phone.trim();
    }

    if (payload.postalCode?.trim()) {
      body.postalCode = payload.postalCode.trim();
    }

    if (typeof payload.lat === "number" && !isNaN(payload.lat)) {
      body.lat = payload.lat;
    }

    if (typeof payload.lng === "number" && !isNaN(payload.lng)) {
      body.lng = payload.lng;
    }

    await apiClient.post(
      ENDPOINTS.owner.addresses(gamingCenterId),
      body,
      { signal }
    );
  },

  /**
   * همگام‌سازی اطلاعات گیم‌نت:
   * PATCH /gamingCenters/{id}
   */
  async patchCenter(
    gamingCenterId: string,
    payload: { name?: string; address?: string; phone?: string },
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.patch(
      ENDPOINTS.owner.center(gamingCenterId),
      payload,
      { signal }
    );
  },

  /**
   * ثبت لینک وبسایت یا شبکه‌های اجتماعی:
   * POST /gamingCenters/{gamingCenterId}/links
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

    await apiClient.post(
      ENDPOINTS.owner.links(gamingCenterId),
      body,
      { signal }
    );
  },

  async listCenters(signal?: AbortSignal): Promise<PublicCenter[]> {
    const response = await apiClient.get<any>(
      ENDPOINTS.owner.centers,
      {
        query: { page: 1, pageSize: 100, limit: 100 },
        signal,
      }
    );

    const resData = response.data;

    if (Array.isArray(resData)) {
      return resData as PublicCenter[];
    }

    if (resData && typeof resData === "object") {
      if (Array.isArray(resData.data)) {
        return resData.data as PublicCenter[];
      }

      if (
        resData.data &&
        typeof resData.data === "object" &&
        Array.isArray(resData.data.data)
      ) {
        return resData.data.data as PublicCenter[];
      }
    }

    return asArray<PublicCenter>(resData);
  },

  /** دریافت مشخصات مرکز بر اساس شناسه یا اسلاگ */
  async findCenter(
    id: string,
    signal?: AbortSignal
  ): Promise<PublicCenter | null> {
    if (!id) return null;

    try {
      try {
        const direct = await apiClient.get<any>(
          ENDPOINTS.owner.center(id),
          { signal }
        );

        const resData = direct.data;

        const centerObj: any =
          resData?.data &&
          typeof resData.data === "object" &&
          !Array.isArray(resData.data)
            ? resData.data
            : resData;

        if (centerObj && (centerObj.id || centerObj.name)) {
          return {
            id: centerObj.id || id,
            name: centerObj.name || "گیم‌نت",
            englishName: centerObj.englishName,
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
        // در صورت شکست درخواست مستقیم، از لیست مراکز استفاده می‌شود.
      }

      const centers = await ownerService.listCenters(signal);

      return centers.find((c) => c.id === id || c.slug === id) ?? null;
    } catch (err) {
      throw err;
    }
  },

  /** دریافت آدرس‌های ثبت شده مرکز */
  async listAddresses(
    centerId: string,
    signal?: AbortSignal
  ): Promise<
    Array<{ id?: string; address: string; city?: string; phone?: string }>
  > {
    if (!centerId) return [];

    try {
      const res = await apiClient.get<unknown>(
        ENDPOINTS.owner.addresses(centerId),
        { signal }
      );

      return asArray<any>(res.data);
    } catch {
      return [];
    }
  },

  /**
   * دریافت لیست رزروهای گیم‌نت
   */
  async listReservations(
    centerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: string;
      signal?: AbortSignal;
    }
  ): Promise<OwnerReservation[]> {
    const pageResult =
      await ownerService.listReservationsPaginated(centerId, options);

    return pageResult.items;
  },

  async listReservationsPaginated(
    centerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: string;
      signal?: AbortSignal;
    }
  ): Promise<{
    items: OwnerReservation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const requestedPage = options?.page ?? 1;
    const requestedPageSize = options?.pageSize ?? 50;

    const statusFilter =
      options?.status && options.status !== "ALL"
        ? options.status
        : undefined;

    const query: Record<string, string | number> = {
      page: requestedPage,
      pageSize: requestedPageSize,
    };

    if (statusFilter) {
      query.status = statusFilter;
    }

    const response = await apiClient.get<unknown>(
      ENDPOINTS.owner.reservations(centerId),
      {
        query,
        signal: options?.signal,
      }
    );

    const resData = response.data;

    let items: OwnerReservation[] = [];
    let total = 0;
    let page = requestedPage;
    let pageSize = requestedPageSize;
    let totalPages = 1;

    if (Array.isArray(resData)) {
      items = resData as OwnerReservation[];
      total = items.length;
    } else if (resData && typeof resData === "object") {
      const rec = resData as Record<string, unknown>;

      if (Array.isArray(rec.data)) {
        items = rec.data as OwnerReservation[];
      }

      const pagination =
        (rec.meta as any)?.pagination ?? response.meta?.pagination;

      if (pagination) {
        total = pagination.total ?? pagination.totalItems ?? items.length;
        page = pagination.page ?? requestedPage;
        pageSize =
          pagination.pageSize ?? pagination.limit ?? requestedPageSize;
        totalPages =
          pagination.totalPages ??
          (Math.ceil(total / (pageSize || 1)) || 1);
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
   * دریافت مشخصات رزرو
   */
  async getReservation(
    centerId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.get<
      OwnerReservation | { success?: boolean; data?: OwnerReservation }
    >(
      ENDPOINTS.owner.reservationDetail(centerId, reservationId),
      { signal }
    );

    if (data && typeof data === "object" && "stationId" in data) {
      return data as OwnerReservation;
    }

    if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      (data as any).data
    ) {
      return (data as any).data as OwnerReservation;
    }

    return data as OwnerReservation;
  },

  async confirmReservation(
    centerId: string,
    reservationId: string
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.confirmReservation(centerId, reservationId),
      {}
    );

    return data;
  },

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

  async startReservation(
    centerId: string,
    reservationId: string
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.startReservation(centerId, reservationId),
      {}
    );

    return data;
  },

  async completeReservation(
    centerId: string,
    reservationId: string
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.completeReservation(centerId, reservationId),
      {}
    );

    return data;
  },

  async noShowReservation(
    centerId: string,
    reservationId: string
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.post<OwnerReservation>(
      ENDPOINTS.owner.noShowReservation(centerId, reservationId),
      {}
    );

    return data;
  },

  async proposeTime(
    centerId: string,
    reservationId: string,
    payload: { startTime: string; endTime: string; note?: string }
  ): Promise<void> {
    await apiClient.post(
      ENDPOINTS.owner.proposeTime(centerId, reservationId),
      {
        startTime: payload.startTime,
        endTime: payload.endTime,
        ...(payload.note ? { note: payload.note } : {}),
      }
    );
  },

  async listReservationProposals(
    centerId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<unknown[]> {
    const { data } = await apiClient.get<
      unknown[] | { data?: unknown[] }
    >(
      ENDPOINTS.owner.proposals(centerId, reservationId),
      { signal }
    );

    if (Array.isArray(data)) return data;

    if (
      data &&
      typeof data === "object" &&
      Array.isArray((data as any).data)
    ) {
      return (data as any).data;
    }

    return [];
  },

  async session(
    centerId: string,
    reservationId: string,
    action: "start" | "stop" | "pause" | "resume"
  ): Promise<void> {
    await apiClient.post(
      ENDPOINTS.owner.session(centerId, reservationId, action)
    );
  },

  async getSettings(
    centerId: string,
    signal?: AbortSignal
  ): Promise<CenterSettings> {
    const { data } = await apiClient.get<CenterSettings>(
      ENDPOINTS.owner.settings(centerId),
      { signal }
    );

    return data;
  },

  async updateSettings(
    centerId: string,
    payload: CenterSettings
  ): Promise<void> {
    const sanitizedPayload: CenterSettings = {};

    if (payload.timeZone !== undefined) {
      sanitizedPayload.timeZone = payload.timeZone;
    }

    if (payload.workStartTime !== undefined) {
      sanitizedPayload.workStartTime = payload.workStartTime;
    }

    if (payload.workEndTime !== undefined) {
      sanitizedPayload.workEndTime = payload.workEndTime;
    }

    if (payload.allowOnlineBooking !== undefined) {
      sanitizedPayload.allowOnlineBooking = payload.allowOnlineBooking;
    }

    if (payload.onlineBookingAutoConfirm !== undefined) {
      sanitizedPayload.onlineBookingAutoConfirm =
        payload.onlineBookingAutoConfirm;
    }

    if (payload.preventOverlaps !== undefined) {
      sanitizedPayload.preventOverlaps = payload.preventOverlaps;
    }

    if (payload.closedDays !== undefined) {
      sanitizedPayload.closedDays = payload.closedDays;
    }

    if (payload.schedules !== undefined) {
      sanitizedPayload.schedules = payload.schedules;
    }

    try {
      await apiClient.put(
        ENDPOINTS.owner.settings(centerId),
        sanitizedPayload
      );
    } catch (err: any) {
      if (err?.status === 501) {
        const patchPayload: Record<string, unknown> = {};

        if (sanitizedPayload.timeZone) {
          patchPayload.timeZone = sanitizedPayload.timeZone;
        }

        try {
          await apiClient.patch(
            ENDPOINTS.owner.settings(centerId),
            patchPayload
          );
          return;
        } catch {
          return;
        }
      }

      throw err;
    }
  },

  async getSiteSettings(
    centerId: string,
    signal?: AbortSignal
  ): Promise<SiteSettings> {
    const { data } = await apiClient.get<SiteSettings>(
      ENDPOINTS.owner.siteSettings(centerId),
      { signal }
    );

    return data ?? {};
  },

  async updateSiteSettings(
    centerId: string,
    payload: SiteSettings
  ): Promise<void> {
    await apiClient.patch(
      ENDPOINTS.owner.siteSettings(centerId),
      payload
    );
  },

  async getClosures(
    centerId: string,
    signal?: AbortSignal
  ): Promise<GamingCenterClosure[]> {
    if (!centerId) return [];

    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.owner.closures(centerId),
        { signal }
      );

      const raw = response.data;

      if (Array.isArray(raw)) return raw;

      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.items)) return raw.items;
      }

      return [];
    } catch (err) {
      console.warn("Failed to fetch closures from backend:", err);
      return [];
    }
  },

  async createClosure(
    centerId: string,
    payload: CreateClosureInput,
    signal?: AbortSignal
  ): Promise<GamingCenterClosure> {
    if (!payload.title || !payload.title.trim()) {
      throw new Error("عنوان تعطیلی الزامی است.");
    }

    const startMs = Date.parse(payload.startDate);
    const endMs = Date.parse(payload.endDate);

    if (isNaN(startMs) || isNaN(endMs)) {
      throw new Error("تاریخ شروع یا پایان نامعتبر است.");
    }

    if (startMs >= endMs) {
      throw new Error("تاریخ شروع تعطیلی باید قبل از تاریخ پایان باشد.");
    }

    const response = await apiClient.post<any>(
      ENDPOINTS.owner.closures(centerId),
      {
        title: payload.title.trim(),
        reason: payload.reason ? payload.reason.trim() : undefined,
        startDate: new Date(startMs).toISOString(),
        endDate: new Date(endMs).toISOString(),
      },
      { signal }
    );

    const resData = response.data;

    if (resData && typeof resData === "object" && resData.data) {
      return resData.data as GamingCenterClosure;
    }

    return resData as GamingCenterClosure;
  },

  async deleteClosure(
    centerId: string,
    closureId: string,
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.delete(
      ENDPOINTS.owner.closureDetail(centerId, closureId),
      { signal }
    );
  },

  async getSchedules(
    centerId: string,
    signal?: AbortSignal
  ): Promise<GamingCenterSchedule[]> {
    if (!centerId) return [];

    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.owner.schedules(centerId),
        { signal }
      );

      const raw = response.data;

      if (Array.isArray(raw)) return raw;

      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.items)) return raw.items;
      }

      return [];
    } catch {
      return [];
    }
  },

  async updateSchedules(
    centerId: string,
    schedules: GamingCenterSchedule[],
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.put(
      ENDPOINTS.owner.schedules(centerId),
      { schedules },
      { signal }
    );
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

    const { data } = await apiClient.get<any>(
      ENDPOINTS.owner.stations(centerId),
      {
        query: Object.keys(query).length > 0 ? query : undefined,
        signal,
      }
    );

    if (Array.isArray(data)) {
      return data as GameStationInfo[];
    }

    if (data && typeof data === "object") {
      if (Array.isArray(data.data)) {
        return data.data as GameStationInfo[];
      }

      if (
        data.data &&
        typeof data.data === "object" &&
        Array.isArray(data.data.data)
      ) {
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

  async getStation(
    centerId: string,
    stationId: string,
    signal?: AbortSignal
  ): Promise<GameStationInfo> {
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
      type?: "PC" | "CONSOLE" | "VR" | string;
      stationType?: string;
      hourlyRate?: number;
      hourlyPrice?: number;
      hardwareSpecs?: Record<string, unknown>;
      isVip?: boolean;
      isActive?: boolean;
    }
  ): Promise<GameStationInfo> {
    const priceVal =
      payload.hourlyPrice !== undefined
        ? payload.hourlyPrice
        : payload.hourlyRate;

    const requestBody: Record<string, unknown> = {
      ...payload,
    };

    if (priceVal !== undefined) {
      requestBody.hourlyRate = priceVal;
      requestBody.hourlyPrice = priceVal;
    }

    if (payload.stationType && !requestBody.type) {
      const st = String(payload.stationType).toUpperCase();

      if (st.includes("PC")) {
        requestBody.type = "PC";
      } else if (st.includes("VR")) {
        requestBody.type = "VR";
      } else {
        requestBody.type = "CONSOLE";
      }
    }

    const { data } = await apiClient.patch<GameStationInfo>(
      ENDPOINTS.owner.stationDetail(centerId, stationId),
      requestBody
    );

    return data;
  },

  async deleteStation(
    centerId: string,
    stationId: string
  ): Promise<void> {
    await apiClient.delete(
      ENDPOINTS.owner.stationDetail(centerId, stationId)
    );
  },

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

  async createStation(
    centerId: string,
    payload: StationInput
  ): Promise<GameStationInfo | void> {
    const body: Record<string, unknown> = {
      name: payload.name,
      stationType: payload.stationType,
      hourlyPrice: payload.hourlyPrice,
    };

    if (payload.minRentHours !== undefined) {
      body.minRentHours = payload.minRentHours;
    }

    if (payload.maxRentHours !== undefined) {
      body.maxRentHours = payload.maxRentHours;
    }

    if (payload.defaultDurationHours !== undefined) {
      body.defaultDurationHours = payload.defaultDurationHours;
    }

    if (payload.incrementMinutes !== undefined) {
      body.incrementMinutes = payload.incrementMinutes;
    }

    if (payload.isVip !== undefined) {
      body.isVip = payload.isVip;
    }

    body.isActive = true;

    if (payload.quantity !== undefined) {
      body.quantity = payload.quantity;
    }

    if (payload.defaultControllers !== undefined) {
      body.defaultControllers = payload.defaultControllers;
    }

    if (payload.maxExtraControllers !== undefined) {
      body.maxExtraControllers = payload.maxExtraControllers;
    }

    if (payload.extraControllerPrice !== undefined) {
      body.extraControllerPrice = payload.extraControllerPrice;
    }

    if (payload.description !== undefined) {
      body.description = payload.description;
    }

    const res = await apiClient.post<GameStationInfo>(
      ENDPOINTS.owner.stations(centerId),
      body
    );

    return res.data;
  },

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

    if (
      resData &&
      typeof resData === "object" &&
      Array.isArray(resData.data)
    ) {
      return resData.data;
    }

    return [];
  },

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

    return res.data?.data || res.data || {
      addedGames: [],
      allGames: [],
    };
  },

  async listMedia(
    slug: string,
    signal?: AbortSignal
  ): Promise<MediaItem[]> {
    if (!slug) return [];

    try {
      const { data } = await apiClient.get<unknown>(
        ENDPOINTS.gamingCenter.media(slug),
        { signal }
      );

      return extractMediaItems<MediaItem>(data, "GALLERY");
    } catch {
      return [];
    }
  },

  async uploadGalleryImage(
    centerId: string,
    file: File,
    options?: {
      altText?: string;
      purpose?: "COVER" | "GALLERY" | "STATION" | "LOGO";
    }
  ): Promise<MediaItem> {
    const form = new FormData();

    form.append("file", file);
    form.append("purpose", options?.purpose || "GALLERY");

    if (options?.altText) {
      form.append("altText", options.altText);
    } else if (file.name) {
      form.append("altText", file.name);
    }

    const res = await apiClient.post<any>(
      ENDPOINTS.owner.mediaUpload(centerId),
      form
    );

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

  async deleteMedia(
    centerId: string,
    mediaId: string
  ): Promise<void> {
    throw new Error(
      "حذف تصویر در حال حاضر توسط سرور پشتیبانی نمی‌شود و منتظر پیاده‌سازی اندپوینت اختصاصی بک‌اند است."
    );
  },

  async listRatings(
    slug: string,
    signal?: AbortSignal
  ): Promise<OwnerRating[]> {
    if (!slug) return [];

    const response = await apiClient.get<unknown>(
      ENDPOINTS.gamingCenter.ratings(slug),
      { signal }
    );

    const resData = response.data;

    if (Array.isArray(resData)) {
      return resData as OwnerRating[];
    }

    if (
      resData &&
      typeof resData === "object" &&
      Array.isArray((resData as any).data)
    ) {
      return (resData as any).data as OwnerRating[];
    }

    return [];
  },

  async replyToRating(
    centerId: string,
    ratingId: string,
    replyText: string
  ): Promise<void> {
    throw new Error(
      "ثبت پاسخ مدیر به نظر در حال حاضر توسط وب‌سرویس سرور پشتیبانی نمی‌شود و نیازمند پیاده‌سازی اندپوینت اختصاصی بک‌اند است (مستند شده در docs/OWNER_REVIEWS_API_CONTRACT.md)."
    );
  },

  async setRatingStatus(
    centerId: string,
    ratingId: string,
    status: "PUBLISHED" | "HIDDEN" | "DELETED"
  ): Promise<void> {
    await apiClient.patch(
      ENDPOINTS.owner.ratingStatus(centerId, ratingId),
      { status }
    );
  },

  async getAnalyticsSummary(
    centerId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      signal?: AbortSignal;
    }
  ): Promise<OwnerAnalyticsSummary> {
    if (!centerId) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }

    const query: Record<string, string> = {};

    if (options?.startDate) {
      query.startDate = options.startDate;
    }

    if (options?.endDate) {
      query.endDate = options.endDate;
    }

    const response = await apiClient.get<
      OwnerAnalyticsSummary | { data?: OwnerAnalyticsSummary }
    >(
      ENDPOINTS.owner.analyticsSummary(centerId),
      {
        query,
        signal: options?.signal,
      }
    );

    const resData = response.data;

    if (
      resData &&
      typeof resData === "object" &&
      "data" in resData &&
      (resData as any).data
    ) {
      return (resData as any).data as OwnerAnalyticsSummary;
    }

    return (resData as OwnerAnalyticsSummary) ?? {};
  },

  async listCommissionsPaginated(
    centerId: string,
    options?: CommissionListParams
  ): Promise<CommissionListResult> {
    if (!centerId) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
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

    const response = await apiClient.get<unknown>(
      ENDPOINTS.owner.commissions(centerId),
      {
        query,
        signal: options?.signal,
      }
    );

    const resData = response.data;

    let items: Earning[] = [];
    let total = 0;
    let page = requestedPage;
    let pageSize = requestedPageSize;
    let totalPages = 1;

    if (Array.isArray(resData)) {
      items = resData as Earning[];
      total = items.length;
    } else if (resData && typeof resData === "object") {
      const rec = resData as Record<string, unknown>;

      if (Array.isArray(rec.data)) {
        items = rec.data as Earning[];
      }

      const pagination =
        (rec.meta as any)?.pagination ?? response.meta?.pagination;

      if (pagination) {
        total = pagination.total ?? pagination.totalItems ?? items.length;
        page = pagination.page ?? requestedPage;
        pageSize =
          pagination.pageSize ?? pagination.limit ?? requestedPageSize;
        totalPages =
          pagination.totalPages ??
          (Math.ceil(total / (pageSize || 1)) || 1);
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

  async listCommissions(
    centerId: string,
    signal?: AbortSignal
  ): Promise<Earning[]> {
    const res = await ownerService.listCommissionsPaginated(
      centerId,
      {
        page: 1,
        pageSize: 50,
        signal,
      }
    );

    return res.items;
  },

  async requestWithdrawal(_payload?: {
    centerId?: string;
    amount?: number;
    accountHolder?: string;
    iban?: string;
  }): Promise<never> {
    throw new Error(
      "قابلیت ثبت درخواست برداشت وجه در حال حاضر توسط وب‌سرویس و بک‌اند (OpenAPI v1.0) پیاده‌سازی و پشتیبانی نشده است. درخواست برداشت پس از راه‌اندازی اندپوینت‌های مالی بک‌اند فعال خواهد شد."
    );
  },

  async listTickets(signal?: AbortSignal): Promise<Ticket[]> {
    const response = await apiClient.get<unknown>(
      ENDPOINTS.owner.tickets,
      { signal }
    );

    const resData = response.data;

    if (Array.isArray(resData)) {
      return resData as Ticket[];
    }

    if (
      resData &&
      typeof resData === "object" &&
      Array.isArray((resData as any).data)
    ) {
      return (resData as any).data as Ticket[];
    }

    return [];
  },

  async getTicket(
    id: string,
    signal?: AbortSignal
  ): Promise<Ticket> {
    const response = await apiClient.get<
      Ticket | { data?: Ticket }
    >(
      ENDPOINTS.owner.ticket(id),
      { signal }
    );

    const resData = response.data;

    if (
      resData &&
      typeof resData === "object" &&
      "data" in resData &&
      (resData as any).data
    ) {
      return (resData as any).data as Ticket;
    }

    return resData as Ticket;
  },

  async createTicket(payload: {
    subject: string;
    message: string;
    category: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT";
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }): Promise<void> {
    await apiClient.post(
      ENDPOINTS.owner.tickets,
      payload
    );
  },

  async sendTicketMessage(
    id: string,
    payload: { text: string; attachment?: string }
  ): Promise<void> {
    await apiClient.post(
      ENDPOINTS.owner.ticketMessages(id),
      payload
    );
  },

  async uploadTicketAttachment(
    id: string,
    file: File
  ): Promise<string> {
    const form = new FormData();

    form.append("file", file);

    const response = await apiClient.post<unknown>(
      ENDPOINTS.owner.ticketAttachments(id),
      form
    );

    const resData = response.data as any;

    if (resData && typeof resData === "object") {
      if (typeof resData.url === "string") {
        return resData.url;
      }

      if (resData.data && typeof resData.data.url === "string") {
        return resData.data.url;
      }

      if (typeof resData.data === "string") {
        return resData.data;
      }
    }

    if (typeof resData === "string") {
      return resData;
    }

    throw new Error("آدرس فایل پیوست در پاسخ سرور یافت نشد.");
  },

  async listAdvertisements(
    gamingCenterId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      signal?: AbortSignal;
    }
  ): Promise<OwnerAdvertisement[]> {
    const query: Record<string, string | number> = {};

    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;

    if (params?.status && params.status !== "all") {
      query.status = params.status;
    }

    if (params?.search?.trim()) {
      query.search = params.search.trim();
    }

    const response = await apiClient.get<any>(
      ENDPOINTS.owner.advertisements(gamingCenterId),
      {
        query,
        signal: params?.signal,
      }
    );

    const resData = response.data;

    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.items)) return resData.items;

    return [];
  },

  async uploadAdvertisementBanner(
    gamingCenterId: string,
    file: File
  ): Promise<{ url: string; thumbUrl?: string }> {
    const form = new FormData();

    form.append("banner", file);

    const response = await apiClient.post<any>(
      ENDPOINTS.owner.advertisementUpload(gamingCenterId),
      form
    );

    const resData = response.data;
    const dataObj = resData?.data || resData;

    const url =
      dataObj?.url ||
      dataObj?.bannerUrl ||
      extractMediaUrl(dataObj) ||
      (typeof dataObj === "string" ? dataObj : "");

    if (!url) {
      throw new Error("آدرس بنر آپلودشده از سرور دریافت نشد.");
    }

    return {
      url: normalizeMediaUrl(url),
      thumbUrl: dataObj?.thumbUrl
        ? normalizeMediaUrl(dataObj.thumbUrl)
        : undefined,
    };
  },

  async createAdvertisement(
    gamingCenterId: string,
    input: CreateAdvertisementInput
  ): Promise<OwnerAdvertisement> {
    const payload = {
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      bannerUrl: input.bannerUrl.trim(),
      destinationUrl: input.destinationUrl?.trim() || undefined,
      proposedDurationDays: input.proposedDurationDays ?? 30,
    };

    const response = await apiClient.post<any>(
      ENDPOINTS.owner.advertisements(gamingCenterId),
      payload
    );

    const resData = response.data;

    return (resData?.data || resData) as OwnerAdvertisement;
  },

  async getAdvertisementById(
    gamingCenterId: string,
    id: string
  ): Promise<OwnerAdvertisement | null> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.owner.advertisementDetail(gamingCenterId, id)
      );

      const resData = response.data;

      return (resData?.data || resData) as OwnerAdvertisement;
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  async deleteAdvertisement(
    gamingCenterId: string,
    id: string
  ): Promise<boolean> {
    await apiClient.delete(
      ENDPOINTS.owner.advertisementDetail(gamingCenterId, id)
    );

    return true;
  },
};
