import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService } from "./authService";
import { ownerService } from "./ownerService";
import { setTokens, clearTokens } from "@/lib/token";

describe("Owner Route Protection & Creation Auth Flows", () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequests: { url: string; method: string; body?: any; headers?: Headers }[] = [];

  beforeEach(() => {
    clearTokens();
    interceptedRequests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  it("1. Unauthenticated creation flow: sends OTP request to the specified phone number", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      interceptedRequests.push({ url, method, body });

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: "کد تایید ارسال شد" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    await authService.requestOtp("09129998877");

    expect(interceptedRequests.length).toBe(1);
    expect(interceptedRequests[0].method).toBe("POST");
    expect(interceptedRequests[0].url).toContain("/auth/customer/otp/request");
    expect(interceptedRequests[0].body).toEqual({ phone: "09129998877" });
  });

  it("2. Verifies OTP and receives valid authentication tokens and user info", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      interceptedRequests.push({ url, method, body });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: "created_owner_token_abc",
            refreshToken: "created_owner_refresh_xyz",
            user: {
              id: "usr_owner_789",
              phone: "09129998877",
              fullName: "مالک تست",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    const authRes = await authService.verifyOtp("09129998877", "123456");

    expect(interceptedRequests[0].url).toContain("/auth/customer/otp/verify");
    expect(interceptedRequests[0].body).toEqual({ phone: "09129998877", code: "123456" });
    expect(authRes.accessToken).toBe("created_owner_token_abc");
    expect(authRes.user?.id).toBe("usr_owner_789");
  });

  it("3. Authenticates with password as fallback for existing owner account", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      interceptedRequests.push({ url, method, body });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tokens: {
              accessToken: "pw_owner_token",
              refreshToken: "pw_owner_refresh",
            },
            user: {
              id: "usr_existing_owner",
              phone: "09129998877",
              role: "MANAGER",
              name: "مدیر قدیمی",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    const res = await authService.loginUserWithPassword("09129998877", "MySecretPass");

    expect(interceptedRequests[0].url).toContain("/auth/login");
    expect(interceptedRequests[0].body).toEqual({
      phone: "09129998877",
      password: "MySecretPass",
    });
    expect(res.accessToken).toBe("pw_owner_token");
    expect(res.user?.id).toBe("usr_existing_owner");
  });

  it("4. Creates gaming center under newly authenticated ownerId", async () => {
    setTokens({ accessToken: "created_owner_token_abc" });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      interceptedRequests.push({ url, method, body });

      if (url.includes("/gamingCenters") && method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "gc_created_new_99",
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
      name: "گیم‌نت پیروزی",
      slug: "gamenet-piroozi",
      ownerId: "usr_owner_789",
      games: ["FC 25"],
    });

    expect(interceptedRequests[0].url).toContain("/gamingCenters");
    expect(interceptedRequests[0].body.ownerId).toBe("usr_owner_789");
    expect(created.id).toBe("gc_created_new_99");
    expect(created.slug).toBe("gamenet-piroozi");
  });
});
