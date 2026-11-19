import { describe, it, expect, afterEach } from "bun:test";
import {
  gamecentersPageService,
  resolveCategoryFilter,
  MAX_CENTER_PAGES,
  MAX_DEVICE_VERIFY_CENTERS,
  DEVICE_VERIFY_CONCURRENCY,
} from "./gamecentersPageService";
import { gamingCenterService, GAMING_CENTERS_MAX_PAGE_LIMIT } from "./gamingCenterService";
import type { DeviceCatalogItem } from "@/types/catalog";

const SAMPLE_CATALOG: DeviceCatalogItem[] = [
  { id: "cmwgw5ivl005fghhxx1wfyxuu", name: "کامپیوتر", deviceType: "PC", isActive: true },
  { id: "cmwgw594o005aghhx2lpprlwn", name: "پلی استیشن ۵", deviceType: "PLAYSTATION", isActive: true },
  { id: "cmwgw4x780055ghhxcsyyh4sx", name: "پلی استیشن ۴", deviceType: "PLAYSTATION", isActive: true },
  { id: "cmwgw4e0h0050ghhxecohgw7s", name: "بیلیارد", deviceType: "SWITCH", isActive: true },
  { id: "cmwgw3vi3004vghhxwcq4b85f", name: "ایکس باکس", deviceType: "XBOX", isActive: true },
  { id: "cmwgw3002004lghhx4h27uxu5", name: "واقعیت مجازی", deviceType: "VR", isActive: true },
];

describe("Device Category Discovery & Bounded Requests", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("resolves catalog device IDs and marks shared deviceTypes as requiring exact check", () => {
    const ps5 = resolveCategoryFilter("cmwgw594o005aghhx2lpprlwn", SAMPLE_CATALOG);
    expect(ps5.kind).toBe("catalog_device");
    expect(ps5.stationType).toBe("PLAYSTATION");
    expect(ps5.requiresExactDeviceCheck).toBe(true);

    const pc = resolveCategoryFilter("cmwgw5ivl005fghhxx1wfyxuu", SAMPLE_CATALOG);
    expect(pc.kind).toBe("catalog_device");
    expect(pc.stationType).toBe("PC");
    expect(pc.requiresExactDeviceCheck).toBe(false);

    const billiards = resolveCategoryFilter("cmwgw4e0h0050ghhxecohgw7s", SAMPLE_CATALOG);
    expect(billiards.kind).toBe("catalog_device");
    expect(billiards.stationType).toBe("SWITCH");
    expect(billiards.requiresExactDeviceCheck).toBe(false);

    const legacyPs5 = resolveCategoryFilter("ps5", SAMPLE_CATALOG);
    expect(legacyPs5.kind).toBe("catalog_device");
    expect(legacyPs5.catalogDevice?.id).toBe("cmwgw594o005aghhx2lpprlwn");
    expect(legacyPs5.requiresExactDeviceCheck).toBe(true);
  });

  it("clamps gamingCenterService query limit and deduplicates simultaneous requests", async () => {
    let fetchCount = 0;
    let capturedUrl = "";

    globalThis.fetch = ((url: string | URL | Request) => {
      fetchCount += 1;
      capturedUrl = url.toString();
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: [
                  { id: "c1", name: "مرکز ۱", slug: "c1", isActive: true, deviceCounts: { PC: 5 } },
                ],
                meta: { pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          );
        }, 15);
      });
    }) as unknown as typeof fetch;

    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const p1 = gamingCenterService.listGamingCenters({
      city: "تبریز",
      stationType: "PC",
      page: 1,
      limit: 999,
      signal: controller1.signal,
    });
    const p2 = gamingCenterService.listGamingCenters({
      city: "تبریز",
      stationType: "PC",
      page: 1,
      limit: 999,
      signal: controller2.signal,
    });

    // Aborting caller 1 must not abort caller 2
    controller1.abort();

    await expect(p1).rejects.toThrow();
    const res2 = await p2;
    expect(res2).toHaveLength(1);
    expect(fetchCount).toBe(1);
    expect(capturedUrl).toContain(`limit=${GAMING_CENTERS_MAX_PAGE_LIMIT}`);
    expect(capturedUrl).toContain("stationType=PC");
  });

  it("skips per-center device-categories calls when stationType uniquely identifies the catalog device", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = ((url: string | URL | Request) => {
      const u = url.toString();
      requestedUrls.push(u);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [
                {
                  id: "gc-billiards",
                  name: "باشگاه بیلیارد",
                  slug: "billiard-club",
                  isActive: true,
                  deviceCounts: { SWITCH: 4, PC: 0 },
                },
                {
                  id: "gc-zero",
                  name: "بدون بیلیارد",
                  slug: "no-billiard",
                  isActive: true,
                  deviceCounts: { SWITCH: 0, PC: 10 },
                },
              ],
              meta: { page: 1, limit: 24, total: 2, totalPages: 1 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch;

    const { centers } = await gamecentersPageService.loadFilteredCenters({
      city: "تبریز",
      category: "cmwgw4e0h0050ghhxecohgw7s", // بیلیارد (SWITCH)
      catalogDevices: SAMPLE_CATALOG,
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("stationType=SWITCH");
    expect(requestedUrls[0]).toContain("limit=24");
    expect(centers.map((c) => c.id)).toEqual(["billiard-club"]);
  });

  it("verifies PS5 vs PS4 via concurrency-limited device-categories calls and excludes PS4-only centers", async () => {
    let activeDeviceCatRequests = 0;
    let maxConcurrentDeviceCatRequests = 0;
    let totalDeviceCatRequests = 0;

    const candidateCenters = Array.from({ length: 30 }, (_, i) => ({
      id: `id-${i + 1}`,
      name: `گیمنت ${i + 1}`,
      slug: `center-${i + 1}`,
      isActive: true,
      deviceCounts: { PLAYSTATION: 3 },
    }));

    globalThis.fetch = ((url: string | URL | Request) => {
      const u = url.toString();

      if (u.includes("/device-categories")) {
        activeDeviceCatRequests += 1;
        totalDeviceCatRequests += 1;
        maxConcurrentDeviceCatRequests = Math.max(
          maxConcurrentDeviceCatRequests,
          activeDeviceCatRequests
        );

        const isPs5Center = u.includes("center-1/") || u.includes("center-2/");
        return new Promise((resolve) => {
          setTimeout(() => {
            activeDeviceCatRequests -= 1;
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: [
                    {
                      catalogId: isPs5Center
                        ? "cmwgw594o005aghhx2lpprlwn" // PS5
                        : "cmwgw4x780055ghhxcsyyh4sx", // PS4 only
                      name: isPs5Center ? "پلی استیشن ۵" : "پلی استیشن ۴",
                      deviceType: "PLAYSTATION",
                      deviceCount: 3,
                    },
                  ],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              )
            );
          }, 10);
        });
      }

      // GET /gamingCenters
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: candidateCenters,
            meta: { pagination: { page: 1, limit: 24, total: 30, totalPages: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch;

    const { centers } = await gamecentersPageService.loadFilteredCenters({
      city: "تبریز",
      category: "cmwgw594o005aghhx2lpprlwn", // PS5
      catalogDevices: SAMPLE_CATALOG,
    });

    expect(maxConcurrentDeviceCatRequests).toBeLessThanOrEqual(DEVICE_VERIFY_CONCURRENCY);
    expect(totalDeviceCatRequests).toBeLessThanOrEqual(MAX_DEVICE_VERIFY_CENTERS);
    expect(centers.slice(0, 2).map((c) => c.id)).toEqual(["center-1", "center-2"]);
  });

  it("caps bounded pagination to MAX_CENTER_PAGES", async () => {
    let pageCalls = 0;

    globalThis.fetch = (() => {
      pageCalls += 1;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: Array.from({ length: 24 }, (_, idx) => ({
              id: `gc-${pageCalls}-${idx}`,
              name: `مرکز ${pageCalls}-${idx}`,
              slug: `gc-${pageCalls}-${idx}`,
              isActive: true,
            })),
            meta: { pagination: { page: pageCalls, limit: 24, total: 500, totalPages: 21 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch;

    const items = await gamecentersPageService.loadCentersBounded({ city: "تهران" });
    expect(pageCalls).toBe(MAX_CENTER_PAGES);
    expect(items).toHaveLength(24 * MAX_CENTER_PAGES);
  });
});
