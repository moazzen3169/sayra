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

  it("refuses guessed reply endpoints and raises contract gap error on replyToRating", async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as unknown as typeof fetch;

    let thrownError: any = null;
    try {
      await ownerService.replyToRating("gc-100", "rat-1", "پاسخ مدیریت گیمنت");
    } catch (e) {
      thrownError = e;
    }

    expect(fetchCalled).toBe(false);
    expect(thrownError).not.toBeNull();
    expect(thrownError.message).toContain("docs/OWNER_REVIEWS_API_CONTRACT.md");
  });
});
