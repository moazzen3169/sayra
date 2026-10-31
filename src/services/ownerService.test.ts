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

  it("handles OpenAPI paginated envelope correctly in listReservationsPaginated", async () => {
    const mockPageData = {
      success: true,
      data: [
        { id: "res-10", status: "PENDING", totalPrice: 100000 },
        { id: "res-20", status: "CONFIRMED", totalPrice: 250000 },
      ],
      meta: {
        pagination: {
          total: 42,
          page: 2,
          pageSize: 20,
          totalPages: 3,
        },
      },
    };

    let queryParamString = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      queryParamString = urlStr;
      if (urlStr.includes("/gamingCenters/gc-100/reservation")) {
        return new Response(JSON.stringify(mockPageData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const result = await ownerService.listReservationsPaginated("gc-100", {
      page: 2,
      pageSize: 20,
      status: "PENDING",
    });

    expect(queryParamString).toContain("page=2");
    expect(queryParamString).toContain("pageSize=20");
    expect(queryParamString).toContain("status=PENDING");
    expect(result.items.length).toBe(2);
    expect(result.total).toBe(42);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(3);
  });

  it("fetches single reservation detail using documented endpoint", async () => {
    const mockDetail = {
      id: "res-999",
      gamingCenterId: "gc-100",
      stationId: "st-55",
      status: "CONFIRMED",
      paymentState: "PAID",
      totalHours: 2,
      totalPrice: 400000,
      startTime: "2026-04-01T14:00:00.000Z",
      endTime: "2026-04-01T16:00:00.000Z",
    };

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-100/reservation/res-999")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: mockDetail,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const detail = await ownerService.getReservation("gc-100", "res-999");
    expect(detail.id).toBe("res-999");
    expect(detail.totalPrice).toBe(400000);
    expect(detail.status).toBe("CONFIRMED");
  });

  it("sends time proposal with preserved duration and ISO date-times", async () => {
    let capturedBody: any = null;
    let capturedUrl = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      if (capturedUrl.includes("/propose-time")) {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ success: true }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await ownerService.proposeTime("gc-100", "res-777", {
      startTime: "2026-04-02T16:00:00.000Z",
      endTime: "2026-04-02T18:00:00.000Z",
      note: "دستگاه قبلی نیاز به سرویس دارد",
    });

    expect(capturedUrl).toContain("/gamingCenters/gc-100/reservation/res-777/propose-time");
    expect(capturedBody.startTime).toBe("2026-04-02T16:00:00.000Z");
    expect(capturedBody.endTime).toBe("2026-04-02T18:00:00.000Z");
    expect(capturedBody.note).toBe("دستگاه قبلی نیاز به سرویس دارد");
  });

  it("calls exact OpenAPI session routes for start, stop, pause, and resume", async () => {
    const calledUrls: string[] = [];

    globalThis.fetch = (async (url: string | URL | Request) => {
      calledUrls.push(String(url));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await ownerService.session("gc-100", "res-1", "start");
    await ownerService.session("gc-100", "res-1", "stop");
    await ownerService.session("gc-100", "res-1", "pause");
    await ownerService.session("gc-100", "res-1", "resume");

    // start and stop use /reservation (singular)
    expect(calledUrls[0]).toContain("/gamingCenters/gc-100/reservation/res-1/sessions/start");
    expect(calledUrls[1]).toContain("/gamingCenters/gc-100/reservation/res-1/sessions/stop");
    // pause and resume use /reservations (plural) per OpenAPI
    expect(calledUrls[2]).toContain("/gamingCenters/gc-100/reservations/res-1/sessions/pause");
    expect(calledUrls[3]).toContain("/gamingCenters/gc-100/reservations/res-1/sessions/resume");
  });

  it("handles status transition contract gaps without sending undocumented PATCH status", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/confirm")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "NOT_FOUND", message: "Not Found" },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    let thrownError: any = null;
    try {
      await ownerService.updateReservationStatus("gc-100", "res-1", "CONFIRMED");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.message).toContain("docs/OWNER_RESERVATIONS_API_CONTRACT.md");
  });
});
