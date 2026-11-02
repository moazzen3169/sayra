import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { apiClient, ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";
import { reservationService } from "@/services/reservationService";
import { ContractGapError } from "@/types/customerApi";
import type { Reservation, ReservationTimeProposal } from "@/types/reservation";

const originalFetch = globalThis.fetch;

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

describe("Phase 13: Customer Reservation Details and Allowed Mutations", () => {
  const fakeToken = "mock-customer-access-token-xyz";

  beforeEach(() => {
    storage.clear();
    setTokens({ accessToken: fakeToken, refreshToken: "mock-refresh-token" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    storage.clear();
    clearTokens();
  });

  describe("1. Reservation Details Retrieval & Ownership Scoping", () => {
    it("fetches single reservation detail using GET /customer/reservation/{reservationId} with Bearer token", async () => {
      let capturedUrl = "";
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = mock(async (input: any, init?: any) => {
        capturedUrl = typeof input === "string" ? input : input.url;
        capturedHeaders = new Headers(init?.headers);

        const mockReservation: Reservation = {
          id: "res-123",
          gamingCenterId: "center-abc",
          stationId: "st-1",
          startTime: "2026-11-03T10:00:00.000Z",
          endTime: "2026-11-03T12:00:00.000Z",
          status: "CONFIRMED",
          paymentState: "PAID",
          totalHours: 2,
          totalPrice: 200000,
          stationSnapshot: {
            name: "سیستم VIP ۱",
            hourlyPrice: 100000,
            stationType: "PC",
          },
        };

        return new Response(
          JSON.stringify({
            success: true,
            data: mockReservation,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const detail = await reservationService.get("res-123");

      expect(capturedUrl).toContain("/customer/reservation/res-123");
      expect(capturedHeaders?.get("authorization")).toBe(`Bearer ${fakeToken}`);
      expect(detail.id).toBe("res-123");
      expect(detail.status).toBe("CONFIRMED");
      expect(detail.totalHours).toBe(2);
      expect(detail.stationSnapshot?.name).toBe("سیستم VIP ۱");
    });

    it("unwraps flat JSON reservation response if server does not wrap in success envelope", async () => {
      globalThis.fetch = mock(async () => {
        const flatReservation: Reservation = {
          id: "res-flat-99",
          gamingCenterId: "center-flat",
          stationId: "st-flat",
          startTime: "2026-11-03T14:00:00.000Z",
          endTime: "2026-11-03T15:00:00.000Z",
          status: "PENDING",
          paymentState: "UNPAID",
          totalHours: 1,
          totalPrice: 80000,
        };

        return new Response(JSON.stringify(flatReservation), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      const detail = await reservationService.get("res-flat-99");
      expect(detail.id).toBe("res-flat-99");
      expect(detail.status).toBe("PENDING");
      expect(detail.paymentState).toBe("UNPAID");
    });

    it("enforces ownership denial (403 Forbidden) when accessing another customer's reservation", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You are not authorized to view this reservation.",
            },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await expect(reservationService.get("res-belonging-to-other-user")).rejects.toThrow(ApiError);
      try {
        await reservationService.get("res-belonging-to-other-user");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(403);
        expect(err.code).toBe("FORBIDDEN");
      }
    });

    it("handles 404 NOT_FOUND for non-existent reservation", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Reservation not found.",
            },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      try {
        await reservationService.get("res-nonexistent");
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.code).toBe("NOT_FOUND");
      }
    });

    it("handles 401 Unauthorized when token is invalid or expired without mock fallback", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token expired" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      try {
        await reservationService.get("res-123");
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(401);
      }
    });
  });

  describe("2. Documented Mutation: Cancellation (POST /customer/reservation/{id}/cancel)", () => {
    it("successfully issues cancellation request to POST /customer/reservation/{reservationId}/cancel", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = mock(async (input: any, init?: any) => {
        capturedUrl = typeof input === "string" ? input : input.url;
        capturedMethod = init?.method || "GET";
        capturedHeaders = new Headers(init?.headers);

        return new Response(
          JSON.stringify({
            success: true,
            data: { message: "Reservation canceled successfully" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await reservationService.cancel("res-cancel-100");

      expect(capturedUrl).toContain("/customer/reservation/res-cancel-100/cancel");
      expect(capturedMethod).toBe("POST");
      expect(capturedHeaders?.get("authorization")).toBe(`Bearer ${fakeToken}`);
    });

    it("rejects invalid transition (e.g. 400 INVALID_TRANSITION when already COMPLETED or CANCELED)", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "INVALID_TRANSITION",
              message: "Cannot cancel a completed reservation.",
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      try {
        await reservationService.cancel("res-completed");
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(400);
        expect(err.code).toBe("INVALID_TRANSITION");
        expect(err.message).toBe("Cannot cancel a completed reservation.");
      }
    });

    it("handles 409 Conflict when cancellation is rejected by backend rules", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "CONFLICT",
              message: "Reservation cancellation conflict.",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      try {
        await reservationService.cancel("res-conflict");
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(409);
        expect(err.code).toBe("CONFLICT");
      }
    });

    it("propagates network failure during cancellation without fabricating state", async () => {
      globalThis.fetch = mock(async () => {
        throw new TypeError("Failed to fetch");
      }) as any;

      try {
        await reservationService.cancel("res-net-err");
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.code).toBe("NETWORK_ERROR");
      }
    });
  });

  describe("3. Documented Mutation: Reschedule (POST /customer/reservation/{id}/reschedule)", () => {
    it("submits requested newStartTime and newEndTime to POST /customer/reservation/{id}/reschedule", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: any = null;

      globalThis.fetch = mock(async (input: any, init?: any) => {
        capturedUrl = typeof input === "string" ? input : input.url;
        capturedMethod = init?.method || "GET";
        capturedBody = init?.body ? JSON.parse(init.body) : null;

        return new Response(
          JSON.stringify({
            success: true,
            data: { message: "Reschedule request submitted" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const payload = {
        newStartTime: "2026-11-04T16:00:00.000Z",
        newEndTime: "2026-11-04T18:00:00.000Z",
      };

      await reservationService.reschedule("res-resched-1", payload);

      expect(capturedUrl).toContain("/customer/reservation/res-resched-1/reschedule");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody).toEqual(payload);
    });

    it("handles 409 conflict during reschedule when slot is not available", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "OVERLAP_CONFLICT",
              message: "Requested time slot overlaps with another booking.",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      try {
        await reservationService.reschedule("res-resched-overlap", {
          newStartTime: "2026-11-04T16:00:00.000Z",
          newEndTime: "2026-11-04T17:00:00.000Z",
        });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(409);
        expect(err.code).toBe("OVERLAP_CONFLICT");
      }
    });
  });

  describe("4. Documented Time Proposals: Accept / Reject & Review Mutations", () => {
    it("fetches proposals list via GET /customer/reservation/{reservationId}/proposals", async () => {
      globalThis.fetch = mock(async () => {
        const proposals: ReservationTimeProposal[] = [
          {
            id: "prop-1",
            reservationId: "res-prop",
            originalStartTime: "2026-11-03T10:00:00.000Z",
            originalEndTime: "2026-11-03T11:00:00.000Z",
            proposedStartTime: "2026-11-03T12:00:00.000Z",
            proposedEndTime: "2026-11-03T13:00:00.000Z",
            note: "جابجایی به دلیل تمیزکاری دستگاه",
            status: "PENDING",
            createdAt: "2026-11-02T18:00:00.000Z",
          },
        ];

        return new Response(JSON.stringify({ success: true, data: proposals }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      const list = await reservationService.listProposals("res-prop");
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("prop-1");
      expect(list[0].status).toBe("PENDING");
    });

    it("accepts a time proposal via POST /customer/reservation/{id}/proposals/{propId}/accept", async () => {
      let capturedUrl = "";
      let capturedMethod = "";

      globalThis.fetch = mock(async (input: any, init?: any) => {
        capturedUrl = typeof input === "string" ? input : input.url;
        capturedMethod = init?.method || "GET";

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await reservationService.acceptProposal("res-1", "prop-10");
      expect(capturedUrl).toContain("/customer/reservation/res-1/proposals/prop-10/accept");
      expect(capturedMethod).toBe("POST");
    });

    it("rejects a time proposal via POST /customer/reservation/{id}/proposals/{propId}/reject", async () => {
      let capturedUrl = "";
      let capturedMethod = "";

      globalThis.fetch = mock(async (input: any, init?: any) => {
        capturedUrl = typeof input === "string" ? input : input.url;
        capturedMethod = init?.method || "GET";

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await reservationService.rejectProposal("res-1", "prop-10");
      expect(capturedUrl).toContain("/customer/reservation/res-1/proposals/prop-10/reject");
      expect(capturedMethod).toBe("POST");
    });

    it("submits rating via POST /customer/reservation/{id}/ratings with rating and optional comment", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: any = null;

      globalThis.fetch = mock(async (input: any, init?: any) => {
        capturedUrl = typeof input === "string" ? input : input.url;
        capturedMethod = init?.method || "GET";
        capturedBody = init?.body ? JSON.parse(init.body) : null;

        return new Response(
          JSON.stringify({ success: true, data: { id: "rate-1" } }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await reservationService.rate("res-complete-1", {
        rating: 5,
        comment: "سیستم عالی و پرسرعت بود.",
      });

      expect(capturedUrl).toContain("/customer/reservation/res-complete-1/ratings");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody).toEqual({
        rating: 5,
        comment: "سیستم عالی و پرسرعت بود.",
      });
    });
  });

  describe("5. Unsupported Customer Actions & Contract Gap Enforcement", () => {
    it("throws ContractGapError for customer direct DELETE operation without simulating success", () => {
      expect(() => reservationService.deleteUnsupported()).toThrow(ContractGapError);
      try {
        reservationService.deleteUnsupported();
      } catch (err: any) {
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReservationDelete");
        expect(err.message).toContain("DELETE /customer/reservation/{reservationId} is not defined");
      }
    });

    it("throws ContractGapError for customer direct PATCH/PUT operation without simulating success", () => {
      expect(() => reservationService.updateUnsupported()).toThrow(ContractGapError);
      try {
        reservationService.updateUnsupported();
      } catch (err: any) {
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReservationUpdate");
        expect(err.message).toContain("PATCH or PUT /customer/reservation/{reservationId} is not defined");
      }
    });
  });

  describe("6. Concurrency, Repeated Mutations & Detail Revalidation", () => {
    it("handles repeated cancellation attempts safely and verifies backend rejection on duplicates", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "RESERVATION_ALREADY_CANCELLED",
              message: "Reservation already canceled",
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      // First cancellation succeeds
      await reservationService.cancel("res-repeat-1");
      expect(callCount).toBe(1);

      // Repeated cancellation is rejected by backend without synthetic override
      try {
        await reservationService.cancel("res-repeat-1");
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.code).toBe("RESERVATION_ALREADY_CANCELLED");
        expect(callCount).toBe(2);
      }
    });

    it("executes revalidation after successful mutation to fetch updated reservation state", async () => {
      let currentStatus = "PENDING";

      globalThis.fetch = mock(async (input: any, init?: any) => {
        const url = typeof input === "string" ? input : input.url;
        const method = init?.method || "GET";

        if (url.includes("/cancel") && method === "POST") {
          currentStatus = "CANCELED";
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.includes("/customer/reservation/res-reval") && method === "GET") {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "res-reval",
                gamingCenterId: "gc-1",
                stationId: "st-1",
                startTime: "2026-11-03T10:00:00.000Z",
                endTime: "2026-11-03T12:00:00.000Z",
                status: currentStatus,
                paymentState: "PAID",
                totalHours: 2,
                totalPrice: 200000,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as any;

      // Initial state is PENDING
      const initial = await reservationService.get("res-reval");
      expect(initial.status).toBe("PENDING");

      // Mutation: Cancel
      await reservationService.cancel("res-reval");

      // Revalidation: Re-fetch detail
      const revalidated = await reservationService.get("res-reval");
      expect(revalidated.status).toBe("CANCELED");
    });
  });
});
