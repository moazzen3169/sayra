import type { DeviceCatalogItem } from "@/types/catalog";

export interface DeviceCategory {
  id: string;
  name: string;
  deviceType?: string;
  subtitle?: string;
  iconType?: "ps5" | "ps4" | "pc" | "steering" | "vr" | "xbox" | "billiards";
  imageUrl?: string | null;
  count?: number;
}

/**
 * نگاشت خودکار آیتم‌های دریافت شده از API به تصاویر و آیکون‌های متناسب
 */
export function mapCatalogDeviceToCategory(device: DeviceCatalogItem): DeviceCategory {
  const normalized = (device.name + " " + (device.deviceType || "")).toLowerCase();
  const rawType = (device.deviceTypeRef?.category || device.deviceType || "").toUpperCase().trim();

  let iconType: DeviceCategory["iconType"] = "pc";
  if (
    rawType === "PLAYSTATION 5" ||
    normalized.includes("ps5") ||
    normalized.includes("playstation 5") ||
    normalized.includes("پلی‌استیشن ۵") ||
    normalized.includes("پلی استیشن ۵") ||
    normalized.includes("پلی‌استیشن 5") ||
    normalized.includes("پلی استیشن 5")
  ) {
    iconType = "ps5";
  } else if (
    rawType === "PLAYSTATION 4" ||
    normalized.includes("ps4") ||
    normalized.includes("playstation 4") ||
    normalized.includes("پلی‌استیشن ۴") ||
    normalized.includes("پلی استیشن ۴") ||
    normalized.includes("پلی‌استیشن 4") ||
    normalized.includes("پلی استیشن 4")
  ) {
    iconType = "ps4";
  } else if (normalized.includes("xbox") || normalized.includes("ایکس باکس") || rawType === "XBOX") {
    iconType = "xbox";
  } else if (normalized.includes("vr") || normalized.includes("واقعیت مجازی") || rawType === "VR") {
    iconType = "vr";
  } else if (normalized.includes("billiard") || normalized.includes("بیلیارد")) {
    iconType = "billiards";
  } else if (normalized.includes("wheel") || normalized.includes("steering") || normalized.includes("فرمان")) {
    iconType = "steering";
  } else if (rawType === "PLAYSTATION") {
    iconType = "ps5";
  }

  let canonicalDeviceType = rawType || undefined;
  if (iconType === "ps5") canonicalDeviceType = "PLAYSTATION 5";
  else if (iconType === "ps4") canonicalDeviceType = "PLAYSTATION 4";
  else if (iconType === "xbox") canonicalDeviceType = "XBOX";
  else if (iconType === "vr") canonicalDeviceType = "VR";
  else if (iconType === "billiards") canonicalDeviceType = rawType || "SWITCH";
  else if (rawType === "PC") canonicalDeviceType = "PC";

  return {
    id: device.id,
    name: device.name,
    deviceType: canonicalDeviceType,
    iconType,
    imageUrl: device.coverImageUrl || undefined,
  };
}
