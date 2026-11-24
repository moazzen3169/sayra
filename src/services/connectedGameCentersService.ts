import { apiClient, ApiError, buildQueryString, isAbortError } from "@/lib/api/client";
import { IS_PRODUCTION, USE_MOCK_DATA } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { TtlDedupeCache } from "@/lib/api/requestLimiter";
import { DEFAULT_CITY } from "@/lib/cityConstants";
import { normalizeGameCenters } from "@/lib/gamecenterMap";
import type {
  ConnectedGameCentersApiResponse,
  GameCenter,
  GamingCenterMapItem,
  ValidGameCenterLocation,
} from "@/types/gamecenterMap";

/**
 * Isolated configuration for the gaming centers map endpoint.
 * Defaults to OpenAPI `GET /public/gaming-centers/map?city=...`.
 * Can be overridden via `NEXT_PUBLIC_CONNECTED_GAME_CENTERS_ENDPOINT`
 * (and optional `NEXT_PUBLIC_CONNECTED_GAME_CENTERS_BASE_URL`).
 */
export const CONNECTED_GAME_CENTERS_CONFIG = {
  endpoint: ENDPOINTS.gamingCenter.connectedMap,
  baseUrl: process.env.NEXT_PUBLIC_CONNECTED_GAME_CENTERS_BASE_URL?.trim() || undefined,
} as const;

export interface ConnectedGameCentersResult {
  centers: ValidGameCenterLocation[];
  isMock: boolean;
}

export interface FetchConnectedGameCentersOptions {
  city?: string;
  endpoint?: string;
  baseUrl?: string;
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

/**
 * Development-only mock dataset, activated strictly when `USE_MOCK_DATA` is explicitly
 * enabled in non-production environments. Never used as a silent fallback on API failure.
 */
const DEV_MOCK_CONNECTED_CENTERS: GamingCenterMapItem[] = [
  {
    id: "cmwlxvn5r0014137pppik07te",
    name: "سایرا",
    latitude: 38.078023,
    longitude: 46.295439,
    rating: 4.8,
    ratingCount: 16,
  },
];

const connectedCentersCache = new TtlDedupeCache<ConnectedGameCentersResult>({
  ttlMs: 60 * 1000,
  maxEntries: 30,
});

function extractRawCenters(payload: unknown): GameCenter[] {
  if (Array.isArray(payload)) {
    return payload as GameCenter[];
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Partial<ConnectedGameCentersApiResponse>;
    if (Array.isArray(obj.data)) {
      return obj.data;
    }
  }
  return [];
}

async function fetchSameOriginJson(
  endpoint: string,
  city: string,
  signal?: AbortSignal
): Promise<GameCenter[]> {
  const url = `${endpoint}${buildQueryString({ city })}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(0, "NETWORK_ERROR", "ارتباط با سرور برقرار نشد.");
  }

  const text = await response.text();
  let json: ConnectedGameCentersApiResponse | null = null;

  if (text.trim()) {
    try {
      json = JSON.parse(text) as ConnectedGameCentersApiResponse;
    } catch {
      if (!response.ok) {
        throw new ApiError(
          response.status,
          response.status === 404 ? "NOT_FOUND" : "INVALID_RESPONSE",
          `خطا در دریافت اطلاعات نقشه (${response.status}).`
        );
      }
      throw new ApiError(
        response.status,
        "INVALID_JSON",
        "پاسخ دریافت‌شده از سرور قالب معتبری ندارد."
      );
    }
  }

  if (!response.ok || json?.success === false) {
    throw new ApiError(
      response.status,
      json?.error?.code || (response.status === 404 ? "NOT_FOUND" : "HTTP_ERROR"),
      json?.error?.message || "دریافت موقعیت گیمنت‌ها انجام نشد."
    );
  }

  return extractRawCenters(json);
}

async function fetchFromConfiguredEndpoint(
  endpoint: string,
  city: string,
  baseUrl: string | undefined,
  signal?: AbortSignal
): Promise<GameCenter[]> {
  const query = { city };

  if (/^https?:\/\//i.test(endpoint)) {
    const parsed = new URL(endpoint);
    const response = await apiClient.get<GameCenter[] | ConnectedGameCentersApiResponse>(
      `${parsed.pathname}${parsed.search}`,
      {
        query,
        baseUrl: parsed.origin,
        skipAuth: true,
        retryOnAuth: false,
        signal,
      }
    );
    return extractRawCenters(response.data);
  }

  // Same-origin /api/... override when no external baseUrl is configured
  if (endpoint.startsWith("/api/") && !baseUrl) {
    return fetchSameOriginJson(endpoint, city, signal);
  }

  const response = await apiClient.get<GameCenter[] | ConnectedGameCentersApiResponse>(
    endpoint,
    {
      query,
      baseUrl,
      skipAuth: true,
      retryOnAuth: false,
      signal,
    }
  );
  return extractRawCenters(response.data);
}

export const connectedGameCentersService = {
  /**
   * Fetches active, approved gaming center map markers for the selected `city`
   * from `GET /public/gaming-centers/map?city=...`, validates coordinates,
   * and caches per-city results briefly to prevent redundant requests.
   */
  async getConnectedGameCenters(
    options: FetchConnectedGameCentersOptions = {}
  ): Promise<ConnectedGameCentersResult> {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const cleanCity = options.city?.trim() || DEFAULT_CITY;

    if (!IS_PRODUCTION && USE_MOCK_DATA) {
      return {
        centers: normalizeGameCenters(DEV_MOCK_CONNECTED_CENTERS),
        isMock: true,
      };
    }

    const endpoint =
      options.endpoint?.trim() || CONNECTED_GAME_CENTERS_CONFIG.endpoint;
    const baseUrl =
      options.baseUrl?.trim() || CONNECTED_GAME_CENTERS_CONFIG.baseUrl;
    const cacheKey = `${baseUrl ?? "default"}::${endpoint}::${cleanCity}`;

    if (options.forceRefresh) {
      connectedCentersCache.clear();
    }

    return connectedCentersCache.getOrFetch(
      cacheKey,
      async (internalSignal) => {
        const rawItems = await fetchFromConfiguredEndpoint(
          endpoint,
          cleanCity,
          baseUrl,
          internalSignal
        );
        return {
          centers: normalizeGameCenters(rawItems),
          isMock: false,
        };
      },
      options.signal
    );
  },

  clearCache(): void {
    connectedCentersCache.clear();
  },
};
