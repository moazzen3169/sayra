import { describe, it, expect, afterEach } from "bun:test";
import { gamingCenterService } from "./gamingCenterService";
import {
  gamecentersPageService,
  mapPublicGamingCenterToListItem,
} from "./gamecentersPageService";
import { ApiError } from "@/lib/api/client";
import { ContractGapError, PublicGamingCenter } from "@/types/customerApi";

/**
 * Phase 4: Gaming Center Listing and Discovery Data Unit & Integration Tests
 * Network operations in this test suite are MOCKED.
 * [MOCKED-NETWORK TESTS - No real backend is called]
 */
describe("Phase 4: Gaming Center Listing & Discovery (Mocked Network)", () => {
  const originalFetch = globalThis.fetch;
  let requests: Request[] = [];

  function setupMockFetch(
    handler: (url: string, init?: RequestInit) => Response | Promise<Response>
  ) {
    requests = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      requests.push(req);
      const url = req.url;
      return Promise.resolve(handler(url, init));
    }) as unknown as typeof fetch;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
    requests = [];
  });

  describe("gamingCenterService.listGamingCenters (GET /gamingCenters)", () => {
    it("fetches list of gaming centers from Pagination envelope { data: [...] }", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/gamingCenters");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "gc-1",
                name: "گیم‌نت گرگدن",
                slug: "gc-gorgodan",
                isActive: true,
                description: "شعبه ولیعصر",
                createdAt: "2026-01-10T12:00:00.000Z",
              },
              {
                id: "gc-2",
                name: "گیم‌کلاب سایبرسکی",
                slug: "gc-cyberski",
                isActive: true,
                description: "شعبه آبرسان",
                createdAt: "2026-02-15T10:00:00.000Z",
              },
            ],
            meta: {
              pagination: {
                total: 2,
                page: 1,
                pageSize: 20,
              },
            },
          }),
          { status: 200 }
        );
      });

      const list = await gamingCenterService.listGamingCenters();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe("gc-1");
      expect(list[0].name).toBe("گیم‌نت گرگدن");
      expect(list[0].slug).toBe("gc-gorgodan");
      expect(list[1].name).toBe("گیم‌کلاب سایبرسکی");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("GET");
    });

    it("handles raw array responses if backend omits pagination envelope", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/gamingCenters");
        return new Response(
          JSON.stringify([
            {
              id: "gc-raw-1",
              name: "مرکز بازی آریا",
              slug: "aria",
              isActive: true,
            },
          ]),
          { status: 200 }
        );
      });

      const list = await gamingCenterService.listGamingCenters();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe("مرکز بازی آریا");
      expect(list[0].slug).toBe("aria");
    });

    it("handles empty lists without falling back to local mocks", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/gamingCenters");
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            meta: {
              pagination: { total: 0, page: 1 },
            },
          }),
          { status: 200 }
        );
      });

      const list = await gamingCenterService.listGamingCenters();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(0);
    });

    it("propagates API errors cleanly on network or server error", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "SERVER_ERROR", message: "Internal server error" },
          }),
          { status: 500 }
        );
      });

      await expect(gamingCenterService.listGamingCenters()).rejects.toThrow(ApiError);
    });

    it("supports listGamingCentersPaginated preserving meta", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/gamingCenters");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "gc-p1", name: "مرکز ۱", slug: "p1" },
            ],
            meta: {
              pagination: {
                total: 25,
                page: 2,
                pageSize: 10,
                totalPages: 3,
              },
            },
          }),
          { status: 200 }
        );
      });

      const result = await gamingCenterService.listGamingCentersPaginated();
      expect(result.items.length).toBe(1);
      expect(result.meta?.pagination?.total).toBe(25);
      expect(result.meta?.pagination?.page).toBe(2);
    });
  });

  describe("mapPublicGamingCenterToListItem (Contract-Bound Card Mapping)", () => {
    it("maps server GamingCenter item to GamecenterListItem props correctly", () => {
      const serverItem: PublicGamingCenter = {
        id: "gc-real-123",
        name: "گیم‌نت پرشین",
        slug: "gc-persian",
        description: "تهران، شهرک غرب",
        createdAt: "2026-03-01T08:00:00.000Z",
      };

      const card = mapPublicGamingCenterToListItem(serverItem);

      expect(card.id).toBe("gc-persian");
      expect(card.name).toBe("گیم‌نت پرشین");
      expect(card.location).toBe("تهران، شهرک غرب");
      expect(card.createdAt).toBe("2026-03-01T08:00:00.000Z");
      // Safe defaults for UI visual elements (not fabricated mock claims)
      expect(card.rating).toBe(0);
      expect(card.reviewsCount).toBe(0);
      expect(card.hourlyPrice).toBe(0);
      expect(card.discount).toBeUndefined();
    });

    it("uses center id if slug is missing", () => {
      const serverItem: PublicGamingCenter = {
        id: "gc-id-only",
        name: "بدون اسلاگ",
        slug: "",
      };

      const card = mapPublicGamingCenterToListItem(serverItem);
      expect(card.id).toBe("gc-id-only");
    });
  });

  describe("gamecentersPageService (Listing & Discovery Service)", () => {
    it("loads real centers and maps to listing items without mock fallback", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "gc-a",
                name: "مرکز آلفا",
                slug: "alpha",
                description: "تبریز، ولیعصر",
                createdAt: "2026-01-01T00:00:00Z",
              },
              {
                id: "gc-b",
                name: "مرکز بتا",
                slug: "beta",
                description: "تبریز، آبرسان",
                createdAt: "2026-02-01T00:00:00Z",
              },
            ],
          }),
          { status: 200 }
        );
      });

      const items = await gamecentersPageService.loadAllCenters();
      expect(items.length).toBe(2);
      expect(items[0].id).toBe("alpha");
      expect(items[0].name).toBe("مرکز آلفا");
      expect(items[1].id).toBe("beta");
    });

    it("filters and sorts real list items accurately in memory", () => {
      const items = [
        mapPublicGamingCenterToListItem(
          { id: "1", name: "گرگدن", slug: "1", description: "تبریز، ولیعصر" },
          { rating: 4.8, hourlyPrice: 200000, categories: ["ps5"] }
        ),
        mapPublicGamingCenterToListItem(
          { id: "2", name: "ماتریکس", slug: "2", description: "تهران، ونک" },
          { rating: 4.2, hourlyPrice: 150000, categories: ["pc"] }
        ),
      ];

      // Query filter
      const filteredByQuery = gamecentersPageService.filterCenters(items, { q: "ماتریکس" });
      expect(filteredByQuery.length).toBe(1);
      expect(filteredByQuery[0].name).toBe("ماتریکس");

      // Sort by price_asc
      const sortedByPrice = gamecentersPageService.filterCenters(items, { sort: "price_asc" });
      expect(sortedByPrice[0].name).toBe("ماتریکس");
      expect(sortedByPrice[1].name).toBe("گرگدن");

      // Sort by rating
      const sortedByRating = gamecentersPageService.filterCenters(items, { sort: "rating" });
      expect(sortedByRating[0].name).toBe("گرگدن");
      expect(sortedByRating[1].name).toBe("ماتریکس");
    });

    it("throws ContractGapError when server-side filtering is invoked", () => {
      expect(() => gamecentersPageService.serverFilterUnsupported()).toThrow(ContractGapError);
      try {
        gamecentersPageService.serverFilterUnsupported();
      } catch (err) {
        expect((err as ContractGapError).code).toBe("CONTRACT_GAP");
        expect((err as ContractGapError).message).toContain("GamingCenterServerFilter");
      }
    });
  });
});
