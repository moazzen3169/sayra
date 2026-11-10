import { describe, it, expect, beforeEach } from "bun:test";
import { paymentService } from "./paymentService";
import { apiClient } from "@/lib/api/client";

describe("paymentService API Contract Conformance", () => {
  beforeEach(() => {
    // reset mocks if needed
  });

  it("initiates payment via POST /gamingCenters/{id}/reservation/{id}/payments/init with idempotency key", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const originalPost = apiClient.post;
    (apiClient as any).post = async (url: string, body: any, options: any) => {
      capturedUrl = url;
      capturedHeaders = options?.headers || {};
      return {
        data: {
          success: true,
          data: {
            paymentUrl: "https://gateway.example.com/pay/abc1234",
            authority: "abc1234",
            trackingCode: "TRK-9999",
          },
        },
      };
    };

    try {
      const res = await paymentService.initPayment("gc-100", "res-200", "idem-uuid-1");
      expect(capturedUrl).toBe("/gamingCenters/gc-100/reservation/res-200/payments/init");
      expect(capturedHeaders["idempotency-key"]).toBe("idem-uuid-1");
      expect(res.paymentUrl).toBe("https://gateway.example.com/pay/abc1234");
      expect(res.authority).toBe("abc1234");
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("verifies payment via GET /gamingCenters/{id}/reservation/{id}/payments/verify?Authority=...&Status=...", async () => {
    let capturedUrl = "";
    let capturedQuery: any = {};

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string, options: any) => {
      capturedUrl = url;
      capturedQuery = options?.query || {};
      return {
        data: {
          success: true,
          data: {
            paymentState: "PAID",
            reservationStatus: "CONFIRMED",
            trackingCode: "TRK-SUCCESS-1",
            amount: 250000,
          },
        },
      };
    };

    try {
      const res = await paymentService.verifyPaymentRedirect({
        gamingCenterId: "gc-100",
        reservationId: "res-200",
        authority: "auth-xyz",
        status: "OK",
      });
      expect(capturedUrl).toBe("/gamingCenters/gc-100/reservation/res-200/payments/verify");
      expect(capturedQuery.Authority).toBe("auth-xyz");
      expect(capturedQuery.Status).toBe("OK");
      expect(res.paymentState).toBe("PAID");
      expect(res.trackingCode).toBe("TRK-SUCCESS-1");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("verifies payment via POST manual verify", async () => {
    let capturedUrl = "";
    let capturedBody: any = {};

    const originalPost = apiClient.post;
    (apiClient as any).post = async (url: string, body: any) => {
      capturedUrl = url;
      capturedBody = body;
      return {
        data: {
          success: true,
          data: {
            paymentState: "PAID",
          },
        },
      };
    };

    try {
      const res = await paymentService.verifyPaymentManual("gc-100", "res-200", {
        authority: "auth-xyz",
        paymentId: "pay-123",
      });
      expect(capturedUrl).toBe("/gamingCenters/gc-100/reservation/res-200/payments/verify");
      expect(capturedBody.authority).toBe("auth-xyz");
      expect(capturedBody.paymentId).toBe("pay-123");
      expect(res.paymentState).toBe("PAID");
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("retrieves payment status via GET /gamingCenters/{id}/reservation/{id}/payments/status", async () => {
    let capturedUrl = "";

    const originalGet = apiClient.get;
    (apiClient as any).get = async (url: string) => {
      capturedUrl = url;
      return {
        data: {
          success: true,
          data: {
            paymentState: "PAID",
            amount: 300000,
          },
        },
      };
    };

    try {
      const res = await paymentService.getPaymentStatus("gc-100", "res-200");
      expect(capturedUrl).toBe("/gamingCenters/gc-100/reservation/res-200/payments/status");
      expect(res.paymentState).toBe("PAID");
      expect(res.amount).toBe(300000);
    } finally {
      apiClient.get = originalGet;
    }
  });
});
