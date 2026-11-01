import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { authService } from "./authService";
import { gamingCenterService } from "./gamingCenterService";
import { reservationService } from "./reservationService";
import { customerNotificationService } from "./customerNotificationService";
import { customerTicketService } from "./customerTicketService";
import { ContractGapError } from "@/types/customerApi";
import { ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";

// Setup in-memory mock for localStorage in non-browser runner
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Customer API Services Foundation (Mocked Network)", () => {
  const originalFetch = globalThis.fetch;
  let requests: { url: string; method: string; headers: Headers; body?: string }[] = [];

  function setupMockFetch(responder: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    requests = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      requests.push({
        url,
        method: init?.method || "GET",
        headers,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      return responder(url, init);
    }) as any;
  }

  beforeEach(() => {
    clearTokens();
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
  });

  describe("authService (Customer Auth Flow)", () => {
    it("requests OTP via POST /auth/customer/otp/request", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/auth/customer/otp/request");
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await authService.requestOtp("09123456789");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("POST");
      expect(JSON.parse(requests[0].body || "{}")).toEqual({ phone: "09123456789" });
    });

    it("verifies OTP via POST /auth/customer/otp/verify and unwraps auth payload", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/auth/customer/otp/verify");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "real-jwt-token",
              refreshToken: "real-refresh-token",
              user: { id: "c-1", phone: "09123456789", fullName: "رضا رضایی" },
            },
          }),
          { status: 200 }
        );
      });

      const res = await authService.verifyOtp("09123456789", "1234");
      expect(res.accessToken).toBe("real-jwt-token");
      expect(res.refreshToken).toBe("real-refresh-token");
      expect(res.user?.fullName).toBe("رضا رضایی");
    });

    it("fetches customer profile from GET /customer/me with Bearer token", async () => {
      setTokens({ accessToken: "test-customer-token" });
      setupMockFetch((url, init) => {
        expect(url).toContain("/customer/me");
        expect(init?.headers).toBeDefined();
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "cust-99", phone: "09123456789", fullName: "مشتری نمونه" },
          }),
          { status: 200 }
        );
      });

      const me = await authService.getMe();
      expect(me.id).toBe("cust-99");
      expect(me.fullName).toBe("مشتری نمونه");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer test-customer-token");
    });

    it("explicitly throws ContractGapError on updateProfileUnsupported and walletUnsupported", () => {
      expect(() => authService.updateProfileUnsupported()).toThrow(ContractGapError);
      expect(() => authService.walletUnsupported()).toThrow(ContractGapError);
    });
  });

  describe("gamingCenterService (Public Information & Availability)", () => {
    it("fetches public gaming center info via GET /public/gamingCenters/{slug}", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/public/gamingCenters/gamenet-gorgodan");
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "gc-1", name: "گیمنت گرگدن", slug: "gamenet-gorgodan", isActive: true },
          }),
          { status: 200 }
        );
      });

      const center = await gamingCenterService.getPublicGamingCenter("gamenet-gorgodan");
      expect(center.id).toBe("gc-1");
      expect(center.name).toBe("گیمنت گرگدن");
    });

    it("fetches available slots via GET /public/gamingCenters/{slug}/availability/slots", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/public/gamingCenters/gc-slug/availability/slots?date=2026-11-02&stationId=st-1");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { startTime: "2026-11-02T10:00:00Z", isAvailable: true, status: "AVAILABLE" },
              { startTime: "2026-11-02T11:00:00Z", isAvailable: false, status: "UNAVAILABLE" },
            ],
          }),
          { status: 200 }
        );
      });

      const slots = await gamingCenterService.getAvailabilitySlots("gc-slug", "2026-11-02", "st-1");
      expect(slots.length).toBe(2);
      expect(slots[0].status).toBe("AVAILABLE");
      expect(slots[1].isAvailable).toBe(false);
    });

    it("fetches stations via GET /gamingCenters/{id}/stations", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/gamingCenters/gc-100/stations");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "st-1", gamingCenterId: "gc-100", name: "PS5 VIP", stationType: "PLAYSTATION", hourlyPrice: 250000 },
            ],
          }),
          { status: 200 }
        );
      });

      const stations = await gamingCenterService.getStations("gc-100");
      expect(stations.length).toBe(1);
      expect(stations[0].stationType).toBe("PLAYSTATION");
      expect(stations[0].hourlyPrice).toBe(250000);
    });

    it("propagates 404 or backend errors without silent fallback", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "NOT_FOUND", message: "گیمنت یافت نشد." },
          }),
          { status: 404 }
        );
      });

      await expect(gamingCenterService.getPublicGamingCenter("unknown-slug")).rejects.toThrow(ApiError);
    });
  });

  describe("reservationService (Customer Reservations Lifecycle)", () => {
    it("creates reservation with mandatory idempotency-key header via POST /public/gamingCenters/{slug}/reservation", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url, init) => {
        expect(url).toContain("/public/gamingCenters/gc-apex/reservation");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "res-new-1",
              gamingCenterId: "gc-apex",
              stationId: "st-1",
              startTime: "2026-11-02T15:00:00Z",
              status: "PENDING",
              paymentState: "UNPAID",
              totalHours: 1,
              totalPrice: 200000,
            },
          }),
          { status: 201 }
        );
      });

      const res = await reservationService.create({
        gamingCenterSlug: "gc-apex",
        idempotencyKey: "unique-key-12345",
        stationId: "st-1",
        startTime: "2026-11-02T15:00:00Z",
        customer: { fullName: "سارا احمدی", phone: "09121112233" },
      });

      expect(res.id).toBe("res-new-1");
      expect(requests[0].headers.get("idempotency-key")).toBe("unique-key-12345");
      expect(requests[0].method).toBe("POST");
    });

    it("fetches list of customer reservations via GET /customer/reservation without fallback", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url) => {
        expect(url).toContain("/customer/reservation");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "res-1", status: "CONFIRMED", paymentState: "PAID", totalPrice: 300000 },
            ],
          }),
          { status: 200 }
        );
      });

      const list = await reservationService.list();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("res-1");
    });

    it("propagates error on GET /customer/reservation without masking with mock data", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "SERVER_ERROR", message: "خطای داخلی سرور" },
          }),
          { status: 500 }
        );
      });

      await expect(reservationService.list()).rejects.toThrow(ApiError);
    });

    it("cancels reservation via POST /customer/reservation/{id}/cancel", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url) => {
        expect(url).toContain("/customer/reservation/res-10/cancel");
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await reservationService.cancel("res-10");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("POST");
    });

    it("propagates cancel errors (e.g. non-cancellable window) properly", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "CANNOT_CANCEL", message: "امکان لغو رزرو کمتر از ۲ ساعت مانده وجود ندارد." },
          }),
          { status: 400 }
        );
      });

      await expect(reservationService.cancel("res-10")).rejects.toThrow(ApiError);
    });

    it("initiates payment via POST /gamingCenters/{id}/reservation/{id}/payments/init with idempotency key", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url, init) => {
        expect(url).toContain("/gamingCenters/gc-1/reservation/res-1/payments/init");
        return new Response(
          JSON.stringify({
            success: true,
            data: { paymentUrl: "https://gateway.example.com/pay/abc", trackingCode: "TRK-987" },
          }),
          { status: 200 }
        );
      });

      const res = await reservationService.initPayment("gc-1", "res-1", "pay-key-999");
      expect(res.paymentUrl).toBe("https://gateway.example.com/pay/abc");
      expect(requests[0].headers.get("idempotency-key")).toBe("pay-key-999");
    });

    it("submits customer rating via POST /customer/reservation/{id}/ratings", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url) => {
        expect(url).toContain("/customer/reservation/res-1/ratings");
        return new Response(JSON.stringify({ success: true }), { status: 201 });
      });

      await reservationService.rate("res-1", { rating: 5, comment: "عالی بود" });
      expect(requests.length).toBe(1);
      expect(JSON.parse(requests[0].body || "{}")).toEqual({ rating: 5, comment: "عالی بود" });
    });

    it("accepts and rejects time proposals via POST .../proposals/{proposalId}/accept and reject", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url) => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await reservationService.acceptProposal("res-1", "prop-1");
      expect(requests[0].url).toContain("/customer/reservation/res-1/proposals/prop-1/accept");

      await reservationService.rejectProposal("res-1", "prop-1");
      expect(requests[1].url).toContain("/customer/reservation/res-1/proposals/prop-1/reject");
    });
  });

  describe("customerNotificationService", () => {
    it("fetches user notifications and unread count via /notifications endpoints", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url) => {
        if (url.includes("/notifications/unread-count")) {
          return new Response(JSON.stringify({ success: true, data: { count: 4 } }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "notif-1", type: "RESERVATION_CONFIRMED", title: "رزرو تایید شد", isRead: false },
            ],
          }),
          { status: 200 }
        );
      });

      const count = await customerNotificationService.getUnreadCount();
      expect(count).toBe(4);

      const notifs = await customerNotificationService.listNotifications({ isRead: false });
      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toBe("رزرو تایید شد");
    });

    it("marks notification as read via PATCH /notifications/{id}/read", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url) => {
        expect(url).toContain("/notifications/notif-123/read");
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await customerNotificationService.markAsRead("notif-123");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("PATCH");
    });
  });

  describe("customerTicketService", () => {
    it("creates, lists, and sends messages on support tickets via /tickets", async () => {
      setTokens({ accessToken: "customer-token" });
      setupMockFetch((url, init) => {
        if (init?.method === "POST" && url.endsWith("/tickets")) {
          return new Response(JSON.stringify({ success: true }), { status: 201 });
        }
        if (init?.method === "GET" && url.endsWith("/tickets")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                { id: "tick-1", subject: "مشکل در پرداخت", status: "OPEN", priority: "HIGH", category: "FINANCIAL" },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/messages")) {
          return new Response(JSON.stringify({ success: true }), { status: 201 });
        }
        return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
      });

      await customerTicketService.createTicket({
        subject: "مشکل در پرداخت",
        message: "مبلغ کسر شد اما رزرو ثبت نشد.",
        category: "FINANCIAL",
        priority: "HIGH",
      });
      expect(requests[0].method).toBe("POST");

      const tickets = await customerTicketService.listTickets();
      expect(tickets.length).toBe(1);
      expect(tickets[0].subject).toBe("مشکل در پرداخت");

      await customerTicketService.sendMessage("tick-1", { text: "پیگیری مجدد" });
      expect(requests[2].url).toContain("/tickets/tick-1/messages");
    });
  });
});
