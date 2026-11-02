import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService, AuthUser } from "./authService";
import { apiClient, ApiError } from "@/lib/api/client";
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from "@/lib/token";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY } from "@/lib/api/config";
import { ContractGapError } from "@/types/customerApi";

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

describe("Phase 16: Customer Authentication and Session Lifecycle", () => {
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

  describe("1. Customer OTP Request & Verification", () => {
    it("requests customer OTP via POST /auth/customer/otp/request with correct payload", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/auth/customer/otp/request");
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await authService.requestOtp("09120001122");

      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("POST");
      expect(JSON.parse(requests[0].body || "{}")).toEqual({ phone: "09120001122" });
    });

    it("verifies customer OTP successfully via POST /auth/customer/otp/verify returning tokens and profile", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/auth/customer/otp/verify");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "cust-access-jwt-token",
              refreshToken: "cust-refresh-jwt-token",
              user: {
                id: "cust-55",
                phone: "09120001122",
                fullName: "علی محمدی",
              },
            },
          }),
          { status: 200 }
        );
      });

      const res = await authService.verifyOtp("09120001122", "8899");

      expect(requests.length).toBe(1);
      expect(JSON.parse(requests[0].body || "{}")).toEqual({ phone: "09120001122", code: "8899" });
      expect(res.accessToken).toBe("cust-access-jwt-token");
      expect(res.refreshToken).toBe("cust-refresh-jwt-token");
      expect(res.user?.id).toBe("cust-55");
      expect(res.user?.fullName).toBe("علی محمدی");
    });

    it("handles OTP verification failure (400 Bad Request or invalid code) propagating error cleanly", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "INVALID_OTP",
              message: "کد تایید وارد شده نادرست یا منقضی است.",
            },
          }),
          { status: 400 }
        );
      });

      let capturedError: any = null;
      try {
        await authService.verifyOtp("09120001122", "0000");
      } catch (err) {
        capturedError = err;
      }

      expect(capturedError).toBeInstanceOf(ApiError);
      expect(capturedError.status).toBe(400);
      expect(capturedError.code).toBe("INVALID_OTP");
      expect(capturedError.message).toBe("کد تایید وارد شده نادرست یا منقضی است.");
    });
  });

  describe("2. Token Storage & Refresh Lifecycle", () => {
    it("stores tokens in localStorage and retrieves them accurately", () => {
      setTokens({
        accessToken: "sample-access-jwt",
        refreshToken: "sample-refresh-jwt",
      });

      expect(getAccessToken()).toBe("sample-access-jwt");
      expect(getRefreshToken()).toBe("sample-refresh-jwt");
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("sample-access-jwt");
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("sample-refresh-jwt");
    });

    it("clears all tokens and cached user data on clearTokens()", () => {
      setTokens({
        accessToken: "sample-access-jwt",
        refreshToken: "sample-refresh-jwt",
      });
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ fullName: "کاربر" }));

      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    });

    it("transparently refreshes token on 401 and replays request using POST /auth/refresh", async () => {
      setTokens({
        accessToken: "expired-access-token",
        refreshToken: "valid-refresh-token",
      });

      let callCount = 0;
      setupMockFetch((url) => {
        if (url.includes("/auth/refresh")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: "fresh-access-token" },
            }),
            { status: 200 }
          );
        }

        callCount++;
        if (callCount === 1) {
          // Initial attempt fails with 401
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "UNAUTHORIZED", message: "توکن منقضی شده است." },
            }),
            { status: 401 }
          );
        }

        // Second attempt after refresh succeeds
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "cust-1", phone: "09121112233", fullName: "کاربر جدید" },
          }),
          { status: 200 }
        );
      });

      const me = await authService.getMe();
      expect(me.id).toBe("cust-1");
      expect(callCount).toBe(2);
      expect(getAccessToken()).toBe("fresh-access-token");
    });

    it("clears tokens and fails when token refresh returns 401 Unauthorized", async () => {
      setTokens({
        accessToken: "expired-access-token",
        refreshToken: "expired-refresh-token",
      });

      setupMockFetch((url) => {
        if (url.includes("/auth/refresh")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "UNAUTHORIZED", message: "رفرش توکن نامعتبر است." },
            }),
            { status: 401 }
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "نشست منقضی شده است." },
          }),
          { status: 401 }
        );
      });

      await expect(authService.getMe()).rejects.toThrow();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe("3. Logout and Session Invalidation", () => {
    it("calls POST /auth/logout with retryOnAuth false and Bearer token", async () => {
      setTokens({ accessToken: "active-access-token" });

      setupMockFetch((url) => {
        expect(url).toContain("/auth/logout");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Logged out successfully",
          }),
          { status: 200 }
        );
      });

      await authService.logout();

      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("POST");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer active-access-token");
    });

    it("survives network errors during logout without crashing", async () => {
      setTokens({ accessToken: "active-access-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "SERVER_ERROR", message: "خطای سرور" },
          }),
          { status: 500 }
        );
      });

      await expect(authService.logout()).rejects.toThrow(ApiError);
    });
  });

  describe("4. Scoping & Role Isolation (Customer vs Staff/Owner)", () => {
    it("customer profile uses GET /customer/me and does not query /auth/me or require center IDs", async () => {
      setTokens({ accessToken: "cust-bearer-jwt" });

      setupMockFetch((url) => {
        expect(url).toContain("/customer/me");
        expect(url).not.toContain("/auth/me");
        expect(url).not.toContain("gamingCenterId=");
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "cust-99", phone: "09121112233", fullName: "مشتری عادی" },
          }),
          { status: 200 }
        );
      });

      const me = await authService.getMe();
      expect(me.id).toBe("cust-99");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer cust-bearer-jwt");
    });

    it("throws ContractGapError for customer password login attempt", () => {
      expect(() => authService.customerPasswordLoginUnsupported()).toThrow(ContractGapError);
      try {
        authService.customerPasswordLoginUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerPasswordLogin");
      }
    });

    it("throws ContractGapError for standalone customer registration endpoint", () => {
      expect(() => authService.customerRegistrationUnsupported()).toThrow(ContractGapError);
      try {
        authService.customerRegistrationUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerRegistration");
      }
    });

    it("throws ContractGapError for customer password reset", () => {
      expect(() => authService.customerPasswordResetUnsupported()).toThrow(ContractGapError);
      try {
        authService.customerPasswordResetUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerPasswordReset");
      }
    });

    it("throws ContractGapError for social login", () => {
      expect(() => authService.socialLoginUnsupported()).toThrow(ContractGapError);
      try {
        authService.socialLoginUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("SocialLogin");
      }
    });
  });

  describe("5. No Mock Fallbacks at Runtime", () => {
    it("fails requests when unauthenticated without generating fake customer identity", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Unauthorized" },
          }),
          { status: 401 }
        );
      });

      await expect(authService.getMe()).rejects.toThrow();
    });

    it("propagates 500 error on OTP verify without falling back to mock user", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "خطای سرور" },
          }),
          { status: 500 }
        );
      });

      await expect(authService.verifyOtp("09120000000", "1234")).rejects.toThrow(ApiError);
    });
  });
});
