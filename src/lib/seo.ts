export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sayra-booking.ir"
).replace(/\/+$/, "");

/**
 * Joins a relative path (or validates an already-absolute URL) with SITE_URL.
 */
export function absoluteUrl(path: string): string {
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${SITE_URL}${normalized === "/" ? "" : normalized}` || SITE_URL;
}
