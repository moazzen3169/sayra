import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "./ownerService";

describe("ownerService.getMe & center resolution", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls /auth/me to retrieve owner profile", async () => {
    const mockUser = {
      id: "owner-real-123",
      phone: "09121112233",
      fullName: "علیرضا رضایی",
      role: "MANAGER",
      isActive: true,
      gamingCenterId: "gc-real-99",
    };

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/me")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();
    expect(me.id).toBe("owner-real-123");
    expect(me.fullName).toBe("علیرضا رضایی");
    expect(me.role).toBe("MANAGER");
    expect(me.gamingCenterId).toBe("gc-real-99");
  });

  it("finds center by id without falling back to gc-1", async () => {
    const mockCenters = [
      { id: "gc-100", name: "مرکز پردیس", slug: "pardis", isActive: true },
      { id: "gc-200", name: "مرکز دماوند", slug: "damavand", isActive: true },
    ];

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: mockCenters,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const center = await ownerService.findCenter("gc-100");
    expect(center).not.toBeNull();
    expect(center?.name).toBe("مرکز پردیس");

    const nonExistent = await ownerService.findCenter("gc-999");
    expect(nonExistent).toBeNull();
  });
});
