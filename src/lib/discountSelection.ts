import { getEffectiveStationPricing } from "@/lib/stationPricing";
import type {
  AvailableDiscountItem,
  DiscountSourceType,
  GetAvailableDiscountsResponse,
} from "@/types/gaming-center/discount-selection.types";
import type { StationPricing } from "@/types/gaming-center/station.types";

export interface DiscountStationLike {
  id: string;
  hourlyPrice: number;
  stationType?: string;
  catalogDeviceId?: string | null;
  isActive?: boolean;
  pricing?: StationPricing | null;
}

export interface MergedAvailableDiscounts {
  discounts: AvailableDiscountItem[];
  recommendedKey: string | null;
  queriedStationIds: string[];
}

export interface SingleDiscountPricingResult {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  hasDiscount: boolean;
  discountPercentage?: number;
}

export function discountSelectionKey(
  type: DiscountSourceType,
  id: string
): string {
  return `${type}:${id}`;
}

export function getStationOriginalHourlyPrice(
  station: Pick<DiscountStationLike, "hourlyPrice" | "pricing">
): number {
  return getEffectiveStationPricing(station).originalHourlyPrice;
}

/**
 * Picks up to `maxCount` representative active stations so initial page load
 * discovers both center-wide campaigns/discounts and station-specific discounts
 * without issuing an unbounded number of API calls.
 */
export function pickRepresentativeStations<T extends DiscountStationLike>(
  stations: T[],
  maxCount = 6
): T[] {
  const active = stations.filter(
    (s) => Boolean(s?.id) && s.isActive !== false && getStationOriginalHourlyPrice(s) > 0
  );
  if (active.length <= maxCount) {
    return active;
  }

  const picked: T[] = [];
  const pickedIds = new Set<string>();
  const add = (st: T) => {
    if (picked.length >= maxCount || pickedIds.has(st.id)) return;
    pickedIds.add(st.id);
    picked.push(st);
  };

  // 1. Stations that already report an active direct discount
  for (const st of active) {
    if (getEffectiveStationPricing(st).hasDiscount) {
      add(st);
    }
  }

  // 2. One representative per distinct device category / station type
  const seenBuckets = new Set<string>();
  for (const st of active) {
    const bucket = st.catalogDeviceId || st.stationType || "DEFAULT";
    if (!seenBuckets.has(bucket)) {
      seenBuckets.add(bucket);
      add(st);
    }
  }

  // 3. Fill remaining slots if any
  for (const st of active) {
    add(st);
  }

  return picked;
}

/**
 * Merges `/discounts/available` responses from one or more stations into a
 * single deduplicated list sorted by applicability, recommendation, and savings.
 */
export function mergeAvailableDiscounts(
  entries: Array<{ stationId: string; response: GetAvailableDiscountsResponse }>
): MergedAvailableDiscounts {
  const byKey = new Map<string, AvailableDiscountItem>();
  const stationSetByKey = new Map<string, Set<string>>();
  const queriedStationIds = entries.map((e) => e.stationId);

  let recommendedKey: string | null = null;
  let recommendedAmount = -1;

  for (const { stationId, response } of entries) {
    const list = Array.isArray(response?.discounts) ? response.discounts : [];
    for (const item of list) {
      if (!item?.id || !item?.type) continue;
      const key = discountSelectionKey(item.type, item.id);

      let stSet = stationSetByKey.get(key);
      if (!stSet) {
        stSet = new Set<string>();
        stationSetByKey.set(key, stSet);
      }
      if (item.isApplicable) {
        stSet.add(stationId);
      }

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...item });
      } else {
        const preferIncoming =
          (item.isApplicable && !existing.isApplicable) ||
          (item.isApplicable === existing.isApplicable &&
            item.discountAmount > existing.discountAmount);

        byKey.set(key, {
          ...(preferIncoming ? item : existing),
          isApplicable: existing.isApplicable || item.isApplicable,
          isBest: existing.isBest || item.isBest,
          discountAmount: Math.max(existing.discountAmount, item.discountAmount),
          ineligibilityReason:
            existing.isApplicable || item.isApplicable
              ? null
              : existing.ineligibilityReason || item.ineligibilityReason || null,
        });
      }
    }

    if (response?.recommendedDiscountId && response?.recommendedDiscountType) {
      const candidateKey = discountSelectionKey(
        response.recommendedDiscountType,
        response.recommendedDiscountId
      );
      const candidate = byKey.get(candidateKey);
      const amount = candidate?.discountAmount ?? 0;
      if (!recommendedKey || amount > recommendedAmount) {
        recommendedKey = candidateKey;
        recommendedAmount = amount;
      }
    }
  }

  const merged = Array.from(byKey.entries()).map(([key, item]) => ({
    ...item,
    applicableStationIds: Array.from(stationSetByKey.get(key) ?? []),
  }));

  merged.sort((a, b) => {
    if (a.isApplicable !== b.isApplicable) {
      return a.isApplicable ? -1 : 1;
    }
    const aRec = discountSelectionKey(a.type, a.id) === recommendedKey;
    const bRec = discountSelectionKey(b.type, b.id) === recommendedKey;
    if (aRec !== bRec) return aRec ? -1 : 1;
    if (a.isBest !== b.isBest) return a.isBest ? -1 : 1;
    if (b.discountAmount !== a.discountAmount) {
      return b.discountAmount - a.discountAmount;
    }
    return b.value - a.value;
  });

  return {
    discounts: merged,
    recommendedKey,
    queriedStationIds,
  };
}

/**
 * Selects the default discount:
 * 1. Backend recommended applicable discount
 * 2. Highest-ranked `isBest && isApplicable` discount
 * 3. First `isApplicable` discount
 * 4. First available discount (e.g. if all require higher minOrderAmount)
 */
export function pickDefaultDiscount(
  discounts: AvailableDiscountItem[],
  recommendedKey: string | null
): AvailableDiscountItem | null {
  if (discounts.length === 0) return null;

  if (recommendedKey) {
    const rec = discounts.find(
      (d) => discountSelectionKey(d.type, d.id) === recommendedKey && d.isApplicable
    );
    if (rec) return rec;
  }

  const bestApplicable = discounts.find((d) => d.isBest && d.isApplicable);
  if (bestApplicable) return bestApplicable;

  const firstApplicable = discounts.find((d) => d.isApplicable);
  if (firstApplicable) return firstApplicable;

  return discounts[0];
}

/**
 * Determines whether a selected discount applies to a specific station.
 * If the discount was only applicable to a subset of queried stations,
 * restricts it to those station IDs.
 */
export function isDiscountApplicableToStation(
  discount: AvailableDiscountItem | null | undefined,
  stationId: string,
  queriedStationIds: string[] = []
): boolean {
  if (!discount) return false;
  const applicableIds = discount.applicableStationIds;
  if (
    Array.isArray(applicableIds) &&
    applicableIds.length > 0 &&
    queriedStationIds.length > 1 &&
    applicableIds.length < queriedStationIds.length
  ) {
    return applicableIds.includes(stationId);
  }
  return discount.isApplicable;
}

/**
 * Applies a single selected discount to an undiscounted base price.
 * Never stacks multiple discounts.
 */
export function computeSingleDiscountPricing(
  originalPrice: number,
  discount: AvailableDiscountItem | null | undefined,
  options?: { ignoreMinOrder?: boolean }
): SingleDiscountPricingResult {
  const safeOriginal =
    typeof originalPrice === "number" && Number.isFinite(originalPrice) && originalPrice > 0
      ? Math.round(originalPrice)
      : 0;

  if (!discount || safeOriginal <= 0) {
    return {
      originalPrice: safeOriginal,
      discountAmount: 0,
      finalPrice: safeOriginal,
      hasDiscount: false,
    };
  }

  if (
    !options?.ignoreMinOrder &&
    typeof discount.minOrderAmount === "number" &&
    discount.minOrderAmount > 0 &&
    safeOriginal < discount.minOrderAmount
  ) {
    return {
      originalPrice: safeOriginal,
      discountAmount: 0,
      finalPrice: safeOriginal,
      hasDiscount: false,
    };
  }

  let rawDiscount = 0;
  if (discount.discountType === "PERCENTAGE") {
    rawDiscount = Math.round((safeOriginal * Math.max(0, discount.value)) / 100);
  } else {
    rawDiscount = Math.round(Math.max(0, discount.value));
  }

  if (
    typeof discount.maxDiscountAmount === "number" &&
    discount.maxDiscountAmount > 0
  ) {
    rawDiscount = Math.min(rawDiscount, Math.round(discount.maxDiscountAmount));
  }

  const discountAmount = Math.max(0, Math.min(safeOriginal, rawDiscount));
  const finalPrice = Math.max(0, safeOriginal - discountAmount);

  return {
    originalPrice: safeOriginal,
    discountAmount,
    finalPrice,
    hasDiscount: discountAmount > 0 && finalPrice < safeOriginal,
    discountPercentage:
      discount.discountType === "PERCENTAGE"
        ? discount.value
        : safeOriginal > 0
        ? Math.round((discountAmount / safeOriginal) * 100)
        : undefined,
  };
}
