import type {
  CustomerBookingEntry,
  GroupBookingItem,
  GroupedDeviceItem,
  PaymentState,
  Reservation,
  ReservationStatus,
  SingleBookingItem,
} from "@/types/reservation";

/**
 * Derives the representative group status according to backend business rules:
 * - If group-level status is explicitly provided and valid, prioritize it.
 * - If all reservations are CANCELED -> CANCELED
 * - If all reservations are COMPLETED -> COMPLETED
 * - If any reservation is IN_PROGRESS -> IN_PROGRESS
 * - If any reservation is CONFIRMED -> CONFIRMED
 * - If any reservation is PENDING -> PENDING
 * - If all reservations are NO_SHOW -> NO_SHOW
 * - Default fallback -> PENDING
 */
export function deriveGroupStatus(
  reservations: Reservation[],
  explicitStatus?: string | null
): ReservationStatus {
  if (explicitStatus) {
    const s = explicitStatus.toUpperCase();
    if (["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED", "NO_SHOW"].includes(s)) {
      return s as ReservationStatus;
    }
  }

  if (reservations.length === 0) return "PENDING";

  const statuses = reservations.map((r) => r.status);

  if (statuses.every((s) => s === "CANCELED")) return "CANCELED";
  if (statuses.every((s) => s === "COMPLETED")) return "COMPLETED";
  if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
  if (statuses.some((s) => s === "CONFIRMED")) return "CONFIRMED";
  if (statuses.some((s) => s === "PENDING")) return "PENDING";
  if (statuses.every((s) => s === "NO_SHOW")) return "NO_SHOW";

  return statuses[0] || "PENDING";
}

/**
 * Derives representative group payment state:
 * - If any PAID and some UNPAID -> PARTIALLY_PAID
 * - If all PAID -> PAID
 * - If all UNPAID -> UNPAID
 * - If any FAILED -> FAILED
 * - Otherwise first non-null or PENDING
 */
export function deriveGroupPaymentState(reservations: Reservation[]): PaymentState {
  if (reservations.length === 0) return "PENDING";
  const payments = reservations.map((r) => r.paymentState);

  const hasPaid = payments.some((p) => p === "PAID");
  const hasUnpaid = payments.some((p) => p === "UNPAID" || p === "PENDING");

  if (hasPaid && hasUnpaid) return "PARTIALLY_PAID";
  if (payments.every((p) => p === "PAID")) return "PAID";
  if (payments.every((p) => p === "UNPAID")) return "UNPAID";
  if (payments.some((p) => p === "FAILED")) return "FAILED";
  if (payments.every((p) => p === "REFUNDED")) return "REFUNDED";

  return payments[0] || "PENDING";
}

/**
 * Groups identical devices together to count quantities (e.g. PC × 3, PS5 × 2)
 * Preserves a stable insertion order.
 */
export function groupDevicesForCard(
  reservations: Reservation[],
  parentItems?: Reservation["items"]
): GroupedDeviceItem[] {
  const map = new Map<string, GroupedDeviceItem>();

  // If explicit parentItems are available (from GroupReservation payload)
  if (parentItems && parentItems.length > 0) {
    for (const item of parentItems) {
      const name = item.stationName || "ایستگاه گیمینگ";
      const type = item.stationType || "PC";
      const key = `${type}_${name}`.toLowerCase();

      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (item.totalPrice) existing.totalPrice = (existing.totalPrice ?? 0) + item.totalPrice;
      } else {
        map.set(key, {
          key,
          stationId: item.stationId,
          stationName: name,
          stationType: type,
          coverImageUrl: item.coverImageUrl || null,
          count: 1,
          hourlyPrice: item.hourlyPrice,
          totalPrice: item.totalPrice,
        });
      }
    }
    return Array.from(map.values());
  }

  // Otherwise extract from reservations list
  for (const r of reservations) {
    const name = r.stationSnapshot?.name || "ایستگاه گیمینگ";
    const type = r.stationSnapshot?.stationType || "PC";
    const coverImageUrl = r.stationSnapshot?.coverImageUrl || null;
    const key = `${type}_${name}`.toLowerCase();

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalPrice = (existing.totalPrice ?? 0) + (r.totalPrice ?? 0);
    } else {
      map.set(key, {
        key,
        stationId: r.stationId,
        stationName: name,
        stationType: type,
        coverImageUrl,
        count: 1,
        hourlyPrice: r.stationSnapshot?.hourlyPrice,
        totalPrice: r.totalPrice,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Transforms a raw array of Customer Reservations into structured CustomerBookingEntry items.
 * - Reservations with the same `groupBookingId` (or single reservation with multi-item group structure)
 *   are bundled into a single `GroupBookingItem`.
 * - Isolated reservations remain as `SingleBookingItem`.
 * - Preserves the original sorting order based on the latest startTime.
 */
export function groupCustomerReservations(reservations: Reservation[]): CustomerBookingEntry[] {
  if (!reservations || reservations.length === 0) return [];

  const groupBuckets = new Map<string, Reservation[]>();
  const entries: CustomerBookingEntry[] = [];
  const processedGroupIds = new Set<string>();

  // First pass: collect items with groupBookingId
  for (const r of reservations) {
    const groupId = r.groupBookingId || (r.groupBooking?.id ?? null);
    if (groupId) {
      const bucket = groupBuckets.get(groupId) ?? [];
      bucket.push(r);
      groupBuckets.set(groupId, bucket);
    }
  }

  // Second pass: build entries in consistent order
  for (const r of reservations) {
    const groupId = r.groupBookingId || (r.groupBooking?.id ?? null);

    if (groupId) {
      if (processedGroupIds.has(groupId)) {
        continue;
      }
      processedGroupIds.add(groupId);
      const groupReservations = groupBuckets.get(groupId) || [r];

      // Earliest start time and latest end time across the group
      const sortedByStart = [...groupReservations].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      const earliestStart = sortedByStart[0].startTime;
      const sortedByEnd = [...groupReservations].sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      );
      const latestEnd = sortedByEnd[0].endTime;

      // Group-level total price: prioritize groupBooking.totalPrice, otherwise sum individual non-duplicated reservations
      const groupBookingPrice = groupReservations.find((res) => res.groupBooking?.totalPrice !== undefined)
        ?.groupBooking?.totalPrice;
      const finalTotalPrice =
        groupBookingPrice !== undefined
          ? groupBookingPrice
          : groupReservations.reduce((sum, res) => sum + (res.totalPrice ?? 0), 0);

      const explicitStatus = groupReservations.find((res) => res.groupBooking?.status)?.groupBooking?.status;
      const status = deriveGroupStatus(groupReservations, explicitStatus);
      const paymentState = deriveGroupPaymentState(groupReservations);

      const rep = groupReservations[0];
      const devices = groupDevicesForCard(groupReservations, rep.items);

      const groupItem: GroupBookingItem = {
        isGroup: true,
        groupBookingId: groupId,
        gamingCenterId: rep.gamingCenterId,
        gamingCenterName: rep.gamingCenterName,
        gamingCenterAddress: rep.gamingCenterAddress,
        startTime: earliestStart,
        endTime: latestEnd,
        status,
        paymentState,
        totalPrice: finalTotalPrice,
        reservationCode: rep.reservationCode,
        devices,
        reservations: groupReservations,
      };

      entries.push(groupItem);
    } else if (r.items && r.items.length > 1) {
      // Single reservation envelope that internally contains multiple group items
      const devices = groupDevicesForCard([r], r.items);
      const groupItem: GroupBookingItem = {
        isGroup: true,
        groupBookingId: r.id,
        gamingCenterId: r.gamingCenterId,
        gamingCenterName: r.gamingCenterName,
        gamingCenterAddress: r.gamingCenterAddress,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        paymentState: r.paymentState,
        totalPrice: r.totalPrice,
        reservationCode: r.reservationCode,
        devices,
        reservations: [r],
      };
      entries.push(groupItem);
    } else {
      const singleItem: SingleBookingItem = {
        isGroup: false,
        reservation: r,
      };
      entries.push(singleItem);
    }
  }

  return entries;
}

/**
 * Merges sibling group reservations into a composite Reservation object for display on the detail page.
 */
export function mergeGroupReservationsIntoSingle(
  groupId: string,
  groupReservations: Reservation[]
): Reservation {
  const rep = groupReservations[0];
  const sortedByStart = [...groupReservations].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const earliestStart = sortedByStart[0].startTime;
  const sortedByEnd = [...groupReservations].sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
  );
  const latestEnd = sortedByEnd[0].endTime;

  const groupBookingPrice = groupReservations.find((res) => res.groupBooking?.totalPrice !== undefined)
    ?.groupBooking?.totalPrice;
  const finalTotalPrice =
    groupBookingPrice !== undefined
      ? groupBookingPrice
      : groupReservations.reduce((sum, res) => sum + (res.totalPrice ?? 0), 0);

  const explicitStatus = groupReservations.find((res) => res.groupBooking?.status)?.groupBooking?.status;
  const status = deriveGroupStatus(groupReservations, explicitStatus);
  const paymentState = deriveGroupPaymentState(groupReservations);

  const items = groupReservations.map((r) => ({
    id: r.id,
    stationId: r.stationId,
    stationName: r.stationSnapshot?.name ?? "ایستگاه گیمینگ",
    stationType: r.stationSnapshot?.stationType ?? "PC",
    coverImageUrl: r.stationSnapshot?.coverImageUrl ?? null,
    hourlyPrice: r.stationSnapshot?.hourlyPrice,
    totalPrice: r.totalPrice,
  }));

  return {
    ...rep,
    id: groupId,
    groupBookingId: groupId,
    startTime: earliestStart,
    endTime: latestEnd,
    status,
    paymentState,
    totalPrice: finalTotalPrice,
    items,
  };
}
