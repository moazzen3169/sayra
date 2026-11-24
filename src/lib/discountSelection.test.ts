import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  computeSingleDiscountPricing,
  discountSelectionKey,
  isDiscountApplicableToStation,
  mergeAvailableDiscounts,
  pickDefaultDiscount,
  pickRepresentativeStations,
} from "./discountSelection";
import { discountSelectionApi } from "@/services/gaming-center/discount-selection.api";
import type { AvailableDiscountItem } from "@/types/gaming-center/discount-selection.types";

const makeDiscount = (
  overrides: Partial<AvailableDiscountItem> = {}
): AvailableDiscountItem => ({
  id: "disc-1",
  type: "DIRECT_DISCOUNT",
  title: "تخفیف گیمنت",
  discountType: "PERCENTAGE",
  value: 20,
  discountAmount: 20000,
  finalPrice: 80000,
  fundingSource: "MERCHANT_FUNDED",
  conditions: "قابل استفاده روی دستگاه‌های منتخب",
  isApplicable: true,
  isBest: false,
  ...overrides,
});

describe("discountSelection helpers", () => {
  it("merges and deduplicates CAMPAIGN and DIRECT_DISCOUNT across stations", () => {
    const campaign = makeDiscount({
      id: "cmp-1",
      type: "CAMPAIGN",
      title: "کمپین ویژه پلتفرم",
      discountType: "PERCENTAGE",
      value: 30,
      discountAmount: 30000,
      finalPrice: 70000,
      fundingSource: "PLATFORM",
      isBest: true,
    });
    const directStationOnly = makeDiscount({
      id: "dir-1",
      type: "DIRECT_DISCOUNT",
      title: "تخفیف PS5",
      value: 15,
      discountAmount: 15000,
      finalPrice: 85000,
    });

    const merged = mergeAvailableDiscounts([
      {
        stationId: "st-1",
        response: {
          basePrice: 100000,
          recommendedDiscountId: "cmp-1",
          recommendedDiscountType: "CAMPAIGN",
          discounts: [directStationOnly, campaign],
        },
      },
      {
        stationId: "st-2",
        response: {
          basePrice: 100000,
          recommendedDiscountId: "cmp-1",
          recommendedDiscountType: "CAMPAIGN",
          discounts: [campaign],
        },
      },
    ]);

    expect(merged.discounts).toHaveLength(2);
    expect(merged.recommendedKey).toBe(discountSelectionKey("CAMPAIGN", "cmp-1"));
    // Recommended / best item sorted first
    expect(merged.discounts[0].id).toBe("cmp-1");
    expect(merged.discounts[0].applicableStationIds).toEqual(["st-1", "st-2"]);
    expect(merged.discounts[1].id).toBe("dir-1");
    expect(merged.discounts[1].applicableStationIds).toEqual(["st-1"]);

    // Center-wide campaign applies to both stations; station-only direct discount only to st-1
    expect(
      isDiscountApplicableToStation(merged.discounts[0], "st-2", merged.queriedStationIds)
    ).toBe(true);
    expect(
      isDiscountApplicableToStation(merged.discounts[1], "st-1", merged.queriedStationIds)
    ).toBe(true);
    expect(
      isDiscountApplicableToStation(merged.discounts[1], "st-2", merged.queriedStationIds)
    ).toBe(false);
  });

  it("picks default discount prioritizing recommended, then isBest, then first applicable", () => {
    const d1 = makeDiscount({ id: "d1", isBest: false, isApplicable: true });
    const d2 = makeDiscount({ id: "d2", type: "CAMPAIGN", isBest: true, isApplicable: true });
    const d3 = makeDiscount({ id: "d3", isBest: true, isApplicable: false });

    expect(
      pickDefaultDiscount([d1, d2, d3], discountSelectionKey("DIRECT_DISCOUNT", "d1"))?.id
    ).toBe("d1");
    expect(pickDefaultDiscount([d1, d2, d3], null)?.id).toBe("d2");
    expect(pickDefaultDiscount([d3, d1], null)?.id).toBe("d1");
    expect(pickDefaultDiscount([], null)).toBeNull();
  });

  it("computes single discount pricing with percentage, fixed amount, caps, and minOrderAmount without stacking", () => {
    const pctWithCap = makeDiscount({
      discountType: "PERCENTAGE",
      value: 25,
      maxDiscountAmount: 30000,
    });
    const res1 = computeSingleDiscountPricing(200000, pctWithCap);
    expect(res1.discountAmount).toBe(30000);
    expect(res1.finalPrice).toBe(170000);
    expect(res1.hasDiscount).toBe(true);

    const fixedWithMin = makeDiscount({
      discountType: "FIXED_AMOUNT",
      value: 40000,
      minOrderAmount: 150000,
    });
    // Below minOrderAmount -> not applied
    const resBelowMin = computeSingleDiscountPricing(100000, fixedWithMin);
    expect(resBelowMin.discountAmount).toBe(0);
    expect(resBelowMin.finalPrice).toBe(100000);
    expect(resBelowMin.hasDiscount).toBe(false);

    // At or above minOrderAmount -> applied
    const resAboveMin = computeSingleDiscountPricing(150000, fixedWithMin);
    expect(resAboveMin.discountAmount).toBe(40000);
    expect(resAboveMin.finalPrice).toBe(110000);
    expect(resAboveMin.hasDiscount).toBe(true);
  });

  it("picks representative stations prioritizing discounted stations and distinct categories", () => {
    const stations = [
      { id: "s1", hourlyPrice: 100000, stationType: "PC" },
      { id: "s2", hourlyPrice: 100000, stationType: "PC" },
      { id: "s3", hourlyPrice: 120000, stationType: "PS5" },
      {
        id: "s4",
        hourlyPrice: 150000,
        stationType: "VR",
        pricing: { originalPrice: 150000, finalPrice: 120000, hasDiscount: true },
      },
      { id: "s5", hourlyPrice: 100000, stationType: "XBOX" },
    ];
    const picked = pickRepresentativeStations(stations, 3);
    expect(picked).toHaveLength(3);
    expect(picked[0].id).toBe("s4");
  });
});

describe("discountSelectionApi", () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";

  beforeEach(() => {
    capturedUrl = "";
    capturedMethod = "";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls GET /gamingCenters/{id}/discounts/available with query params and unwraps response", async () => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "GET";
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            basePrice: 120000,
            recommendedDiscountId: "cmp-9",
            recommendedDiscountType: "CAMPAIGN",
            discounts: [makeDiscount({ id: "cmp-9", type: "CAMPAIGN", isBest: true })],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await discountSelectionApi.getAvailableDiscounts("gc-123", {
      stationId: "st-45",
      basePrice: 120000,
      durationMinutes: 60,
      customerAccountId: "cust-1",
    });

    expect(capturedMethod).toBe("GET");
    expect(capturedUrl).toContain("/gamingCenters/gc-123/discounts/available");
    expect(capturedUrl).toContain("stationId=st-45");
    expect(capturedUrl).toContain("basePrice=120000");
    expect(capturedUrl).toContain("customerAccountId=cust-1");
    expect(res.recommendedDiscountId).toBe("cmp-9");
    expect(res.discounts).toHaveLength(1);
  });

  it("calls POST /gamingCenters/{id}/discounts/select", async () => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "GET";
      return new Response(
        JSON.stringify({
          isValid: true,
          originalAmount: 120000,
          discountAmount: 24000,
          customerPayableAmount: 96000,
          campaignId: "cmp-9",
          discountId: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await discountSelectionApi.selectDiscount("gc-123", {
      stationId: "st-45",
      basePrice: 120000,
      selectedDiscountId: "cmp-9",
      selectedType: "CAMPAIGN",
    });

    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toContain("/gamingCenters/gc-123/discounts/select");
    expect(res.isValid).toBe(true);
    expect(res.customerPayableAmount).toBe(96000);
  });
});
