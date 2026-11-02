import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  customerMediaService,
  validateCustomerFile,
  CUSTOMER_ATTACHMENT_MAX_SIZE_BYTES,
  DEFAULT_ALLOWED_ATTACHMENT_TYPES,
} from "./customerMediaService";
import { customerTicketService } from "./customerTicketService";
import { ContractGapError } from "@/types/customerApi";
import { ApiError } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/token";

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

describe("Phase 20: Customer Media and File Operations", () => {
  const originalFetch = globalThis.fetch;
  let requests: { url: string; method: string; headers: Headers; body?: any }[] = [];

  function setupMockFetch(
    responder: (url: string, init?: RequestInit) => Response | Promise<Response>
  ) {
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      requests.push({
        url,
        method: init?.method || "GET",
        headers,
        body: init?.body,
      });
      return responder(url, init);
    }) as unknown as typeof fetch;
  }

  beforeEach(() => {
    clearTokens();
    storage.clear();
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    storage.clear();
  });

  describe("1. Documented Ticket Attachment Upload (/tickets/{ticketId}/attachments)", () => {
    it("uploads file using multipart/form-data with binary field 'file' and Bearer token", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      setupMockFetch((url, init) => {
        expect(url).toContain("/tickets/ticket-42/attachments");
        expect(init?.method).toBe("POST");
        const body = init?.body as FormData;
        expect(body instanceof FormData).toBe(true);
        expect(body.get("file")).toBeDefined();

        return new Response(
          JSON.stringify({
            success: true,
            data: { url: "https://storage.sayra.ir/tickets/ticket-42/attachment.png" },
          }),
          { status: 200 }
        );
      });

      const dummyFile = new File(["dummy attachment content"], "screenshot.png", {
        type: "image/png",
      });

      const returnedUrl = await customerMediaService.uploadTicketAttachment("ticket-42", dummyFile);

      expect(returnedUrl).toBe("https://storage.sayra.ir/tickets/ticket-42/attachment.png");
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("POST");
      expect(requests[0].headers.get("Authorization")).toBe("Bearer customer-jwt-token");
    });

    it("unwraps different valid backend response shapes containing URL", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      // Direct { url: string }
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({ success: true, url: "https://storage.sayra.ir/direct.jpg" }),
          { status: 200 }
        );
      });
      const file = new File(["test"], "direct.jpg", { type: "image/jpeg" });
      const res1 = await customerMediaService.uploadTicketAttachment("tick-1", file);
      expect(res1).toBe("https://storage.sayra.ir/direct.jpg");

      // Nested { data: "stringUrl" }
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({ success: true, data: "https://storage.sayra.ir/raw-data.jpg" }),
          { status: 200 }
        );
      });
      const res2 = await customerMediaService.uploadTicketAttachment("tick-2", file);
      expect(res2).toBe("https://storage.sayra.ir/raw-data.jpg");

      // Nested { attachment: string }
      setupMockFetch(() => {
        return new Response(
          JSON.stringify({ success: true, attachment: "https://storage.sayra.ir/attachment.pdf" }),
          { status: 200 }
        );
      });
      const pdf = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
      const res3 = await customerMediaService.uploadTicketAttachment("tick-3", pdf);
      expect(res3).toBe("https://storage.sayra.ir/attachment.pdf");
    });

    it("throws clear error when backend response omits attachment URL", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({ success: true, data: {} }),
          { status: 200 }
        );
      });

      const file = new File(["test"], "doc.png", { type: "image/png" });
      await expect(
        customerMediaService.uploadTicketAttachment("tick-1", file)
      ).rejects.toThrow("آدرس فایل پیوست در پاسخ سرور یافت نشد.");
    });

    it("updates customerTicketService.uploadAttachment seamlessly", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      setupMockFetch((url) => {
        expect(url).toContain("/tickets/ticket-999/attachments");
        return new Response(
          JSON.stringify({
            success: true,
            data: { url: "https://storage.sayra.ir/ticket-service.png" },
          }),
          { status: 200 }
        );
      });

      const file = new File(["test"], "service.png", { type: "image/png" });
      const res = await customerTicketService.uploadAttachment("ticket-999", file);
      expect(res).toBe("https://storage.sayra.ir/ticket-service.png");
    });
  });

  describe("2. Client Validation (File Type, Size Limits & Missing Parameters)", () => {
    it("validates that a file is provided before dispatch", async () => {
      // @ts-expect-error test missing file
      expect(() => validateCustomerFile(null)).toThrow("فایلی برای آپلود انتخاب نشده است.");

      await expect(
        customerMediaService.uploadTicketAttachment("", new File([""], "empty.png", { type: "image/png" }))
      ).rejects.toThrow("شناسه تیکت نامعتبر است.");
    });

    it("rejects files exceeding size limit without triggering network request", async () => {
      const largeContent = new Uint8Array(CUSTOMER_ATTACHMENT_MAX_SIZE_BYTES + 1024);
      const largeFile = new File([largeContent], "huge.png", { type: "image/png" });

      setupMockFetch(() => {
        throw new Error("Network should not be called for oversized file");
      });

      expect(() => validateCustomerFile(largeFile)).toThrow("حجم فایل نباید بیشتر از 10 مگابایت باشد.");

      await expect(
        customerMediaService.uploadTicketAttachment("ticket-1", largeFile)
      ).rejects.toThrow("حجم فایل نباید بیشتر از 10 مگابایت باشد.");

      expect(requests.length).toBe(0);
    });

    it("rejects unsupported file MIME types without dispatching network request", async () => {
      const exeFile = new File(["malicious"], "malware.exe", { type: "application/x-msdownload" });

      setupMockFetch(() => {
        throw new Error("Network should not be called for forbidden mime type");
      });

      expect(() => validateCustomerFile(exeFile)).toThrow("فرمت فایل انتخابی مجاز نمی‌باشد.");

      await expect(
        customerMediaService.uploadTicketAttachment("ticket-1", exeFile)
      ).rejects.toThrow("فرمت فایل انتخابی مجاز نمی‌باشد.");

      expect(requests.length).toBe(0);
    });

    it("accepts all documented allowed types (images, pdf, text)", () => {
      for (const t of DEFAULT_ALLOWED_ATTACHMENT_TYPES) {
        const validFile = new File(["content"], "file", { type: t });
        expect(() => validateCustomerFile(validFile)).not.toThrow();
      }
    });
  });

  describe("3. Documented Public Media Retrieval (/public/gamingCenters/{slug}/media)", () => {
    it("retrieves public media items for gaming center", async () => {
      setupMockFetch((url) => {
        expect(url).toContain("/public/gamingCenters/tehran-gaming/media");
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: "m-1", url: "https://sayra.ir/img1.webp", purpose: "COVER", altText: "نمای اصلی" },
              { id: "m-2", url: "https://sayra.ir/img2.webp", purpose: "GALLERY", altText: "سالن VIP" },
            ],
          }),
          { status: 200 }
        );
      });

      const media = await customerMediaService.getPublicMedia("tehran-gaming");
      expect(media.length).toBe(2);
      expect(media[0].id).toBe("m-1");
      expect(media[0].purpose).toBe("COVER");
      expect(media[1].altText).toBe("سالن VIP");
    });

    it("handles empty slug or raw array responses safely", async () => {
      expect(await customerMediaService.getPublicMedia("")).toEqual([]);

      setupMockFetch(() => {
        return new Response(
          JSON.stringify([
            { id: "m-9", url: "https://sayra.ir/raw.webp" },
          ]),
          { status: 200 }
        );
      });

      const rawMedia = await customerMediaService.getPublicMedia("slug-raw");
      expect(rawMedia.length).toBe(1);
      expect(rawMedia[0].id).toBe("m-9");
    });
  });

  describe("4. Error Recovery, Network Resilience & Authorization", () => {
    it("propagates 401 Unauthorized with token refresh attempt", async () => {
      setTokens({ accessToken: "expired-token", refreshToken: "valid-refresh" });

      let callCount = 0;
      setupMockFetch((url) => {
        if (url.includes("/auth/refresh")) {
          return new Response(
            JSON.stringify({ success: true, data: { accessToken: "new-token", refreshToken: "new-refresh" } }),
            { status: 200 }
          );
        }
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED" } }), { status: 401 });
        }
        return new Response(
          JSON.stringify({ success: true, data: { url: "https://storage.sayra.ir/refreshed.png" } }),
          { status: 200 }
        );
      });

      const dummyFile = new File(["test"], "test.png", { type: "image/png" });
      const url = await customerMediaService.uploadTicketAttachment("tick-auth", dummyFile);
      expect(url).toBe("https://storage.sayra.ir/refreshed.png");
    });

    it("propagates 500 server error without synthesizing fake URLs", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      setupMockFetch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "خطا در ذخیره‌سازی فایل در استوریج سرور." },
          }),
          { status: 500 }
        );
      });

      const dummyFile = new File(["test"], "fail.png", { type: "image/png" });
      await expect(
        customerMediaService.uploadTicketAttachment("tick-err", dummyFile)
      ).rejects.toThrow(ApiError);
    });

    it("propagates network failure cleanly without fallback", async () => {
      setTokens({ accessToken: "customer-jwt-token" });

      setupMockFetch(() => {
        return Promise.reject(new TypeError("Network connection failed"));
      });

      const dummyFile = new File(["test"], "net-fail.png", { type: "image/png" });
      await expect(
        customerMediaService.uploadTicketAttachment("tick-net", dummyFile)
      ).rejects.toThrow();
    });
  });

  describe("5. Contract Gap Enforcement (Unsupported Customer Media Operations)", () => {
    it("throws ContractGapError for customer file deletion (DELETE is not defined in OpenAPI)", async () => {
      await expect(
        customerMediaService.deleteCustomerFileUnsupported("att-123")
      ).rejects.toThrow(ContractGapError);

      try {
        await customerMediaService.deleteCustomerFileUnsupported("att-123");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerFileDelete");
      }
    });

    it("throws ContractGapError for customer avatar upload (POST /customer/me/avatar not defined)", async () => {
      const avatarFile = new File(["avatar"], "avatar.png", { type: "image/png" });

      await expect(
        customerMediaService.uploadCustomerAvatarUnsupported(avatarFile)
      ).rejects.toThrow(ContractGapError);

      try {
        await customerMediaService.uploadCustomerAvatarUnsupported(avatarFile);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerAvatarUpload");
      }
    });

    it("throws ContractGapError for reservation media attachments", async () => {
      const docFile = new File(["doc"], "doc.pdf", { type: "application/pdf" });

      await expect(
        customerMediaService.attachReservationMediaUnsupported("res-1", docFile)
      ).rejects.toThrow(ContractGapError);

      try {
        await customerMediaService.attachReservationMediaUnsupported("res-1", docFile);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReservationMedia");
      }
    });

    it("throws ContractGapError for review/rating media attachments", async () => {
      const photoFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

      await expect(
        customerMediaService.attachReviewMediaUnsupported("res-1", photoFile)
      ).rejects.toThrow(ContractGapError);

      try {
        await customerMediaService.attachReviewMediaUnsupported("res-1", photoFile);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReviewMedia");
      }
    });
  });
});
