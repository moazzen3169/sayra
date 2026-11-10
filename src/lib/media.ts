import { API_BASE_URL } from "./api/config";

/**
 * Standard Default Placeholder Paths
 */
export const PLACEHOLDERS = {
  banner: "/images/default-banner.webp",
  center: "/images/default-center.webp",
  gallery: "/images/default-gallery.webp",
  avatar: "/images/default-avatar.webp",
} as const;

/**
 * Returns the configured base origin for media/uploads.
 * Priority:
 * 1. NEXT_PUBLIC_MEDIA_BASE_URL
 * 2. NEXT_PUBLIC_API_BASE_URL (origin)
 * 3. API_BASE_URL (origin)
 * 4. Fallback default backend origin: http://51.20.249.108
 */
export function getMediaBaseOrigin(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MEDIA_BASE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL).origin;
    } catch {
      // ignore
    }
  }

  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin;
    } catch {
      // ignore
    }
  }

  if (API_BASE_URL) {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      // ignore
    }
  }

  return "http://51.20.249.108";
}

/**
 * Normalizes any media URL returned by the backend or API:
 * - If string is empty/null/undefined: returns ""
 * - If already absolute (http://, https://, blob:, data:): returns as-is
 * - If local frontend static asset (starts with /img/, /images/, /design/, /fonts/, /icons/): returns as-is
 * - If relative (e.g. /uploads/image.png or uploads/image.png): resolves against backend base origin
 * - Avoids duplicate /uploads/ prefixes
 */
export function normalizeMediaUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // Normalize Windows-style backslashes or relative paths like .\public\img\... or ./public/img/...
  trimmed = trimmed.replace(/\\/g, "/");
  trimmed = trimmed.replace(/^(\.\/|\/)?public\//, "/");

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Preserve local frontend static assets as relative paths
  if (
    trimmed.startsWith("/img/") ||
    trimmed.startsWith("/images/") ||
    trimmed.startsWith("/design/") ||
    trimmed.startsWith("/fonts/") ||
    trimmed.startsWith("/icons/")
  ) {
    return trimmed;
  }

  const baseOrigin = getMediaBaseOrigin();

  let cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  cleanPath = cleanPath.replace(/^\/uploads\/uploads\//, "/uploads/");

  return `${baseOrigin.replace(/\/+$/, "")}${cleanPath}`;
}

/**
 * Resolves a media item or candidate URL giving preference to thumbUrl when available
 */
export function resolveMediaUrl(
  mediaOrUrl?: string | { url?: string | null; thumbUrl?: string | null } | null,
  preferThumbnail = false
): string {
  if (!mediaOrUrl) return "";
  if (typeof mediaOrUrl === "string") {
    return normalizeMediaUrl(mediaOrUrl);
  }

  const target = preferThumbnail
    ? mediaOrUrl.thumbUrl || mediaOrUrl.url
    : mediaOrUrl.url || mediaOrUrl.thumbUrl;

  return normalizeMediaUrl(target);
}

/**
 * Extracts a media URL from any arbitrary backend response structure:
 * - Direct string
 * - Object with url, thumbUrl, path, fileUrl, imageUrl, src, link, location
 * - Nested objects under data, media, file
 * - Array of strings or objects
 */
export function extractMediaUrl(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return normalizeMediaUrl(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    return extractMediaUrl(data[0]);
  }
  if (typeof data !== "object") return "";

  const obj = data as Record<string, any>;
  const candidate =
    obj.url ||
    obj.thumbUrl ||
    obj.imageUrl ||
    obj.fileUrl ||
    obj.path ||
    obj.filePath ||
    obj.src ||
    obj.link ||
    obj.location ||
    obj.data?.url ||
    obj.data?.thumbUrl ||
    obj.data?.path ||
    obj.data?.fileUrl ||
    obj.data?.imageUrl ||
    obj.media?.url ||
    obj.media?.thumbUrl ||
    obj.media?.path ||
    obj.file?.url ||
    obj.file?.path;

  if (candidate && typeof candidate === "string") {
    return normalizeMediaUrl(candidate);
  }

  return "";
}

/**
 * Extracts an array of media items from any arbitrary response envelope
 */
export function extractMediaItems<
  T extends { id?: string; url: string; thumbUrl?: string; altText?: string; purpose?: string }
>(
  data: unknown,
  fallbackPurpose: string = "GALLERY"
): T[] {
  if (!data) return [];

  let list: any[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === "object") {
    const rec = data as Record<string, any>;
    if (Array.isArray(rec.data)) list = rec.data;
    else if (rec.data && typeof rec.data === "object" && Array.isArray(rec.data.data)) list = rec.data.data;
    else if (Array.isArray(rec.media)) list = rec.media;
    else if (rec.data && typeof rec.data === "object" && Array.isArray(rec.data.media)) list = rec.data.media;
    else if (Array.isArray(rec.images)) list = rec.images;
    else if (Array.isArray(rec.items)) list = rec.items;
  }

  const result: T[] = [];
  list.forEach((item, idx) => {
    if (!item) return;
    if (typeof item === "string") {
      const url = normalizeMediaUrl(item);
      if (url) {
        result.push({
          id: `media-${idx}`,
          url,
          altText: "",
          purpose: fallbackPurpose,
        } as T);
      }
      return;
    }

    if (typeof item === "object") {
      const url = extractMediaUrl(item);
      const thumbUrl = item.thumbUrl ? normalizeMediaUrl(item.thumbUrl) : undefined;
      if (url) {
        result.push({
          id: item.id || `media-${idx}`,
          url,
          thumbUrl,
          altText: item.altText || item.alt || item.title || "",
          purpose: item.purpose || fallbackPurpose,
        } as T);
      }
    }
  });

  return result;
}
