import { BannerItem, DiscountedCenter } from "@/types/home";

export const mockBanners: BannerItem[] = [
  {
    id: "banner-1",
    imageUrl: "/img/gamnet-1.webp",
    desktopImageUrl: "/img/gamnet-1.webp",
    alt: "تخفیف ویژه رزرو اول با سایرا",
    href: "/gamecenter/gc-1",
  },
  {
    id: "banner-2",
    imageUrl: "/img/gamnet-2.webp",
    desktopImageUrl: "/img/gamnet-2.webp",
    alt: "مسابقات هفتگی گیمینگ سنتر سایبرسکی",
    href: "/gamecenter/gc-2",
  },
  {
    id: "banner-3",
    imageUrl: "/img/gamnet-3.webp",
    desktopImageUrl: "/img/gamnet-3.webp",
    alt: "تجربه واقعیت مجازی در وی‌آر پلاس",
    href: "/gamecenter/gc-3",
  },
  {
    id: "banner-4",
    imageUrl: "/img/gamnet-4.webp",
    desktopImageUrl: "/img/gamnet-4.webp",
    alt: "اتاق‌های اختصاصی وی‌آی‌پِی گرگدن",
    href: "/gamecenter/f-1",
  },
];

const tomorrowIso = new Date(Date.now() + 86400000).toISOString();

export const mockDiscountedCenters: DiscountedCenter[] = [
  {
    id: "gc-1",
    name: "گیمنت گرگدن",
    imageUrl: "/img/gamnet-1.webp",
    location: "تبریز، ولیعصر، روبروی کتابخانه",
    rating: 4.8,
    reviewsCount: 744,
    hourlyPrice: 230000,
    discountedHourlyPrice: 172500,
    discount: {
      valueType: "PERCENTAGE",
      value: 25,
      endAt: tomorrowIso,
    },
  },
  {
    id: "gc-2",
    name: "گیم‌کلاب سایبرسکی",
    imageUrl: "/img/gamnet-2.webp",
    location: "تبریز، آبرسان، پاساژ نسیم",
    rating: 4.6,
    reviewsCount: 312,
    hourlyPrice: 190000,
    discountedHourlyPrice: 161500,
    discount: {
      valueType: "PERCENTAGE",
      value: 15,
    },
  },
  {
    id: "gc-3",
    name: "مجموعه گیمینگ وی‌آر پلاس",
    imageUrl: "/img/gamnet-3.webp",
    location: "تبریز، شاهگلی، فلکه خیام",
    rating: 4.9,
    reviewsCount: 520,
    hourlyPrice: 280000,
    discount: {
      valueType: "FIXED_AMOUNT",
      value: 50000,
    },
  },
  {
    id: "f-1",
    name: "گیمنت اختصاصی وی‌آی‌پِی گرگدن",
    imageUrl: "/img/gamnet-4.webp",
    location: "تبریز، ولیعصر، بعد از میدان معلم",
    rating: 4.9,
    reviewsCount: 980,
    hourlyPrice: 250000,
    discount: {
      valueType: "PERCENTAGE",
      value: 30,
    },
  },
  {
    id: "f-2",
    name: "مرکز بازی‌های رایانه‌ای ماتریکس",
    imageUrl: "/img/gamnet-5.webp",
    location: "تبریز، رشدیه، بلوار بهارستان",
    rating: 4.7,
    reviewsCount: 410,
    hourlyPrice: 210000,
    discount: {
      valueType: "PERCENTAGE",
      value: 20,
    },
  },
  {
    id: "gc-6",
    name: "گیم‌سنتر آلفا",
    imageUrl: "/img/gamnet-1.webp",
    location: "تبریز، شهناز، کوچه ارک",
    rating: 4.5,
    reviewsCount: 185,
    hourlyPrice: 200000,
    discount: {
      valueType: "PERCENTAGE",
      value: 10,
    },
  },
];
