import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService, AuthUser } from "./authService";
import { setTokens, clearTokens, getAccessToken } from "@/lib/token";
import { ContractGapError } from "@/types/customerApi";

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

describe("Phase 15: Customer Profile and Account Data", () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: Array<{ url: string; method: string; headers: Headers; body?: string }>;

  beforeEach(() => {
    clearTokens();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    requests = [];
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  function setupMockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as any).url;
      const method = init?.method || "GET";
      const headers = new Headers(init?.headers);
      const body = init?.body ? String(init.body) : undefined;
      requests.push({ url, method, headers, body });
      return handler(url, init);
    }) as any;
  }

  describe("1. Authenticated Profile Loading via GET /customer/me", () => {
    it("fetches authenticated customer profile with Bearer token attached", async () => {
      setTokens({ accessToken: "customer-bearer-jwt" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/customer/me");
        expect(init?.headers).toBeDefined();
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "cust-101",
              phone: "09121112233",
              fullName: "سهراب سپهری",
              phoneVerifiedAt: "2026-01-10T12:00:00.000Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const profile = await authService.getMe();
      expect(profile.id).toBe("cust-101");
      expect(profile.phone).toBe("09121112233");
      expect(profile.fullName).toBe("سهراب سپهری");
      expect(profile.phoneVerifiedAt).toBe("2026-01-10T12:00:00.000Z");

      expect(requests.length).toBe(1);
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-bearer-jwt");
    });

    it("unwraps flat customer payload seamlessly", async () => {
      setTokens({ accessToken: "customer-jwt-flat" });

      setupMockFetch((url) => {
        return new Response(
          JSON.stringify({
            id: "cust-102",
            phone: "09987654321",
            fullName: "پروین اعتصامی",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const profile = await authService.getMe();
      expect(profile.id).toBe("cust-102");
      expect(profile.fullName).toBe("پروین اعتصامی");
    });
  });

  describe("2. Authorization Scoping & Current-User Identity Isolation", () => {
    it("never attaches client-supplied customer IDs in query parameters or request body", async () => {
      setTokens({ accessToken: "customer-token-no-leak" });

      setupMockFetch((url) => {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "real-server-id-99", phone: "09120000000", fullName: "کاربر تایید شده" },
          }),
          { status: 200 }
        );
      });

      const profile = await authService.getMe();
      expect(profile.id).toBe("real-server-id-99");
      expect(requests[0].url).not.toContain("customerId=");
      expect(requests[0].url).not.toContain("userId=");
    });

    it("handles 401 Unauthorized and propagates authentication failure when refresh fails", async () => {
      setTokens({ accessToken: "expired-token", refreshToken: "invalid-refresh" });

      setupMockFetch((url) => {
        if (url.includes("/auth/refresh")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "UNAUTHORIZED", message: "Invalid refresh token" },
            }),
            { status: 401 }
          );
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token expired" },
          }),
          { status: 401 }
        );
      });

      await expect(authService.getMe()).rejects.toThrow();
      expect(getAccessToken()).toBeNull();
    });

    it("handles 403 Forbidden without exposing mock customer identities", async () => {
      setTokens({ accessToken: "forbidden-role-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "FORBIDDEN", message: "Access forbidden for this account role" },
          }),
          { status: 403 }
        );
      });

      await expect(authService.getMe()).rejects.toThrow();
    });
  });

  describe("3. Error Propagation & Network Failures", () => {
    it("propagates 500 Internal Server Error cleanly without falling back to mock user", async () => {
      setTokens({ accessToken: "valid-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Database connection failed" },
          }),
          { status: 500 }
        );
      });

      await expect(authService.getMe()).rejects.toThrow();
    });

    it("propagates network connection exceptions without fake profile generation", async () => {
      setTokens({ accessToken: "valid-token" });

      globalThis.fetch = (() => {
        return Promise.reject(new TypeError("Failed to fetch"));
      }) as any;

      await expect(authService.getMe()).rejects.toThrow();
    });
  });

  describe("4. Customer Profile Update via PATCH /customer/me & Unsupported Mutations", () => {
    it("updates fullName via PATCH /customer/me with authenticated Bearer token", async () => {
      setTokens({ accessToken: "active-customer-jwt" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/customer/me");
        expect(init?.method).toBe("PATCH");
        const body = JSON.parse(init?.body as string);
        expect(body).toEqual({ fullName: "نام و نام خانوادگی جدید" });

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "cust-101",
              phone: "09121112233",
              fullName: "نام و نام خانوادگی جدید",
              role: "CUSTOMER",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const updated = await authService.updateProfile({ fullName: "نام و نام خانوادگی جدید" });
      expect(updated.fullName).toBe("نام و نام خانوادگی جدید");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("PATCH");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer active-customer-jwt");
    });

    it("propagates error on PATCH /customer/me failure without local mock fallback", async () => {
      setTokens({ accessToken: "active-customer-jwt" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "SERVER_ERROR", message: "خطا در بروزرسانی پروفایل" },
          }),
          { status: 500 }
        );
      });

      await expect(authService.updateProfile({ fullName: "نام تست" })).rejects.toThrow();
    });

    it("throws ContractGapError on wallet operations because customer wallet is missing in OpenAPI v1.0", () => {
      expect(() => authService.walletUnsupported()).toThrow(ContractGapError);
      try {
        authService.walletUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerWallet");
        expect(err.message).toContain("wallet endpoints are not defined");
      }
    });
  });

  describe("5. OTP Verification & Profile Hydration Flow", () => {
    it("verifies OTP and obtains tokens + user profile", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/auth/customer/otp/verify");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "newly-issued-access-jwt",
              refreshToken: "newly-issued-refresh-jwt",
              user: {
                id: "cust-202",
                phone: "09351234567",
                fullName: "علی دهباشی",
              },
            },
          }),
          { status: 200 }
        );
      });

      const res = await authService.verifyOtp("09351234567", "1234");
      expect(res.accessToken).toBe("newly-issued-access-jwt");
      expect(res.refreshToken).toBe("newly-issued-refresh-jwt");
      expect(res.user?.id).toBe("cust-202");
      expect(res.user?.fullName).toBe("علی دهباشی");
    });
  });
});
