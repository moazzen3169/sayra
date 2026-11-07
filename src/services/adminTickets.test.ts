import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { adminService } from "./adminService";
import { apiClient } from "@/lib/api/client";

describe("adminService ticket API operations", () => {
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPatch = apiClient.patch;

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.patch = originalPatch;
  });

  it("fetches tickets list using GET /admin/tickets without mock data", async () => {
    let capturedPath = "";
    apiClient.get = mock(async (path: string) => {
      capturedPath = path;
      return {
        data: {
          success: true,
          data: [
            {
              id: "t-admin-1",
              customerAccountId: "cust-1",
              subject: "مشکل در پرداخت",
              status: "OPEN",
              priority: "HIGH",
              category: "FINANCIAL",
              createdAt: "2026-04-01T12:00:00Z",
              updatedAt: "2026-04-01T12:30:00Z",
              messages: [],
            },
          ],
        },
      };
    }) as any;

    const result = await adminService.getTickets();
    expect(capturedPath).toBe("/admin/tickets");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("t-admin-1");
    expect(result.items[0].subject).toBe("مشکل در پرداخت");
    expect(result.items[0].status).toBe("OPEN");
    expect(result.items[0].priority).toBe("HIGH");
  });

  it("falls back to GET /support/tickets when /admin/tickets returns 403 or 404", async () => {
    let calledPaths: string[] = [];
    apiClient.get = mock(async (path: string) => {
      calledPaths.push(path);
      if (path === "/admin/tickets") {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
      }
      if (path === "/support/tickets") {
        return {
          data: {
            data: [
              {
                id: "t-support-1",
                subject: "درخواست بررسی رزرو",
                status: "PENDING",
              },
            ],
          },
        };
      }
      return { data: [] };
    }) as any;

    const result = await adminService.getTickets();
    expect(calledPaths).toContain("/admin/tickets");
    expect(calledPaths).toContain("/support/tickets");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("t-support-1");
  });

  it("propagates API errors when fetching ticket list fails", async () => {
    apiClient.get = mock(async () => {
      const err: any = new Error("خطای سرور ۵۰۰");
      err.status = 500;
      throw err;
    }) as any;

    await expect(adminService.getTickets()).rejects.toThrow("خطای سرور ۵۰۰");
  });

  it("fetches ticket details via GET /support/tickets/{ticketId}", async () => {
    let capturedPath = "";
    apiClient.get = mock(async (path: string) => {
      capturedPath = path;
      return {
        data: {
          success: true,
          data: {
            id: "t-admin-2",
            subject: "خرابی کنترلر",
            status: "OPEN",
            messages: [
              {
                id: "m-1",
                ticketId: "t-admin-2",
                senderType: "USER",
                text: "دسته شماره ۲ وصل نمی‌شود",
                createdAt: "2026-04-01T10:00:00Z",
              },
            ],
          },
        },
      };
    }) as any;

    const ticket = await adminService.getTicketById("t-admin-2");
    expect(capturedPath).toBe("/support/tickets/t-admin-2");
    expect(ticket).not.toBeNull();
    expect(ticket?.id).toBe("t-admin-2");
    expect(ticket?.subject).toBe("خرابی کنترلر");
    expect(ticket?.messages).toHaveLength(1);
    expect(ticket?.messages?.[0].message).toBe("دسته شماره ۲ وصل نمی‌شود");
  });

  it("sends ticket message using POST /support/tickets/{ticketId}/messages", async () => {
    let capturedPath = "";
    let capturedBody: any = null;

    apiClient.post = mock(async (path: string, body: any) => {
      capturedPath = path;
      capturedBody = body;
      return { data: { success: true } };
    }) as any;

    apiClient.get = mock(async () => {
      return {
        data: {
          data: {
            id: "t-admin-3",
            subject: "پاسخ پشتیبانی",
            status: "ANSWERED",
            messages: [{ id: "m-resp", text: "کنترلر بررسی و تعویض شد" }],
          },
        },
      };
    }) as any;

    const updated = await adminService.replyToTicket("t-admin-3", "کنترلر بررسی و تعویض شد");
    expect(capturedPath).toBe("/support/tickets/t-admin-3/messages");
    expect(capturedBody).toEqual({ text: "کنترلر بررسی و تعویض شد" });
    expect(updated.id).toBe("t-admin-3");
    expect(updated.status).toBe("ANSWERED");
  });

  it("updates ticket status using PATCH /admin/tickets/{ticketId}/status", async () => {
    let capturedPath = "";
    let capturedBody: any = null;

    apiClient.patch = mock(async (path: string, body: any) => {
      capturedPath = path;
      capturedBody = body;
      return { data: { success: true } };
    }) as any;

    apiClient.get = mock(async () => {
      return {
        data: {
          data: {
            id: "t-admin-4",
            subject: "تست وضعیت",
            status: "CLOSED",
          },
        },
      };
    }) as any;

    const updated = await adminService.updateTicketStatus("t-admin-4", "CLOSED");
    expect(capturedPath).toBe("/admin/tickets/t-admin-4/status");
    expect(capturedBody).toEqual({ status: "CLOSED" });
    expect(updated.status).toBe("CLOSED");
  });

  it("assigns ticket using PATCH /admin/tickets/{ticketId}/assign", async () => {
    let capturedPath = "";
    let capturedBody: any = null;

    apiClient.patch = mock(async (path: string, body: any) => {
      capturedPath = path;
      capturedBody = body;
      return { data: { success: true } };
    }) as any;

    apiClient.get = mock(async () => {
      return {
        data: {
          data: {
            id: "t-admin-5",
            subject: "تست ارجاع",
            assignedToUserId: "admin-user-77",
          },
        },
      };
    }) as any;

    const updated = await adminService.assignTicket("t-admin-5", "admin-user-77");
    expect(capturedPath).toBe("/admin/tickets/t-admin-5/assign");
    expect(capturedBody).toEqual({ assignedToUserId: "admin-user-77" });
    expect(updated.assignedAdminId).toBe("admin-user-77");
  });
});
