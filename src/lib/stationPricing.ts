/**
 * Utility functions and types for station pricing & discounts.
 * Handles station-level pricing returned by the backend in:
 * GET /public/gamingCenters/:slug/stations
 * e.g.
 * {
 *   hourlyPrice: 185000,
 *   pricing: {
 *     originalPrice: 185000,
 *     discountPercentage: 20,
 *     discountAmount: 37000,
 *     finalPrice: 148000,
 *     hasDiscount: true,
 *     durationHours: 1
 *   }
 * }
 */

import type { PhysicalStation, StationPricing } from "@/types/gaming-center/station.types";

export interface EffectiveStationPricing {
  originalHourlyPrice: number;
  finalHourlyPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  hasDiscount: boolean;
}

/**
 * Extracts and computes the effective pricing for a station.
 * Prioritizes backend `pricing` object when `hasDiscount: true` or discount values > 0.
 */
export function getEffectiveStationPricing(
  station: Pick<PhysicalStation, "hourlyPrice"> & {
    pricing?: StationPricing | null;
  }
): EffectiveStationPricing {
  const baseHourlyPrice = typeof station.hourlyPrice === "number" && !isNaN(station.hourlyPrice)
    ? station.hourlyPrice
    : 0;

  const pricing = station.pricing;

  if (!pricing) {
    return {
      originalHourlyPrice: baseHourlyPrice,
      finalHourlyPrice: baseHourlyPrice,
      hasDiscount: false,
    };
  }

  const hasDiscount = Boolean(
    pricing.hasDiscount === true ||
    (typeof pricing.discountPercentage === "number" && pricing.discountPercentage > 0) ||
    (typeof pricing.discountAmount === "number" && pricing.discountAmount > 0) ||
    (typeof pricing.finalPrice === "number" &&
      typeof pricing.originalPrice === "number" &&
      pricing.finalPrice < pricing.originalPrice)
  );

  const originalHourlyPrice =
    typeof pricing.originalPrice === "number" && pricing.originalPrice > 0
      ? pricing.originalPrice
      : baseHourlyPrice;

  let finalHourlyPrice = baseHourlyPrice;

  if (hasDiscount) {
    if (typeof pricing.finalPrice === "number" && pricing.finalPrice >= 0) {
      finalHourlyPrice = pricing.finalPrice;
    } else if (
      typeof pricing.discountPercentage === "number" &&
      pricing.discountPercentage > 0 &&
      originalHourlyPrice > 0
    ) {
      finalHourlyPrice = Math.max(
        0,
        Math.round(originalHourlyPrice * (1 - pricing.discountPercentage / 100))
      );
    } else if (
      typeof pricing.discountAmount === "number" &&
      pricing.discountAmount > 0 &&
      originalHourlyPrice > 0
    ) {
      finalHourlyPrice = Math.max(0, originalHourlyPrice - pricing.discountAmount);
    }
  }

  return {
    originalHourlyPrice,
    finalHourlyPrice,
    discountPercentage: pricing.discountPercentage,
    discountAmount: pricing.discountAmount,
    hasDiscount: hasDiscount && finalHourlyPrice < originalHourlyPrice,
  };
}
