/**
 * OpenAPI GamingCenterMapItem returned by GET /public/gaming-centers/map.
 */
export interface GamingCenterMapItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Raw connected game center item accepted by the map normalizer.
 * Supports the OpenAPI schema (`latitude`/`longitude`) as well as legacy `lat`/`lng`.
 */
export interface GameCenter {
  id: string;
  name: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: string | number;
  lng?: string | number;
}

/**
 * Expected API response envelope for connected game centers.
 */
export interface ConnectedGameCentersApiResponse {
  success: boolean;
  data: GameCenter[];
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Validated and numeric-normalized game center location ready for Leaflet rendering.
 * `displayLat`/`displayLng` may carry a tiny deterministic offset when multiple centers
 * share identical coordinates so every marker and label remains individually clickable.
 */
export interface ValidGameCenterLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  displayLat: number;
  displayLng: number;
}
