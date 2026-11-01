import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { gamingCenterService } from "@/services/gamingCenterService";
import {
  gamingCenterService as detailGamingCenterService,
  loadGamecenterDetail,
} from "@/services/gamecenterDetailService";
import { ApiError } from "@/lib/api/client";
import { ContractGapError } from "@/types/customerApi";

/**
 * Phase 3: Customer Location Data Unit & Component Flow Tests
 * All network operations in this test suite are MOCKED.
 * [MOCKED-NETWORK TESTS - No real backend is called]
 */
describe("Phase 3: Customer Location Data (Mocked Network)", () => {
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

  describe("gamingCenterService.getPublicAddresses (Authoritative Location API)", () => {
    it("fetches gaming center addresses via GET /public/gamingCenters/{slug}/addresses", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/public/gamingCenters/gc-tabriz-1/addresses");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "addr-1",
                title: "شعبه مرکزی",
                city: "تبریز",
                address: "ولیعصر، خیابان مخابرات",
                postalCode: "51577",
                latitude: 38.07,
                longitude: 46.29,
              },
            ],
          }),
          { status: 200 }
        );
      });

      const addresses = await gamingCenterService.getPublicAddresses("gc-tabriz-1");
      expect(addresses.length).toBe(1);
      expect(addresses[0].city).toBe("تبریز");
      expect(addresses[0].address).toBe("ولیعصر، خیابان مخابرات");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("GET");
    });

    it("handles empty address list gracefully without fabricating fallback locations", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/public/gamingCenters/gc-empty-loc/addresses");
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200 }
        );
      });

      const addresses = await gamingCenterService.getPublicAddresses("gc-empty-loc");
      expect(Array.isArray(addresses)).toBe(true);
      expect(addresses.length).toBe(0);
    });

    it("propagates API errors on GET /public/gamingCenters/{slug}/addresses", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "NOT_FOUND", message: "گیمنت یافت نشد." },
          }),
          { status: 404 }
        );
      });

      await expect(gamingCenterService.getPublicAddresses("non-existent")).rejects.toThrow(ApiError);
    });
  });

  describe("loadGamecenterDetail Location Integration", () => {
    it("incorporates server-authoritative address into GamecenterDetail", async () => {
      setupMockFetch((url) => {
        if (url.includes("/addresses")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "addr-10",
                  city: "تبریز",
                  address: "آبرسان، پاساژ نسیم",
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/public/gamingCenters/gc-detail-1")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-detail-1",
                name: "سایبرسکی",
                slug: "gc-detail-1",
                description: "توضیحات پیش‌فرض گیمنت",
                isActive: true,
              },
            }),
            { status: 200 }
          );
        }
        if (url.includes("/stations")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/ratings")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [],
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const detail = await loadGamecenterDetail("gc-detail-1");
      expect(detail.center.name).toBe("سایبرسکی");
      expect(detail.address).toBe("تبریز، آبرسان، پاساژ نسیم");
    });

    it("falls back to center description if address list is empty from server", async () => {
      setupMockFetch((url) => {
        if (url.includes("/addresses")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/public/gamingCenters/gc-no-addr")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-no-addr",
                name: "مرکز تست",
                slug: "gc-no-addr",
                description: "آدرس از توضیحات مرکز",
                isActive: true,
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const detail = await loadGamecenterDetail("gc-no-addr");
      expect(detail.address).toBe("آدرس از توضیحات مرکز");
    });
  });

  describe("Contract Gaps for Global Location Operations", () => {
    it("throws ContractGapError for getCitiesUnsupported without fabricating global city list endpoint", () => {
      expect(() => gamingCenterService.getCitiesUnsupported()).toThrow(ContractGapError);
      try {
        gamingCenterService.getCitiesUnsupported();
      } catch (err) {
        expect((err as ContractGapError).code).toBe("CONTRACT_GAP");
        expect((err as ContractGapError).message).toContain("CustomerCitiesList");
      }
    });

    it("throws ContractGapError for filterCatalogUnsupported when filtering by city/location", () => {
      expect(() => gamingCenterService.filterCatalogUnsupported()).toThrow(ContractGapError);
      try {
        gamingCenterService.filterCatalogUnsupported();
      } catch (err) {
        expect((err as ContractGapError).code).toBe("CONTRACT_GAP");
        expect((err as ContractGapError).message).toContain("GamingCenterCatalogFilter");
      }
    });
  });
});
