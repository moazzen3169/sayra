import { describe, expect, it } from "bun:test";
import { groupOwnerReservations } from "./ownerGroupReservationGrouping";
import type { OwnerReservation } from "@/types/owner";

describe("Owner Group Reservation Grouping", () => {
  const singleRes: OwnerReservation = {
    id: "res-single",
    gamingCenterId: "center-1",
    stationId: "st-1",
    startTime: "2026-11-10T14:00:00Z",
    endTime: "2026-11-10T16:00:00Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 100000,
    customerName: "علی رضایی",
    customerPhone: "09123456789",
    stationSnapshot: {
      name: "PC 1",
      hourlyPrice: 50000,
      stationType: "PC",
    },
  };

  const groupChild1: OwnerReservation = {
    id: "res-grp-1",
    groupBookingId: "grp-abc",
    gamingCenterId: "center-1",
    stationId: "st-2",
    startTime: "2026-11-10T18:00:00Z",
    endTime: "2026-11-10T20:00:00Z",
    status: "PENDING",
    paymentState: "UNPAID",
    totalHours: 2,
    totalPrice: 120000,
    customerName: "محمد کمالی",
    customerPhone: "09987654321",
    stationSnapshot: {
      name: "PlayStation 5",
      hourlyPrice: 60000,
      stationType: "PLAYSTATION",
    },
    groupBooking: {
      id: "grp-abc",
      totalPrice: 240000,
    },
  };

  const groupChild2: OwnerReservation = {
    id: "res-grp-2",
    groupBookingId: "grp-abc",
    gamingCenterId: "center-1",
    stationId: "st-3",
    startTime: "2026-11-10T18:00:00Z",
    endTime: "2026-11-10T20:00:00Z",
    status: "PENDING",
    paymentState: "UNPAID",
    totalHours: 2,
    totalPrice: 120000,
    stationSnapshot: {
      name: "PlayStation 5",
      hourlyPrice: 60000,
      stationType: "PLAYSTATION",
    },
  };

  it("handles empty array cleanly", () => {
    expect(groupOwnerReservations([])).toEqual([]);
  });

  it("leaves single reservations with null groupBookingId as standalone cards", () => {
    const result = groupOwnerReservations([singleRes]);
    expect(result).toHaveLength(1);
    expect(result[0].isGroup).toBe(false);
    if (!result[0].isGroup) {
      expect(result[0].reservation.id).toBe("res-single");
    }
  });

  it("aggregates multiple reservations sharing groupBookingId into exactly one group item", () => {
    const result = groupOwnerReservations([groupChild1, groupChild2]);
    expect(result).toHaveLength(1);
    expect(result[0].isGroup).toBe(true);
    if (result[0].isGroup) {
      expect(result[0].groupBookingId).toBe("grp-abc");
      expect(result[0].reservations).toHaveLength(2);
      expect(result[0].customerName).toBe("محمد کمالی");
      expect(result[0].customerPhone).toBe("09987654321");
      expect(result[0].totalPrice).toBe(240000);
      expect(result[0].status).toBe("PENDING");
      // Device aggregation: 2 PS5 devices grouped with multiplier
      expect(result[0].devices).toHaveLength(1);
      expect(result[0].devices[0].count).toBe(2);
      expect(result[0].devices[0].stationType).toBe("PLAYSTATION");
    }
  });

  it("allows single and group bookings to coexist without duplicates", () => {
    const mixed = [singleRes, groupChild1, groupChild2];
    const result = groupOwnerReservations(mixed);
    expect(result).toHaveLength(2);
    expect(result[0].isGroup).toBe(false);
    expect(result[1].isGroup).toBe(true);
  });
});
