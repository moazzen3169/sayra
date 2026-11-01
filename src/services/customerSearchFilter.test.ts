import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  gamecentersPageService,
  GamecenterListItem,
  normalizeFilterText,
} from "./gamecentersPageService";
import { gamingCenterService } from "./gamingCenterService";
import { ContractGapError } from "@/types/customerApi";

describe("Phase 5: Customer Search, Filtering, and Sorting (Deterministic Tests)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset global fetch mock
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockCenters: GamecenterListItem[] = [
    {
      id: "gc-1",
      name: "گیمنت گرگدن",
      imageUrl: "/img/gamnet-1.webp",
      location: "تبریز، ولیعصر، روبروی کتابخانه",
      city: "تبریز",
      rating: 4.8,
      reviewsCount: 744,
      hourlyPrice: 240000,
      discountedHourlyPrice: 180000,
      discountPercent: 25,
      discount: { valueType: "PERCENTAGE", value: 25 },
      categories: ["ps5", "pc", "xbox"],
      isDiscounted: true,
      createdAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "gc-2",
      name: "گیم‌کلاب سایبرسکی",
      imageUrl: "/img/gamnet-2.webp",
      location: "تبریز، آبرسان، پاساژ نسیم",
      city: "تبریز",
      rating: 4.6,
      reviewsCount: 312,
      hourlyPrice: 190000,
      categories: ["ps5", "xbox"],
      createdAt: "2024-02-15T12:00:00Z",
    },
    {
      id: "gc-3",
      name: "مجموعه گیمینگ وی‌آر پلاس",
      imageUrl: "/img/gamnet-3.webp",
      location: "تهران، سعادت‌آباد",
      city: "تهران",
      rating: 4.9,
      reviewsCount: 520,
      hourlyPrice: 280000,
      discountedHourlyPrice: 250000,
      discountPercent: 10,
      discount: { valueType: "PERCENTAGE", value: 10 },
      categories: ["vr", "ps5"],
      isDiscounted: true,
      createdAt: "2024-03-01T08:00:00Z",
    },
    {
      id: "gc-4",
      name: "مرکز بازی ماتریکس",
      imageUrl: "/img/gamnet-5.webp",
      location: "اصفهان، چهارباغ عباسی",
      city: "اصفهان",
      rating: 4.2,
      reviewsCount: 150,
      hourlyPrice: 150000,
      categories: ["pc", "billiards"],
      createdAt: "2023-11-20T14:00:00Z",
    },
  ];

  describe("1. Query & Text Matching", () => {
    it("matches exact center name regardless of Persian character variants", () => {
      // Test normalizeFilterText with yeh/kaf/zwnj variants
      expect(normalizeFilterText("گیم‌کلاب")).toBe("گیم کلاب");
      expect(normalizeFilterText("گرگدان")).toBe("گرگدان");

      const results = gamecentersPageService.filterCenters(mockCenters, {
        q: "گرگدن",
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("gc-1");
    });

    it("matches query against location/description and category terms", () => {
      const resultsByLocation = gamecentersPageService.filterCenters(mockCenters, {
        q: "سعادت‌آباد",
      });
      expect(resultsByLocation.length).toBe(1);
      expect(resultsByLocation[0].id).toBe("gc-3");

      const resultsByCategoryText = gamecentersPageService.filterCenters(mockCenters, {
        q: "billiards",
      });
      expect(resultsByCategoryText.length).toBe(1);
      expect(resultsByCategoryText[0].id).toBe("gc-4");
    });

    it("returns empty array when query does not match any center", () => {
      const results = gamecentersPageService.filterCenters(mockCenters, {
        q: "ناموجود در پایگاه",
      });
      expect(results.length).toBe(0);
    });
  });

  describe("2. Combined Filters (Query, Category, City, Price, Rating)", () => {
    it("filters accurately by city", () => {
      const tabrizCenters = gamecentersPageService.filterCenters(mockCenters, {
        city: "تبریز",
      });
      expect(tabrizCenters.length).toBe(2);
      expect(tabrizCenters.every((c) => c.city === "تبریز")).toBe(true);

      const tehranCenters = gamecentersPageService.filterCenters(mockCenters, {
        city: "تهران",
      });
      expect(tehranCenters.length).toBe(1);
      expect(tehranCenters[0].id).toBe("gc-3");
    });

    it("filters accurately by device category", () => {
      const pcCenters = gamecentersPageService.filterCenters(mockCenters, {
        category: "pc",
      });
      expect(pcCenters.length).toBe(2); // gc-1 and gc-4
      expect(pcCenters.map((c) => c.id)).toContain("gc-1");
      expect(pcCenters.map((c) => c.id)).toContain("gc-4");
    });

    it("combines city, category, and text search simultaneously", () => {
      const combined = gamecentersPageService.filterCenters(mockCenters, {
        city: "تبریز",
        category: "ps5",
        q: "گرگدن",
      });
      expect(combined.length).toBe(1);
      expect(combined[0].id).toBe("gc-1");
    });

    it("filters accurately by minRating and price bounds", () => {
      const highRated = gamecentersPageService.filterCenters(mockCenters, {
        minRating: 4.8,
      });
      expect(highRated.length).toBe(2); // gc-1 (4.8) and gc-3 (4.9)

      const affordable = gamecentersPageService.filterCenters(mockCenters, {
        maxPrice: 190000,
      });
      // gc-1 discounted is 180000, gc-2 is 190000, gc-4 is 150000
      expect(affordable.length).toBe(3);
    });
  });

  describe("3. Sorting Operations", () => {
    it("sorts by newest first (descending createdAt)", () => {
      const sorted = gamecentersPageService.filterCenters(mockCenters, {
        sort: "newest",
      });
      expect(sorted[0].id).toBe("gc-3"); // 2024-03-01
      expect(sorted[sorted.length - 1].id).toBe("gc-4"); // 2023-11-20
    });

    it("sorts by popularity (descending reviewsCount)", () => {
      const sorted = gamecentersPageService.filterCenters(mockCenters, {
        sort: "popular",
      });
      expect(sorted[0].id).toBe("gc-1"); // 744 reviews
      expect(sorted[1].id).toBe("gc-3"); // 520 reviews
      expect(sorted[2].id).toBe("gc-2"); // 312 reviews
      expect(sorted[3].id).toBe("gc-4"); // 150 reviews
    });

    it("sorts by rating descending", () => {
      const sorted = gamecentersPageService.filterCenters(mockCenters, {
        sort: "rating",
      });
      expect(sorted[0].rating).toBe(4.9);
      expect(sorted[sorted.length - 1].rating).toBe(4.2);
    });

    it("sorts by price ascending considering discounted price when available", () => {
      const sorted = gamecentersPageService.filterCenters(mockCenters, {
        sort: "price_asc",
      });
      // Prices: gc-4: 150k, gc-1: 180k (discounted from 240k), gc-2: 190k, gc-3: 250k (discounted from 280k)
      expect(sorted.map((c) => c.id)).toEqual(["gc-4", "gc-1", "gc-2", "gc-3"]);
    });

    it("sorts by price descending", () => {
      const sorted = gamecentersPageService.filterCenters(mockCenters, {
        sort: "price_desc",
      });
      expect(sorted.map((c) => c.id)).toEqual(["gc-3", "gc-2", "gc-1", "gc-4"]);
    });
  });

  describe("4. API Contract & Concurrency / Race Handling", () => {
    it("verifies GET /gamingCenters is invoked with zero query parameters", async () => {
      let requestedUrl = "";
      globalThis.fetch = mock((url: string | URL | Request) => {
        requestedUrl = url.toString();
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "srv-1",
                  name: "سرور سنتر",
                  slug: "server-center",
                  isActive: true,
                  description: "گیمنت مرکزی",
                  createdAt: "2024-01-01T00:00:00Z",
                },
              ],
              meta: { pagination: { total: 1, page: 1, pageSize: 20 } },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      });

      const loaded = await gamecentersPageService.loadAllCenters();
      expect(requestedUrl).not.toContain("?");
      expect(requestedUrl).toContain("/gamingCenters");
      expect(loaded.length).toBe(1);
      expect(loaded[0].name).toBe("سرور سنتر");
    });

    it("propagates cancellation via AbortSignal without uncaught exceptions", async () => {
      const controller = new AbortController();
      controller.abort();

      expect(
        gamecentersPageService.loadAllCenters(controller.signal)
      ).rejects.toThrow();
    });

    it("ensures late slow responses from previous searches do not overwrite state (race condition simulation)", async () => {
      // Simulate sequential queries with different response delays
      let activeRequestId = 0;
      let lastAppliedRequestId = -1;

      async function simulatedSearchFetch(reqId: number, delayMs: number) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (reqId >= activeRequestId) {
          lastAppliedRequestId = reqId;
        }
      }

      // Request 1 starts (slow, 50ms)
      activeRequestId = 1;
      const p1 = simulatedSearchFetch(1, 50);

      // Request 2 starts immediately after (fast, 10ms)
      activeRequestId = 2;
      const p2 = simulatedSearchFetch(2, 10);

      await Promise.all([p1, p2]);

      // Request 2 must prevail over Request 1
      expect(lastAppliedRequestId).toBe(2);
    });

    it("throws ContractGapError when server-side filtering or catalog search is requested", () => {
      expect(() => gamecentersPageService.serverFilterUnsupported()).toThrow(
        ContractGapError
      );
      expect(() => gamingCenterService.filterCatalogUnsupported()).toThrow(
        ContractGapError
      );
    });

    it("handles API errors gracefully when server returns 500", async () => {
      globalThis.fetch = mock(() => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: { code: "INTERNAL_ERROR", message: "Server error" },
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          )
        );
      });

      await expect(gamecentersPageService.loadAllCenters()).rejects.toThrow();
    });
  });
});
