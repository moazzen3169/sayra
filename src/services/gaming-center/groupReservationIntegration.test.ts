import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { deviceCategoryApi } from "./device-category.api";
import { stationApi } from "./station.api";
import { groupReservationApi } from "./group-reservation.api";
import { API_BASE_URL } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import { getGroupReservationErrorMessage } from "@/lib/groupReservationErrors";

describe("GameNet Device Categories & Group Reservation Integration", () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequests: { url: string; method: string; headers: Headers; body?: any }[] = [];

  beforeEach(() => {
    interceptedRequests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("A. Device Categories API", () => {
    it("fetches categories successfully and filters out categories with 0 deviceCount", async () => {
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        interceptedRequests.push({
          url: String(url),
          method: init?.method || "GET",
          headers: new Headers(init?.headers),
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                catalogId: "cat-1",
                name: "Gaming PC",
                deviceType: "PC",
                coverImageUrl: "https://example.com/pc.jpg",
                deviceCount: 8,
              },
              {
                catalogId: null,
                name: "PlayStation 5",
                deviceType: "PS5",
                coverImageUrl: null,
                deviceCount: 4,
              },
              {
                catalogId: "cat-empty",
                name: "VR Headsets",
                deviceType: "VR",
                deviceCount: 0,
              },
            ],
            meta: { requestId: "req-cat-1" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const cats = await deviceCategoryApi.getDeviceCategories("my-gamenet");
      expect(cats.length).toBe(2);
      expect(cats[0].name).toBe("Gaming PC");
      expect(cats[0].catalogId).toBe("cat-1");
      expect(cats[1].catalogId).toBeNull();
      expect(cats[1].deviceType).toBe("PS5");
      expect(interceptedRequests[0].url).toBe(
        `${API_BASE_URL}/public/gamingCenters/my-gamenet/device-categories`
      );
    });

    it("handles empty categories list cleanly", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const cats = await deviceCategoryApi.getDeviceCategories("empty-gamenet");
      expect(cats).toEqual([]);
    });

    it("propagates API errors properly without mock fallbacks", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "NOT_FOUND", message: "گیمنت یافت نشد." },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      await expect(deviceCategoryApi.getDeviceCategories("not-found")).rejects.toThrow();
    });
  });

  describe("B. Physical Stations API", () => {
    it("queries stations with catalogDeviceId when catalogId is non-null", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        interceptedRequests.push({
          url: String(url),
          method: "GET",
          headers: new Headers(),
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [
                {
                  id: "st-1",
                  gamingCenterId: "gc-1",
                  name: "PC-01",
                  stationType: "PC",
                  catalogDeviceId: "clx123",
                  coverImageUrl: null,
                  hourlyPrice: 50000,
                  minRentHours: 1,
                  maxRentHours: 6,
                  defaultDurationHours: 2,
                  incrementMinutes: 30,
                  isVip: false,
                  isActive: true,
                },
              ],
              meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
            },
            meta: { requestId: "req-st-1" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const res = await stationApi.getPhysicalStations("my-gamenet", {
        catalogDeviceId: "clx123",
      });

      expect(res.stations.length).toBe(1);
      expect(res.stations[0].id).toBe("st-1");
      expect(interceptedRequests[0].url).toContain("catalogDeviceId=clx123");
      expect(interceptedRequests[0].url).not.toContain("stationType=");
    });

    it("queries stations with stationType when catalogId is null, and NEVER sends catalogDeviceId=null", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        interceptedRequests.push({
          url: String(url),
          method: "GET",
          headers: new Headers(),
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [
                {
                  id: "st-ps5-1",
                  gamingCenterId: "gc-1",
                  name: "PS5-01",
                  stationType: "PS5",
                  catalogDeviceId: null,
                  coverImageUrl: null,
                  hourlyPrice: 80000,
                  minRentHours: 1,
                  maxRentHours: 8,
                  defaultDurationHours: 2,
                  incrementMinutes: 30,
                  isVip: true,
                  isActive: true,
                },
              ],
              meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const res = await stationApi.getPhysicalStations("my-gamenet", {
        stationType: "PS5",
      });

      expect(res.stations.length).toBe(1);
      expect(res.stations[0].id).toBe("st-ps5-1");
      expect(interceptedRequests[0].url).toContain("stationType=PS5");
      expect(interceptedRequests[0].url).not.toContain("catalogDeviceId");
      expect(interceptedRequests[0].url).not.toContain("null");
    });

    it("filters out inactive stations defensively", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [
                { id: "st-active", name: "PC-Active", isActive: true, hourlyPrice: 50000 },
                { id: "st-inactive", name: "PC-Inactive", isActive: false, hourlyPrice: 50000 },
              ],
              meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const res = await stationApi.getPhysicalStations("my-gamenet");
      expect(res.stations.length).toBe(1);
      expect(res.stations[0].id).toBe("st-active");
    });
  });

  describe("C. Group Reservation API & Validation", () => {
    it("submits single group reservation with multiple physical station IDs and Idempotency-Key", async () => {
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        interceptedRequests.push({
          url: String(url),
          method: init?.method || "GET",
          headers: new Headers(init?.headers),
          body: init?.body ? JSON.parse(init.body as string) : undefined,
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "grp-res-12345",
              trackingCode: "TRK-9876",
              gamingCenterId: "gc-1",
              startTime: "2026-11-20T16:00:00.000Z",
              durationMinutes: 120,
              status: "CONFIRMED",
              totalPrice: 200000,
              customer: {
                fullName: "علی محمدی",
                phone: "09123456789",
                email: "ali@example.com",
              },
              note: "رزرو ویژه تورنمنت",
              items: [
                { id: "item-1", stationId: "st-1", stationName: "PC-01" },
                { id: "item-2", stationId: "st-2", stationName: "PC-02" },
              ],
            },
            meta: { requestId: "req-group-1" },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const result = await groupReservationApi.submitGroupReservation(
        "my-gamenet",
        {
          startTime: futureDate,
          durationMinutes: 120,
          items: [{ stationId: "st-1" }, { stationId: "st-2" }],
          customer: {
            fullName: "علی محمدی",
            phone: "09123456789",
            email: "ali@example.com",
          },
          note: "رزرو ویژه تورنمنت",
        },
        "idemp-key-abc-123"
      );

      expect(result.id).toBe("grp-res-12345");
      expect(result.items.length).toBe(2);
      expect(interceptedRequests.length).toBe(1);
      expect(interceptedRequests[0].method).toBe("POST");
      expect(interceptedRequests[0].url).toBe(
        `${API_BASE_URL}/public/gamingCenters/my-gamenet/group-reservations`
      );
      expect(interceptedRequests[0].headers.get("idempotency-key")).toBe("idemp-key-abc-123");
      expect(interceptedRequests[0].body.items).toEqual([
        { stationId: "st-1" },
        { stationId: "st-2" },
      ]);
    });

    it("rejects duplicate physical stations in request payload", async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await expect(
        groupReservationApi.submitGroupReservation(
          "my-gamenet",
          {
            startTime: futureDate,
            durationMinutes: 60,
            items: [{ stationId: "st-1" }, { stationId: "st-1" }],
            customer: { fullName: "تست", phone: "09120000000" },
          },
          "test-key"
        )
      ).rejects.toThrow("دستگاه‌های انتخاب‌شده تکراری هستند.");
    });

    it("rejects reservation startTime in the past", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      await expect(
        groupReservationApi.submitGroupReservation(
          "my-gamenet",
          {
            startTime: pastDate,
            durationMinutes: 60,
            items: [{ stationId: "st-1" }],
            customer: { fullName: "تست", phone: "09120000000" },
          },
          "test-key"
        )
      ).rejects.toThrow("زمان شروع رزرو باید در آینده باشد.");
    });

    it("rejects invalid durationMinutes outside 15..1440 range", async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await expect(
        groupReservationApi.submitGroupReservation(
          "my-gamenet",
          {
            startTime: futureDate,
            durationMinutes: 10, // less than 15
            items: [{ stationId: "st-1" }],
            customer: { fullName: "تست", phone: "09120000000" },
          },
          "test-key"
        )
      ).rejects.toThrow("مدت زمان رزرو باید بین ۱۵ دقیقه تا ۲۴ ساعت");
    });
  });

  describe("D. Backend Error Codes & Error Mapping", () => {
    it("maps all backend error codes to friendly Persian explanations", () => {
      expect(getGroupReservationErrorMessage({ code: "SLOT_NOT_AVAILABLE" })).toContain(
        "توسط کاربر دیگری رزرو شده است"
      );
      expect(getGroupReservationErrorMessage({ code: "RESERVATION_OVERLAP" })).toContain(
        "توسط کاربر دیگری رزرو شده است"
      );
      expect(getGroupReservationErrorMessage({ code: "OTP_REQUIRED" })).toContain(
        "پیامک اعتبارسنجی"
      );
      expect(getGroupReservationErrorMessage({ code: "INVALID_DURATION" })).toContain(
        "مدت زمان رزرو"
      );
      expect(getGroupReservationErrorMessage({ code: "STATION_NOT_FOUND_OR_INACTIVE" })).toContain(
        "در دسترس یا فعال نمی‌باشند"
      );
      expect(getGroupReservationErrorMessage({ code: "ONLINE_RESERVATION_DISABLED" })).toContain(
        "غیرفعال است"
      );
      expect(getGroupReservationErrorMessage({ code: "ACTIVE_RESERVATION_LIMIT_REACHED" })).toContain(
        "سقف تعداد رزروهای فعال"
      );
    });

    it("propagates 409 Conflict with details preserving backend unavailable stations info", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "SLOT_NOT_AVAILABLE",
              message: "یک یا چند دستگاه در دسترس نیستند.",
              details: { unavailableStations: ["st-1"] },
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      try {
        await groupReservationApi.submitGroupReservation(
          "my-gamenet",
          {
            startTime: futureDate,
            durationMinutes: 60,
            items: [{ stationId: "st-1" }],
            customer: { fullName: "تست", phone: "09120000000" },
          },
          "conflict-key"
        );
        expect(true).toBe(false); // should not reach
      } catch (err: any) {
        expect(err instanceof ApiError).toBe(true);
        expect(err.code).toBe("SLOT_NOT_AVAILABLE");
        expect(err.details?.unavailableStations).toEqual(["st-1"]);
      }
    });
  });
});
