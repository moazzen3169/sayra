import { BannerItem, DiscountedCenter } from "@/types/home";
import { mockBanners } from "@/lib/mocks/home.mock";
import {
  gamecentersPageService,
  type GamecenterListItem,
} from "@/services/gamecentersPageService";

// TODO: Endpoint بنرهای تبلیغاتی باید پس از اضافه شدن به OpenAPI مشخص شود
// و بدنه‌ی getBanners با فراخوانی واقعی API به apiClient.get(...) جایگزین گردد.

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
  async getBanners(signal?: AbortSignal): Promise<BannerItem[]> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
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