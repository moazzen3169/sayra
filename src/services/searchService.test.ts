import { describe, it, expect, afterEach } from "bun:test";
import {
  searchService,
  canonicalizeDeviceType,
  resolveDeviceFilterForSearch,
  mapSearchGameCenterToListItem,
  mapUiSortToSearchSort,
} from "./searchService";
import type { DeviceCatalogItem } from "@/types/catalog";
import type { SearchGameCenterItemDto } from "@/types/search";

const SAMPLE_CATALOG: DeviceCatalogItem[] = [
  { id: "dev-pc", name: "کامپیوتر گیمینگ", deviceType: "PC", isActive: true },
  { id: "dev-ps5", name: "پلی‌استیشن ۵", deviceType: "PLAYSTATION 5", isActive: true },
  { id: "dev-ps4", name: "پلی‌استیشن ۴", deviceType: "PLAYSTATION 4", isActive: true },
  { id: "dev-ps5-legacy", name: "پلی استیشن ۵ پرو", deviceType: "PLAYSTATION", isActive: true },
  { id: "dev-xbox", name: "ایکس‌باکس سری ایکس", deviceType: "XBOX", isActive: true },
  { id: "dev-vr", name: "واقعیت مجازی", deviceType: "VR", isActive: true },
];

describe("searchService (Professional Search API)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    searchService.clearCaches();
  });

  it("canonicalizes all device types and Persian/English aliases accurately", () => {
    expect(canonicalizeDeviceType("ps5")).toBe("PLAYSTATION 5");
    expect(canonicalizeDeviceType("PLAYSTATION 5")).toBe("PLAYSTATION 5");
    expect(canonicalizeDeviceType("پلی‌استیشن ۵")).toBe("PLAYSTATION 5");
    expect(canonicalizeDeviceType("ps4")).toBe("PLAYSTATION 4");
    expect(canonicalizeDeviceType("پلی استیشن ۴")).toBe("PLAYSTATION 4");
    expect(canonicalizeDeviceType("pc")).toBe("PC");
    expect(canonicalizeDeviceType("ایکس باکس")).toBe("XBOX");
    expect(canonicalizeDeviceType("واقعیت مجازی")).toBe("VR");
    expect(canonicalizeDeviceType("بیلیارد")).toBe("SWITCH");
  });

  it("resolves catalog device IDs, legacy slugs, and explicit deviceType params", () => {
    const byIdPs5 = resolveDeviceFilterForSearch({
      category: "dev-ps5",
      catalogDevices: SAMPLE_CATALOG,
    });
    expect(byIdPs5.deviceType).toBe("PLAYSTATION 5");
    expect(byIdPs5.matchedCatalogDevice?.id).toBe("dev-ps5");

    const byLegacyPlaystationName = resolveDeviceFilterForSearch({
      category: "dev-ps5-legacy",
      catalogDevices: SAMPLE_CATALOG,
    });
    expect(byLegacyPlaystationName.deviceType).toBe("PLAYSTATION 5");

    const byExplicitDeviceType = resolveDeviceFilterForSearch({
      deviceType: "PS4",
      catalogDevices: SAMPLE_CATALOG,
    });
    expect(byExplicitDeviceType.deviceType).toBe("PLAYSTATION 4");

    const discounted = resolveDeviceFilterForSearch({
      category: "discounted",
      catalogDevices: SAMPLE_CATALOG,
    });
    expect(discounted.isDiscounted).toBe(true);
    expect(discounted.deviceType).toBeUndefined();
  });

  it("maps UI sort keys to OpenAPI SearchSortOption", () => {
    expect(mapUiSortToSearchSort("default", true)).toBe("relevance");
    expect(mapUiSortToSearchSort("default", false)).toBe("bayesian");
    expect(mapUiSortToSearchSort("popular", false)).toBe("reviews");
    expect(mapUiSortToSearchSort("price_asc", false)).toBe("price_asc");
  });

  it("calls GET /public/search/suggest with q, city, and limit and returns grouped suggestions", async () => {
    let capturedUrl = "";
    globalThis.fetch = ((url: string | URL | Request) => {
      capturedUrl = url.toString();
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              query: "فیفا",
              games: [
                {
                  id: "g-1",
                  slug: "fc-26",
                  title: "FC 26",
                  titleFa: "فیفا ۲۶",
                  titleEn: "FC 26",
                  category: "SPORTS",
                  coverImageUrl: null,
                  supportedPlatforms: ["PLAYSTATION 5", "PC"],
                  centerCount: 8,
                  matchType: "prefix",
                  score: 0.95,
                },
              ],
              gameCenters: [
                {
                  id: "gc-1",
                  name: "گیم‌نت سایرا",
                  slug: "sayra-club",
                  city: "تبریز",
                  neighborhood: "ولیعصر",
                  coverUrl: null,
                  ratingAverage: 4.8,
                  isOpenNow: true,
                  detailUrl: "/gamecenter/sayra-club",
                  matchType: "substring",
                  score: 0.7,
                },
              ],
              locations: {
                cities: [{ name: "تبریز", count: 12 }],
                neighborhoods: [{ name: "ولیعصر", city: "تبریز", count: 5 }],
              },
              devices: [{ type: "PLAYSTATION 5", label: "پلی‌استیشن ۵" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch;

    const result = await searchService.suggest({ q: "فیفا", city: "تبریز", limit: 6 });

    expect(capturedUrl).toContain("/public/search/suggest");
    expect(capturedUrl).toContain("limit=6");
    expect(result.games).toHaveLength(1);
    expect(result.gameCenters).toHaveLength(1);
    expect(result.locations.cities).toHaveLength(1);
    expect(result.locations.neighborhoods).toHaveLength(1);
    expect(result.devices).toHaveLength(1);
  });

  it("calls GET /public/search/gamecenters with deviceType, gameId, neighborhood, and facets", async () => {
    let capturedUrl = "";
    const sampleItem: SearchGameCenterItemDto = {
      id: "center-1",
      name: "گیم‌نت آلفا",
      slug: "alpha-club",
      description: "توضیحات",
      city: "تبریز",
      province: "آذربایجان شرقی",
      neighborhood: "ولیعصر",
      address: "خیابان شریعتی، پلاک ۱۰",
      coordinates: { lat: 38.07, lng: 46.34 },
      images: {
        coverUrl: "/uploads/alpha.jpg",
        gallery: [],
      },
      devices: [
        { type: "PLAYSTATION 5", count: 6, minHourlyPrice: 150000, hasVip: true },
      ],
      deviceCounts: {
        PC: 0,
        "PLAYSTATION 4": 0,
        "PLAYSTATION 5": 6,
        XBOX: 0,
        SWITCH: 0,
        VR: 0,
      },
      pcCount: 0,
      consoleCount: 6,
      amenities: ["vip", "online_booking"],
      games: ["FC 26"],
      pricing: {
        startingHourlyRate: 150000,
        originalPrice: 180000,
        finalPrice: 150000,
        hasDiscount: true,
        discountPercentage: 17,
        discountAmount: 30000,
        currency: "IRT",
      },
      activityStatus: {
        isActive: true,
        isOpenNow: true,
        openingTime: "10:00",
        closingTime: "23:30",
        timezone: "Asia/Tehran",
        isTemporarilyClosed: false,
        closedUntil: null,
      },
      rating: {
        average: 4.9,
        validReviewsCount: 42,
        latestReviewAt: "2026-11-20T10:00:00Z",
      },
      ranking: null,
      detailUrl: "/gamecenter/alpha-club",
      absoluteDetailUrl: "https://sayragame.ir/gamecenter/alpha-club",
      updatedAt: "2026-11-24T10:00:00Z",
      matchedGames: [
        {
          id: "g-1",
          slug: "fc-26",
          title: "FC 26",
          titleFa: "فیفا ۲۶",
          titleEn: "FC 26",
          category: "SPORTS",
          coverImageUrl: null,
        },
      ],
    };

    globalThis.fetch = ((url: string | URL | Request) => {
      capturedUrl = url.toString();
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [sampleItem],
              meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
              appliedFilters: { deviceType: "PLAYSTATION 5" },
              resolvedGames: [],
              facets: {
                cities: [],
                deviceTypes: [{ key: "PLAYSTATION 5", label: "PS5", count: 1 }],
                amenities: [],
                games: [],
                priceRange: { min: 150000, max: 150000, currency: "IRT" },
                openNowCount: 1,
              },
              suggestions: [],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch;

    const payload = await searchService.searchGameCenters({
      city: "تبریز",
      neighborhood: "ولیعصر",
      deviceType: "PLAYSTATION 5",
      gameId: "g-1",
      isOpen: true,
      includeFacets: true,
      page: 1,
      limit: 12,
    });

    expect(capturedUrl).toContain("/public/search/gamecenters");
    expect(capturedUrl).toContain("deviceType=PLAYSTATION+5");
    expect(capturedUrl).toContain("gameId=g-1");
    expect(capturedUrl).toContain("isOpen=true");
    expect(payload.data).toHaveLength(1);

    const mapped = mapSearchGameCenterToListItem(payload.data[0]);
    expect(mapped.id).toBe("alpha-club");
    expect(mapped.rating).toBe(4.9);
    expect(mapped.reviewsCount).toBe(42);
    expect(mapped.hourlyPrice).toBe(180000);
    expect(mapped.discountedHourlyPrice).toBe(150000);
    expect(mapped.isOpen).toBe(true);
    expect(mapped.categories).toContain("ps5");
    expect(mapped.matchedGames?.[0].titleFa).toBe("فیفا ۲۶");
  });
});
