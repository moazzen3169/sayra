import type { DeviceCatalogItem } from "@/types/catalog";

export interface DeviceCategory {
  id: string;
  name: string;
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

  let iconType: DeviceCategory["iconType"] = "pc";
  if (normalized.includes("ps5") || normalized.includes("پلی‌استیشن ۵") || normalized.includes("پلی استیشن ۵")) {
    iconType = "ps5";
  } else if (normalized.includes("ps4") || normalized.includes("پلی‌استیشن ۴") || normalized.includes("پلی استیشن ۴")) {
    iconType = "ps4";
  } else if (normalized.includes("xbox") || normalized.includes("ایکس باکس") || device.deviceType === "XBOX") {
    iconType = "xbox";
  } else if (normalized.includes("vr") || normalized.includes("واقعیت مجازی") || device.deviceType === "VR") {
    iconType = "vr";
  } else if (normalized.includes("billiard") || normalized.includes("بیلیارد")) {
    iconType = "billiards";
  } else if (normalized.includes("wheel") || normalized.includes("steering") || normalized.includes("فرمان")) {
    iconType = "steering";
  } else if (device.deviceType === "PLAYSTATION") {
    iconType = "ps5";
  }

  return {
    id: device.id,
    name: device.name,
    iconType,
    imageUrl: device.coverImageUrl || undefined,
  };
}
