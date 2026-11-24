import {
  PublicGamingCenter,
  GamingCenterAddress,
  ContractGapError,
} from "@/types/customerApi";
import type { DeviceCatalogItem } from "@/types/catalog";
import type { DeviceCategory as CenterDeviceCategory } from "@/types/gaming-center/device-category.types";
import type { MatchedCenterGameDto, PublicAmenityKey } from "@/types/search";
import { isAbortError } from "@/lib/api/client";
import { mapWithConcurrency } from "@/lib/api/requestLimiter";
import { gamingCenterService, type ListGamingCentersParams } from "./gamingCenterService";
import { deviceCategoryApi } from "./gaming-center/device-category.api";
import { normalizeMediaUrl } from "@/lib/media";

export const CENTERS_PAGE_LIMIT = 24;
export const MAX_CENTER_PAGES = 4;
export const MAX_DEVICE_VERIFY_CENTERS = 24;
export const DEVICE_VERIFY_CONCURRENCY = 4;

export interface GamecenterListItem {
  id: string;
  slug?: string;
  name: string;
  imageUrl: string;
  location: string;
  city: string;
  neighborhood?: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  discountedHourlyPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  discount?: {
    valueType: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    endAt?: string;
  };
  categories: string[];
  deviceCounts?: PublicGamingCenter["deviceCounts"];
  rawFlags?: {
    pc?: boolean;
    ps4?: boolean;
    ps5?: boolean;
    xbox?: boolean;
  };
  isNew?: boolean;
  isPopular?: boolean;
  isDiscounted?: boolean;
  /** از فیلد is_open پاسخ API */
  isOpen?: boolean;
  pcCount?: number;
  consoleCount?: number;
  coverImages?: string[];
  matchedGames?: MatchedCenterGameDto[];
  amenities?: PublicAmenityKey[];
  detailUrl?: string;
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

export interface ResolvedCategoryFilter {
  kind: "all" | "discounted" | "catalog_device" | "station_type" | "legacy";
  categoryParam: string;
  catalogDevice?: DeviceCatalogItem;
  stationType?: string;
  requiresExactDeviceCheck: boolean;
  legacyKey?: string;
}

/** برچسب‌های فارسی/انگلیسی هر دسته برای جستجوی متنی */
export const CATEGORY_SEARCH_KEYWORDS: Record<string, string> = {
  ps5: "پلی استیشن ۵ پلی استیشن 5 ps5 playstation",
  ps4: "پلی استیشن ۴ پلی استیشن 4 ps4 playstation",
  playstation: "پلی استیشن playstation ps4 ps5",
  pc: "کامپیوتر گیمینگ سیستم pc",
  xbox: "ایکس باکس xbox",
  vr: "واقعیت مجازی vr",
  switch: "بیلیارد سوییچ switch billiards",
  billiards: "بیلیارد billiards",
  steering: "فرمان بازی ریسینگ wheel steering",
};

const LEGACY_CATEGORY_META: Record<
  string,
  { stationType?: string; aliases: string[] }
> = {
  ps5: { stationType: "PLAYSTATION", aliases: ["ps5", "پلی استیشن 5", "پلی استیشن ۵"] },
  ps4: { stationType: "PLAYSTATION", aliases: ["ps4", "پلی استیشن 4", "پلی استیشن ۴"] },
  pc: { stationType: "PC", aliases: ["pc", "کامپیوتر"] },
  xbox: { stationType: "XBOX", aliases: ["xbox", "ایکس باکس"] },
  vr: { stationType: "VR", aliases: ["vr", "واقعیت مجازی"] },
  billiards: { stationType: "SWITCH", aliases: ["بیلیارد", "billiard"] },
  switch: { stationType: "SWITCH", aliases: ["switch", "سوییچ", "بیلیارد"] },
  steering: { aliases: ["فرمان", "wheel", "steering"] },
};

const KNOWN_STATION_TYPES = new Set([
  "PC",
  "PLAYSTATION",
  "PLAYSTATION 4",
  "PLAYSTATION 5",
  "XBOX",
  "SWITCH",
  "VR",
]);

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
  const set = new Set<string>();
  if (center.ps5) set.add("ps5");
  if (center.ps4) set.add("ps4");
  if (center.pc || (typeof center.pcCount === "number" && center.pcCount > 0)) set.add("pc");
  if (center.xbox) set.add("xbox");

  const counts = center.deviceCounts;
  if (counts && typeof counts === "object") {
    if ((counts.PC ?? 0) > 0) set.add("pc");
    if ((counts["PLAYSTATION 5"] ?? 0) > 0) set.add("ps5");
    if ((counts["PLAYSTATION 4"] ?? 0) > 0) set.add("ps4");
    if ((counts.PLAYSTATION ?? 0) > 0) set.add("playstation");
    if ((counts.XBOX ?? 0) > 0) set.add("xbox");
    if ((counts.SWITCH ?? 0) > 0) set.add("switch");
    if ((counts.VR ?? 0) > 0) set.add("vr");
  }

  return Array.from(set);
}

/**
 * Mapping helper: Maps an OpenAPI PublicGamingCenter schema item to GamecenterListItem
 * - آدرس: addressLine آدرس اصلی (در نبود آدرس، description)
 * - قیمت: hourlyRate
 * - امتیاز و تعداد نظر: raiting و comment_count
 * - دسته‌ها: ps4 / ps5 / pc / xbox
 */
/**
 * Resolves the cover image for a gaming center:
 * Priority:
 * 1. center.coverImageUrl
 * 2. center.coverImages[0]
 * 3. center.banner
 * 4. Fallback default image
 */
export function resolveCenterCoverImage(center: PublicGamingCenter): string {
  const candidate =
    center.coverImageUrl ||
    (Array.isArray(center.coverImages) && center.coverImages.length > 0 ? center.coverImages[0] : null) ||
    center.banner;

  if (candidate && typeof candidate === "string" && candidate.trim()) {
    const normalized = normalizeMediaUrl(candidate.trim());
    if (normalized) return normalized;
  }

  return DEFAULT_CENTER_IMAGE;
}

/**
 * Mapping helper: Maps an OpenAPI PublicGamingCenter schema item to GamecenterListItem
 * - آدرس: addressLine آدرس اصلی (در نبود آدرس، description)
 * - کاور: coverImageUrl یا coverImages یا banner
 * - قیمت و تخفیف: pricing یا hourlyRate و hasDiscount
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

  // Resolution of cover image
  const resolvedImageUrl = resolveCenterCoverImage(center);

  // Resolution of pricing and discounts
  const pricing = center.pricing;
  const hasDiscountFlag = Boolean(
    center.hasDiscount ||
    center.has_discount ||
    (pricing && pricing.hasDiscount) ||
    (pricing && ((pricing.discountPercentage ?? 0) > 0 || (pricing.discountAmount ?? 0) > 0))
  );

  let hourlyPrice = toNumber(center.hourlyRate);
  let discountedHourlyPrice: number | undefined = undefined;
  let discountPercent: number | undefined = undefined;
  let discountAmount: number | undefined = undefined;
  let discountObj: GamecenterListItem["discount"] = undefined;

  if (pricing) {
    if (typeof pricing.originalPrice === "number" && pricing.originalPrice > 0) {
      hourlyPrice = pricing.originalPrice;
    }

    if (hasDiscountFlag) {
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
  } else if (hasDiscountFlag) {
    // If hasDiscount is true without pricing object
    discountObj = overrides?.discount;
    discountedHourlyPrice = overrides?.discountedHourlyPrice;
    discountPercent = overrides?.discountPercent;
    discountAmount = overrides?.discountAmount;
  }

  const coverImagesList = Array.isArray(center.coverImages)
    ? center.coverImages
        .map((img) => (typeof img === "string" ? normalizeMediaUrl(img) : ""))
        .filter(Boolean)
    : undefined;

  return {
    id,
    slug: center.slug || overrides?.slug || undefined,
    name,
    imageUrl: overrides?.imageUrl || (resolvedImageUrl !== DEFAULT_CENTER_IMAGE ? resolvedImageUrl : DEFAULT_CENTER_IMAGE),
    location: overrides?.location !== undefined ? overrides.location : location,
    city: overrides?.city || city,
    rating: overrides?.rating ?? toNumber(center.raiting),
    reviewsCount: overrides?.reviewsCount ?? toNumber(center.comment_count),
    hourlyPrice: overrides?.hourlyPrice ?? hourlyPrice,
    discountedHourlyPrice: overrides?.discountedHourlyPrice !== undefined ? overrides.discountedHourlyPrice : discountedHourlyPrice,
    discountPercent: overrides?.discountPercent !== undefined ? overrides.discountPercent : discountPercent,
    discountAmount: overrides?.discountAmount !== undefined ? overrides.discountAmount : discountAmount,
    discount: overrides?.discount !== undefined ? overrides.discount : discountObj,
    categories: overrides?.categories || deriveCategories(center),
    deviceCounts: overrides?.deviceCounts ?? center.deviceCounts ?? undefined,
    rawFlags: overrides?.rawFlags ?? {
      pc: center.pc,
      ps4: center.ps4,
      ps5: center.ps5,
      xbox: center.xbox,
    },
    isNew: overrides?.isNew,
    isPopular: overrides?.isPopular,
    isDiscounted: overrides?.isDiscounted !== undefined ? overrides.isDiscounted : hasDiscountFlag,
    isOpen: overrides?.isOpen ?? (typeof center.is_open === "boolean" ? center.is_open : undefined),
    pcCount: overrides?.pcCount ?? (typeof center.pcCount === "number" ? center.pcCount : undefined),
    consoleCount:
      overrides?.consoleCount ??
      (typeof center.consoleCount === "number" ? center.consoleCount : undefined),
    coverImages: overrides?.coverImages ?? coverImagesList,
    createdAt,
  };
}

export function normalizeFilterText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStationTypeValue(value?: string | null): string | undefined {
  const upper = value?.trim().toUpperCase();
  if (!upper) return undefined;
  return KNOWN_STATION_TYPES.has(upper) ? upper : upper;
}

function matchesDeviceNameHeuristic(candidateName: string, targetName: string): boolean {
  const normCandidate = normalizeFilterText(candidateName);
  const normTarget = normalizeFilterText(targetName);
  if (!normCandidate || !normTarget) return false;
  if (normCandidate === normTarget) return true;
  if (normCandidate.includes(normTarget) || normTarget.includes(normCandidate)) return true;

  // Distinguish PS5 vs PS4 explicitly
  const isTargetPs5 = normTarget.includes("5") || normTarget.includes("ps5");
  const isTargetPs4 = normTarget.includes("4") || normTarget.includes("ps4");
  if (isTargetPs5) return normCandidate.includes("5") || normCandidate.includes("ps5");
  if (isTargetPs4) return normCandidate.includes("4") || normCandidate.includes("ps4");

  return false;
}

function hasStationTypeInCenter(item: GamecenterListItem, stationType: string): boolean | undefined {
  const st = stationType.toUpperCase();
  const counts = item.deviceCounts;
  if (counts && typeof counts === "object" && typeof counts[st] === "number") {
    return (counts[st] ?? 0) > 0;
  }

  if (st === "PC") {
    if (typeof item.rawFlags?.pc === "boolean") return item.rawFlags.pc;
    if (typeof item.pcCount === "number") return item.pcCount > 0;
  }
  if (st === "XBOX" && typeof item.rawFlags?.xbox === "boolean") {
    return item.rawFlags.xbox;
  }
  if (st === "PLAYSTATION") {
    if (item.rawFlags?.ps4 === true || item.rawFlags?.ps5 === true) return true;
    if (item.rawFlags?.ps4 === false && item.rawFlags?.ps5 === false) return false;
  }
  return undefined;
}

function matchesCenterFlagsHeuristic(
  item: GamecenterListItem,
  targetDevice: DeviceCatalogItem
): boolean {
  const normName = normalizeFilterText(targetDevice.name);
  const st = normalizeStationTypeValue(String(targetDevice.deviceType));

  if (normName.includes("5") || normName.includes("ps5")) {
    if (typeof item.rawFlags?.ps5 === "boolean") return item.rawFlags.ps5;
    if (item.categories.map((c) => c.toLowerCase()).includes("ps5")) return true;
  }
  if (normName.includes("4") || normName.includes("ps4")) {
    if (typeof item.rawFlags?.ps4 === "boolean") return item.rawFlags.ps4;
    if (item.categories.map((c) => c.toLowerCase()).includes("ps4")) return true;
  }

  if (st) {
    const byType = hasStationTypeInCenter(item, st);
    if (byType !== undefined) return byType;
    const cats = item.categories.map((c) => c.toLowerCase());
    if (cats.includes(st.toLowerCase())) return true;
  }

  return true;
}

function matchesCenterDeviceCategories(
  centerCategories: CenterDeviceCategory[],
  targetDevice: DeviceCatalogItem
): boolean {
  const targetId = targetDevice.id.trim();
  const targetType = normalizeStationTypeValue(String(targetDevice.deviceType));

  for (const cat of centerCategories) {
    if (!cat || typeof cat.deviceCount !== "number" || cat.deviceCount <= 0) {
      continue;
    }
    if (cat.catalogId && cat.catalogId === targetId) {
      return true;
    }
    // Legacy stations with catalogId: null — match by stationType and device name
    if (!cat.catalogId) {
      const catType = normalizeStationTypeValue(cat.deviceType);
      if (catType && targetType && catType === targetType) {
        if (matchesDeviceNameHeuristic(cat.name, targetDevice.name)) {
          return true;
        }
      }
    }
  }

  return false;
}

export function isKnownStaticCategory(categoryParam?: string | null): boolean {
  if (!categoryParam) return true;
  const lower = categoryParam.trim().toLowerCase();
  return (
    lower === "" ||
    lower === "all" ||
    lower === "discounted" ||
    lower in LEGACY_CATEGORY_META ||
    KNOWN_STATION_TYPES.has(lower.toUpperCase())
  );
}

export function resolveCategoryFilter(
  categoryParam: string | undefined,
  catalogDevices: DeviceCatalogItem[] = [],
  stationTypeParam?: string
): ResolvedCategoryFilter {
  const cleanCategory = categoryParam?.trim() || "all";
  const lower = cleanCategory.toLowerCase();

  if (lower === "all" || cleanCategory === "") {
    const cleanStationType = normalizeStationTypeValue(stationTypeParam);
    if (cleanStationType && KNOWN_STATION_TYPES.has(cleanStationType)) {
      return {
        kind: "station_type",
        categoryParam: cleanCategory,
        stationType: cleanStationType,
        requiresExactDeviceCheck: false,
      };
    }
    return {
      kind: "all",
      categoryParam: "all",
      requiresExactDeviceCheck: false,
    };
  }

  if (lower === "discounted") {
    return {
      kind: "discounted",
      categoryParam: "discounted",
      requiresExactDeviceCheck: false,
    };
  }

  // 1. Exact catalog device ID match
  const matchedById = catalogDevices.find((d) => d.id === cleanCategory);
  if (matchedById) {
    const st = normalizeStationTypeValue(String(matchedById.deviceType));
    const siblings = st
      ? catalogDevices.filter(
          (d) => normalizeStationTypeValue(String(d.deviceType)) === st
        )
      : [];
    return {
      kind: "catalog_device",
      categoryParam: cleanCategory,
      catalogDevice: matchedById,
      stationType: st,
      requiresExactDeviceCheck: siblings.length > 1,
    };
  }

  // 2. Legacy category slug (ps5, ps4, pc, xbox, vr, billiards, steering)
  const legacyMeta = LEGACY_CATEGORY_META[lower];
  if (legacyMeta) {
    const matchedCatalog = catalogDevices.find((d) => {
      const normName = normalizeFilterText(d.name);
      return legacyMeta.aliases.some((alias) =>
        normName.includes(normalizeFilterText(alias))
      );
    });
    if (matchedCatalog) {
      const st = normalizeStationTypeValue(String(matchedCatalog.deviceType));
      const siblings = st
        ? catalogDevices.filter(
            (d) => normalizeStationTypeValue(String(d.deviceType)) === st
          )
        : [];
      return {
        kind: "catalog_device",
        categoryParam: cleanCategory,
        catalogDevice: matchedCatalog,
        stationType: st,
        requiresExactDeviceCheck: siblings.length > 1,
        legacyKey: lower,
      };
    }
    return {
      kind: "legacy",
      categoryParam: cleanCategory,
      stationType: legacyMeta.stationType,
      requiresExactDeviceCheck: false,
      legacyKey: lower,
    };
  }

  // 3. Direct stationType enum value (e.g. PLAYSTATION, PC, VR, XBOX, SWITCH)
  const upper = cleanCategory.toUpperCase();
  if (KNOWN_STATION_TYPES.has(upper)) {
    return {
      kind: "station_type",
      categoryParam: cleanCategory,
      stationType: upper,
      requiresExactDeviceCheck: false,
    };
  }

  // 4. Unknown category ID (e.g. before catalog finishes loading or deactivated device)
  const fallbackStationType = normalizeStationTypeValue(stationTypeParam);
  return {
    kind: "legacy",
    categoryParam: cleanCategory,
    stationType: fallbackStationType,
    requiresExactDeviceCheck: false,
    legacyKey: lower,
  };
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
   * Fetches real gaming centers from GET /gamingCenters (optionally filtered by city query) and maps to list items.
   * No static mock fallback is used at runtime.
   */
  async loadAllCenters(
    paramsOrSignal?: AbortSignal | ListGamingCentersParams
  ): Promise<GamecenterListItem[]> {
    const centers = await gamingCenterService.listGamingCenters(paramsOrSignal);
    return centers
      .filter((c) => c.isActive !== false)
      .map((c) => mapPublicGamingCenterToListItem(c));
  },

  /**
   * Loads gaming centers from GET /gamingCenters with bounded pagination and server-side filters.
   * Caps per-request page size and max pages so the backend is never overloaded.
   */
  async loadCentersBounded(params: {
    city?: string;
    stationType?: string;
    sort?: GamecenterFilterParams["sort"];
    limit?: number;
    maxPages?: number;
    signal?: AbortSignal;
  }): Promise<GamecenterListItem[]> {
    const pageLimit = Math.min(
      Math.max(Math.floor(params.limit ?? CENTERS_PAGE_LIMIT), 1),
      50
    );
    const maxPages = Math.min(
      Math.max(Math.floor(params.maxPages ?? MAX_CENTER_PAGES), 1),
      MAX_CENTER_PAGES
    );

    let sortBy: ListGamingCentersParams["sortBy"];
    let sortOrder: ListGamingCentersParams["sortOrder"];
    if (params.sort === "newest") {
      sortBy = "createdAt";
      sortOrder = "desc";
    } else if (params.sort === "price_asc") {
      sortBy = "hourlyRate";
      sortOrder = "asc";
    } else if (params.sort === "price_desc") {
      sortBy = "hourlyRate";
      sortOrder = "desc";
    }

    const collected: PublicGamingCenter[] = [];
    const seenIds = new Set<string>();

    for (let page = 1; page <= maxPages; page += 1) {
      if (params.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const { items, meta } = await gamingCenterService.listGamingCentersPaginated({
        city: params.city,
        stationType: params.stationType,
        sortBy,
        sortOrder,
        page,
        limit: pageLimit,
        signal: params.signal,
      });

      for (const center of items) {
        if (!center || center.isActive === false) continue;
        const key = center.id || center.slug;
        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          collected.push(center);
        }
      }

      const totalPages = meta?.pagination?.totalPages;
      if (typeof totalPages === "number" && page >= totalPages) {
        break;
      }
      if (items.length < pageLimit) {
        break;
      }
    }

    return collected.map((c) => mapPublicGamingCenterToListItem(c));
  },

  /**
   * Verifies loaded centers against a resolved device/category filter.
   * Only fetches per-center device-categories when a stationType is shared by multiple
   * catalog devices (e.g. PS5 vs PS4), strictly bounded by concurrency and batch caps.
   */
  async verifyCentersForResolvedCategory(
    centers: GamecenterListItem[],
    resolved: ResolvedCategoryFilter,
    signal?: AbortSignal
  ): Promise<GamecenterListItem[]> {
    if (resolved.kind === "all") {
      return centers;
    }
    if (resolved.kind === "discounted") {
      return this.getDiscountedCenters(centers);
    }

    // Pass 1: fast in-memory stationType pre-filter
    const candidates = resolved.stationType
      ? centers.filter((item) => hasStationTypeInCenter(item, resolved.stationType!) !== false)
      : centers;

    if (!resolved.requiresExactDeviceCheck || !resolved.catalogDevice) {
      if (resolved.kind === "legacy" && resolved.legacyKey) {
        const legacyKey = resolved.legacyKey;
        return candidates.filter((item) => {
          const cats = item.categories.map((c) => c.toLowerCase());
          if (cats.includes(legacyKey)) return true;
          if (resolved.stationType && hasStationTypeInCenter(item, resolved.stationType) === true) {
            return true;
          }
          return false;
        });
      }
      return candidates;
    }

    // Pass 2: bounded exact catalogId verification (concurrency=4, max=24)
    const targetDevice = resolved.catalogDevice;
    const toVerify = candidates.slice(0, MAX_DEVICE_VERIFY_CENTERS);
    const overflow = candidates.slice(MAX_DEVICE_VERIFY_CENTERS);

    const verifiedFlags = await mapWithConcurrency(
      toVerify,
      DEVICE_VERIFY_CONCURRENCY,
      async (center) => {
        try {
          const centerCategories = await deviceCategoryApi.getDeviceCategories(
            center.id,
            signal
          );
          return matchesCenterDeviceCategories(centerCategories, targetDevice);
        } catch (err) {
          if (isAbortError(err)) {
            throw err;
          }
          return matchesCenterFlagsHeuristic(center, targetDevice);
        }
      },
      signal
    );

    const verified = toVerify.filter((_, idx) => verifiedFlags[idx]);
    const overflowMatched = overflow.filter((center) =>
      matchesCenterFlagsHeuristic(center, targetDevice)
    );

    return [...verified, ...overflowMatched];
  },

  /**
   * End-to-end bounded loader + verifier for `/gamecenters` discovery page.
   */
  async loadFilteredCenters(params: {
    city?: string;
    category?: string;
    stationType?: string;
    sort?: GamecenterFilterParams["sort"];
    catalogDevices?: DeviceCatalogItem[];
    signal?: AbortSignal;
  }): Promise<{ centers: GamecenterListItem[]; resolved: ResolvedCategoryFilter }> {
    const resolved = resolveCategoryFilter(
      params.category,
      params.catalogDevices ?? [],
      params.stationType
    );

    const centers = await this.loadCentersBounded({
      city: params.city,
      stationType: resolved.stationType,
      sort: params.sort,
      signal: params.signal,
    });

    const verified = await this.verifyCentersForResolvedCategory(
      centers,
      resolved,
      params.signal
    );

    return { centers: verified, resolved };
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

      // Category filter (ps4 / ps5 / pc / xbox / vr / switch / catalog device ...)
      if (category && category !== "all") {
        const lowerCat = category.toLowerCase();
        const cats = item.categories.map((c) => c.toLowerCase());
        const legacy = LEGACY_CATEGORY_META[lowerCat];
        const byCategory = cats.includes(lowerCat);
        const byStationType =
          legacy?.stationType &&
          hasStationTypeInCenter(item, legacy.stationType) === true;
        if (!byCategory && !byStationType) {
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