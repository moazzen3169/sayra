import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadGamecenterDetail, type GameStationInfo } from "@/services/gamecenterDetailService";
import { gamingCenterService } from "@/services/gamingCenterService";
import {
  groupStations,
  allocateItems,
  estimateItemPrice,
  estimateItemsTotal,
  DEFAULT_CONSOLE_CONTROLLERS,
  DEFAULT_MAX_EXTRA_CONTROLLERS,
} from "@/lib/devices";

describe("Phase 7: Gaming-Center Stations and Equipment", () => {
  const originalFetch = globalThis.fetch;
  let requests: Request[] = [];

  function setupMockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    requests = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      requests.push(req);
      const url = req.url;
      return Promise.resolve(handler(url, init));
    }) as unknown as typeof fetch;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
    requests = [];
  });

  describe("1. Station Mapping & Schemas", () => {
    it("maps documented stations from API to device groups correctly", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "st-ps5-1",
          gamingCenterId: "gc-10",
          name: "PlayStation 5 #1",
          stationType: "PLAYSTATION",
          isVip: false,
          hourlyPrice: 180000,
          isActive: true,
        },
        {
          id: "st-ps5-2",
          gamingCenterId: "gc-10",
          name: "PlayStation 5 #2",
          stationType: "PLAYSTATION",
          isVip: true,
          hourlyPrice: 220000,
          isActive: true,
        },
        {
          id: "st-pc-1",
          gamingCenterId: "gc-10",
          name: "Gaming PC #1",
          stationType: "PC",
          hourlyPrice: 150000,
          isActive: true,
        },
      ];

      const groups = groupStations(apiStations);
      expect(groups.length).toBe(2);

      const psGroup = groups.find((g) => g.key === "PLAYSTATION");
      expect(psGroup).toBeDefined();
      expect(psGroup?.capacity).toBe(2);
      expect(psGroup?.minPrice).toBe(180000);
      expect(psGroup?.maxPrice).toBe(220000);
      expect(psGroup?.isConsole).toBe(true);
      expect(psGroup?.stations.map((s) => s.id)).toEqual(["st-ps5-1", "st-ps5-2"]);

      const pcGroup = groups.find((g) => g.key === "PC");
      expect(pcGroup).toBeDefined();
      expect(pcGroup?.capacity).toBe(1);
      expect(pcGroup?.minPrice).toBe(150000);
      expect(pcGroup?.maxPrice).toBe(150000);
      expect(pcGroup?.isConsole).toBe(false);
      expect(pcGroup?.stations[0].id).toBe("st-pc-1");
    });

    it("filters out inactive stations (isActive === false)", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "st-active",
          gamingCenterId: "gc-1",
          name: "Active PC",
          stationType: "PC",
          hourlyPrice: 100000,
          isActive: true,
        },
        {
          id: "st-inactive",
          gamingCenterId: "gc-1",
          name: "Broken PC",
          stationType: "PC",
          hourlyPrice: 100000,
          isActive: false,
        },
      ];

      const groups = groupStations(apiStations);
      expect(groups.length).toBe(1);
      expect(groups[0].capacity).toBe(1);
      expect(groups[0].stations[0].id).toBe("st-active");
    });

    it("handles unknown or custom station types safely with generic fallback", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "st-custom-1",
          gamingCenterId: "gc-1",
          name: "شبیه‌ساز مسابقه",
          stationType: "RACING_SIMULATOR",
          hourlyPrice: 300000,
          isActive: true,
        },
      ];

      const groups = groupStations(apiStations);
      expect(groups.length).toBe(1);
      expect(groups[0].key).toBe("RACING_SIMULATOR");
      expect(groups[0].label).toBe("RACING_SIMULATOR");
      expect(groups[0].image).toBe("/img/pc.png");
      expect(groups[0].isConsole).toBe(false);
    });

    it("handles missing optional fields cleanly without fabricating extra controller prices", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "st-xbox-1",
          gamingCenterId: "gc-1",
          name: "Xbox Series X",
          stationType: "XBOX",
          hourlyPrice: 160000,
          // No extraControllerPrice, no defaultControllers, no maxExtraControllers
          isActive: true,
        },
      ];

      const groups = groupStations(apiStations);
      expect(groups.length).toBe(1);
      const group = groups[0];
      expect(group.isConsole).toBe(true);
      expect(group.extraControllerPrice).toBeUndefined();
      expect(group.defaultControllers).toBe(DEFAULT_CONSOLE_CONTROLLERS);
      expect(group.maxExtra).toBe(DEFAULT_MAX_EXTRA_CONTROLLERS);
    });

    it("honors station-specific extra controller prices when supplied by the API", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "st-ps5-1",
          gamingCenterId: "gc-1",
          name: "PlayStation 5",
          stationType: "PLAYSTATION",
          hourlyPrice: 200000,
          extraControllerPrice: 40000,
          defaultControllers: 2,
          maxExtraControllers: 2,
          isActive: true,
        },
      ];

      const groups = groupStations(apiStations);
      expect(groups[0].extraControllerPrice).toBe(40000);
      expect(groups[0].defaultControllers).toBe(2);
      expect(groups[0].maxExtra).toBe(2);
    });
  });

  describe("2. Selected Station IDs and Allocation Integrity", () => {
    it("confirms that selected station IDs strictly match real API IDs", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "real-station-id-99",
          gamingCenterId: "gc-10",
          name: "VIP Console",
          stationType: "PLAYSTATION",
          hourlyPrice: 250000,
          extraControllerPrice: 50000,
          isActive: true,
        },
      ];

      const groups = groupStations(apiStations);
      const group = groups[0];

      const avail = {
        "real-station-id-99": {
          "2026-11-05T14:00:00Z": true,
        },
      };

      const allocated = allocateItems(
        [{ group, qty: 1, extra: 2 }],
        ["2026-11-05T14:00:00Z"],
        avail
      );

      expect(allocated).not.toBeNull();
      expect(allocated?.length).toBe(1);
      const item = allocated![0];
      expect(item.station.id).toBe("real-station-id-99");
      expect(item.extraControllers).toBe(2);
      expect(item.extraUnitPrice).toBe(50000);

      // Price estimation matches exact formula
      const itemPrice = estimateItemPrice(item);
      expect(itemPrice).toBe(250000 + 2 * 50000); // 350,000

      const total = estimateItemsTotal(allocated!);
      expect(total).toBe(350000);
    });

    it("returns null when insufficient stations are available", () => {
      const apiStations: GameStationInfo[] = [
        {
          id: "st-only-1",
          gamingCenterId: "gc-10",
          name: "Single PC",
          stationType: "PC",
          hourlyPrice: 120000,
          isActive: true,
        },
      ];

      const groups = groupStations(apiStations);
      const avail = {
        "st-only-1": { "2026-11-05T14:00:00Z": true },
      };

      // User requests 2 units, but only 1 exists
      const allocated = allocateItems(
        [{ group: groups[0], qty: 2, extra: 0 }],
        ["2026-11-05T14:00:00Z"],
        avail
      );

      expect(allocated).toBeNull();
    });
  });

  describe("3. Empty Inventory vs Request Failure", () => {
    it("distinguishes empty inventory ([]) from request failure", async () => {
      // 1. Center exists and returns empty stations list
      setupMockFetch((url) => {
        if (url.includes("/public/gamingCenters/center-empty")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "gc-empty", name: "مرکز جدید", slug: "center-empty", isActive: true },
            }),
            { status: 200 }
          );
        }
        if (url.includes("/stations")) {
          return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const detailEmpty = await loadGamecenterDetail("center-empty");
      expect(detailEmpty.stations).toEqual([]);
      expect(detailEmpty.stationsError).toBeNull();

      const groupsEmpty = groupStations(detailEmpty.stations);
      expect(groupsEmpty).toEqual([]);
    });

    it("captures stationsError when GET /stations fails with 500 without masking as empty", async () => {
      setupMockFetch((url) => {
        if (url.includes("/public/gamingCenters/center-error")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "gc-err", name: "مرکز با خطا", slug: "center-error", isActive: true },
            }),
            { status: 200 }
          );
        }
        if (url.includes("/stations")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "STATIONS_UNAVAILABLE", message: "سرور در واکشی ایستگاه‌ها دچار خطا شد" },
            }),
            { status: 500 }
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const detailFailed = await loadGamecenterDetail("center-error");
      expect(detailFailed.stations).toEqual([]);
      expect(detailFailed.stationsError).toBeTruthy();
      expect(typeof detailFailed.stationsError).toBe("string");
    });
  });
});
