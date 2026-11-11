import { describe, it, expect } from "bun:test";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import { stationApi } from "@/services/gaming-center/station.api";
import { calculateItemBreakdown, bookingPreparationService } from "@/services/bookingPreparationService";
import { groupStations, estimateItemPrice, type BookingLine } from "@/lib/devices";
import type { PhysicalStation } from "@/types/gaming-center/station.types";

describe("Station Discount and Pricing Flow", () => {
  const sampleApiResponse = {
    success: true,
    data: {
      data: [
        {
          id: "cmw8ikyqh002p8quhtmsd9zh2",
          gamingCenterId: "cmw2lzu520017123lfuvfmtcd",
          name: "بیلیارد #3",
          stationType: "PC",
          deviceTypeId: null,
          catalogDeviceId: "cmw6874xe000rhm6ep3789a3k",
          coverImageUrl: "/uploads/cbea77da-e313-4eab-8797-07521b86dadb.png",
          isVip: false,
          hourlyPrice: 200000,
          minRentHours: 1,
          maxRentHours: 8,
          defaultDurationHours: 1,
          incrementMinutes: 30,
          isActive: true,
          createdAt: "2026-11-09T00:19:45.498Z",
          updatedAt: "2026-11-09T00:19:45.498Z",
          pricing: {
            originalPrice: 200000,
            discountPercentage: 20,
            discountAmount: 40000,
            finalPrice: 160000,
            hasDiscount: true,
            durationHours: 1,
          },
        },
        {
          id: "cmw7tasit0008bp5ih2bzfc03",
          gamingCenterId: "cmw2lzu520017123lfuvfmtcd",
          name: "mamadps #4",
          stationType: "PLAYSTATION",
          deviceTypeId: null,
          catalogDeviceId: "cmw67yses000chm6eh0bwm2o1",
          coverImageUrl: ".\\public\\img\\ps5.png",
          isVip: false,
          hourlyPrice: 185000,
          minRentHours: 1,
          maxRentHours: 8,
          defaultDurationHours: 1,
          incrementMinutes: 30,
          isActive: true,
          createdAt: "2026-11-08T12:32:00.484Z",
          updatedAt: "2026-11-08T12:32:00.484Z",
          pricing: {
            originalPrice: 185000,
            discountPercentage: 20,
            discountAmount: 37000,
            finalPrice: 148000,
            hasDiscount: true,
            durationHours: 1,
          },
        },
        {
          id: "no-discount-st",
          gamingCenterId: "cmw2lzu520017123lfuvfmtcd",
          name: "Xbox Standard",
          stationType: "XBOX",
          catalogDeviceId: null,
          coverImageUrl: null,
          isVip: false,
          hourlyPrice: 100000,
          minRentHours: 1,
          maxRentHours: 8,
          defaultDurationHours: 1,
          incrementMinutes: 30,
          isActive: true,
          createdAt: "2026-11-08T12:32:00.484Z",
          updatedAt: "2026-11-08T12:32:00.484Z",
          pricing: {
            originalPrice: 100000,
            discountPercentage: 0,
            discountAmount: 0,
            finalPrice: 100000,
            hasDiscount: false,
            durationHours: 1,
          },
        },
      ],
      meta: {
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
    meta: {
      requestId: "wx7dpofhqd3zblzx36o9nio6",
    },
  };

  it("extracts pricing and discounts accurately using getEffectiveStationPricing", () => {
    const discountedBilliard = sampleApiResponse.data.data[0] as PhysicalStation;
    const pricing1 = getEffectiveStationPricing(discountedBilliard);

    expect(pricing1.hasDiscount).toBe(true);
    expect(pricing1.originalHourlyPrice).toBe(200000);
    expect(pricing1.finalHourlyPrice).toBe(160000);
    expect(pricing1.discountPercentage).toBe(20);
    expect(pricing1.discountAmount).toBe(40000);

    const discountedPs = sampleApiResponse.data.data[1] as PhysicalStation;
    const pricing2 = getEffectiveStationPricing(discountedPs);

    expect(pricing2.hasDiscount).toBe(true);
    expect(pricing2.originalHourlyPrice).toBe(185000);
    expect(pricing2.finalHourlyPrice).toBe(148000);
    expect(pricing2.discountPercentage).toBe(20);

    const nonDiscounted = sampleApiResponse.data.data[2] as PhysicalStation;
    const pricing3 = getEffectiveStationPricing(nonDiscounted);

    expect(pricing3.hasDiscount).toBe(false);
    expect(pricing3.originalHourlyPrice).toBe(100000);
    expect(pricing3.finalHourlyPrice).toBe(100000);
  });

  it("handles station without pricing property gracefully", () => {
    const plainStation: PhysicalStation = {
      id: "plain-1",
      gamingCenterId: "gc-1",
      name: "PC 1",
      stationType: "PC",
      catalogDeviceId: null,
      coverImageUrl: null,
      hourlyPrice: 120000,
      minRentHours: 1,
      maxRentHours: 8,
      defaultDurationHours: 1,
      incrementMinutes: 30,
      isVip: false,
      isActive: true,
    };

    const pricing = getEffectiveStationPricing(plainStation);
    expect(pricing.hasDiscount).toBe(false);
    expect(pricing.originalHourlyPrice).toBe(120000);
    expect(pricing.finalHourlyPrice).toBe(120000);
  });

  it("computes finalPrice from percentage if finalPrice is missing from pricing object", () => {
    const stationWithPercentageOnly = {
      hourlyPrice: 100000,
      pricing: {
        originalPrice: 100000,
        discountPercentage: 25,
        hasDiscount: true,
      },
    };

    const pricing = getEffectiveStationPricing(stationWithPercentageOnly as any);
    expect(pricing.hasDiscount).toBe(true);
    expect(pricing.originalHourlyPrice).toBe(100000);
    expect(pricing.finalHourlyPrice).toBe(75000);
  });

  it("stationApi parses stations with pricing property intact", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(sampleApiResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    try {
      const res = await stationApi.getPhysicalStations("respawn-zone");
      expect(res.stations.length).toBe(3);
      expect(res.stations[0].pricing?.hasDiscount).toBe(true);
      expect(res.stations[0].pricing?.finalPrice).toBe(160000);
      expect(res.stations[1].pricing?.finalPrice).toBe(148000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("calculateItemBreakdown uses finalPrice when discount is active", () => {
    const station = sampleApiResponse.data.data[1] as any;
    const res = calculateItemBreakdown(
      {
        station,
        groupLabel: "PS5",
        startTime: "2026-11-08T14:00:00.000Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      },
      2
    );

    expect(res.breakdown).not.toBeNull();
    // 2 hours * 148,000 (final discounted price) = 296,000
    expect(res.breakdown?.hourlyPrice).toBe(148000);
    expect(res.breakdown?.stationBasePrice).toBe(296000);
    expect(res.breakdown?.itemTotal).toBe(296000);
  });

  it("devices groupStations and estimateItemPrice reflect discounted prices", () => {
    const stations = [sampleApiResponse.data.data[1]] as any;
    const groups = groupStations(stations);
    expect(groups.length).toBe(1);
    expect(groups[0].minPrice).toBe(148000);
    expect(groups[0].maxPrice).toBe(148000);

    const bookingItem = {
      station: stations[0],
      groupLabel: "PS5",
      startTime: "2026-11-08T14:00:00.000Z",
      extraControllers: 0,
      extraUnitPrice: 0,
    };

    expect(estimateItemPrice(bookingItem)).toBe(148000);
  });

  it("bookingPreparationService calculates grandTotal using discounted final prices", () => {
    const stations = [sampleApiResponse.data.data[0]] as any; // Billiard: original 200,000, final 160,000
    const lines: BookingLine[] = [
      {
        group: {
          key: "PC",
          label: "کامپیوتر گیمینگ",
          image: "/img/pc.png",
          isConsole: false,
          stations,
          capacity: 1,
          minPrice: 160000,
          maxPrice: 160000,
          defaultControllers: 0,
          maxExtra: 0,
        },
        qty: 1,
        extra: 0,
      },
    ];

    const availability = {
      [stations[0].id]: {
        "2026-11-09T15:00:00.000Z": true,
      },
    };

    const result = bookingPreparationService.prepareBooking({
      gamingCenterSlug: "respawn-zone",
      lines,
      startTimes: ["2026-11-09T15:00:00.000Z"],
      availability,
      durationHoursPerSlot: 1,
    });

    expect(result.isValid).toBe(true);
    expect(result.breakdown.grandTotal).toBe(160000);
    expect(result.breakdown.items[0].hourlyPrice).toBe(160000);
  });
});
