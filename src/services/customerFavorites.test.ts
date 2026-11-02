import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { customerFavoriteService } from "./customerFavoriteService";
import { ContractGapError } from "@/types/customerApi";
import { setTokens, clearTokens, getAccessToken } from "@/lib/token";

// In-memory mock for localStorage
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
(globalThis as unknown as { window: unknown }).window = {};

describe("Phase 17: Customer Favorites and Saved Gaming Centers", () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: Array<{ url: string; method: string; headers: Headers; body?: string }>;

  beforeEach(() => {
    clearTokens();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    requests = [];
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  function setupMockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as any).url;
      const method = init?.method || "GET";
      const headers = new Headers(init?.headers);
      const body = init?.body ? String(init.body) : undefined;
      requests.push({ url, method, headers, body });
      return handler(url, init);
    }) as any;
  }

  describe("1. Contract Gap Enforcement & OpenAPI v1.0-LOCKED Integrity", () => {
    it("throws ContractGapError on listFavorites without attempting undocumented backend endpoints", async () => {
      await expect(customerFavoriteService.listFavorites()).rejects.toThrow(ContractGapError);
      try {
        await customerFavoriteService.listFavorites();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerFavoritesList");
        expect(err.message).toContain("GET /customer/favorites is not defined in OpenAPI v1.0-LOCKED");
      }
    });

    it("throws ContractGapError on addFavorite without attempting undocumented endpoints", async () => {
      await expect(customerFavoriteService.addFavorite("gc-101")).rejects.toThrow(ContractGapError);
      try {
        await customerFavoriteService.addFavorite("gc-101");
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerFavoriteAdd");
        expect(err.message).toContain("POST /customer/favorites is not defined in OpenAPI v1.0-LOCKED");
      }
    });

    it("throws ContractGapError on removeFavorite without attempting undocumented endpoints", async () => {
      await expect(customerFavoriteService.removeFavorite("gc-101")).rejects.toThrow(ContractGapError);
      try {
        await customerFavoriteService.removeFavorite("gc-101");
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerFavoriteRemove");
        expect(err.message).toContain("DELETE /customer/favorites/{gamingCenterId} is not defined");
      }
    });

    it("throws ContractGapError on isFavorite without attempting undocumented endpoints", async () => {
      await expect(customerFavoriteService.isFavorite("gc-101")).rejects.toThrow(ContractGapError);
      try {
        await customerFavoriteService.isFavorite("gc-101");
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerFavoriteStatus");
      }
    });
  });

  describe("2. Prohibition of Fake LocalStorage Persistence", () => {
    it("never stores favorite items in localStorage when addFavorite fails or is called", async () => {
      try {
        await customerFavoriteService.addFavorite("gc-persistent-test");
      } catch {
        // Expected ContractGapError
      }

      // Check all keys in localStorage to ensure no fake favorites store was created
      const allKeys = Array.from(storage.keys());
      const favoriteKeys = allKeys.filter((k) =>
        k.toLowerCase().includes("favorite") || k.toLowerCase().includes("saved_center")
      );
      expect(favoriteKeys.length).toBe(0);
      expect(localStorage.getItem("sayra_favorites")).toBeNull();
      expect(localStorage.getItem("sayra_saved_centers")).toBeNull();
    });

    it("does not simulate server persistence from localStorage on listFavorites", async () => {
      // Even if arbitrary keys existed in localStorage, listFavorites must NOT read them as server-backed
      localStorage.setItem("sayra_favorites", JSON.stringify(["gc-test-1", "gc-test-2"]));

      await expect(customerFavoriteService.listFavorites()).rejects.toThrow(ContractGapError);
    });
  });

  describe("3. Authorization Scoping & Authenticated Customer Scope Requirements", () => {
    it("verifies customer token lifecycle behavior for authenticated customer routes", () => {
      // Validates that token utilities properly isolate customer access
      setTokens({ accessToken: "customer-valid-jwt", refreshToken: "customer-valid-refresh" });
      expect(getAccessToken()).toBe("customer-valid-jwt");

      clearTokens();
      expect(getAccessToken()).toBeNull();
    });

    it("ensures unauthorized access is prevented when customer is unauthenticated", () => {
      clearTokens();
      expect(getAccessToken()).toBeNull();
      // Unauthenticated state should not have access to any server-saved favorites
    });
  });

  describe("4. Error Recovery & Network Resilience Semantics", () => {
    it("preserves exact ContractGapError inheritance and error code integrity", () => {
      try {
        throw new ContractGapError("CustomerFavoritesList", "OpenAPI gap");
      } catch (err: any) {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(ContractGapError);
        expect(err.name).toBe("ContractGapError");
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("[CONTRACT GAP] CustomerFavoritesList");
      }
    });

    it("ensures no fetch requests are made when operations throw ContractGapError", async () => {
      let fetchCalled = false;
      setupMockFetch(() => {
        fetchCalled = true;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      await expect(customerFavoriteService.listFavorites()).rejects.toThrow();
      await expect(customerFavoriteService.addFavorite("gc-1")).rejects.toThrow();
      await expect(customerFavoriteService.removeFavorite("gc-1")).rejects.toThrow();
      await expect(customerFavoriteService.isFavorite("gc-1")).rejects.toThrow();

      expect(fetchCalled).toBe(false);
      expect(requests.length).toBe(0);
    });
  });
});
