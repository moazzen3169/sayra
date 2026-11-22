"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/components/map/game-centers-map.css";
import { toPersianDigits } from "@/lib/format";
import { attachSairaTileLayer } from "@/lib/sairaLeafletTileLayer";

export interface ReservationRouteMapProps {
  destLat: number;
  destLng: number;
  destName?: string;
  destAddress?: string;
  fullHeight?: boolean;
}

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry?: {
    coordinates?: [number, number][];
  };
}

interface RouteData {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  isFallbackStraightLine: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDistanceFa(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) {
    return `${toPersianDigits(Math.round(meters))} متر`;
  }
  const km = (meters / 1000).toFixed(1).replace(/\.0$/, "");
  return `${toPersianDigits(km)} کیلومتر`;
}

function formatDurationFa(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return `${toPersianDigits(totalMinutes)} دقیقه`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return `${toPersianDigits(hours)} ساعت`;
  }
  return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(mins)} دقیقه`;
}

function haversineDistanceMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات مرورگر اجازه موقعیت مکانی را فعال کنید.";
    case 2:
      return "موقعیت مکانی شما در حال حاضر قابل تشخیص نیست.";
    case 3:
      return "زمان دریافت موقعیت مکانی به پایان رسید. لطفاً دوباره تلاش کنید.";
    default:
      return "دریافت موقعیت مکانی با خطا مواجه شد.";
  }
}

function createDestinationPinIcon(L: typeof LType, label: string): LType.DivIcon {
  const safeLabel = escapeHtml(label);
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
      <div style="padding:3px 8px;border-radius:8px;background:rgba(24,24,28,0.94);border:1px solid #B8F34A;color:#B8F34A;font-size:11px;font-weight:700;white-space:nowrap;margin-bottom:4px;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-family:inherit;">${safeLabel}</div>
      <svg width="30" height="36" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.55));">
        <path d="M12 1C6.477 1 2 5.477 2 11c0 7.5 10 16 10 16s10-8.5 10-16c0-5.523-4.477-10-10-10z" fill="#B8F34A" stroke="#101014" stroke-width="2"/>
        <circle cx="12" cy="11" r="3.5" fill="#101014"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: "sayra-leaflet-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createUserOriginIcon(L: typeof LType): LType.DivIcon {
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-75%);pointer-events:none;">
      <div style="padding:2px 7px;border-radius:7px;background:rgba(16,16,20,0.92);border:1px solid #38BDF8;color:#38BDF8;font-size:10px;font-weight:700;white-space:nowrap;margin-bottom:4px;box-shadow:0 4px 10px rgba(0,0,0,0.45);font-family:inherit;">مبدأ (شما)</div>
      <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(56,189,248,0.28);"></span>
        <span style="width:14px;height:14px;border-radius:9999px;background:#38BDF8;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></span>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "sayra-leaflet-user-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const ReservationRouteMap: React.FC<ReservationRouteMapProps> = ({
  destLat,
  destLng,
  destName,
  destAddress,
  fullHeight = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const routeLayerGroupRef = useRef<LType.LayerGroup | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);

  const [userPos, setUserPos] = useState<LatLngPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  const destLabel = destName?.trim() || "گیمنت";

  const fitMapBounds = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (routeData && routeData.coordinates.length > 1) {
      const bounds = L.latLngBounds(routeData.coordinates);
      bounds.extend([destLat, destLng]);
      if (userPos) bounds.extend([userPos.lat, userPos.lng]);
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 16, animate: true });
      return;
    }

    if (userPos) {
      const bounds = L.latLngBounds([
        [userPos.lat, userPos.lng],
        [destLat, destLng],
      ]);
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 16, animate: true });
      return;
    }

    map.setView([destLat, destLng], 15, { animate: true });
  }, [destLat, destLng, routeData, userPos]);

  // Initialize Leaflet OpenStreetMap with Sayra's unified dark vector style
  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let cleanupTileLayer: (() => void) | null = null;
    const container = containerRef.current;
    if (!container) return;

    import("leaflet").then((leafletModule) => {
      if (!isMounted || !containerRef.current) return;
      const L = leafletModule.default ?? leafletModule;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [destLat, destLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      });

      cleanupTileLayer = attachSairaTileLayer(map, L, { attribution: true });

      const group = L.layerGroup().addTo(map);
      L.marker([destLat, destLng], {
        icon: createDestinationPinIcon(L, destLabel),
      }).addTo(group);

      mapRef.current = map;
      routeLayerGroupRef.current = group;

      requestAnimationFrame(() => {
        if (isMounted) map.invalidateSize();
      });

      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(containerRef.current);
      }
    });

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (cleanupTileLayer) {
        cleanupTileLayer();
        cleanupTileLayer = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        routeLayerGroupRef.current = null;
      }
    };
  }, [destLat, destLng, destLabel]);

  // Fetch OSRM route geometry & summary on demand
  const fetchRoute = useCallback(
    (origin: LatLngPoint) => {
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
      }
      const controller = new AbortController();
      routeAbortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      setRouteLoading(true);
      setRouteError(null);

      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=false`;

      fetch(url, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
          return res.json();
        })
        .then((json: { code?: string; routes?: OsrmRoute[] }) => {
          if (controller.signal.aborted) return;
          const route = json.routes?.[0];
          const rawCoords = route?.geometry?.coordinates;
          if (!route || !Array.isArray(rawCoords) || rawCoords.length < 2) {
            throw new Error("مسیر معتبری یافت نشد");
          }

          const latLngCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

          setRouteData({
            coordinates: latLngCoords,
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            isFallbackStraightLine: false,
          });
        })
        .catch((err) => {
          if (routeAbortRef.current !== controller) return;
          const straightDist = haversineDistanceMeters(origin, { lat: destLat, lng: destLng });
          setRouteData({
            coordinates: [
              [origin.lat, origin.lng],
              [destLat, destLng],
            ],
            distanceMeters: straightDist,
            durationSeconds: Math.max(60, (straightDist / 1000 / 35) * 3600),
            isFallbackStraightLine: true,
          });
          setRouteError(
            err?.name === "AbortError"
              ? "پاسخ‌گویی سرویس مسیریابی طولانی شد؛ مسیر مستقیم نمایش داده شد."
              : "دریافت مسیر دقیق جاده‌ای موقتاً در دسترس نبود؛ مسیر مستقیم نمایش داده شد."
          );
        })
        .finally(() => {
          clearTimeout(timeoutId);
          if (routeAbortRef.current === controller) {
            setRouteLoading(false);
          }
        });
    },
    [destLat, destLng]
  );

  useEffect(() => {
    return () => {
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
      }
    };
  }, []);

  // Draw markers and Snapp-style route polyline on the Leaflet map
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const group = routeLayerGroupRef.current;
    if (!map || !L || !group) return;

    group.clearLayers();

    if (routeData && routeData.coordinates.length >= 2) {
      if (routeData.isFallbackStraightLine) {
        L.polyline(routeData.coordinates, {
          color: "#B8F34A",
          weight: 4,
          opacity: 0.85,
          dashArray: "8, 8",
        }).addTo(group);
      } else {
        // Outer glow + crisp Snapp-style inner path
        L.polyline(routeData.coordinates, {
          color: "#B8F34A",
          weight: 10,
          opacity: 0.25,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(group);

        L.polyline(routeData.coordinates, {
          color: "#B8F34A",
          weight: 4.5,
          opacity: 0.96,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(group);
      }
    }

    if (userPos) {
      L.marker([userPos.lat, userPos.lng], {
        icon: createUserOriginIcon(L),
      }).addTo(group);
    }

    L.marker([destLat, destLng], {
      icon: createDestinationPinIcon(L, destLabel),
    }).addTo(group);

    fitMapBounds();
  }, [userPos, routeData, destLat, destLng, destLabel, fitMapBounds]);

  const requestUserLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationError("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setUserPos(origin);
        setLocating(false);
        fetchRoute(origin);
      },
      (err) => {
        setLocationError(getGeolocationErrorMessage(err.code));
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }, [fetchRoute]);

  return (
    <div className={fullHeight ? "relative flex-1 w-full h-full flex flex-col" : "flex flex-col gap-3"}>
      {/* OpenStreetMap Container matching home page style */}
      <div
        className={
          fullHeight
            ? "sayra-map-frame relative flex-1 w-full h-full !rounded-none !border-0 bg-[var(--bg-body)]"
            : "sayra-map-frame relative w-full aspect-video rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-body)] shadow-inner"
        }
      >
        <div
          ref={containerRef}
          className="sayra-map-container w-full h-full"
          aria-label="نقشه OpenStreetMap مسیر تا گیمنت"
        />
        <div aria-hidden="true" className="sayra-map-vignette" />

        {/* Top-right floating map action button (Route CTA or Recenter) */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5">
          {!userPos ? (
            <button
              type="button"
              onClick={requestUserLocation}
              disabled={locating}
              title={`مسیریابی تا ${destLabel}`}
              className="h-8 px-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-65 text-on-primary text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              {locating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>در حال دریافت...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <circle cx="12" cy="12" r="3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2" />
                  </svg>
                  <span>{locationError ? "تلاش مجدد" : "مسیریابی"}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={fitMapBounds}
              className="h-8 px-2.5 rounded-lg bg-[#101014]/85 backdrop-blur-md border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1 shadow-md cursor-pointer"
              title="تنظیم مجدد نمای مسیر"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>نمای کامل</span>
            </button>
          )}
        </div>

        {/* Route loading pill */}
        {routeLoading && (
          <div className="absolute top-2.5 left-12 z-[400] h-8 px-3 rounded-lg bg-[#101014]/85 backdrop-blur-md border border-[var(--primary)]/40 text-[11px] font-bold text-[var(--primary)] flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-ping" />
            <span>در حال رسم مسیر...</span>
          </div>
        )}

        {/* Compact non-intrusive error pill only when location request fails */}
        {!userPos && locationError && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] rounded-lg bg-[#101014]/90 backdrop-blur-md border border-red-500/35 px-3 py-1.5 text-[11px] text-red-300 shadow-lg">
            {locationError}
          </div>
        )}
      </div>

      {/* Compact Snapp-style Route Summary Bar (Distance, ETA, Refresh, OpenStreetMap link) */}
      {userPos && routeData && (
        <div
          className={
            fullHeight
              ? "absolute inset-x-3 bottom-3 z-[400] max-w-xl mx-auto rounded-card bg-[#101014]/92 backdrop-blur-md border border-[var(--border-color)] p-3 flex flex-col gap-2.5 shadow-2xl"
              : "rounded-child bg-[var(--bg-body)]/65 border border-[var(--border-subtle)] p-3 flex flex-col gap-2.5"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-xs font-black text-[var(--primary)]">
                <span>فاصله:</span>
                <span>{formatDistanceFa(routeData.distanceMeters)}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--foreground)]/70 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)]">
                <span>زمان تقریبی:</span>
                <span>{formatDurationFa(routeData.durationSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={requestUserLocation}
                disabled={locating}
                className="h-7 px-2.5 rounded-lg bg-[var(--foreground)]/60 hover:bg-[var(--foreground)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-white)] transition-colors cursor-pointer"
                title="به‌روزرسانی موقعیت فعلی"
              >
                {locating ? "در حال بروزرسانی..." : "بروزرسانی مبدأ"}
              </button>
            </div>
          </div>

          {routeError && (
            <div className="flex items-center justify-between gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
              <span>{routeError}</span>
              <button
                type="button"
                onClick={() => userPos && fetchRoute(userPos)}
                className="font-bold underline shrink-0 cursor-pointer"
              >
                تلاش مجدد
              </button>
            </div>
          )}

          {destAddress && (
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)]/60 pt-2">
              <span className="font-bold text-[var(--text-white)]">نشانی مقصد: </span>
              {destAddress}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
