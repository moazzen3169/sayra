import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "@/services/ownerService";
import { apiClient, ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Phase 9 Task 2: Authentication Tests", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearTokens();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  it("handles anonymous user (no token in headers)", async () => {
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "توکن معتبر ارسال نشده است." },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let error: any = null;
    try {
      await ownerService.getMe();
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(401);
    expect(capturedHeaders).toBeDefined();
    const headersRecord = (capturedHeaders as Record<string, string>) || {};
    expect(headersRecord["Authorization"]).toBeUndefined();
  });

  it("handles valid Owner authentication with Bearer token", async () => {
    setTokens({ accessToken: "valid-owner-jwt", refreshToken: "valid-refresh-token" });

    let capturedAuth = "";
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const headers = (init?.headers as Record<string, string>) || {};
      capturedAuth = headers["Authorization"] || "";
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "owner-99",
            fullName: "مالک نمونه",
            phone: "09121112233",
            role: "OWNER",
            gamingCenters: [
              { id: "gc-101", name: "گیمنت نمونه", slug: "sample-center" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();
    expect(capturedAuth).toBe("Bearer valid-owner-jwt");
    expect(me.id).toBe("owner-99");
    expect(me.role).toBe("OWNER");
    expect(me.gamingCenters?.length).toBe(1);
  });

  it("handles invalid token returning 401 UNAUTHORIZED", async () => {
    setTokens({ accessToken: "invalid-jwt", refreshToken: "refresh-token" });

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "INVALID_TOKEN", message: "توکن نامعتبر است." },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let error: any = null;
    try {
      await apiClient.get("/auth/me", { retryOnAuth: false });
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(401);
    expect(error.code).toBe("INVALID_TOKEN");
  });

  it("handles expired token by attempting refresh token flow", async () => {
    setTokens({ accessToken: "expired-jwt", refreshToken: "valid-refresh-jwt" });
    let callCount = 0;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: "fresh-jwt-token" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "TOKEN_EXPIRED", message: "توکن منقضی شده است." },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const headers = (init?.headers as Record<string, string>) || {};
      expect(headers["Authorization"]).toBe("Bearer fresh-jwt-token");
      return new Response(
        JSON.stringify({
          success: true,
          data: { id: "owner-99", fullName: "مالک نمونه", role: "OWNER" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();
    expect(me.id).toBe("owner-99");
    expect(callCount).toBe(2);
  });

  it("identifies Customer role attempting to access Owner endpoints", async () => {
    setTokens({ accessToken: "customer-jwt", refreshToken: "refresh-token" });

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "customer-1",
            fullName: "مشتری عادی",
            role: "CUSTOMER",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();
    expect(me.role?.toUpperCase()).toBe("CUSTOMER");
    expect(me.gamingCenters).toBeUndefined();
  });

  it("handles Owner attempting to access unauthorized center (403 Forbidden)", async () => {
    setTokens({ accessToken: "owner-jwt", refreshToken: "refresh-token" });

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/other-center/reservation")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "FORBIDDEN", message: "شما دسترسی به این گیم‌نت ندارید." },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    let error: any = null;
    try {
      await ownerService.listReservationsPaginated("other-center");
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("handles forbidden API response across owner routes without fake data", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "FORBIDDEN", message: "مجوز لازم موجود نیست." },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await expect(ownerService.listStations("gc-forbidden")).rejects.toThrow();
    await expect(ownerService.getAnalyticsSummary("gc-forbidden")).rejects.toThrow();
  });
});
