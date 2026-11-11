import type { GameStationInfo } from "@/services/gamingCenterService";
import type { BookingLine, BookingItem, AvailabilityMap } from "@/lib/devices";
import { allocateItems } from "@/lib/devices";

/**
 * Breakdown of a single prepared booking line item.
 */
export interface PreparedItemBreakdown {
  stationId: string;
  stationName: string;
  stationType: string;
  startTime: string;
  durationHours: number;
  hourlyPrice: number;
  stationBasePrice: number;
  extraControllers: number;
  extraUnitPrice: number;
  extraControllersPrice: number;
  itemTotal: number;
}

/**
 * Comprehensive price breakdown for a prepared booking.
 * Note: All computed values prior to server reservation submission are strictly non-final estimates.
 */
export interface BookingPriceBreakdown {
  currency: string;
  isFinal: boolean;
  isEstimate: boolean;
  totalHours: number;
  itemsCount: number;
  subtotalStationPrice: number;
  subtotalExtraPrice: number;
  grandTotal: number | null; // null if pricing is unavailable due to missing/invalid fields
  items: PreparedItemBreakdown[];
}

/**
 * Parameters to prepare and validate a booking selection before submission.
 */
export interface PrepareBookingParams {
  gamingCenterSlug: string;
  gamingCenterId?: string;
  lines: BookingLine[];
  startTimes: string[];
  availability: AvailabilityMap;
  durationHoursPerSlot?: number;
}

export interface PreparedBookingResult {
  isValid: boolean;
  items: BookingItem[] | null;
  breakdown: BookingPriceBreakdown;
  validationErrors: string[];
}

export interface ItemCalculationResult {
  breakdown: PreparedItemBreakdown | null;
  error?: string;
}

/**
 * Calculates item-level pricing strictly based on documented contract fields.
 * Formula:
 *   stationBasePrice = hourlyPrice * durationHours
 *   extraControllersPrice = extraControllers * extraUnitPrice
 *   itemTotal = stationBasePrice + extraControllersPrice
 *
 * Requirements:
 * - If station.hourlyPrice is missing, undefined, null, NaN, or < 0, does NOT silently fallback to zero. Returns an error.
 * - If extraControllers > 0 but extraUnitPrice is undefined, null, NaN, or < 0, does NOT silently fallback to zero. Returns an error.
 * - When extraControllers === 0, extraControllersPrice is 0 regardless of extraUnitPrice.
 */
export function calculateItemBreakdown(
  item: BookingItem,
  durationHours = 1
): ItemCalculationResult {
  if (typeof durationHours !== "number" || isNaN(durationHours) || durationHours <= 0 || !Number.isInteger(durationHours)) {
    return {
      breakdown: null,
      error: `مدت زمان نامعتبر است: ${durationHours}`,
    };
  }

  const { station } = item;
  if (!station) {
    return {
      breakdown: null,
      error: "اطلاعات دستگاه مشخص نیست.",
    };
  }

  if (typeof station.hourlyPrice !== "number" || isNaN(station.hourlyPrice) || station.hourlyPrice < 0) {
    return {
      breakdown: null,
      error: `مبلغ ساعتی دستگاه ${station.name || station.id} مشخص یا معتبر نیست (${station.hourlyPrice}).`,
    };
  }

  // If station has active discount in pricing, prioritize finalPrice
  let effectiveHourlyPrice = station.hourlyPrice;
  const pricing = (station as { pricing?: { finalPrice?: number; hasDiscount?: boolean } }).pricing;
  if (pricing && pricing.hasDiscount && typeof pricing.finalPrice === "number" && pricing.finalPrice >= 0) {
    effectiveHourlyPrice = pricing.finalPrice;
  }

  const hourlyPrice = effectiveHourlyPrice;
  const stationBasePrice = hourlyPrice * durationHours;

  const extraCount = item.extraControllers;
  if (typeof extraCount !== "number" || isNaN(extraCount) || extraCount < 0 || !Number.isInteger(extraCount)) {
    return {
      breakdown: null,
      error: `تعداد دسته اضافه برای دستگاه ${station.name} نامعتبر است: ${extraCount}`,
    };
  }

  let extraUnit = 0;
  let extraControllersPrice = 0;

  if (extraCount > 0) {
    if (typeof item.extraUnitPrice !== "number" || isNaN(item.extraUnitPrice) || item.extraUnitPrice < 0) {
      return {
        breakdown: null,
        error: `مبلغ دسته اضافه برای دستگاه ${station.name} مشخص یا معتبر نیست.`,
      };
    }
    extraUnit = item.extraUnitPrice;
    extraControllersPrice = extraCount * extraUnit;
  }

  const itemTotal = stationBasePrice + extraControllersPrice;

  return {
    breakdown: {
      stationId: station.id,
      stationName: station.name,
      stationType: station.stationType,
      startTime: item.startTime,
      durationHours,
      hourlyPrice,
      stationBasePrice,
      extraControllers: extraCount,
      extraUnitPrice: extraUnit,
      extraControllersPrice,
      itemTotal,
    },
  };
}

/**
 * Aggregates item breakdowns into a comprehensive total estimate.
 * Does not invent fees, taxes, discounts, or arbitrary roundings.
 */
export function calculateBookingPriceBreakdown(
  items: BookingItem[] | null,
  durationHoursPerItem = 1
): { breakdown: BookingPriceBreakdown; errors: string[] } {
  const errors: string[] = [];
  const breakdowns: PreparedItemBreakdown[] = [];

  if (!items || items.length === 0) {
    return {
      breakdown: {
        currency: "IRR_TOMAN",
        isFinal: false,
        isEstimate: true,
        totalHours: 0,
        itemsCount: 0,
        subtotalStationPrice: 0,
        subtotalExtraPrice: 0,
        grandTotal: 0,
        items: [],
      },
      errors,
    };
  }

  for (const it of items) {
    const res = calculateItemBreakdown(it, durationHoursPerItem);
    if (res.error) {
      errors.push(res.error);
    } else if (res.breakdown) {
      breakdowns.push(res.breakdown);
    }
  }

  const hasCalculationError = errors.length > 0;
  const subtotalStationPrice = breakdowns.reduce((acc, it) => acc + it.stationBasePrice, 0);
  const subtotalExtraPrice = breakdowns.reduce((acc, it) => acc + it.extraControllersPrice, 0);
  const grandTotal = hasCalculationError ? null : subtotalStationPrice + subtotalExtraPrice;
  const totalHours = breakdowns.reduce((acc, it) => acc + it.durationHours, 0);

  return {
    breakdown: {
      currency: "IRR_TOMAN",
      isFinal: false,
      isEstimate: true,
      totalHours,
      itemsCount: breakdowns.length,
      subtotalStationPrice,
      subtotalExtraPrice,
      grandTotal,
      items: breakdowns,
    },
    errors,
  };
}

/**
 * Service to validate booking inputs and prepare pricing breakdown
 * without submitting reservations to the backend.
 */
export const bookingPreparationService = {
  /**
   * Prepares and validates a booking selection:
   * - Validates center slug and ID consistency.
   * - Validates line quantities, duration, and active station state.
   * - Verifies that stations belong to the target gaming center if centerId is provided.
   * - Verifies availability map coverage for all requested slots.
   * - Computes item-level breakdown and total non-final price estimate.
   * - Returns explicit validation errors if any pricing or availability field is absent or invalid.
   */
  prepareBooking(params: PrepareBookingParams): PreparedBookingResult {
    const { lines, startTimes, availability, gamingCenterSlug, gamingCenterId, durationHoursPerSlot = 1 } = params;
    const errors: string[] = [];

    if (!gamingCenterSlug || gamingCenterSlug.trim() === "") {
      errors.push("شناسه گیمنت (اسلاگ) مشخص نشده است.");
    }

    if (typeof durationHoursPerSlot !== "number" || isNaN(durationHoursPerSlot) || durationHoursPerSlot <= 0 || !Number.isInteger(durationHoursPerSlot)) {
      errors.push(`مدت زمان انتخابی نامعتبر است: ${durationHoursPerSlot}`);
    }

    if (!lines || lines.length === 0) {
      errors.push("هیچ دستگاهی برای رزرو انتخاب نشده است.");
    }

    if (!startTimes || startTimes.length === 0) {
      errors.push("هیچ ساعتی برای رزرو انتخاب نشده است.");
    }

    // Station and line validations
    for (const line of lines || []) {
      if (typeof line.qty !== "number" || isNaN(line.qty) || line.qty <= 0 || !Number.isInteger(line.qty)) {
        errors.push(`تعداد درخواستی برای ${line.group?.label || "دستگاه"} نامعتبر است.`);
        continue;
      }
      if (line.qty > line.group.capacity) {
        errors.push(`تعداد درخواستی برای ${line.group.label} بیشتر از ظرفیت موجود است.`);
      }
      if (typeof line.extra !== "number" || isNaN(line.extra) || line.extra < 0 || !Number.isInteger(line.extra)) {
        errors.push(`تعداد دسته اضافه برای ${line.group.label} نامعتبر است.`);
      }

      for (const s of line.group.stations) {
        if (!s.id) {
          errors.push(`دستگاه فاقد شناسه معتبر است.`);
        }
        if (gamingCenterId && s.gamingCenterId && s.gamingCenterId !== gamingCenterId) {
          errors.push(`دستگاه ${s.name || s.id} متعلق به این گیمنت نمی‌باشد.`);
        }
        if (s.isActive === false) {
          errors.push(`دستگاه ${s.name} در حال حاضر غیرفعال است.`);
        }
        if (typeof s.hourlyPrice !== "number" || isNaN(s.hourlyPrice) || s.hourlyPrice < 0) {
          errors.push(`مبلغ ساعتی دستگاه ${s.name || s.id} نامعتبر یا ثبت نشده است.`);
        }
        if (line.extra > 0) {
          if (typeof line.group.extraControllerPrice !== "number" || isNaN(line.group.extraControllerPrice) || line.group.extraControllerPrice < 0) {
            errors.push(`تعرفه دسته اضافه برای ${line.group.label} نامعتبر یا ثبت نشده است.`);
          }
        }
      }
    }

    // Availability validation & allocation
    let items: BookingItem[] | null = null;
    if (errors.length === 0) {
      items = allocateItems(lines || [], startTimes || [], availability);
      if (!items) {
        errors.push("ظرفیت دستگاه‌های انتخاب شده برای یک یا چند ساعت درخواستی آزاد نیست.");
      }
    }

    // Calculate price breakdown
    const { breakdown, errors: pricingErrors } = calculateBookingPriceBreakdown(items, durationHoursPerSlot);
    if (pricingErrors.length > 0) {
      errors.push(...pricingErrors);
    }

    const isValid = errors.length === 0 && items !== null && items.length > 0 && breakdown.grandTotal !== null;

    return {
      isValid,
      items,
      breakdown,
      validationErrors: errors,
    };
  },
};
