import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type {
  CenterSettings,
  CommissionListParams,
  CommissionListResult,
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
    const { data } = await apiClient.get<OwnerMe>(ENDPOINTS.owner.me, { signal });
    return data;
  },

  /**
   * دریافت گیم‌نت‌های در دسترس برای کاربر
   * در صورت ارائه پارامترهای صفحه‌بندی، لیست مراکز بازی واکشی می‌شود
   */
  async listCenters(signal?: AbortSignal): Promise<PublicCenter[]> {
    try {
      const { data } = await apiClient.get<PublicCenter[]>(ENDPOINTS.owner.centers, {
        query: { page: 1, pageSize: 200, limit: 200 },
        signal,
      });
      return asArray<PublicCenter>(data);
    } catch (err) {
      throw err;
    }
  },

  /** دریافت مشخصات مرکز بر اساس شناسه یا اسلاگ */
  async findCenter(id: string, signal?: AbortSignal): Promise<PublicCenter | null> {
    if (!id) return null;
    try {
      const centers = await ownerService.listCenters(signal);
      return centers.find((c) => c.id === id || c.slug === id) ?? null;
    } catch (err) {
      throw err;
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
   * pause: POST /gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/pause
   * resume: POST /gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/resume
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
    } catch (err) {
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

  async listStations(centerId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    if (!centerId) return [];
    const { data } = await apiClient.get<GameStationInfo[]>(ENDPOINTS.owner.stations(centerId), { signal });
    return asArray<GameStationInfo>(data);
  },

  /**
   * عملیات تغییر وضعیت رزرو در پنل صاحب گیم‌نت:
   * مطابق با گزارش CONTRACT GAP در docs/OWNER_RESERVATIONS_API_CONTRACT.md،
   * اسکیما و مسیرهای رسمی OpenAPI (v1.0-LOCKED) برای عملیات‌های تایید رزرو (Confirm) و لغو/رد رزرو (Cancel/Reject)
   * توسط صاحب مرکز فاقد اندپوینت اختصاصی هستند و متد PATCH /reservation/{reservationId} نیز فیلد status ندارد.
   * بنابراین از ارسال درخواست نامعتبر با فیلد تعریف‌نشده status در متد PATCH اکیداً خودداری می‌شود.
   */
  async updateReservationStatus(
    centerId: string,
    reservationId: string,
    status: OwnerReservation["status"]
  ): Promise<void> {
    // Attempt backend transition using dedicated transition routes if implemented or fail with contract gap error
    // Do NOT send undocumented { status } in PATCH /gamingCenters/{centerId}/reservation/{reservationId}
    const transitionAction =
      status === "CONFIRMED"
        ? "confirm"
        : status === "CANCELED"
        ? "cancel"
        : status === "NO_SHOW"
        ? "no-show"
        : null;

    if (!transitionAction) {
      throw new Error(`انتقال وضعیت رزرو به ${status} پشتیبانی نمی‌شود.`);
    }

    try {
      await apiClient.post(
        `${ENDPOINTS.owner.reservations(centerId)}/${encodeURIComponent(reservationId)}/${transitionAction}`,
        {}
      );
    } catch (err: any) {
      if (err?.status === 404 || err?.code === "NOT_FOUND") {
        throw new Error(
          "عملیات تایید یا لغو رزرو توسط صاحب مجموعه نیازمند پیاده‌سازی اندپوینت اختصاصی در بک‌اند است (مستند شده در docs/OWNER_RESERVATIONS_API_CONTRACT.md)."
        );
      }
      throw err;
    }
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

  async listMedia(slug: string, signal?: AbortSignal): Promise<MediaItem[]> {
    if (!slug) return [];
    const { data } = await apiClient.get<MediaItem[]>(ENDPOINTS.gamingCenter.media(slug), { signal });
    return asArray<MediaItem>(data).filter((m) => !!m?.url);
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

    const res = await apiClient.post<MediaItem | { id?: string; url?: string; media?: MediaItem }>(
      ENDPOINTS.owner.mediaUpload(centerId),
      form
    );

    // Read actual server response
    const data = res.data as any;
    if (data && typeof data === "object") {
      if (data.url) {
        return {
          id: data.id,
          url: data.url,
          altText: data.altText || options?.altText || file.name,
          purpose: data.purpose || options?.purpose || "GALLERY",
        };
      }
      if (data.media?.url) {
        return data.media;
      }
    }

    return {
      url: "",
      altText: options?.altText || file.name,
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
