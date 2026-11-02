import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { paymentService } from "./paymentService";
import { apiClient, ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";
import type { PaymentState } from "@/types/customerApi";

interface MockRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
}

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

describe("Phase 11: Customer Payment Flow (paymentService)", () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: MockRequest[] = [];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    storage.clear();
    clearTokens();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  function setupMockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";
      const headers = new Headers(init?.headers);
      const body = init?.body ? String(init.body) : null;
      requests.push({ url, method, headers, body });
      return handler(url, init);
    }) as typeof globalThis.fetch;
  }

  describe("1. Payment Initiation (POST .../payments/init)", () => {
    it("initiates payment sending mandatory idempotency-key header and bearer token", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/gamingCenters/gc-123/reservation/res-456/payments/init");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              paymentUrl: "https://sep.shaparak.ir/OnlinePayment?token=token-abc-123",
              authority: "A00000000000000000000000000000000000",
              transactionId: "tx-789",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const res = await paymentService.initPayment("gc-123", "res-456", "idempotency-uuid-001");

      expect(requests.length).toBe(1);
      expect(requests[0].headers.get("idempotency-key")).toBe("idempotency-uuid-001");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-test-token");
      expect(res.paymentUrl).toBe("https://sep.shaparak.ir/OnlinePayment?token=token-abc-123");
      expect(res.authority).toBe("A00000000000000000000000000000000000");
    });

    it("handles 400 Bad Request / Validation error on payment initiation", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            statusCode: 400,
            error: "Bad Request",
            message: "Reservation already has an active payment session or is in invalid state",
            code: "INVALID_RESERVATION_PAYMENT_STATE",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      await expect(
        paymentService.initPayment("gc-123", "res-456", "idempotency-uuid-002")
      ).rejects.toThrow(ApiError);
    });

    it("handles 409 Conflict when payment idempotency key is currently processing", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            statusCode: 409,
            error: "Conflict",
            message: "A payment initiation request with this idempotency key is currently being processed",
            code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      await expect(
        paymentService.initPayment("gc-123", "res-456", "idempotency-uuid-003")
      ).rejects.toThrow(ApiError);
    });
  });

  describe("2. Payment Verification via GET Callback (GET .../payments/verify)", () => {
    it("verifies payment redirect callback with Authority and Status query params", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/gamingCenters/gc-123/reservation/res-456/payments/verify");
        expect(url).toContain("Authority=A000123");
        expect(url).toContain("Status=OK");
        expect(init?.method).toBe("GET");

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              status: "PAID",
              paymentState: "PAID",
              transactionId: "tx-verified-100",
              trackingCode: "889900",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const res = await paymentService.verifyPaymentRedirect("gc-123", "res-456", {
        Authority: "A000123",
        Status: "OK",
      });

      expect(requests.length).toBe(1);
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-test-token");
      expect(res.paymentState).toBe("PAID");
      expect(res.transactionId).toBe("tx-verified-100");
    });

    it("handles verification failure when gateway returns failed status or backend rejects transaction", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch((url) => {
        expect(url).toContain("Status=NOK");
        return new Response(
          JSON.stringify({
            statusCode: 400,
            error: "Bad Request",
            message: "Payment canceled by user or rejected by bank",
            code: "PAYMENT_VERIFICATION_FAILED",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      await expect(
        paymentService.verifyPaymentRedirect("gc-123", "res-456", {
          Authority: "A000123",
          Status: "NOK",
        })
      ).rejects.toThrow(ApiError);
    });

    it("handles repeated callback verification gracefully (idempotent / already verified)", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch((url) => {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              status: "ALREADY_VERIFIED",
              paymentState: "PAID",
              transactionId: "tx-verified-100",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const res = await paymentService.verifyPaymentRedirect("gc-123", "res-456", {
        Authority: "A000123",
        Status: "OK",
      });

      expect(res.paymentState).toBe("PAID");
      expect(res.status).toBe("ALREADY_VERIFIED");
    });
  });

  describe("3. Payment Verification via POST Manual (POST .../payments/verify)", () => {
    it("submits manual verification payload with authority and paymentId", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/gamingCenters/gc-123/reservation/res-456/payments/verify");
        expect(init?.method).toBe("POST");
        const parsedBody = JSON.parse(requests[requests.length - 1].body || "{}");
        expect(parsedBody).toEqual({
          authority: "A000999",
          paymentId: "pay-555",
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              paymentState: "PAID",
              reservation: {
                id: "res-456",
                status: "CONFIRMED",
                paymentState: "PAID",
              },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const res = await paymentService.verifyPaymentManual("gc-123", "res-456", {
        authority: "A000999",
        paymentId: "pay-555",
      });

      expect(requests.length).toBe(1);
      expect(res.paymentState).toBe("PAID");
      expect(res.reservation?.id).toBe("res-456");
      expect(res.reservation?.status).toBe("CONFIRMED");
    });
  });

  describe("4. Payment Status Query (GET .../payments/status)", () => {
    it("retrieves current payment status from backend without client fabrication", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/gamingCenters/gc-123/reservation/res-456/payments/status");
        expect(init?.method).toBe("GET");

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              paymentState: "PAID",
              status: "SUCCESSFUL",
              amount: 5000000,
              currency: "IRR",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const status = await paymentService.getPaymentStatus("gc-123", "res-456");

      expect(requests.length).toBe(1);
      expect(status.paymentState).toBe("PAID");
      expect(status.amount).toBe(5000000);
    });

    it("handles all documented paymentState values correctly", async () => {
      const states: PaymentState[] = [
        "UNPAID",
        "PENDING",
        "PARTIALLY_PAID",
        "PAID",
        "REFUNDED",
        "OVERPAID",
        "FAILED",
        "CANCELED",
      ];

      for (const st of states) {
        setupMockFetch(() =>
          new Response(
            JSON.stringify({
              success: true,
              data: { paymentState: st },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );

        const status = await paymentService.getPaymentStatus("gc-123", "res-456");
        expect(status.paymentState).toBe(st);
      }
    });

    it("propagates 404 when reservation or payment record is not found", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            statusCode: 404,
            error: "Not Found",
            message: "Reservation or payment session not found",
            code: "NOT_FOUND",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      await expect(
        paymentService.getPaymentStatus("gc-123", "non-existent-res")
      ).rejects.toThrow(ApiError);
    });
  });

  describe("5. Security & Edge Cases", () => {
    it("handles malformed JSON response safely", async () => {
      setTokens({ accessToken: "customer-test-token" });

      setupMockFetch(() => {
        return new Response("<html>Gateway 502 Bad Gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        });
      });

      await expect(
        paymentService.initPayment("gc-123", "res-456", "idempotency-key-xyz")
      ).rejects.toThrow();
    });

    it("respects AbortSignal for user cancellation or timeout", async () => {
      setTokens({ accessToken: "customer-test-token" });

      const controller = new AbortController();
      controller.abort();

      setupMockFetch(() => {
        return new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await expect(
        paymentService.getPaymentStatus("gc-123", "res-456", controller.signal)
      ).rejects.toThrow();
    });

    it("ensures no client secret or private credentials are included in browser client requests", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      setupMockFetch(() => {
        return new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      await paymentService.initPayment("gc-123", "res-456", "idempotency-safe-key");

      const headers = requests[0].headers;
      expect(headers.has("x-api-key")).toBe(false);
      expect(headers.has("x-signature")).toBe(false);
      expect(headers.get("Authorization")).toBe("Bearer customer-jwt-token");
    });
  });
});
