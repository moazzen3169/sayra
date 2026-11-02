import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { reservationService } from "./reservationService";
import { ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";
import type { Reservation, ReservationStatus, PaymentState } from "@/types/reservation";
import { STATUS_UI, getStatusUi, getPaymentLabel } from "@/lib/reservationUi";

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

describe("Phase 12: Customer Reservation List", () => {
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

  const sampleReservation1: Reservation = {
    id: "res-user-1",
    gamingCenterId: "gc-apex",
    stationId: "st-pc-1",
    startTime: "2026-11-15T14:00:00.000Z",
    endTime: "2026-11-15T16:00:00.000Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 300000,
    stationSnapshot: {
      name: "سیستم گیمینگ ۱",
      hourlyPrice: 150000,
      stationType: "PC",
    },
    gamingCenterName: "گیمنت اپکس",
    gamingCenterAddress: "تهران، سعادت‌آباد",
    reservationCode: "452109",
  };

  const sampleReservation2: Reservation = {
    id: "res-user-2",
    gamingCenterId: "gc-apex",
    stationId: "st-ps-1",
    startTime: "2026-11-16T18:00:00.000Z",
    endTime: "2026-11-16T19:00:00.000Z",
    status: "PENDING",
    paymentState: "UNPAID",
    totalHours: 1,
    totalPrice: 120000,
    stationSnapshot: {
      name: "پلی‌استیشن ۵ شماره ۳",
      hourlyPrice: 120000,
      stationType: "PLAYSTATION",
    },
    reservationCode: "891234",
  };

  describe("1. Authenticated Loading via GET /customer/reservation", () => {
    it("fetches customer reservations with Bearer token attached", async () => {
      setTokens({ accessToken: "valid-customer-token-xyz" });

      setupMockFetch((url) => {
        expect(url).toContain("/customer/reservation");
        return new Response(
          JSON.stringify({
            success: true,
            data: [sampleReservation1, sampleReservation2],
            meta: {
              pagination: {
                totalItems: 2,
                page: 1,
                pageSize: 50,
                totalPages: 1,
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const list = await reservationService.list();

      expect(capturedRequests.length).toBe(1);
      const req = capturedRequests[0];
      expect(req.method).toBe("GET");
      expect(req.headers.get("authorization")).toBe("Bearer valid-customer-token-xyz");
      expect(list.length).toBe(2);
      expect(list[0].id).toBe("res-user-1");
      expect(list[1].id).toBe("res-user-2");
    });

    it("handles raw array response format seamlessly", async () => {
      setTokens({ accessToken: "token-raw-array" });

      setupMockFetch(() => {
        return new Response(JSON.stringify([sampleReservation1]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const list = await reservationService.list();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("res-user-1");
      expect(list[0].status).toBe("CONFIRMED");
    });

    it("fetches single reservation detail using GET /customer/reservation/{reservationId}", async () => {
      setTokens({ accessToken: "customer-token-detail" });

      setupMockFetch((url) => {
        expect(url).toContain("/customer/reservation/res-user-1");
        return new Response(
          JSON.stringify({
            success: true,
            data: sampleReservation1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const detail = await reservationService.get("res-user-1");
      expect(capturedRequests.length).toBe(1);
      expect(capturedRequests[0].method).toBe("GET");
      expect(detail.id).toBe("res-user-1");
      expect(detail.totalPrice).toBe(300000);
    });
  });

  describe("2. Empty List vs. API Failure Differentiation", () => {
    it("returns empty array when customer has zero reservations without fabricating mock items", async () => {
      setTokens({ accessToken: "customer-empty-account" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            meta: {
              pagination: {
                totalItems: 0,
                page: 1,
                pageSize: 50,
                totalPages: 0,
              },
            },
          }),
          { status: 200 }
        );
      });

      const list = await reservationService.list();
      expect(list).toEqual([]);
      expect(list.length).toBe(0);
    });

    it("propagates 500 server error as ApiError without falling back to mock reservations", async () => {
      setTokens({ accessToken: "customer-error" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "INTERNAL_SERVER_ERROR",
              message: "خطای پردازش پایگاه داده",
            },
          }),
          { status: 500 }
        );
      });

      await expect(reservationService.list()).rejects.toThrow(ApiError);
    });

    it("propagates 502 Bad Gateway error without synthesizing reservations", async () => {
      setTokens({ accessToken: "customer-error" });

      setupMockFetch(() => {
        return new Response("502 Bad Gateway", { status: 502 });
      });

      try {
        await reservationService.list();
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(502);
      }
    });

    it("propagates network failure (fetch rejected) cleanly", async () => {
      setTokens({ accessToken: "customer-net-error" });

      setupMockFetch(() => {
        throw new TypeError("Failed to fetch");
      });

      try {
        await reservationService.list();
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.code).toBe("NETWORK_ERROR");
      }
    });
  });

  describe("3. Pagination Envelope Support", () => {
    it("parses OpenAPI Pagination envelope metadata via listPaginated", async () => {
      setTokens({ accessToken: "customer-token-page" });

      setupMockFetch((url) => {
        expect(url).toContain("page=2");
        expect(url).toContain("pageSize=10");
        return new Response(
          JSON.stringify({
            success: true,
            data: [sampleReservation1],
            meta: {
              pagination: {
                total: 25,
                totalItems: 25,
                page: 2,
                pageSize: 10,
                totalPages: 3,
              },
            },
          }),
          { status: 200 }
        );
      });

      const result = await reservationService.listPaginated({ page: 2, pageSize: 10 });
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it("defaults pagination metadata safely when meta envelope is absent", async () => {
      setTokens({ accessToken: "customer-no-meta" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [sampleReservation1, sampleReservation2],
          }),
          { status: 200 }
        );
      });

      const result = await reservationService.listPaginated();
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("4. Status Mapping & UI Presentation Integrity", () => {
    const allBackendStatuses: ReservationStatus[] = [
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELED",
      "NO_SHOW",
    ];

    it("maps all documented backend status values correctly without inventing new states", () => {
      for (const st of allBackendStatuses) {
        const ui = getStatusUi(st);
        expect(ui).toBeDefined();
        expect(typeof ui.label).toBe("string");
        expect(ui.label.length).toBeGreaterThan(0);
        expect(typeof ui.className).toBe("string");
      }
      expect(STATUS_UI.PENDING.label).toBe("در انتظار تأیید");
      expect(STATUS_UI.CONFIRMED.label).toBe("تأیید شده");
      expect(STATUS_UI.IN_PROGRESS.label).toBe("در حال انجام");
      expect(STATUS_UI.COMPLETED.label).toBe("انجام شده");
      expect(STATUS_UI.CANCELED.label).toBe("لغو شده");
      expect(STATUS_UI.NO_SHOW.label).toBe("عدم حضور");
    });

    const allPaymentStates: PaymentState[] = [
      "UNPAID",
      "PENDING",
      "PARTIALLY_PAID",
      "PAID",
      "REFUNDED",
      "OVERPAID",
      "FAILED",
      "CANCELED",
    ];

    it("maps all documented payment state values accurately", () => {
      for (const ps of allPaymentStates) {
        const label = getPaymentLabel(ps);
        expect(label).toBeDefined();
        expect(label.length).toBeGreaterThan(0);
      }
      expect(getPaymentLabel("UNPAID")).toBe("پرداخت نشده");
      expect(getPaymentLabel("PAID")).toBe("پرداخت شده");
      expect(getPaymentLabel("FAILED")).toBe("پرداخت ناموفق");
      expect(getPaymentLabel("REFUNDED")).toBe("بازگشت وجه");
    });
  });

  describe("5. Unauthorized Access & Authorization Scoping", () => {
    it("handles 401 Unauthorized by attempting token refresh and propagating error if refresh fails", async () => {
      setTokens({ accessToken: "invalid-token", refreshToken: "invalid-refresh" });

      setupMockFetch((url) => {
        if (url.includes("/auth/refresh")) {
          return new Response(
            JSON.stringify({ success: false, error: { code: "UNAUTHORIZED" } }),
            { status: 401 }
          );
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "نشست کاربری نامعتبر است." },
          }),
          { status: 401 }
        );
      });

      await expect(reservationService.list()).rejects.toThrow(ApiError);
    });

    it("verifies that requests do not attach or trust client-supplied customer IDs", async () => {
      setTokens({ accessToken: "customer-token-isolated" });

      setupMockFetch((url) => {
        // Must be scoped solely to /customer/reservation, no customerId query or path injected
        expect(url).not.toContain("customerId=");
        expect(url).not.toContain("customerAccountId=");
        expect(url).not.toContain("customer=");
        return new Response(
          JSON.stringify({
            success: true,
            data: [sampleReservation1],
          }),
          { status: 200 }
        );
      });

      await reservationService.list();
      expect(capturedRequests.length).toBe(1);
      const req = capturedRequests[0];
      const parsedUrl = new URL(req.url, "http://localhost");
      expect(parsedUrl.pathname).toContain("/customer/reservation");
      expect(parsedUrl.searchParams.get("customerId")).toBeNull();
      expect(parsedUrl.searchParams.get("customerAccountId")).toBeNull();
    });

    it("ensures customer A cannot read customer B reservations: scopes to bearer token", async () => {
      // Customer A
      setTokens({ accessToken: "token-customer-A" });
      let calledToken: string | null = null;

      setupMockFetch((url, init) => {
        calledToken = new Headers(init?.headers).get("authorization");
        if (calledToken === "Bearer token-customer-A") {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "res-A-1",
                  status: "CONFIRMED",
                  customerAccountId: "acc-customer-A",
                },
              ],
            }),
            { status: 200 }
          );
        } else if (calledToken === "Bearer token-customer-B") {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "res-B-1",
                  status: "CONFIRMED",
                  customerAccountId: "acc-customer-B",
                },
              ],
            }),
            { status: 200 }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: { code: "FORBIDDEN" } }),
            { status: 403 }
          );
        }
      });

      const listA = await reservationService.list();
      expect(calledToken).toBe("Bearer token-customer-A");
      expect(listA[0].id).toBe("res-A-1");

      // Customer B
      setTokens({ accessToken: "token-customer-B" });
      const listB = await reservationService.list();
      expect(calledToken).toBe("Bearer token-customer-B");
      expect(listB[0].id).toBe("res-B-1");

      // Cross-read attempt: fetching reservation of B with customer A's token returns 403
      setTokens({ accessToken: "token-customer-A" });
      setupMockFetch((url, init) => {
        const auth = new Headers(init?.headers).get("authorization");
        if (auth === "Bearer token-customer-A" && url.includes("/customer/reservation/res-B-1")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "FORBIDDEN", message: "شما به این رزرو دسترسی ندارید." },
            }),
            { status: 403 }
          );
        }
        return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
      });

      await expect(reservationService.get("res-B-1")).rejects.toThrow(ApiError);
    });
  });
});
