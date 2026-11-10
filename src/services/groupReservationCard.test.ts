import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  deriveGroupPaymentState,
  deriveGroupStatus,
  groupCustomerReservations,
  groupDevicesForCard,
  mergeGroupReservationsIntoSingle,
} from "@/lib/groupReservationGrouping";
import { reservationService } from "@/services/reservationService";
import { setTokens, clearTokens } from "@/lib/token";
import type { Reservation } from "@/types/reservation";

describe("Group Booking Card & 404 Resolution Verification", () => {
  const fakeToken = "fake-jwt-token-group-cards";

  beforeEach(() => {
    clearTokens();
    setTokens(fakeToken, "fake-refresh-token");
  });

  const sampleSingle: Reservation = {
    id: "res-single-1",
    gamingCenterId: "gc-1",
    stationId: "st-1",
    startTime: "2026-03-30T10:00:00.000Z",
    endTime: "2026-03-30T12:00:00.000Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 200000,
    gamingCenterName: "گیمنت گرگدن",
    stationSnapshot: {
      name: "سیستم گیمینگ ۱",
      hourlyPrice: 100000,
      stationType: "PC",
    },
  };

  const sampleGroup1: Reservation = {
    id: "res-grp-1",
    groupBookingId: "grp-999",
    gamingCenterId: "gc-1",
    stationId: "st-10",
    startTime: "2026-03-30T14:00:00.000Z",
    endTime: "2026-03-30T16:00:00.000Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 150000,
    gamingCenterName: "گیمنت گرگدن",
    groupBooking: {
      id: "grp-999",
      totalPrice: 450000,
      status: "CONFIRMED",
    },
    stationSnapshot: {
      name: "پلی استیشن ۵ شماره ۱",
      hourlyPrice: 150000,
      stationType: "PLAYSTATION",
    },
  };

  const sampleGroup2: Reservation = {
    id: "res-grp-2",
    groupBookingId: "grp-999",
    gamingCenterId: "gc-1",
    stationId: "st-11",
    startTime: "2026-03-30T14:00:00.000Z",
    endTime: "2026-03-30T16:00:00.000Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 150000,
    gamingCenterName: "گیمنت گرگدن",
    groupBooking: {
      id: "grp-999",
      totalPrice: 450000,
      status: "CONFIRMED",
    },
    stationSnapshot: {
      name: "پلی استیشن ۵ شماره ۲",
      hourlyPrice: 150000,
      stationType: "PLAYSTATION",
    },
  };

  const sampleGroup3DuplicateType: Reservation = {
    id: "res-grp-3",
    groupBookingId: "grp-999",
    gamingCenterId: "gc-1",
    stationId: "st-12",
    startTime: "2026-03-30T14:00:00.000Z",
    endTime: "2026-03-30T16:00:00.000Z",
    status: "CONFIRMED",
    paymentState: "PAID",
    totalHours: 2,
    totalPrice: 150000,
    gamingCenterName: "گیمنت گرگدن",
    groupBooking: {
      id: "grp-999",
      totalPrice: 450000,
      status: "CONFIRMED",
    },
    stationSnapshot: {
      name: "پلی استیشن ۵ شماره ۱", // same identity
      hourlyPrice: 150000,
      stationType: "PLAYSTATION",
    },
  };

  describe("1. Grouping Logic & Card Separation", () => {
    it("bundles reservations with identical groupBookingId into a single group card", () => {
      const mixed = [sampleSingle, sampleGroup1, sampleGroup2];
      const result = groupCustomerReservations(mixed);

      expect(result.length).toBe(2);
      expect(result[0].isGroup).toBe(false);
      expect(result[1].isGroup).toBe(true);

      if (result[1].isGroup) {
        expect(result[1].groupBookingId).toBe("grp-999");
        expect(result[1].totalPrice).toBe(450000);
        expect(result[1].reservations.length).toBe(2);
      }
    });

    it("aggregates identical devices by model identity and calculates multiplier badge", () => {
      const devices = groupDevicesForCard([sampleGroup1, sampleGroup3DuplicateType]);
      expect(devices.length).toBe(1);
      expect(devices[0].count).toBe(2);
      expect(devices[0].stationName).toBe("پلی استیشن ۵ شماره ۱");
    });

    it("keeps distinct devices separated in carousel items", () => {
      const devices = groupDevicesForCard([sampleGroup1, sampleGroup2]);
      expect(devices.length).toBe(2);
      expect(devices[0].count).toBe(1);
      expect(devices[1].count).toBe(1);
    });

    it("correctly calculates group total price without double-counting when groupBooking.totalPrice is absent", () => {
      const groupWithoutExplicitTotal: Reservation[] = [
        { ...sampleGroup1, groupBooking: undefined, totalPrice: 120000 },
        { ...sampleGroup2, groupBooking: undefined, totalPrice: 180000 },
      ];
      const result = groupCustomerReservations(groupWithoutExplicitTotal);
      expect(result.length).toBe(1);
      if (result[0].isGroup) {
        expect(result[0].totalPrice).toBe(300000);
      }
    });
  });

  describe("2. Group Status and Payment State Derivation", () => {
    it("derives COMPLETED only when all reservations in group are COMPLETED", () => {
      const completedList: Reservation[] = [
        { ...sampleGroup1, status: "COMPLETED" },
        { ...sampleGroup2, status: "COMPLETED" },
      ];
      expect(deriveGroupStatus(completedList)).toBe("COMPLETED");
    });

    it("derives CANCELED only when all reservations in group are CANCELED", () => {
      const canceledList: Reservation[] = [
        { ...sampleGroup1, status: "CANCELED" },
        { ...sampleGroup2, status: "CANCELED" },
      ];
      expect(deriveGroupStatus(canceledList)).toBe("CANCELED");
    });

    it("derives IN_PROGRESS if any reservation is IN_PROGRESS", () => {
      const inProgList: Reservation[] = [
        { ...sampleGroup1, status: "IN_PROGRESS" },
        { ...sampleGroup2, status: "CONFIRMED" },
      ];
      expect(deriveGroupStatus(inProgList)).toBe("IN_PROGRESS");
    });

    it("derives PARTIALLY_PAID if some reservations are PAID and some UNPAID", () => {
      const mixedPayments: Reservation[] = [
        { ...sampleGroup1, paymentState: "PAID" },
        { ...sampleGroup2, paymentState: "UNPAID" },
      ];
      expect(deriveGroupPaymentState(mixedPayments)).toBe("PARTIALLY_PAID");
    });
  });

  describe("3. 404 Resolution on Reservation Detail Page", () => {
    it("resolves group reservation details when direct GET /customer/reservation/{id} returns 404", async () => {
      let detailAttempts = 0;
      let listAttempts = 0;

      globalThis.fetch = mock(async (input: any) => {
        const urlStr = typeof input === "string" ? input : input.url;

        if (urlStr.includes("/customer/reservation/grp-999")) {
          detailAttempts++;
          return new Response(JSON.stringify({ success: false, message: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("/customer/reservation")) {
          listAttempts++;
          return new Response(
            JSON.stringify({
              success: true,
              data: [sampleSingle, sampleGroup1, sampleGroup2],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("Not found", { status: 404 });
      }) as any;

      const resolved = await reservationService.get("grp-999");

      expect(detailAttempts).toBe(1);
      expect(listAttempts).toBe(1);
      expect(resolved.id).toBe("grp-999");
      expect(resolved.totalPrice).toBe(450000);
      expect(resolved.items?.length).toBe(2);
      expect(resolved.status).toBe("CONFIRMED");
    });

    it("resolves by reservationCode when ID lookup yields 404", async () => {
      const resWithCode: Reservation = {
        ...sampleSingle,
        id: "res-real-id",
        reservationCode: "CODE-777",
      };

      globalThis.fetch = mock(async (input: any) => {
        const urlStr = typeof input === "string" ? input : input.url;

        if (urlStr.includes("/customer/reservation/CODE-777")) {
          return new Response(JSON.stringify({ success: false }), { status: 404 });
        }

        if (urlStr.includes("/customer/reservation")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [resWithCode],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("Not found", { status: 404 });
      }) as any;

      const resolved = await reservationService.get("CODE-777");
      expect(resolved.id).toBe("res-real-id");
      expect(resolved.reservationCode).toBe("CODE-777");
    });
  });
});
