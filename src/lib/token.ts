import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY } from "./api/config";

/**
 * Token manager for client-side storage and session lifecycle.
 * Persists tokens in localStorage as well as persistent Cookies (30 days)
 * to ensure auth survives page refreshes and long sessions.
 */

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

const COOKIE_MAX_AGE_DAYS = 30;

function setCookie(name: string, value: string, days: number = COOKIE_MAX_AGE_DAYS): void {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(prefix));
    return match ? decodeURIComponent(match.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (fromStorage) return fromStorage;
    const fromCookie = getCookie(ACCESS_TOKEN_KEY);
    if (fromCookie) {
      localStorage.setItem(ACCESS_TOKEN_KEY, fromCookie);
      return fromCookie;
    }
  } catch {
    return getCookie(ACCESS_TOKEN_KEY);
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (fromStorage) return fromStorage;
    const fromCookie = getCookie(REFRESH_TOKEN_KEY);
    if (fromCookie) {
      localStorage.setItem(REFRESH_TOKEN_KEY, fromCookie);
      return fromCookie;
    }
  } catch {
    return getCookie(REFRESH_TOKEN_KEY);
  }
  return null;
}

export type SetTokensParam =
  | { accessToken: string; refreshToken?: string | null }
  | string;

export function setTokens(
  tokensOrAccessToken: SetTokensParam,
  optionalRefreshToken?: string | null
): void {
  if (typeof window === "undefined") return;

  let accessToken = "";
  let refreshToken: string | null | undefined = undefined;

  if (typeof tokensOrAccessToken === "string") {
    accessToken = tokensOrAccessToken;
    refreshToken = optionalRefreshToken;
  } else if (tokensOrAccessToken && typeof tokensOrAccessToken === "object") {
    accessToken = tokensOrAccessToken.accessToken;
    refreshToken = tokensOrAccessToken.refreshToken;
  }

  try {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      setCookie(ACCESS_TOKEN_KEY, accessToken, COOKIE_MAX_AGE_DAYS);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      setCookie(REFRESH_TOKEN_KEY, refreshToken, COOKIE_MAX_AGE_DAYS);
    }
  } catch {
    if (accessToken) setCookie(ACCESS_TOKEN_KEY, accessToken, COOKIE_MAX_AGE_DAYS);
    if (refreshToken) setCookie(REFRESH_TOKEN_KEY, refreshToken, COOKIE_MAX_AGE_DAYS);
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
  removeCookie(ACCESS_TOKEN_KEY);
  removeCookie(REFRESH_TOKEN_KEY);
  removeCookie(AUTH_USER_KEY);
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
