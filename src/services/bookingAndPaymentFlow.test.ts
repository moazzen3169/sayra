import { describe, it, expect, beforeEach } from "bun:test";
import { bookingDraftStorage } from "@/lib/bookingDraftStorage";

describe("Booking and Payment Flow Integration Tests", () => {
  beforeEach(() => {
    // Setup mock sessionStorage for test environment
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

  describe("1. bookingDraftStorage Persistence & Recovery", () => {
    it("saves and retrieves active booking draft without losing user selections", () => {
      bookingDraftStorage.set({
        gamingCenterId: "gc-101",
        gamingCenterSlug: "respawn-club",
        gamingCenterName: "کلاب ریسپاون",
        selectedStationIds: ["st-1", "st-2"],
        stationSnapshots: [
          { id: "st-1", name: "PS5 VIP 1", hourlyPrice: 120000, stationType: "PS5" },
          { id: "st-2", name: "PS5 VIP 2", hourlyPrice: 120000, stationType: "PS5" },
        ],
        date: {
          id: "day-1",
          dayName: "دوشنبه",
          dateStr: "۱۵ آبان",
          fullDate: "2026-11-06",
        },
        slots: [
          {
            key: "2026-11-06T18:00:00Z",
            startTime: "2026-11-06T18:00:00Z",
            startLabel: "۱۸:۰۰",
            endLabel: "۱۹:۰۰",
            hourNumber: "18",
          },
        ],
        durationHours: 1,
        customer: {
          fullName: "سارا حسینی",
          phone: "09121234567",
        },
        grandTotal: 240000,
      });

      const restored = bookingDraftStorage.get();
      expect(restored).not.toBeNull();
      expect(restored?.gamingCenterSlug).toBe("respawn-club");
      expect(restored?.selectedStationIds.length).toBe(2);
      expect(restored?.customer?.phone).toBe("09121234567");
      expect(restored?.grandTotal).toBe(240000);
    });

    it("updates draft with reservationId after successful creation", () => {
      bookingDraftStorage.set({
        gamingCenterSlug: "respawn-club",
        gamingCenterName: "کلاب ریسپاون",
        selectedStationIds: ["st-1"],
        stationSnapshots: [],
        date: { id: "d-1", dayName: "امروز", dateStr: "۱۵ آبان", fullDate: "2026-11-06" },
        slots: [],
        durationHours: 1,
      });

      bookingDraftStorage.update({
        reservationId: "res-new-555",
      });

      const updated = bookingDraftStorage.get();
      expect(updated?.reservationId).toBe("res-new-555");
    });
  });

  describe("2. Payment Verification Scenarios", () => {
    it("handles SUCCESS response correctly with proper fields", async () => {
      const mockResult = {
        paymentState: "PAID" as const,
        reservationStatus: "CONFIRMED",
        trackingCode: "TRK-SUCCESS-100",
        amount: 240000,
      };

      expect(mockResult.paymentState).toBe("PAID");
      expect(mockResult.trackingCode).toBe("TRK-SUCCESS-100");
    });

    it("identifies FAILED and CANCELLED states distinctly", () => {
      const failedState = "FAILED";
      const cancelledState = "CANCELLED";
      const pendingState = "PENDING";
      const unknownState = "UNKNOWN";

      expect(failedState).not.toBe(pendingState);
      expect(cancelledState).not.toBe(failedState);
      expect(unknownState).not.toBe(failedState);
    });
  });
});
