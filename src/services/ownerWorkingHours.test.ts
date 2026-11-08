import { describe, it, expect, afterEach } from "bun:test";
import { ownerService } from "@/services/ownerService";

describe("Owner Working Hours & Settings Management (Phase hours)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("1. fetches working hours and settings from GET /gamingCenters/{id}/settings", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-99/settings")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              workStartTime: "10:00",
              workEndTime: "23:00",
              timeZone: "Asia/Tehran",
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

    const settings = await ownerService.getSettings("gc-99");
    expect(settings.workStartTime).toBe("10:00");
    expect(settings.workEndTime).toBe("23:00");
    expect(settings.timeZone).toBe("Asia/Tehran");
    expect(settings.allowOnlineBooking).toBe(true);
    expect(settings.onlineBookingAutoConfirm).toBe(false);
    expect(settings.preventOverlaps).toBe(true);
  });

  it("2. updates working hours and settings with PUT /gamingCenters/{id}/settings sending sanitized OpenAPI fields", async () => {
    let capturedMethod = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-99/settings")) {
        capturedMethod = init?.method || "GET";
        if (init?.body) {
          capturedBody = JSON.parse(String(init.body));
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: capturedBody,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await ownerService.updateSettings("gc-99", {
      workStartTime: "12:00",
      workEndTime: "02:00",
      timeZone: "Asia/Tehran",
      allowOnlineBooking: true,
      onlineBookingAutoConfirm: true,
      preventOverlaps: true,
      // @ts-ignore - test extra undocumented field filtering
      unknownField: "should-be-omitted",
    });

    expect(capturedMethod).toBe("PUT");
    expect(capturedBody.workStartTime).toBe("12:00");
    expect(capturedBody.workEndTime).toBe("02:00");
    expect(capturedBody.timeZone).toBe("Asia/Tehran");
    expect(capturedBody.allowOnlineBooking).toBe(true);
    expect(capturedBody.onlineBookingAutoConfirm).toBe(true);
    expect(capturedBody.preventOverlaps).toBe(true);
    expect(capturedBody.unknownField).toBeUndefined();
  });

  it("3. handles 501 Not Implemented on PUT by falling back to PATCH /gamingCenters/{id}/settings", async () => {
    let putCalled = false;
    let patchCalled = false;
    let patchBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/gamingCenters/gc-99/settings")) {
        if (init?.method === "PUT") {
          putCalled = true;
          return new Response(JSON.stringify({ success: false, message: "Not Implemented" }), {
            status: 501,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (init?.method === "PATCH") {
          patchCalled = true;
          patchBody = JSON.parse(String(init?.body));
          return new Response(JSON.stringify({ success: true, data: patchBody }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    await ownerService.updateSettings("gc-99", {
      workStartTime: "10:00",
      workEndTime: "22:00",
      timeZone: "Asia/Tehran",
      allowOnlineBooking: true,
    });

    expect(putCalled).toBe(true);
    expect(patchCalled).toBe(true);
    expect(patchBody.timeZone).toBe("Asia/Tehran");
  });

  it("4. handles backend error responses cleanly", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid time format for workEndTime",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let thrownError: any = null;
    try {
      await ownerService.updateSettings("gc-99", {
        workStartTime: "10:00",
        workEndTime: "invalid-time",
      });
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.status).toBe(400);
    expect(thrownError?.code).toBe("VALIDATION_ERROR");
    expect(thrownError?.message).toBe("Invalid time format for workEndTime");
  });
});
