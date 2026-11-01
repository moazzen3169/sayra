import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "@/services/ownerService";
import { discountService } from "@/services/discountService";
import { apiClient, ApiError } from "@/lib/api/client";

describe("Phase 9 Task 4: Failure Scenarios", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("1. handles Network Unavailable gracefully without fake fallback", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    await expect(ownerService.listStations("gc-1")).rejects.toThrow("ارتباط با سرور برقرار نشد.");
    await expect(ownerService.listReservationsPaginated("gc-1")).rejects.toThrow("ارتباط با سرور برقرار نشد.");
  });

  it("2. handles API Timeout via AbortSignal", async () => {
    const controller = new AbortController();
    globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise((_, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The user aborted a request.", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const promise = ownerService.getAnalyticsSummary("gc-1", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow();
  });

  it("3. handles 400 Validation Error preserving backend message and error code", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ساعت پایان کار نمی‌تواند قبل از ساعت شروع باشد.",
            details: [{ field: "workEndTime", message: "Invalid time range" }],
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let thrown: any = null;
    try {
      await ownerService.updateSettings("gc-1", {
        workStartTime: "20:00",
        workEndTime: "10:00",
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    expect(thrown.status).toBe(400);
    expect(thrown.code).toBe("VALIDATION_ERROR");
    expect(thrown.message).toBe("ساعت پایان کار نمی‌تواند قبل از ساعت شروع باشد.");
  });

  it("4. handles 401 Unauthorized error", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "نشست نامعتبر است." },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let thrown: any = null;
    try {
      await ownerService.getReservation("gc-1", "res-1");
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    expect(thrown.status).toBe(401);
  });

  it("5. handles 403 Forbidden error", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "FORBIDDEN", message: "عدم دسترسی به گیم‌نت مورد نظر." },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await expect(ownerService.listCommissionsPaginated("gc-forbidden")).rejects.toThrow();
  });

  it("6. handles 404 Not Found error", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NOT_FOUND", message: "تیکت یافت نشد." },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await expect(ownerService.getTicket("t-missing")).rejects.toThrow("تیکت یافت نشد.");
  });

  it("7. handles 409 Conflict error", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "CONFLICT", message: "یک کد تخفیف فعال در این بازه زمانی وجود دارد." },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    let thrown: any = null;
    try {
      await discountService.createDiscount("gc-1", {
        targetType: "GAMING_CENTER",
        targetId: "gc-1",
        valueType: "PERCENTAGE",
        value: 15,
        startAt: "2026-04-01T00:00:00Z",
        endAt: "2026-04-05T00:00:00Z",
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    expect(thrown.status).toBe(409);
    expect(thrown.code).toBe("CONFLICT");
  });

  it("8. handles 500 Server Error without returning fake numbers or data", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "INTERNAL_SERVER_ERROR", message: "خطای داخلی سرور رخ داده است." },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await expect(ownerService.getAnalyticsSummary("gc-1")).rejects.toThrow("خطای داخلی سرور رخ داده است.");
  });

  it("9. handles Empty API responses correctly", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/ratings")) {
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/reservation")) {
        return new Response(
          JSON.stringify({ success: true, data: [], meta: { pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }) as unknown as typeof fetch;

    const ratings = await ownerService.listRatings("empty-slug");
    expect(ratings).toEqual([]);

    const reservations = await ownerService.listReservationsPaginated("gc-1");
    expect(reservations.items).toEqual([]);
    expect(reservations.total).toBe(0);
  });

  it("10. handles Malformed response payloads safely", async () => {
    globalThis.fetch = (async () => {
      return new Response("Not Valid JSON HTML Error", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      });
    }) as unknown as typeof fetch;

    await expect(ownerService.listStations("gc-1")).rejects.toThrow();
  });

  it("11. handles Concurrent actions safely", async () => {
    let callCounter = 0;
    globalThis.fetch = (async () => {
      callCounter++;
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const results = await Promise.all([
      ownerService.listStations("gc-1"),
      ownerService.listReservationsPaginated("gc-1"),
      ownerService.listTickets(),
    ]);

    expect(results.length).toBe(3);
    expect(callCounter).toBe(3);
  });
});
