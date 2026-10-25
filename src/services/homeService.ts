import { BannerItem, DiscountedCenter } from "@/types/home";
import { mockBanners, mockDiscountedCenters } from "@/lib/mocks/home.mock";

// TODO: Endpoint بنرهای تبلیغاتی باید پس از اضافه شدن به OpenAPI مشخص شود
// و بدنه‌ی این تابع با فراخوانی واقعی API به apiClient.get(...) جایگزین گردد.

/**
 * نیازمند Clarification با بک‌اند:
 * در OpenAPI نسخه v1.0-LOCKED، هیچ endpoint عمومی برای دریافت «لیست گیمنت‌های تخفیف‌دار» وجود ندارد.
 * - Endpoint موجود `GET /gamingCenters` فاقد فیلدهای تخفیف، تصویر، امتیاز و قیمت ساعتی است.
 * - Endpoint موجود `/gamingCenters/{id}/discounts` مخصوص مالکین است و نیاز به توکن کاربر/مالک دارد.
 *
 * پیشنهاد برای تیم بک‌اند:
 * یکی از دو راهکار زیر در OpenAPI اضافه شود:
 * ۱) اضافه کردن پارامتر `hasDiscount=true` به `GET /gamingCenters`
 * ۲) ایجاد یک endpoint عمومی اختصاصی مانند `GET /gamingCenters/discounted`
 * همراه با ارسال فیلدهای کامل: imageUrl, rating, hourlyPrice, discountedHourlyPrice و discount.
 */

export const homeService = {
  async getBanners(signal?: AbortSignal): Promise<BannerItem[]> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    // شبیه‌سازی لود سریع داده از Mock
    return Promise.resolve(mockBanners);
  },

  async getDiscountedCenters(params?: {
    city?: string;
    signal?: AbortSignal;
  }): Promise<DiscountedCenter[]> {
    if (params?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    // شبیه‌سازی لود داده از Mock
    return Promise.resolve(mockDiscountedCenters);
  },
};
