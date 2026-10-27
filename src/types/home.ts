export interface BannerItem {
  id: string;
  imageUrl: string;          // موبایل/تبلت، نسبت ۲:۱ (پیشنهاد ۱۵۶۰×۷۸۰)
  desktopImageUrl?: string;  // دسکتاپ ≥۱۰۲۴، نسبت ۳.۲:۱ (پیشنهاد ۲۴۰۰×۷۵۰)
  alt: string;               // فقط برای دسترسی‌پذیری
  /** لینک داخلی (/gamecenter/gc-1) یا خارجی (https://...). اگر نباشد، اسلاید کلیک‌پذیر نیست (مثلاً گالری) */
  href?: string;
  openInNewTab?: boolean;
}

export interface DiscountedCenter {
  id: string;                 // slug، برای /gamecenter/[id]
  name: string;
  imageUrl: string;
  location: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  discountedHourlyPrice?: number;   // فقط اگر بک‌اند بدهد
  discount: {
    valueType: "PERCENTAGE" | "FIXED_AMOUNT";   // مطابق schema Discount
    value: number;                               // اختیاری، فقط نمایش
    endAt?: string;
  };
}