import type { MetadataRoute } from "next";
import { API_BASE_URL, BLOG_API_BASE_URL } from "@/lib/api/config";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

const SITEMAP_FETCH_TIMEOUT_MS = 5000;
const MAX_SITEMAP_PAGES = 20;

interface RawGamingCenterRecord {
  slug?: unknown;
  isActive?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
}

interface RawArticleRecord {
  slug?: unknown;
  status?: unknown;
  updated_at?: unknown;
  published_at?: unknown;
}

/**
 * Parses ISO / Gregorian dates strictly, rejecting Persian Jalali strings (e.g., "1405/08/26")
 * that V8 Date.parse() would otherwise misinterpret as medieval years.
 */
function toValidGregorianDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getUTCFullYear();
  if (year < 2000 || year > 2100) return undefined;
  return parsed;
}

async function fetchJsonWithTimeout(url: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SITEMAP_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGamingCenterEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const seenSlugs = new Set<string>();

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page += 1) {
    const payload = await fetchJsonWithTimeout(
      `${API_BASE_URL}/gamingCenters?page=${page}&limit=50`
    );
    if (!payload) break;

    const inner =
      payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? (payload.data as Record<string, unknown>)
        : payload;

    const items = Array.isArray(inner.data)
      ? (inner.data as RawGamingCenterRecord[])
      : Array.isArray(payload.data)
        ? (payload.data as RawGamingCenterRecord[])
        : [];

    if (items.length === 0) break;

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      if (item.isActive === false) continue;
      const slug = typeof item.slug === "string" ? item.slug.trim() : "";
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const lastModified =
        toValidGregorianDate(item.updatedAt) ?? toValidGregorianDate(item.createdAt);

      entries.push({
        url: `${SITE_URL}/gamecenter/${encodeURIComponent(slug)}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "daily",
        priority: 0.85,
      });
    }

    const meta =
      inner.meta && typeof inner.meta === "object"
        ? (inner.meta as Record<string, unknown>)
        : inner.pagination && typeof inner.pagination === "object"
          ? (inner.pagination as Record<string, unknown>)
          : null;

    const totalPages =
      meta && typeof meta.totalPages === "number" ? meta.totalPages : undefined;

    if (totalPages !== undefined) {
      if (page >= totalPages) break;
    } else if (items.length < 50) {
      break;
    }
  }

  return entries;
}

async function fetchBlogArticleEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const seenSlugs = new Set<string>();

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page += 1) {
    const payload = await fetchJsonWithTimeout(
      `${BLOG_API_BASE_URL}/articles/?page=${page}&page_size=50&visibility=public&ordering=-published_at`
    );
    if (!payload) break;

    const items = Array.isArray(payload.data)
      ? (payload.data as RawArticleRecord[])
      : Array.isArray(payload.results)
        ? (payload.results as RawArticleRecord[])
        : [];

    if (items.length === 0) break;

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      if (typeof item.status === "string" && item.status !== "published") continue;
      const slug = typeof item.slug === "string" ? item.slug.trim() : "";
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const lastModified =
        toValidGregorianDate(item.updated_at) ?? toValidGregorianDate(item.published_at);

      entries.push({
        url: `${SITE_URL}/blog/${encodeURIComponent(slug)}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }

    const pagination =
      payload.pagination && typeof payload.pagination === "object"
        ? (payload.pagination as Record<string, unknown>)
        : null;
    const totalPages =
      pagination && typeof pagination.totalPage === "number"
        ? pagination.totalPage
        : pagination && typeof pagination.totalPages === "number"
          ? pagination.totalPages
          : undefined;

    if (totalPages !== undefined) {
      if (page >= totalPages) break;
    } else if (items.length < 50) {
      break;
    }
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/gamecenters`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/register-gamecenter`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const [centersResult, articlesResult] = await Promise.allSettled([
    fetchGamingCenterEntries(),
    fetchBlogArticleEntries(),
  ]);

  const centerEntries =
    centersResult.status === "fulfilled" ? centersResult.value : [];
  const articleEntries =
    articlesResult.status === "fulfilled" ? articlesResult.value : [];

  return [...staticRoutes, ...centerEntries, ...articleEntries];
}
