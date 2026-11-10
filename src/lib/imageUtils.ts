/**
 * Centralized Image Utilities & Constants
 *
 * Provides single source of truth for:
 * - Default fallback image path
 * - URL validation & normalization
 * - Safe image-source resolution
 * - Safe retry limit constants
 */

import { normalizeMediaUrl } from "@/lib/media";

/** Predefined local default fallback image stored locally in public assets */
export const DEFAULT_IMAGE_PATH = "/images/default-image.png";

/** Transparent 1x1 GIF fallback as terminal guard if even the fallback asset fails */
export const TERMINAL_TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Maximum retry attempts for transient image load failures before switching permanently to fallback */
export const MAX_IMAGE_RETRIES = 5;

/**
 * Validates if the provided source string is a usable, non-empty image source.
 */
export function isValidImageSource(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === "null" || trimmed === "undefined") return false;
  return true;
}

/**
 * Normalizes an image source into a safe URL string:
 * - Returns empty string for null, undefined, empty or whitespace strings
 * - Normalizes backend media paths using `normalizeMediaUrl`
 * - Preserves data:, blob:, http(s):// and local /... paths
 */
export function normalizeImageSource(src?: string | Blob | null): string {
  if (!src) return "";
  if (typeof src !== "string") return "";
  const trimmed = src.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  // Normalize potential backend media or relative path
  return normalizeMediaUrl(trimmed) || trimmed;
}

/**
 * Resolves the primary URL or chooses the fallback image if primary is invalid/empty.
 */
export function resolveInitialImageSource(
  src?: string | Blob | null,
  customFallback?: string | null
): { resolvedSrc: string; isFallback: boolean } {
  const normalized = normalizeImageSource(src);
  if (!normalized) {
    const fallback = normalizeImageSource(customFallback) || DEFAULT_IMAGE_PATH;
    return { resolvedSrc: fallback, isFallback: true };
  }
  return { resolvedSrc: normalized, isFallback: false };
}
