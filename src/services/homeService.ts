import { BannerItem, DiscountedCenter } from "@/types/home";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { normalizeMediaUrl } from "@/lib/media";
import {
  gamecentersPageService,
  type GamecenterListItem,
} from "@/services/gamecentersPageService";

/**
 * گیمنت‌های تخفیف‌دار از همان GET /gamingCenters خوانده می‌شوند.
 * تا وقتی پاسخ بک‌اند فیلد تخفیف (discount) نداشته باشد، لیست خالی برمی‌گردد
 * و بخش تخفیف‌دار در صفحه اصلی نمایش داده نمی‌شود (هیچ داده‌ی ساختگی استفاده نمی‌شود).
 */
export function toDiscountedCenter(item: GamecenterListItem): DiscountedCenter | null {
  if (!item.discount) return null;
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    location: item.location,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    hourlyPrice: item.hourlyPrice,
    discountedHourlyPrice: item.discountedHourlyPrice,
    discount: item.discount,
  };
}

interface RawBannerItem {
  id?: string | number;
  bannerUrl?: string;
  imageUrl?: string;
  destinationUrl?: string;
  gamingCenterSlug?: string;
  title?: string;
  description?: string;
}

export async function fetchSliderBanners(signal?: AbortSignal): Promise<BannerItem[]> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const response = await apiClient.get<unknown>(
    ENDPOINTS.advertisements.publicSlider,
    { signal, retryOnAuth: false, skipAuth: true }
  );

  const resData = response.data as
    | RawBannerItem[]
    | { data?: RawBannerItem[]; items?: RawBannerItem[] }
    | null
    | undefined;
  let rawItems: RawBannerItem[] = [];
  if (Array.isArray(resData)) rawItems = resData;
  else if (resData && Array.isArray(resData.data)) rawItems = resData.data;
  else if (resData && Array.isArray(resData.items)) rawItems = resData.items;

  return rawItems
    .filter((item) => Boolean(item && (item.bannerUrl || item.imageUrl)))
    .map((item, index) => {
      const rawUrl = item.bannerUrl || item.imageUrl || "";
      const normalizedUrl = normalizeMediaUrl(rawUrl);

      // لینک مقصد: اولویت با destinationUrl، در غیر این صورت لینک صفحه گیم‌نت بر اساس slug
      let href = item.destinationUrl;
      if (!href && item.gamingCenterSlug) {
        href = `/gamecenter/${item.gamingCenterSlug}`;
      }

      return {
        id: item.id ? String(item.id) : `ad-slide-${index}`,
        imageUrl: normalizedUrl,
        desktopImageUrl: normalizedUrl,
        alt: item.title || item.description || "تبلیغات ویژه سایرا",
        href: href || undefined,
      };
    });
}

export const homeService = {
  /**
   * دریافت بنرهای تبلیغاتی تأییدشده صفحه اول:
   * GET /public/advertisements/slider
   *
   * هیچ داده‌ی نمونه‌ای جایگزین نمی‌شود: در صورت خطا یا خالی بودن پاسخ،
   * لیست خالی برمی‌گردد و BannerSlider خودش را مخفی می‌کند.
   */
  async getBanners(signal?: AbortSignal): Promise<BannerItem[]> {
    try {
      return await fetchSliderBanners(signal);
    } catch (err: unknown) {
      if (
        signal?.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        throw err;
      }
      return [];
    }
  },

  async getDiscountedCenters(params?: {
    city?: string;
    signal?: AbortSignal;
  }): Promise<DiscountedCenter[]> {
    if (params?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const inCity = await gamecentersPageService.loadAllCenters({
      city: params?.city,
      page: 1,
      limit: 50,
      signal: params?.signal,
    });

    return gamecentersPageService
      .getDiscountedCenters(inCity)
      .map(toDiscountedCenter)
      .filter((c): c is DiscountedCenter => c !== null);
  },
};