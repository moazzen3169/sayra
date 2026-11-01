import { PublicGamingCenter, ContractGapError } from "@/types/customerApi";
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
  createdAt: string;
}

export interface GamecenterFilterParams {
  q?: string;
  category?: string;
  city?: string;
  sort?: "default" | "popular" | "newest" | "price_asc" | "price_desc" | "rating";
}

/**
 * Mapping helper: Maps an OpenAPI PublicGamingCenter schema item to GamecenterListItem
 * Strictly bound to documented fields without fabricating arbitrary fake values.
 */
export function mapPublicGamingCenterToListItem(
  center: PublicGamingCenter,
  overrides?: Partial<GamecenterListItem>
): GamecenterListItem {
  // Use documented slug or id
  const id = center.slug || center.id;
  const name = center.name || "گیم‌نت";
  const location = center.description || "";
  const createdAt = center.createdAt || new Date().toISOString();

  // In OpenAPI v1.0-LOCKED, image, city, rating, price, discounts, and categories are not
  // returned in GET /gamingCenters. Fallbacks preserve card visual structure cleanly.
  return {
    id,
    name,
    imageUrl: overrides?.imageUrl || "/img/gamnet-1.webp",
    location: overrides?.location !== undefined ? overrides.location : location,
    city: overrides?.city || "",
    rating: overrides?.rating ?? 0,
    reviewsCount: overrides?.reviewsCount ?? 0,
    hourlyPrice: overrides?.hourlyPrice ?? 0,
    discountedHourlyPrice: overrides?.discountedHourlyPrice,
    discountPercent: overrides?.discountPercent,
    discount: overrides?.discount,
    categories: overrides?.categories || [],
    isNew: overrides?.isNew,
    isPopular: overrides?.isPopular,
    isDiscounted: overrides?.isDiscounted,
    createdAt,
  };
}

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
  /**
   * Fetches real gaming centers from GET /gamingCenters and maps to list items.
   * No static mock fallback is used at runtime.
   */
  async loadAllCenters(signal?: AbortSignal): Promise<GamecenterListItem[]> {
    const centers = await gamingCenterService.listGamingCenters(signal);
    return centers.map((c) => mapPublicGamingCenterToListItem(c));
  },

  /**
   * Filters a list of gaming centers using client-side matching.
   */
  filterCenters(items: GamecenterListItem[], params: GamecenterFilterParams): GamecenterListItem[] {
    const { q, category, city, sort = "default" } = params;

    const filtered = items.filter((item) => {
      // City filter (if item has city or location)
      if (city && city !== "همه") {
        const itemCity = item.city || item.location;
        if (itemCity && !normalizeText(itemCity).includes(normalizeText(city))) {
          if (!q) {
            return false;
          }
        }
      }

      // Category filter
      if (category && category !== "all") {
        if (!item.categories.map((c) => c.toLowerCase()).includes(category.toLowerCase())) {
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
