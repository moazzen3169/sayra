import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { customerNotificationService } from "./customerNotificationService";
import { setTokens, clearTokens } from "@/lib/token";
import { ContractGapError } from "@/types/customerApi";
import { formatRelativeNotificationTime } from "@/lib/dates";

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

describe("Phase 19: Customer Notifications and Messages", () => {
  const originalFetch = globalThis.fetch;
  let requests: { url: string; method: string; headers: Headers; body?: string }[] = [];

  function setupMockFetch(
    responder: (url: string, init?: RequestInit) => Response | Promise<Response>
  ) {
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      let body: string | undefined;
      if (typeof init?.body === "string") {
        body = init.body;
      }
      requests.push({
        url,
        method: init?.method || "GET",
        headers,
        body,
      });
      return responder(url, init);
    }) as unknown as typeof fetch;
  }

  beforeEach(() => {
    requests = [];
    storage.clear();
    clearTokens();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    storage.clear();
    clearTokens();
  });

  describe("1. Notification Listing & Filtering via GET /notifications", () => {
    it("fetches notifications attaching Bearer token and parses array payload", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch((url) => {
        expect(url).toContain("/notifications");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "notif-1",
                userId: "user-1",
                type: "RESERVATION_CONFIRMED",
                title: "رزرو تایید شد",
                message: "رزرو شما در گیم‌نت با موفقیت تایید شد.",
                isRead: false,
                createdAt: "2026-11-02T10:00:00.000Z",
              },
            ],
          }),
          { status: 200 }
        );
      });

      const list = await customerNotificationService.listNotifications({ page: 1, pageSize: 10 });
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("GET");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-valid-jwt");
      expect(requests[0].url).toContain("page=1");
      expect(requests[0].url).toContain("pageSize=10");

      expect(list.length).toBe(1);
      expect(list[0].id).toBe("notif-1");
      expect(list[0].type).toBe("RESERVATION_CONFIRMED");
      expect(list[0].isRead).toBe(false);
    });

    it("filters notifications by read status via isRead query param", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch((url) => {
        expect(url).toContain("isRead=false");
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200 }
        );
      });

      const list = await customerNotificationService.listNotifications({ isRead: false });
      expect(list).toEqual([]);
      expect(requests[0].url).toContain("isRead=false");
    });

    it("handles raw array responses seamlessly", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch(() => {
        return new Response(
          JSON.stringify([
            {
              id: "notif-2",
              userId: "user-1",
              type: "RESERVATION_CREATED",
              title: "رزرو ثبت شد",
              message: "رزرو با موفقیت ایجاد شد.",
              isRead: true,
              createdAt: "2026-11-02T09:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      });

      const list = await customerNotificationService.listNotifications();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("notif-2");
    });

    it("returns empty array for empty results without fabricating fake items", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch(() => {
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      });

      const list = await customerNotificationService.listNotifications();
      expect(list).toEqual([]);
    });

    it("supports paginated list envelope parsing via listPaginated", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "notif-1",
                userId: "user-1",
                type: "RESERVATION_TIME_PROPOSED",
                title: "پیشنهاد زمان جدید",
                message: "مرکز بازی زمان جدیدی پیشنهاد داده است.",
                isRead: false,
                createdAt: "2026-11-02T11:00:00.000Z",
              },
            ],
            meta: {
              pagination: {
                total: 25,
                page: 2,
                pageSize: 10,
                totalPages: 3,
              },
            },
          }),
          { status: 200 }
        );
      });

      const result = await customerNotificationService.listPaginated({ page: 2, pageSize: 10 });
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });

  describe("2. Unread Count via GET /notifications/unread-count", () => {
    it("fetches unread count and parses number from { count } response", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch((url) => {
        expect(url).toContain("/notifications/unread-count");
        return new Response(JSON.stringify({ success: true, data: { count: 3 } }), { status: 200 });
      });

      const count = await customerNotificationService.getUnreadCount();
      expect(count).toBe(3);
      expect(requests[0].method).toBe("GET");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-valid-jwt");
    });

    it("handles raw number or alternative count keys safely", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch(() => {
        return new Response(JSON.stringify({ success: true, data: { unreadCount: 5 } }), {
          status: 200,
        });
      });

      const count = await customerNotificationService.getUnreadCount();
      expect(count).toBe(5);
    });

    it("returns 0 when count is missing or 0", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch(() => {
        return new Response(JSON.stringify({ success: true, data: { count: 0 } }), { status: 200 });
      });

      const count = await customerNotificationService.getUnreadCount();
      expect(count).toBe(0);
    });
  });

  describe("3. Mark Notification as Read via PATCH /notifications/{id}/read", () => {
    it("marks single notification as read with correct URL and PATCH method", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch((url) => {
        expect(url).toContain("/notifications/notif-abc-123/read");
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await customerNotificationService.markAsRead("notif-abc-123");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("PATCH");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-valid-jwt");
    });

    it("validates notification ID before dispatching request", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      expect(customerNotificationService.markAsRead("")).rejects.toThrow("شناسه اعلان نامعتبر است.");
    });
  });

  describe("4. Contract Gap Operations & Explicit Error Enforcement", () => {
    it("throws ContractGapError for bulk mark-all-read", async () => {
      expect(customerNotificationService.markAllAsRead()).rejects.toThrow(ContractGapError);
      expect(customerNotificationService.markAllAsRead()).rejects.toThrow(
        "Bulk marking all notifications as read is not supported in OpenAPI v1.0-LOCKED"
      );
    });

    it("throws ContractGapError for notification deletion", async () => {
      expect(customerNotificationService.deleteNotification("notif-1")).rejects.toThrow(
        ContractGapError
      );
      expect(customerNotificationService.deleteNotification("notif-1")).rejects.toThrow(
        "Notification deletion is not supported in OpenAPI v1.0-LOCKED."
      );
    });

    it("throws ContractGapError for direct customer-to-center messaging inbox", async () => {
      expect(
        customerNotificationService.sendDirectMessage("recipient-1", "سلام")
      ).rejects.toThrow(ContractGapError);
      expect(
        customerNotificationService.sendDirectMessage("recipient-1", "سلام")
      ).rejects.toThrow(
        "Direct messaging inbox is not supported in OpenAPI v1.0-LOCKED. Customer support communication is handled exclusively via /tickets."
      );
    });

    it("ensures no fetch requests are made when invoking contract gap operations", async () => {
      try {
        await customerNotificationService.markAllAsRead();
      } catch {
        // Expected
      }
      try {
        await customerNotificationService.deleteNotification("notif-1");
      } catch {
        // Expected
      }
      try {
        await customerNotificationService.sendDirectMessage("user-1", "پیام");
      } catch {
        // Expected
      }
      expect(requests.length).toBe(0);
    });
  });

  describe("5. Error Handling & Authorization Scoping", () => {
    it("propagates 401 Unauthorized errors without silent fallback to mock notifications", async () => {
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            statusCode: 401,
            message: "Unauthorized",
            error: "UNAUTHORIZED",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      });

      expect(customerNotificationService.listNotifications()).rejects.toThrow();
    });

    it("propagates 500 Server Error without fabricating synthetic notifications", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            statusCode: 500,
            message: "Internal server error",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      });

      expect(customerNotificationService.listNotifications()).rejects.toThrow();
    });

    it("propagates network failures cleanly", async () => {
      setTokens({ accessToken: "customer-valid-jwt" });
      globalThis.fetch = (() => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch;

      expect(customerNotificationService.listNotifications()).rejects.toThrow();
    });
  });

  describe("6. Localized Relative Notification Time Formatting", () => {
    it("formats recent timestamps to Persian relative text", () => {
      const now = new Date();
      const justNowIso = new Date(now.getTime() - 20 * 1000).toISOString();
      expect(formatRelativeNotificationTime(justNowIso)).toBe("هم‌اکنون");

      const tenMinutesAgoIso = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      expect(formatRelativeNotificationTime(tenMinutesAgoIso)).toContain("دقیقه پیش");

      const twoHoursAgoIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeNotificationTime(twoHoursAgoIso)).toContain("ساعت پیش");

      const yesterdayIso = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeNotificationTime(yesterdayIso)).toBe("دیروز");
    });

    it("handles invalid or empty timestamp gracefully", () => {
      expect(formatRelativeNotificationTime("")).toBe("");
      expect(formatRelativeNotificationTime(undefined)).toBe("");
      expect(formatRelativeNotificationTime("invalid-date-string")).toBe("");
    });
  });
});
