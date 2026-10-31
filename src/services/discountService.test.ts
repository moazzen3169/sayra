import { describe, expect, it, beforeEach } from "bun:test";
import { discountService, type CreateDiscountInput, type UpdateDiscountInput } from "@/services/discountService";

describe("discountService API operations", () => {
  const centerId = "gc-test-123";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  it("lists discounts with query parameters (targetType, isActive, pagination)", async () => {
    const mockDiscounts = [
      {
        id: "d-1",
        gamingCenterId: centerId,
        targetType: "GAMING_CENTER",
        targetId: centerId,
        valueType: "PERCENTAGE",
        value: 20,
        startAt: "2026-04-01T00:00:00.000Z",
        endAt: "2026-04-04T00:00:00.000Z",
        isActive: true,
      },
    ];

    let capturedUrl = "";

    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: mockDiscounts,
          meta: { page: 1, pageSize: 20, total: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const result = await discountService.listDiscounts(centerId, {
      isActive: true,
      targetType: "GAMING_CENTER",
      page: 1,
      pageSize: 20,
    });

    expect(capturedUrl).toContain(`/gamingCenters/${centerId}/discounts`);
    expect(capturedUrl).toContain("isActive=true");
    expect(capturedUrl).toContain("targetType=GAMING_CENTER");
    expect(capturedUrl).toContain("page=1");
    expect(capturedUrl).toContain("pageSize=20");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d-1");
    expect(result[0].value).toBe(20);
  });

  it("handles raw array response format in listDiscounts", async () => {
    const rawArray = [
      {
        id: "d-2",
        gamingCenterId: centerId,
        targetType: "STATION",
        targetId: "st-1",
        valueType: "FIXED_AMOUNT",
        value: 50000,
        startAt: "2026-04-01T00:00:00.000Z",
        endAt: "2026-04-08T00:00:00.000Z",
        isActive: true,
      },
    ];

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(rawArray), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const result = await discountService.listDiscounts(centerId);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d-2");
    expect(result[0].targetType).toBe("STATION");
  });

  it("gets discount detail by ID", async () => {
    const discountData = {
      id: "d-1",
      gamingCenterId: centerId,
      targetType: "GAMING_CENTER",
      targetId: centerId,
      valueType: "PERCENTAGE",
      value: 15,
      startAt: "2026-04-01T00:00:00.000Z",
      endAt: "2026-04-04T00:00:00.000Z",
      isActive: true,
    };

    let capturedUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ success: true, data: discountData }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await discountService.getDiscount(centerId, "d-1");
    expect(capturedUrl).toContain(`/gamingCenters/${centerId}/discounts/d-1`);
    expect(res.id).toBe("d-1");
    expect(res.value).toBe(15);
  });

  it("creates a discount sending strictly confirmed OpenAPI fields", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const payload: CreateDiscountInput = {
      targetType: "GAMING_CENTER",
      targetId: centerId,
      valueType: "PERCENTAGE",
      value: 25,
      startAt: "2026-04-01T10:00:00.000Z",
      endAt: "2026-04-05T10:00:00.000Z",
      isActive: true,
    };

    await discountService.createDiscount(centerId, payload);

    expect(capturedUrl).toContain(`/gamingCenters/${centerId}/discounts`);
    expect(capturedBody).toEqual({
      targetType: "GAMING_CENTER",
      targetId: centerId,
      valueType: "PERCENTAGE",
      value: 25,
      startAt: "2026-04-01T10:00:00.000Z",
      endAt: "2026-04-05T10:00:00.000Z",
      isActive: true,
    });
    // Ensure no unsupported fields like code or maxUsage were sent
    expect((capturedBody as any).code).toBeUndefined();
    expect((capturedBody as any).maxUsage).toBeUndefined();
  });

  it("updates discount status via dedicated /status endpoint", async () => {
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

    await discountService.updateDiscountStatus(centerId, "disc-99", false);

    expect(capturedUrl).toContain(`/gamingCenters/${centerId}/discounts/disc-99/status`);
    expect(capturedBody).toEqual({ isActive: false });
  });

  it("deletes a discount via DELETE endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method ?? "GET";
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await discountService.deleteDiscount(centerId, "disc-to-delete");

    expect(capturedUrl).toContain(`/gamingCenters/${centerId}/discounts/disc-to-delete`);
    expect(capturedMethod).toBe("DELETE");
  });

  it("updates discount details via PATCH endpoint", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;
    let capturedMethod = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method ?? "GET";
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const updatePayload: UpdateDiscountInput = {
      value: 30,
      endAt: "2026-04-10T00:00:00.000Z",
    };

    await discountService.updateDiscount(centerId, "disc-10", updatePayload);

    expect(capturedUrl).toContain(`/gamingCenters/${centerId}/discounts/disc-10`);
    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual({
      value: 30,
      endAt: "2026-04-10T00:00:00.000Z",
    });
  });
});
