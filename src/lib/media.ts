import { API_BASE_URL } from "./api/config";

/**
 * Normalizes any media URL returned by the backend or API:
 * - If string is empty/null/undefined: returns ""
 * - If already absolute (http://, https://, blob:, data:): returns as-is
 * - If relative (e.g. /uploads/image.png or uploads/image.png): resolves against backend base origin
 */
export function normalizeMediaUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Determine backend base origin (e.g. http://51.20.249.108)
  let baseOrigin = "http://51.20.249.108";
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    try {
      baseOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin;
    } catch {
      // ignore
    }
  } else if (API_BASE_URL) {
    try {
      baseOrigin = new URL(API_BASE_URL).origin;
    } catch {
      // ignore
    }
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseOrigin.replace(/\/+$/, "")}${cleanPath}`;
}

/**
 * Extracts a media URL from any arbitrary backend response structure:
 * - Direct string
 * - Object with url, path, fileUrl, imageUrl, src, link, location
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
    obj.imageUrl ||
    obj.fileUrl ||
    obj.path ||
    obj.filePath ||
    obj.src ||
    obj.link ||
    obj.location ||
    obj.data?.url ||
    obj.data?.path ||
    obj.data?.fileUrl ||
    obj.data?.imageUrl ||
    obj.media?.url ||
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
export function extractMediaItems<T extends { id?: string; url: string; altText?: string; purpose?: string }>(
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
      if (url) {
        result.push({
          id: item.id || `media-${idx}`,
          url,
          altText: item.altText || item.alt || item.title || "",
          purpose: item.purpose || fallbackPurpose,
        } as T);
      }
    }
  });

  return result;
}
