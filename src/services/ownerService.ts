import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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

export const ownerService = {
  async getMe(): Promise<OwnerMe> {
    const { data } = await apiClient.get<OwnerMe>(ENDPOINTS.owner.me);
    return data;
  },

  /** endpoint تکی برای گیمنت نداریم؛ از لیست عمومی پیدا می‌شود */
  async findCenter(id: string, signal?: AbortSignal): Promise<PublicCenter | null> {
    const { data } = await apiClient.get<PublicCenter[]>(ENDPOINTS.owner.centers, {
      query: { page: 1, pageSize: 200, limit: 200 },
      signal,
    });
    return asArray<PublicCenter>(data).find((c) => c.id === id) ?? null;
  },

  async listReservations(centerId: string, signal?: AbortSignal): Promise<OwnerReservation[]> {
    const { data } = await apiClient.get<OwnerReservation[]>(ENDPOINTS.owner.reservations(centerId), {
      query: { page: 1, pageSize: 100 },
      signal,
    });
    return asArray<OwnerReservation>(data);
  },

  async proposeTime(
    centerId: string,
    reservationId: string,
    payload: { startTime: string; endTime: string; note?: string }
  ): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.proposeTime(centerId, reservationId), payload);
  },

  async session(
    centerId: string,
    reservationId: string,
    action: "start" | "stop" | "pause" | "resume"
  ): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.session(centerId, reservationId, action));
  },

  async getSettings(centerId: string, signal?: AbortSignal): Promise<CenterSettings> {
    const { data } = await apiClient.get<CenterSettings>(ENDPOINTS.owner.settings(centerId), { signal });
    return data ?? {};
  },

  async updateSettings(centerId: string, payload: CenterSettings): Promise<void> {
    await apiClient.put(ENDPOINTS.owner.settings(centerId), payload);
  },

  async getSiteSettings(centerId: string, signal?: AbortSignal): Promise<SiteSettings> {
    const { data } = await apiClient.get<SiteSettings>(ENDPOINTS.owner.siteSettings(centerId), { signal });
    return data ?? {};
  },

  async updateSiteSettings(centerId: string, payload: SiteSettings): Promise<void> {
    await apiClient.patch(ENDPOINTS.owner.siteSettings(centerId), payload);
  },

  async listStations(centerId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    const { data } = await apiClient.get<GameStationInfo[]>(ENDPOINTS.owner.stations(centerId), { signal });
    return asArray<GameStationInfo>(data);
  },

  async createStation(centerId: string, payload: StationInput): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.stations(centerId), payload);
  },

  async listMedia(slug: string, signal?: AbortSignal): Promise<MediaItem[]> {
    const { data } = await apiClient.get<MediaItem[]>(ENDPOINTS.gamingCenter.media(slug), { signal });
    return asArray<MediaItem>(data).filter((m) => !!m?.url);
  },

  async uploadGalleryImage(centerId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "GALLERY");
    await apiClient.post(ENDPOINTS.owner.mediaUpload(centerId), form);
  },

  async listRatings(slug: string, signal?: AbortSignal): Promise<OwnerRating[]> {
    const { data } = await apiClient.get<OwnerRating[]>(ENDPOINTS.gamingCenter.ratings(slug), { signal });
    return asArray<OwnerRating>(data);
  },

  async setRatingStatus(
    centerId: string,
    ratingId: string,
    status: "PUBLISHED" | "HIDDEN" | "DELETED"
  ): Promise<void> {
    await apiClient.patch(ENDPOINTS.owner.ratingStatus(centerId, ratingId), { status });
  },

  async getAnalyticsSummary(centerId: string, signal?: AbortSignal): Promise<unknown> {
    const { data } = await apiClient.get<unknown>(ENDPOINTS.owner.analyticsSummary(centerId), { signal });
    return data;
  },

  async listCommissions(centerId: string, signal?: AbortSignal): Promise<Earning[]> {
    const { data } = await apiClient.get<Earning[]>(ENDPOINTS.owner.commissions(centerId), {
      query: { page: 1, pageSize: 50 },
      signal,
    });
    return asArray<Earning>(data);
  },

  /* ---- Support ---- */
  async listTickets(signal?: AbortSignal): Promise<Ticket[]> {
    const { data } = await apiClient.get<Ticket[]>(ENDPOINTS.owner.tickets, { signal });
    return asArray<Ticket>(data);
  },

  async getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
    const { data } = await apiClient.get<Ticket>(ENDPOINTS.owner.ticket(id), { signal });
    return data;
  },

  async createTicket(payload: {
    subject: string;
    message: string;
    category: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT";
    priority?: "LOW" | "MEDIUM" | "HIGH";
  }): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.tickets, payload);
  },

  async sendTicketMessage(id: string, payload: { text: string; attachment?: string }): Promise<void> {
    await apiClient.post(ENDPOINTS.owner.ticketMessages(id), payload);
  },

  async uploadTicketAttachment(id: string, file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<{ url: string }>(ENDPOINTS.owner.ticketAttachments(id), form);
    return data.url;
  },
};