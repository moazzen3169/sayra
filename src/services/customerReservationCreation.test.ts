import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { reservationService } from "./reservationService";
import { submitBooking, itemKey, createIdempotencyKey } from "./bookingService";
import { ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";
import type { BookingItem } from "@/lib/devices";
import type { Reservation } from "@/types/reservation";

// Setup in-memory mock for localStorage in non-browser runner
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: any;
}

describe("Phase 10: Customer Reservation Creation", () => {
  const originalFetch = globalThis.fetch;
  let capturedRequests: CapturedRequest[] = [];

  const setupMockFetch = (
    handler: (url: string, init?: RequestInit) => Response | Promise<Response>
  ) => {
    capturedRequests = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      let parsedBody: any = undefined;
      if (init?.body && typeof init.body === "string") {
        try {
          parsedBody = JSON.parse(init.body);
        } catch {
          parsedBody = init.body;
        }
      }
      capturedRequests.push({
        url: urlStr,
        method: init?.method || "GET",
        headers,
        body: parsedBody,
      });
      return handler(urlStr, init);
    }) as unknown as typeof fetch;
  };

  beforeEach(() => {
    storage.clear();
    clearTokens();
    capturedRequests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    storage.clear();
    clearTokens();
  });

  const sampleStation = {
    id: "st-pc-1",
    gamingCenterId: "gc-apex",
    name: "سیستم گیمینگ ۱",
    stationType: "PC" as const,
    hourlyPrice: 150000,
    minRentHours: 1,
    maxRentHours: 6,
    defaultDurationHours: 1,
    incrementMinutes: 60,
    isActive: true,
  };

  const sampleBookingItem: BookingItem = {
    groupLabel: "سیستم گیمینگ ۱",
    station: sampleStation,
    startTime: "2026-11-10T14:00:00.000Z",
    extraControllers: 0,
    extraUnitPrice: 0,
  };

  describe("1. Documented API Operation: POST /public/gamingCenters/{slug}/reservation", () => {
    it("submits exact documented payload and required idempotency-key header", async () => {
      const backendReservation: Reservation = {
        id: "res-back-100",
        gamingCenterId: "gc-apex",
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        endTime: "2026-11-10T15:00:00.000Z",
        status: "PENDING",
        paymentState: "UNPAID",
        totalHours: 1,
        totalPrice: 150000,
        stationSnapshot: {
          name: "سیستم گیمینگ ۱",
          hourlyPrice: 150000,
          stationType: "PC",
        },
      };

      setupMockFetch((url, init) => {
        expect(url).toContain("/public/gamingCenters/gc-apex/reservation");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            success: true,
            data: backendReservation,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      });

      const res = await reservationService.create({
        gamingCenterSlug: "gc-apex",
        idempotencyKey: "idem-key-abc-123",
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        customer: {
          fullName: "علی محمدی",
          phone: "09141234567",
          email: "ali@example.com",
        },
        note: "توضیحات تست",
      });

      expect(capturedRequests.length).toBe(1);
      const req = capturedRequests[0];
      expect(req.headers.get("idempotency-key")).toBe("idem-key-abc-123");
      expect(req.body).toEqual({
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        customer: {
          fullName: "علی محمدی",
          phone: "09141234567",
          email: "ali@example.com",
        },
        note: "توضیحات تست",
      });

      expect(res.id).toBe("res-back-100");
      expect(res.status).toBe("PENDING");
      expect(res.paymentState).toBe("UNPAID");
      expect(res.totalPrice).toBe(150000);
    });

    it("includes staffId in request payload only when provided", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "res-staff-1", status: "PENDING" },
          }),
          { status: 201 }
        );
      });

      await reservationService.create({
        gamingCenterSlug: "gc-apex",
        idempotencyKey: "idem-key-staff",
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        customer: { fullName: "رضا رضایی", phone: "09123456789" },
        staffId: "staff-99",
      });

      expect(capturedRequests[0].body.staffId).toBe("staff-99");
    });

    it("attaches customer Bearer auth header when customer is authenticated", async () => {
      setTokens({ accessToken: "customer-valid-jwt-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "res-auth-1", status: "PENDING" },
          }),
          { status: 201 }
        );
      });

      await reservationService.create({
        gamingCenterSlug: "gc-apex",
        idempotencyKey: "idem-key-auth",
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        customer: { fullName: "سارا حسینی", phone: "09121112233" },
      });

      expect(capturedRequests[0].headers.get("authorization")).toBe("Bearer customer-valid-jwt-token");
    });
  });

  describe("2. Response Parsing & Fallback Prevention", () => {
    it("correctly unwraps backend response data without fabricating missing properties", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "res-real-888",
              gamingCenterId: "gc-apex",
              stationId: "st-pc-1",
              startTime: "2026-11-10T14:00:00.000Z",
              endTime: "2026-11-10T15:00:00.000Z",
              status: "CONFIRMED",
              paymentState: "UNPAID",
              totalHours: 1,
              totalPrice: 180000,
            },
          }),
          { status: 201 }
        );
      });

      const res = await reservationService.create({
        gamingCenterSlug: "gc-apex",
        idempotencyKey: "idem-parse",
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        customer: { fullName: "امیر", phone: "09120000000" },
      });

      expect(res.id).toBe("res-real-888");
      expect(res.status).toBe("CONFIRMED");
      expect(res.reservationCode).toBeUndefined();
    });

    it("throws ApiError on malformed server response without creating synthetic reservation", async () => {
      setupMockFetch(() => {
        return new Response("<html>502 Bad Gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        });
      });

      await expect(
        reservationService.create({
          gamingCenterSlug: "gc-apex",
          idempotencyKey: "idem-malformed",
          stationId: "st-pc-1",
          startTime: "2026-11-10T14:00:00.000Z",
          customer: { fullName: "امیر", phone: "09120000000" },
        })
      ).rejects.toThrow(ApiError);
    });

    it("throws ApiError when response contains success: false in envelope", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "شماره تماس وارد شده نامعتبر است.",
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      });

      try {
        await reservationService.create({
          gamingCenterSlug: "gc-apex",
          idempotencyKey: "idem-val",
          stationId: "st-pc-1",
          startTime: "2026-11-10T14:00:00.000Z",
          customer: { fullName: "امیر", phone: "invalid-phone" },
        });
        expect(true).toBe(false); // should not reach
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(400);
        expect(e.code).toBe("VALIDATION_ERROR");
        expect(e.message).toBe("شماره تماس وارد شده نامعتبر است.");
      }
    });
  });

  describe("3. Idempotency & Duplicate Submission Protection", () => {
    it("generates random valid idempotency keys with createIdempotencyKey", () => {
      const k1 = createIdempotencyKey();
      const k2 = createIdempotencyKey();
      expect(typeof k1).toBe("string");
      expect(k1.length).toBeGreaterThan(10);
      expect(k1).not.toBe(k2);
    });

    it("reuses the same idempotency key across retries in submitBooking", async () => {
      let callCount = 0;
      setupMockFetch(() => {
        callCount++;
        if (callCount === 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: "INTERNAL_ERROR",
                message: "Server temporary glitch",
              },
            }),
            { status: 500 }
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "res-retry-success",
              stationId: sampleStation.id,
              startTime: sampleBookingItem.startTime,
              status: "PENDING",
            },
          }),
          { status: 201 }
        );
      });

      const keys = new Map<string, string>();
      const done = new Map<string, Reservation>();
      const params = {
        gamingCenterSlug: "gc-apex",
        items: [sampleBookingItem],
        customer: { fullName: "تست", phone: "09121234567" },
        keys,
        done,
      };

      // First attempt: fails with 500
      await expect(submitBooking(params)).rejects.toThrow(ApiError);
      expect(capturedRequests.length).toBe(1);
      const firstKey = capturedRequests[0].headers.get("idempotency-key");
      expect(firstKey).toBeTruthy();
      expect(keys.size).toBe(1);
      expect(done.size).toBe(0);

      // Second attempt (retry): must send EXACT SAME idempotency key
      const result = await submitBooking(params);
      expect(capturedRequests.length).toBe(2);
      const secondKey = capturedRequests[1].headers.get("idempotency-key");
      expect(secondKey).toBe(firstKey);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("res-retry-success");
      expect(done.size).toBe(1);
    });

    it("skips previously completed items on partial retry without submitting duplicates", async () => {
      const item1: BookingItem = {
        groupLabel: "سیستم گیمینگ ۱",
        station: sampleStation,
        startTime: "2026-11-10T14:00:00.000Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      };
      const item2: BookingItem = {
        groupLabel: "سیستم گیمینگ ۱",
        station: sampleStation,
        startTime: "2026-11-10T15:00:00.000Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      };

      let attempt = 0;
      setupMockFetch((url, init) => {
        const body = JSON.parse(init?.body as string);
        if (body.startTime === item1.startTime) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "res-item-1", startTime: item1.startTime, status: "PENDING" },
            }),
            { status: 201 }
          );
        } else {
          attempt++;
          if (attempt === 1) {
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: "APP_ERROR", message: "Failed second item" },
              }),
              { status: 500 }
            );
          }
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "res-item-2", startTime: item2.startTime, status: "PENDING" },
            }),
            { status: 201 }
          );
        }
      });

      const keys = new Map<string, string>();
      const done = new Map<string, Reservation>();
      const params = {
        gamingCenterSlug: "gc-apex",
        items: [item1, item2],
        customer: { fullName: "تست", phone: "09121234567" },
        keys,
        done,
      };

      // First run: item1 succeeds, item2 fails
      await expect(submitBooking(params)).rejects.toThrow(ApiError);
      expect(done.has(itemKey(item1))).toBe(true);
      expect(done.has(itemKey(item2))).toBe(false);
      expect(capturedRequests.length).toBe(2);

      // Second run: item1 is skipped from done map, only item2 is submitted
      const results = await submitBooking(params);
      expect(capturedRequests.length).toBe(3); // 2 from first + 1 for item2 retry
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("res-item-1");
      expect(results[1].id).toBe("res-item-2");
    });

    it("deletes idempotency key on slot conflict error so user can re-select and retry", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "SLOT_NOT_AVAILABLE",
              message: "این ساعت دیگر خالی نیست.",
            },
          }),
          { status: 409 }
        );
      });

      const keys = new Map<string, string>();
      const done = new Map<string, Reservation>();
      const k = itemKey(sampleBookingItem);

      await expect(
        submitBooking({
          gamingCenterSlug: "gc-apex",
          items: [sampleBookingItem],
          customer: { fullName: "تست", phone: "09121234567" },
          keys,
          done,
        })
      ).rejects.toThrow(ApiError);

      expect(keys.has(k)).toBe(false);
    });
  });

  describe("4. Error Scenarios & UI Messaging Compliance", () => {
    it("handles 401 Unauthorized correctly and refreshes token", async () => {
      setTokens({ accessToken: "expired-access-token", refreshToken: "valid-refresh-token" });

      let refreshAttempted = false;
      let requestAttempt = 0;

      setupMockFetch((url) => {
        if (url.includes("/auth/refresh")) {
          refreshAttempted = true;
          return new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: "new-fresh-access-token" },
            }),
            { status: 200 }
          );
        }

        requestAttempt++;
        if (requestAttempt === 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "UNAUTHORIZED", message: "نشست کاربری نامعتبر است." },
            }),
            { status: 401 }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "res-after-refresh", status: "PENDING" },
          }),
          { status: 201 }
        );
      });

      const res = await reservationService.create({
        gamingCenterSlug: "gc-apex",
        idempotencyKey: "idem-auth-refresh",
        stationId: "st-pc-1",
        startTime: "2026-11-10T14:00:00.000Z",
        customer: { fullName: "کاربر", phone: "09120000000" },
      });

      expect(refreshAttempted).toBe(true);
      expect(res.id).toBe("res-after-refresh");
    });

    it("propagates 409 Conflict with RESERVATION_OVERLAP code", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "RESERVATION_OVERLAP",
              message: "زمان انتخاب‌شده با رزرو دیگری تداخل دارد.",
            },
          }),
          { status: 409 }
        );
      });

      try {
        await reservationService.create({
          gamingCenterSlug: "gc-apex",
          idempotencyKey: "idem-conflict",
          stationId: "st-pc-1",
          startTime: "2026-11-10T14:00:00.000Z",
          customer: { fullName: "کاربر", phone: "09120000000" },
        });
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(409);
        expect(e.code).toBe("RESERVATION_OVERLAP");
      }
    });

    it("handles Network Failure (TypeError / Network_Error) gracefully without fabricating fallbacks", async () => {
      setupMockFetch(() => {
        throw new TypeError("Failed to fetch");
      });

      try {
        await reservationService.create({
          gamingCenterSlug: "gc-apex",
          idempotencyKey: "idem-net",
          stationId: "st-pc-1",
          startTime: "2026-11-10T14:00:00.000Z",
          customer: { fullName: "کاربر", phone: "09120000000" },
        });
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.code).toBe("NETWORK_ERROR");
      }
    });
  });
});
