import { describe, it, expect, afterEach } from "bun:test";
import {
  gamingCenterService,
  loadGamecenterDetail,
  mapMediaToGalleryImages,
  mapRatingsToReviews,
  formatAuthoritativeAddress,
} from "@/services/gamecenterDetailService";
import { ApiError } from "@/lib/api/client";

/**
 * Phase 6: Gaming-Center Detail Data Unit & Service Flow Tests
 * All network operations in this test suite are MOCKED.
 * [MOCKED-NETWORK TESTS - No real backend is called]
 *
 * Staging Verification Record:
 * - Live staging base URL configured at http://87.248.156.152/api/v1
 * - Staging timeout / unreachable state verifies that client handles network failure gracefully without falling back to mock data.
 */
describe("Phase 6: Gaming-Center Detail Data (Mocked Network)", () => {
  const originalFetch = globalThis.fetch;
  let requests: Request[] = [];

  function setupMockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
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

  describe("1. Identity & Route-ID Resolution (resolveGamingCenter)", () => {
    it("resolves center directly when routeId is a valid slug", async () => {
      setupMockFetch((url) => {
        if (url.includes("/public/gamingCenters/gorgodan")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-101",
                name: "گیمنت گرگدن",
                slug: "gorgodan",
                description: "شعبه مرکزی ولیعصر",
                isActive: true,
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ success: false }), { status: 404 });
      });

      const center = await gamingCenterService.resolveGamingCenter("gorgodan");
      expect(center.id).toBe("gc-101");
      expect(center.name).toBe("گیمنت گرگدن");
      expect(center.slug).toBe("gorgodan");
      expect(requests.length).toBe(1);
    });

    it("resolves center by ID through GET /gamingCenters when direct slug lookup returns 404", async () => {
      setupMockFetch((url) => {
        if (url.includes("/public/gamingCenters/gc-uuid-200")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "NOT_FOUND", message: "مرکز یافت نشد" },
            }),
            { status: 404 }
          );
        }
        if (url.includes("/gamingCenters") && !url.includes("/public")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "gc-uuid-200",
                  name: "مرکز اکسپرس",
                  slug: "express-club",
                  isActive: true,
                  description: "شعبه ۲",
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/public/gamingCenters/express-club")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-uuid-200",
                name: "مرکز اکسپرس",
                slug: "express-club",
                description: "شعبه ۲ با امکانات کامل",
                isActive: true,
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ success: false }), { status: 404 });
      });

      const center = await gamingCenterService.resolveGamingCenter("gc-uuid-200");
      expect(center.id).toBe("gc-uuid-200");
      expect(center.slug).toBe("express-club");
      expect(center.name).toBe("مرکز اکسپرس");
    });

    it("propagates 404 Not Found error when center does not exist anywhere", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "NOT_FOUND", message: "مرکز بازی یافت نشد." },
          }),
          { status: 404 }
        );
      });

      await expect(gamingCenterService.resolveGamingCenter("non-existent-center")).rejects.toThrow();
    });

    it("throws clear error when routeId is empty", async () => {
      await expect(gamingCenterService.resolveGamingCenter("")).rejects.toThrow("شناسه گیمنت ارسال نشده است.");
    });
  });

  describe("2. Mapping Helpers (Media, Ratings, Address)", () => {
    it("maps media items to gallery images correctly", () => {
      const mediaList = [
        { id: "m-1", url: "https://example.com/img1.webp", altText: "تصویر ۱" },
        { id: "m-2", url: "https://example.com/img2.webp" },
      ];
      const images = mapMediaToGalleryImages(mediaList);
      expect(images.length).toBe(2);
      expect(images[0]).toEqual({ id: "m-1", url: "https://example.com/img1.webp", alt: "تصویر ۱" });
      expect(images[1].alt).toBe("تصویر 2");
    });

    it("filters out empty or invalid media items", () => {
      const mediaList = [
        { id: "m-1", url: "" },
        // @ts-expect-error test invalid object
        null,
      ];
      const images = mapMediaToGalleryImages(mediaList);
      expect(images.length).toBe(0);
    });

    it("maps ratings to UI reviews", () => {
      const ratings = [
        { id: "r-1", gamingCenterId: "gc-1", rating: 5, comment: "عالی", author: "مهدی", createdAt: "2026-10-01" },
        { id: "r-2", gamingCenterId: "gc-1", rating: 4 },
      ];
      const reviews = mapRatingsToReviews(ratings);
      expect(reviews.length).toBe(2);
      expect(reviews[0].author).toBe("مهدی");
      expect(reviews[0].rating).toBe(5);
      expect(reviews[1].author).toBe("کاربر سایت");
      expect(reviews[1].rating).toBe(4);
    });

    it("formats authoritative address with city prefix when needed", () => {
      const addresses = [
        { id: "a-1", city: "تبریز", address: "خیابان ولیعصر، برج تجارت" },
      ];
      const formatted = formatAuthoritativeAddress(addresses);
      expect(formatted).toBe("تبریز، خیابان ولیعصر، برج تجارت");
    });

    it("does not duplicate city if already in address string", () => {
      const addresses = [
        { id: "a-1", city: "تبریز", address: "تبریز، خیابان آزادی" },
      ];
      const formatted = formatAuthoritativeAddress(addresses);
      expect(formatted).toBe("تبریز، خیابان آزادی");
    });

    it("returns undefined for empty address list", () => {
      expect(formatAuthoritativeAddress([])).toBeUndefined();
    });
  });

  describe("3. Full Detail Integration (loadGamecenterDetail)", () => {
    it("loads complete detail data from documented endpoints without mock fallback", async () => {
      setupMockFetch((url) => {
        if (url.includes("/addresses")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [{ id: "addr-1", city: "تهران", address: "سعادت‌آباد، میدان کاج" }],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/media")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                { id: "med-1", url: "https://example.com/banner.jpg", altText: "نمای ورودی" },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/ratings")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                { id: "rate-1", gamingCenterId: "gc-apex-1", rating: 5, comment: "تجربه بسیار عالی" },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/stations")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                { id: "st-1", gamingCenterId: "gc-apex-1", name: "PS5 VIP #1", stationType: "PLAYSTATION", hourlyPrice: 200000 },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/public/gamingCenters/apex-center")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-apex-1",
                name: "مرکز اپکس",
                slug: "apex-center",
                description: "مرکز بازی و سرگرمی",
                isActive: true,
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const detail = await loadGamecenterDetail("apex-center");
      expect(detail.center.id).toBe("gc-apex-1");
      expect(detail.center.name).toBe("مرکز اپکس");
      expect(detail.address).toBe("تهران، سعادت‌آباد، میدان کاج");
      expect(detail.images.length).toBe(1);
      expect(detail.images[0].url).toBe("https://example.com/banner.jpg");
      expect(detail.reviews.length).toBe(1);
      expect(detail.reviews[0].comment).toBe("تجربه بسیار عالی");
      expect(detail.stations.length).toBe(1);
      // Games catalog is not in OpenAPI v1.0-LOCKED -> empty array, no mock fallback!
      expect(detail.games).toEqual([]);
    });

    it("handles incomplete optional fields (no media, no reviews, no addresses) cleanly", async () => {
      setupMockFetch((url) => {
        if (url.includes("/public/gamingCenters/minimal-gc")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-min",
                name: "مرکز مینیمال",
                slug: "minimal-gc",
                description: "آدرس از توضیحات مرکز",
                isActive: true,
              },
            }),
            { status: 200 }
          );
        }
        // Sub-resources all return empty
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const detail = await loadGamecenterDetail("minimal-gc");
      expect(detail.center.name).toBe("مرکز مینیمال");
      expect(detail.address).toBe("آدرس از توضیحات مرکز");
      expect(detail.images).toEqual([]);
      expect(detail.reviews).toEqual([]);
      expect(detail.stations).toEqual([]);
      expect(detail.games).toEqual([]);
    });

    it("propagates API error when center resolution fails with 500 internal server error", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "خطای سرور" },
          }),
          { status: 500 }
        );
      });

      await expect(loadGamecenterDetail("error-center")).rejects.toThrow();
    });
  });
});
