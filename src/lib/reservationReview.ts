import { toPersianDigits } from "@/lib/format";
import type {
  CustomerBookingEntry,
  GroupBookingItem,
  Reservation,
} from "@/types/reservation";

export interface ReviewTarget {
  key: string;
  reservationId: string;
  fallbackReservationIds?: string[];
  gamingCenterId?: string;
  gamingCenterSlug?: string;
  gamingCenterName?: string;
  stationName?: string;
  startTime?: string;
  endTime?: string;
}

export function extractCenterMeta(reservation: Reservation): {
  gamingCenterId?: string;
  gamingCenterSlug?: string;
  gamingCenterName?: string;
} {
  return {
    gamingCenterId: reservation.gamingCenterId || reservation.gamingCenter?.id,
    gamingCenterSlug:
      reservation.gamingCenterSlug || reservation.gamingCenter?.slug,
    gamingCenterName:
      reservation.gamingCenterName || reservation.gamingCenter?.name,
  };
}

/**
 * Extracts real backend Reservation.id values for a reservation or merged group reservation.
 * Never returns a groupBookingId when real child item IDs exist.
 */
export function getRatableReservationIds(reservation: Reservation): string[] {
  const isMergedGroupEnvelope =
    Boolean(reservation.groupBookingId) &&
    reservation.id === reservation.groupBookingId &&
    Array.isArray(reservation.items) &&
    reservation.items.length > 0;

  if (isMergedGroupEnvelope && reservation.items) {
    const itemIds = reservation.items
      .map((item) => item.id?.trim())
      .filter((id): id is string => Boolean(id && id !== reservation.groupBookingId));
    if (itemIds.length > 0) {
      return Array.from(new Set(itemIds));
    }
  }

  return reservation.id?.trim() ? [reservation.id.trim()] : [];
}

export function isSingleReservationRated(
  reservation: Reservation,
  ratedIds?: Set<string>
): boolean {
  if (reservation.isRated === true || reservation.canRate === false) {
    return true;
  }
  if (reservation.rating !== undefined && reservation.rating !== null) {
    return true;
  }
  if (!ratedIds || ratedIds.size === 0) {
    return false;
  }
  const ids = getRatableReservationIds(reservation);
  return ids.some((id) => ratedIds.has(id));
}

export function isGroupBookingRated(
  groupBooking: GroupBookingItem,
  ratedIds?: Set<string>
): boolean {
  if (groupBooking.reservations.length === 0) return false;
  return groupBooking.reservations.some((r) =>
    isSingleReservationRated(r, ratedIds)
  );
}

export function isSingleReservationEligibleForReview(
  reservation: Reservation,
  ratedIds?: Set<string>
): boolean {
  return (
    reservation.status === "COMPLETED" &&
    !isSingleReservationRated(reservation, ratedIds)
  );
}

export function isGroupBookingEligibleForReview(
  groupBooking: GroupBookingItem,
  ratedIds?: Set<string>
): boolean {
  return (
    groupBooking.status === "COMPLETED" &&
    groupBooking.reservations.length > 0 &&
    !isGroupBookingRated(groupBooking, ratedIds)
  );
}

export function buildReviewTargetFromReservation(
  reservation: Reservation
): ReviewTarget {
  const ratableIds = getRatableReservationIds(reservation);
  const center = extractCenterMeta(reservation);
  const stationLabel =
    reservation.items && reservation.items.length > 1
      ? reservation.items
          .map((item) => item.stationName)
          .filter(Boolean)
          .join("، ")
      : reservation.stationSnapshot?.name;

  return {
    key: reservation.groupBookingId || reservation.id,
    reservationId: ratableIds[0] || reservation.id,
    fallbackReservationIds: ratableIds.slice(1),
    gamingCenterId: center.gamingCenterId,
    gamingCenterSlug: center.gamingCenterSlug,
    gamingCenterName: center.gamingCenterName,
    stationName: stationLabel,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
  };
}

export function buildReviewTargetFromGroup(
  groupBooking: GroupBookingItem
): ReviewTarget {
  const rep = groupBooking.reservations[0];
  const ids = groupBooking.reservations
    .map((r) => r.id?.trim())
    .filter((id): id is string => Boolean(id));
  const stationLabel = groupBooking.devices
    .map((d) =>
      d.count > 1
        ? `${d.stationName} × ${toPersianDigits(d.count)}`
        : d.stationName
    )
    .filter(Boolean)
    .join("، ");

  return {
    key: groupBooking.groupBookingId,
    reservationId: ids[0] || groupBooking.groupBookingId,
    fallbackReservationIds: ids.slice(1),
    gamingCenterId: groupBooking.gamingCenterId,
    gamingCenterSlug:
      groupBooking.gamingCenterSlug ||
      rep?.gamingCenterSlug ||
      rep?.gamingCenter?.slug,
    gamingCenterName:
      groupBooking.gamingCenterName ||
      rep?.gamingCenterName ||
      rep?.gamingCenter?.name,
    stationName: stationLabel || rep?.stationSnapshot?.name,
    startTime: groupBooking.startTime,
    endTime: groupBooking.endTime,
  };
}

export function getMostRecentEligibleReviewTarget(
  entries: CustomerBookingEntry[],
  ratedIds: Set<string>,
  dismissedKeys?: Set<string>
): ReviewTarget | null {
  const candidates: ReviewTarget[] = [];

  for (const entry of entries) {
    if (entry.isGroup) {
      if (
        isGroupBookingEligibleForReview(entry, ratedIds) &&
        !dismissedKeys?.has(entry.groupBookingId)
      ) {
        candidates.push(buildReviewTargetFromGroup(entry));
      }
    } else {
      if (
        isSingleReservationEligibleForReview(entry.reservation, ratedIds) &&
        !dismissedKeys?.has(entry.reservation.id)
      ) {
        candidates.push(buildReviewTargetFromReservation(entry.reservation));
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aTime = a.endTime ? new Date(a.endTime).getTime() : 0;
    const bTime = b.endTime ? new Date(b.endTime).getTime() : 0;
    return bTime - aTime;
  });

  return candidates[0];
}
