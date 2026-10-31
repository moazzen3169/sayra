import { API_BASE_URL } from "./config";
import { getAccessToken, refreshAccessToken, clearTokens } from "../token";

export interface ApiMeta {
  requestId?: string;
  pagination?: {
    totalItems?: number;
    page?: number;
    pageSize?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  meta?: ApiMeta;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const isAbortError = (e: unknown): boolean =>
  (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
  (e instanceof Error && e.name === "AbortError");

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Whether this request should attempt token refresh on 401 */
  retryOnAuth?: boolean;
}

/**
 * Serialize query parameters supporting strings, numbers, booleans, and arrays.
 */
export function buildQueryString(query?: Query): string {
  if (!query) return "";
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item !== undefined && item !== null) {
          qs.append(k, String(item));
        }
      });
    } else {
      qs.append(k, String(v));
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Build complete request URL based on API_BASE_URL.
 */
export function buildUrl(path: string, query?: Query): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const qs = buildQueryString(query);
  return `${base}${normalizedPath}${qs}`;
}

/**
 * Execute raw fetch request against backend API or Proxy
 */
async function executeFetch<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {},
  overrideToken?: string | null
): Promise<{ data: T; meta?: ApiMeta; message?: string }> {
  if (!API_BASE_URL) {
    throw new ApiError(0, "API_BASE_URL_MISSING", "ارتباط با سرور برقرار نشد.");
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  // Only set Content-Type for non-FormData bodies
  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Token resolution
  const token = overrideToken !== undefined ? overrideToken : getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
    throw new ApiError(0, "NETWORK_ERROR", "ارتباط با سرور برقرار نشد.");
  }

  // Empty response (e.g. 204 No Content)
  if (res.status === 204) {
    return { data: undefined as unknown as T };
  }

  const responseText = await res.text();
  let json: ApiEnvelope<T> | null = null;

  if (responseText.trim().length > 0) {
    try {
      json = JSON.parse(responseText) as ApiEnvelope<T>;
    } catch {
      // Invalid JSON received from server
      if (!res.ok) {
        throw new ApiError(
          res.status,
          res.status === 404 ? "NOT_FOUND" : "INVALID_RESPONSE",
          responseText || `سرور پاسخ نامعتبر بازگرداند (${res.status}).`
        );
      }
      throw new ApiError(
        res.status,
        "INVALID_JSON",
        "پاسخ دریافت شده از سرور فرمت نامعتبر دارد."
      );
    }
  }

  // Handle HTTP error statuses or envelope success: false
  if (!res.ok || json?.success === false) {
    const errorCode = json?.error?.code || (res.status === 401 ? "UNAUTHORIZED" : res.status === 403 ? "FORBIDDEN" : res.status === 404 ? "NOT_FOUND" : "HTTP_ERROR");
    const errorMessage = json?.error?.message || (res.status === 401 ? "نشست کاربری نامعتبر است." : res.status === 403 ? "دسترسی غیرمجاز." : "خطای نامشخص از سمت سرور.");

    throw new ApiError(
      res.status,
      errorCode,
      errorMessage,
      json?.error?.details
    );
  }

  // Return data envelope
  return {
    data: (json?.data !== undefined ? json.data : (json as unknown as T)) as T,
    meta: json?.meta,
    message: json?.message,
  };
}

/**
 * Direct call to refresh endpoint conforming to OpenAPI /auth/refresh
 */
async function performTokenRefresh(refreshToken: string): Promise<{ accessToken: string } | null> {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
  if (json?.success !== false && json?.data?.accessToken) {
    return { accessToken: json.data.accessToken };
  }
  return null;
}

/**
 * Top-level request method with token management and single retry on 401
 */
async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: ApiMeta; message?: string }> {
  const shouldRetry = options.retryOnAuth !== false && path !== "/auth/refresh" && path !== "/auth/login";

  try {
    return await executeFetch<T>(method, path, options);
  } catch (error) {
    // Check if error is 401 and eligible for refresh retry
    if (error instanceof ApiError && error.status === 401 && shouldRetry) {
      const newToken = await refreshAccessToken(performTokenRefresh);
      if (newToken) {
        // Retry the request exactly once with new token and retryOnAuth: false
        return await executeFetch<T>(
          method,
          path,
          { ...options, retryOnAuth: false },
          newToken
        );
      } else {
        clearTokens();
      }
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
