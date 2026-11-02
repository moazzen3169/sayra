import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { gamingCenterService } from "./gamingCenterService";
import {
  gamecentersPageService,
  mapPublicGamingCenterToListItem,
  GamecenterListItem,
} from "./gamecentersPageService";
import { PublicGamingCenter } from "@/types/customerApi";

describe("Phase 4: Gaming Center Listing and Discovery Services", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("mapPublicGamingCenterToListItem", () => {
    it("maps documented fields without fabricating missing ratings, prices, or locations", () => {
      const apiCenter: PublicGamingCenter = {
        id: "gc-100",
        name: "مرکز تست سایرا",
        slug: "sayra-test-center",
        isActive: true,
        description: "توضیحات تست",
        createdAt: "2024-05-01T12:00:00Z",
      };

      const mapped = mapPublicGamingCenterToListItem(apiCenter);

      expect(mapped.id).toBe("gc-100");
      expect(mapped.name).toBe("مرکز تست سایرا");
      expect(mapped.slug).toBe("sayra-test-center");
      expect(mapped.createdAt).toBe("2024-05-01T12:00:00Z");

      // Verify no fabricated numbers or fake strings exist
      expect(mapped.rating).toBeUndefined();
      expect(mapped.reviewsCount).toBeUndefined();
      expect(mapped.hourlyPrice).toBeUndefined();
      expect(mapped.location).toBeUndefined();
      expect(mapped.city).toBeUndefined();
      expect(mapped.isDiscounted).toBe(false);
      expect(mapped.discount).toBeUndefined();
    });
  });

  describe("gamingCenterService.listGamingCenters", () => {
    it("parses OpenAPI Pagination envelope correctly with metadata", async () => {
      const mockEnvelope = {
        success: true,
        data: [
          {
            id: "gc-1",
            name: "گیمنت گرگدن",
            slug: "gargadan",
            isActive: true,
            description: "گیمنت حرفه‌ای",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
        },
      };

      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(mockEnvelope), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      const res = await gamingCenterService.listGamingCenters({ page: 1, pageSize: 10 });

      expect(res.data.length).toBe(1);
      expect(res.data[0].name).toBe("گیمنت گرگدن");
      expect(res.meta?.total).toBe(1);
      expect(res.meta?.page).toBe(1);
      expect(res.meta?.pageSize).toBe(10);
    });

    it("parses raw array response gracefully", async () => {
      const rawList = [
        {
          id: "gc-2",
          name: "گیم کلاب دوم",
          slug: "second-club",
          isActive: true,
          createdAt: "2024-02-01T00:00:00Z",
        },
      ];

      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(rawList), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      const res = await gamingCenterService.listGamingCenters();
      expect(res.data.length).toBe(1);
      expect(res.data[0].name).toBe("گیم کلاب دوم");
    });

    it("handles empty list without error", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      const res = await gamingCenterService.listGamingCenters();
      expect(res.data).toEqual([]);
    });

    it("propagates 500 server error properly", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({ success: false, message: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }) as any;

      expect(gamingCenterService.listGamingCenters()).rejects.toThrow();
    });

    it("propagates 401 unauthorized error", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({ success: false, message: "Unauthorized" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }) as any;

      expect(gamingCenterService.listGamingCenters()).rejects.toThrow();
    });

    it("handles malformed JSON response safely", async () => {
      globalThis.fetch = mock(async () => {
        return new Response("Not JSON!", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }) as any;

      expect(gamingCenterService.listGamingCenters()).rejects.toThrow();
    });
  });

  describe("gamecentersPageService.filterCenters and sorting", () => {
    const sampleItems: GamecenterListItem[] = [
      {
        id: "1",
        name: "آلفا گیمنت",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        name: "بتا کلاب",
        createdAt: "2024-05-01T00:00:00Z",
      },
      {
        id: "3",
        name: "گاما سنتر",
        createdAt: "2024-03-01T00:00:00Z",
      },
    ];

    it("filters centers by text search query on name", () => {
      const results = gamecentersPageService.filterCenters(sampleItems, {
        q: "بتا",
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("2");
    });

    it("sorts by newest based on createdAt", () => {
      const results = gamecentersPageService.filterCenters(sampleItems, {
        sort: "newest",
      });
      expect(results[0].id).toBe("2"); // 2024-05-01
      expect(results[1].id).toBe("3"); // 2024-03-01
      expect(results[2].id).toBe("1"); // 2024-01-01
    });

    it("returns empty array for getDiscountedCenters when no items have active discounts", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "1",
                name: "مرکز عادی",
                slug: "normal",
                isActive: true,
                createdAt: "2024-01-01T00:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const discounted = await gamecentersPageService.getDiscountedCenters();
      expect(discounted.length).toBe(0);
    });
  });
});
