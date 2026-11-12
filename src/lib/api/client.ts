
import {
  API_BASE_URL,
  BLOG_API_BASE_URL,
} from "./config";

import {
  getAccessToken,
  getBlogAccessToken,
  getBlogRefreshToken,
  setBlogTokens,
  refreshAccessToken,
  clearTokens,
  clearBlogTokens,
} from "../token";

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
  messagesList?: string[];
  pagination?: unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const isAbortError = (error: unknown): boolean =>
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError") ||
  (error instanceof Error && error.name === "AbortError");

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type Query = Record<
  string,
  QueryValue | QueryValue[]
>;

export type AuthScope = "platform" | "blog";

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  retryOnAuth?: boolean;
  baseUrl?: string;
  skipAuth?: boolean;

  /**
   * Selects which independent token store is used.
   */
  authScope?: AuthScope;
}

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
  message?: string;
  messagesList?: string[];
  pagination?: unknown;
  rawEnvelope?: unknown;
}

// ==================================================
// Query and URL
// ==================================================

export function buildQueryString(query?: Query): string {
  if (!query) return "";

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          params.append(key, String(item));
        }
      });
    } else {
      params.append(key, String(value));
    }
  });

  const result = params.toString();

  return result ? `?${result}` : "";
}

export function buildUrl(
  path: string,
  query?: Query,
  baseUrl?: string
): string {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const base = (baseUrl || API_BASE_URL).replace(/\/+$/, "");

  return `${base}${normalizedPath}${buildQueryString(query)}`;
}

// ==================================================
// Token Resolution
// ==================================================

function getTokenForScope(
  scope: AuthScope
): string | null {
  return scope === "blog"
    ? getBlogAccessToken()
    : getAccessToken();
}

// ==================================================
// Raw Fetch
// ==================================================

async function executeFetch<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
  overrideToken?: string | null
): Promise<ApiResponse<T>> {
  const targetBaseUrl = options.baseUrl || API_BASE_URL;

  if (!targetBaseUrl) {
    throw new ApiError(
      0,
      "API_BASE_URL_MISSING",
      "ارتباط با سرور برقرار نشد."
    );
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (!options.skipAuth) {
    const scope = options.authScope || "platform";

    const token =
      overrideToken !== undefined
        ? overrideToken
        : getTokenForScope(scope);

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      delete headers.Authorization;
    }
  } else {
    delete headers.Authorization;
  }

  let response: Response;

  try {
    response = await fetch(
      buildUrl(path, options.query, targetBaseUrl),
      {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : isFormData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        signal: options.signal,
      }
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "ارتباط با سرور برقرار نشد."
    );
  }

  if (response.status === 204) {
    return {
      data: undefined as unknown as T,
    };
  }

  const responseText = await response.text();

  let json: ApiEnvelope<T> | null = null;

  if (responseText.trim()) {
    try {
      json = JSON.parse(responseText) as ApiEnvelope<T>;
    } catch {
      if (!response.ok) {
        throw new ApiError(
          response.status,
          response.status === 404
            ? "NOT_FOUND"
            : "INVALID_RESPONSE",
          responseText ||
            `سرور پاسخ نامعتبر بازگرداند (${response.status}).`
        );
      }

      throw new ApiError(
        response.status,
        "INVALID_JSON",
        "پاسخ دریافت شده از سرور فرمت نامعتبر دارد."
      );
    }
  }


if (!response.ok || json?.success === false) {
  const messages = Array.isArray(json?.messagesList)
    ? json.messagesList
    : [];

  const rawErrorText = [
    ...messages,
    json?.error?.message || "",
    json?.error?.details
      ? JSON.stringify(json.error.details)
      : "",
  ].join(" ");

  // Django REST Framework / SimpleJWT may return 403
  // with token_not_valid instead of HTTP 401.
  const isInvalidToken =
    /token_not_valid|token is expired|given token not valid/i.test(
      rawErrorText
    );

  const errorCode =
    json?.error?.code ||
    (isInvalidToken
      ? "TOKEN_NOT_VALID"
      : response.status === 401
        ? "UNAUTHORIZED"
        : response.status === 403
          ? "FORBIDDEN"
          : response.status === 404
            ? "NOT_FOUND"
            : "HTTP_ERROR");

  const errorMessage =
    json?.error?.message ||
    messages[0] ||
    (response.status === 401
      ? "نشست کاربری نامعتبر است."
      : response.status === 403
        ? "دسترسی غیرمجاز."
        : "خطای نامشخص از سمت سرور.");

  throw new ApiError(
    response.status,
    errorCode,
    errorMessage,
    json?.error?.details ?? (
      messages.length > 0
        ? { messagesList: messages }
        : undefined
    )
  );
}


  return {
    data:
      json?.data !== undefined
        ? json.data
        : (json as unknown as T),
    meta: json?.meta,
    message: json?.message,
    messagesList: json?.messagesList,
    pagination: json?.pagination,
    rawEnvelope: json,
  };
}

// ==================================================
// Platform Refresh
// ==================================================

async function performTokenRefresh(
  refreshToken: string
): Promise<{ accessToken: string } | null> {
  const base = API_BASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      refreshToken,
    }),
  });

  if (!response.ok) return null;

  const json = await response.json();

  const accessToken =
    json?.data?.accessToken ||
    json?.accessToken;

  if (json?.success === false || !accessToken) {
    return null;
  }

  return { accessToken };
}

// ==================================================
// Blog Refresh - Based on Blog-Platform-API.yaml
// POST /api/token/refresh/
// Body: { refresh: string }
// Response: { data: { access: string } }
// ==================================================

let blogRefreshPromise: Promise<string | null> | null = null;

async function performBlogTokenRefresh(
  refreshToken: string
): Promise<string | null> {
  const base = BLOG_API_BASE_URL.replace(/\/+$/, "");

  const response = await fetch(
    `${base}/token/refresh/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.success === false) {
    return null;
  }

  const accessToken =
    json?.data?.access ||
    json?.access;

  return typeof accessToken === "string" && accessToken
    ? accessToken
    : null;
}

async function refreshBlogAccessToken(): Promise<string | null> {
  const currentRefreshToken = getBlogRefreshToken();

  if (!currentRefreshToken) {
    clearBlogTokens();
    return null;
  }

  if (blogRefreshPromise) {
    return blogRefreshPromise;
  }

  blogRefreshPromise = (async () => {
    try {
      const newAccessToken =
        await performBlogTokenRefresh(currentRefreshToken);

      if (!newAccessToken) {
        clearBlogTokens();

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new Event("sayra:blog-auth-expired")
          );
        }

        return null;
      }

      // Blog API YAML returns a new access token only.
      // Keep the existing refresh token.
      setBlogTokens({
        accessToken: newAccessToken,
        refreshToken: currentRefreshToken,
      });

      return newAccessToken;
    } catch {
      clearBlogTokens();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new Event("sayra:blog-auth-expired")
        );
      }

      return null;
    } finally {
      blogRefreshPromise = null;
    }
  })();

  return blogRefreshPromise;
}

// ==================================================
// Request + Single Retry
// ==================================================

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const authScope = options.authScope || "platform";

  const isRefreshRequest =
    path.includes("/auth/refresh") ||
    path.includes("/token/refresh");

  const isLoginRequest =
    path.includes("/auth/login") ||
    path.includes("/auth/admin-login");

  const shouldRetry =
    !options.skipAuth &&
    options.retryOnAuth !== false &&
    !isRefreshRequest &&
    !isLoginRequest;

  try {
    return await executeFetch<T>(
      method,
      path,
      options
    );
  } catch (error) {
if (
  error instanceof ApiError &&
  (
    error.status === 401 ||
    (
      authScope === "blog" &&
      error.code === "TOKEN_NOT_VALID"
    )
  ) &&
  shouldRetry
) {
      const newToken =
        authScope === "blog"
          ? await refreshBlogAccessToken()
          : await refreshAccessToken(performTokenRefresh);

      if (newToken) {
        return executeFetch<T>(
          method,
          path,
          {
            ...options,
            retryOnAuth: false,
          },
          newToken
        );
      }

      if (authScope === "platform") {
        clearTokens();
      }
    }

    throw error;
  }
}

// ==================================================
// Main Platform API Client
// ==================================================

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, options),

  post: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ) =>
    request<T>("POST", path, {
      ...options,
      body,
    }),

  put: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ) =>
    request<T>("PUT", path, {
      ...options,
      body,
    }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ) =>
    request<T>("PATCH", path, {
      ...options,
      body,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};

// ==================================================
// Dedicated Blog Platform API Client
// ==================================================

function blogOptions(
  options?: RequestOptions
): RequestOptions {
  return {
    ...options,
    baseUrl: BLOG_API_BASE_URL,
    authScope: "blog",
  };
}

export const blogApiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiClient.get<T>(path, blogOptions(options)),

  post: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ) =>
    apiClient.post<T>(
      path,
      body,
      blogOptions(options)
    ),

  put: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ) =>
    apiClient.put<T>(
      path,
      body,
      blogOptions(options)
    ),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ) =>
    apiClient.patch<T>(
      path,
      body,
      blogOptions(options)
    ),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiClient.delete<T>(
      path,
      blogOptions(options)
    ),
};
