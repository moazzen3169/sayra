import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { gamingCenterService } from "@/services/gamingCenterService";
import { gamecentersPageService } from "@/services/gamecentersPageService";
import { loadGamecenterDetail } from "@/services/gamecenterDetailService";
import { authService } from "@/services/authService";
import { reservationService } from "@/services/reservationService";
import { customerReviewService } from "@/services/customerReviewService";
import { customerTicketService } from "@/services/customerTicketService";
import { customerNotificationService } from "@/services/customerNotificationService";
import { customerFavoriteService } from "@/services/customerFavoriteService";
import { customerMediaService } from "@/services/customerMediaService";
import { setTokens, clearTokens, getAccessToken } from "@/lib/token";
import { ApiError } from "@/lib/api/client";
import { ContractGapError } from "@/types/customerApi";

/**
 * ============================================================================
 * Phase 22: Customer Failure Scenarios Tests
 * ============================================================================
 *
 * [MOCKED-NETWORK AUTOMATED TESTS - ISOLATED DETERMINISTIC TEST SUITE]
 * IMPORTANT NOTICE: These tests use deterministic API mocks for isolated
 * automated testing. They assert frontend mapping, request payload construction,
 * user-visible error handling, and contract boundary enforcement. They DO NOT
 * claim to prove integration with a live running backend server.
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

describe("Phase 22: Customer Failure Scenarios Tests (Mocked Network)", () => {
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
  // Scenario 1: Network Unavailable / Fetch TypeError
  // --------------------------------------------------------------------------
  it("Scenario 1: handles network failure gracefully without falling back to mock data", async () => {
    setupMockFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    await expect(gamingCenterService.listGamingCenters()).rejects.toThrow("ارتباط با سرور برقرار نشد.");
    await expect(reservationService.listPaginated()).rejects.toThrow("ارتباط با سرور برقرار نشد.");
    await expect(customerNotificationService.listNotifications()).rejects.toThrow("ارتباط با سرور برقرار نشد.");
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Request Timeout via AbortSignal
  // --------------------------------------------------------------------------
  it("Scenario 2: cancels in-flight requests via AbortSignal without leaking state", async () => {
    const controller = new AbortController();

    setupMockFetch((_url, init) => {
      return new Promise((_, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The operation was aborted", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    });

    const promise = reservationService.listPaginated({ signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // Scenario 3: 400 Validation Errors with Structured Backend Messages
  // --------------------------------------------------------------------------
  it("Scenario 3: handles 400 Bad Request and preserves backend validation errors", async () => {
    setupMockFetch(() => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "شماره موبایل وارد شده نامعتبر است.",
            details: [{ field: "phone", message: "Invalid format" }],
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    });

    try {
      await authService.requestOtp("invalid-phone");
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe("VALIDATION_FAILED");
      expect(apiErr.message).toBe("شماره موبایل وارد شده نامعتبر است.");
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 4: 401 Unauthorized with Token Refresh Failure
  // --------------------------------------------------------------------------
  it("Scenario 4: handles 401 Unauthorized, fails refresh, and clears auth tokens", async () => {
    setTokens({ accessToken: "expired_token", refreshToken: "invalid_refresh" });

    setupMockFetch((url) => {
      if (url.includes("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INVALID_TOKEN", message: "توکن بازنشانی نامعتبر است." },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "توکن منقضی شده است." },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    });

    await expect(reservationService.get("res-1")).rejects.toThrow();
    // Tokens must be cleared
    expect(getAccessToken()).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Scenario 5: 403 Forbidden Access
  // --------------------------------------------------------------------------
  it("Scenario 5: handles 403 Forbidden without exposing customer data across tenants", async () => {
    setupMockFetch(() => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "FORBIDDEN", message: "شما اجازه دسترسی به این منبع را ندارید." },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    });

    try {
      await reservationService.get("res-other-customer");
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.code).toBe("FORBIDDEN");
      expect(apiErr.message).toBe("شما اجازه دسترسی به این منبع را ندارید.");
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 6: 404 Not Found Handling
  // --------------------------------------------------------------------------
  it("Scenario 6: handles 404 Not Found without synthesizing missing items", async () => {
    setupMockFetch(() => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NOT_FOUND", message: "مرکز بازی مورد نظر یافت نشد." },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    });

    await expect(loadGamecenterDetail("non-existent-center")).rejects.toThrow("مرکز بازی مورد نظر یافت نشد.");
  });

  // --------------------------------------------------------------------------
  // Scenario 7: 409 Conflict Handling (e.g. Booking Overlap / Slot Taken)
  // --------------------------------------------------------------------------
  it("Scenario 7: handles 409 Conflict when requested slot is already booked", async () => {
    setupMockFetch(() => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "SLOT_ALREADY_RESERVED",
            message: "این سانس قبلاً توسط کاربر دیگری رزرو شده است.",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    });

    try {
      await reservationService.create({
        gamingCenterSlug: "center-pardis",
        idempotencyKey: "idem-conflict-1",
        stationId: "st-1",
        startTime: "2026-11-05T14:00:00Z",
        customer: { fullName: "رضا", phone: "09121111111" },
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.code).toBe("SLOT_ALREADY_RESERVED");
      expect(apiErr.message).toBe("این سانس قبلاً توسط کاربر دیگری رزرو شده است.");
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 8: 500 / 502 / 503 Server Errors Without Fake Data Fallback
  // --------------------------------------------------------------------------
  it("Scenario 8: handles 500/502/503 server errors without synthesizing fake data", async () => {
    setupMockFetch(() => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "SERVER_ERROR", message: "خطای داخلی سرور" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    });

    await expect(gamingCenterService.listGamingCenters()).rejects.toThrow("خطای داخلی سرور");
    await expect(customerTicketService.listTickets()).rejects.toThrow("خطای داخلی سرور");
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Empty API Responses (Zero Items vs Errors)
  // --------------------------------------------------------------------------
  it("Scenario 9: cleanly differentiates empty response datasets from server errors", async () => {
    setupMockFetch(() => {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    // 1. Empty reservations
    const resList = await reservationService.listPaginated();
    expect(resList.items).toEqual([]);
    expect(resList.total).toBe(0);

    // 2. Empty notifications
    const notifs = await customerNotificationService.listNotifications();
    expect(notifs).toEqual([]);

    // 3. Empty tickets
    const tickets = await customerTicketService.listTickets();
    expect(tickets).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Malformed Non-JSON Responses (HTML Gateway Errors)
  // --------------------------------------------------------------------------
  it("Scenario 10: handles non-JSON HTML gateway error payloads without crashing runtime", async () => {
    setupMockFetch(() => {
      return new Response(
        "<html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>",
        { status: 502, headers: { "Content-Type": "text/html" } }
      );
    });

    try {
      await gamingCenterService.listGamingCenters();
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(502);
      expect(typeof apiErr.message).toBe("string");
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Unsupported Contract Operations (ContractGapError)
  // --------------------------------------------------------------------------
  it("Scenario 11: enforces OpenAPI contract gaps with ContractGapError and zero fabricated requests", async () => {
    // 1. Direct reservation deletion
    expect(() => reservationService.deleteUnsupported()).toThrow(ContractGapError);

    // 2. Direct reservation modification (customer PATCH)
    expect(() => reservationService.updateUnsupported()).toThrow(ContractGapError);

    // 3. Customer password login / registration / reset
    expect(() => authService.customerPasswordLoginUnsupported()).toThrow(ContractGapError);
    expect(() => authService.customerRegistrationUnsupported()).toThrow(ContractGapError);
    expect(() => authService.customerPasswordResetUnsupported()).toThrow(ContractGapError);

    // 4. Customer favorites operations
    expect(() => customerFavoriteService.listFavorites()).toThrow(ContractGapError);
    expect(() => customerFavoriteService.addFavorite("gc-1")).toThrow(ContractGapError);
    expect(() => customerFavoriteService.removeFavorite("gc-1")).toThrow(ContractGapError);
    expect(() => customerFavoriteService.isFavorite("gc-1")).toThrow(ContractGapError);

    // 5. Customer media unsupported actions (avatar upload, file deletion)
    expect(customerMediaService.uploadCustomerAvatarUnsupported(new File([], "avatar.jpg"))).rejects.toThrow(ContractGapError);
    expect(customerMediaService.deleteCustomerFileUnsupported("file-1")).rejects.toThrow(ContractGapError);

    // 6. Bulk mark notifications as read
    expect(() => customerNotificationService.markAllAsRead()).toThrow(ContractGapError);

    // 7. Server-side filter unsupported query
    expect(() => gamecentersPageService.serverFilterUnsupported()).toThrow(ContractGapError);

    // Ensure zero fetch calls were made for contract gap operations
    expect(requests.length).toBe(0);
  });
});
