import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService } from "./authService";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/token";

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

describe("Unified Customer Login & Registration Flow (Passwordless OTP)", () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: Array<{ url: string; method: string; body?: string }>;

  beforeEach(() => {
    clearTokens();
    requests = [];
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  function setupMockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as any).url;
      const method = init?.method || "GET";
      const body = init?.body ? String(init.body) : undefined;
      requests.push({ url, method, body });
      return handler(url, init);
    }) as any;
  }

  it("1. Requests OTP using POST /auth/customer/otp/request with phone payload", async () => {
    setupMockFetch((url) => {
      expect(url).toContain("/auth/customer/otp/request");
      return new Response(JSON.stringify({ success: true, message: "کد تأیید ارسال شد." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await authService.requestOtp("09123456789");

    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe("POST");
    expect(JSON.parse(requests[0].body || "{}")).toEqual({ phone: "09123456789" });
  });

  it("2. Verifies OTP and unifies login and registration via POST /auth/customer/otp/verify with tokens", async () => {
    setupMockFetch((url) => {
      expect(url).toContain("/auth/customer/otp/verify");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: "mock-jwt-customer-access-token",
            refreshToken: "mock-jwt-customer-refresh-token",
            user: {
              id: "cust-uuid-1234",
              phone: "09123456789",
              fullName: "کاربر جدید یا قدیمی",
              phoneVerifiedAt: "2026-03-29T10:00:00Z",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await authService.verifyOtp("09123456789", "123456");

    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe("POST");
    expect(JSON.parse(requests[0].body || "{}")).toEqual({
      phone: "09123456789",
      code: "123456",
    });

    expect(res.accessToken).toBe("mock-jwt-customer-access-token");
    expect(res.refreshToken).toBe("mock-jwt-customer-refresh-token");
    expect(res.user?.id).toBe("cust-uuid-1234");
    expect(res.user?.phone).toBe("09123456789");

    // Dual persistence test
    setTokens(res.accessToken, res.refreshToken);
    expect(getAccessToken()).toBe("mock-jwt-customer-access-token");
    expect(getRefreshToken()).toBe("mock-jwt-customer-refresh-token");
  });
});
