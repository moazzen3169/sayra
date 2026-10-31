import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY } from "./api/config";

/**
 * Token manager for client-side storage and session lifecycle.
 */

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(tokens: { accessToken: string; refreshToken?: string | null }): void {
  if (typeof window === "undefined") return;
  try {
    if (tokens.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Mutex token refresh flow according to OpenAPI /auth/refresh contract:
 * POST /auth/refresh
 * Request: { refreshToken: string }
 * Response: { success: true, data: { accessToken: string } }
 *
 * Avoids concurrent refresh requests by sharing the pending promise.
 * Clears sessions when refresh fails.
 */
export async function refreshAccessToken(
  refreshCall: (refreshToken: string) => Promise<{ accessToken: string } | null>
): Promise<string | null> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    clearTokens();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const result = await refreshCall(currentRefreshToken);
      if (result?.accessToken) {
        setTokens({ accessToken: result.accessToken });
        return result.accessToken;
      }
      clearTokens();
      return null;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
