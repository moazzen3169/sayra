import { apiClient, isAbortError } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { generateQrSvg } from "@/lib/qrCode";

export interface ShortLinkItem {
  id: string;
  code: string;
  shortUrl: string;
  destinationUrl: string;
  title?: string | null;
  targetCategory?: string;
  targetEntityId?: string | null;
  gamingCenterId?: string | null;
  status?: string;
}

export interface ShortLinkQrPayload {
  format?: "json" | "dataurl";
  mimeType?: string;
  svg?: string;
  dataUrl?: string;
  meta?: {
    shortUrl?: string;
    size?: number;
    margin?: number;
  };
}

export interface GamecenterShareData {
  shortUrl: string;
  isShortened: boolean;
  qrSvg: string | null;
  qrDataUrl: string | null;
  linkId?: string;
}

interface ResolveGamecenterShareParams {
  gamingCenterId: string;
  gamingCenterName: string;
  destinationUrl: string;
  isAuthenticated?: boolean;
  existingShortUrl?: string | null;
  signal?: AbortSignal;
}

const shareCache = new Map<string, GamecenterShareData>();

function extractItems(payload: unknown): ShortLinkItem[] {
  if (Array.isArray(payload)) return payload as ShortLinkItem[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as ShortLinkItem[];
    if (Array.isArray(obj.items)) return obj.items as ShortLinkItem[];
  }
  return [];
}

function extractSingle<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as T;
  }
  return payload as T;
}

function buildFallbackShareData(url: string, isShortened = false): GamecenterShareData {
  let qrSvg: string | null = null;
  try {
    qrSvg = generateQrSvg(url, {
      margin: 2,
      foreground: "#101014",
      background: "#ffffff",
    });
  } catch {
    qrSvg = null;
  }
  return {
    shortUrl: url,
    isShortened,
    qrSvg,
    qrDataUrl: null,
  };
}

export const shortLinkService = {
  /**
   * Resolves or creates a short link + QR code for a gaming center using
   * OpenAPI `/short-links` and `/short-links/{linkId}/qr?format=json`.
   * Gracefully falls back to the canonical URL + locally generated QR SVG
   * when the visitor is not authenticated or the short-link API is unavailable.
   */
  async resolveGamecenterShare(
    params: ResolveGamecenterShareParams
  ): Promise<GamecenterShareData> {
    const {
      gamingCenterId,
      gamingCenterName,
      destinationUrl,
      isAuthenticated = false,
      existingShortUrl,
      signal,
    } = params;

    const cacheKey = `${gamingCenterId}::${destinationUrl}::${isAuthenticated ? "auth" : "guest"}`;
    const cached = shareCache.get(cacheKey);
    if (cached) return cached;

    if (existingShortUrl && existingShortUrl.trim()) {
      const result = buildFallbackShareData(existingShortUrl.trim(), true);
      shareCache.set(cacheKey, result);
      return result;
    }

    if (!isAuthenticated) {
      return buildFallbackShareData(destinationUrl, false);
    }

    try {
      let matchedLink: ShortLinkItem | null = null;

      // 1. Check if an active short link for this gaming center already exists
      try {
        const listRes = await apiClient.get<unknown>(ENDPOINTS.shortLinks.list, {
          query: {
            targetCategory: "GAMING_CENTER",
            status: "ACTIVE",
            limit: 50,
          },
          signal,
        });
        const items = extractItems(listRes.data);
        matchedLink =
          items.find(
            (item) =>
              item.status !== "INACTIVE" &&
              item.status !== "EXPIRED" &&
              (item.targetEntityId === gamingCenterId ||
                item.gamingCenterId === gamingCenterId ||
                item.destinationUrl === destinationUrl)
          ) ?? null;
      } catch (err) {
        if (isAbortError(err)) throw err;
        // Continue to attempt creation
      }

      // 2. Create a short link if none was found
      if (!matchedLink) {
        const createRes = await apiClient.post<unknown>(
          ENDPOINTS.shortLinks.create,
          {
            destinationUrl,
            title: gamingCenterName.slice(0, 200),
            targetCategory: "GAMING_CENTER",
            targetEntityId: gamingCenterId,
            gamingCenterId,
          },
          { signal }
        );
        matchedLink = extractSingle<ShortLinkItem>(createRes.data);
      }

      if (matchedLink?.id && matchedLink?.shortUrl) {
        // 3. Fetch backend QR code via GET /short-links/{linkId}/qr?format=json
        let qrSvg: string | null = null;
        let qrDataUrl: string | null = null;
        try {
          const qrRes = await apiClient.get<unknown>(
            ENDPOINTS.shortLinks.qr(matchedLink.id),
            {
              query: {
                format: "json",
                size: 320,
                margin: 2,
                ecc: "M",
                fg: "#101014",
                bg: "#ffffff",
              },
              signal,
            }
          );
          const qrPayload = extractSingle<ShortLinkQrPayload>(qrRes.data);
          qrSvg = qrPayload?.svg ?? null;
          qrDataUrl = qrPayload?.dataUrl ?? null;
        } catch (err) {
          if (isAbortError(err)) throw err;
        }

        if (!qrSvg && !qrDataUrl) {
          try {
            qrSvg = generateQrSvg(matchedLink.shortUrl, {
              margin: 2,
              foreground: "#101014",
              background: "#ffffff",
            });
          } catch {
            qrSvg = null;
          }
        }

        const result: GamecenterShareData = {
          shortUrl: matchedLink.shortUrl,
          isShortened: true,
          qrSvg,
          qrDataUrl,
          linkId: matchedLink.id,
        };
        shareCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      // Fall back smoothly when unauthenticated, forbidden, or network fails
    }

    return buildFallbackShareData(destinationUrl, false);
  },

  clearCache(): void {
    shareCache.clear();
  },
};
