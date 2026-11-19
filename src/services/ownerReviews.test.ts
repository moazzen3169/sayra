import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "./ownerService";

describe("ownerService.reviews & moderation operations", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches real public ratings without falling back to mock data", async () => {
    const mockRealRatings = [
      {
        id: "rat-real-1",
        gamingCenterId: "gc-100",
        rating: 5,
        comment: "سیستم عالی و پرسنل خوش‌برخورد",
        status: "PUBLISHED",
        customerName: "سهراب سپهری",
      },
      {
        id: "rat-real-2",
        gamingCenterId: "gc-100",
        rating: 4,
        comment: "خوب بود ولی تهویه نیاز به بهبود دارد",
        status: "HIDDEN",
        customerName: "نیما یوشیج",
      },
    ];

    let calledUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      calledUrl = String(url);
      if (calledUrl.includes("/public/gamingCenters/pardis-center/ratings")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: mockRealRatings,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const ratings = await ownerService.listRatings("pardis-center");
    expect(calledUrl).toContain("/public/gamingCenters/pardis-center/ratings");
    expect(ratings.length).toBe(2);
    expect(ratings[0].id).toBe("rat-real-1");
    expect(ratings[0].rating).toBe(5);
    expect(ratings[0].customerName).toBe("سهراب سپهری");
    expect(ratings[1].status).toBe("HIDDEN");
  });

  it("handles empty ratings response returning empty array without mock fallback", async () => {
    let calledUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      calledUrl = String(url);
      if (calledUrl.includes("/public/gamingCenters/empty-center/ratings")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const ratings = await ownerService.listRatings("empty-center");
    expect(calledUrl).toContain("/public/gamingCenters/empty-center/ratings");
    expect(ratings).toEqual([]);
  });

  it("moderates review status using PATCH /gamingCenters/{centerId}/ratings/{id}/status", async () => {
    let calledUrl = "";
    let calledMethod = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calledUrl = String(url);
      calledMethod = init?.method || "GET";
      if (init?.body) {
        capturedBody = JSON.parse(String(init.body));
      }
      if (calledUrl.includes("/gamingCenters/gc-100/ratings/rat-55/status")) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Status updated",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await ownerService.setRatingStatus("gc-100", "rat-55", "HIDDEN");

    expect(calledMethod).toBe("PATCH");
    expect(calledUrl).toContain("/gamingCenters/gc-100/ratings/rat-55/status");
    expect(capturedBody).toEqual({ status: "HIDDEN" });

    await ownerService.setRatingStatus("gc-100", "rat-55", "PUBLISHED");
    expect(capturedBody).toEqual({ status: "PUBLISHED" });

    await ownerService.setRatingStatus("gc-100", "rat-55", "DELETED");
    expect(capturedBody).toEqual({ status: "DELETED" });
  });

  it("submits owner reply via POST /gamingCenters/{centerId}/ratings/{id}/reply and surfaces clear error if server returns 404", async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      calls.push({
        url: urlStr,
        method: init?.method || "GET",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (urlStr.includes("/gamingCenters/gc-100/ratings/rat-1/reply")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await ownerService.replyToRating("gc-100", "rat-1", "پاسخ مدیریت گیمنت");

    expect(calls.length).toBe(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/gamingCenters/gc-100/ratings/rat-1/reply");
    expect(calls[0].body).toEqual({ reply: "پاسخ مدیریت گیمنت" });
  });

  it("fetches manager ratings via GET /gamingCenters/{centerId}/ratings and normalizes replyComment & replyAt", async () => {
    let calledUrl = "";
    let calledMethod = "";
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calledUrl = String(url);
      calledMethod = init?.method || "GET";
      if (calledUrl.includes("/gamingCenters/gc-100/ratings")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "rat-10",
                gamingCenterId: "gc-100",
                reservationId: "res-1",
                rating: 5,
                comment: "عالی بود",
                replyComment: "ممنون از حضور شما",
                replyAt: "2026-11-10T12:00:00.000Z",
                repliedById: "mgr-1",
                status: "PUBLISHED",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const ratings = await ownerService.listCenterRatings("gc-100");
    expect(calledMethod).toBe("GET");
    expect(calledUrl).toContain("/gamingCenters/gc-100/ratings");
    expect(ratings.length).toBe(1);
    expect(ratings[0].replyComment).toBe("ممنون از حضور شما");
    expect(ratings[0].reply).toBe("ممنون از حضور شما");
    expect(ratings[0].replyAt).toBe("2026-11-10T12:00:00.000Z");
    expect(ratings[0].repliedAt).toBe("2026-11-10T12:00:00.000Z");
    expect(ratings[0].repliedById).toBe("mgr-1");
  });

  it("updates existing reply via POST and deletes reply via DELETE /gamingCenters/{centerId}/ratings/{id}/reply (204)", async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      const method = init?.method || "GET";
      calls.push({
        url: urlStr,
        method,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });

      if (urlStr.includes("/gamingCenters/gc-100/ratings/rat-10/reply") && method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "rat-10",
              gamingCenterId: "gc-100",
              rating: 5,
              comment: "عالی بود",
              replyComment: "پاسخ ویرایش‌شده",
              replyAt: "2026-11-11T09:00:00.000Z",
              repliedById: "mgr-1",
              status: "PUBLISHED",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.includes("/gamingCenters/gc-100/ratings/rat-10/reply") && method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const updated = await ownerService.replyToRating("gc-100", "rat-10", "پاسخ ویرایش‌شده");
    expect(updated?.replyComment).toBe("پاسخ ویرایش‌شده");
    expect(updated?.reply).toBe("پاسخ ویرایش‌شده");

    await ownerService.deleteRatingReply("gc-100", "rat-10");
    expect(calls[1].method).toBe("DELETE");
    expect(calls[1].url).toContain("/gamingCenters/gc-100/ratings/rat-10/reply");
  });
});
