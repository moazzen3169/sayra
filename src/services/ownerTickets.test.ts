import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { ownerService } from "./ownerService";
import { apiClient, ApiError } from "@/lib/api/client";

describe("ownerService.support ticket operations (Phase 7B)", () => {
  let originalGet: typeof apiClient.get;
  let originalPost: typeof apiClient.post;

  beforeEach(() => {
    originalGet = apiClient.get;
    originalPost = apiClient.post;
  });

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
  });

  it("fetches tickets list using GET /tickets without falling back to mock tickets", async () => {
    const mockTickets = [
      {
        id: "ticket-1",
        subject: "مشکل در ورود",
        category: "TECHNICAL",
        status: "OPEN",
        createdAt: "2026-04-01T12:00:00Z",
      },
    ];

    apiClient.get = mock(async (path: string) => {
      expect(path).toBe("/tickets");
      return { data: mockTickets };
    }) as any;

    const tickets = await ownerService.listTickets();
    expect(tickets).toHaveLength(1);
    expect(tickets[0].id).toBe("ticket-1");
    expect(tickets[0].subject).toBe("مشکل در ورود");
  });

  it("handles empty ticket list returning an empty array without mock tickets appearing", async () => {
    apiClient.get = mock(async (path: string) => {
      expect(path).toBe("/tickets");
      return { data: [] };
    }) as any;

    const tickets = await ownerService.listTickets();
    expect(tickets).toEqual([]);
    expect(tickets).toHaveLength(0);
  });

  it("propagates API errors when fetching tickets list", async () => {
    apiClient.get = mock(async () => {
      throw new ApiError(401, "UNAUTHORIZED", "نشست کاربری نامعتبر است.");
    }) as any;

    await expect(ownerService.listTickets()).rejects.toThrow("نشست کاربری نامعتبر است.");
  });

  it("fetches ticket detail using GET /tickets/{id} and unwraps data correctly", async () => {
    const mockDetail = {
      id: "ticket-42",
      subject: "بررسی تسویه حساب",
      category: "FINANCIAL",
      status: "ANSWERED",
      createdAt: "2026-04-01T10:00:00Z",
      messages: [
        {
          id: "msg-1",
          senderType: "USER",
          text: "درخواست تسویه",
          createdAt: "2026-04-01T10:05:00Z",
        },
      ],
    };

    apiClient.get = mock(async (path: string) => {
      expect(path).toBe("/tickets/ticket-42");
      return { data: { data: mockDetail } };
    }) as any;

    const ticket = await ownerService.getTicket("ticket-42");
    expect(ticket.id).toBe("ticket-42");
    expect(ticket.subject).toBe("بررسی تسویه حساب");
    expect(ticket.messages).toHaveLength(1);
    expect(ticket.messages?.[0].text).toBe("درخواست تسویه");
  });

  it("propagates 404 NOT_FOUND error when ticket is not found without fabricating details", async () => {
    apiClient.get = mock(async () => {
      throw new ApiError(404, "NOT_FOUND", "تیکت پیدا نشد.");
    }) as any;

    await expect(ownerService.getTicket("non-existent")).rejects.toThrow("تیکت پیدا نشد.");
  });

  it("creates a ticket via POST /tickets sending correct payload", async () => {
    let capturedBody: any;
    apiClient.post = mock(async (path: string, body: any) => {
      expect(path).toBe("/tickets");
      capturedBody = body;
      return { data: { success: true } };
    }) as any;

    await ownerService.createTicket({
      subject: "مشکل دستگاه واقعیت مجازی",
      message: "دستگاه شماره ۲ کار نمی‌کند",
      category: "TECHNICAL",
      priority: "HIGH",
    });

    expect(capturedBody).toEqual({
      subject: "مشکل دستگاه واقعیت مجازی",
      message: "دستگاه شماره ۲ کار نمی‌کند",
      category: "TECHNICAL",
      priority: "HIGH",
    });
  });

  it("sends ticket message via POST /tickets/{id}/messages", async () => {
    let capturedPath: string | undefined;
    let capturedBody: any;

    apiClient.post = mock(async (path: string, body: any) => {
      capturedPath = path;
      capturedBody = body;
      return { data: { success: true } };
    }) as any;

    await ownerService.sendTicketMessage("ticket-99", {
      text: "پاسخ من به پشتیبانی",
      attachment: "https://example.com/receipt.pdf",
    });

    expect(capturedPath).toBe("/tickets/ticket-99/messages");
    expect(capturedBody).toEqual({
      text: "پاسخ من به پشتیبانی",
      attachment: "https://example.com/receipt.pdf",
    });
  });

  it("uploads ticket attachment and returns actual returned URL", async () => {
    let capturedPath: string | undefined;
    let capturedFormData: FormData | undefined;

    apiClient.post = mock(async (path: string, body: any) => {
      capturedPath = path;
      capturedFormData = body;
      return {
        data: {
          url: "https://cdn.sayra.ir/attachments/ticket-99/log.txt",
        },
      };
    }) as any;

    const dummyFile = new File(["dummy content"], "log.txt", { type: "text/plain" });
    const url = await ownerService.uploadTicketAttachment("ticket-99", dummyFile);

    expect(capturedPath).toBe("/tickets/ticket-99/attachments");
    expect(capturedFormData).toBeInstanceOf(FormData);
    expect(capturedFormData?.get("file")).toBeDefined();
    expect(url).toBe("https://cdn.sayra.ir/attachments/ticket-99/log.txt");
  });

  it("extracts attachment URL when server wraps response in data.data.url", async () => {
    apiClient.post = mock(async () => {
      return {
        data: {
          data: {
            url: "https://cdn.sayra.ir/attachments/wrapped.png",
          },
        },
      };
    }) as any;

    const dummyFile = new File(["dummy"], "wrapped.png", { type: "image/png" });
    const url = await ownerService.uploadTicketAttachment("ticket-100", dummyFile);
    expect(url).toBe("https://cdn.sayra.ir/attachments/wrapped.png");
  });

  it("propagates upload failure error when attachment upload fails", async () => {
    apiClient.post = mock(async () => {
      throw new ApiError(500, "UPLOAD_FAILED", "خطا در آپلود فایل در سرور.");
    }) as any;

    const dummyFile = new File(["dummy"], "test.png", { type: "image/png" });
    await expect(ownerService.uploadTicketAttachment("ticket-100", dummyFile)).rejects.toThrow("خطا در آپلود فایل در سرور.");
  });
});
