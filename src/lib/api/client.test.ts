import { describe, it, expect, beforeEach } from "bun:test";
import { apiClient, ApiError, buildQueryString, buildUrl } from "./client";
import { setTokens } from "../token";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("API Client & Request Infrastructure", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds query strings correctly with primitives and arrays", () => {
    const qs = buildQueryString({
      search: "ps5",
      page: 1,
      isActive: true,
      tags: ["vip", "tehran"],
      empty: null,
      missing: undefined,
    });
    expect(qs).toBe("?search=ps5&page=1&isActive=true&tags=vip&tags=tehran");
  });

  it("builds URL with base URL and normalized paths", () => {
    const url = buildUrl("gamingCenters/test/discounts", { page: 1 });
    expect(url).toContain("/gamingCenters/test/discounts?page=1");
  });

  it("preserves structured backend error codes and messages", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "SLOT_NOT_AVAILABLE",
            message: "سانس انتخابی پر شده است.",
            details: { slotId: "slot-9" },
          },
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;

    try {
      await expect(apiClient.get("/test-endpoint")).rejects.toThrow();
      try {
        await apiClient.get("/test-endpoint");
      } catch (e) {
        expect(e instanceof ApiError).toBe(true);
        if (e instanceof ApiError) {
          expect(e.status).toBe(409);
          expect(e.code).toBe("SLOT_NOT_AVAILABLE");
          expect(e.message).toBe("سانس انتخابی پر شده است.");
          expect(e.details).toEqual({ slotId: "slot-9" });
        }
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles FormData requests without overriding multipart Content-Type", async () => {
    const originalFetch = globalThis.fetch;
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = (init?.headers || {}) as Record<string, string>;
      return new Response(
        JSON.stringify({
          success: true,
          data: { url: "https://example.com/uploaded.png" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;

    try {
      const formData = new FormData();
      formData.append("title", "test");
      const res = await apiClient.post<{ url: string }>("/test-upload", formData);
      expect(res.data.url).toBe("https://example.com/uploaded.png");
      expect(capturedHeaders["Content-Type"]).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles 401 unauthorized with successful refresh and retry once", async () => {
    const originalFetch = globalThis.fetch;
    setTokens({ accessToken: "initial-expired-token", refreshToken: "valid-refresh" });

    let requestCount = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: "fresh-access-token" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      requestCount++;
      if (requestCount === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token expired" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { result: "success after retry" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    try {
      const res = await apiClient.get<{ result: string }>("/protected-resource");
      expect(res.data.result).toBe("success after retry");
      expect(requestCount).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles request cancellation via AbortSignal", async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();

    globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise((_, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The user aborted a request.", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    try {
      const promise = apiClient.get("/aborted-endpoint", { signal: controller.signal });
      controller.abort();
      await expect(promise).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
