import { DiscountedCenter } from "@/types/home";

export interface GamecenterListItem {
  id: string;
  name: string;
  imageUrl: string;
  location: string;
  city: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  discountedHourlyPrice?: number;
  discountPercent?: number;
  discount?: {
    valueType: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    endAt?: string;
  };
  categories: string[];
  isNew?: boolean;
  isPopular?: boolean;
  isDiscounted?: boolean;
  createdAt: string;
}

export interface GamecenterFilterParams {
  q?: string;
  category?: string;
  city?: string;
  sort?: "default" | "popular" | "newest" | "price_asc" | "price_desc" | "rating";
}

export const MOCK_ALL_GAMECENTERS: GamecenterListItem[] = [
  {
    id: "gc-1",
    name: "گیمنت گرگدن (شعبه ولیعصر)",
    imageUrl: "/img/gamnet-1.webp",
    location: "تبریز، ولیعصر، خیابان مخابرات",
    city: "تبریز",
    rating: 4.8,
    reviewsCount: 744,
    hourlyPrice: 240000,
    discountedHourlyPrice: 180000,
    discountPercent: 25,
    discount: {
      valueType: "PERCENTAGE",
      value: 25,
    },
    categories: ["ps5", "pc", "xbox", "steering"],
    isDiscounted: true,
    isPopular: true,
    createdAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "gc-2",
    name: "گیم کلاب سایبرسکی",
    imageUrl: "/img/gamnet-2.webp",
    location: "تبریز، آبرسان، پاساژ نسیم",
    city: "تبریز",
    rating: 4.6,
    reviewsCount: 312,
    hourlyPrice: 200000,
    discountedHourlyPrice: 150000,
    discountPercent: 25,
    discount: {
      valueType: "PERCENTAGE",
      value: 25,
    },
    categories: ["ps5", "ps4", "xbox"],
    isDiscounted: true,
    isPopular: true,
    createdAt: "2024-02-15T12:00:00Z",
  },
  {
    id: "gc-3",
    name: "مجموعه گیمینگ وی‌آر پلاس",
    imageUrl: "/img/gamnet-3.webp",
    location: "تبریز، شاهگلی، فلکه خیام",
    city: "تبریز",
    rating: 4.9,
    reviewsCount: 520,
    hourlyPrice: 280000,
    discountPercent: 20,
    discount: {
      valueType: "FIXED_AMOUNT",
      value: 50000,
    },
    categories: ["vr", "ps5"],
    isDiscounted: true,
    isPopular: true,
    createdAt: "2024-03-01T08:00:00Z",
  },
  {
    id: "gc-4",
    name: "گیمنت اختصاصی VIP گرگدن",
    imageUrl: "/img/gamnet-4.webp",
    location: "تبریز، ولیعصر، روبروی کتابخانه",
    city: "تبریز",
    rating: 4.9,
    reviewsCount: 980,
    hourlyPrice: 250000,
    discountPercent: 30,
    discount: {
      valueType: "PERCENTAGE",
      value: 30,
    },
    categories: ["ps5", "pc", "steering"],
    isDiscounted: true,
    isPopular: true,
    createdAt: "2024-04-12T14:30:00Z",
  },
  {
    id: "gc-5",
    name: "مرکز بازی‌های رایانه‌ای ماتریکس",
    imageUrl: "/img/gamnet-5.webp",
    location: "تبریز، رشدیه، بلوار بهارستان",
    city: "تبریز",
    rating: 4.7,
    reviewsCount: 410,
    hourlyPrice: 210000,
    discountPercent: 20,
    discount: {
      valueType: "PERCENTAGE",
      value: 20,
    },
    categories: ["pc", "billiards"],
    isDiscounted: true,
    isNew: true,
    createdAt: "2024-05-20T11:00:00Z",
  },
  {
    id: "gc-6",
    name: "گیم سنتر اپکس",
    imageUrl: "/img/gamnet-1.webp",
    location: "تبریز، شهناز، کوچه ارک",
    city: "تبریز",
    rating: 4.5,
    reviewsCount: 185,
    hourlyPrice: 190000,
    discount: {
      valueType: "FIXED_AMOUNT",
      value: 30000,
    },
    categories: ["ps4", "xbox"],
    isDiscounted: true,
    isNew: true,
    createdAt: "2024-06-05T16:00:00Z",
  },
  {
    id: "gc-7",
    name: "مجموعه گیمینگ پرشین پلیر",
    imageUrl: "/img/gamnet-2.webp",
    location: "تهران، سعادت‌آباد، خیابان سرو",
    city: "تهران",
    rating: 4.8,
    reviewsCount: 620,
    hourlyPrice: 300000,
    discountedHourlyPrice: 240000,
    discountPercent: 20,
    categories: ["ps5", "pc", "vr", "billiards"],
    isDiscounted: true,
    isPopular: true,
    createdAt: "2024-06-18T09:00:00Z",
  },
  {
    id: "gc-8",
    name: "گیم کلاب نکسوس",
    imageUrl: "/img/gamnet-3.webp",
    location: "تهران، صادقیه، بلوار فردوس",
    city: "تهران",
    rating: 4.6,
    reviewsCount: 290,
    hourlyPrice: 220000,
    categories: ["ps5", "xbox", "steering"],
    isNew: true,
    createdAt: "2024-06-25T13:00:00Z",
  },
  {
    id: "gc-9",
    name: "باشگاه بازی آلفا",
    imageUrl: "/img/gamnet-4.webp",
    location: "اصفهان، چهارباغ عباسی",
    city: "اصفهان",
    rating: 4.7,
    reviewsCount: 340,
    hourlyPrice: 180000,
    categories: ["ps4", "pc", "billiards"],
    isNew: true,
    createdAt: "2024-06-28T10:00:00Z",
  },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const gamecentersPageService = {
  getDiscountedCenters(): GamecenterListItem[] {
    return MOCK_ALL_GAMECENTERS.filter((item) => item.isDiscounted || item.discount);
  },

  getNewestCenters(): GamecenterListItem[] {
    return [...MOCK_ALL_GAMECENTERS]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  },

  getPopularCenters(): GamecenterListItem[] {
    return [...MOCK_ALL_GAMECENTERS]
      .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
      .slice(0, 6);
  },

  filterCenters(params: GamecenterFilterParams): GamecenterListItem[] {
    const { q, category, city, sort = "default" } = params;

    let filtered = MOCK_ALL_GAMECENTERS.filter((item) => {
      // City filter
      if (city && normalizeText(item.city) !== normalizeText(city)) {
        if (!q && city !== "همه") {
          return false;
        }
      }

      // Category filter
      if (category && category !== "all") {
        if (!item.categories.includes(category.toLowerCase())) {
          return false;
        }
      }

      // Query filter
      if (q && q.trim()) {
        const normQ = normalizeText(q);
        const searchableText = normalizeText(
          `${item.name} ${item.location} ${item.city} ${item.categories.join(" ")}`
        );
        if (!searchableText.includes(normQ)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    switch (sort) {
      case "popular":
        filtered.sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price_asc":
        filtered.sort((a, b) => (a.discountedHourlyPrice ?? a.hourlyPrice) - (b.discountedHourlyPrice ?? b.hourlyPrice));
        break;
      case "price_desc":
        filtered.sort((a, b) => (b.discountedHourlyPrice ?? b.hourlyPrice) - (a.discountedHourlyPrice ?? a.hourlyPrice));
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return filtered;
  },
};
