import {
  PublicGamingCenter,
  GamingCenterAddress,
  ContractGapError,
} from "@/types/customerApi";
import { gamingCenterService } from "./gamingCenterService";

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
  /** از فیلد is_open پاسخ API */
  isOpen?: boolean;
  pcCount?: number;
  consoleCount?: number;
  createdAt: string;
}

export interface GamecenterFilterParams {
  q?: string;
  category?: string;
  city?: string;
  sort?: "default" | "popular" | "newest" | "price_asc" | "price_desc" | "rating";
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  /** فقط گیمنت‌های باز (is_open) */
  openOnly?: boolean;
  /** حداقل تعداد سیستم (pcCount) */
  minPcCount?: number;
  /** حداقل تعداد کنسول (consoleCount) */
  minConsoleCount?: number;
}

/** برچسب‌های فارسی/انگلیسی هر دسته برای جستجوی متنی */
export const CATEGORY_SEARCH_KEYWORDS: Record<string, string> = {
  ps5: "پلی استیشن ۵ پلی استیشن 5 ps5 playstation",
  ps4: "پلی استیشن ۴ پلی استیشن 4 ps4 playstation",
  pc: "کامپیوتر گیمینگ سیستم pc",
  xbox: "ایکس باکس xbox",
};

const DEFAULT_CENTER_IMAGE = "/img/gamnet-1.webp";

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && isFinite(n) ? n : fallback;
}

function pickPrimaryAddress(
  addresses?: GamingCenterAddress[]
): GamingCenterAddress | undefined {
  if (!Array.isArray(addresses) || addresses.length === 0) return undefined;
  return addresses.find((a) => a?.isPrimary) ?? addresses[0];
}

function deriveCategories(center: PublicGamingCenter): string[] {
  const list: string[] = [];
  if (center.ps5) list.push("ps5");
  if (center.ps4) list.push("ps4");
  if (center.pc) list.push("pc");
  if (center.xbox) list.push("xbox");
  return list;
}

/**
 * Mapping helper: Maps an OpenAPI PublicGamingCenter schema item to GamecenterListItem
 * - آدرس: addressLine آدرس اصلی (در نبود آدرس، description)
 * - قیمت: hourlyRate
 * - امتیاز و تعداد نظر: raiting و comment_count
 * - دسته‌ها: ps4 / ps5 / pc / xbox
 */
export function mapPublicGamingCenterToListItem(
  center: PublicGamingCenter,
  overrides?: Partial<GamecenterListItem>
): GamecenterListItem {
  const id = center.slug || center.id;
  const name = center.name || "گیم‌نت";
  const primary = pickPrimaryAddress(center.addresses);
  const addressLine = primary?.addressLine?.trim() || "";
  const location = addressLine || center.description || "";
  const city = primary?.city?.trim() || "";
  const createdAt = center.createdAt || new Date().toISOString();

  return {
    id,
    name,
    imageUrl: overrides?.imageUrl || DEFAULT_CENTER_IMAGE,
    location: overrides?.location !== undefined ? overrides.location : location,
    city: overrides?.city || city,
    rating: overrides?.rating ?? toNumber(center.raiting),
    reviewsCount: overrides?.reviewsCount ?? toNumber(center.comment_count),
    hourlyPrice: overrides?.hourlyPrice ?? toNumber(center.hourlyRate),
    discountedHourlyPrice: overrides?.discountedHourlyPrice,
    discountPercent: overrides?.discountPercent,
    discount: overrides?.discount,
    categories: overrides?.categories || deriveCategories(center),
    isNew: overrides?.isNew,
    isPopular: overrides?.isPopular,
    isDiscounted: overrides?.isDiscounted,
    isOpen: overrides?.isOpen ?? (typeof center.is_open === "boolean" ? center.is_open : undefined),
    pcCount: overrides?.pcCount ?? (typeof center.pcCount === "number" ? center.pcCount : undefined),
    consoleCount:
      overrides?.consoleCount ??
      (typeof center.consoleCount === "number" ? center.consoleCount : undefined),
    createdAt,
  };
}

export function normalizeFilterText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** متن قابل جستجوی یک گیمنت: نام، آدرس، شهر و دستگاه‌ها (با برچسب فارسی) */
export function buildCenterSearchText(item: GamecenterListItem): string {
  const keywords = item.categories
    .map((c) => CATEGORY_SEARCH_KEYWORDS[c.toLowerCase()] ?? "")
    .join(" ");
  return normalizeFilterText(
    `${item.name} ${item.location} ${item.city} ${item.categories.join(" ")} ${keywords}`
  );
}

export const gamecentersPageService = {
  /**
   * Fetches real gaming centers from GET /gamingCenters and maps to list items.
   * No static mock fallback is used at runtime.
   */
  async loadAllCenters(signal?: AbortSignal): Promise<GamecenterListItem[]> {
    const centers = await gamingCenterService.listGamingCenters(signal);
    return centers
      .filter((c) => c.isActive !== false)
      .map((c) => mapPublicGamingCenterToListItem(c));
  },

  /**
   * Filters a list of gaming centers using client-side matching over the loaded dataset.
   */
  filterCenters(items: GamecenterListItem[], params: GamecenterFilterParams): GamecenterListItem[] {
    const {
      q,
      category,
      city,
      sort = "default",
      minRating,
      minPrice,
      maxPrice,
      openOnly,
      minPcCount,
      minConsoleCount,
    } = params;

    const filtered = items.filter((item) => {
      // City filter (if item has city or location)
      if (city && city !== "همه") {
        const itemCity = item.city || item.location;
        if (itemCity && !normalizeFilterText(itemCity).includes(normalizeFilterText(city))) {
          if (!q) {
            return false;
          }
        }
      }

      // Category filter (ps4 / ps5 / pc / xbox ...)
      if (category && category !== "all") {
        if (!item.categories.map((c) => c.toLowerCase()).includes(category.toLowerCase())) {
          return false;
        }
      }

      // Open now filter (is_open)
      if (openOnly && item.isOpen !== true) {
        return false;
      }

      // Device counts
      if (minPcCount !== undefined && (item.pcCount ?? 0) < minPcCount) {
        return false;
      }
      if (minConsoleCount !== undefined && (item.consoleCount ?? 0) < minConsoleCount) {
        return false;
      }

      // Query filter
      if (q && q.trim()) {
        const normQ = normalizeFilterText(q);
        if (!buildCenterSearchText(item).includes(normQ)) {
          return false;
        }
      }

      // Price filter (if provided)
      const effectivePrice = item.discountedHourlyPrice ?? item.hourlyPrice;
      if (minPrice !== undefined && effectivePrice < minPrice) {
        return false;
      }
      if (maxPrice !== undefined && effectivePrice > maxPrice) {
        return false;
      }

      // Rating filter (if provided)
      if (minRating !== undefined && item.rating < minRating) {
        return false;
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
        filtered.sort(
          (a, b) =>
            (a.discountedHourlyPrice ?? a.hourlyPrice) -
            (b.discountedHourlyPrice ?? b.hourlyPrice)
        );
        break;
      case "price_desc":
        filtered.sort(
          (a, b) =>
            (b.discountedHourlyPrice ?? b.hourlyPrice) -
            (a.discountedHourlyPrice ?? a.hourlyPrice)
        );
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return filtered;
  },

  getDiscountedCenters(items: GamecenterListItem[]): GamecenterListItem[] {
    return items.filter((item) => item.isDiscounted || item.discount);
  },

  getNewestCenters(items: GamecenterListItem[]): GamecenterListItem[] {
    return [...items]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  },

  getPopularCenters(items: GamecenterListItem[]): GamecenterListItem[] {
    return [...items]
      .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
      .slice(0, 6);
  },

  /** برترین‌ها بر اساس امتیاز (برای بخش «پیشنهاد ویژه») */
  getFeaturedCenters(items: GamecenterListItem[]): GamecenterListItem[] {
    return [...items].sort((a, b) => b.rating - a.rating).slice(0, 3);
  },

  /**
   * Throws contract gap error if server-side filtering is requested directly from API
   */
  serverFilterUnsupported(): never {
    throw new ContractGapError(
      "GamingCenterServerFilter",
      "GET /gamingCenters does not support query parameters for filtering, sorting, or searching in OpenAPI v1.0-LOCKED."
    );
  },
};