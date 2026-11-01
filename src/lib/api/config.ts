/**
 * API & Environment Configuration
 * Central source of truth for API base URL, proxy path, timezone, mock flags, and token keys.
 */

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Check if running in a client-side browser environment.
 * Evaluated dynamically so test suites or runtime environment shifts are respected.
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Server-side Upstream Backend API URL:
 * Resolves the destination for the Next.js server proxy (`/api/proxy`).
 *
 * Priority:
 * 1. API_BASE_URL (standard server-side environment variable)
 * 2. NEXT_PUBLIC_API_BASE_URL (fallback for existing deployments)
 * 3. Default demo API URL
 */
const DEFAULT_DEV_API_URL = "http://87.248.156.152/api/v1";
const DEFAULT_PROD_API_URL = "http://87.248.156.152/api/v1";

export function getUpstreamApiBaseUrl(): string {
  const url =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL);
  return url.replace(/\/+$/, "");
}

// Deprecated export maintained for backward compatibility with existing code
export const API_BASE_URL = getUpstreamApiBaseUrl();

/**
 * Browser Proxy Base Path
 * In the browser, all API client calls MUST route through the local Next.js proxy (/api/proxy)
 * to ensure that server-side credentials (x-api-key) are injected and never exposed.
 */
export const PROXY_BASE_PATH = "/api/proxy";

/**
 * Determine the effective client base URL based on runtime environment.
 * In browser: returns PROXY_BASE_PATH (/api/proxy)
 * On server / SSR / tests without browser: returns getUpstreamApiBaseUrl()
 */
export function getClientApiBaseUrl(): string {
  if (isBrowser()) {
    return PROXY_BASE_PATH;
  }
  return getUpstreamApiBaseUrl();
}

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
