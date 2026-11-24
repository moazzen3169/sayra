import { describe, it, expect } from "bun:test";
import {
  applyDuplicateCoordinateOffsets,
  CITY_FALLBACK_ZOOM,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getCityDefaultViewport,
  isValidLatitude,
  isValidLongitude,
  normalizeGameCenters,
  parseCoordinate,
} from "./gamecenterMap";

describe("gamecenterMap utilities", () => {
  it("parses valid numeric strings and rejects empty or malformed inputs", () => {
    expect(parseCoordinate("38.078023")).toBe(38.078023);
    expect(parseCoordinate("  46.295439  ")).toBe(46.295439);
    expect(parseCoordinate(-33.8688)).toBe(-33.8688);
    expect(parseCoordinate("0")).toBe(0);

    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("   ")).toBeNull();
    expect(parseCoordinate("abc")).toBeNull();
    expect(parseCoordinate(NaN)).toBeNull();
    expect(parseCoordinate(Infinity)).toBeNull();
    expect(parseCoordinate(null)).toBeNull();
    expect(parseCoordinate(undefined)).toBeNull();
  });

  it("validates latitude and longitude ranges", () => {
    expect(isValidLatitude(38.078023)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(90.001)).toBe(false);
    expect(isValidLatitude(-90.001)).toBe(false);

    expect(isValidLongitude(46.295439)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(180.001)).toBe(false);
    expect(isValidLongitude(-180.001)).toBe(false);
  });

  it("normalizes OpenAPI GamingCenterMapItem (latitude/longitude) and filters invalid entries", () => {
    const normalized = normalizeGameCenters([
      {
        id: "cmwlxvn5r0014137pppik07te",
        name: "گیم‌نت شتاب",
        latitude: 35.7152,
        longitude: 51.4043,
        rating: 4.6,
        ratingCount: 12,
      },
      {
        lat: "38.078023",
        lng: "46.295439",
        id: "legacy-item",
        name: "سایرا",
      },
      {
        latitude: "not-a-number",
        longitude: 46.295439,
        id: "bad-lat",
        name: "نامعتبر",
      },
      {
        latitude: 95,
        longitude: 46.295439,
        id: "out-of-bounds",
        name: "خارج محدوده",
      },
      {
        latitude: 35.6892,
        longitude: "",
        id: "empty-lng",
        name: "خالی",
      },
      {
        latitude: 35.6892,
        longitude: 51.389,
        id: "  ",
        name: "بدون شناسه",
      },
      null,
      "bad-item",
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toEqual({
      id: "cmwlxvn5r0014137pppik07te",
      name: "گیم‌نت شتاب",
      lat: 35.7152,
      lng: 51.4043,
      displayLat: 35.7152,
      displayLng: 51.4043,
      rating: 4.6,
      ratingCount: 12,
    });
    expect(normalized[1].rating).toBe(0);
    expect(normalized[1].ratingCount).toBe(0);
  });

  it("resolves city fallback viewport for known cities and defaults to Iran", () => {
    const tehran = getCityDefaultViewport("تهران");
    expect(tehran.zoom).toBe(CITY_FALLBACK_ZOOM);
    expect(tehran.center[0]).toBeCloseTo(35.6892, 3);

    const unknown = getCityDefaultViewport("شهر نامشخص");
    expect(unknown.zoom).toBe(DEFAULT_MAP_ZOOM);
    expect(unknown.center).toEqual(DEFAULT_MAP_CENTER);
  });

  it("applies distinct display offsets when multiple centers share identical coordinates", () => {
    const positioned = applyDuplicateCoordinateOffsets([
      { id: "c1", name: "مرکز ۱", lat: 38.078023, lng: 46.295439 },
      { id: "c2", name: "مرکز ۲", lat: 38.078023, lng: 46.295439 },
      { id: "c3", name: "مرکز ۳", lat: 35.6892, lng: 51.389 },
    ]);

    expect(positioned).toHaveLength(3);
    const samePosition =
      positioned[0].displayLat === positioned[1].displayLat &&
      positioned[0].displayLng === positioned[1].displayLng;
    expect(samePosition).toBe(false);
    // Original coordinates remain intact for accurate bounds calculation
    expect(positioned[0].lat).toBe(38.078023);
    expect(positioned[1].lat).toBe(38.078023);
    // Unique coordinate stays un-offset
    expect(positioned[2].displayLat).toBe(35.6892);
    expect(positioned[2].displayLng).toBe(51.389);
  });
});
