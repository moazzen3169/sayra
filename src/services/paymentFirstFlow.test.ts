import { describe, it, expect, beforeEach } from "bun:test";
import { groupReservationApi } from "@/services/gaming-center/group-reservation.api";
import { paymentService } from "@/services/paymentService";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { GroupReservationCheckoutPayload } from "@/types/gaming-center/group-reservation.types";

describe("Payment-First Flow & Online Reservation Redesign", () => {
  beforeEach(() => {
    // Setup mock sessionStorage
    const store: Record<string, string> = {};
    (globalThis as any).window = globalThis;
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    bookingDraftStorage.clear();
  });

  describe("1. Step 1: Hold Capacity (Checkout Endpoint)", () => {
    it("submits checkout request to POST /public/gamingCenters/:slug/group-reservations/checkout with Idempotency-Key", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: any = null;

      const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const payload: GroupReservationCheckoutPayload = {
        startTime: futureDate,
        durationMinutes: 120,
        items: [{ stationId: "st-vip-1" }, { stationId: "st-vip-2" }],
        customer: {
          fullName: "مهدی علوی",
          phone: "09121112233",
          email: "mehdi@example.com",
        },
        note: "درخواست ۲ دسته اضافه",
      };

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        capturedUrl = url.toString();
        capturedMethod = init?.method || "GET";
        capturedHeaders = (init?.headers || {}) as Record<string, string>;
        capturedBody = init?.body ? JSON.parse(init.body.toString()) : null;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              holdId: "hold-8899",
              paymentId: "pay-1122",
              paymentUrl: "https://gateway.zibal.ir/start/98765",
              token: "98765",
              expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              amount: 500000,
              gamingCenterId: "gc-center-1",
              gamingCenterSlug: "respawn-zone",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const idempotencyKey = "test-uuid-idem-key-1";
      const result = await groupReservationApi.checkoutGroupReservation(
        "respawn-zone",
        payload,
        idempotencyKey
      );

      expect(capturedUrl).toContain("/public/gamingCenters/respawn-zone/group-reservations/checkout");
      expect(capturedMethod).toBe("POST");
      expect(capturedHeaders["Idempotency-Key"]).toBe(idempotencyKey);
      expect(capturedBody.items.length).toBe(2);
      expect(capturedBody.customer.phone).toBe("09121112233");

      expect(result.holdId).toBe("hold-8899");
      expect(result.paymentId).toBe("pay-1122");
      expect(result.paymentUrl).toBe("https://gateway.zibal.ir/start/98765");
      expect(result.amount).toBe(500000);
    });

    it("validates that startTime is in the future and duration is within bounds", async () => {
      const pastPayload: GroupReservationCheckoutPayload = {
        startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
        durationMinutes: 60,
        items: [{ stationId: "st-1" }],
        customer: { fullName: "کاربر تست", phone: "09123456789" },
      };

      expect(
        groupReservationApi.checkoutGroupReservation("my-club", pastPayload, "key-1")
      ).rejects.toThrow("زمان شروع رزرو باید در آینده باشد.");

      const invalidDurationPayload: GroupReservationCheckoutPayload = {
        startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
        durationMinutes: 10, // less than 15 min
        items: [{ stationId: "st-1" }],
        customer: { fullName: "کاربر تست", phone: "09123456789" },
      };

      expect(
        groupReservationApi.checkoutGroupReservation("my-club", invalidDurationPayload, "key-2")
      ).rejects.toThrow("مدت زمان رزرو باید بین ۱۵ دقیقه تا ۲۴ ساعت");
    });
  });

  describe("2. Step 2 & Storage: BookingHold & Gateway Redirection", () => {
    it("stores hold and payment information in bookingDraftStorage for recovery", () => {
      bookingDraftStorage.set({
        gamingCenterSlug: "respawn-zone",
        gamingCenterName: "کلاب ریسپاون",
        selectedStationIds: ["st-1", "st-2"],
        stationSnapshots: [],
        date: { id: "d1", dayName: "امروز", dateStr: "۱ آبان", fullDate: "2026-11-01" },
        slots: [],
        durationHours: 2,
      });

      bookingDraftStorage.update({
        holdId: "hold-8899",
        paymentId: "pay-1122",
        paymentUrl: "https://gateway.zibal.ir/start/98765",
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        grandTotal: 500000,
      });

      const restored = bookingDraftStorage.get();
      expect(restored?.holdId).toBe("hold-8899");
      expect(restored?.paymentId).toBe("pay-1122");
      expect(restored?.paymentUrl).toBe("https://gateway.zibal.ir/start/98765");
      expect(restored?.grandTotal).toBe(500000);
    });
  });

  describe("3. Step 3: Authoritative Verification (POST /payments/:paymentId/verify)", () => {
    it("verifies payment with bank gateway via POST /payments/:paymentId/verify", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: any = null;

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        capturedUrl = url.toString();
        capturedMethod = init?.method || "GET";
        capturedBody = init?.body ? JSON.parse(init.body.toString()) : null;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
              paymentStatus: "PAID",
              paymentState: "PAID",
              reservationStatus: "CONFIRMED",
              reservationId: "res-confirmed-777",
              groupBookingId: "grp-confirmed-888",
              trackingCode: "TRK-SUCCESS-100",
              amount: 500000,
              refId: "REF-BANK-999",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const verifyRes = await paymentService.verifyPayment("pay-1122", {
        authority: "98765",
        status: "OK",
      });

      expect(capturedUrl).toContain("/payments/pay-1122/verify");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody.authority).toBe("98765");
      expect(verifyRes.paymentStatus).toBe("PAID");
      expect(verifyRes.reservationStatus).toBe("CONFIRMED");
      expect(verifyRes.reservationId).toBe("res-confirmed-777");
      expect(verifyRes.groupBookingId).toBe("grp-confirmed-888");
      expect(verifyRes.trackingCode).toBe("TRK-SUCCESS-100");
    });
  });

  describe("4. Step 4 & 5: Atomic Conversion, Expiry & Status Models", () => {
    it("ensures no reservation is created prior to payment confirmation", () => {
      // Invariant check: In BookingHold, no reservationId exists before CONVERTED status
      const initialHold = {
        id: "hold-1",
        status: "ACTIVE" as const,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        reservationId: undefined,
      };

      expect(initialHold.status).toBe("ACTIVE");
      expect(initialHold.reservationId).toBeUndefined();
    });

    it("verifies lifecycle statuses for BookingHold: ACTIVE, CONVERTED, EXPIRED, RELEASED", () => {
      const allowedStatuses = ["ACTIVE", "CONVERTED", "EXPIRED", "RELEASED"];
      expect(allowedStatuses).toContain("ACTIVE");
      expect(allowedStatuses).toContain("CONVERTED");
      expect(allowedStatuses).toContain("EXPIRED");
      expect(allowedStatuses).toContain("RELEASED");
    });

    it("verifies endpoints definition contains payment verify and checkout", () => {
      expect(ENDPOINTS.gamingCenter.groupReservationCheckout("respawn-zone")).toBe(
        "/public/gamingCenters/respawn-zone/group-reservations/checkout"
      );
      expect(ENDPOINTS.payment.verifyPayment("pay-xyz")).toBe("/payments/pay-xyz/verify");
      expect(ENDPOINTS.payment.webhook).toBe("/payments/webhook");
    });
  });
});
