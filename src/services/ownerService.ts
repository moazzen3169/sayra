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

let mockTicketsStore: Ticket[] = [
  {
    id: "t-101",
    subject: "سوال درباره نحوه تسویه حساب و برداشت موجودی",
    category: "FINANCIAL",
    status: "ANSWERED",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    messages: [
      {
        id: "tm-1",
        senderType: "USER",
        text: "سلام، درخواست‌های برداشت موجودی پس از چند ساعت به حساب واریز می‌شوند؟",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "tm-2",
        senderType: "SUPPORT",
        text: "سلام و احترام. تمام درخواست‌های برداشت حداکثر طی ۲۴ ساعت کاری پایا واریز می‌گردند.",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  },
  {
    id: "t-102",
    subject: "درخواست افزودن سیستم VR به لیست دستگاه‌ها",
    category: "TECHNICAL",
    status: "OPEN",
    priority: "MEDIUM",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    messages: [
      {
        id: "tm-3",
        senderType: "USER",
        text: "با سلام، دو دستگاه جدید هدست VR به مجموعه اضافه شده، چطور آیکون VR رو فعال کنیم؟",
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
];

export const ownerService = {
  async getMe(): Promise<OwnerMe> {
    if (USE_MOCK_RESERVATIONS) {
      return { id: "owner-1", phone: "09123456789", fullName: "مدیر گیمنت گرگدن", role: "OWNER", verificationStatus: "APPROVED" };
    }
    try {
      const { data } = await apiClient.get<OwnerMe>(ENDPOINTS.owner.me);
      return data;
    } catch {
      return { id: "owner-1", phone: "09123456789", fullName: "مدیر گیمنت گرگدن", role: "OWNER", verificationStatus: "APPROVED" };
    }
  },

  /** endpoint تکی برای گیمنت نداریم؛ از لیست عمومی پیدا می‌شود */
  async findCenter(id: string, signal?: AbortSignal): Promise<PublicCenter | null> {
    if (USE_MOCK_RESERVATIONS) {
      return mockCenter;
    }
    try {
      const { data } = await apiClient.get<PublicCenter[]>(ENDPOINTS.owner.centers, {
        query: { page: 1, pageSize: 200, limit: 200 },
        signal,
      });
      return asArray<PublicCenter>(data).find((c) => c.id === id) ?? mockCenter;
    } catch {
      return mockCenter;
    }
  },

  async listReservations(centerId: string, signal?: AbortSignal): Promise<OwnerReservation[]> {
    if (USE_MOCK_RESERVATIONS) return [...mockReservationsStore];
    try {
      const { data } = await apiClient.get<OwnerReservation[]>(ENDPOINTS.owner.reservations(centerId), {
        query: { page: 1, pageSize: 100 },
        signal,
      });
      return asArray<OwnerReservation>(data);
    } catch {
      return [...mockReservationsStore];
    }
  },

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
    try {
      await apiClient.post(ENDPOINTS.owner.proposeTime(centerId, reservationId), payload);
    } catch {
      // ignore in mock mode
    }
  },

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
    try {
      await apiClient.post(ENDPOINTS.owner.session(centerId, reservationId, action));
    } catch {
      // ignore in mock mode
    }
  },

  async getSettings(centerId: string, signal?: AbortSignal): Promise<CenterSettings> {
    if (USE_MOCK_RESERVATIONS) return { ...mockSettingsStore };
    try {
      const { data } = await apiClient.get<CenterSettings>(ENDPOINTS.owner.settings(centerId), { signal });
      return data ?? { ...mockSettingsStore };
    } catch {
      return { ...mockSettingsStore };
    }
  },

  async updateSettings(centerId: string, payload: CenterSettings): Promise<void> {
    if (USE_MOCK_RESERVATIONS) {
      mockSettingsStore = { ...mockSettingsStore, ...payload };
      return;
    }
    try {
      await apiClient.put(ENDPOINTS.owner.settings(centerId), payload);
    } catch {
      mockSettingsStore = { ...mockSettingsStore, ...payload };
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
    if (USE_MOCK_RESERVATIONS) return [...mockStationsStore];
    try {
      const { data } = await apiClient.get<GameStationInfo[]>(ENDPOINTS.owner.stations(centerId), { signal });
      return asArray<GameStationInfo>(data);
    } catch {
      return [...mockStationsStore];
    }
  },

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
    try {
      await apiClient.patch(ENDPOINTS.owner.reservations(centerId) + `/${reservationId}`, { status });
    } catch {
      const target = mockReservationsStore.find((r) => r.id === reservationId);
      if (target) target.status = status;
    }
  },

  async createStation(centerId: string, payload: StationInput): Promise<void> {
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
      return;
    }
    try {
      await apiClient.post(ENDPOINTS.owner.stations(centerId), payload);
    } catch {
      // ignore
    }
  },

  async listMedia(slug: string, signal?: AbortSignal): Promise<MediaItem[]> {
    if (USE_MOCK_RESERVATIONS) return [...mockMediaStore];
    try {
      const { data } = await apiClient.get<MediaItem[]>(ENDPOINTS.gamingCenter.media(slug), { signal });
      const filtered = asArray<MediaItem>(data).filter((m) => !!m?.url);
      return filtered.length > 0 ? filtered : [...mockMediaStore];
    } catch {
      return [...mockMediaStore];
    }
  },

  async uploadGalleryImage(centerId: string, file: File): Promise<void> {
    if (USE_MOCK_RESERVATIONS) {
      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        url: URL.createObjectURL(file),
        altText: file.name,
      };
      mockMediaStore = [...mockMediaStore, newMedia];
      return;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "GALLERY");
      await apiClient.post(ENDPOINTS.owner.mediaUpload(centerId), form);
    } catch {
      // ignore
    }
  },

  async deleteMedia(centerId: string, mediaId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) {
      mockMediaStore = mockMediaStore.filter((m) => m.id !== mediaId);
      return;
    }
    try {
      await apiClient.delete(ENDPOINTS.owner.mediaUpload(centerId) + `/${mediaId}`);
    } catch {
      mockMediaStore = mockMediaStore.filter((m) => m.id !== mediaId);
    }
  },

  async listRatings(slug: string, signal?: AbortSignal): Promise<OwnerRating[]> {
    if (USE_MOCK_RESERVATIONS) {
      return mockRatingsStore.filter((r) => r.status !== "DELETED");
    }
    try {
      const { data } = await apiClient.get<OwnerRating[]>(ENDPOINTS.gamingCenter.ratings(slug), { signal });
      const arr = asArray<OwnerRating>(data);
      return arr.length > 0 ? arr : mockRatingsStore.filter((r) => r.status !== "DELETED");
    } catch {
      return mockRatingsStore.filter((r) => r.status !== "DELETED");
    }
  },

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
    try {
      await apiClient.post(ENDPOINTS.owner.ratingStatus(centerId, ratingId) + "/reply", { reply: replyText });
    } catch {
      const target = mockRatingsStore.find((r) => r.id === ratingId);
      if (target) {
        target.reply = replyText;
        target.repliedAt = new Date().toISOString();
      }
    }
  },

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
    try {
      await apiClient.patch(ENDPOINTS.owner.ratingStatus(centerId, ratingId), { status });
    } catch {
      const target = mockRatingsStore.find((r) => r.id === ratingId);
      if (target) target.status = status;
    }
  },

  async getAnalyticsSummary(centerId: string, signal?: AbortSignal): Promise<unknown> {
    if (USE_MOCK_RESERVATIONS) {
      return mockAnalyticsStore;
    }
    try {
      const { data } = await apiClient.get<unknown>(ENDPOINTS.owner.analyticsSummary(centerId), { signal });
      return data ?? mockAnalyticsStore;
    } catch {
      return mockAnalyticsStore;
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

  /* ---- Support ---- */
  async listTickets(signal?: AbortSignal): Promise<Ticket[]> {
    if (USE_MOCK_RESERVATIONS) return [...mockTicketsStore];
    try {
      const { data } = await apiClient.get<Ticket[]>(ENDPOINTS.owner.tickets, { signal });
      const arr = asArray<Ticket>(data);
      return arr.length > 0 ? arr : [...mockTicketsStore];
    } catch {
      return [...mockTicketsStore];
    }
  },

  async getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
    if (USE_MOCK_RESERVATIONS) {
      const found = mockTicketsStore.find((t) => t.id === id);
      if (found) return found;
      return {
        id,
        subject: "پشتیبانی تست",
        category: "TECHNICAL",
        status: "OPEN",
        createdAt: new Date().toISOString(),
        messages: [],
      };
    }
    try {
      const { data } = await apiClient.get<Ticket>(ENDPOINTS.owner.ticket(id), { signal });
      return data;
    } catch {
      const found = mockTicketsStore.find((t) => t.id === id);
      if (found) return found;
      return {
        id,
        subject: "پشتیبانی تست",
        category: "TECHNICAL",
        status: "OPEN",
        createdAt: new Date().toISOString(),
        messages: [],
      };
    }
  },

  async createTicket(payload: {
    subject: string;
    message: string;
    category: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT";
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }): Promise<void> {
    if (USE_MOCK_RESERVATIONS) {
      const newTicket: Ticket = {
        id: `t-${Date.now()}`,
        subject: payload.subject,
        category: payload.category,
        priority: payload.priority ?? "MEDIUM",
        status: "OPEN",
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: `tm-${Date.now()}`,
            senderType: "USER",
            text: payload.message,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      mockTicketsStore = [newTicket, ...mockTicketsStore];
      return;
    }
    try {
      await apiClient.post(ENDPOINTS.owner.tickets, payload);
    } catch {
      const newTicket: Ticket = {
        id: `t-${Date.now()}`,
        subject: payload.subject,
        category: payload.category,
        priority: payload.priority ?? "MEDIUM",
        status: "OPEN",
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: `tm-${Date.now()}`,
            senderType: "USER",
            text: payload.message,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      mockTicketsStore = [newTicket, ...mockTicketsStore];
    }
  },

  async sendTicketMessage(id: string, payload: { text: string; attachment?: string }): Promise<void> {
    if (USE_MOCK_RESERVATIONS) {
      const target = mockTicketsStore.find((t) => t.id === id);
      if (target) {
        if (!target.messages) target.messages = [];
        target.messages.push({
          id: `tm-${Date.now()}`,
          senderType: "USER",
          text: payload.text,
          attachment: payload.attachment,
          createdAt: new Date().toISOString(),
        });
      }
      return;
    }
    try {
      await apiClient.post(ENDPOINTS.owner.ticketMessages(id), payload);
    } catch {
      const target = mockTicketsStore.find((t) => t.id === id);
      if (target) {
        if (!target.messages) target.messages = [];
        target.messages.push({
          id: `tm-${Date.now()}`,
          senderType: "USER",
          text: payload.text,
          attachment: payload.attachment,
          createdAt: new Date().toISOString(),
        });
      }
    }
  },

  async uploadTicketAttachment(id: string, file: File): Promise<string> {
    if (USE_MOCK_RESERVATIONS) return URL.createObjectURL(file);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post<{ url: string }>(ENDPOINTS.owner.ticketAttachments(id), form);
      return data.url;
    } catch {
      return URL.createObjectURL(file);
    }
  },
};
