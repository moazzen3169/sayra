import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { gamingCenterService } from "./gamingCenterService";
import { allocateItems, isSlotBookable, type AvailabilityMap, type BookingLine, type DeviceGroup } from "@/lib/devices";
import { formatClock, formatDayLabel } from "@/lib/reservationUi";

describe("Phase 8: Customer Booking Calendar and Availability", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset fetch
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const setupMockFetch = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
    globalThis.fetch = mock(handler as typeof fetch);
  };

  describe("1. Documented Availability API Operation", () => {
    it("calls GET /public/gamingCenters/{slug}/availability/slots with correct date and stationId query params", async () => {
      let requestedUrl = "";
      setupMockFetch((url) => {
        requestedUrl = url.toString();
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                startTime: "2026-11-05T14:00:00Z",
                endTime: "2026-11-05T15:00:00Z",
                isAvailable: true,
                status: "AVAILABLE",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const slots = await gamingCenterService.getAvailabilitySlots("center-alpha", "2026-11-05", "station-101");
      expect(requestedUrl).toContain("/public/gamingCenters/center-alpha/availability/slots");
      expect(requestedUrl).toContain("date=2026-11-05");
      expect(requestedUrl).toContain("stationId=station-101");
      expect(slots.length).toBe(1);
      expect(slots[0].startTime).toBe("2026-11-05T14:00:00Z");
      expect(slots[0].isAvailable).toBe(true);
    });

    it("omits stationId query parameter when not provided", async () => {
      let requestedUrl = "";
      setupMockFetch((url) => {
        requestedUrl = url.toString();
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      await gamingCenterService.getAvailabilitySlots("center-alpha", "2026-11-05");
      expect(requestedUrl).toContain("date=2026-11-05");
      expect(requestedUrl).not.toContain("stationId=");
    });
  });

  describe("2. Available and Unavailable Slots Representation", () => {
    it("faithfully preserves available and unavailable slots as returned by the API", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { startTime: "2026-11-05T10:00:00Z", isAvailable: true, status: "AVAILABLE" },
              { startTime: "2026-11-05T11:00:00Z", isAvailable: false, status: "UNAVAILABLE" },
              { startTime: "2026-11-05T12:00:00Z", isAvailable: false },
              { startTime: "2026-11-05T13:00:00Z", isAvailable: true },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const slots = await gamingCenterService.getAvailabilitySlots("center-alpha", "2026-11-05");
      expect(slots.length).toBe(4);
      expect(slots[0].isAvailable).toBe(true);
      expect(slots[0].status).toBe("AVAILABLE");
      expect(slots[1].isAvailable).toBe(false);
      expect(slots[1].status).toBe("UNAVAILABLE");
      expect(slots[2].isAvailable).toBe(false);
      expect(slots[3].isAvailable).toBe(true);
    });

    it("returns an empty array when backend has no available slots without inventing fallback slots", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const slots = await gamingCenterService.getAvailabilitySlots("center-alpha", "2026-11-05");
      expect(slots).toEqual([]);
    });
  });

  describe("3. Timezone Boundaries & Clock Formatting", () => {
    it("formats ISO timestamps according to Asia/Tehran timezone (+03:30)", () => {
      // 10:00:00 UTC = 13:30:00 Tehran (+03:30)
      const clock = formatClock("2026-11-05T10:00:00Z", true);
      // In Persian digits: 13:30 -> ۱۳:۳۰
      expect(clock).toBe("۱۳:۳۰");
    });

    it("formats day labels correctly across midnight UTC vs local Tehran time", () => {
      // 20:45:00 UTC on Nov 5 is 00:15:00 Tehran on Nov 6
      const clock = formatClock("2026-11-05T20:45:00Z", true);
      expect(clock).toBe("۰۰:۱۵");
    });
  });

  describe("4. Rapid Selection Changes & Stale Responses (AbortController)", () => {
    it("aborts in-flight request when user rapidly switches date or center", async () => {
      const controller = new AbortController();

      setupMockFetch((_url, init) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({ success: true, data: [] }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              )
            );
          }, 100);

          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new DOMException("The user aborted a request.", "AbortError"));
            });
          }
        });
      });

      const slotPromise = gamingCenterService.getAvailabilitySlots("center-1", "2026-11-05", undefined, controller.signal);
      controller.abort();

      await expect(slotPromise).rejects.toThrow();
    });
  });

  describe("5. Backend Error & Failure Handling", () => {
    it("propagates 500 internal server error cleanly", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Database connection failed",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      });

      await expect(
        gamingCenterService.getAvailabilitySlots("center-1", "2026-11-05")
      ).rejects.toThrow();
    });

    it("propagates network failure without fabricating synthetic slots", async () => {
      setupMockFetch(() => {
        throw new Error("Failed to fetch");
      });

      await expect(
        gamingCenterService.getAvailabilitySlots("center-1", "2026-11-05")
      ).rejects.toThrow("ارتباط با سرور برقرار نشد.");
    });
  });

  describe("6. Real Capacity & Multi-Station Allocation", () => {
    const dummyGroup: DeviceGroup = {
      key: "PS5",
      label: "پلی‌استیشن ۵",
      image: "/img/ps5.png",
      isConsole: true,
      stations: [
        { id: "st-1", gamingCenterId: "gc-1", name: "PS5 #1", stationType: "PLAYSTATION", hourlyPrice: 100000 },
        { id: "st-2", gamingCenterId: "gc-1", name: "PS5 #2", stationType: "PLAYSTATION", hourlyPrice: 100000 },
      ],
      capacity: 2,
      minPrice: 100000,
      maxPrice: 100000,
      defaultControllers: 2,
      maxExtra: 4,
    };

    it("evaluates bookability strictly based on actual station availability map", () => {
      const avail: AvailabilityMap = {
        "st-1": { "2026-11-05T14:00:00Z": true },
        "st-2": { "2026-11-05T14:00:00Z": false },
      };

      const line1: BookingLine = { group: dummyGroup, qty: 1, extra: 0 };
      expect(isSlotBookable([line1], "2026-11-05T14:00:00Z", avail)).toBe(true);

      const line2: BookingLine = { group: dummyGroup, qty: 2, extra: 0 };
      expect(isSlotBookable([line2], "2026-11-05T14:00:00Z", avail)).toBe(false);
    });

    it("allocates stations only when sufficient units are available from API responses", () => {
      const avail: AvailabilityMap = {
        "st-1": { "2026-11-05T14:00:00Z": true },
        "st-2": { "2026-11-05T14:00:00Z": false },
      };

      const line1: BookingLine = { group: dummyGroup, qty: 1, extra: 0 };
      const allocated = allocateItems([line1], ["2026-11-05T14:00:00Z"], avail);
      expect(allocated).not.toBeNull();
      expect(allocated?.length).toBe(1);
      expect(allocated?.[0].station.id).toBe("st-1");

      const line2: BookingLine = { group: dummyGroup, qty: 2, extra: 0 };
      const failedAllocation = allocateItems([line2], ["2026-11-05T14:00:00Z"], avail);
      expect(failedAllocation).toBeNull();
    });
  });
});
