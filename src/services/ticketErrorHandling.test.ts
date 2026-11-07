import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "@/services/ownerService";
import { customerTicketService } from "@/services/customerTicketService";
import { getErrorMessage } from "@/lib/reservationUi";
import { ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";

describe("Support Ticket Creation & Error Handling (DB_REQUEST_FAILED / P2003 Investigation)", () => {
  const originalFetch = globalThis.fetch;
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, String(v)),
    removeItem: (k: string) => storage.delete(k),
    clear: () => storage.clear(),
  };

  beforeEach(() => {
    (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
    (globalThis as unknown as { window: unknown }).window = {};
    storage.clear();
    setTokens({ accessToken: "valid-test-access-token" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    storage.clear();
  });

  it("handles backend 400 Bad Request with DB_REQUEST_FAILED and Prisma P2003 cleanly without leaking tokens or crashing", async () => {
    const errorPayload = {
      success: false,
      error: {
        code: "DB_REQUEST_FAILED",
        message: "Database request failed.",
        details: {
          prismaCode: "P2003",
          meta: {
            modelName: "Ticket",
            field_name: "Ticket_customerAccountId_fkey (index)",
          },
        },
      },
      meta: {
        requestId: "d4j5kdganblyn0exfhi3l3lx",
      },
    };

    let capturedUrl = "";
    let capturedHeaders: HeadersInit | undefined;
    let capturedBody = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedHeaders = init?.headers;
      capturedBody = init?.body ? init.body.toString() : "";

      return new Response(JSON.stringify(errorPayload), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    try {
      await ownerService.createTicket({
        subject: "موضوع تیکت",
        message: "متن پیام",
        category: "TECHNICAL",
      });
      expect(true).toBe(false); // Should not succeed
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe("DB_REQUEST_FAILED");
      expect(apiErr.message).toBe("Database request failed.");

      // Check user-facing error message mapping
      const userMessage = getErrorMessage(apiErr);
      expect(userMessage).toContain("خطای پایگاه داده");
      expect(userMessage).not.toContain("valid-test-access-token");
    }

    // Verify request payload strictly matched OpenAPI v1.0-LOCKED contract
    expect(capturedUrl).toContain("/tickets");
    const parsedBody = JSON.parse(capturedBody);
    expect(parsedBody).toEqual({
      subject: "موضوع تیکت",
      message: "متن پیام",
      category: "TECHNICAL",
    });
    // Ensure customerAccountId is NOT sent in client request body
    expect(parsedBody.customerAccountId).toBeUndefined();
    // Ensure Bearer token was attached
    const authHeader = (capturedHeaders as Record<string, string>)["Authorization"];
    expect(authHeader).toBe("Bearer valid-test-access-token");
  });

  it("verifies customerTicketService behaves identically when facing DB_REQUEST_FAILED", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DB_REQUEST_FAILED",
            message: "Database request failed.",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    try {
      await customerTicketService.createTicket({
        subject: "تست",
        message: "متن تست",
        category: "FINANCIAL",
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(getErrorMessage(err)).toBe(
        "خطای پایگاه داده در پردازش درخواست. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید."
      );
    }
  });

  it("maps INTERNAL_ERROR and APP_ERROR to friendly messages", () => {
    const internalErr = new ApiError(500, "INTERNAL_ERROR", "Internal server error");
    expect(getErrorMessage(internalErr)).toBe(
      "خطای داخلی سرور در پردازش درخواست. لطفاً دقایقی دیگر تلاش کنید."
    );

    const appErr = new ApiError(500, "APP_ERROR", "App error");
    expect(getErrorMessage(appErr)).toBe("خطایی در پردازش سامانه رخ داد. لطفاً مجدداً تلاش نمایید.");
  });
});
