import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { gamingCenterService } from "@/services/gamingCenterService";
import { gamecentersPageService } from "@/services/gamecentersPageService";
import { loadGamecenterDetail } from "@/services/gamecenterDetailService";
import { bookingPreparationService } from "@/services/bookingPreparationService";
import { authService } from "@/services/authService";
import { reservationService } from "@/services/reservationService";
import { createIdempotencyKey } from "@/services/bookingService";
import { customerReviewService } from "@/services/customerReviewService";
import { customerTicketService } from "@/services/customerTicketService";
import { customerNotificationService } from "@/services/customerNotificationService";
import { setTokens, clearTokens, getAccessToken } from "@/lib/token";
import type { BookingLine, DeviceGroup, AvailabilityMap } from "@/lib/devices";
import type { GameStationInfo } from "@/services/gamingCenterService";

/**
 * ============================================================================
 * Phase 22: Customer End-to-End Workflow Integration Tests
 * ============================================================================
 *
 * [MOCKED-NETWORK AUTOMATED TESTS - ISOLATED DETERMINISTIC TEST SUITE]
 * IMPORTANT NOTICE: These tests use deterministic API mocks for isolated
 * automated testing. They assert frontend mapping, request payload construction,
 * user-visible behavior, and error handling. They DO NOT prove integration
 * with a live running backend server.
 * ============================================================================
 */

// In-memory mock for localStorage in non-browser runner
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Phase 22: Customer Workflow Integration Tests (Mocked Network)", () => {
  const originalFetch = globalThis.fetch;
  let requests: { url: string; method: string; headers: Headers; body?: string }[] = [];

  const setupMockFetch = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
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
      return handler(url, init);
    }) as unknown as typeof fetch;
  };

  beforeEach(() => {
    storage.clear();
    clearTokens();
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    storage.clear();
    clearTokens();
  });

  // --------------------------------------------------------------------------
  // Workflow 1: Discovery, Catalog Search, Filter, and Sorting
  // --------------------------------------------------------------------------
  it("Workflow 1: executes discovery, search, filter, and sorting on gaming centers catalog", async () => {
    setupMockFetch((url) => {
      if (url.includes("/gamingCenters")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "gc-1",
                name: "مرکز پردیس تهران",
                slug: "center-pardis",
                description: "تهران، میدان پردیس",
                createdAt: "2026-01-01T10:00:00Z",
              },
              {
                id: "gc-2",
                name: "گیمنت سایبر شیراز",
                slug: "center-cyber",
                description: "شیراز، خیابان ارم",
                createdAt: "2026-03-01T10:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    // 1. Fetch raw list from API via gamingCenterService
    const rawCenters = await gamingCenterService.listGamingCenters();
    expect(rawCenters.length).toBe(2);
    expect(rawCenters[0].slug).toBe("center-pardis");

    // 2. Load and map centers for gamecenters page
    const catalog = await gamecentersPageService.loadAllCenters();
    expect(catalog.length).toBe(2);
    expect(catalog[0].id).toBe("center-pardis");
    expect(catalog[0].name).toBe("مرکز پردیس تهران");

    // 3. Filter by search query (Farsi character normalization)
    const filteredByQuery = gamecentersPageService.filterCenters(catalog, { q: "پرديس" });
    expect(filteredByQuery.length).toBe(1);
    expect(filteredByQuery[0].id).toBe("center-pardis");

    // 4. Filter by city/location
    const filteredByCity = gamecentersPageService.filterCenters(catalog, { city: "شیراز" });
    expect(filteredByCity.length).toBe(1);
    expect(filteredByCity[0].id).toBe("center-cyber");

    // 5. Test sorting by newest
    const sortedNewest = gamecentersPageService.filterCenters(catalog, { sort: "newest" });
    expect(sortedNewest[0].id).toBe("center-cyber"); // created in March > created in January
  });

  // --------------------------------------------------------------------------
  // Workflow 2: Center Details, Stations, Media, Addresses, and Ratings
  // --------------------------------------------------------------------------
  it("Workflow 2: retrieves complete center detail including stations, addresses, media, and ratings", async () => {
    setupMockFetch((url) => {
      if (url.includes("/public/gamingCenters/center-pardis/media")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "m-1", url: "https://example.com/banner.jpg", purpose: "GALLERY", altText: "تصویر سالن" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/public/gamingCenters/center-pardis/ratings")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "r-1",
                customerName: "محمد",
                rating: 5,
                comment: "عالی و محیط تمیز",
                createdAt: "2026-03-01T12:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/stations")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "st-1",
                gamingCenterId: "gc-1",
                name: "PlayStation 5 VIP",
                stationType: "PLAYSTATION",
                hourlyPrice: 120000,
                isActive: true,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/public/gamingCenters/center-pardis/addresses")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "addr-1",
                gamingCenterId: "gc-1",
                address: "تهران، خیابان ولیعصر",
                city: "تهران",
                latitude: 35.7,
                longitude: 51.4,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/public/gamingCenters/center-pardis")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "gc-1",
              name: "مرکز پردیس تهران",
              slug: "center-pardis",
              description: "بهترین گیم‌نت تهران",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    const detail = await loadGamecenterDetail("center-pardis");
    expect(detail).not.toBeNull();
    expect(detail.center.id).toBe("gc-1");
    expect(detail.center.name).toBe("مرکز پردیس تهران");
    expect(detail.stations.length).toBe(1);
    expect(detail.stations[0].name).toBe("PlayStation 5 VIP");
    expect(detail.stations[0].hourlyPrice).toBe(120000);
    expect(detail.address).toBe("تهران، خیابان ولیعصر");
    expect(detail.images.length).toBe(1);
    expect(detail.reviews.length).toBe(1);
    expect(detail.reviews[0].rating).toBe(5);
  });

  // --------------------------------------------------------------------------
  // Workflow 3: Station Availability Slots Retrieval
  // --------------------------------------------------------------------------
  it("Workflow 3: queries station availability slots for a target date", async () => {
    let capturedUrl = "";
    setupMockFetch((url) => {
      capturedUrl = url;
      if (url.includes("/availability/slots")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { startTime: "2026-11-05T14:00:00Z", endTime: "2026-11-05T15:00:00Z", isAvailable: true, status: "AVAILABLE" },
              { startTime: "2026-11-05T15:00:00Z", endTime: "2026-11-05T16:00:00Z", isAvailable: false, status: "UNAVAILABLE" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    const slots = await gamingCenterService.getAvailabilitySlots("center-pardis", "2026-11-05", "st-1");
    expect(slots.length).toBe(2);
    expect(slots[0].isAvailable).toBe(true);
    expect(slots[1].isAvailable).toBe(false);
    expect(capturedUrl).toContain("date=2026-11-05");
    expect(capturedUrl).toContain("stationId=st-1");
  });

  // --------------------------------------------------------------------------
  // Workflow 4: Booking Preparation & Price Breakdown Calculation
  // --------------------------------------------------------------------------
  it("Workflow 4: prepares booking selection and produces verified price estimate breakdown", () => {
    const sampleStation: GameStationInfo = {
      id: "st-ps5-01",
      gamingCenterId: "gc-tehran-01",
      name: "PS5 VIP #1",
      stationType: "PLAYSTATION",
      hourlyPrice: 120000,
      isActive: true,
    };

    const sampleGroup: DeviceGroup = {
      key: "PLAYSTATION",
      label: "پلی‌استیشن ۵",
      image: "/img/ps5.png",
      isConsole: true,
      stations: [sampleStation],
      capacity: 1,
      minPrice: 120000,
      maxPrice: 120000,
      extraControllerPrice: 40000,
      defaultControllers: 2,
      maxExtra: 2,
    };

    const avail: AvailabilityMap = {
      "st-ps5-01": {
        "2026-11-10T14:00:00Z": true,
        "2026-11-10T15:00:00Z": true,
      },
    };

    const line: BookingLine = {
      group: sampleGroup,
      qty: 1,
      extra: 1,
    };

    const result = bookingPreparationService.prepareBooking({
      gamingCenterSlug: "center-pardis",
      gamingCenterId: "gc-tehran-01",
      lines: [line],
      startTimes: ["2026-11-10T14:00:00Z"],
      availability: avail,
    });

    expect(result.isValid).toBe(true);
    expect(result.validationErrors.length).toBe(0);
    expect(result.items?.length).toBe(1);
    expect(result.breakdown.isFinal).toBe(false);
    expect(result.breakdown.isEstimate).toBe(true);
    // 120000 base + 40000 extra = 160000
    expect(result.breakdown.subtotalStationPrice).toBe(120000);
    expect(result.breakdown.subtotalExtraPrice).toBe(40000);
    expect(result.breakdown.grandTotal).toBe(160000);
  });

  // --------------------------------------------------------------------------
  // Workflow 5: Customer Passwordless Authentication (OTP Request & Verify)
  // --------------------------------------------------------------------------
  it("Workflow 5: executes customer OTP authentication and securely stores tokens", async () => {
    let otpPayload: any = null;
    let verifyPayload: any = null;

    setupMockFetch((url, init) => {
      if (url.includes("/auth/customer/otp/request")) {
        otpPayload = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: { message: "کد تأیید ارسال شد", expiresIn: 120 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/auth/customer/otp/verify")) {
        verifyPayload = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "cust_access_token_123",
              refreshToken: "cust_refresh_token_456",
              user: { id: "cust-1", phone: "09121111111", fullName: "رضا محمدی" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    // 1. Request OTP (returns void on success per OpenAPI specification)
    await authService.requestOtp("09121111111");
    expect(otpPayload.phone).toBe("09121111111");

    // 2. Verify OTP
    const verifyRes = await authService.verifyOtp("09121111111", "12345");
    expect(verifyRes.accessToken).toBe("cust_access_token_123");
    expect(verifyPayload.phone).toBe("09121111111");
    expect(verifyPayload.code).toBe("12345");

    // Set and verify tokens
    setTokens({ accessToken: verifyRes.accessToken, refreshToken: verifyRes.refreshToken });
    expect(getAccessToken()).toBe("cust_access_token_123");
  });

  // --------------------------------------------------------------------------
  // Workflow 6: Reservation Creation with Idempotency & Payment Initiation
  // --------------------------------------------------------------------------
  it("Workflow 6: creates a reservation with idempotency key and initiates payment", async () => {
    let capturedIdempotencyHeader: string | null = null;
    let capturedCreateBody: any = null;

    setupMockFetch((url, init) => {
      if (url.includes("/public/gamingCenters/center-pardis/reservation") && init?.method === "POST") {
        capturedIdempotencyHeader = new Headers(init?.headers).get("idempotency-key");
        capturedCreateBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "res-new-99",
              status: "PENDING",
              paymentState: "UNPAID",
              totalPrice: 120000,
              reservationCode: "RES-9988",
              startTime: "2026-11-05T14:00:00Z",
              endTime: "2026-11-05T15:00:00Z",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/payments/init") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              paymentUrl: "https://gateway.zibal.ir/start/9988",
              authority: "auth-9988",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    const idempotencyKey = createIdempotencyKey();
    const reservation = await reservationService.create({
      gamingCenterSlug: "center-pardis",
      idempotencyKey,
      stationId: "st-1",
      startTime: "2026-11-05T14:00:00Z",
      customer: { fullName: "رضا محمدی", phone: "09121111111" },
      note: "رزرو تست اتوماسیون",
    });

    expect(reservation.id).toBe("res-new-99");
    expect(reservation.reservationCode).toBe("RES-9988");
    expect(capturedIdempotencyHeader).toBe(idempotencyKey);
    expect(capturedCreateBody.stationId).toBe("st-1");
    expect(capturedCreateBody.customer.phone).toBe("09121111111");

    // Initiate payment
    const payment = await reservationService.initPayment("gc-1", "res-new-99", idempotencyKey);
    expect(payment.paymentUrl).toBe("https://gateway.zibal.ir/start/9988");
    expect(payment.authority).toBe("auth-9988");
  });

  // --------------------------------------------------------------------------
  // Workflow 7: Customer Reservation List, Pagination, and Detail Inspection
  // --------------------------------------------------------------------------
  it("Workflow 7: fetches customer reservation history and single reservation detail", async () => {
    setTokens("cust_token", "refresh_token");

    setupMockFetch((url) => {
      if (url.includes("/customer/reservation/res-101")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "res-101",
              gamingCenterId: "gc-1",
              stationId: "st-1",
              status: "CONFIRMED",
              paymentState: "PAID",
              totalPrice: 150000,
              startTime: "2026-11-05T14:00:00Z",
              endTime: "2026-11-05T15:00:00Z",
              reservationCode: "RES-101",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/customer/reservation")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "res-101",
                gamingCenterId: "gc-1",
                status: "CONFIRMED",
                paymentState: "PAID",
                totalPrice: 150000,
                startTime: "2026-11-05T14:00:00Z",
              },
            ],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    // 1. Fetch paginated list
    const paginated = await reservationService.listPaginated({ page: 1, pageSize: 10 });
    expect(paginated.items.length).toBe(1);
    expect(paginated.items[0].id).toBe("res-101");
    expect(paginated.total).toBe(1);

    // 2. Fetch single reservation detail
    const detail = await reservationService.get("res-101");
    expect(detail.id).toBe("res-101");
    expect(detail.status).toBe("CONFIRMED");
    expect(detail.paymentState).toBe("PAID");
    expect(detail.reservationCode).toBe("RES-101");
  });

  // --------------------------------------------------------------------------
  // Workflow 8: Customer Reservation Mutations (Cancel & Proposal Accept/Reject)
  // --------------------------------------------------------------------------
  it("Workflow 8: executes reservation cancellation and owner proposal acceptance/rejection", async () => {
    setTokens("cust_token", "refresh_token");
    let cancelCalled = false;
    let acceptedProposalId: string | undefined;

    setupMockFetch((url, init) => {
      if (url.includes("/customer/reservation/res-101/cancel") && init?.method === "POST") {
        cancelCalled = true;
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "res-101", status: "CANCELLED" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/customer/reservation/res-101/proposals/prop-1/accept") && init?.method === "POST") {
        acceptedProposalId = "prop-1";
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "res-101", status: "CONFIRMED" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    // 1. Cancel reservation
    await reservationService.cancel("res-101");
    expect(cancelCalled).toBe(true);

    // 2. Accept proposal
    await reservationService.acceptProposal("res-101", "prop-1");
    expect(acceptedProposalId).toBe("prop-1");
  });

  // --------------------------------------------------------------------------
  // Workflow 9: Customer Review & Rating Submission Tied to Reservation
  // --------------------------------------------------------------------------
  it("Workflow 9: submits a customer rating tied to a completed reservation", async () => {
    setTokens("cust_token", "refresh_token");
    let submittedReview: any = null;

    setupMockFetch((url, init) => {
      if (url.includes("/customer/reservation/res-101/ratings") && init?.method === "POST") {
        submittedReview = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "rat-new-1",
              reservationId: "res-101",
              rating: submittedReview.rating,
              comment: submittedReview.comment,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    await customerReviewService.submitCustomerReview("res-101", {
      rating: 5,
      comment: "تجربه بسیار عالی بود",
    });

    expect(submittedReview.rating).toBe(5);
    expect(submittedReview.comment).toBe("تجربه بسیار عالی بود");
  });

  // --------------------------------------------------------------------------
  // Workflow 10: Customer Support Ticket Creation and Messaging
  // --------------------------------------------------------------------------
  it("Workflow 10: creates a support ticket and sends messages", async () => {
    setTokens("cust_token", "refresh_token");
    let ticketBody: any = null;
    let messageBody: any = null;

    setupMockFetch((url, init) => {
      if (url.includes("/tickets") && !url.includes("/messages") && init?.method === "POST") {
        ticketBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "t-cust-1",
              subject: ticketBody.subject,
              status: "OPEN",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/tickets/t-cust-1/messages") && init?.method === "POST") {
        messageBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "msg-cust-1",
              ticketId: "t-cust-1",
              message: messageBody.message,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    // 1. Create support ticket
    await customerTicketService.createTicket({
      subject: "سؤال درباره کنسول PS5",
      message: "آیا دسته اضافی برای بازی FIFA موجود است؟",
    });
    expect(ticketBody.subject).toBe("سؤال درباره کنسول PS5");

    // 2. Send follow-up message
    await customerTicketService.sendMessage("t-cust-1", { message: "ممنون از پاسخ شما" });
    expect(messageBody.message).toBe("ممنون از پاسخ شما");
  });

  // --------------------------------------------------------------------------
  // Workflow 11: Customer Notifications Listing and Mark as Read
  // --------------------------------------------------------------------------
  it("Workflow 11: reads customer notifications and marks them as read", async () => {
    setTokens("cust_token", "refresh_token");
    let markedReadId: string | undefined;

    setupMockFetch((url, init) => {
      if (url.includes("/notifications/unread-count")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { unreadCount: markedReadId ? 0 : 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/notifications/notif-1/read") && init?.method === "PATCH") {
        markedReadId = "notif-1";
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "notif-1", isRead: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/notifications")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "notif-1",
                title: "تأیید رزرو",
                message: "رزرو شما با موفقیت تأیید شد.",
                isRead: false,
                createdAt: "2026-11-04T10:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    // 1. Check unread count
    const countBefore = await customerNotificationService.getUnreadCount();
    expect(countBefore).toBe(1);

    // 2. List notifications
    const notifs = await customerNotificationService.listNotifications();
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toBe("تأیید رزرو");

    // 3. Mark as read
    await customerNotificationService.markAsRead("notif-1");
    expect(markedReadId).toBe("notif-1");

    // 4. Verify count decreases
    const countAfter = await customerNotificationService.getUnreadCount();
    expect(countAfter).toBe(0);
  });
});
