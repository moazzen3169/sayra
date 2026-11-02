import { BannerItem, DiscountedCenter } from "@/types/home";
import { mockBanners } from "@/lib/mocks/home.mock";
import { gamingCenterService } from "./gamingCenterService";

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
    return Promise.resolve(mockBanners);
  },

  /**
   * دریافت گیمنت‌های تخفیف‌دار.
   * با توجه به قرارداد OpenAPI v1.0-LOCKED فیلدهای تخفیف در لیست گیمنت‌ها وجود ندارند.
   * از API گیمنت‌ها فراخوانی شده و در صورت نبود فیلد تخفیف، آرایه خالی برمی‌گرداند.
   */
  async getDiscountedCenters(params?: {
    city?: string;
    signal?: AbortSignal;
  }): Promise<DiscountedCenter[]> {
    if (params?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const response = await gamingCenterService.listGamingCenters(undefined, params?.signal);
      // PublicGamingCenter in v1.0-LOCKED lacks discount, rating, hourlyPrice
      const discounted = (response.data as any[]).filter(
        (c) => Boolean(c.discount) || Boolean(c.isDiscounted) || Boolean(c.discountPercent)
      );

      return discounted.map((c) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl || "/img/gamnet-1.webp",
        location: c.location || "",
        rating: c.rating ?? 0,
        reviewsCount: c.reviewsCount ?? 0,
        hourlyPrice: c.hourlyPrice ?? 0,
        discountedHourlyPrice: c.discountedHourlyPrice,
        discountPercent: c.discountPercent,
        discount: c.discount,
      }));
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        throw err;
      }
      return [];
    }
  },
};
