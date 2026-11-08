/**
 * Types for GameNet Device Categories
 * Based on GET /api/v1/public/gamingCenters/:gamingCenterSlug/device-categories
 */

export interface DeviceCategory {
  catalogId: string | null;
  name: string;
  deviceType: string;
  coverImageUrl?: string | null;
  deviceCount: number;
}
