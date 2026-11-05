import { describe, expect, it } from "bun:test";
import { ownerService } from "./ownerService";

describe("ownerService.getMe & center resolution", () => {
  it("calls /auth/me to retrieve owner profile", async () => {
    let capturedUrl = "";
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "owner-123",
            phone: "09121112233",
            fullName: "علی محمدی",
            role: "MANAGER",
            gamingCenters: [{ id: "gc-100", name: "مرکز پردیس", slug: "pardis-center", isActive: true }],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();

    expect(capturedUrl).toContain("/auth/me");
    expect(me.id).toBe("owner-123");
    expect(me.phone).toBe("09121112233");
    expect(me.role).toBe("MANAGER");
    expect(me.gamingCenters?.length).toBe(1);
    expect(me.gamingCenters?.[0].id).toBe("gc-100");
  });

  it("extracts gamingCenterId and actor fields from backend envelope in getMe", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "cm1234567890user",
            actorId: "cm1234567890user",
            role: "MANAGER",
            gamingCenterId: "cm0987654321center",
            actorType: "USER",
            sessionId: "cm_session_xyz",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();
    expect(me.id).toBe("cm1234567890user");
    expect(me.actorId).toBe("cm1234567890user");
    expect(me.actorType).toBe("USER");
    expect(me.role).toBe("MANAGER");
    expect(me.gamingCenterId).toBe("cm0987654321center");
  });

  it("finds center by id with backend data envelope and custom fields", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/cm0987654321center")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "cm0987654321center",
              name: "گیم‌نت نمونه",
              slug: "sample-gaming",
              description: "توضیحات گیم‌نت",
              pcCount: 15,
              consoleCount: 8,
              is_open: true,
              hourlyRate: 60000,
              raiting: 4.8,
              comment_count: 12,
              addresses: [
                {
                  id: "cm_addr_1",
                  province: "تهران",
                  city: "تهران",
                  addressLine: "خیابان ولیعصر...",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const center = await ownerService.findCenter("cm0987654321center");
    expect(center).not.toBeNull();
    expect(center?.id).toBe("cm0987654321center");
    expect(center?.name).toBe("گیم‌نت نمونه");
    expect(center?.pcCount).toBe(15);
    expect(center?.hourlyRate).toBe(60000);
    expect(center?.addresses?.[0].province).toBe("تهران");
  });

  it("finds center by id without falling back to gc-1", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: "gc-100", name: "شعبه یک", slug: "branch-1", isActive: true },
            { id: "gc-200", name: "شعبه دو", slug: "branch-2", isActive: true },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;

    const center = await ownerService.findCenter("gc-100");
    expect(center).not.toBeNull();
    expect(center?.name).toBe("شعبه یک");

    const nonExistent = await ownerService.findCenter("gc-999");
    expect(nonExistent).toBeNull();
  });

  it("fetches settings for center and sanitizes updates", async () => {
    let putBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "PUT") {
        putBody = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            success: true,
            data: putBody,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            timeZone: "Asia/Tehran",
            workStartTime: "10:00",
            workEndTime: "23:00",
            allowOnlineBooking: true,
            onlineBookingAutoConfirm: false,
            preventOverlaps: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const settings = await ownerService.getSettings("gc-100");
    expect(settings.workStartTime).toBe("10:00");
    expect(settings.workEndTime).toBe("23:00");
    expect(settings.allowOnlineBooking).toBe(true);
    expect(settings.preventOverlaps).toBe(true);

    await ownerService.updateSettings("gc-100", {
      workStartTime: "09:00",
      workEndTime: "02:00",
      allowOnlineBooking: false,
      preventOverlaps: true,
      timeZone: "Asia/Tehran",
    });

    expect(putBody.workStartTime).toBe("09:00");
    expect(putBody.workEndTime).toBe("02:00");
    expect(putBody.allowOnlineBooking).toBe(false);
  });

  it("fetches real reservations and calculates pending counts accurately", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: "res-1",
              status: "PENDING",
              createdAt: "2026-04-06T10:00:00.000Z",
              user: { fullName: "سارا رضایی", phone: "09121111111" },
              totalPrice: 150000,
            },
            {
              id: "res-2",
              status: "PENDING",
              createdAt: "2026-04-06T11:00:00.000Z",
              user: { fullName: "نوید اکبری", phone: "09122222222" },
              totalPrice: 200000,
            },
            {
              id: "res-3",
              status: "CONFIRMED",
              createdAt: "2026-04-06T09:00:00.000Z",
              user: { fullName: "محمد موسوی", phone: "09123333333" },
              totalPrice: 300000,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const reservations = await ownerService.listReservations("gc-100");
    expect(reservations.length).toBe(3);

    const pendingCount = reservations.filter((r) => r.status === "PENDING").length;
    expect(pendingCount).toBe(2);
  });

  it("handles OpenAPI paginated envelope correctly in listReservationsPaginated", async () => {
    let capturedUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: "res-10", status: "CONFIRMED", totalPrice: 120000 },
            { id: "res-11", status: "PENDING", totalPrice: 80000 },
          ],
          meta: {
            pagination: {
              total: 25,
              page: 2,
              pageSize: 10,
              totalPages: 3,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const result = await ownerService.listReservationsPaginated("gc-100", {
      page: 2,
      pageSize: 10,
      status: "ALL",
    });

    expect(capturedUrl).toContain("/gamingCenters/gc-100/reservation");
    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=10");
    expect(result.items.length).toBe(2);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(3);
  });

  it("fetches single reservation detail using documented endpoint", async () => {
    let capturedUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "res-999",
            stationId: "st-1",
            status: "PENDING",
            startTime: "2026-04-10T14:00:00.000Z",
            endTime: "2026-04-10T16:00:00.000Z",
            totalPrice: 240000,
            user: { fullName: "علی رضایی", phone: "09121234567" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const detail = await ownerService.getReservation("gc-100", "res-999");

    expect(capturedUrl).toContain("/gamingCenters/gc-100/reservation/res-999");
    expect(detail.id).toBe("res-999");
    expect(detail.totalPrice).toBe(240000);
    expect(detail.user?.fullName).toBe("علی رضایی");
  });

  it("sends time proposal with preserved duration and ISO date-times", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await ownerService.proposeTime("gc-100", "res-777", {
      startTime: "2026-04-10T16:00:00.000Z",
      endTime: "2026-04-10T18:00:00.000Z",
      note: "دستگاه قبلی نیاز به سرویس دارد",
    });

    expect(capturedUrl).toContain("/gamingCenters/gc-100/reservation/res-777/propose-time");
    expect(capturedBody.startTime).toBe("2026-04-10T16:00:00.000Z");
    expect(capturedBody.endTime).toBe("2026-04-10T18:00:00.000Z");
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

    // All session actions use /reservation (singular) per OpenAPI
    expect(calledUrls[0]).toContain("/gamingCenters/gc-100/reservation/res-1/sessions/start");
    expect(calledUrls[1]).toContain("/gamingCenters/gc-100/reservation/res-1/sessions/stop");
    expect(calledUrls[2]).toContain("/gamingCenters/gc-100/reservation/res-1/sessions/pause");
    expect(calledUrls[3]).toContain("/gamingCenters/gc-100/reservation/res-1/sessions/resume");
  });

  it("executes official reservation status transitions (confirm, cancel, no-show, start, complete)", async () => {
    const capturedTransitions: { url: string; body: any }[] = [];

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedTransitions.push({
        url: String(url),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(
        JSON.stringify({ success: true, data: { id: "res-1", status: "CONFIRMED" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await ownerService.updateReservationStatus("gc-100", "res-1", "CONFIRMED");
    expect(capturedTransitions[0].url).toContain("/gamingCenters/gc-100/reservation/res-1/confirm");

    await ownerService.updateReservationStatus("gc-100", "res-1", "CANCELED", "مشکل فنی دستگاه");
    expect(capturedTransitions[1].url).toContain("/gamingCenters/gc-100/reservation/res-1/cancel");
    expect(capturedTransitions[1].body?.reason).toBe("مشکل فنی دستگاه");

    await ownerService.updateReservationStatus("gc-100", "res-1", "NO_SHOW");
    expect(capturedTransitions[2].url).toContain("/gamingCenters/gc-100/reservation/res-1/no-show");

    await ownerService.updateReservationStatus("gc-100", "res-1", "IN_PROGRESS");
    expect(capturedTransitions[3].url).toContain("/gamingCenters/gc-100/reservation/res-1/start");

    await ownerService.updateReservationStatus("gc-100", "res-1", "COMPLETED");
    expect(capturedTransitions[4].url).toContain("/gamingCenters/gc-100/reservation/res-1/complete");
  });
});
