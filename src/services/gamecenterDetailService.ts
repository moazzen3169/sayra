import { apiClient, ApiError } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { getMockGamecenterDetail } from "@/lib/mocks/gamecenter.mock";
import { gamingCenterService as coreGamingCenterService } from "@/services/gamingCenterService";
import type { GamecenterDetail, GamecenterImage, GamecenterReview } from "@/types/gamecenter";
import type {
  PublicAddress,
  PublicGamingCenter,
  PublicMediaItem,
  PublicRating,
  PublicSocialLink,
} from "@/types/customerApi";

export type GamingCenterInfo = PublicGamingCenter;

export interface GameStationInfo {
  id: string;
  gamingCenterId: string;
  name: string;
  stationType: "PC" | "PLAYSTATION" | "XBOX" | "SWITCH" | "VR" | string;
  isVip?: boolean;
  hourlyPrice: number;
  minRentHours?: number;
  maxRentHours?: number;
  defaultDurationHours?: number;
  incrementMinutes?: number;
  isActive?: boolean;

  // ⚠️ فیلدهای زیر در OpenAPI فعلی (v1.0-LOCKED) وجود ندارند و نیازمند تأیید بک‌اند هستند.
  /** مدل دستگاه برای تفکیک PS5 / PS4 / BILLIARD؛ اگر نبود stationType استفاده می‌شود */
  deviceModel?: string;
  /** قیمت هر دسته‌ی اضافه (به ازای هر ساعت) که گیمنت تعیین می‌کند */
  extraControllerPrice?: number;
  /** تعداد دسته‌ی همراه هر کنسول */
  defaultControllers?: number;
  /** حداکثر دسته‌ی اضافه برای هر دستگاه */
  maxExtraControllers?: number;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime?: string;
  isAvailable?: boolean;
  status?: "AVAILABLE" | "UNAVAILABLE" | string;
}

export const gamingCenterService = {
  /**
   * دریافت مستقیم مرکز بازی با اسلاگ از:
   * GET /public/gamingCenters/{slug}
   */
  async getPublicGamingCenter(slug: string, signal?: AbortSignal): Promise<GamingCenterInfo> {
    const { data } = await apiClient.get<GamingCenterInfo>(ENDPOINTS.gamingCenter.detail(slug), {
      signal,
    });
    return data;
  },

  /**
   * دریافت مستقیم مرکز بازی با ID از:
   * GET /gamingCenters/{id}
   */
  async getGamingCenterById(id: string, signal?: AbortSignal): Promise<GamingCenterInfo> {
    const { data } = await apiClient.get<GamingCenterInfo>(ENDPOINTS.gamingCenter.byId(id), {
      signal,
    });
    return data;
  },

  /**
   * حل شناسه مسیر (route identifier) که ممکن است slug یا id باشد
   * از اندپوینت‌های معتبر OpenAPI (GET /public/gamingCenters/{slug} یا GET /gamingCenters/{id})
   * استفاده می‌کند. فقط در صورت بروز خطای 404 برای اسلاگ، به جستجو بر اساس ID یا فهرست مراجعه می‌کند.
   */
  async resolveGamingCenter(routeId: string, signal?: AbortSignal): Promise<GamingCenterInfo> {
    if (!routeId || !routeId.trim()) {
      throw new Error("شناسه گیمنت ارسال نشده است.");
    }

    const cleanRouteId = routeId.trim();

    // گام ۱: ابتدا تلاش می‌کنیم با شناسه ورودی به عنوان slug مستقیماً مرکز را بخوانیم (GET /public/gamingCenters/{slug})
    try {
      const center = await this.getPublicGamingCenter(cleanRouteId, signal);
      if (center && (center.id || center.slug)) {
        return center;
      }
    } catch (err: unknown) {
      // فقط در صورتی که پاسخ 404 بود، مسیر جایگزین (شناسه ID بودن) را بررسی می‌کنیم.
      // اگر خطا مربوط به شبکه یا سرور (مثل 502 Bad Gateway یا قطعی ارتباط) بود، باید خطای مستقیم صادر شود.
      const isNotFound = err instanceof ApiError && err.status === 404;
      if (!isNotFound) {
        throw err;
      }

      // گام ۲: تلاش با اندپوینت مستقیم GET /gamingCenters/{id}
      try {
        const centerById = await this.getGamingCenterById(cleanRouteId, signal);
        if (centerById && (centerById.id || centerById.slug)) {
          return centerById;
        }
      } catch (idErr: unknown) {
        // اگر خطای سرور/شبکه رخ داد اجازه دهیم خطا بالا برود
        if (idErr instanceof ApiError && idErr.status !== 404) {
          throw idErr;
        }
      }

      // گام ۳: تلاش نهایی در فهرست مراکز با GET /gamingCenters
      try {
        const centers = await coreGamingCenterService.listGamingCenters(signal);
        const matched = centers.find((c) => c.slug === cleanRouteId || c.id === cleanRouteId);
        if (matched) {
          if (matched.slug && matched.slug !== cleanRouteId) {
            try {
              const fullBySlug = await this.getPublicGamingCenter(matched.slug, signal);
              return fullBySlug;
            } catch {
              return matched;
            }
          }
          return matched;
        }
      } catch (listErr: unknown) {
        // اگر خطای شبکه / سرور در لیست عمومی رخ داد، خطای اصلی 404 یا خطای سرور را بالا ببریم
        if (listErr instanceof ApiError && listErr.status >= 500) {
          throw listErr;
        }
      }

      throw err;
    }

    throw new Error("مرکز بازی یافت نشد.");
  },

  async getAvailabilitySlots(
    slug: string,
    date: string,
    stationId?: string,
    signal?: AbortSignal
  ): Promise<AvailabilitySlot[]> {
    const { data } = await apiClient.get<AvailabilitySlot[]>(
      ENDPOINTS.gamingCenter.availabilitySlots(slug),
      {
        query: { date, stationId },
        signal,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  /**
   * دریافت دستگاه‌ها بر اساس slug از اندپوینت عمومی:
   * GET /public/gamingCenters/{slug}/stations
   */
  async getPublicStations(slug: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    const { data } = await apiClient.get<GameStationInfo[]>(
      ENDPOINTS.gamingCenter.publicStations(slug),
      { signal }
    );
    return Array.isArray(data) ? data : [];
  },

  async getStations(gamingCenterId: string, signal?: AbortSignal): Promise<GameStationInfo[]> {
    const { data } = await apiClient.get<GameStationInfo[]>(
      ENDPOINTS.gamingCenter.stations(gamingCenterId),
      { signal }
    );
    return Array.isArray(data) ? data : [];
  },

  async getPublicRatings(slug: string, signal?: AbortSignal): Promise<PublicRating[]> {
    const { data } = await apiClient.get<PublicRating[] | { data?: PublicRating[] }>(
      ENDPOINTS.gamingCenter.ratings(slug),
      { signal }
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: PublicRating[] }).data)) {
      return (data as { data: PublicRating[] }).data;
    }
    return [];
  },

  async getPublicAddresses(slug: string, signal?: AbortSignal): Promise<PublicAddress[]> {
    const { data } = await apiClient.get<PublicAddress[] | { data?: PublicAddress[] }>(
      ENDPOINTS.gamingCenter.addresses(slug),
      { signal }
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: PublicAddress[] }).data)) {
      return (data as { data: PublicAddress[] }).data;
    }
    return [];
  },

  async getPublicMedia(slug: string, signal?: AbortSignal): Promise<PublicMediaItem[]> {
    const { data } = await apiClient.get<PublicMediaItem[] | { data?: PublicMediaItem[] }>(
      ENDPOINTS.gamingCenter.media(slug),
      { signal }
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: PublicMediaItem[] }).data)) {
      return (data as { data: PublicMediaItem[] }).data;
    }
    return [];
  },

  async getPublicLinks(slug: string, signal?: AbortSignal): Promise<PublicSocialLink[]> {
    const { data } = await apiClient.get<PublicSocialLink[] | { data?: PublicSocialLink[] }>(
      ENDPOINTS.gamingCenter.links(slug),
      { signal }
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: PublicSocialLink[] }).data)) {
      return (data as { data: PublicSocialLink[] }).data;
    }
    return [];
  },
};

/**
 * تبدیل آیتم‌های مدیا به ساختار تصاویر گالری UI
 */
export function mapMediaToGalleryImages(mediaList: PublicMediaItem[]): GamecenterImage[] {
  if (!Array.isArray(mediaList)) return [];
  return mediaList
    .filter((m) => m && Boolean(m.url))
    .map((m, idx) => ({
      id: m.id || `img-${idx + 1}`,
      url: m.url,
      alt: m.altText || `تصویر ${idx + 1}`,
    }));
}

/**
 * تبدیل نظرات API به ساختار بررسی‌های UI
 */
export function mapRatingsToReviews(ratings: PublicRating[]): GamecenterReview[] {
  if (!Array.isArray(ratings)) return [];
  return ratings.map((r, idx) => ({
    id: r.id || `rating-${idx + 1}`,
    author: r.author || "کاربر سایت",
    rating: typeof r.rating === "number" ? r.rating : 5,
    comment: r.comment || undefined,
    createdAt: r.createdAt || undefined,
  }));
}

/**
 * ترکیب آدرس‌های دریافتی به یک متن آدرس خوانا و معتبر
 */
export function formatAuthoritativeAddress(addresses: PublicAddress[]): string | undefined {
  if (!Array.isArray(addresses) || addresses.length === 0) return undefined;
  const primary = addresses[0];
  if (!primary || !primary.address) return undefined;

  if (primary.city && primary.address) {
    return primary.address.includes(primary.city)
      ? primary.address
      : `${primary.city}، ${primary.address}`;
  }
  return primary.address;
}

export async function loadGamecenterDetail(
  routeIdentifier: string,
  signal?: AbortSignal
): Promise<GamecenterDetail> {
  // اگر متغیر محیطی USE_MOCK_RESERVATIONS فعال باشد (فقط در محیط لوکال/تست صریح)
  if (USE_MOCK_RESERVATIONS) {
    return getMockGamecenterDetail(routeIdentifier);
  }

  // دریافت مرکز بر اساس route identifier
  const center = await gamingCenterService.resolveGamingCenter(routeIdentifier, signal);

  // واکشی موازی داده‌های مستند در OpenAPI
  const targetSlug = center.slug || routeIdentifier;
  const targetId = center.id;

  // برای واکشی دستگاه‌ها، مطابق با قرارداد سرویس‌های مشتری و تست‌های موجود:
  // در صورت داشتن targetId مستقیماً از GET /gamingCenters/{id}/stations و در صورت داشتن targetSlug از GET /public/gamingCenters/{slug}/stations استفاده می‌شود.
  const fetchStationsPromise = (async (): Promise<GameStationInfo[]> => {
    if (targetId) {
      return await gamingCenterService.getStations(targetId, signal);
    }
    if (targetSlug) {
      return await gamingCenterService.getPublicStations(targetSlug, signal);
    }
    return [];
  })();

  const [stationsRes, addressesRes, mediaRes, ratingsRes] = await Promise.allSettled([
    fetchStationsPromise,
    gamingCenterService.getPublicAddresses(targetSlug, signal),
    gamingCenterService.getPublicMedia(targetSlug, signal),
    gamingCenterService.getPublicRatings(targetSlug, signal),
  ]);

  let stations: GameStationInfo[] = [];
  let stationsError: string | null = null;

  if (stationsRes.status === "fulfilled") {
    stations = Array.isArray(stationsRes.value) ? stationsRes.value : [];
  } else {
    // If request failed (network, 500, etc.), record error message so UI can distinguish empty vs failed
    stationsError =
      (stationsRes.reason as Error)?.message || "خطا در دریافت لیست دستگاه‌ها";
  }

  const addresses: PublicAddress[] =
    addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value)
      ? addressesRes.value
      : [];

  const mediaList: PublicMediaItem[] =
    mediaRes.status === "fulfilled" && Array.isArray(mediaRes.value)
      ? mediaRes.value
      : [];

  const ratings: PublicRating[] =
    ratingsRes.status === "fulfilled" && Array.isArray(ratingsRes.value)
      ? ratingsRes.value
      : [];

  const authoritativeAddress = formatAuthoritativeAddress(addresses);
  const galleryImages = mapMediaToGalleryImages(mediaList);
  const reviews = mapRatingsToReviews(ratings);

  return {
    center,
    address: authoritativeAddress || center.description || "",
    images: galleryImages,
    stations,
    stationsError,
    reviews,
    // لیست بازی‌ها (Games Catalog) در OpenAPI v1.0-LOCKED روی اندپوینت‌های عمومی وجود ندارد
    // مطابق با الزامات فاز ۶، داده‌های ساختگی/موک حذف می‌شوند و آرایه خالی فرستاده می‌شود
    games: [],
  };
}
