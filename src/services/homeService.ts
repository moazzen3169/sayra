import { BannerItem } from "@/types/home";
import { mockBanners } from "@/lib/mocks/home.mock";

// TODO: Endpoint بنرهای تبلیغاتی باید پس از اضافه شدن به OpenAPI مشخص شود
// و بدنه‌ی این تابع با فراخوانی واقعی API به apiClient.get(...) جایگزین گردد.

export const homeService = {
  async getBanners(signal?: AbortSignal): Promise<BannerItem[]> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    // شبیه‌سازی لود سریع داده از Mock
    return Promise.resolve(mockBanners);
  },
};
