
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  AUTH_USER_KEY,
  BLOG_ACCESS_TOKEN_KEY,
  BLOG_REFRESH_TOKEN_KEY,
} from "./api/config";

/**
 * Main Platform and Blog token manager.
 *
 * Platform tokens and Blog tokens are stored independently.
 */

export interface TokenPair {
  accessToken: string;
  refreshToken?: string | null;
}

const COOKIE_MAX_AGE_DAYS = 30;

// ==================================================
// Shared Cookie Helpers - Platform only
// ==================================================

function setCookie(
  name: string,
  value: string,
  days: number = COOKIE_MAX_AGE_DAYS
): void {
  if (typeof document === "undefined") return;

  try {
    const expires = new Date(
      Date.now() + days * 864e5
    ).toUTCString();

    document.cookie =
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ` +
      `expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie errors.
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  try {
    const prefix = `${encodeURIComponent(name)}=`;

    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(prefix));

    return match
      ? decodeURIComponent(match.slice(prefix.length))
      : null;
  } catch {
    return null;
  }
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") return;

  try {
    document.cookie =
      `${encodeURIComponent(name)}=; ` +
      "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  } catch {
    // Ignore.
  }
}

// ==================================================
// Platform Tokens
// ==================================================

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
  | {
      accessToken: string;
      refreshToken?: string | null;
    }
  | string;

export function setTokens(
  tokensOrAccessToken: SetTokensParam,
  optionalRefreshToken?: string | null
): void {
  if (typeof window === "undefined") return;

  let accessToken = "";
  let refreshToken: string | null | undefined;

  if (typeof tokensOrAccessToken === "string") {
    accessToken = tokensOrAccessToken;
    refreshToken = optionalRefreshToken;
  } else {
    accessToken = tokensOrAccessToken.accessToken;
    refreshToken = tokensOrAccessToken.refreshToken;
  }

  try {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      setCookie(ACCESS_TOKEN_KEY, accessToken);
    }

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      setCookie(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    if (accessToken) {
      setCookie(ACCESS_TOKEN_KEY, accessToken);
    }

    if (refreshToken) {
      setCookie(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore storage errors.
  }

  removeCookie(ACCESS_TOKEN_KEY);
  removeCookie(REFRESH_TOKEN_KEY);
  removeCookie(AUTH_USER_KEY);
}

// ==================================================
// Blog Tokens - Completely separate from Platform
// ==================================================

export function getBlogAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(BLOG_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getBlogRefreshToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(BLOG_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setBlogTokens(tokens: TokenPair): void {
  if (typeof window === "undefined") return;

  try {
    if (tokens.accessToken) {
      localStorage.setItem(
        BLOG_ACCESS_TOKEN_KEY,
        tokens.accessToken
      );
    }

    if (tokens.refreshToken) {
      localStorage.setItem(
        BLOG_REFRESH_TOKEN_KEY,
        tokens.refreshToken
      );
    }
  } catch {
    throw new Error(
      "ذخیره توکن‌های وبلاگ در مرورگر امکان‌پذیر نیست."
    );
  }
}

export function clearBlogTokens(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(BLOG_ACCESS_TOKEN_KEY);
    localStorage.removeItem(BLOG_REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage errors.
  }
}

// ==================================================
// Platform Refresh Mutex
// ==================================================

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(
  refreshCall: (
    refreshToken: string
  ) => Promise<{ accessToken: string } | null>
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
        setTokens({
          accessToken: result.accessToken,
        });

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
