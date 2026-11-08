import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";

export const deviceCategoryApi = {
  /**
   * دریافت دسته‌بندی‌های دستگاه‌های گیمنت
   * GET /api/v1/public/gamingCenters/:gamingCenterSlug/device-categories
   */
  async getDeviceCategories(
    gamingCenterSlug: string,
    signal?: AbortSignal
  ): Promise<DeviceCategory[]> {
    if (!gamingCenterSlug?.trim()) {
      throw new Error("اسلاگ گیمنت نامعتبر است.");
    }

    const response = await apiClient.get<DeviceCategory[]>(
      ENDPOINTS.gamingCenter.deviceCategories(gamingCenterSlug.trim()),
      { signal }
    );

    const data = response.data;
    if (Array.isArray(data)) {
      // فقط دسته‌هایی که دستگاه دارند و نامعتبر نیستند
      return data.filter((c) => typeof c.deviceCount === "number" && c.deviceCount > 0);
    }

    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: DeviceCategory[] }).data)) {
      return (data as { data: DeviceCategory[] }).data.filter(
        (c) => typeof c.deviceCount === "number" && c.deviceCount > 0
      );
    }

    return [];
  },
};
