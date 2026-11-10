import type { OwnerReservation } from "@/types/owner";
import type { GroupedDeviceItem, PaymentState, ReservationStatus } from "@/types/reservation";
import {
  deriveGroupPaymentState,
  deriveGroupStatus,
  groupDevicesForCard,
} from "./groupReservationGrouping";

export interface OwnerGroupBookingItem {
  isGroup: true;
  groupBookingId: string;
  gamingCenterId: string;
  gamingCenterName?: string;
  gamingCenterAddress?: string;
  customerName?: string;
  customerPhone?: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentState: PaymentState;
  totalPrice: number;
  reservationCode?: string;
  devices: GroupedDeviceItem[];
  reservations: OwnerReservation[];
}

export interface OwnerSingleBookingItem {
  isGroup: false;
  reservation: OwnerReservation;
}

export type OwnerBookingEntry = OwnerGroupBookingItem | OwnerSingleBookingItem;

/**
 * Transforms an array of raw OwnerReservations into structured OwnerBookingEntry items.
 *
 * Requirements:
 * 1. Reservations with identical non-null groupBookingId (or multi-item group structure)
 *    are aggregated into exactly one OwnerGroupBookingItem.
 * 2. Standalone reservations (groupBookingId == null) remain as OwnerSingleBookingItem.
 * 3. Total group price uses groupBooking.totalPrice when available, or accurately sums individual non-duplicated reservations.
 * 4. Aggregates customer name and phone from the first available sibling.
 * 5. Deterministic and non-mutating.
 */
export function groupOwnerReservations(reservations: OwnerReservation[]): OwnerBookingEntry[] {
  if (!reservations || reservations.length === 0) return [];

  const groupBuckets = new Map<string, OwnerReservation[]>();
  const entries: OwnerBookingEntry[] = [];
  const processedGroupIds = new Set<string>();

  // Pass 1: Bucket reservations by groupBookingId (or nested groupBooking.id)
  for (const r of reservations) {
    const groupId = r.groupBookingId || (r.groupBooking?.id ?? null);
    if (groupId) {
      const bucket = groupBuckets.get(groupId) ?? [];
      bucket.push(r);
      groupBuckets.set(groupId, bucket);
    }
  }

  // Pass 2: Produce entries in original sequence
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
      const earliestStart = sortedByStart[0]?.startTime || r.startTime;

      const sortedByEnd = [...groupReservations].sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      );
      const latestEnd = sortedByEnd[0]?.endTime || r.endTime;

      // Group-level total price: prioritize groupBooking.totalPrice, otherwise sum non-duplicated reservations
      const groupBookingPrice = groupReservations.find(
        (res) => res.groupBooking?.totalPrice !== undefined
      )?.groupBooking?.totalPrice;

      const finalTotalPrice =
        groupBookingPrice !== undefined
          ? groupBookingPrice
          : groupReservations.reduce((sum, res) => sum + (res.totalPrice ?? 0), 0);

      const explicitStatus = groupReservations.find(
        (res) => res.groupBooking?.status
      )?.groupBooking?.status;

      const status = deriveGroupStatus(groupReservations, explicitStatus);
      const paymentState = deriveGroupPaymentState(groupReservations);

      const rep = groupReservations[0];
      const devices = groupDevicesForCard(groupReservations, rep.items);

      // Customer info from first non-empty record
      const customerName =
        groupReservations.map((res) => res.customer?.fullName ?? res.customerName).find(Boolean) ||
        undefined;
      const customerPhone =
        groupReservations.map((res) => res.customer?.phone ?? res.customerPhone).find(Boolean) ||
        undefined;

      const groupItem: OwnerGroupBookingItem = {
        isGroup: true,
        groupBookingId: groupId,
        gamingCenterId: rep.gamingCenterId,
        gamingCenterName: rep.gamingCenterName,
        gamingCenterAddress: rep.gamingCenterAddress,
        customerName,
        customerPhone,
        startTime: earliestStart,
        endTime: latestEnd,
        status,
        paymentState,
        totalPrice: finalTotalPrice,
        reservationCode: rep.reservationCode || rep.groupBooking?.trackingCode,
        devices,
        reservations: groupReservations,
      };

      entries.push(groupItem);
    } else if (r.items && r.items.length > 1) {
      // Single reservation envelope that internally contains multiple group items
      const devices = groupDevicesForCard([r], r.items);
      const customerName = r.customer?.fullName ?? r.customerName;
      const customerPhone = r.customer?.phone ?? r.customerPhone;

      const groupItem: OwnerGroupBookingItem = {
        isGroup: true,
        groupBookingId: r.id,
        gamingCenterId: r.gamingCenterId,
        gamingCenterName: r.gamingCenterName,
        gamingCenterAddress: r.gamingCenterAddress,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
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
      const singleItem: OwnerSingleBookingItem = {
        isGroup: false,
        reservation: r,
      };
      entries.push(singleItem);
    }
  }

  return entries;
}
