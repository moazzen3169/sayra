import { ACCESS_TOKEN_KEY, API_BASE_URL } from "./config";

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

interface Envelope<T> {
  success?: boolean;
  data?: T;
  meta?: ApiMeta;
  error?: { code?: string; message?: string; details?: unknown };
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
  }
}

export const isAbortError = (e: unknown): boolean =>
  e instanceof DOMException && e.name === "AbortError";

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: ApiMeta }> {
  // Base URL خالی یعنی درخواست به خود Next.js می‌رود و 404 می‌گیرد
  if (!API_BASE_URL) {
    throw new ApiError(
      0,
      "API_BASE_URL_MISSING",
      "ارتباط با سرور برقرار نشد."
    );
  }

  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  // برای FormData مرورگر خودش Content-Type (با boundary) را می‌گذارد
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new ApiError(0, "NETWORK_ERROR", "ارتباط با سرور برقرار نشد.");
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    json = null;
  }

  // 404 بدون بدنه JSON یعنی آدرس اشتباه است، نه اینکه منبع پیدا نشده باشد
  if (!json && res.status === 404) {
    throw new ApiError(
      404,
      "ENDPOINT_NOT_FOUND",
      "مورد درخواستی پیدا نشد."
    );
  }

  if (!res.ok || json?.success === false) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? "UNKNOWN_ERROR",
      json?.error?.message ?? "خطای نامشخص از سمت سرور.",
      json?.error?.details
    );
  }

  return { data: (json?.data ?? null) as T, meta: json?.meta };
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