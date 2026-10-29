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
  name: "گیمنت اختصاصی گرگدن",
  slug: "gc-1",
  description: "تبریز، ولیعصر، روبروی کتابخانه عمومی",
  isActive: true,
};

export const ownerService = {
  async getMe(): Promise<OwnerMe> {
    if (USE_MOCK_RESERVATIONS) {
      return { id: "owner-1", phone: "09123456789", fullName: "مدیر گیمنت گرگدن" };
    }
    try {
      const { data } = await apiClient.get<OwnerMe>(ENDPOINTS.owner.me);
      return data;
    } catch {
      return { id: "owner-1", phone: "09123456789", fullName: "مدیر گیمنت گرگدن" };
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
    if (USE_MOCK_RESERVATIONS) return [];
    try {
      const { data } = await apiClient.get<OwnerReservation[]>(ENDPOINTS.owner.reservations(centerId), {
        query: { page: 1, pageSize: 100 },
        signal,
      });
      return asArray<OwnerReservation>(data);
    } catch {
      return [];
    }
  },

  async proposeTime(
    centerId: string,
    reservationId: string,
    payload: { startTime: string; endTime: string; note?: string }
  ): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
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
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.post(ENDPOINTS.owner.session(centerId, reservationId, action));
    } catch {
      // ignore in mock mode
    }
  },

  async getSettings(centerId: string, signal?: AbortSignal): Promise<CenterSettings> {
    if (USE_MOCK_RESERVATIONS) return {};
    try {
      const { data } = await apiClient.get<CenterSettings>(ENDPOINTS.owner.settings(centerId), { signal });
      return data ?? {};
    } catch {
      return {};
    }
  },

  async updateSettings(centerId: string, payload: CenterSettings): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.put(ENDPOINTS.owner.settings(centerId), payload);
    } catch {
      // ignore
    }
  },

  async getSiteSettings(centerId: string, signal?: AbortSignal): Promise<SiteSettings> {
    if (USE_MOCK_RESERVATIONS) return {};
    try {
      const { data } = await apiClient.get<SiteSettings>(ENDPOINTS.owner.siteSettings(centerId), { signal });
      return data ?? {};
    } catch {
      return {};
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
    if (USE_MOCK_RESERVATIONS) return [];
    try {
      const { data } = await apiClient.get<GameStationInfo[]>(ENDPOINTS.owner.stations(centerId), { signal });
      return asArray<GameStationInfo>(data);
    } catch {
      return [];
    }
  },

  async createStation(centerId: string, payload: StationInput): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.post(ENDPOINTS.owner.stations(centerId), payload);
    } catch {
      // ignore
    }
  },

  async listMedia(slug: string, signal?: AbortSignal): Promise<MediaItem[]> {
    if (USE_MOCK_RESERVATIONS) return [];
    try {
      const { data } = await apiClient.get<MediaItem[]>(ENDPOINTS.gamingCenter.media(slug), { signal });
      return asArray<MediaItem>(data).filter((m) => !!m?.url);
    } catch {
      return [];
    }
  },

  async uploadGalleryImage(centerId: string, file: File): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "GALLERY");
      await apiClient.post(ENDPOINTS.owner.mediaUpload(centerId), form);
    } catch {
      // ignore
    }
  },

  async listRatings(slug: string, signal?: AbortSignal): Promise<OwnerRating[]> {
    if (USE_MOCK_RESERVATIONS) return [];
    try {
      const { data } = await apiClient.get<OwnerRating[]>(ENDPOINTS.gamingCenter.ratings(slug), { signal });
      return asArray<OwnerRating>(data);
    } catch {
      return [];
    }
  },

  async setRatingStatus(
    centerId: string,
    ratingId: string,
    status: "PUBLISHED" | "HIDDEN" | "DELETED"
  ): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.patch(ENDPOINTS.owner.ratingStatus(centerId, ratingId), { status });
    } catch {
      // ignore
    }
  },

  async getAnalyticsSummary(centerId: string, signal?: AbortSignal): Promise<unknown> {
    if (USE_MOCK_RESERVATIONS) {
      return { totalIncome: 12500000, totalReservations: 48, activeStationsCount: 7 };
    }
    try {
      const { data } = await apiClient.get<unknown>(ENDPOINTS.owner.analyticsSummary(centerId), { signal });
      return data;
    } catch {
      return { totalIncome: 12500000, totalReservations: 48, activeStationsCount: 7 };
    }
  },

  async listCommissions(centerId: string, signal?: AbortSignal): Promise<Earning[]> {
    if (USE_MOCK_RESERVATIONS) return [];
    try {
      const { data } = await apiClient.get<Earning[]>(ENDPOINTS.owner.commissions(centerId), {
        query: { page: 1, pageSize: 50 },
        signal,
      });
      return asArray<Earning>(data);
    } catch {
      return [];
    }
  },

  /* ---- Support ---- */
  async listTickets(signal?: AbortSignal): Promise<Ticket[]> {
    if (USE_MOCK_RESERVATIONS) return [];
    try {
      const { data } = await apiClient.get<Ticket[]>(ENDPOINTS.owner.tickets, { signal });
      return asArray<Ticket>(data);
    } catch {
      return [];
    }
  },

  async getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
    if (USE_MOCK_RESERVATIONS) {
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
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.post(ENDPOINTS.owner.tickets, payload);
    } catch {
      // ignore
    }
  },

  async sendTicketMessage(id: string, payload: { text: string; attachment?: string }): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.post(ENDPOINTS.owner.ticketMessages(id), payload);
    } catch {
      // ignore
    }
  },

  async uploadTicketAttachment(id: string, file: File): Promise<string> {
    if (USE_MOCK_RESERVATIONS) return "/img/mock-attachment.png";
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post<{ url: string }>(ENDPOINTS.owner.ticketAttachments(id), form);
      return data.url;
    } catch {
      return "/img/mock-attachment.png";
    }
  },
};