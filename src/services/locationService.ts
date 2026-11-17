import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

export interface ProvinceItem {
  id: string;
  name: string;
  slug?: string;
}

export interface CityItem {
  id: string;
  name: string;
  slug?: string;
  provinceId?: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function pickString(obj: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "number") return String(val);
  }
  return undefined;
}

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  if (Array.isArray(root?.data)) return root.data as unknown[];
  if (Array.isArray(root?.items)) return root.items as unknown[];
  return [];
}

function normalizeProvinces(data: unknown): ProvinceItem[] {
  const out: ProvinceItem[] = [];
  for (const item of extractList(data)) {
    const rec = asRecord(item);
    const id = pickString(rec, ["id"]);
    const name = pickString(rec, ["name", "title", "faName"]);
    if (!id || !name) continue;
    const slug = pickString(rec, ["slug"]);
    out.push({ id, name, ...(slug ? { slug } : {}) });
  }
  return out;
}

function normalizeCities(data: unknown, fallbackProvinceId?: string): CityItem[] {
  const out: CityItem[] = [];
  for (const item of extractList(data)) {
    const rec = asRecord(item);
    const id = pickString(rec, ["id"]);
    const name = pickString(rec, ["name", "title", "faName"]);
    if (!id || !name) continue;
    const slug = pickString(rec, ["slug"]);
    const provinceId = pickString(rec, ["provinceId", "province_id"]) ?? fallbackProvinceId;
    out.push({
      id,
      name,
      ...(slug ? { slug } : {}),
      ...(provinceId ? { provinceId } : {}),
    });
  }
  return out;
}

let cachedProvinces: ProvinceItem[] | null = null;
const cachedCitiesByProvince = new Map<string, CityItem[]>();

export const locationService = {
  async getProvinces(signal?: AbortSignal): Promise<ProvinceItem[]> {
    if (cachedProvinces && cachedProvinces.length > 0) {
      return cachedProvinces;
    }

    const res = await apiClient.get<unknown>(ENDPOINTS.locations.provinces, {
      signal,
      skipAuth: true,
      retryOnAuth: false,
    });
    const provinces = normalizeProvinces(res.data);
    if (provinces.length > 0) {
      cachedProvinces = provinces;
    }
    return provinces;
  },

  async getCities(provinceId: string, signal?: AbortSignal): Promise<CityItem[]> {
    const cleanId = provinceId.trim();
    if (!cleanId) return [];

    const cached = cachedCitiesByProvince.get(cleanId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const res = await apiClient.get<unknown>(ENDPOINTS.locations.cities(cleanId), {
      signal,
      skipAuth: true,
      retryOnAuth: false,
    });
    const cities = normalizeCities(res.data, cleanId);
    if (cities.length > 0) {
      cachedCitiesByProvince.set(cleanId, cities);
    }
    return cities;
  },

  clearCache(): void {
    cachedProvinces = null;
    cachedCitiesByProvince.clear();
  },
};
