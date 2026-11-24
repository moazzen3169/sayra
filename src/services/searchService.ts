import { apiClient, type Query } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { TtlDedupeCache } from "@/lib/api/requestLimiter";
import { normalizeMediaUrl } from "@/lib/media";
import type { DeviceCatalogItem } from "@/types/catalog";
import type {
  PublicSearchGameCentersPayload,
  PublicSearchGamesPayload,
  PublicSearchSuggestPayload,
  SearchGameCenterItemDto,
  SearchGameCentersParams,
  SearchGamesParams,
  SearchSortOption,
  SearchSuggestParams,
} from "@/types/search";
import type { GamecenterListItem } from "./gamecentersPageService";

const DEFAULT_CENTER_IMAGE = "/img/gamnet-1.webp";

const suggestCache = new TtlDedupeCache<PublicSearchSuggestPayload>({
  ttlMs: 20 * 1000,
  maxEntries: 80,
});

const searchCentersCache = new TtlDedupeCache<PublicSearchGameCentersPayload>({
  ttlMs: 25 * 1000,
  maxEntries: 80,
});

const searchGamesCache = new TtlDedupeCache<PublicSearchGamesPayload>({
  ttlMs: 45 * 1000,
  maxEntries: 60,
});

/**
 * Normalizes Persian/Arabic characters and digits for device matching.
 */
function normalizeDeviceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical deviceType values accepted by GET /public/search/gamecenters.
 */
export function canonicalizeDeviceType(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const norm = normalizeDeviceText(trimmed);

  if (
    upper === "PLAYSTATION 5" ||
    upper === "PLAYSTATION5" ||
    upper === "PS5" ||
    upper === "PS 5" ||
    norm.includes("پلی استیشن 5") ||
    norm.includes("ps5")
  ) {
    return "PLAYSTATION 5";
  }

  if (
    upper === "PLAYSTATION 4" ||
    upper === "PLAYSTATION4" ||
    upper === "PS4" ||
    upper === "PS 4" ||
    norm.includes("پلی استیشن 4") ||
    norm.includes("ps4")
  ) {
    return "PLAYSTATION 4";
  }

  if (upper === "PLAYSTATION" || norm === "پلی استیشن") {
    return "PLAYSTATION";
  }

  if (upper === "PC" || norm === "کامپیوتر" || norm === "کامپیوتر گیمینگ" || norm === "سیستم") {
    return "PC";
  }

  if (upper === "XBOX" || norm.includes("ایکس باکس") || norm.includes("xbox")) {
    return "XBOX";
  }

  if (upper === "VR" || norm.includes("واقعیت مجازی") || norm === "vr") {
    return "VR";
  }

  if (
    upper === "SWITCH" ||
    upper === "NINTENDO SWITCH" ||
    norm.includes("سوییچ") ||
    norm.includes("سوئیچ") ||
    norm.includes("بیلیارد") ||
    norm === "billiards" ||
    norm === "billiard"
  ) {
    return "SWITCH";
  }

  return upper;
}

/**
 * Persian display label for a canonical deviceType.
 */
export function getDeviceTypeLabelFa(deviceType?: string | null): string {
  const canonical = canonicalizeDeviceType(deviceType);
  switch (canonical) {
    case "PLAYSTATION 5":
      return "پلی‌استیشن ۵";
    case "PLAYSTATION 4":
      return "پلی‌استیشن ۴";
    case "PLAYSTATION":
      return "پلی‌استیشن";
    case "PC":
      return "کامپیوتر گیمینگ";
    case "XBOX":
      return "ایکس‌باکس";
    case "VR":
      return "واقعیت مجازی";
    case "SWITCH":
      return "نینتندو سوییچ";
    default:
      return deviceType?.trim() || "دستگاه";
  }
}

export interface ResolvedDeviceFilter {
  deviceType?: string;
  isDiscounted: boolean;
  matchedCatalogDevice?: DeviceCatalogItem;
  label?: string;
}

/**
 * Resolves any combination of URL params (`deviceType`, `category`, `stationType`) and catalog devices
 * into the exact `deviceType` query parameter expected by GET /public/search/gamecenters.
 */
export function resolveDeviceFilterForSearch(params: {
  deviceType?: string;
  category?: string;
  stationType?: string;
  catalogDevices?: DeviceCatalogItem[];
}): ResolvedDeviceFilter {
  const catalogDevices = params.catalogDevices ?? [];
  const rawDeviceType = params.deviceType?.trim() || "";
  const rawCategory = params.category?.trim() || "";
  const rawStationType = params.stationType?.trim() || "";

  if (rawCategory.toLowerCase() === "discounted") {
    return {
      isDiscounted: true,
      label: "تخفیف‌دارها",
    };
  }

  // 1. Explicit deviceType param
  if (rawDeviceType && rawDeviceType.toLowerCase() !== "all") {
    const canonical = canonicalizeDeviceType(rawDeviceType);
    const matched = catalogDevices.find(
      (d) =>
        canonicalizeDeviceType(d.deviceTypeRef?.category || d.deviceType || d.name) === canonical ||
        d.id === rawDeviceType
    );
    return {
      deviceType: canonical,
      isDiscounted: false,
      matchedCatalogDevice: matched,
      label: matched?.name || getDeviceTypeLabelFa(canonical),
    };
  }

  // 2. Category param (catalog device ID, legacy slug, or deviceType)
  if (rawCategory && rawCategory.toLowerCase() !== "all") {
    const matchedById = catalogDevices.find((d) => d.id === rawCategory);
    if (matchedById) {
      const rawType = matchedById.deviceTypeRef?.category || matchedById.deviceType;
      let canonical = canonicalizeDeviceType(rawType);

      // If catalog device still uses generic PLAYSTATION, disambiguate PS5 vs PS4 from name
      if (!canonical || canonical === "PLAYSTATION") {
        const fromName = canonicalizeDeviceType(matchedById.name);
        if (fromName === "PLAYSTATION 5" || fromName === "PLAYSTATION 4") {
          canonical = fromName;
        }
      }

      return {
        deviceType: canonical,
        isDiscounted: false,
        matchedCatalogDevice: matchedById,
        label: matchedById.name,
      };
    }

    const canonicalFromCategory = canonicalizeDeviceType(rawCategory);
    const knownCanonical = new Set([
      "PC",
      "PLAYSTATION",
      "PLAYSTATION 4",
      "PLAYSTATION 5",
      "XBOX",
      "SWITCH",
      "VR",
    ]);

    if (canonicalFromCategory && knownCanonical.has(canonicalFromCategory)) {
      const matched = catalogDevices.find((d) => {
        const dt = canonicalizeDeviceType(d.deviceTypeRef?.category || d.deviceType);
        if (dt === canonicalFromCategory) return true;
        return canonicalizeDeviceType(d.name) === canonicalFromCategory;
      });
      return {
        deviceType: canonicalFromCategory,
        isDiscounted: false,
        matchedCatalogDevice: matched,
        label: matched?.name || getDeviceTypeLabelFa(canonicalFromCategory),
      };
    }
  }

  // 3. Fallback stationType param
  if (rawStationType && rawStationType.toLowerCase() !== "all") {
    const canonical = canonicalizeDeviceType(rawStationType);
    return {
      deviceType: canonical,
      isDiscounted: false,
      label: getDeviceTypeLabelFa(canonical),
    };
  }

  return {
    isDiscounted: false,
  };
}

/**
 * Maps UI sort keys (including legacy "default" / "popular") to OpenAPI SearchSortOption.
 */
export function mapUiSortToSearchSort(
  sort?: string | null,
  hasQuery?: boolean
): SearchSortOption {
  switch (sort) {
    case "popular":
    case "reviews":
      return "reviews";
    case "bayesian":
      return "bayesian";
    case "rating":
      return "rating";
    case "price_asc":
      return "price_asc";
    case "price_desc":
      return "price_desc";
    case "newest":
      return "newest";
    case "distance":
      return "distance";
    case "relevance":
      return "relevance";
    case "default":
    default:
      return hasQuery ? "relevance" : "bayesian";
  }
}

function buildSearchCentersQuery(params: SearchGameCentersParams): Query {
  const query: Query = {};

  if (params.q?.trim()) query.q = params.q.trim();
  if (params.game?.trim()) query.game = params.game.trim();
  if (params.gameId?.trim()) query.gameId = params.gameId.trim();
  if (params.gameSlug?.trim()) query.gameSlug = params.gameSlug.trim();
  if (params.gameIds && params.gameIds.length > 0) {
    query.gameIds = params.gameIds.slice(0, 10).join(",");
  }
  if (params.playMode) query.playMode = params.playMode;

  const cleanCity = params.city?.trim();
  if (cleanCity && cleanCity !== "همه") query.city = cleanCity;
  if (params.province?.trim()) query.province = params.province.trim();
  if (params.neighborhood?.trim()) query.neighborhood = params.neighborhood.trim();
  if (params.district?.trim()) query.district = params.district.trim();

  if (typeof params.lat === "number" && Number.isFinite(params.lat)) query.lat = params.lat;
  if (typeof params.lng === "number" && Number.isFinite(params.lng)) query.lng = params.lng;
  if (typeof params.radiusKm === "number" && Number.isFinite(params.radiusKm)) {
    query.radiusKm = params.radiusKm;
  }

  if (params.deviceType?.trim()) query.deviceType = params.deviceType.trim();
  if (params.stationType?.trim()) query.stationType = params.stationType.trim();

  if (params.amenities && params.amenities.length > 0) {
    query.amenities = params.amenities;
  }
  if (params.hasFoodService !== undefined) query.hasFoodService = params.hasFoodService;
  if (params.isVip !== undefined) query.isVip = params.isVip;
  if (params.allowOnlineBooking !== undefined) {
    query.allowOnlineBooking = params.allowOnlineBooking;
  }
  if (params.hasDiscount !== undefined) query.hasDiscount = params.hasDiscount;

  if (typeof params.minPrice === "number" && Number.isFinite(params.minPrice)) {
    query.minPrice = params.minPrice;
  }
  if (typeof params.maxPrice === "number" && Number.isFinite(params.maxPrice)) {
    query.maxPrice = params.maxPrice;
  }
  if (typeof params.minRating === "number" && Number.isFinite(params.minRating)) {
    query.minRating = params.minRating;
  }
  if (typeof params.minStationCount === "number" && Number.isFinite(params.minStationCount)) {
    query.minStationCount = Math.max(1, Math.floor(params.minStationCount));
  }

  if (params.isOpen !== undefined) query.isOpen = params.isOpen;
  if (params.status) query.status = params.status;
  if (params.availableNow !== undefined) query.availableNow = params.availableNow;
  if (params.availableAt?.trim()) query.availableAt = params.availableAt.trim();
  if (params.date?.trim()) query.date = params.date.trim();
  if (params.startTime?.trim()) query.startTime = params.startTime.trim();
  if (typeof params.durationHours === "number" && Number.isFinite(params.durationHours)) {
    query.durationHours = Math.min(Math.max(Math.floor(params.durationHours), 1), 12);
  }
  if (
    typeof params.minAvailableStations === "number" &&
    Number.isFinite(params.minAvailableStations)
  ) {
    query.minAvailableStations = Math.min(Math.max(Math.floor(params.minAvailableStations), 1), 50);
  }

  if (params.sort) query.sort = params.sort;
  if (params.includeFacets !== undefined) query.includeFacets = params.includeFacets;
  if (params.page !== undefined) query.page = Math.max(1, Math.floor(params.page));
  if (params.limit !== undefined) {
    query.limit = Math.min(Math.max(Math.floor(params.limit), 1), 50);
  }

  return query;
}

function unwrapPayload<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if ("data" in obj && obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    // Check if this is an outer envelope wrapping another payload with its own data/meta or games
    const inner = obj.data as Record<string, unknown>;
    if ("data" in inner || "games" in inner || "gameCenters" in inner || "appliedFilters" in inner) {
      return inner as T;
    }
  }
  return obj as T;
}

/**
 * Maps an item from GET /public/search/gamecenters to the UI GamecenterListItem shape.
 */
export function mapSearchGameCenterToListItem(item: SearchGameCenterItemDto): GamecenterListItem {
  const id = item.slug || item.id;
  const name = item.name || "گیم‌نت";

  // Resolve cover image
  const rawCover =
    item.images?.coverUrl ||
    item.images?.gallery?.[0]?.url ||
    item.images?.gallery?.[0]?.thumbUrl ||
    "";
  const normalizedCover = rawCover ? normalizeMediaUrl(rawCover.trim()) : "";
  const imageUrl = normalizedCover || DEFAULT_CENTER_IMAGE;

  const galleryUrls = Array.isArray(item.images?.gallery)
    ? item.images.gallery
        .map((g) => (g?.url ? normalizeMediaUrl(g.url.trim()) : ""))
        .filter(Boolean)
    : undefined;

  // Build readable location string without duplicating neighborhood
  const neighborhood = item.neighborhood?.trim() || "";
  const address = item.address?.trim() || "";
  const city = item.city?.trim() || "";
  let location = "";
  if (address) {
    location =
      neighborhood && !address.includes(neighborhood)
        ? `${neighborhood}، ${address}`
        : address;
  } else if (neighborhood) {
    location = city && !neighborhood.includes(city) ? `${city}، ${neighborhood}` : neighborhood;
  } else {
    location = city || item.description?.trim() || "";
  }

  // Pricing & discount
  const pricing = item.pricing;
  const hasDiscount = Boolean(
    pricing?.hasDiscount ||
      (pricing && ((pricing.discountPercentage ?? 0) > 0 || (pricing.discountAmount ?? 0) > 0))
  );
  const hourlyPrice =
    typeof pricing?.originalPrice === "number" && pricing.originalPrice > 0
      ? pricing.originalPrice
      : typeof pricing?.startingHourlyRate === "number"
        ? pricing.startingHourlyRate
        : 0;

  let discountedHourlyPrice: number | undefined;
  let discountPercent: number | undefined;
  let discountAmount: number | undefined;
  let discountObj: GamecenterListItem["discount"];

  if (hasDiscount && pricing) {
    if (typeof pricing.finalPrice === "number" && pricing.finalPrice >= 0) {
      discountedHourlyPrice = pricing.finalPrice;
    }
    if (typeof pricing.discountPercentage === "number" && pricing.discountPercentage > 0) {
      discountPercent = pricing.discountPercentage;
      discountObj = {
        valueType: "PERCENTAGE",
        value: pricing.discountPercentage,
      };
    } else if (typeof pricing.discountAmount === "number" && pricing.discountAmount > 0) {
      discountAmount = pricing.discountAmount;
      discountObj = {
        valueType: "FIXED_AMOUNT",
        value: pricing.discountAmount,
      };
    }
  }

  // Derive category tags from deviceCounts and devices
  const catSet = new Set<string>();
  const counts = item.deviceCounts ?? {};
  if ((counts.PC ?? 0) > 0 || item.pcCount > 0) catSet.add("pc");
  if ((counts["PLAYSTATION 5"] ?? 0) > 0) catSet.add("ps5");
  if ((counts["PLAYSTATION 4"] ?? 0) > 0) catSet.add("ps4");
  if ((counts.PLAYSTATION ?? 0) > 0) catSet.add("playstation");
  if ((counts.XBOX ?? 0) > 0) catSet.add("xbox");
  if ((counts.SWITCH ?? 0) > 0) catSet.add("switch");
  if ((counts.VR ?? 0) > 0) catSet.add("vr");

  if (Array.isArray(item.devices)) {
    for (const dev of item.devices) {
      if (!dev || dev.count <= 0) continue;
      const canonical = canonicalizeDeviceType(dev.type);
      if (canonical === "PLAYSTATION 5") catSet.add("ps5");
      else if (canonical === "PLAYSTATION 4") catSet.add("ps4");
      else if (canonical === "PC") catSet.add("pc");
      else if (canonical === "XBOX") catSet.add("xbox");
      else if (canonical === "VR") catSet.add("vr");
      else if (canonical === "SWITCH") catSet.add("switch");
    }
  }

  return {
    id,
    slug: item.slug || undefined,
    name,
    imageUrl,
    location,
    city,
    neighborhood: neighborhood || undefined,
    rating: typeof item.rating?.average === "number" ? item.rating.average : 0,
    reviewsCount:
      typeof item.rating?.validReviewsCount === "number" ? item.rating.validReviewsCount : 0,
    hourlyPrice,
    discountedHourlyPrice,
    discountPercent,
    discountAmount,
    discount: discountObj,
    categories: Array.from(catSet),
    deviceCounts: counts,
    rawFlags: {
      pc: (counts.PC ?? 0) > 0 || item.pcCount > 0,
      ps4: (counts["PLAYSTATION 4"] ?? 0) > 0,
      ps5: (counts["PLAYSTATION 5"] ?? 0) > 0,
      xbox: (counts.XBOX ?? 0) > 0,
    },
    isDiscounted: hasDiscount,
    isOpen: item.activityStatus?.isOpenNow,
    pcCount: item.pcCount,
    consoleCount: item.consoleCount,
    coverImages: galleryUrls,
    matchedGames: item.matchedGames,
    amenities: item.amenities,
    detailUrl: item.detailUrl || `/gamecenter/${id}`,
    createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
  };
}

export const searchService = {
  /**
   * Fast typeahead autocomplete grouped across games, gaming centers, locations (cities/neighborhoods), and devices.
   * GET /public/search/suggest
   */
  async suggest(params: SearchSuggestParams): Promise<PublicSearchSuggestPayload> {
    const cleanQ = params.q.trim();
    if (!cleanQ) {
      return {
        query: "",
        games: [],
        gameCenters: [],
        locations: { cities: [], neighborhoods: [] },
        devices: [],
      };
    }

    const query: Query = {
      q: cleanQ.slice(0, 100),
      limit: Math.min(Math.max(Math.floor(params.limit ?? 5), 1), 10),
    };
    const cleanCity = params.city?.trim();
    if (cleanCity && cleanCity !== "همه") {
      query.city = cleanCity;
    }

    const cacheKey = JSON.stringify(query);

    return suggestCache.getOrFetch(
      cacheKey,
      async (internalSignal) => {
        const response = await apiClient.get<unknown>(ENDPOINTS.search.suggest, {
          query,
          signal: internalSignal,
          skipAuth: true,
        });

        const payload = unwrapPayload<Partial<PublicSearchSuggestPayload>>(response.data);
        return {
          query: payload?.query ?? cleanQ,
          games: Array.isArray(payload?.games) ? payload.games : [],
          gameCenters: Array.isArray(payload?.gameCenters) ? payload.gameCenters : [],
          locations: {
            cities: Array.isArray(payload?.locations?.cities)
              ? payload.locations.cities
              : [],
            neighborhoods: Array.isArray(payload?.locations?.neighborhoods)
              ? payload.locations.neighborhoods
              : [],
          },
          devices: Array.isArray(payload?.devices) ? payload.devices : [],
        };
      },
      params.signal
    );
  },

  /**
   * Unified multi-criteria search across gaming centers, games, hardware devices, availability, and locations.
   * GET /public/search/gamecenters
   */
  async searchGameCenters(
    params: SearchGameCentersParams = {}
  ): Promise<PublicSearchGameCentersPayload> {
    const query = buildSearchCentersQuery(params);
    const cacheKey = JSON.stringify(query);

    return searchCentersCache.getOrFetch(
      cacheKey,
      async (internalSignal) => {
        const response = await apiClient.get<unknown>(ENDPOINTS.search.gamecenters, {
          query,
          signal: internalSignal,
          skipAuth: true,
        });

        const payload = unwrapPayload<Partial<PublicSearchGameCentersPayload>>(response.data);
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const meta = payload?.meta ?? {
          total: items.length,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          totalPages: 1,
        };

        return {
          data: items,
          meta: {
            total: typeof meta.total === "number" ? meta.total : items.length,
            page: typeof meta.page === "number" ? meta.page : (params.page ?? 1),
            limit: typeof meta.limit === "number" ? meta.limit : (params.limit ?? 20),
            totalPages: typeof meta.totalPages === "number" ? meta.totalPages : 1,
          },
          appliedFilters: payload?.appliedFilters ?? {},
          resolvedGames: Array.isArray(payload?.resolvedGames) ? payload.resolvedGames : [],
          facets: payload?.facets,
          suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
        };
      },
      params.signal
    );
  },

  /**
   * Search canonical bilingual game catalog with active gaming center counts.
   * GET /public/search/games
   */
  async searchGames(params: SearchGamesParams = {}): Promise<PublicSearchGamesPayload> {
    const query: Query = {};
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.platform?.trim()) query.platform = params.platform.trim();
    if (params.deviceType?.trim()) query.deviceType = params.deviceType.trim();
    if (params.category?.trim()) query.category = params.category.trim();
    if (params.supportsOnline !== undefined) query.supportsOnline = params.supportsOnline;
    if (params.page !== undefined) query.page = Math.max(1, Math.floor(params.page));
    if (params.limit !== undefined) {
      query.limit = Math.min(Math.max(Math.floor(params.limit), 1), 50);
    }

    const cacheKey = JSON.stringify(query);

    return searchGamesCache.getOrFetch(
      cacheKey,
      async (internalSignal) => {
        const response = await apiClient.get<unknown>(ENDPOINTS.search.games, {
          query,
          signal: internalSignal,
          skipAuth: true,
        });

        const payload = unwrapPayload<Partial<PublicSearchGamesPayload>>(response.data);
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const meta = payload?.meta ?? {
          total: items.length,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          totalPages: 1,
        };

        return {
          data: items,
          meta: {
            total: typeof meta.total === "number" ? meta.total : items.length,
            page: typeof meta.page === "number" ? meta.page : (params.page ?? 1),
            limit: typeof meta.limit === "number" ? meta.limit : (params.limit ?? 20),
            totalPages: typeof meta.totalPages === "number" ? meta.totalPages : 1,
          },
        };
      },
      params.signal
    );
  },

  clearCaches() {
    suggestCache.clear();
    searchCentersCache.clear();
    searchGamesCache.clear();
  },
};
