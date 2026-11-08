import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService } from "./authService";
import { adminService } from "./adminService";
import { setTokens, clearTokens } from "@/lib/token";

describe("Admin Authentication & Gamecenters API Suite", () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequests: { url: string; method: string; body?: any; headers?: Headers }[] = [];

  beforeEach(() => {
    interceptedRequests = [];
    clearTokens();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  describe("Admin Email/Password Login", () => {
    it("successfully logs in platform admin with email and password via /auth/platform-admin/login", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        interceptedRequests.push({ url, method, body });

        if (url.includes("/auth/platform-admin/login")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                accessToken: "admin-jwt-token-xyz",
                refreshToken: "admin-refresh-token-xyz",
                user: {
                  id: "admin-1",
                  fullName: "مدیر ارشد پلتفرم",
                  email: "admin@sayra.ir",
                  phone: "admin@sayra.ir",
                  role: "ADMIN",
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const res = await authService.loginPlatformAdminWithEmail("admin@sayra.ir", "SecretAdminPass123!");

      expect(res.accessToken).toBe("admin-jwt-token-xyz");
      expect(res.refreshToken).toBe("admin-refresh-token-xyz");
      expect(res.user?.role).toBe("ADMIN");
      expect(interceptedRequests.length).toBe(1);
      expect(interceptedRequests[0].method).toBe("POST");
      expect(interceptedRequests[0].url).toContain("/auth/platform-admin/login");
      expect(interceptedRequests[0].body.email).toBe("admin@sayra.ir");
    });
  });

  describe("Admin Gamecenters Management API", () => {
    beforeEach(() => {
      setTokens({ accessToken: "admin-jwt-token-xyz", refreshToken: "admin-refresh-token-xyz" });
    });

    it("fetches gaming centers list from GET /platform-admin/gaming-centers", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        interceptedRequests.push({ url, method });

        if (url.includes("/platform-admin/gaming-centers")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: "gc-101",
                  name: "گیمنت گرگدن",
                  slug: "gorgodan",
                  isActive: true,
                  city: "تهران",
                  address: "خیابان ولیعصر",
                  ownerName: "علی رضایی",
                  phone: "09123456789",
                  rating: 4.8,
                  stationsCount: 12,
                },
              ],
              meta: {
                pagination: {
                  total: 1,
                  page: 1,
                  totalPages: 1,
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const result = await adminService.getGamecenters({ page: 1, pageSize: 10 });
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("گیمنت گرگدن");
      expect(result.items[0].slug).toBe("gorgodan");
      expect(interceptedRequests[0].url).toContain("/platform-admin/gaming-centers");
    });

    it("updates gaming center details and slug via PATCH /gamingCenters/{id}", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        interceptedRequests.push({ url, method, body });

        if (url.includes("/gamingCenters/gc-101")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-101",
                name: "گیمنت گرگدن وی آی پی",
                slug: "gorgodan-vip",
                address: "خیابان ولیعصر پلاک ۱",
                phone: "09129998877",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const updated = await adminService.updateGamecenter("gc-101", {
        name: "گیمنت گرگدن وی آی پی",
        slug: "gorgodan-vip",
        address: "خیابان ولیعصر پلاک ۱",
        phone: "09129998877",
      });

      expect(updated.name).toBe("گیمنت گرگدن وی آی پی");
      expect(updated.slug).toBe("gorgodan-vip");
      expect(interceptedRequests.some((r) => r.method === "PATCH" && r.url.includes("/gamingCenters/gc-101"))).toBe(true);
    });

    it("deletes gaming center via DELETE /gamingCenters/{id}", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        interceptedRequests.push({ url, method });

        if (url.includes("/gamingCenters/gc-101") && method === "DELETE") {
          return new Response(
            JSON.stringify({
              success: true,
              message: "Gaming center deleted successfully",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const deleted = await adminService.deleteGamecenter("gc-101");
      expect(deleted).toBe(true);
      expect(interceptedRequests[0].method).toBe("DELETE");
      expect(interceptedRequests[0].url).toContain("/gamingCenters/gc-101");
    });

    it("uploads media for gaming center via POST /gamingCenters/{gamingCenterId}/media/upload", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        interceptedRequests.push({ url, method });

        if (url.includes("/gamingCenters/gc-101/media/upload")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "med-1",
                url: "https://cdn.sayra.ir/uploads/gc-1.webp",
                altText: "سالن کنسول",
                purpose: "GALLERY",
              },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const fakeFile = new File(["dummy content"], "gc-room.jpg", { type: "image/jpeg" });
      const media = await adminService.uploadGamecenterMedia("gc-101", fakeFile, "GALLERY", "سالن کنسول");

      expect(media.id).toBe("med-1");
      expect(media.url).toBe("https://cdn.sayra.ir/uploads/gc-1.webp");
      expect(interceptedRequests[0].method).toBe("POST");
      expect(interceptedRequests[0].url).toContain("/gamingCenters/gc-101/media/upload");
    });
  });
});
