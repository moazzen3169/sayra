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

  describe("Platform Admin Two-Step 2FA Login", () => {
    it("completes Step 1 (TOTP_REQUIRED) and Step 2 (verify-2fa) via platform-admin endpoints", async () => {
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
                status: "TOTP_REQUIRED",
                requiresTwoFactor: true,
                requiresTwoFactorSetup: false,
                challengeToken: "ephemeral-challenge-jwt",
                expiresIn: 300,
                admin: {
                  id: "admin-1",
                  username: "superadmin",
                  fullName: "مدیر ارشد پلتفرم",
                  email: "admin@sayra.ir",
                  totpEnabled: true,
                  totpSetupCompleted: true,
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (url.includes("/auth/platform-admin/verify-2fa")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                accessToken: "admin-jwt-token-xyz",
                refreshToken: "admin-refresh-token-xyz",
                sessionId: "sess-1",
                admin: {
                  id: "admin-1",
                  username: "superadmin",
                  fullName: "مدیر ارشد پلتفرم",
                  email: "admin@sayra.ir",
                  isSuperuser: true,
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const step1 = await authService.loginPlatformAdmin(
        "admin@sayra.ir",
        "SecretAdminPass123!"
      );

      expect(step1.status).toBe("TOTP_REQUIRED");
      expect(step1.challengeToken).toBe("ephemeral-challenge-jwt");
      expect(step1.requiresTwoFactor).toBe(true);
      expect(interceptedRequests[0].method).toBe("POST");
      expect(interceptedRequests[0].url).toContain("/auth/platform-admin/login");
      expect(interceptedRequests[0].body.identifier).toBe("admin@sayra.ir");
      expect(interceptedRequests[0].body.email).toBe("admin@sayra.ir");

      const step2 = await authService.verifyPlatformAdmin2fa({
        challengeToken: step1.challengeToken!,
        code: "۱۲۳۴۵۶",
      });

      expect(step2.accessToken).toBe("admin-jwt-token-xyz");
      expect(step2.refreshToken).toBe("admin-refresh-token-xyz");
      expect(interceptedRequests[1].url).toContain(
        "/auth/platform-admin/verify-2fa"
      );
      expect(interceptedRequests[1].body.code).toBe("123456");
    });

    it("supports mandatory initial 2FA setup (TOTP_SETUP_REQUIRED -> setup -> confirm)", async () => {
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
                status: "TOTP_SETUP_REQUIRED",
                requiresTwoFactor: true,
                requiresTwoFactorSetup: true,
                setupToken: "ephemeral-setup-jwt",
                expiresIn: 600,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (url.includes("/auth/platform-admin/2fa/setup")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                deviceId: "dev-1",
                secret: "JBSWY3DPEHPK3PXP",
                otpauthUrl: "otpauth://totp/PlayNest:superadmin?secret=JBSWY3DPEHPK3PXP",
                expiresIn: 600,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (url.includes("/auth/platform-admin/2fa/confirm")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                accessToken: "admin-jwt-after-setup",
                refreshToken: "admin-refresh-after-setup",
                totpEnabled: true,
                recoveryCodes: ["AAAA-BBBB-CCCC-1111", "DDDD-EEEE-FFFF-2222"],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const step1 = await authService.loginPlatformAdmin("superadmin", "Pass123!");
      expect(step1.status).toBe("TOTP_SETUP_REQUIRED");
      expect(step1.setupToken).toBe("ephemeral-setup-jwt");

      const setupRes = await authService.setupPlatformAdmin2fa({
        setupToken: step1.setupToken!,
        mode: "INITIAL",
      });
      expect(setupRes.deviceId).toBe("dev-1");
      expect(setupRes.secret).toBe("JBSWY3DPEHPK3PXP");

      const confirmRes = await authService.confirmPlatformAdmin2fa({
        setupToken: step1.setupToken!,
        deviceId: setupRes.deviceId,
        code: "654321",
        mode: "INITIAL",
      });
      expect(confirmRes.accessToken).toBe("admin-jwt-after-setup");
      expect(confirmRes.recoveryCodes?.length).toBe(2);
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

    it("fetches single gaming center from GET /platform-admin/gaming-centers/{id} with booking and verification fields", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        interceptedRequests.push({ url, method });

        if (url.includes("/platform-admin/gaming-centers/gc-101")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "gc-101",
                name: "گیمنت گرگدن",
                slug: "gorgodan",
                isActive: true,
                allowOnlineBooking: false,
                verificationStatus: "APPROVED",
                city: "تهران",
                address: "خیابان ولیعصر",
                ownerName: "علی رضایی",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const gc = await adminService.getGamecenterById("gc-101");
      expect(gc?.id).toBe("gc-101");
      expect(gc?.allowOnlineBooking).toBe(false);
      expect(gc?.verificationStatus).toBe("APPROVED");
      expect(interceptedRequests[0].url).toContain("/platform-admin/gaming-centers/gc-101");
    });

    it("toggles online booking via PATCH /gamingCenters/{id}/settings", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        interceptedRequests.push({ url, method, body });

        if (url.includes("/gamingCenters/gc-101/settings") && method === "PATCH") {
          return new Response(
            JSON.stringify({
              success: true,
              data: { allowOnlineBooking: false },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      const result = await adminService.toggleGamecenterOnlineBooking("gc-101", false);
      expect(result).toBe(false);
      expect(interceptedRequests[0].method).toBe("PATCH");
      expect(interceptedRequests[0].url).toContain("/gamingCenters/gc-101/settings");
      expect(interceptedRequests[0].body.allowOnlineBooking).toBe(false);
    });

    it("deletes gaming center media via DELETE /gamingCenters/{gamingCenterId}/media/{mediaId}", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || "GET";
        interceptedRequests.push({ url, method });

        if (url.includes("/gamingCenters/gc-101/media/med-1") && method === "DELETE") {
          return new Response(null, { status: 204 });
        }

        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }) as typeof fetch;

      await adminService.deleteGamecenterMedia("gc-101", "med-1");
      expect(interceptedRequests[0].method).toBe("DELETE");
      expect(interceptedRequests[0].url).toContain("/gamingCenters/gc-101/media/med-1");
    });
  });
});
