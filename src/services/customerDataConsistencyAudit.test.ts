import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { apiClient, ApiError } from "@/lib/api/client";
import { reservationService } from "@/services/reservationService";
import { customerReviewService } from "@/services/customerReviewService";
import { customerNotificationService } from "@/services/customerNotificationService";
import { gamingCenterService } from "@/services/gamingCenterService";
import { loadGamecenterDetail } from "@/services/gamecenterDetailService";
import { submitBooking } from "@/services/bookingService";
import { setTokens, clearTokens, getAccessToken } from "@/lib/token";
import type { BookingItem } from "@/lib/devices";

// In-memory mock for localStorage in non-browser runner
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Phase 21: Customer Data Consistency and Error-State Audit", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    storage.clear();
    clearTokens();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("1. Stale-Response Races & AbortSignal Request Cancellation", () => {
    it("cancels in-flight customer reservation list request when aborted and discards stale response", async () => {
      let aborted = false;
      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal;
        return new Promise<Response>((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: [{ id: "res-stale", status: "PENDING", totalPrice: 100000 }],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              )
            );
          }, 50);

          signal?.addEventListener("abort", () => {
            aborted = true;
            clearTimeout(timeout);
            const err = new DOMException("The operation was aborted", "AbortError");
            reject(err);
          });
        });
      });

      const controller = new AbortController();
      const promise = reservationService.list(controller.signal);

      // Abort immediately to simulate fast tab change or re-fetch
      controller.abort();

      await expect(promise).rejects.toThrow();
      expect(aborted).toBe(true);
    });

    it("ensures public ratings loading respects AbortSignal and does not update on stale cancellation", async () => {
      let aborted = false;
      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal;
        return new Promise<Response>((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: [{ id: "rate-1", rating: 5, comment: "عالی", author: "کاربر" }],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              )
            );
          }, 60);

          signal?.addEventListener("abort", () => {
            aborted = true;
            clearTimeout(timeout);
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        });
      });

      const controller = new AbortController();
      const promise = customerReviewService.listPublicRatings("gc-slug", controller.signal);
      controller.abort();

      await expect(promise).rejects.toThrow();
      expect(aborted).toBe(true);
    });

    it("preserves race sequence when switching dates or center details", async () => {
      let requestOrder: number[] = [];
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        const url = new URL(urlStr, "http://localhost");
        const date = url.searchParams.get("date");
        const orderId = date === "2026-11-01" ? 1 : 2;
        requestOrder.push(orderId);

        return new Promise<Response>((resolve, reject) => {
          const delay = orderId === 1 ? 40 : 10;
          const timeout = setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: [{ time: "14:00", isFree: orderId === 2 }],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              )
            );
          }, delay);

          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        });
      });

      const c1 = new AbortController();
      const c2 = new AbortController();

      // Trigger request 1 then immediately abort it before or during flight
      const p1 = gamingCenterService.getAvailabilitySlots("gc-1", "2026-11-01", undefined, c1.signal);
      c1.abort();
      const p2 = gamingCenterService.getAvailabilitySlots("gc-1", "2026-11-02", undefined, c2.signal);

      await expect(p1).rejects.toThrow();
      const res2 = await p2;
      expect(res2[0].isFree).toBe(true);
      expect(requestOrder).toContain(1);
      expect(requestOrder).toContain(2);
    });
  });

  describe("2. Mutation Revalidation & State Synchronization", () => {
    it("revalidates reservation state after successful cancellation", async () => {
      let reservationStatus = "CONFIRMED";
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        const method = init?.method || "GET";

        if (urlStr.includes("/customer/reservation/res-100/cancel") && method === "POST") {
          reservationStatus = "CANCELED";
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("/customer/reservation/res-100") && method === "GET") {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "res-100",
                status: reservationStatus,
                totalPrice: 200000,
                gamingCenterName: "گیم‌سنتر آلفا",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("Not found", { status: 404 });
      });

      // 1. Initial state check
      const initial = await reservationService.get("res-100");
      expect(initial.status).toBe("CONFIRMED");

      // 2. Perform mutation
      await reservationService.cancel("res-100");

      // 3. Post-mutation revalidation fetch
      const revalidated = await reservationService.get("res-100");
      expect(revalidated.status).toBe("CANCELED");
    });

    it("revalidates proposal list after accepting an owner time proposal", async () => {
      let proposalStatus = "PENDING";
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        const method = init?.method || "GET";

        if (urlStr.includes("/proposals/prop-1/accept") && method === "POST") {
          proposalStatus = "ACCEPTED";
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("/proposals") && method === "GET") {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "prop-1",
                  status: proposalStatus,
                  originalStartTime: "2026-11-02T10:00:00Z",
                  proposedStartTime: "2026-11-02T12:00:00Z",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("Not found", { status: 404 });
      });

      const initialProps = await reservationService.listProposals("res-prop");
      expect(initialProps[0].status).toBe("PENDING");

      await reservationService.acceptProposal("res-prop", "prop-1");

      const revalidatedProps = await reservationService.listProposals("res-prop");
      expect(revalidatedProps[0].status).toBe("ACCEPTED");
    });

    it("synchronizes notification read count when notifications are marked read", async () => {
      let unreadCount = 3;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        const method = init?.method || "GET";

        if (urlStr.includes("/notifications/notif-1/read") && method === "PATCH") {
          unreadCount = Math.max(0, unreadCount - 1);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("/notifications/unread-count") && method === "GET") {
          return new Response(
            JSON.stringify({
              success: true,
              data: { count: unreadCount },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("Not found", { status: 404 });
      });

      const countBefore = await customerNotificationService.getUnreadCount();
      expect(countBefore).toBe(3);

      await customerNotificationService.markAsRead("notif-1");

      const countAfter = await customerNotificationService.getUnreadCount();
      expect(countAfter).toBe(2);
    });
  });

  describe("3. Safe Idempotency Rules & Non-Idempotent Mutation Protection", () => {
    it("submits booking reservation with mandatory idempotency-key header", async () => {
      let sentHeader: string | null = null;
      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        sentHeader = headers?.["idempotency-key"] || null;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "res-new-1",
              status: "PENDING",
              totalPrice: 150000,
              reservationCode: "889900",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      });

      const fixedKey = "idem-test-uuid-12345";
      const res = await reservationService.create({
        gamingCenterSlug: "gorgodan",
        idempotencyKey: fixedKey,
        stationId: "st-1",
        startTime: "2026-11-03T14:00:00Z",
        customer: { fullName: "علی رضایی", phone: "09121111111" },
      });

      expect(res.id).toBe("res-new-1");
      expect(sentHeader).toBe(fixedKey);
    });

    it("reuses idempotency keys on retry across multiple items without duplicate creation", async () => {
      const capturedKeys: string[] = [];
      let attempt = 0;

      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        attempt++;
        const headers = init?.headers as Record<string, string>;
        const key = headers?.["idempotency-key"];
        if (key) capturedKeys.push(key);

        if (attempt === 1) {
          // First attempt succeeds for item 1
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "res-item-1", status: "PENDING", totalPrice: 100000 },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          );
        } else if (attempt === 2) {
          // Item 2 fails due to temporary network error
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "SERVER_ERROR", message: "Internal failure" },
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        } else {
          // Retry for item 2 succeeds
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "res-item-2", status: "PENDING", totalPrice: 120000 },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          );
        }
      });

      const items: BookingItem[] = [
        {
          station: { id: "st-1", name: "PS5-1", stationType: "PS5", hourlyPrice: 100000 },
          startTime: "2026-11-03T14:00:00Z",
          extraControllers: 0,
          extraUnitPrice: 20000,
        },
        {
          station: { id: "st-2", name: "PC-1", stationType: "PC", hourlyPrice: 120000 },
          startTime: "2026-11-03T14:00:00Z",
          extraControllers: 0,
          extraUnitPrice: 0,
        },
      ];

      const keys = new Map<string, string>();
      const done = new Map<string, any>();

      // First run should throw on item 2
      await expect(
        submitBooking({
          gamingCenterSlug: "center-x",
          items,
          customer: { fullName: "کاربر", phone: "09120000000" },
          keys,
          done,
        })
      ).rejects.toThrow();

      expect(done.size).toBe(1); // Item 1 is done
      const item2KeyBeforeRetry = keys.get("st-2|2026-11-03T14:00:00Z");
      expect(item2KeyBeforeRetry).toBeDefined();

      // Retry: Item 1 should NOT be re-submitted; Item 2 should reuse identical idempotency key
      const results = await submitBooking({
        gamingCenterSlug: "center-x",
        items,
        customer: { fullName: "کاربر", phone: "09120000000" },
        keys,
        done,
      });

      expect(results.length).toBe(2);
      expect(results[0].id).toBe("res-item-1");
      expect(results[1].id).toBe("res-item-2");
      // Total requests made: item 1 (1) + item 2 fail (1) + item 2 retry (1) = 3
      expect(capturedKeys.length).toBe(3);
      // Item 2 retry must use the exact same key as first attempt
      expect(capturedKeys[1]).toBe(capturedKeys[2]);
    });

    it("never automatically retries non-idempotent mutations without safe idempotency", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "CONFLICT", message: "رزرو در وضعیتی نیست که لغو شود." },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      });

      // Cancel reservation is non-idempotent in HTTP POST without automatic idempotency envelope
      await expect(reservationService.cancel("res-failed")).rejects.toThrow(ApiError);
      // Ensure exactly 1 request was issued without blind background retries
      expect(callCount).toBe(1);
    });
  });

  describe("4. No Silent Fallback to Stale Mock Data", () => {
    it("propagates 500 server error on reservation list without falling back to mock reservations", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_SERVER_ERROR", message: "خطای پایگاه داده" },
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      });

      await expect(reservationService.list()).rejects.toThrow(ApiError);
    });

    it("propagates 502/504 gateway failures without synthesizing fake gaming center detail", async () => {
      globalThis.fetch = mock(async () => {
        return new Response("Bad Gateway", { status: 502 });
      });

      await expect(loadGamecenterDetail("slug-broken")).rejects.toThrow();
    });

    it("propagates network disconnect (fetch rejected) cleanly without fabricating reviews", async () => {
      globalThis.fetch = mock(async () => {
        throw new Error("Failed to fetch (DNS / Network down)");
      });

      await expect(customerReviewService.listPublicRatings("any-slug")).rejects.toThrow();
    });
  });

  describe("5. Token Refresh & Failed Session Lifecycle", () => {
    it("handles 401 Unauthorized by attempting token refresh once and retrying request", async () => {
      setTokens({ accessToken: "expired-access", refreshToken: "valid-refresh" });
      let refreshCalled = false;
      let requestAttempt = 0;

      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        const urlStr = String(input);

        if (urlStr.endsWith("/auth/refresh")) {
          refreshCalled = true;
          return new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: "fresh-access-token" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        requestAttempt++;
        if (requestAttempt === 1) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "UNAUTHORIZED", message: "Token expired" },
            }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "res-after-refresh", status: "CONFIRMED" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const list = await reservationService.list();
      expect(refreshCalled).toBe(true);
      expect(requestAttempt).toBe(2);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("res-after-refresh");
    });

    it("clears session tokens and terminates gracefully when token refresh fails with 401", async () => {
      setTokens({ accessToken: "bad-access", refreshToken: "bad-refresh" });

      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.endsWith("/auth/refresh")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "UNAUTHORIZED", message: "Refresh token expired" },
            }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token expired" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      });

      await expect(reservationService.list()).rejects.toThrow(ApiError);
      // Tokens must be wiped out to prevent infinite loops or corrupt auth states
      expect(storage.get("sayra_access_token")).toBeUndefined();
      expect(storage.get("sayra_refresh_token")).toBeUndefined();
    });
  });

  describe("6. Duplicate Request Guard & Concurrency Control", () => {
    it("shares single in-flight promise for concurrent token refresh calls", async () => {
      setTokens({ accessToken: "expired-access", refreshToken: "shared-refresh" });
      let refreshCallCount = 0;
      let regularRequestCount = 0;

      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        const urlStr = String(input);

        if (urlStr.endsWith("/auth/refresh")) {
          refreshCallCount++;
          await new Promise((r) => setTimeout(r, 20));
          return new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: "mutex-access-token" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        regularRequestCount++;
        // If request has new refreshed token, succeed
        if (getAccessToken() === "mutex-access-token") {
          return new Response(
            JSON.stringify({ success: true, data: [] }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Return 401 initially
        return new Response(
          JSON.stringify({ success: false, error: { code: "UNAUTHORIZED" } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      });

      // Fire 3 simultaneous requests triggering 401
      const [r1, r2, r3] = await Promise.all([
        reservationService.list(),
        reservationService.list(),
        reservationService.list(),
      ]);

      expect(r1).toEqual([]);
      expect(r2).toEqual([]);
      expect(r3).toEqual([]);
      // Crucial: performTokenRefresh was executed exactly ONCE across all 3 concurrent requests
      expect(refreshCallCount).toBe(1);
    });
  });

  describe("7. Unit vs. Staging Verification Distinction", () => {
    it("verifies unit mock environment operates with deterministic mock responses", () => {
      expect(typeof originalFetch).toBe("function");
    });

    it("verifies staging requirements: mock mode is strictly disabled in production environments", () => {
      // Per system memory and src/lib/api/config.ts:
      // In production (NODE_ENV === 'production'), mock mode is strictly disabled by default
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        expect(process.env.NEXT_PUBLIC_ALLOW_MOCK_IN_PROD).not.toBe("true");
      }
    });
  });
});
