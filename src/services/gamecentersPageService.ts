import { DiscountedCenter } from "@/types/home";
import { PublicGamingCenter, ContractGapError } from "@/types/customerApi";
import { gamingCenterService } from "./gamingCenterService";

/**
 * Interface representing a gaming center in listing views.
 * Undocumented fields in OpenAPI v1.0-LOCKED (GET /gamingCenters) are made optional
 * so that no fabricated numbers or fake strings are injected.
 */
export interface GamecenterListItem {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  location?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  hourlyPrice?: number;
  discountedHourlyPrice?: number;
  discountPercent?: number;
  discount?: {
    valueType: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    endAt?: string;
  };
  categories?: string[];
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

export interface GamecentersListResult {
  items: GamecenterListItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
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

/**
 * Maps a PublicGamingCenter entity from the API (GET /gamingCenters)
 * to GamecenterListItem strictly using documented fields.
 * No fabricated ratings, prices, or locations are introduced.
 */
export function mapPublicGamingCenterToListItem(center: PublicGamingCenter): GamecenterListItem {
  return {
    id: center.id,
    name: center.name,
    slug: center.slug,
    // imageUrl, location, city, rating, reviewsCount, hourlyPrice, discount, and categories
    // are not present on GamingCenter in OpenAPI v1.0-LOCKED.
    imageUrl: undefined,
    location: undefined,
    city: undefined,
    rating: undefined,
    reviewsCount: undefined,
    hourlyPrice: undefined,
    discountedHourlyPrice: undefined,
    discountPercent: undefined,
    discount: undefined,
    categories: [],
    isDiscounted: false,
    createdAt: center.createdAt || new Date().toISOString(),
  };
}

export const gamecentersPageService = {
  /**
   * Fetches all centers from the API endpoint GET /gamingCenters
   * and maps them strictly according to documented fields.
   */
  async getAllCenters(
    params?: { page?: number; pageSize?: number },
    signal?: AbortSignal
  ): Promise<GamecentersListResult> {
    const response = await gamingCenterService.listGamingCenters(params, signal);
    const items = response.data.map(mapPublicGamingCenterToListItem);
    return {
      items,
      total: response.meta?.total ?? items.length,
      page: response.meta?.page ?? 1,
      pageSize: response.meta?.pageSize ?? items.length,
      totalPages: response.meta?.totalPages,
    };
  },

  /**
   * Returns centers that have active discounts.
   * Contract Gap Note: GET /gamingCenters does not provide discount information in v1.0-LOCKED.
   * Returns empty array if none of the API centers have discounts, without mock fallbacks.
   */
  async getDiscountedCenters(signal?: AbortSignal): Promise<GamecenterListItem[]> {
    const { items } = await this.getAllCenters(undefined, signal);
    return items.filter((item) => item.isDiscounted || (item.discount && item.discount.value > 0));
  },

  /**
   * Returns newest gaming centers sorted by createdAt.
   */
  async getNewestCenters(limit = 6, signal?: AbortSignal): Promise<GamecenterListItem[]> {
    const { items } = await this.getAllCenters(undefined, signal);
    return [...items]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  /**
   * Returns popular gaming centers.
   * Contract Gap Note: In OpenAPI v1.0-LOCKED, rating and reviewsCount are not present in GET /gamingCenters.
   * Falls back gracefully to the centers list without fabricating numbers.
   */
  async getPopularCenters(limit = 6, signal?: AbortSignal): Promise<GamecenterListItem[]> {
    const { items } = await this.getAllCenters(undefined, signal);
    return [...items]
      .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
      .slice(0, limit);
  },

  /**
   * In-memory filtering and sorting over the fetched centers.
   * Only filters against documented fields (e.g. name, description).
   */
  filterCenters(items: GamecenterListItem[], params: GamecenterFilterParams): GamecenterListItem[] {
    const { q, category, city, sort = "default" } = params;

    let filtered = items.filter((item) => {
      // City filter (documented gap: city is not on GamingCenter)
      if (city && city !== "همه" && item.city) {
        if (normalizeText(item.city) !== normalizeText(city)) {
          return false;
        }
      }

      // Category filter (documented gap: categories are not on GamingCenter in GET /gamingCenters)
      if (category && category !== "all" && item.categories && item.categories.length > 0) {
        if (!item.categories.includes(category.toLowerCase())) {
          return false;
        }
      }

      // Query filter over available text fields (name, location if present)
      if (q && q.trim()) {
        const normQ = normalizeText(q);
        const searchableText = normalizeText(
          `${item.name} ${item.location || ""} ${item.city || ""} ${(item.categories || []).join(" ")}`
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
          (a, b) => (a.discountedHourlyPrice ?? a.hourlyPrice ?? 0) - (b.discountedHourlyPrice ?? b.hourlyPrice ?? 0)
        );
        break;
      case "price_desc":
        filtered.sort(
          (a, b) => (b.discountedHourlyPrice ?? b.hourlyPrice ?? 0) - (a.discountedHourlyPrice ?? a.hourlyPrice ?? 0)
        );
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      default:
        break;
    }

    return filtered;
  },
};
