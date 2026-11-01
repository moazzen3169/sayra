import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService } from "./authService";
import { clearTokens } from "@/lib/token";

describe("Staff / Manager Auth Flow (authService)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearTokens();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  it("requests user OTP via POST /auth/user/otp/request", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "GET";
      capturedBody = init?.body ? JSON.parse(init.body as string) : null;
      return new Response(
        JSON.stringify({
          success: true,
          data: { message: "OTP sent" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await authService.requestUserOtp("09121112233");

    expect(capturedUrl).toContain("/auth/user/otp/request");
    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toEqual({ phone: "09121112233" });
  });

  it("verifies user OTP and retrieves active gaming centers via POST /auth/user/otp/verify", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = init?.body ? JSON.parse(init.body as string) : null;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            gamingCenters: [
              { id: "gc_1", name: "شعبه مرکز" },
              { id: "gc_2", name: "شعبه ونک" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await authService.verifyUserOtp("09121112233", "654321");

    expect(capturedUrl).toContain("/auth/user/otp/verify");
    expect(capturedBody).toEqual({ phone: "09121112233", code: "654321" });
    expect(res.gamingCenters.length).toBe(2);
    expect(res.gamingCenters[0].id).toBe("gc_1");
    expect(res.gamingCenters[1].name).toBe("شعبه ونک");
  });

  it("finalizes OTP login with selected gaming center via POST /auth/user/login/otp", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = init?.body ? JSON.parse(init.body as string) : null;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tokens: {
              accessToken: "user_jwt_access",
              refreshToken: "user_refresh_token",
            },
            user: {
              id: "u_1",
              phone: "09121112233",
              role: "MANAGER",
              gamingCenterId: "gc_1",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await authService.loginUserWithOtp("09121112233", "gc_1", "654321");

    expect(capturedUrl).toContain("/auth/user/login/otp");
    expect(capturedBody).toEqual({
      phone: "09121112233",
      gamingCenterId: "gc_1",
      code: "654321",
    });
    expect(res.accessToken).toBe("user_jwt_access");
    expect(res.refreshToken).toBe("user_refresh_token");
    expect(res.user?.role).toBe("MANAGER");
  });

  it("authenticates manager with password via POST /auth/login", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = init?.body ? JSON.parse(init.body as string) : null;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tokens: {
              accessToken: "pw_jwt_token",
              refreshToken: "pw_refresh_token",
            },
            user: {
              id: "u_2",
              phone: "09121112233",
              role: "STAFF",
              gamingCenterId: "gc_1",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await authService.loginUserWithPassword(
      "09121112233",
      "StrongPassword123",
      "gc_1"
    );

    expect(capturedUrl).toContain("/auth/login");
    expect(capturedBody).toEqual({
      phone: "09121112233",
      password: "StrongPassword123",
      gamingCenterId: "gc_1",
    });
    expect(res.accessToken).toBe("pw_jwt_token");
    expect(res.refreshToken).toBe("pw_refresh_token");
    expect(res.user?.role).toBe("STAFF");
  });

  it("handles invalid password or credentials with 401 Unauthorized", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "شماره تلفن یا رمز عبور اشتباه است.",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let error: any = null;
    try {
      await authService.loginUserWithPassword("09121112233", "WrongPassword");
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });
});
