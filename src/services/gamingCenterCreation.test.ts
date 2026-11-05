import { describe, expect, it, beforeEach } from "bun:test";
import { ownerService } from "@/services/ownerService";
import { setTokens, clearTokens } from "@/lib/token";

describe("Gaming Center Creation & Mutation Services (Phase OpenAPI v1.0-LOCKED)", () => {
  let interceptedRequests: { url: string; method: string; body?: any; headers?: Headers }[] = [];

  beforeEach(() => {
    clearTokens();
    setTokens({ accessToken: "test-owner-token", refreshToken: "test-refresh-token" });
    interceptedRequests = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      const headers = new Headers(init?.headers);

      interceptedRequests.push({ url, method, body, headers });

      if (url.includes("/gamingCenters") && method === "POST" && !url.includes("/addresses") && !url.includes("/links")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "gc-created-101",
              name: body?.name,
              slug: body?.slug,
              ownerId: body?.ownerId,
              games: body?.games,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/addresses") && method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "addr-1", address: body?.address, city: body?.city },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/links") && method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "link-1", platform: body?.platform, url: body?.url },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/settings") && method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: { timeZone: "Asia/Tehran", allowOnlineBooking: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as any;
  });

  it("1. sends POST /gamingCenters with required fields (name, slug, ownerId, games)", async () => {
    const res = await ownerService.createGamingCenter({
      name: "گیم‌نت آرنا",
      slug: "gamenet-arena",
      ownerId: "owner-user-123",
      games: ["FC 25", "GTA V"],
    });

    expect(interceptedRequests.length).toBe(1);
    const req = interceptedRequests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/gamingCenters");
    expect(req.body).toEqual({
      name: "گیم‌نت آرنا",
      slug: "gamenet-arena",
      ownerId: "owner-user-123",
      games: ["FC 25", "GTA V"],
    });

    expect(res.id).toBe("gc-created-101");
    expect(res.name).toBe("گیم‌نت آرنا");
    expect(res.slug).toBe("gamenet-arena");
  });

  it("2. creates branch address with POST /gamingCenters/{id}/addresses", async () => {
    await ownerService.createAddress("gc-created-101", {
      address: "تهران، میدان ونک، خیابان ولیعصر",
      city: "تهران",
      phone: "02188888888",
    });

    expect(interceptedRequests.length).toBe(1);
    const req = interceptedRequests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/gamingCenters/gc-created-101/addresses");
    expect(req.body).toEqual({
      city: "تهران",
      addressLine: "تهران، میدان ونک، خیابان ولیعصر",
      address: "تهران، میدان ونک، خیابان ولیعصر",
      phone: "02188888888",
    });
  });

  it("2b. creates branch address with addressLine, city, and coordinates", async () => {
    await ownerService.createAddress("gc-created-101", {
      addressLine: "خیابان ولیعصر، نرسیده به میدان ونک",
      address: "تهران، تهران، خیابان ولیعصر، نرسیده به میدان ونک",
      city: "تهران",
      province: "تهران",
      phone: "09123456789",
      lat: 35.6892,
      lng: 51.3890,
    });

    expect(interceptedRequests.length).toBe(1);
    const req = interceptedRequests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/gamingCenters/gc-created-101/addresses");
    expect(req.body.city).toBe("تهران");
    expect(req.body.addressLine).toBe("خیابان ولیعصر، نرسیده به میدان ونک");
    expect(req.body.address).toBe("تهران، تهران، خیابان ولیعصر، نرسیده به میدان ونک");
    expect(req.body.phone).toBe("09123456789");
    expect(req.body.province).toBe("تهران");
    expect(req.body.lat).toBe(35.6892);
    expect(req.body.lng).toBe(51.3890);
  });

  it("2c. validates required city and address fields before sending request", async () => {
    await expect(
      ownerService.createAddress("gc-created-101", {
        city: "",
        address: "خیابان آزادی",
      })
    ).rejects.toThrow("شهر وارد نشده است.");

    await expect(
      ownerService.createAddress("gc-created-101", {
        city: "تهران",
        address: "",
      })
    ).rejects.toThrow("آدرس وارد نشده است.");
  });

  it("3. creates social and website links with POST /gamingCenters/{id}/links", async () => {
    await ownerService.createLink("gc-created-101", {
      platform: "INSTAGRAM",
      url: "https://instagram.com/arena_gamenet",
    });

    expect(interceptedRequests.length).toBe(1);
    const req = interceptedRequests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/gamingCenters/gc-created-101/links");
    expect(req.body).toEqual({
      platform: "INSTAGRAM",
      url: "https://instagram.com/arena_gamenet",
    });
  });

  it("4. updates working hours & settings with PUT /gamingCenters/{id}/settings", async () => {
    await ownerService.updateSettings("gc-created-101", {
      timeZone: "Asia/Tehran",
      workStartTime: "10:00",
      workEndTime: "23:00",
      allowOnlineBooking: true,
      onlineBookingAutoConfirm: false,
      preventOverlaps: true,
    });

    expect(interceptedRequests.length).toBe(1);
    const req = interceptedRequests[0];
    expect(req.method).toBe("PUT");
    expect(req.url).toContain("/gamingCenters/gc-created-101/settings");
    expect(req.body).toEqual({
      timeZone: "Asia/Tehran",
      workStartTime: "10:00",
      workEndTime: "23:00",
      allowOnlineBooking: true,
      onlineBookingAutoConfirm: false,
      preventOverlaps: true,
    });
  });

  it("5. propagates API validation errors without falling back to mock persistence", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "SLUG_ALREADY_EXISTS", message: "شناسه انگلیسی قبلاً انتخاب شده است." },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    await expect(
      ownerService.createGamingCenter({
        name: "تکراری",
        slug: "duplicate-slug",
        ownerId: "owner-1",
      })
    ).rejects.toThrow();
  });
});
