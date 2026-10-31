import { describe, it, expect, beforeEach } from "bun:test";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  refreshAccessToken,
} from "./token";
import { AUTH_USER_KEY } from "./api/config";

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

describe("Token Management & Refresh Lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves access and refresh tokens", () => {
    setTokens({ accessToken: "access-123", refreshToken: "refresh-456" });
    expect(getAccessToken()).toBe("access-123");
    expect(getRefreshToken()).toBe("refresh-456");
  });

  it("clears all authentication tokens on clearTokens()", () => {
    setTokens({ accessToken: "access-123", refreshToken: "refresh-456" });
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ fullName: "علی" }));

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it("prevents multiple concurrent refresh calls and shares single in-flight promise", async () => {
    setTokens({ accessToken: "old-access", refreshToken: "valid-refresh" });

    let callCount = 0;
    const mockRefreshCall = async (token: string) => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { accessToken: "new-access-" + token };
    };

    const [res1, res2, res3] = await Promise.all([
      refreshAccessToken(mockRefreshCall),
      refreshAccessToken(mockRefreshCall),
      refreshAccessToken(mockRefreshCall),
    ]);

    expect(callCount).toBe(1);
    expect(res1).toBe("new-access-valid-refresh");
    expect(res2).toBe("new-access-valid-refresh");
    expect(res3).toBe("new-access-valid-refresh");
    expect(getAccessToken()).toBe("new-access-valid-refresh");
  });

  it("clears tokens when refresh fails", async () => {
    setTokens({ accessToken: "old-access", refreshToken: "invalid-refresh" });

    const failedRefreshCall = async () => {
      throw new Error("Invalid refresh token");
    };

    const result = await refreshAccessToken(failedRefreshCall);
    expect(result).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
