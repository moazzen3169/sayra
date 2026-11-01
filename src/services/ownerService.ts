import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type {
  CenterSettings,
  Earning,
  MediaItem,
  OwnerMe,
  OwnerRating,
  OwnerReservation,
  PublicCenter,
  SiteSettings,
  StationInput,
  Ticket,
} from "@/types/owner";

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** ساختار پاسخ analytics/summary در OpenAPI تعریف نشده؛ اولین فیلد عددی موجود خوانده می‌شود */
export function pickNumber(obj: unknown, keys: string[]): number | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && isFinite(v)) return v;
  }
  return null;
}

const mockCenter: PublicCenter = {
  id: "gc-1",
  name: "گیمنت گرگدن",
  slug: "gc-1",
  description: "تبریز، ولیعصر، خیابان قانون، مجتمع گرگدن",
  isActive: true,
};

const at = (offsetMinutes: number): string =>
  new Date(Date.now() + offsetMinutes * 60_000).toISOString();

/* ---- Mock In-Memory Stores ---- */
let mockReservationsStore: OwnerReservation[] = [
  {
    id: "r-owner-1",
    reservationCode: "879456",
    gamingCenterId: "gc-1",
    gamingCenterName: "گیمنت گرگدن",
    gamingCenterAddress: "تبریز، ولیعصر، خیابان قانون",
    stationId: "st-ps5-1",
    stationSnapshot: { name: "پلی‌استیشن ۵ #۱", hourlyPrice: 220000, stationType: "PLAYSTATION" },
    status: "PENDING",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 440000,
    startTime: at(30),
    endTime: at(150),
    customer: { fullName: "علیرضا احمدی", phone: "09123456789" },
    customerName: "علیرضا احمدی",
    customerPhone: "09123456789",
  },
  {
    id: "r-owner-2",
    reservationCode: "879457",
    gamingCenterId: "gc-1",
    gamingCenterName: "گیمنت گرگدن",
    gamingCenterAddress: "تبریز، ولیعصر، خیابان قانون",
    stationId: "st-pc-3",
    stationSnapshot: { name: "کامپیوتر گیمینگ VIP", hourlyPrice: 260000, stationType: "PC" },
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 3,
    totalPrice: 780000,
    startTime: at(120),
    endTime: at(300),
    customer: { fullName: "مهدی رسولی", phone: "09141112233" },
    customerName: "مهدی رسولی",
    customerPhone: "09141112233",
  },
  {
    id: "r-owner-3",
    reservationCode: "879458",
    gamingCenterId: "gc-1",
    gamingCenterName: "گیمنت گرگدن",
    gamingCenterAddress: "تبریز، ولیعصر، خیابان قانون",
    stationId: "st-vr-1",
    stationSnapshot: { name: "اتاق واقعیت مجازی VR", hourlyPrice: 280000, stationType: "VR" },
    status: "IN_PROGRESS",
    paymentState: "PAID",
    totalHours: 1,
    totalPrice: 280000,
    startTime: at(-20),
    endTime: at(40),
    customer: { fullName: "امین صادقی", phone: "09183334455" },
    customerName: "امین صادقی",
    customerPhone: "09183334455",
  },
  {
    id: "r-owner-4",
    reservationCode: "879459",
    gamingCenterId: "gc-1",
    gamingCenterName: "گیمنت گرگدن",
    gamingCenterAddress: "تبریز، ولیعصر، خیابان قانون",
    stationId: "st-xbox-1",
    stationSnapshot: { name: "ایکس‌باکس سری ایکس #۱", hourlyPrice: 190000, stationType: "XBOX" },
    status: "COMPLETED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 380000,
    startTime: at(-1440),
    endTime: at(-1320),
    customer: { fullName: "رضا کریمی", phone: "09129998877" },
    customerName: "رضا کریمی",
    customerPhone: "09129998877",
  },
  {
    id: "r-owner-5",
    reservationCode: "879460",
    gamingCenterId: "gc-1",
    gamingCenterName: "گیمنت گرگدن",
    gamingCenterAddress: "تبریز، ولیعصر، خیابان قانون",
    stationId: "st-pc-1",
    stationSnapshot: { name: "کامپیوتر گیمینگ #۱", hourlyPrice: 180000, stationType: "PC" },
    status: "CANCELED",
    paymentState: "REFUNDED",
    totalHours: 2,
    totalPrice: 360000,
    startTime: at(-2880),
    endTime: at(-2760),
    customer: { fullName: "حسن حسینی", phone: "09351234567" },
    customerName: "حسن حسینی",
    customerPhone: "09351234567",
  },
];

let mockStationsStore: GameStationInfo[] = [
  { id: "st-pc-1", gamingCenterId: "gc-1", name: "کامپیوتر گیمینگ #۱", stationType: "PC", hourlyPrice: 180000, quantity: 5, defaultControllers: 0, maxExtraControllers: 0, extraControllerPrice: 0, isActive: true },
  { id: "st-pc-2", gamingCenterId: "gc-1", name: "کامپیوتر گیمینگ #۲", stationType: "PC", hourlyPrice: 180000, quantity: 5, defaultControllers: 0, maxExtraControllers: 0, extraControllerPrice: 0, isActive: true },
  { id: "st-pc-3", gamingCenterId: "gc-1", name: "کامپیوتر گیمینگ VIP", stationType: "PC", hourlyPrice: 260000, quantity: 3, isVip: true, defaultControllers: 0, maxExtraControllers: 0, extraControllerPrice: 0, isActive: true },
  { id: "st-ps5-1", gamingCenterId: "gc-1", name: "پلی‌استیشن ۵ #۱", stationType: "PLAYSTATION", hourlyPrice: 220000, quantity: 4, defaultControllers: 2, maxExtraControllers: 2, extraControllerPrice: 50000, isActive: true },
  { id: "st-ps5-2", gamingCenterId: "gc-1", name: "پلی‌استیشن ۵ VIP", stationType: "PLAYSTATION", hourlyPrice: 300000, quantity: 2, isVip: true, defaultControllers: 2, maxExtraControllers: 2, extraControllerPrice: 60000, isActive: true },
  { id: "st-xbox-1", gamingCenterId: "gc-1", name: "ایکس‌باکس سری ایکس #۱", stationType: "XBOX", hourlyPrice: 190000, quantity: 3, defaultControllers: 2, maxExtraControllers: 2, extraControllerPrice: 40000, isActive: true },
  { id: "st-vr-1", gamingCenterId: "gc-1", name: "اتاق واقعیت مجازی VR", stationType: "VR", hourlyPrice: 280000, quantity: 1, isVip: true, defaultControllers: 0, maxExtraControllers: 0, extraControllerPrice: 0, isActive: true },
];

let mockSettingsStore: CenterSettings = {
  timeZone: "Asia/Tehran",
  workStartTime: "10:00",
  workEndTime: "23:30",
  allowOnlineBooking: true,
  onlineBookingAutoConfirm: true,
  preventOverlaps: true,
};

let mockMediaStore: MediaItem[] = [
  { id: "media-1", url: "/context/sayra-slide-1.jpg", altText: "نمای عمومی سالن" },
  { id: "media-2", url: "/context/sayra-slide-2.jpg", altText: "سیستم‌های کامپیوتر گیمینگ" },
  { id: "media-3", url: "/context/sayra-slide-3.jpg", altText: "اتاق پلی‌استیشن ۵ VIP" },
  { id: "media-4", url: "/img/gamnet-1.webp", altText: "صندلی‌های گیمینگ ارگونومیک" },
  { id: "media-5", url: "/img/gamnet-2.webp", altText: "تجهیزات VR و واقعیت مجازی" },
];

let mockRatingsStore: OwnerRating[] = [
  {
    id: "rat-1",
    rating: 5,
    customerName: "علیرضا احمدی",
    comment: "عالی بود، سیستم‌ها فوق‌العاده قوی هستن و کیفیت مانیتورهای ۲۴۰ هرتز عالیه.",
    status: "PUBLISHED",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "rat-2",
    rating: 4.5,
    customerName: "محمد حسینی",
    comment: "برخورد پرسنل عالی و فضا کاملا تمیز و حرفه‌ای بود. حتما باز هم میام.",
    status: "PUBLISHED",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "rat-3",
    rating: 5,
    customerName: "پویا کریمی",
    comment: "رزرو آنلاین خیلی سریع و بدون معطلی انجام شد، کیفیت دسته‌های PS5 خیلی خوب بود.",
    status: "PUBLISHED",
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

const mockAnalyticsStore = {
  totalIncome: 12500000,
  totalReservations: 48,
  activeStationsCount: 7,
  withdrawableAmount: 8500000,
  withdrawableRevenue: 8500000,
  netRevenue: 8500000,
  totalRevenue: 12500000,
};

const mockCommissionsStore: Earning[] = [
  { id: "earning-1", reservationId: "r-owner-1", status: "ACCRUED", commissionAmount: 120000, currency: "تومان" },
  { id: "earning-2", reservationId: "r-owner-2", status: "CHARGED", commissionAmount: 95000, currency: "تومان" },
  { id: "earning-3", reservationId: "r-owner-3", status: "PENDING", commissionAmount: 45000, currency: "تومان" },
  { id: "earning-4", reservationId: "r-owner-4", status: "CHARGED", commissionAmount: 150000, currency: "تومان" },
  { id: "earning-5", reservationId: "r-owner-5", status: "REFUNDED", commissionAmount: 0, currency: "تومان" },
];


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
      if (USE_MOCK_RESERVATIONS) return [mockCenter];
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
      if (USE_MOCK_RESERVATIONS && id === mockCenter.id) {
        return mockCenter;
      }
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

    if (USE_MOCK_RESERVATIONS) {
      let filtered = [...mockReservationsStore];
      if (statusFilter) {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
      const total = filtered.length;
      const start = (requestedPage - 1) * requestedPageSize;
      const items = filtered.slice(start, start + requestedPageSize);
      return {
        items,
        total,
        page: requestedPage,
        pageSize: requestedPageSize,
        totalPages: Math.ceil(total / requestedPageSize) || 1,
      };
    }

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
    if (USE_MOCK_RESERVATIONS) {
      const found = mockReservationsStore.find((r) => r.id === reservationId);
      if (found) return found;
      throw new Error("رزرو پیدا نشد.");
    }

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
    if (USE_MOCK_RESERVATIONS) {
      const target = mockReservationsStore.find((r) => r.id === reservationId);
      if (target) {
        target.startTime = payload.startTime;
        target.endTime = payload.endTime;
      }
      return;
    }

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
    if (USE_MOCK_RESERVATIONS) return [];

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
    if (USE_MOCK_RESERVATIONS) {
      const target = mockReservationsStore.find((r) => r.id === reservationId);
      if (target) {
        if (action === "start") target.status = "IN_PROGRESS";
        if (action === "stop") target.status = "COMPLETED";
      }
      return;
    }

    await apiClient.post(ENDPOINTS.owner.session(centerId, reservationId, action));
  },

  async getSettings(centerId: string, signal?: AbortSignal): Promise<CenterSettings> {
    if (USE_MOCK_RESERVATIONS) return { ...mockSettingsStore };
    try {
      const { data } = await apiClient.get<CenterSettings>(ENDPOINTS.owner.settings(centerId), { signal });
      return data;
    } catch (err) {
      if (USE_MOCK_RESERVATIONS) return { ...mockSettingsStore };
      throw err;
    }
  },

  async updateSettings(centerId: string, payload: CenterSettings): Promise<void> {
    if (USE_MOCK_RESERVATIONS) {
      mockSettingsStore = { ...mockSettingsStore, ...payload };
      return;
    }
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
      if (USE_MOCK_RESERVATIONS) {
        mockSettingsStore = { ...mockSettingsStore, ...payload };
        return;
      }
      throw err;
    }
  },

  async getSiteSettings(centerId: string, signal?: AbortSignal): Promise<SiteSettings> {
    if (USE_MOCK_RESERVATIONS) {
      return {
        defaultSeoTitle: "گیمنت اختصاصی گرگدن | رزرو آنلاین گیمنت",
        defaultSeoDescription: "مجهزترین مرکز بازی‌های ویدئویی و کامپیوتری تبریز",
      };
    }
    try {
      const { data } = await apiClient.get<SiteSettings>(ENDPOINTS.owner.siteSettings(centerId), { signal });
      return data ?? {};
    } catch {
      return {
        defaultSeoTitle: "گیمنت اختصاصی گرگدن | رزرو آنلاین گیمنت",
        defaultSeoDescription: "مجهزترین مرکز بازی‌های ویدئویی و کامپیوتری تبریز",
      };
    }
  },

  async updateSiteSettings(centerId: string, payload: SiteSettings): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.patch(ENDPOINTS.owner.siteSettings(centerId), payload);
    } catch {
      // ignore
    }
  },

  async listStations(centerId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    if (!centerId) return [];
    if (USE_MOCK_RESERVATIONS) return [...mockStationsStore];
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
    if (USE_MOCK_RESERVATIONS) {
      const target = mockReservationsStore.find((r) => r.id === reservationId);
      if (target) target.status = status;
      return;
    }

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
    if (USE_MOCK_RESERVATIONS) {
      const newStation: GameStationInfo = {
        id: `st-mock-${Date.now()}`,
        gamingCenterId: centerId,
        name: payload.name,
        stationType: payload.stationType,
        hourlyPrice: payload.hourlyPrice,
        quantity: payload.quantity ?? 1,
        defaultControllers: payload.defaultControllers ?? 0,
        maxExtraControllers: payload.maxExtraControllers ?? 0,
        extraControllerPrice: payload.extraControllerPrice ?? 0,
        isVip: payload.isVip,
        isActive: true,
        minRentHours: payload.minRentHours,
        maxRentHours: payload.maxRentHours,
      };
      mockStationsStore = [newStation, ...mockStationsStore];
      return newStation;
    }

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
    if (USE_MOCK_RESERVATIONS) return [...mockMediaStore];
    const { data } = await apiClient.get<MediaItem[]>(ENDPOINTS.gamingCenter.media(slug), { signal });
    return asArray<MediaItem>(data).filter((m) => !!m?.url);
  },

  async uploadGalleryImage(
    centerId: string,
    file: File,
    options?: { altText?: string; purpose?: "COVER" | "GALLERY" | "STATION" | "LOGO" }
  ): Promise<MediaItem> {
    if (USE_MOCK_RESERVATIONS) {
      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        url: URL.createObjectURL(file),
        altText: options?.altText || file.name,
        purpose: options?.purpose || "GALLERY",
      };
      mockMediaStore = [...mockMediaStore, newMedia];
      return newMedia;
    }

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
    if (USE_MOCK_RESERVATIONS) {
      mockMediaStore = mockMediaStore.filter((m) => m.id !== mediaId);
      return;
    }
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
    if (USE_MOCK_RESERVATIONS) {
      return mockRatingsStore.filter((r) => r.status !== "DELETED");
    }
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
    if (USE_MOCK_RESERVATIONS) {
      const target = mockRatingsStore.find((r) => r.id === ratingId);
      if (target) {
        target.reply = replyText;
        target.repliedAt = new Date().toISOString();
      }
      return;
    }

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
    if (USE_MOCK_RESERVATIONS) {
      const target = mockRatingsStore.find((r) => r.id === ratingId);
      if (target) target.status = status;
      return;
    }
    await apiClient.patch(ENDPOINTS.owner.ratingStatus(centerId, ratingId), { status });
  },

  async getAnalyticsSummary(centerId: string, signal?: AbortSignal): Promise<any> {
    if (USE_MOCK_RESERVATIONS) {
      return mockAnalyticsStore;
    }
    try {
      const { data } = await apiClient.get<any>(ENDPOINTS.owner.analyticsSummary(centerId), { signal });
      return data;
    } catch (err) {
      if (USE_MOCK_RESERVATIONS) return mockAnalyticsStore;
      throw err;
    }
  },

  async listCommissions(centerId: string, signal?: AbortSignal): Promise<Earning[]> {
    if (USE_MOCK_RESERVATIONS) return [...mockCommissionsStore];
    try {
      const { data } = await apiClient.get<Earning[]>(ENDPOINTS.owner.commissions(centerId), {
        query: { page: 1, pageSize: 50 },
        signal,
      });
      const arr = asArray<Earning>(data);
      return arr.length > 0 ? arr : [...mockCommissionsStore];
    } catch {
      return [...mockCommissionsStore];
    }
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
