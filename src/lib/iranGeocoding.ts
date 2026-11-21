import { IRAN_PROVINCES } from "@/data/iranLocations";

export interface GeocodedViewport {
  lat: number;
  lng: number;
  zoom: number;
}

const geocodeCache = new Map<string, GeocodedViewport>();
const reverseGeocodeCache = new Map<string, string>();

interface NominatimAddressDetails {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  district?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  amenity?: string;
  shop?: string;
  building?: string;
}

function formatIranReverseAddress(
  address?: NominatimAddressDetails,
  displayName?: string
): string | null {
  if (address) {
    const parts: string[] = [];
    const pushUnique = (val?: string) => {
      const clean = val?.trim();
      if (!clean) return;
      if (!parts.some((p) => p === clean || p.includes(clean) || clean.includes(p))) {
        parts.push(clean);
      }
    };

    pushUnique(address.city_district || address.district);
    pushUnique(address.suburb || address.quarter || address.neighbourhood);
    pushUnique(address.road || address.pedestrian || address.footway);
    if (address.house_number?.trim()) {
      pushUnique(`پلاک ${address.house_number.trim()}`);
    }
    pushUnique(address.building || address.amenity || address.shop);

    if (parts.length > 0) {
      return parts.join("، ");
    }
  }

  if (displayName?.trim()) {
    const cleaned = displayName
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter((s) => s && s !== "ایران" && !/^\d{5,10}$/.test(s))
      .slice(0, 4)
      .join("، ");
    if (cleaned) return cleaned;
  }

  return null;
}

/**
 * Reverse-geocodes coordinates using OpenStreetMap Nominatim to suggest a Persian street address.
 */
export async function reverseGeocodeIranLocation(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lng))}&accept-language=fa&addressdetails=1&zoom=18`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: NominatimAddressDetails;
    };
    const formatted = formatIranReverseAddress(data.address, data.display_name);
    if (formatted) {
      reverseGeocodeCache.set(cacheKey, formatted);
      return formatted;
    }
  } catch {
    // Aborted or network error
  }

  return null;
}

function normalizeFa(value: string): string {
  return value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves coordinates for an Iranian province and/or city.
 * Uses local province defaults first for instant response, and queries
 * OpenStreetMap Nominatim for specific cities (cached in memory).
 */
export async function geocodeIranLocation(
  provinceName?: string,
  cityName?: string,
  signal?: AbortSignal
): Promise<GeocodedViewport | null> {
  const cleanProvince = provinceName ? normalizeFa(provinceName) : "";
  const cleanCity = cityName ? normalizeFa(cityName) : "";

  if (!cleanProvince && !cleanCity) return null;

  const cacheKey = `${cleanProvince}::${cleanCity}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  // Check if we only have a province or if the city is the province capital
  const matchedProvince = IRAN_PROVINCES.find(
    (p) => normalizeFa(p.name) === cleanProvince
  );

  if (!cleanCity && matchedProvince) {
    const result: GeocodedViewport = {
      lat: matchedProvince.defaultLat,
      lng: matchedProvince.defaultLng,
      zoom: 11,
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // If city is the first city (capital) of the matched province, use local coords immediately
  if (
    cleanCity &&
    matchedProvince &&
    matchedProvince.cities[0] &&
    normalizeFa(matchedProvince.cities[0]) === cleanCity
  ) {
    const result: GeocodedViewport = {
      lat: matchedProvince.defaultLat,
      lng: matchedProvince.defaultLng,
      zoom: 13,
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // Query OpenStreetMap Nominatim for accurate city coordinates
  const queryParts = [cleanCity, cleanProvince, "ایران"].filter(Boolean);
  const query = queryParts.join("، ");
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ir&accept-language=fa&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { signal });
    if (res.ok) {
      const items = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      const first = items?.[0];
      const lat = first?.lat ? Number(first.lat) : NaN;
      const lng = first?.lon ? Number(first.lon) : NaN;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const result: GeocodedViewport = {
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          zoom: cleanCity ? 13 : 11,
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Aborted or network error; fall back to province default below
  }

  if (matchedProvince) {
    return {
      lat: matchedProvince.defaultLat,
      lng: matchedProvince.defaultLng,
      zoom: 11,
    };
  }

  return null;
}
