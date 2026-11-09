import type { GameStationInfo } from "@/services/gamingCenterService";
import type { DeviceCatalogItem } from "@/types/catalog";

export const STATION_TYPE_LABELS: Record<string, string> = {
  PC: "کامپیوتر گیمینگ",
  PLAYSTATION: "پلی‌استیشن",
  XBOX: "ایکس‌باکس",
  SWITCH: "نینتندو سوییچ",
  VR: "واقعیت مجازی",
};

export const STATION_TYPE_OPTIONS: { value: string; label: string }[] =
  Object.entries(STATION_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const stationTypeLabel = (type?: string | null): string => {
  if (!type) return "سفارشی";
  return STATION_TYPE_LABELS[type.toUpperCase()] ?? type;
};

/** قیمت ساعتی؛ اگر سرور به‌جای hourlyPrice فیلد hourlyRate برگرداند هم خوانده می‌شود */
export function getStationPrice(station: GameStationInfo): number | null {
  const raw = station as unknown as { hourlyPrice?: unknown; hourlyRate?: unknown };
  for (const value of [raw.hourlyPrice, raw.hourlyRate]) {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}

export interface StationGroup {
  key: string;
  name: string;
  deviceType: string;
  catalogId: string | null;
  coverImageUrl: string | null;
  count: number;
}

/** کلید گروه: اگر دستگاه به کاتالوگ وصل است با catalogDeviceId، وگرنه با نوع دستگاه */
export const stationGroupKey = (station: GameStationInfo): string =>
  station.catalogDeviceId
    ? `catalog:${station.catalogDeviceId}`
    : `type:${(station.stationType || "OTHER").toUpperCase()}`;

const stationCover = (station: GameStationInfo): string | null => {
  const raw = station as unknown as { coverImageUrl?: string | null };
  return raw.coverImageUrl || null;
};

/** دسته‌بندی کاتالوگ مستقیماً از روی دستگاه‌های واقعی ساخته می‌شود تا شمارنده و جدول همیشه یکی باشند */
export function buildStationGroups(
  stations: GameStationInfo[],
  catalogDevices: DeviceCatalogItem[]
): StationGroup[] {
  const catalogById = new Map(catalogDevices.map((d) => [d.id, d]));
  const groups = new Map<string, StationGroup>();

  for (const station of stations) {
    const key = stationGroupKey(station);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const catalog = station.catalogDeviceId
      ? catalogById.get(station.catalogDeviceId)
      : undefined;

    groups.set(key, {
      key,
      name: catalog?.name ?? stationTypeLabel(station.stationType),
      deviceType: String(catalog?.deviceType ?? station.stationType ?? ""),
      catalogId: station.catalogDeviceId ?? null,
      coverImageUrl: catalog?.coverImageUrl || stationCover(station),
      count: 1,
    });
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** تبدیل ورودی متنی (فارسی یا لاتین، با جداکننده) به عدد */
export function parseAmount(value: string, toEnglishDigits: (v: string) => string): number | null {
  const cleaned = toEnglishDigits(value).replace(/[,٬،\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}