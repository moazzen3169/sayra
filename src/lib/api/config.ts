/**
 * API & Environment Configuration
 * Central source of truth for API base URL, timezone, mock flags, and token keys.
 */

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Determine API Base URL:
 * Priority:
 * 1. NEXT_PUBLIC_API_BASE_URL (explicit override)
 * 2. In browser when a proxy or custom origin is preferred, fallback to /api/v1 (or full URL)
 * 3. Default demo API URL
 */
const DEFAULT_DEV_API_URL = "http://87.248.156.152/api/v1";
const DEFAULT_PROD_API_URL = "http://87.248.156.152/api/v1";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_PRODUCTION ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL)
).replace(/\/+$/, "");

/**
 * Application Timezone.
 * Contract requires alignment with backend timezone (default: Asia/Tehran).
 */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Asia/Tehran";

/**
 * Mock Mode Configuration:
 * - In production: Mock mode is strictly DISABLED unless explicitly forced by NEXT_PUBLIC_ALLOW_MOCK_IN_PROD === "true" AND NEXT_PUBLIC_USE_MOCK === "true".
 * - In development: Mock mode is enabled ONLY if explicitly set (NEXT_PUBLIC_USE_MOCK === "true" or legacy NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "true").
 * - Default in production: FALSE.
 * - Production must NEVER silently fall back to mock data.
 */
function getIsMockEnabled(): boolean {
  const allowMockInProd = process.env.NEXT_PUBLIC_ALLOW_MOCK_IN_PROD === "true";
  const explicitMock =
    process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
    process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "true";

  if (IS_PRODUCTION) {
    return allowMockInProd && explicitMock;
  }

  // In non-production, check if explicitly enabled or disabled
  if (process.env.NEXT_PUBLIC_USE_MOCK === "false" || process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "false") {
    return false;
  }

  return explicitMock;
}

export const USE_MOCK_DATA = getIsMockEnabled();
export const USE_MOCK_RESERVATIONS = USE_MOCK_DATA;

/**
 * Token Storage Keys
 */
export const ACCESS_TOKEN_KEY = "sayra_access_token";
export const REFRESH_TOKEN_KEY = "sayra_refresh_token";
export const AUTH_USER_KEY = "sayra_user_auth";
