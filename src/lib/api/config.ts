
/**
 * API & Environment Configuration
 * Central source of truth for API URLs and token storage keys.
 */

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

const DEFAULT_DEV_API_URL =
  "https://api.sayra-booking.ir/api/v1/";

const DEFAULT_PROD_API_URL =
  "https://api.sayra-booking.ir/api/v1/";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_PRODUCTION ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL)
).replace(/\/+$/, "");

/**
 * Blog Platform API
 *
 * This backend has an independent authentication lifecycle.
 * BLOG_API_BASE_URL includes the /api prefix.
 */
const DEFAULT_BLOG_API_URL =
  "https://blog.sayra-booking.ir/api/";

export const BLOG_API_BASE_URL = (
  process.env.NEXT_PUBLIC_BLOG_API_BASE_URL ||
  DEFAULT_BLOG_API_URL
).replace(/\/+$/, "");

export const APP_TIME_ZONE =
  process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Asia/Tehran";

/**
 * Mock Mode Configuration
 */
function getIsMockEnabled(): boolean {
  const allowMockInProd =
    process.env.NEXT_PUBLIC_ALLOW_MOCK_IN_PROD === "true";

  const explicitMock =
    process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
    process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "true";

  if (IS_PRODUCTION) {
    return allowMockInProd && explicitMock;
  }

  if (
    process.env.NEXT_PUBLIC_USE_MOCK === "false" ||
    process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "false"
  ) {
    return false;
  }

  return explicitMock;
}

export const USE_MOCK_DATA = getIsMockEnabled();
export const USE_MOCK_RESERVATIONS = USE_MOCK_DATA;

/**
 * Main Platform Token Storage Keys
 */
export const ACCESS_TOKEN_KEY = "sayra_access_token";
export const REFRESH_TOKEN_KEY = "sayra_refresh_token";
export const AUTH_USER_KEY = "sayra_user_auth";

/**
 * Blog Platform Token Storage Keys
 *
 * These keys must never overlap with Platform Admin tokens.
 */
export const BLOG_ACCESS_TOKEN_KEY = "sayra_blog_access_token";
export const BLOG_REFRESH_TOKEN_KEY = "sayra_blog_refresh_token";
