import { describe, it, expect } from "bun:test";
import {
  bookingPreparationService,
  calculateItemBreakdown,
  calculateBookingPriceBreakdown,
  type PreparedItemBreakdown,
} from "./bookingPreparationService";
import type { BookingItem, BookingLine, DeviceGroup, AvailabilityMap } from "@/lib/devices";
import type { GameStationInfo } from "@/services/gamingCenterService";

describe("Phase 9: Booking Preparation and Price Data", () => {
  const sampleStation: GameStationInfo = {
    id: "st-ps5-01",
    gamingCenterId: "gc-tehran-01",
    name: "PS5 VIP #1",
    stationType: "PLAYSTATION",
    hourlyPrice: 120000,
    isActive: true,
  };

  const sampleGroup: DeviceGroup = {
    key: "PLAYSTATION",
    label: "پلی‌استیشن ۵",
    image: "/img/ps5.png",
    isConsole: true,
    stations: [sampleStation],
    capacity: 1,
    minPrice: 120000,
    maxPrice: 120000,
    extraControllerPrice: 40000,
    defaultControllers: 2,
    maxExtra: 2,
  };

  describe("1. Documented Price Formula & Item Breakdown", () => {
    it("calculates station hourly cost without extra controllers (extra = 0)", () => {
      const item: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 0,
        extraUnitPrice: 40000,
      };

      const res = calculateItemBreakdown(item, 1);
      expect(res.error).toBeUndefined();
      expect(res.breakdown).not.toBeNull();
      expect(res.breakdown?.stationBasePrice).toBe(120000);
      expect(res.breakdown?.extraControllersPrice).toBe(0);
      expect(res.breakdown?.itemTotal).toBe(120000);
      expect(res.breakdown?.durationHours).toBe(1);
    });

    it("calculates station hourly cost with extra controllers (extra > 0)", () => {
      const item: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 2,
        extraUnitPrice: 40000,
      };

      const res = calculateItemBreakdown(item, 2);
      expect(res.error).toBeUndefined();
      expect(res.breakdown?.stationBasePrice).toBe(240000); // 120000 * 2 hours
      expect(res.breakdown?.extraControllersPrice).toBe(80000); // 2 * 40000
      expect(res.breakdown?.itemTotal).toBe(320000);
      expect(res.breakdown?.durationHours).toBe(2);
    });

    it("allows zero extra-controller cost when extraUnitPrice is explicitly 0", () => {
      const item: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 2,
        extraUnitPrice: 0,
      };

      const res = calculateItemBreakdown(item, 1);
      expect(res.error).toBeUndefined();
      expect(res.breakdown?.extraControllersPrice).toBe(0);
      expect(res.breakdown?.itemTotal).toBe(120000);
    });
  });

  describe("2. Missing Data & Negative/Invalid Values Handling", () => {
    it("returns validation error when hourlyPrice is missing or undefined (does not fallback to 0)", () => {
      const stationWithoutPrice = {
        ...sampleStation,
        hourlyPrice: undefined as unknown as number,
      };

      const item: BookingItem = {
        station: stationWithoutPrice,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      };

      const res = calculateItemBreakdown(item, 1);
      expect(res.error).toBeDefined();
      expect(res.breakdown).toBeNull();
    });

    it("returns validation error when hourlyPrice is negative", () => {
      const stationNegativePrice = {
        ...sampleStation,
        hourlyPrice: -50000,
      };

      const item: BookingItem = {
        station: stationNegativePrice,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      };

      const res = calculateItemBreakdown(item, 1);
      expect(res.error).toBeDefined();
      expect(res.breakdown).toBeNull();
    });

    it("returns validation error when extraControllers > 0 but extraUnitPrice is undefined", () => {
      const item: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 1,
        extraUnitPrice: undefined as unknown as number,
      };

      const res = calculateItemBreakdown(item, 1);
      expect(res.error).toBeDefined();
      expect(res.breakdown).toBeNull();
    });

    it("returns validation error when duration is invalid (0 or negative or non-integer)", () => {
      const item: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      };

      expect(calculateItemBreakdown(item, 0).error).toBeDefined();
      expect(calculateItemBreakdown(item, -1).error).toBeDefined();
      expect(calculateItemBreakdown(item, 1.5).error).toBeDefined();
    });
  });

  describe("3. Price Breakdown Aggregation & Estimate Semantics", () => {
    it("marks breakdown strictly as non-final estimate (isFinal: false, isEstimate: true)", () => {
      const item1: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 1,
        extraUnitPrice: 30000,
      };
      const item2: BookingItem = {
        station: sampleStation,
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T15:00:00Z",
        extraControllers: 1,
        extraUnitPrice: 30000,
      };

      const { breakdown, errors } = calculateBookingPriceBreakdown([item1, item2], 1);
      expect(errors.length).toBe(0);
      expect(breakdown.isFinal).toBe(false);
      expect(breakdown.isEstimate).toBe(true);
      expect(breakdown.totalHours).toBe(2);
      expect(breakdown.itemsCount).toBe(2);
      expect(breakdown.subtotalStationPrice).toBe(240000);
      expect(breakdown.subtotalExtraPrice).toBe(60000);
      expect(breakdown.grandTotal).toBe(300000);
    });

    it("sets grandTotal to null when any item has calculation errors", () => {
      const invalidItem: BookingItem = {
        station: { ...sampleStation, hourlyPrice: NaN },
        groupLabel: sampleGroup.label,
        startTime: "2026-11-10T14:00:00Z",
        extraControllers: 0,
        extraUnitPrice: 0,
      };

      const { breakdown, errors } = calculateBookingPriceBreakdown([invalidItem], 1);
      expect(errors.length).toBeGreaterThan(0);
      expect(breakdown.grandTotal).toBeNull();
    });
  });

  describe("4. bookingPreparationService.prepareBooking Verification", () => {
    const avail: AvailabilityMap = {
      "st-ps5-01": {
        "2026-11-10T14:00:00Z": true,
        "2026-11-10T15:00:00Z": true,
      },
    };

    it("prepares valid booking selection and returns verified items and price breakdown", () => {
      const line: BookingLine = {
        group: sampleGroup,
        qty: 1,
        extra: 1,
      };

      const result = bookingPreparationService.prepareBooking({
        gamingCenterSlug: "gc-tehran",
        gamingCenterId: "gc-tehran-01",
        lines: [line],
        startTimes: ["2026-11-10T14:00:00Z"],
        availability: avail,
      });

      expect(result.isValid).toBe(true);
      expect(result.validationErrors.length).toBe(0);
      expect(result.items?.length).toBe(1);
      expect(result.breakdown.grandTotal).toBe(160000); // 120000 + 40000
    });

    it("fails validation when requested station does not belong to target center", () => {
      const mismatchedLine: BookingLine = {
        group: {
          ...sampleGroup,
          stations: [
            {
              ...sampleStation,
              gamingCenterId: "other-center-999",
            },
          ],
        },
        qty: 1,
        extra: 0,
      };

      const result = bookingPreparationService.prepareBooking({
        gamingCenterSlug: "gc-tehran",
        gamingCenterId: "gc-tehran-01",
        lines: [mismatchedLine],
        startTimes: ["2026-11-10T14:00:00Z"],
        availability: avail,
      });

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some((e) => e.includes("متعلق به این گیمنت نمی‌باشد"))).toBe(true);
    });

    it("fails validation when station is inactive", () => {
      const inactiveLine: BookingLine = {
        group: {
          ...sampleGroup,
          stations: [
            {
              ...sampleStation,
              isActive: false,
            },
          ],
        },
        qty: 1,
        extra: 0,
      };

      const result = bookingPreparationService.prepareBooking({
        gamingCenterSlug: "gc-tehran",
        gamingCenterId: "gc-tehran-01",
        lines: [inactiveLine],
        startTimes: ["2026-11-10T14:00:00Z"],
        availability: avail,
      });

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some((e) => e.includes("غیرفعال است"))).toBe(true);
    });

    it("detects stale or changed availability where slot is no longer free", () => {
      const staleAvail: AvailabilityMap = {
        "st-ps5-01": {
          "2026-11-10T14:00:00Z": false, // Taken
        },
      };

      const line: BookingLine = {
        group: sampleGroup,
        qty: 1,
        extra: 0,
      };

      const result = bookingPreparationService.prepareBooking({
        gamingCenterSlug: "gc-tehran",
        gamingCenterId: "gc-tehran-01",
        lines: [line],
        startTimes: ["2026-11-10T14:00:00Z"],
        availability: staleAvail,
      });

      expect(result.isValid).toBe(false);
      expect(result.items).toBeNull();
      expect(result.validationErrors.some((e) => e.includes("آزاد نیست"))).toBe(true);
    });
  });
});
