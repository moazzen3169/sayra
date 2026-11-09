import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService } from "./authService";
import { apiClient } from "@/lib/api/client";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/token";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/api/config";

// Setup localStorage and cookie environment
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Frontend Authentication Flow & Token Lifecycle Integration", () => {
  let originalFetch: typeof globalThis.fetch;
  let interceptedRequests: Array<{ url: string; method: string; headers?: Record<string, string>; body?: string }>;

  beforeEach(() => {
    clearTokens();
    storage.clear();
    interceptedRequests = [];
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    storage.clear();
  });

  function setupFetchMock(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as any).url;
      const method = init?.method || "GET";
      const headers = (init?.headers as Record<string, string>) || {};
      const body = init?.body ? String(init.body) : undefined;
      interceptedRequests.push({ url, method, headers, body });
      return handler(url, init);
    }) as any;
  }

  it("1. extracts tokens correctly when backend responds with response.data.data.tokens", async () => {
    setupFetchMock((url) => {
      expect(url).toContain("/auth/customer/otp/verify");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tokens: {
              accessToken: "jwt-nested-access-token-123",
              refreshToken: "jwt-nested-refresh-token-456",
            },
            user: {
              id: "usr-99",
              phone: "09121112233",
              fullName: "کاربر تستی",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await authService.verifyOtp("09121112233", "1234");
    expect(res.accessToken).toBe("jwt-nested-access-token-123");
    expect(res.refreshToken).toBe("jwt-nested-refresh-token-456");
    expect(res.user?.fullName).toBe("کاربر تستی");

    // Persist and verify in LocalStorage
    setTokens(res.accessToken, res.refreshToken);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("jwt-nested-access-token-123");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("jwt-nested-refresh-token-456");
    expect(getAccessToken()).toBe("jwt-nested-access-token-123");
    expect(getRefreshToken()).toBe("jwt-nested-refresh-token-456");
  });

  it("2. extracts tokens correctly when backend responds with flat response.data.accessToken", async () => {
    setupFetchMock((url) => {
      expect(url).toContain("/auth/customer/otp/verify");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: "jwt-flat-access-token-789",
            refreshToken: "jwt-flat-refresh-token-012",
            user: {
              id: "usr-100",
              phone: "09129998877",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await authService.verifyOtp("09129998877", "5678");
    expect(res.accessToken).toBe("jwt-flat-access-token-789");
    expect(res.refreshToken).toBe("jwt-flat-refresh-token-012");
  });

  it("3. sends Authorization: Bearer <token> header on authenticated requests", async () => {
    setTokens({
      accessToken: "my-valid-bearer-token",
      refreshToken: "my-refresh-token",
    });

    setupFetchMock((url, init) => {
      const headers = (init?.headers as Record<string, string>) || {};
      expect(headers.Authorization).toBe("Bearer my-valid-bearer-token");
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: "usr-1", fullName: "احسان" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    await apiClient.get("/customer/me");
    expect(interceptedRequests.length).toBe(1);
    expect(interceptedRequests[0].headers?.Authorization).toBe("Bearer my-valid-bearer-token");
  });

  it("4. handles token refresh on 401 and replays request with new token", async () => {
    setTokens({
      accessToken: "expired-token",
      refreshToken: "valid-refresh-token",
    });

    let callCount = 0;
    setupFetchMock((url) => {
      if (url.includes("/customer/me")) {
        callCount++;
        if (callCount === 1) {
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
            data: { id: "usr-1", fullName: "کاربر بروزشده" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: "new-fresh-access-token" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const res = await apiClient.get<any>("/customer/me");
    expect(res.data.fullName).toBe("کاربر بروزشده");
    expect(getAccessToken()).toBe("new-fresh-access-token");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("new-fresh-access-token");
  });

  it("5. purges all tokens from LocalStorage upon logout", async () => {
    setTokens({
      accessToken: "token-to-delete",
      refreshToken: "refresh-to-delete",
    });
    expect(getAccessToken()).toBe("token-to-delete");

    setupFetchMock((url) => {
      if (url.includes("/auth/logout")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    });

    await authService.logout();
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
