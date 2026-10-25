export interface BannerItem {
  id: string;
  imageUrl: string;          // موبایل/تبلت، نسبت ۲:۱ (پیشنهاد ۱۵۶۰×۷۸۰)
  desktopImageUrl?: string;  // دسکتاپ ≥۱۰۲۴، نسبت ۳.۲:۱ (پیشنهاد ۲۴۰۰×۷۵۰)
  alt: string;               // فقط برای دسترسی‌پذیری
  href: string;              // لینک داخلی (/gamecenter/gc-1) یا خارجی (https://...)
  openInNewTab?: boolean;
}
