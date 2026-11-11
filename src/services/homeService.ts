import { BannerItem, DiscountedCenter } from "@/types/home";
import { mockBanners } from "@/lib/mocks/home.mock";
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
function toDiscountedCenter(item: GamecenterListItem): DiscountedCenter | null {
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

export const homeService = {
  /**
   * دریافت بنرهای تبلیغاتی تأییدشده صفحه اول:
   * GET /public/advertisements/slider
   * در صورت وجود تبلیغات تأیید شده در بک‌اند، بنرهای واقعی با اولویت نمایش داده می‌شوند
   * و در غیر این صورت به عنوان فال‌بک نرم از mockBanners استفاده می‌شود.
   */
  async getBanners(signal?: AbortSignal): Promise<BannerItem[]> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.advertisements.publicSlider,
        { signal, retryOnAuth: false }
      );

      const resData = response.data;
      let rawItems: any[] = [];
      if (Array.isArray(resData)) rawItems = resData;
      else if (Array.isArray(resData?.data)) rawItems = resData.data;
      else if (Array.isArray(resData?.items)) rawItems = resData.items;

      if (rawItems.length > 0) {
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
    } catch (err: any) {
      if (signal?.aborted || err?.name === "AbortError") {
        throw err;
      }
      // در صورت بروز خطای شبکه یا عدم دسترسی به اندپوینت عمومی، فال‌بک نرم اعمال می‌شود
    }

    return Promise.resolve(mockBanners);
  },

  async getDiscountedCenters(params?: {
    city?: string;
    signal?: AbortSignal;
  }): Promise<DiscountedCenter[]> {
    if (params?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const all = await gamecentersPageService.loadAllCenters(params?.signal);
    const inCity = params?.city
      ? gamecentersPageService.filterCenters(all, { city: params.city })
      : all;

    return gamecentersPageService
      .getDiscountedCenters(inCity)
      .map(toDiscountedCenter)
      .filter((c): c is DiscountedCenter => c !== null);
  },
};