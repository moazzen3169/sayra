import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "./ownerService";
import { setTokens, clearTokens } from "@/lib/token";

describe("Owner Center Creation & Redirect Loop Prevention Integration", () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequests: { url: string; method: string; body?: any }[] = [];

  beforeEach(() => {
    clearTokens();
    interceptedRequests = [];
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("1. Resolves center via findCenter when storedCenterId is queried", async () => {
    setTokens({ accessToken: "owner_token_123" });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      interceptedRequests.push({ url, method });

      if (url.includes("/gamingCenters/gc-newly-created-1")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "gc-newly-created-1",
              name: "گیم‌نت پیروزی نوین",
              slug: "gamenet-piroozi-novin",
              isActive: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as any;

    const center = await ownerService.findCenter("gc-newly-created-1");
    expect(center).not.toBeNull();
    expect(center?.id).toBe("gc-newly-created-1");
    expect(center?.name).toBe("گیم‌نت پیروزی نوین");
    expect(interceptedRequests.some((r) => r.url.includes("/gamingCenters/gc-newly-created-1"))).toBe(true);
  });

  it("2. Handles 404 cleanly when stored center ID is non-existent", async () => {
    setTokens({ accessToken: "owner_token_123" });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      interceptedRequests.push({ url, method });

      if (url.includes("/gamingCenters/invalid-center-id")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "گیم‌نت یافت نشد",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/gamingCenters")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as any;

    const center = await ownerService.findCenter("invalid-center-id");
    expect(center).toBeNull();
  });

  it("3. Successfully creates a gaming center and returns the persistent ID for localStorage", async () => {
    setTokens({ accessToken: "owner_token_123" });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "POST";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      interceptedRequests.push({ url, method, body });

      if (url.includes("/gamingCenters") && method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "gc-9988-created",
              name: body?.name,
              slug: body?.slug,
              ownerId: body?.ownerId,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as any;

    const created = await ownerService.createGamingCenter({
      name: "گیم‌نت آریا",
      slug: "gamenet-aria",
      ownerId: "owner-123",
    });

    expect(created.id).toBe("gc-9988-created");
    expect(created.name).toBe("گیم‌نت آریا");
  });
});
