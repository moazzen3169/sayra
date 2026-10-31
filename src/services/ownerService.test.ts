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

  it("fetches settings for center and sanitizes updates", async () => {
    let capturedBody: any = null;
    let capturedMethod = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-100/settings")) {
        if (init?.method === "PUT") {
          capturedMethod = "PUT";
          capturedBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: "set-1",
                gamingCenterId: "gc-100",
                ...capturedBody,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "set-1",
              gamingCenterId: "gc-100",
              timeZone: "Asia/Tehran",
              workStartTime: "09:00",
              workEndTime: "23:00",
              allowOnlineBooking: true,
              onlineBookingAutoConfirm: false,
              preventOverlaps: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const settings = await ownerService.getSettings("gc-100");
    expect(settings.workStartTime).toBe("09:00");
    expect(settings.workEndTime).toBe("23:00");
    expect(settings.preventOverlaps).toBe(true);

    // Ensure updateSettings sanitizes unsupported fields like name, address, games
    await ownerService.updateSettings("gc-100", {
      workStartTime: "10:00",
      workEndTime: "02:00",
      allowOnlineBooking: true,
      onlineBookingAutoConfirm: true,
      preventOverlaps: true,
      // @ts-ignore - simulate unsupported fields
      unsupportedField: "hack",
    });

    expect(capturedMethod).toBe("PUT");
    expect(capturedBody.workStartTime).toBe("10:00");
    expect(capturedBody.workEndTime).toBe("02:00");
    expect(capturedBody.allowOnlineBooking).toBe(true);
    expect(capturedBody.onlineBookingAutoConfirm).toBe(true);
    expect(capturedBody.preventOverlaps).toBe(true);
    expect(capturedBody.unsupportedField).toBeUndefined();
  });

  it("fetches real reservations and calculates pending counts accurately", async () => {
    const mockReservations = [
      { id: "r-1", status: "PENDING", totalPrice: 100000 },
      { id: "r-2", status: "CONFIRMED", totalPrice: 200000 },
      { id: "r-3", status: "PENDING", totalPrice: 150000 },
      { id: "r-4", status: "COMPLETED", totalPrice: 120000 },
    ];

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-100/reservation")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: mockReservations,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const reservations = await ownerService.listReservations("gc-100");
    expect(reservations.length).toBe(4);
    const pendingCount = reservations.filter((r) => r.status === "PENDING").length;
    expect(pendingCount).toBe(2);
  });
});
