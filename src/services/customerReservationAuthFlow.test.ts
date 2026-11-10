import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { clearTokens, getAccessToken, setTokens } from "@/lib/token";
import { authService } from "@/services/authService";
import { groupReservationApi } from "@/services/gaming-center/group-reservation.api";
import type { GroupReservationPayload } from "@/types/gaming-center/group-reservation.types";
import { ApiError } from "@/lib/api/client";

// Setup storage mock for local storage testing
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Customer Reservation Unauthenticated Flow & OTP Modal Integration", () => {
  beforeEach(() => {
    storage.clear();
    clearTokens();
  });

  afterEach(() => {
    storage.clear();
    clearTokens();
  });

  it("1. recognizes unauthenticated state when user has not logged in", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("2. simulates requesting customer OTP and receiving OTP verification tokens without page navigation", async () => {
    const originalFetch = globalThis.fetch;
    const cleanPhone = "09123456789";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/auth/customer/otp/request")) {
        return new Response(JSON.stringify({ success: true, message: "کد تأیید ارسال شد." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/auth/customer/otp/verify")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "cust-seamless-access-jwt",
              refreshToken: "cust-seamless-refresh-jwt",
              user: {
                fullName: "علی محمدی",
                phone: cleanPhone,
                role: "USER",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    }) as unknown as typeof fetch;

    try {
      // Step A: Request OTP
      await authService.requestOtp(cleanPhone);

      // Step B: Verify OTP
      const verifyRes = await authService.verifyOtp(cleanPhone, "123456");
      expect(verifyRes.accessToken).toBe("cust-seamless-access-jwt");

      // Save tokens as done in UnifiedAuthForm / AuthContext
      setTokens(verifyRes.accessToken, verifyRes.refreshToken);

      expect(getAccessToken()).toBe("cust-seamless-access-jwt");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("3. allows group reservation submission after authentication with preserved selection payload", async () => {
    const originalFetch = globalThis.fetch;
    let authHeaderSent: string | null = null;
    let requestPayload: any = null;

    setTokens("res-test-bearer-token", "refresh-token");

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/group-reservations")) {
        const headers = init?.headers as Record<string, string>;
        authHeaderSent = headers?.Authorization || (headers as any)?.authorization || null;
        if (init?.body) {
          requestPayload = JSON.parse(init.body as string);
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "grp-res-success-123",
              trackingCode: "TRK-9876",
              startTime: requestPayload.startTime,
              durationMinutes: requestPayload.durationMinutes,
              totalPrice: 120000,
              items: requestPayload.items,
              customer: requestPayload.customer,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    }) as unknown as typeof fetch;

    try {
      const futureTime = new Date(Date.now() + 3600 * 1000 * 24).toISOString();
      const payload: GroupReservationPayload = {
        startTime: futureTime,
        durationMinutes: 120,
        items: [{ stationId: "station-ps5-01" }, { stationId: "station-ps5-02" }],
        customer: {
          fullName: "رضا کریمی",
          phone: "09129998877",
        },
        note: "دو عدد دسته اضافی",
      };

      const result = await groupReservationApi.submitGroupReservation(
        "center-test-slug",
        payload,
        "idempotency-key-seamless-test"
      );

      expect(result.id).toBe("grp-res-success-123");
      expect(result.trackingCode).toBe("TRK-9876");
      expect(authHeaderSent).toBe("Bearer res-test-bearer-token");
      expect(requestPayload.items.length).toBe(2);
      expect(requestPayload.customer.fullName).toBe("رضا کریمی");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("4. handles 401 error during submission to prompt re-authentication", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("/group-reservations")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "نشست کاربری نامعتبر است.",
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    }) as unknown as typeof fetch;

    try {
      const futureTime = new Date(Date.now() + 3600 * 1000 * 24).toISOString();
      const payload: GroupReservationPayload = {
        startTime: futureTime,
        durationMinutes: 60,
        items: [{ stationId: "station-pc-01" }],
        customer: {
          fullName: "سارا حسینی",
          phone: "09121112233",
        },
      };

      let thrownErr: any = null;
      try {
        await groupReservationApi.submitGroupReservation(
          "slug-unauth",
          payload,
          "test-idem-401"
        );
      } catch (err) {
        thrownErr = err;
      }

      expect(thrownErr).toBeInstanceOf(ApiError);
      expect(thrownErr.status).toBe(401);
      expect(thrownErr.code).toBe("UNAUTHORIZED");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
