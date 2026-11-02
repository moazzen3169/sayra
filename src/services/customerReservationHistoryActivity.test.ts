import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { reservationService } from "./reservationService";
import { ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";
import type { Reservation } from "@/types/reservation";
import {
  getStatusUi,
  getPaymentLabel,
  formatClock,
  formatReservationWhen,
  getErrorMessage,
} from "@/lib/reservationUi";
import { toPersianDigits, formatPrice } from "@/lib/format";
import { APP_TIME_ZONE } from "@/lib/api/config";

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

describe("Phase 14: Customer Reservation History and Activity", () => {
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
    clearTokens();
    setTokens({ accessToken: "test-customer-access-token", refreshToken: "test-customer-refresh-token" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  // =========================================================================
  // 1. History Retrieval & Empty History Handling
  // =========================================================================
  describe("1. Empty History & Backend Data Grounding", () => {
    it("returns an empty array when backend has no reservations (does not fabricate mock reservations)", async () => {
      setupMockFetch((url) => {
        if (url.includes("/customer/reservation")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [],
              meta: {
                pagination: { total: 0, totalItems: 0, page: 1, pageSize: 50, totalPages: 0 },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const items = await reservationService.list();
      expect(items).toEqual([]);
      expect(items.length).toBe(0);

      // Verify that the request was made to the real documented endpoint
      expect(capturedRequests.length).toBe(1);
      expect(capturedRequests[0].url).toContain("/customer/reservation");
      expect(capturedRequests[0].headers.get("Authorization")).toBe("Bearer test-customer-access-token");
    });

    it("ensures all returned records originate strictly from backend data", async () => {
      const backendReservations: Reservation[] = [
        {
          id: "res-backend-001",
          gamingCenterId: "gc-101",
          stationId: "st-55",
          startTime: "2026-11-02T15:00:00.000Z",
          endTime: "2026-11-02T17:00:00.000Z",
          status: "COMPLETED",
          paymentState: "PAID",
          totalHours: 2,
          totalPrice: 300000,
          stationSnapshot: {
            name: "سیستم گیمینگ VIP",
            hourlyPrice: 150000,
            stationType: "PC",
          },
        },
      ];

      setupMockFetch((url) => {
        if (url.includes("/customer/reservation")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: backendReservations,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const items = await reservationService.list();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe("res-backend-001");
      expect(items[0].status).toBe("COMPLETED");
      expect(items[0].totalPrice).toBe(300000);
      expect(items[0].stationSnapshot?.stationType).toBe("PC");
    });
  });

  // =========================================================================
  // 2. Pagination Envelope Support
  // =========================================================================
  describe("2. Pagination Support", () => {
    it("correctly handles paginated envelope from GET /customer/reservation", async () => {
      setupMockFetch((url) => {
        if (url.includes("/customer/reservation")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "res-page-2",
                  gamingCenterId: "gc-1",
                  stationId: "st-1",
                  startTime: "2026-11-03T10:00:00.000Z",
                  endTime: "2026-11-03T12:00:00.000Z",
                  status: "CONFIRMED",
                  paymentState: "PAID",
                  totalHours: 2,
                  totalPrice: 200000,
                },
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
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const res = await reservationService.listPaginated({ page: 2, pageSize: 10 });
      expect(res.page).toBe(2);
      expect(res.pageSize).toBe(10);
      expect(res.total).toBe(25);
      expect(res.totalPages).toBe(3);
      expect(res.items.length).toBe(1);
      expect(res.items[0].id).toBe("res-page-2");

      expect(capturedRequests[0].url).toContain("page=2");
      expect(capturedRequests[0].url).toContain("pageSize=10");
    });
  });

  // =========================================================================
  // 3. Date Ordering and Sorting Semantics
  // =========================================================================
  describe("3. Date Ordering & Chronological Sorting", () => {
    it("maintains stable chronological order by startTime", () => {
      const records = [
        { id: "oldest", startTime: "2026-10-01T10:00:00.000Z" },
        { id: "newest", startTime: "2026-11-10T14:00:00.000Z" },
        { id: "middle", startTime: "2026-10-15T12:00:00.000Z" },
      ];

      // Standard descending sort for history displays
      const sortedDesc = [...records].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      expect(sortedDesc[0].id).toBe("newest");
      expect(sortedDesc[1].id).toBe("middle");
      expect(sortedDesc[2].id).toBe("oldest");
    });
  });

  // =========================================================================
  // 4. Timezone Semantics & Display Formatting
  // =========================================================================
  describe("4. Timezone Semantics & Client-Derived Display Formatting", () => {
    it("uses configured APP_TIME_ZONE (Asia/Tehran) for clock formatting", () => {
      expect(APP_TIME_ZONE).toBe("Asia/Tehran");

      // 15:00 UTC = 18:30 IRST (Tehran time)
      const utcIso = "2026-11-02T15:00:00.000Z";
      const clockStr = formatClock(utcIso, true);

      // Tehran is UTC+3:30, so 15:00 UTC becomes 18:30. In Persian digits: ۱۸:۳۰
      expect(clockStr).toBe(toPersianDigits("18:30"));
    });

    it("formats reservation time windows in Tehran time", () => {
      const startUtc = "2026-11-02T15:00:00.000Z";
      const endUtc = "2026-11-02T16:00:00.000Z";

      const formatted = formatReservationWhen(startUtc, endUtc);
      // Both start and end clock strings are in Persian digits
      expect(formatted).toContain(toPersianDigits("18:30"));
      expect(formatted).toContain(toPersianDigits("19:30"));
    });

    it("clearly distinguishes client-derived display formatting from raw backend fields", () => {
      const rawBackendItem: Reservation = {
        id: "res-fmt-1",
        gamingCenterId: "gc-1",
        stationId: "st-1",
        startTime: "2026-11-02T15:00:00.000Z",
        endTime: "2026-11-02T16:00:00.000Z",
        status: "CONFIRMED",
        paymentState: "PAID",
        totalHours: 1,
        totalPrice: 150000,
      };

      // Raw backend values
      expect(rawBackendItem.totalPrice).toBe(150000);
      expect(rawBackendItem.totalHours).toBe(1);
      expect(rawBackendItem.status).toBe("CONFIRMED");

      // Client-derived formatting:
      const formattedPrice = formatPrice(rawBackendItem.totalPrice);
      const persianHours = toPersianDigits(rawBackendItem.totalHours);
      const statusBadge = getStatusUi(rawBackendItem.status);
      const paymentBadge = getPaymentLabel(rawBackendItem.paymentState);

      expect(formattedPrice).toBe("۱۵۰,۰۰۰");
      expect(persianHours).toBe("۱");
      expect(statusBadge.label).toBe("تأیید شده");
      expect(paymentBadge).toBe("پرداخت شده");
    });
  });

  // =========================================================================
  // 5. API Error Handling & Rejection of Fabricated Data
  // =========================================================================
  describe("5. Error Handling & No Fake Activity entries", () => {
    it("propagates 500 Internal Server Error without falling back to mock activity", async () => {
      setupMockFetch((url) => {
        if (url.includes("/customer/reservation")) {
          return new Response(
            JSON.stringify({
              code: "INTERNAL_ERROR",
              message: "Database connection failed",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      let err: any = null;
      try {
        await reservationService.list();
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(500);
    });

    it("propagates 502 Bad Gateway without returning fake history", async () => {
      setupMockFetch((url) => {
        if (url.includes("/customer/reservation")) {
          return new Response("Bad Gateway", { status: 502 });
        }
        return new Response("Not Found", { status: 404 });
      });

      let err: any = null;
      try {
        await reservationService.list();
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(502);
      expect(getErrorMessage(err)).toContain("502");
    });

    it("propagates network failure without fabricating events", async () => {
      setupMockFetch(() => {
        throw new TypeError("Failed to fetch");
      });

      let err: any = null;
      try {
        await reservationService.list();
      } catch (e) {
        err = e;
      }

      expect(err).toBeTruthy();
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("NETWORK_ERROR");
    });

    it("rejects unauthenticated requests (401 Unauthorized)", async () => {
      setupMockFetch((url) => {
        if (url.includes("/customer/reservation")) {
          return new Response(
            JSON.stringify({ code: "UNAUTHORIZED", message: "Token expired" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url.includes("/auth/refresh")) {
          return new Response("Unauthorized", { status: 401 });
        }
        return new Response("Not Found", { status: 404 });
      });

      let err: any = null;
      try {
        await reservationService.list();
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    });
  });
});
