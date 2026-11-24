import { API_BASE_URL } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { mapGamingCenterSectionToUi } from "@/lib/mappers/blogMapper";
import type {
  ArticleGamingCentersSectionData,
  ArticleRankingSort,
  PublicGameCenterCard,
} from "@/types/blog";
import type {
  PublicGameCenterCardDto,
  PublicGameCenterRankingMethodologyDto,
} from "@/types/blogApi";

function resolveExpressUrl(pathSuffix: string, query?: Record<string, string | number | boolean | undefined>): string {
  const rawBase = (
    process.env.SAYRA_INTERNAL_API_URL ||
    process.env.INTERNAL_API_BASE_URL ||
    API_BASE_URL
  ).replace(/\/+$/, "");

  const cleanSuffix = pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;
  let baseUrl = rawBase;

  if (rawBase.endsWith("/public/gamecenters")) {
    baseUrl = `${rawBase}${cleanSuffix.replace(/^\/public\/gamecenters/, "")}`;
  } else if (rawBase.endsWith("/public")) {
    baseUrl = `${rawBase}${cleanSuffix.replace(/^\/public/, "")}`;
  } else if (rawBase.endsWith("/api/v1") || rawBase.endsWith("/api")) {
    baseUrl = `${rawBase}${cleanSuffix}`;
  } else {
    baseUrl = `${rawBase}/api${cleanSuffix}`;
  }

  const url = new URL(baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

function buildServerHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const ssrSecret = (process.env.INTERNAL_SSR_SECRET || "").trim();
  const serviceToken = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
  if (ssrSecret) headers["x-ssr-secret"] = ssrSecret;
  if (serviceToken) headers["x-service-token"] = serviceToken;
  return headers;
}

export async function fetchPublicGameCentersByIds(
  ids: string[]
): Promise<{ items: PublicGameCenterCard[]; ok: boolean }> {
  const cleanIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, 50);
  if (cleanIds.length === 0) {
    return { items: [], ok: true };
  }

  try {
    const url = resolveExpressUrl(ENDPOINTS.publicGamecenters.list, {
      ids: cleanIds.join(","),
    });
    const res = await fetch(url, {
      headers: buildServerHeaders(),
      signal: AbortSignal.timeout(4000),
      next: {
        revalidate: 120,
        tags: cleanIds.map((id) => `gamecenter:${id}`),
      },
    });
    if (!res.ok) {
      return { items: [], ok: false };
    }

    const json = (await res.json()) as {
      data?: { data?: PublicGameCenterCardDto[] } | PublicGameCenterCardDto[];
    };
    const rawItems = Array.isArray(json?.data)
      ? json.data
      : Array.isArray((json?.data as { data?: PublicGameCenterCardDto[] } | undefined)?.data)
        ? ((json.data as { data: PublicGameCenterCardDto[] }).data)
        : [];

    const mapped = mapGamingCenterSectionToUi({
      mode: "manual",
      items: rawItems,
      newly_registered: [],
      source: "express_fallback",
      is_stale: false,
    });
    return { items: mapped?.items ?? [], ok: true };
  } catch {
    return { items: [], ok: false };
  }
}

export async function fetchPublicGameCenterRankings(params: {
  city?: string;
  neighborhood?: string;
  deviceType?: string;
  limit?: number;
  minReviews?: number | null;
  m?: number | null;
  sort?: ArticleRankingSort;
  includeNewlyRegistered?: boolean;
}): Promise<ArticleGamingCentersSectionData | null> {
  try {
    const url = resolveExpressUrl(ENDPOINTS.publicGamecenters.rankings, {
      city: params.city,
      neighborhood: params.neighborhood,
      deviceType: params.deviceType,
      limit: params.limit ?? 10,
      minReviews: params.minReviews ?? undefined,
      m: params.m ?? undefined,
      sort: params.sort ?? "bayesian",
      includeNewlyRegistered: params.includeNewlyRegistered ?? true,
    });

    const tags = ["gamecenters:rankings"];
    if (params.city) tags.push(`gamecenters:city:${params.city}`);

    const res = await fetch(url, {
      headers: buildServerHeaders(),
      signal: AbortSignal.timeout(4000),
      next: {
        revalidate: 180,
        tags,
      },
    });
    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      data?: {
        ranked?: PublicGameCenterCardDto[];
        newlyRegistered?: PublicGameCenterCardDto[];
        methodology?: PublicGameCenterRankingMethodologyDto | null;
      };
    };

    const payload = json?.data;
    if (!payload) return null;

    return mapGamingCenterSectionToUi({
      mode: "auto_ranking",
      items: Array.isArray(payload.ranked) ? payload.ranked : [],
      newly_registered: Array.isArray(payload.newlyRegistered)
        ? payload.newlyRegistered
        : [],
      methodology: payload.methodology ?? null,
      source: "express_fallback",
      is_stale: false,
      last_updated_at: payload.methodology?.calculatedAt ?? new Date().toISOString(),
    });
  } catch {
    return null;
  }
}
