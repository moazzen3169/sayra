import { beforeEach, describe, expect, it, mock } from "bun:test";
import { groupOwnerReservations } from "@/lib/ownerGroupReservationGrouping";
import { ownerService } from "@/services/ownerService";
import type { OwnerReservation } from "@/types/owner";

describe("Owner Group Booking Management Integration", () => {
  const centerId = "gaming-center-tehran-1";

  const groupRes1: OwnerReservation = {
    id: "res-child-101",
    groupBookingId: "grp-alpha-77",
    gamingCenterId: centerId,
    stationId: "station-pc-1",
    startTime: "2026-11-15T15:00:00Z",
    endTime: "2026-11-15T17:00:00Z",
    status: "PENDING",
    paymentState: "UNPAID",
    totalHours: 2,
    totalPrice: 100000,
    customerName: "سهراب سپهری",
    customerPhone: "09121112233",
    reservationCode: "SAYRA-GRP-01",
    stationSnapshot: {
      name: "PC Gaming Station #1",
      hourlyPrice: 50000,
      stationType: "PC",
    },
    groupBooking: {
      id: "grp-alpha-77",
      totalPrice: 200000,
      status: "PENDING",
      trackingCode: "SAYRA-GRP-01",
    },
  };

  const groupRes2: OwnerReservation = {
    id: "res-child-102",
    groupBookingId: "grp-alpha-77",
    gamingCenterId: centerId,
    stationId: "station-pc-2",
    startTime: "2026-11-15T15:00:00Z",
    endTime: "2026-11-15T17:00:00Z",
    status: "PENDING",
    paymentState: "UNPAID",
    totalHours: 2,
    totalPrice: 100000,
    customerName: "سهراب سپهری",
    customerPhone: "09121112233",
    stationSnapshot: {
      name: "PC Gaming Station #2",
      hourlyPrice: 50000,
      stationType: "PC",
    },
    groupBooking: {
      id: "grp-alpha-77",
      totalPrice: 200000,
      status: "PENDING",
    },
  };

  const standaloneRes: OwnerReservation = {
    id: "res-standalone-201",
    gamingCenterId: centerId,
    stationId: "station-ps5-1",
    startTime: "2026-11-15T18:00:00Z",
    endTime: "2026-11-15T19:00:00Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 1,
    totalPrice: 80000,
    customerName: "نیما یوشیج",
    customerPhone: "09124445566",
    reservationCode: "SAYRA-SNGL-02",
    stationSnapshot: {
      name: "PlayStation 5 VIP",
      hourlyPrice: 80000,
      stationType: "PLAYSTATION",
    },
  };

  it("aggregates group reservations while keeping single reservations intact", () => {
    const list = [groupRes1, standaloneRes, groupRes2];
    const grouped = groupOwnerReservations(list);

    expect(grouped).toHaveLength(2);

    // First entry is Group Booking
    const groupEntry = grouped.find((e) => e.isGroup);
    expect(groupEntry).toBeDefined();
    if (groupEntry && groupEntry.isGroup) {
      expect(groupEntry.groupBookingId).toBe("grp-alpha-77");
      expect(groupEntry.reservations).toHaveLength(2);
      expect(groupEntry.totalPrice).toBe(200000);
      expect(groupEntry.customerName).toBe("سهراب سپهری");
      expect(groupEntry.customerPhone).toBe("09121112233");
      expect(groupEntry.status).toBe("PENDING");
      expect(groupEntry.paymentState).toBe("UNPAID");
    }

    // Second entry is Single Booking
    const singleEntry = grouped.find((e) => !e.isGroup);
    expect(singleEntry).toBeDefined();
    if (singleEntry && !singleEntry.isGroup) {
      expect(singleEntry.reservation.id).toBe("res-standalone-201");
      expect(singleEntry.reservation.status).toBe("CONFIRMED");
    }
  });

  it("confirms all child reservations in a group booking via ownerService.confirmReservation", async () => {
    const confirmedIds: string[] = [];
    const origConfirm = ownerService.confirmReservation;

    ownerService.confirmReservation = mock(async (cId: string, rId: string) => {
      confirmedIds.push(rId);
      return { id: rId, status: "CONFIRMED" } as any;
    });

    try {
      const grouped = groupOwnerReservations([groupRes1, groupRes2]);
      const groupItem = grouped[0];
      expect(groupItem.isGroup).toBe(true);

      if (groupItem.isGroup) {
        for (const res of groupItem.reservations) {
          if (res.status === "PENDING") {
            await ownerService.confirmReservation(centerId, res.id);
          }
        }
      }

      expect(confirmedIds).toEqual(["res-child-101", "res-child-102"]);
    } finally {
      ownerService.confirmReservation = origConfirm;
    }
  });

  it("cancels all child reservations in a group booking with reason via ownerService.cancelReservation", async () => {
    const canceledPayloads: { id: string; reason?: string }[] = [];
    const origCancel = ownerService.cancelReservation;

    ownerService.cancelReservation = mock(async (cId: string, rId: string, reason?: string) => {
      canceledPayloads.push({ id: rId, reason });
      return { id: rId, status: "CANCELED" } as any;
    });

    try {
      const grouped = groupOwnerReservations([groupRes1, groupRes2]);
      const groupItem = grouped[0];

      if (groupItem.isGroup) {
        for (const res of groupItem.reservations) {
          await ownerService.cancelReservation(centerId, res.id, "تعمیرات دوره‌ای مرکز");
        }
      }

      expect(canceledPayloads).toEqual([
        { id: "res-child-101", reason: "تعمیرات دوره‌ای مرکز" },
        { id: "res-child-102", reason: "تعمیرات دوره‌ای مرکز" },
      ]);
    } finally {
      ownerService.cancelReservation = origCancel;
    }
  });

  it("submits synchronized time proposals for every reservation in a group booking", async () => {
    const proposed: { id: string; startTime: string; endTime: string; note?: string }[] = [];
    const origPropose = ownerService.proposeTime;

    ownerService.proposeTime = mock(
      async (cId: string, rId: string, payload: { startTime: string; endTime: string; note?: string }) => {
        proposed.push({ id: rId, ...payload });
      }
    );

    try {
      const grouped = groupOwnerReservations([groupRes1, groupRes2]);
      const groupItem = grouped[0];

      const newStart = "2026-11-16T16:00:00.000Z";
      const newEnd = "2026-11-16T18:00:00.000Z";
      const note = "تغییر سانس به روز بعد با هماهنگی تلفنی";

      if (groupItem.isGroup) {
        for (const res of groupItem.reservations) {
          await ownerService.proposeTime(centerId, res.id, {
            startTime: newStart,
            endTime: newEnd,
            note,
          });
        }
      }

      expect(proposed).toHaveLength(2);
      expect(proposed[0]).toEqual({
        id: "res-child-101",
        startTime: newStart,
        endTime: newEnd,
        note,
      });
      expect(proposed[1]).toEqual({
        id: "res-child-102",
        startTime: newStart,
        endTime: newEnd,
        note,
      });
    } finally {
      ownerService.proposeTime = origPropose;
    }
  });
});
