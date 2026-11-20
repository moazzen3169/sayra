import { IRAN_PROVINCES } from "@/data/iranLocations";
import type { GameCenter, ValidGameCenterLocation } from "@/types/gamecenterMap";

/**
 * Default map viewport when there are no valid game center locations (Iran overview).
 */
export const DEFAULT_MAP_CENTER: readonly [number, number] = [32.4279, 53.688];
export const DEFAULT_MAP_ZOOM = 5;
export const CITY_FALLBACK_ZOOM = 11;
export const SINGLE_MARKER_ZOOM = 14;
export const MAX_FIT_BOUNDS_ZOOM = 15;
export const GAME_CENTERS_MAP_HEIGHT_CLASS = "h-[300px] sm:h-[360px] lg:h-[440px]";

/**
 * Small radial offset in degrees (~75 meters) applied only when multiple centers
 * share identical coordinates so pins and name labels remain distinguishable at street zoom.
 */
const DUPLICATE_COORD_OFFSET_RADIUS = 0.00075;

function normalizeCityKey(value: string): string {
  return value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getCityDefaultViewport(city?: string): {
  center: readonly [number, number];
  zoom: number;
} {
  if (!city) {
    return { center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM };
  }

  const normalized = normalizeCityKey(city);
  if (!normalized) {
    return { center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM };
  }

  const matched = IRAN_PROVINCES.find(
    (province) =>
      normalizeCityKey(province.name) === normalized ||
      province.cities.some((c) => normalizeCityKey(c) === normalized)
  );

  if (matched) {
    return {
      center: [matched.defaultLat, matched.defaultLng],
      zoom: CITY_FALLBACK_ZOOM,
    };
  }

  return { center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM };
}

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates raw game center records, converts string coordinates to finite numbers,
 * discards malformed items safely, and offsets identical coordinates gracefully.
 */
export function normalizeGameCenters(rawItems: unknown): ValidGameCenterLocation[] {
  if (!Array.isArray(rawItems)) return [];

  const validRaw: Array<{ id: string; name: string; lat: number; lng: number }> = [];
  const seenIds = new Set<string>();

  for (const item of rawItems) {
    if (!isRecord(item)) continue;

    const rawId = item.id;
    const id =
      typeof rawId === "string"
        ? rawId.trim()
        : typeof rawId === "number" && Number.isFinite(rawId)
          ? String(rawId)
          : "";
    if (!id || seenIds.has(id)) continue;

    const rawName = item.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) continue;

    const typed = item as Partial<GameCenter>;
    const lat = parseCoordinate(typed.latitude ?? typed.lat);
    const lng = parseCoordinate(typed.longitude ?? typed.lng);
    if (lat === null || lng === null) continue;
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) continue;

    seenIds.add(id);
    validRaw.push({ id, name, lat, lng });
  }

  return applyDuplicateCoordinateOffsets(validRaw);
}

/**
 * Groups locations with identical coordinates (to 6 decimal places) and arranges
 * duplicates in a tiny circle around the true coordinate so none are hidden underneath another.
 */
export function applyDuplicateCoordinateOffsets(
  items: ReadonlyArray<{ id: string; name: string; lat: number; lng: number }>
): ValidGameCenterLocation[] {
  const buckets = new Map<string, number[]>();

  items.forEach((item, index) => {
    const key = `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
    const group = buckets.get(key);
    if (group) {
      group.push(index);
    } else {
      buckets.set(key, [index]);
    }
  });

  const result: ValidGameCenterLocation[] = new Array(items.length);

  for (const indices of buckets.values()) {
    const count = indices.length;
    if (count === 1) {
      const idx = indices[0];
      const item = items[idx];
      result[idx] = {
        ...item,
        displayLat: item.lat,
        displayLng: item.lng,
      };
      continue;
    }

    // Scale radius slightly for larger co-located clusters while staying local to the venue
    const radius = DUPLICATE_COORD_OFFSET_RADIUS * (1 + Math.min(count, 8) * 0.12);
    indices.forEach((idx, slot) => {
      const item = items[idx];
      const angle = Math.PI / 3 + (2 * Math.PI * slot) / count;
      const latOffset = radius * Math.sin(angle);
      // Adjust longitude offset by cos(lat) so visual separation is circular on Mercator tiles
      const cosLat = Math.max(0.2, Math.cos((item.lat * Math.PI) / 180));
      const lngOffset = (radius * Math.cos(angle)) / cosLat;

      result[idx] = {
        ...item,
        displayLat: Math.max(-90, Math.min(90, item.lat + latOffset)),
        displayLng: Math.max(-180, Math.min(180, item.lng + lngOffset)),
      };
    });
  }

  return result;
}
