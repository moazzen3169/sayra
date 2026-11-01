import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "@/services/ownerService";
import { discountService } from "@/services/discountService";

describe("Phase 9 Task 3: Owner Workflow Tests", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("1. loads owner profile and gaming center information", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/me")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "owner-1",
              fullName: "علی رضایی",
              role: "OWNER",
              gamingCenters: [{ id: "gc-10", name: "گیمنت طلایی", slug: "golden-center" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const me = await ownerService.getMe();
    expect(me.fullName).toBe("علی رضایی");
    expect(me.gamingCenters?.[0].id).toBe("gc-10");
  });

  it("2. loads stations and creates a new station", async () => {
    let capturedBody: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-10/stations")) {
        if (init?.method === "POST") {
          capturedBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: "st-new-1", gamingCenterId: "gc-10", ...capturedBody },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "st-1", name: "PC 1", hourlyPrice: 150000, stationType: "PC" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const list = await ownerService.listStations("gc-10");
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("st-1");

    const created = await ownerService.createStation("gc-10", {
      name: "PS5 #2",
      stationType: "PLAYSTATION",
      hourlyPrice: 200000,
      quantity: 3,
      defaultControllers: 2,
    });
    expect(capturedBody.name).toBe("PS5 #2");
    expect(capturedBody.hourlyPrice).toBe(200000);
    expect((created as any).id).toBe("st-new-1");
  });

  it("3. edits working hours and updates supported center settings", async () => {
    let capturedSettings: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-10/settings")) {
        if (init?.method === "PUT") {
          capturedSettings = JSON.parse(String(init.body));
          return new Response(JSON.stringify({ success: true, data: capturedSettings }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              workStartTime: "10:00",
              workEndTime: "23:00",
              timeZone: "Asia/Tehran",
              allowOnlineBooking: true,
              onlineBookingAutoConfirm: true,
              preventOverlaps: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const current = await ownerService.getSettings("gc-10");
    expect(current.workStartTime).toBe("10:00");

    await ownerService.updateSettings("gc-10", {
      workStartTime: "11:00",
      workEndTime: "00:00",
      timeZone: "Asia/Tehran",
      allowOnlineBooking: true,
      onlineBookingAutoConfirm: false,
      preventOverlaps: true,
    });
    expect(capturedSettings.workStartTime).toBe("11:00");
    expect(capturedSettings.onlineBookingAutoConfirm).toBe(false);
  });

  it("4. uploads gallery image and lists center media", async () => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-10/media/upload")) {
        expect(init?.body instanceof FormData).toBe(true);
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "med-1", url: "https://api.sayra.ir/media/img1.jpg", altText: "تصویر سالن" },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/public/gamingCenters/golden-center/media")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "med-1", url: "https://api.sayra.ir/media/img1.jpg", altText: "تصویر سالن" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const dummyFile = new File(["dummy content"], "photo.png", { type: "image/png" });
    const uploaded = await ownerService.uploadGalleryImage("gc-10", dummyFile, { altText: "تصویر سالن" });
    expect(uploaded.url).toBe("https://api.sayra.ir/media/img1.jpg");

    const mediaList = await ownerService.listMedia("golden-center");
    expect(mediaList.length).toBe(1);
    expect(mediaList[0].id).toBe("med-1");
  });

  it("5. loads reservations with pagination and single detail", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-10/reservation/res-101")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "res-101", reservationCode: "123456", totalPrice: 300000, status: "CONFIRMED" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/gamingCenters/gc-10/reservation")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "res-101", reservationCode: "123456", totalPrice: 300000, status: "CONFIRMED" }],
            meta: { pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const listRes = await ownerService.listReservationsPaginated("gc-10");
    expect(listRes.items.length).toBe(1);
    expect(listRes.total).toBe(1);

    const detail = await ownerService.getReservation("gc-10", "res-101");
    expect(detail.id).toBe("res-101");
    expect(detail.reservationCode).toBe("123456");
  });

  it("6. reports reservation confirm/reject as contract gap", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Route Not Found" } }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await expect(ownerService.updateReservationStatus("gc-10", "res-1", "CONFIRMED")).rejects.toThrow(
      "docs/OWNER_RESERVATIONS_API_CONTRACT.md"
    );
  });

  it("7. proposes a new reservation time via verified endpoint", async () => {
    let capturedBody: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await ownerService.proposeTime("gc-10", "res-1", {
      startTime: "2026-04-10T14:00:00.000Z",
      endTime: "2026-04-10T16:00:00.000Z",
      note: "تغییر زمان به درخواست کاربر",
    });

    expect(capturedBody.startTime).toBe("2026-04-10T14:00:00.000Z");
    expect(capturedBody.note).toBe("تغییر زمان به درخواست کاربر");
  });

  it("8. controls session start, stop, pause, resume via OpenAPI routes", async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await ownerService.session("gc-10", "res-1", "start");
    await ownerService.session("gc-10", "res-1", "stop");
    await ownerService.session("gc-10", "res-1", "pause");
    await ownerService.session("gc-10", "res-1", "resume");

    expect(urls[0]).toContain("/gamingCenters/gc-10/reservation/res-1/sessions/start");
    expect(urls[1]).toContain("/gamingCenters/gc-10/reservation/res-1/sessions/stop");
    expect(urls[2]).toContain("/gamingCenters/gc-10/reservations/res-1/sessions/pause");
    expect(urls[3]).toContain("/gamingCenters/gc-10/reservations/res-1/sessions/resume");
  });

  it("9. creates, toggles, lists, and deletes discounts", async () => {
    let created = false;
    let statusUpdated = false;
    let deleted = false;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/status") && init?.method === "PATCH") {
        statusUpdated = true;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/discounts/disc-1") && init?.method === "DELETE") {
        deleted = true;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/discounts") && init?.method === "POST") {
        created = true;
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "disc-1", gamingCenterId: "gc-10", valueType: "PERCENTAGE", value: 20, isActive: true },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/discounts")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "disc-1", gamingCenterId: "gc-10", valueType: "PERCENTAGE", value: 20, isActive: true }],
            meta: { pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await discountService.createDiscount("gc-10", {
      targetType: "GAMING_CENTER",
      targetId: "gc-10",
      valueType: "PERCENTAGE",
      value: 20,
      startAt: "2026-04-01T00:00:00Z",
      endAt: "2026-04-07T00:00:00Z",
    });
    expect(created).toBe(true);

    const list = await discountService.listDiscounts("gc-10");
    expect(list.length).toBe(1);

    await discountService.updateDiscountStatus("gc-10", "disc-1", false);
    expect(statusUpdated).toBe(true);

    await discountService.deleteDiscount("gc-10", "disc-1");
    expect(deleted).toBe(true);
  });

  it("10. loads reviews and moderates review status", async () => {
    let moderatedStatus = "";
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/status") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        moderatedStatus = body.status;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/public/gamingCenters/golden-center/ratings")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "rat-1", rating: 5, comment: "عالی بود", status: "PUBLISHED" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const ratings = await ownerService.listRatings("golden-center");
    expect(ratings.length).toBe(1);

    await ownerService.setRatingStatus("gc-10", "rat-1", "HIDDEN");
    expect(moderatedStatus).toBe("HIDDEN");
  });

  it("11. creates tickets and sends ticket messages", async () => {
    let ticketCreated = false;
    let messageSent = false;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/tickets/t-1/messages") && init?.method === "POST") {
        messageSent = true;
        return new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/tickets") && init?.method === "POST") {
        ticketCreated = true;
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "t-1", subject: "پشتیبانی مالی", status: "OPEN" },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await ownerService.createTicket({
      subject: "پشتیبانی مالی",
      message: "مشکل در تسویه حساب",
      category: "FINANCIAL",
    });
    expect(ticketCreated).toBe(true);

    await ownerService.sendTicketMessage("t-1", { text: "پیام تکمیلی" });
    expect(messageSent).toBe(true);
  });

  it("12. loads financial analytics summary and commissions", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-10/analytics/summary")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { withdrawableAmount: 1250000, totalRevenue: 5000000, occupancyRate: 75 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/gamingCenters/gc-10/commissions")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: "earn-1", commissionAmount: 25000, status: "CHARGED" }],
            meta: { pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const summary = await ownerService.getAnalyticsSummary("gc-10");
    expect(summary.withdrawableAmount).toBe(1250000);

    const commissions = await ownerService.listCommissionsPaginated("gc-10");
    expect(commissions.items.length).toBe(1);
    expect(commissions.items[0].commissionAmount).toBe(25000);
  });
});
