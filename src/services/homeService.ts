import { BannerItem, DiscountedCenter } from "@/types/home";
import { mockBanners, mockDiscountedCenters } from "@/lib/mocks/home.mock";

// TODO: Endpoint بنرهای تبلیغاتی و لیست گیمنت‌های تخفیف‌دار باید پس از اضافه شدن به OpenAPI مشخص شوند
// و بدنه‌ی این توابع با فراخوانی واقعی API جایگزین گردند.

export const homeService = {
  async getBanners(signal?: AbortSignal): Promise<BannerItem[]> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    // شبیه‌سازی لود سریع داده از Mock
    return Promise.resolve(mockBanners);
  },

  async getDiscountedCenters(params?: { city?: string; signal?: AbortSignal }): Promise<DiscountedCenter[]> {
    if (params?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    // شبیه‌سازی لود سریع داده از Mock
    return Promise.resolve(mockDiscountedCenters);
  },
};
