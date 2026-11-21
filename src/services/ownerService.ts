
import { apiClient, ApiError, isAbortError } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  extractMediaItems,
  extractMediaUrl,
  normalizeMediaUrl,
} from "@/lib/media";
import { cleanPhoneNumber, isValidIranPhone } from "@/lib/format";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type {
  ExtraControllerConfigInput,
  StationExtraController,
  StationExtraControllersResult,
} from "@/types/gaming-center/station.types";
import type {
  CenterSettings,
  CommissionListParams,
  CommissionListResult,
  CreateBranchAddressPayload,
  CreateClosureInput,
  CreateGamingCenterPayload,
  CreateLinkPayload,
  Earning,
  GamingCenterClosure,
  GamingCenterSchedule,
  GamingCenterVerificationRecord,
  GamingCenterVerificationStatusResponse,
  MediaItem,
  OwnerAnalyticsSummary,
  OwnerMe,
  OwnerRating,
  OwnerReservation,
  OwnerReservationListParams,
  OwnerReservationListResult,
  PublicCenter,
  ReservationPaymentStatusInfo,
  SiteSettings,
  StationInput,
  SubmitGamingCenterVerificationInput,
  SubmitGamingCenterVerificationResult,
  Ticket,
  VerificationStatus,
} from "@/types/owner";
import type { ReservationTimeProposal } from "@/types/reservation";

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

export function normalizeOwnerRating(raw: OwnerRating): OwnerRating {
  const replyText = (raw.replyComment ?? raw.reply ?? "").trim() || undefined;
  const replyDate = (raw.replyAt ?? raw.repliedAt ?? "").trim() || undefined;
  return {
    ...raw,
    customerName: raw.customerName || raw.author || undefined,
    comment: raw.comment ?? undefined,
    replyComment: replyText,
    reply: replyText,
    replyAt: replyDate,
    repliedAt: replyDate,
    repliedById: raw.repliedById ?? undefined,
  };
}

function extractRatingsList(resData: unknown): OwnerRating[] {
  if (Array.isArray(resData)) {
    return (resData as OwnerRating[]).map(normalizeOwnerRating);
  }
  if (
    resData &&
    typeof resData === "object" &&
    Array.isArray((resData as { data?: unknown }).data)
  ) {
    return ((resData as { data: OwnerRating[] }).data).map(normalizeOwnerRating);
  }
  return [];
}

function extractSingleRating(resData: unknown): OwnerRating | null {
  if (!resData || typeof resData !== "object") return null;
  const obj = resData as Record<string, unknown>;
  if (typeof obj.id === "string") {
    return normalizeOwnerRating(obj as unknown as OwnerRating);
  }
  if (obj.data && typeof obj.data === "object" && typeof (obj.data as Record<string, unknown>).id === "string") {
    return normalizeOwnerRating(obj.data as unknown as OwnerRating);
  }
  return null;
}

interface StationsPageResult {
  items: GameStationInfo[];
  page: number;
  limit: number | null;
  total: number | null;
  totalPages: number | null;
}

function readPaginationMeta(source: unknown): {
  page: number | null;
  limit: number | null;
  total: number | null;
  totalPages: number | null;
} {
  if (!source || typeof source !== "object") {
    return { page: null, limit: null, total: null, totalPages: null };
  }
  const rec = source as Record<string, unknown>;
  const nested =
    rec.pagination && typeof rec.pagination === "object"
      ? (rec.pagination as Record<string, unknown>)
      : rec;

  return {
    page: pickNumber(nested, ["page", "currentPage"]),
    limit: pickNumber(nested, ["limit", "pageSize", "perPage"]),
    total: pickNumber(nested, ["total", "totalItems", "count"]),
    totalPages: pickNumber(nested, ["totalPages", "pageCount", "pages"]),
  };
}

function extractStationsPage(response: {
  data?: unknown;
  meta?: unknown;
  pagination?: unknown;
}): StationsPageResult {
  const data = response?.data;
  let items: GameStationInfo[] = [];
  let innerMetaSource: unknown = null;

  if (Array.isArray(data)) {
    items = data as GameStationInfo[];
  } else if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec.data)) {
      items = rec.data as GameStationInfo[];
      innerMetaSource = rec.meta ?? rec.pagination ?? null;
    } else if (
      rec.data &&
      typeof rec.data === "object" &&
      Array.isArray((rec.data as Record<string, unknown>).data)
    ) {
      const inner = rec.data as Record<string, unknown>;
      items = inner.data as GameStationInfo[];
      innerMetaSource = inner.meta ?? inner.pagination ?? rec.meta ?? null;
    } else if (Array.isArray(rec.stations)) {
      items = rec.stations as GameStationInfo[];
      innerMetaSource = rec.meta ?? rec.pagination ?? null;
    } else if (Array.isArray(rec.items)) {
      items = rec.items as GameStationInfo[];
      innerMetaSource = rec.meta ?? rec.pagination ?? null;
    } else {
      items = asArray<GameStationInfo>(data);
    }
  }

  const outerMeta = readPaginationMeta(response?.meta ?? response?.pagination);
  const innerMeta = readPaginationMeta(innerMetaSource);

  return {
    items,
    page: Math.max(1, innerMeta.page ?? outerMeta.page ?? 1),
    limit: innerMeta.limit ?? outerMeta.limit,
    total: innerMeta.total ?? outerMeta.total,
    totalPages: innerMeta.totalPages ?? outerMeta.totalPages,
  };
}

function resolveTotalPages(first: StationsPageResult): number {
  if (first.totalPages !== null && first.totalPages >= 1) {
    return first.totalPages;
  }
  const effectiveLimit = first.limit ?? first.items.length;
  if (
    first.total !== null &&
    effectiveLimit > 0 &&
    first.total > first.items.length
  ) {
    return Math.ceil(first.total / effectiveLimit);
  }
  return 1;
}

function dedupeStationsById(items: GameStationInfo[]): GameStationInfo[] {
  const seen = new Set<string>();
  const result: GameStationInfo[] = [];
  for (const item of items) {
    if (item?.id) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    result.push(item);
  }
  return result;
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
    const resolvedGamingCenterObj =
      profile?.gamingCenter && typeof profile.gamingCenter === "object"
        ? profile.gamingCenter
        : undefined;
    const resolvedGamingCenterId =
      profile?.gamingCenterId ||
      profile?.centerId ||
      resolvedGamingCenterObj?.id ||
      "";
    const resolvedGamingCenterSlug =
      profile?.gamingCenterSlug ||
      resolvedGamingCenterObj?.slug ||
      (Array.isArray(profile?.gamingCenters)
        ? profile.gamingCenters.find(
            (gc: any) => gc?.id === resolvedGamingCenterId
          )?.slug || profile.gamingCenters[0]?.slug
        : undefined) ||
      undefined;

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
      gamingCenterSlug: resolvedGamingCenterSlug,
      gamingCenter: resolvedGamingCenterObj,
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
    payload: CreateBranchAddressPayload & { isPrimary?: boolean },
    signal?: AbortSignal
  ): Promise<{ id?: string } | undefined> {
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

    if (typeof (payload as { isPrimary?: boolean }).isPrimary === "boolean") {
      body.isPrimary = (payload as { isPrimary?: boolean }).isPrimary;
    }

    const res = await apiClient.post<any>(
      ENDPOINTS.owner.addresses(gamingCenterId),
      body,
      { signal }
    );
    const created = res.data?.data ?? res.data;
    return created && typeof created === "object" ? created : undefined;
  },

  /**
   * ویرایش آدرس شعبه برای گیم‌نت:
   * PATCH /gamingCenters/{gamingCenterId}/addresses/{addressId}
   */
  async updateAddress(
    gamingCenterId: string,
    addressId: string,
    payload: Partial<CreateBranchAddressPayload> & { isPrimary?: boolean },
    signal?: AbortSignal
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (payload.city?.trim()) body.city = payload.city.trim();
    if (payload.addressLine?.trim()) body.addressLine = payload.addressLine.trim();
    if (payload.address?.trim()) body.address = payload.address.trim();
    if (payload.province?.trim()) body.province = payload.province.trim();
    if (payload.phone?.trim()) body.phone = payload.phone.trim();
    if (payload.postalCode?.trim()) body.postalCode = payload.postalCode.trim();
    if (typeof payload.lat === "number" && !isNaN(payload.lat)) body.lat = payload.lat;
    if (typeof payload.lng === "number" && !isNaN(payload.lng)) body.lng = payload.lng;
    if (typeof payload.isPrimary === "boolean") body.isPrimary = payload.isPrimary;

    await apiClient.patch(
      ENDPOINTS.owner.addressDetail(gamingCenterId, addressId),
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
            : resData?.gamingCenter &&
                typeof resData.gamingCenter === "object"
              ? resData.gamingCenter
              : resData?.center && typeof resData.center === "object"
                ? resData.center
                : resData;

        if (centerObj && (centerObj.id || centerObj.name)) {
          let resolvedSlug =
            typeof centerObj.slug === "string" && centerObj.slug !== centerObj.id
              ? centerObj.slug
              : "";

          if (!resolvedSlug) {
            const centers = await ownerService.listCenters(signal).catch(() => []);
            const matched = centers.find(
              (c) => c.id === (centerObj.id || id) || c.slug === id
            );
            if (matched?.slug && matched.slug !== matched.id) {
              resolvedSlug = matched.slug;
            }
          }

          return {
            id: centerObj.id || id,
            name: centerObj.name || "گیم‌نت",
            englishName: centerObj.englishName,
            slug: resolvedSlug,
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
    Array<{
      id?: string;
      address?: string;
      addressLine?: string;
      city?: string;
      cityName?: string;
      province?: string;
      provinceName?: string;
      phone?: string;
      postalCode?: string;
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
      isPrimary?: boolean;
    }>
  > {
    if (!centerId) return [];

    try {
      const res = await apiClient.get<unknown>(
        ENDPOINTS.owner.addresses(centerId),
        { signal }
      );

      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        const rec = raw as Record<string, unknown>;
        if (Array.isArray(rec.data)) return rec.data;
        if (Array.isArray(rec.items)) return rec.items;
        if (Array.isArray(rec.addresses)) return rec.addresses;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * دریافت لیست رزروهای گیم‌نت
   */
  async listReservations(
    centerId: string,
    options?: OwnerReservationListParams
  ): Promise<OwnerReservation[]> {
    const pageResult =
      await ownerService.listReservationsPaginated(centerId, options);

    return pageResult.items;
  },

  async listReservationsPaginated(
    centerId: string,
    options?: OwnerReservationListParams
  ): Promise<OwnerReservationListResult> {
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

    if (options?.search?.trim()) {
      query.search = options.search.trim();
    }

    if (options?.checkInCode?.trim()) {
      query.checkInCode = options.checkInCode.trim();
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
    payload: {
      startTime?: string;
      endTime?: string;
      date?: string;
      slotTime?: string;
      durationHours?: number;
      note?: string;
    }
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (payload.startTime) body.startTime = payload.startTime;
    if (payload.endTime) body.endTime = payload.endTime;
    if (payload.date) body.date = payload.date;
    if (payload.slotTime) body.slotTime = payload.slotTime;
    if (typeof payload.durationHours === "number") body.durationHours = payload.durationHours;
    if (payload.note) body.note = payload.note;

    await apiClient.post(
      ENDPOINTS.owner.proposeTime(centerId, reservationId),
      body
    );
  },

  async listReservationProposals(
    centerId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<ReservationTimeProposal[]> {
    const { data } = await apiClient.get<
      ReservationTimeProposal[] | { data?: ReservationTimeProposal[] }
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

  async getReservationPaymentStatus(
    centerId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<ReservationPaymentStatusInfo | null> {
    const { data } = await apiClient.get<
      ReservationPaymentStatusInfo | { data?: ReservationPaymentStatusInfo }
    >(
      ENDPOINTS.payment.status(centerId, reservationId),
      { signal }
    );

    if (!data || typeof data !== "object") return null;
    if ("data" in data && data.data && typeof data.data === "object") {
      return data.data as ReservationPaymentStatusInfo;
    }
    return data as ReservationPaymentStatusInfo;
  },

  async updateReservation(
    centerId: string,
    reservationId: string,
    payload: {
      stationId?: string;
      staffId?: string;
      startTime?: string;
      note?: string;
    }
  ): Promise<OwnerReservation> {
    const { data } = await apiClient.patch<
      OwnerReservation | { data?: OwnerReservation }
    >(
      ENDPOINTS.owner.reservationDetail(centerId, reservationId),
      payload
    );

    if (data && typeof data === "object" && "data" in data && (data as any).data) {
      return (data as any).data as OwnerReservation;
    }
    return data as OwnerReservation;
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
    options?:
      | { catalogDeviceId?: string; page?: number; limit?: number; signal?: AbortSignal }
      | AbortSignal
  ): Promise<GameStationInfo[]> {
    if (!centerId) return [];

    let signal: AbortSignal | undefined;
    let explicitPage: number | undefined;
    const baseQuery: Record<string, string | number> = {};

    if (options instanceof AbortSignal) {
      signal = options;
    } else if (options) {
      signal = options.signal;

      if (options.catalogDeviceId) {
        baseQuery.catalogDeviceId = options.catalogDeviceId;
      }
      if (typeof options.page === "number" && options.page >= 1) {
        explicitPage = options.page;
        baseQuery.page = options.page;
      }
      if (typeof options.limit === "number" && options.limit >= 1) {
        baseQuery.limit = options.limit;
      }
    }

    const fetchPage = async (pageOverride?: number) => {
      const query =
        pageOverride !== undefined ? { ...baseQuery, page: pageOverride } : baseQuery;
      const response = await apiClient.get<unknown>(ENDPOINTS.owner.stations(centerId), {
        query: Object.keys(query).length > 0 ? query : undefined,
        signal,
      });
      return extractStationsPage(response);
    };

    const first = await fetchPage();
    if (explicitPage !== undefined) {
      return first.items;
    }

    const totalPages = resolveTotalPages(first);
    if (totalPages <= first.page) {
      return first.items;
    }

    const MAX_PAGES = 50;
    const lastPage = Math.min(totalPages, MAX_PAGES);
    const remainingPages: number[] = [];
    for (let p = first.page + 1; p <= lastPage; p += 1) {
      remainingPages.push(p);
    }

    const allItems = [...first.items];
    const BATCH_SIZE = 5;
    for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((p) => fetchPage(p)));
      for (const res of results) {
        allItems.push(...res.items);
      }
    }

    return dedupeStationsById(allItems);
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

    if (payload.deviceTypeId) {
      body.deviceTypeId = payload.deviceTypeId;
    }

    if (payload.extraControllers && payload.extraControllers.length > 0) {
      body.extraControllers = payload.extraControllers.map((ec) => ({
        controllerType: ec.controllerType.trim(),
        quantity: ec.quantity,
        hourlyPrice: ec.hourlyPrice,
        isActive: ec.isActive ?? true,
      }));
    }

    const res = await apiClient.post<unknown>(
      ENDPOINTS.owner.stations(centerId),
      body
    );

    const raw = res.data;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data && typeof (raw as { data: unknown }).data === "object") {
      return (raw as { data: GameStationInfo }).data;
    }
    return raw as GameStationInfo;
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

  async listStationExtraControllers(
    centerId: string,
    stationId: string,
    signal?: AbortSignal
  ): Promise<StationExtraControllersResult> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.owner.stationExtraControllers(centerId, stationId),
      { signal }
    );

    const raw = res.data;
    const payload =
      raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data !== undefined
        ? (raw as { data: unknown }).data
        : raw;

    if (Array.isArray(payload)) {
      return {
        extraControllerEnabled: true,
        extraControllers: payload as StationExtraController[],
      };
    }

    if (payload && typeof payload === "object") {
      const rec = payload as Record<string, unknown>;
      const list = Array.isArray(rec.extraControllers)
        ? (rec.extraControllers as StationExtraController[])
        : Array.isArray(rec.items)
          ? (rec.items as StationExtraController[])
          : Array.isArray(rec.data)
            ? (rec.data as StationExtraController[])
            : [];

      const enabled =
        typeof rec.extraControllerEnabled === "boolean"
          ? rec.extraControllerEnabled
          : typeof rec.enabled === "boolean"
            ? rec.enabled
            : undefined;

      return {
        extraControllerEnabled: enabled,
        extraControllers: list,
      };
    }

    return { extraControllers: [] };
  },

  async replaceStationExtraControllers(
    centerId: string,
    stationId: string,
    extraControllers: ExtraControllerConfigInput[],
    signal?: AbortSignal
  ): Promise<StationExtraController[]> {
    const normalized = extraControllers.map((ec) => ({
      controllerType: ec.controllerType.trim(),
      quantity: ec.quantity,
      hourlyPrice: ec.hourlyPrice,
      isActive: ec.isActive ?? true,
    }));

    try {
      const res = await apiClient.put<unknown>(
        ENDPOINTS.owner.stationExtraControllers(centerId, stationId),
        { extraControllers: normalized },
        { signal }
      );

      const raw = res.data;
      const payload =
        raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data !== undefined
          ? (raw as { data: unknown }).data
          : raw;

      if (Array.isArray(payload)) return payload as StationExtraController[];
      if (payload && typeof payload === "object") {
        const rec = payload as Record<string, unknown>;
        if (Array.isArray(rec.extraControllers)) return rec.extraControllers as StationExtraController[];
        if (Array.isArray(rec.items)) return rec.items as StationExtraController[];
      }
      return [];
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 500)) {
        const current = await ownerService
          .listStationExtraControllers(centerId, stationId, signal)
          .catch(() => ({ extraControllers: [] as StationExtraController[] }));
        return ownerService.syncStationExtraControllers(
          centerId,
          stationId,
          normalized,
          current.extraControllers,
          signal
        );
      }
      throw err;
    }
  },

  async syncStationExtraControllers(
    centerId: string,
    stationId: string,
    nextConfigs: Array<ExtraControllerConfigInput & { existingId?: string }>,
    existingConfigs: StationExtraController[] = [],
    signal?: AbortSignal
  ): Promise<StationExtraController[]> {
    const existingById = new Map(existingConfigs.map((c) => [c.id, c]));
    const existingByType = new Map(
      existingConfigs.map((c) => [c.controllerType.trim().toLowerCase(), c])
    );

    const keptIds = new Set<string>();
    const results: StationExtraController[] = [];

    for (const cfg of nextConfigs) {
      const trimmedType = cfg.controllerType.trim();
      const isActive = cfg.isActive ?? true;
      const matched =
        (cfg.existingId ? existingById.get(cfg.existingId) : undefined) ??
        existingByType.get(trimmedType.toLowerCase());

      if (matched) {
        keptIds.add(matched.id);
        const changed =
          matched.controllerType.trim() !== trimmedType ||
          matched.quantity !== cfg.quantity ||
          matched.hourlyPrice !== cfg.hourlyPrice ||
          (matched.isActive ?? true) !== isActive;

        if (changed) {
          const updated = await ownerService.updateStationExtraController(
            centerId,
            stationId,
            matched.id,
            {
              controllerType: trimmedType,
              quantity: cfg.quantity,
              hourlyPrice: cfg.hourlyPrice,
              isActive,
            },
            signal
          );
          results.push(updated);
        } else {
          results.push(matched);
        }
      } else {
        const created = await ownerService.createStationExtraController(
          centerId,
          stationId,
          {
            controllerType: trimmedType,
            quantity: cfg.quantity,
            hourlyPrice: cfg.hourlyPrice,
            isActive,
          },
          signal
        );
        results.push(created);
      }
    }

    for (const prev of existingConfigs) {
      if (!keptIds.has(prev.id)) {
        await ownerService.deleteStationExtraController(
          centerId,
          stationId,
          prev.id,
          signal
        );
      }
    }

    return results;
  },

  async createStationExtraController(
    centerId: string,
    stationId: string,
    payload: ExtraControllerConfigInput,
    signal?: AbortSignal
  ): Promise<StationExtraController> {
    const res = await apiClient.post<unknown>(
      ENDPOINTS.owner.stationExtraControllers(centerId, stationId),
      {
        controllerType: payload.controllerType.trim(),
        quantity: payload.quantity,
        hourlyPrice: payload.hourlyPrice,
        isActive: payload.isActive ?? true,
      },
      { signal }
    );
    const raw = res.data;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      return (raw as { data: StationExtraController }).data;
    }
    return raw as StationExtraController;
  },

  async updateStationExtraController(
    centerId: string,
    stationId: string,
    extraControllerId: string,
    payload: ExtraControllerConfigInput,
    signal?: AbortSignal
  ): Promise<StationExtraController> {
    const res = await apiClient.patch<unknown>(
      ENDPOINTS.owner.stationExtraControllerDetail(centerId, stationId, extraControllerId),
      {
        controllerType: payload.controllerType.trim(),
        quantity: payload.quantity,
        hourlyPrice: payload.hourlyPrice,
        isActive: payload.isActive ?? true,
      },
      { signal }
    );
    const raw = res.data;
    if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data) {
      return (raw as { data: StationExtraController }).data;
    }
    return raw as StationExtraController;
  },

  async deleteStationExtraController(
    centerId: string,
    stationId: string,
    extraControllerId: string,
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.delete(
      ENDPOINTS.owner.stationExtraControllerDetail(centerId, stationId, extraControllerId),
      { signal }
    );
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
    signal?: AbortSignal,
    options?: { noCache?: boolean }
  ): Promise<MediaItem[]> {
    if (!slug) return [];

    try {
      const { data } = await apiClient.get<unknown>(
        ENDPOINTS.gamingCenter.media(slug),
        {
          signal,
          ...(options?.noCache
            ? {
                cache: "no-store" as RequestCache,
                headers: { "Cache-Control": "no-cache" },
              }
            : {}),
        }
      );

      return extractMediaItems<MediaItem>(data, "GALLERY");
    } catch {
      return [];
    }
  },

  /**
   * دریافت امن لیست تصاویر گالری برای پنل مالک:
   * - از ارسال شناسه CUID (centerId) به اندپوینت عمومی /public/gamingCenters/{slug}/media جلوگیری می‌کند
   * - در صورت نبود slug یا خطای 404 (مثلاً گیم‌نت در انتظار تایید)، از GET /gamingCenters/{centerId}
   *   برای یافتن slug واقعی یا استخراج تصاویر ثبت‌شده استفاده می‌کند.
   */
  async listOwnerMedia(
    centerId: string,
    slug?: string,
    signal?: AbortSignal,
    options?: { noCache?: boolean }
  ): Promise<MediaItem[]> {
    const cleanId = centerId?.trim() || "";
    const cleanSlug = slug?.trim() || "";
    const hasValidSlug = Boolean(cleanSlug && cleanSlug !== cleanId);
    const reqOpts = options?.noCache
      ? {
          signal,
          cache: "no-store" as RequestCache,
          headers: { "Cache-Control": "no-cache" },
        }
      : { signal };

    if (hasValidSlug) {
      try {
        const { data } = await apiClient.get<unknown>(
          ENDPOINTS.gamingCenter.media(cleanSlug),
          reqOpts
        );
        return extractMediaItems<MediaItem>(data, "GALLERY");
      } catch (err) {
        if (isAbortError(err)) throw err;
      }
    }

    if (!cleanId) return [];

    try {
      const direct = await apiClient.get<any>(
        ENDPOINTS.owner.center(cleanId),
        reqOpts
      );
      const resData = direct.data;
      const centerObj: any =
        resData?.data && typeof resData.data === "object" && !Array.isArray(resData.data)
          ? resData.data
          : resData?.gamingCenter && typeof resData.gamingCenter === "object"
            ? resData.gamingCenter
            : resData;

      if (centerObj && typeof centerObj === "object") {
        const discoveredSlug =
          typeof centerObj.slug === "string" ? centerObj.slug.trim() : "";

        if (
          discoveredSlug &&
          discoveredSlug !== cleanId &&
          discoveredSlug !== cleanSlug
        ) {
          try {
            const { data } = await apiClient.get<unknown>(
              ENDPOINTS.gamingCenter.media(discoveredSlug),
              reqOpts
            );
            return extractMediaItems<MediaItem>(data, "GALLERY");
          } catch (err) {
            if (isAbortError(err)) throw err;
          }
        }

        const embeddedMedia = extractMediaItems<MediaItem>(centerObj, "GALLERY");
        if (embeddedMedia.length > 0) {
          return embeddedMedia;
        }

        const fallbackUrls: string[] = [];
        if (Array.isArray(centerObj.coverImages)) {
          centerObj.coverImages.forEach((u: unknown) => {
            if (typeof u === "string" && u.trim()) fallbackUrls.push(u.trim());
          });
        }
        if (typeof centerObj.coverImageUrl === "string" && centerObj.coverImageUrl.trim()) {
          fallbackUrls.push(centerObj.coverImageUrl.trim());
        }
        if (typeof centerObj.banner === "string" && centerObj.banner.trim()) {
          fallbackUrls.push(centerObj.banner.trim());
        }

        const uniqueUrls = Array.from(new Set(fallbackUrls));
        if (uniqueUrls.length > 0) {
          return uniqueUrls
            .map((rawUrl, idx) => ({
              id: `center-cover-${idx}`,
              url: normalizeMediaUrl(rawUrl),
              altText: centerObj.name || "تصویر گیم‌نت",
              purpose: "GALLERY" as const,
            }))
            .filter((item) => Boolean(item.url));
        }
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
    }

    return [];
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
    mediaId: string,
    signal?: AbortSignal
  ): Promise<void> {
    const cleanCenterId = centerId?.trim();
    const cleanMediaId = mediaId?.trim();

    if (!cleanCenterId) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }
    if (!cleanMediaId) {
      throw new Error("شناسه تصویر مشخص نشده است.");
    }

    await apiClient.delete(
      ENDPOINTS.owner.mediaDelete(cleanCenterId, cleanMediaId),
      { signal }
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

    return extractRatingsList(response.data);
  },

  async listCenterRatings(
    centerId: string,
    options?: {
      status?: "PUBLISHED" | "HIDDEN" | "DELETED";
      signal?: AbortSignal;
    }
  ): Promise<OwnerRating[]> {
    if (!centerId?.trim()) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }

    const query: Record<string, string> = {};
    if (options?.status) {
      query.status = options.status;
    }

    const response = await apiClient.get<unknown>(
      ENDPOINTS.owner.ratings(centerId.trim()),
      {
        query,
        signal: options?.signal,
      }
    );

    return extractRatingsList(response.data);
  },

  async replyToRating(
    centerId: string,
    ratingId: string,
    replyText: string
  ): Promise<OwnerRating | null> {
    if (!centerId?.trim()) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }
    if (!ratingId?.trim()) {
      throw new Error("شناسه نظر مشخص نشده است.");
    }
    const cleanReply = replyText?.trim();
    if (!cleanReply) {
      throw new Error("متن پاسخ نمی‌تواند خالی باشد.");
    }

    const endpoint = ENDPOINTS.owner.ratingReply(centerId.trim(), ratingId.trim());
    const response = await apiClient.post<unknown>(endpoint, { reply: cleanReply });
    return extractSingleRating(response.data);
  },

  async deleteRatingReply(
    centerId: string,
    ratingId: string
  ): Promise<void> {
    if (!centerId?.trim()) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }
    if (!ratingId?.trim()) {
      throw new Error("شناسه نظر مشخص نشده است.");
    }

    const endpoint = ENDPOINTS.owner.ratingReply(centerId.trim(), ratingId.trim());
    await apiClient.delete(endpoint);
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

  /**
   * دریافت وضعیت احراز هویت گیم‌نت (KYC) مطابق OpenAPI:
   * GET /gamingCenters/{gamingCenterId}/verification
   */
  async getVerificationStatus(
    gamingCenterId: string,
    signal?: AbortSignal
  ): Promise<GamingCenterVerificationStatusResponse> {
    if (!gamingCenterId) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }

    const response = await apiClient.get<Record<string, unknown>>(
      ENDPOINTS.owner.verification(gamingCenterId),
      { signal }
    );

    const raw = response.data as Record<string, unknown>;
    const payload = (
      raw?.data && typeof raw.data === "object" ? raw.data : raw ?? {}
    ) as Record<string, unknown>;

    const validStatuses: VerificationStatus[] = [
      "NOT_SUBMITTED",
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];
    const normalizeStatus = (val: unknown): VerificationStatus => {
      const upper = typeof val === "string" ? val.toUpperCase() : "";
      return validStatuses.includes(upper as VerificationStatus)
        ? (upper as VerificationStatus)
        : "NOT_SUBMITTED";
    };

    const rawLatest = payload?.latestVerification as
      | Record<string, unknown>
      | undefined
      | null;
    const latestVerification: GamingCenterVerificationRecord | null =
      rawLatest && typeof rawLatest === "object"
        ? {
            id: String(rawLatest.id ?? rawLatest.verificationId ?? ""),
            gamingCenterId: String(
              rawLatest.gamingCenterId ?? payload.gamingCenterId ?? gamingCenterId
            ),
            ownerFullName:
              typeof rawLatest.ownerFullName === "string"
                ? rawLatest.ownerFullName
                : null,
            phoneNumber:
              typeof rawLatest.phoneNumber === "string"
                ? rawLatest.phoneNumber
                : null,
            gamingCenterName:
              typeof rawLatest.gamingCenterName === "string"
                ? rawLatest.gamingCenterName
                : null,
            businessLicenseUrl: normalizeMediaUrl(
              typeof rawLatest.businessLicenseUrl === "string"
                ? rawLatest.businessLicenseUrl
                : ""
            ),
            nationalCardUrl:
              typeof rawLatest.nationalCardUrl === "string"
                ? normalizeMediaUrl(rawLatest.nationalCardUrl)
                : null,
            idWithSelfieUrl:
              typeof rawLatest.idWithSelfieUrl === "string"
                ? normalizeMediaUrl(rawLatest.idWithSelfieUrl)
                : null,
            status: normalizeStatus(rawLatest.status ?? payload.verificationStatus),
            rejectionReason:
              typeof rawLatest.rejectionReason === "string"
                ? rawLatest.rejectionReason
                : typeof payload.rejectionReason === "string"
                  ? payload.rejectionReason
                  : null,
            reviewedAt:
              typeof rawLatest.reviewedAt === "string"
                ? rawLatest.reviewedAt
                : null,
            createdAt: String(rawLatest.createdAt ?? ""),
            updatedAt: String(rawLatest.updatedAt ?? rawLatest.createdAt ?? ""),
          }
        : null;

    return {
      gamingCenterId: String(payload.gamingCenterId ?? gamingCenterId),
      name: String(payload.name ?? ""),
      verificationStatus: normalizeStatus(
        payload.verificationStatus ?? latestVerification?.status
      ),
      verifiedAt:
        typeof payload.verifiedAt === "string" ? payload.verifiedAt : null,
      rejectionReason:
        typeof payload.rejectionReason === "string"
          ? payload.rejectionReason
          : latestVerification?.rejectionReason ?? null,
      latestVerification,
    };
  },

  /**
   * ثبت درخواست احراز هویت گیم‌نت (KYC) مطابق OpenAPI:
   * POST /gamingCenters/{gamingCenterId}/verification (multipart/form-data)
   */
  async submitVerification(
    gamingCenterId: string,
    payload: SubmitGamingCenterVerificationInput,
    signal?: AbortSignal
  ): Promise<SubmitGamingCenterVerificationResult> {
    if (!gamingCenterId) {
      throw new Error("شناسه گیم‌نت مشخص نشده است.");
    }

    const ownerFullName = payload.ownerFullName?.trim() || "";
    if (ownerFullName.length < 2) {
      throw new Error("نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.");
    }

    const phoneNumber = cleanPhoneNumber(payload.phoneNumber);
    if (!isValidIranPhone(phoneNumber)) {
      throw new Error("شماره موبایل معتبر وارد کنید (مثلاً 09123456789).");
    }

    const gamingCenterName = payload.gamingCenterName?.trim() || "";
    if (gamingCenterName.length < 2) {
      throw new Error("نام گیم‌نت باید حداقل ۲ کاراکتر باشد.");
    }

    const file = payload.businessLicense;
    if (!file) {
      throw new Error("لطفاً تصویر پروانه کسب گیم‌نت را انتخاب کنید.");
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB مطابق OpenAPI
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("حجم فایل پروانه کسب نباید بیشتر از ۵ مگابایت باشد.");
    }

    const form = new FormData();
    form.append("ownerFullName", ownerFullName);
    form.append("phoneNumber", phoneNumber);
    form.append("gamingCenterName", gamingCenterName);
    form.append("businessLicense", file);

    const response = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.owner.verification(gamingCenterId),
      form,
      { signal }
    );

    const raw = response.data as Record<string, unknown>;
    const data = (
      raw?.data && typeof raw.data === "object" ? raw.data : raw ?? {}
    ) as Record<string, unknown>;

    return {
      verificationId: String(data.verificationId ?? data.id ?? ""),
      gamingCenterId: String(data.gamingCenterId ?? gamingCenterId),
      status:
        (String(data.status ?? "PENDING").toUpperCase() as VerificationStatus) ||
        "PENDING",
      ownerFullName: String(data.ownerFullName ?? ownerFullName),
      phoneNumber: String(data.phoneNumber ?? phoneNumber),
      gamingCenterName: String(data.gamingCenterName ?? gamingCenterName),
      businessLicenseUrl: normalizeMediaUrl(
        typeof data.businessLicenseUrl === "string"
          ? data.businessLicenseUrl
          : ""
      ),
      message: typeof data.message === "string" ? data.message : undefined,
    };
  },
};
