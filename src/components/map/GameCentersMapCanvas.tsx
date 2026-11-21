"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import maplibregl from "maplibre-gl";
import maplibreGL from "@maplibre/maplibre-gl-leaflet";
import {
  Circle,
  LayerGroup,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./game-centers-map.css";
import { Icon } from "@/components/ui/Icon";
import {
  DEFAULT_MAP_ZOOM,
  GAME_CENTERS_MAP_HEIGHT_CLASS,
  getCityDefaultViewport,
  SINGLE_MARKER_ZOOM,
} from "@/lib/gamecenterMap";
import { SAIRA_MAP_STYLE } from "@/lib/sairaMapStyle";
import { cn } from "@/lib/utils";
import type { ValidGameCenterLocation } from "@/types/gamecenterMap";

const RTL_PLUGIN_URL = "/vendor/mapbox-gl-rtl-text.js";
const MULTI_MARKER_FIT_MAX_ZOOM = 14.5;
const USER_LOCATE_ZOOM = 14.5;
const MAX_ACCURACY_CIRCLE_METERS = 1200;

let rtlPluginInitialized = false;

interface UserGeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

function ensureMaplibreRtlPlugin(): void {
  if (rtlPluginInitialized || typeof window === "undefined") return;
  try {
    const status = maplibregl.getRTLTextPluginStatus();
    if (status === "unavailable") {
      void maplibregl.setRTLTextPlugin(RTL_PLUGIN_URL, true).catch(() => {
        // Ignore if plugin fails to load; map continues rendering
      });
    }
    rtlPluginInitialized = true;
  } catch {
    rtlPluginInitialized = true;
  }
}

function isWebGLAvailable(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function getGeolocationErrorText(code: number): string {
  switch (code) {
    case 1:
      return "دسترسی به موقعیت مکانی داده نشد. دسترسی لوکیشن را در مرورگر فعال کنید.";
    case 2:
      return "دریافت موقعیت مکانی در حال حاضر امکان‌پذیر نیست.";
    case 3:
      return "زمان دریافت موقعیت مکانی به پایان رسید. دوباره تلاش کنید.";
    default:
      return "دریافت موقعیت مکانی انجام نشد.";
  }
}

export interface GameCentersMapCanvasProps {
  centers: ValidGameCenterLocation[];
  city?: string;
  onSelectCenter: (center: ValidGameCenterLocation) => void;
}

function createGameCenterPinIcon(): L.DivIcon {
  const html = `
    <div class="sayra-map-marker-root">
      <div class="sayra-map-marker">
        <span class="sayra-map-marker-pin-wrap" aria-hidden="true">
          <span class="sayra-map-marker-pin">
            <svg width="26" height="32" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1.5C6.753 1.5 2.5 5.753 2.5 11C2.5 18.1 12 28.2 12 28.2C12 28.2 21.5 18.1 21.5 11C21.5 5.753 17.247 1.5 12 1.5Z" fill="var(--primary)" stroke="var(--bg-body)" stroke-width="2"/>
              <circle cx="12" cy="11" r="3.4" fill="var(--bg-body)"/>
            </svg>
          </span>
          <span class="sayra-map-marker-anchor-ring"></span>
        </span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "sayra-map-marker-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createUserLocationIcon(): L.DivIcon {
  const html = `
    <div class="sayra-user-location-root">
      <div class="sayra-user-location">
        <span class="sayra-user-location-label" dir="rtl">موقعیت شما</span>
        <span class="sayra-user-location-dot" aria-hidden="true"></span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "sayra-user-location-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function computeBalancedFitPadding(map: L.Map): {
  paddingTopLeft: [number, number];
  paddingBottomRight: [number, number];
} {
  const size = map.getSize();
  const width = size.x > 0 ? size.x : 360;
  const height = size.y > 0 ? size.y : 320;

  const rawPadX = Math.max(64, Math.min(Math.round(width * 0.16), 220));
  const maxSafePadX = Math.max(24, Math.floor((width - 60) / 2));
  const padX = Math.min(rawPadX, maxSafePadX);

  const rawPadTop = Math.max(76, Math.round(height * 0.22));
  const rawPadBottom = Math.max(48, Math.round(height * 0.16));
  const totalVerticalBudget = Math.max(80, height - 60);
  const verticalScale =
    rawPadTop + rawPadBottom > totalVerticalBudget
      ? totalVerticalBudget / (rawPadTop + rawPadBottom)
      : 1;

  return {
    paddingTopLeft: [padX, Math.round(rawPadTop * verticalScale)],
    paddingBottomRight: [padX, Math.round(rawPadBottom * verticalScale)],
  };
}

function fitMapToCenters(
  map: L.Map,
  centers: ValidGameCenterLocation[],
  city: string | undefined,
  animate: boolean
): void {
  if (centers.length === 0) {
    const fallback = getCityDefaultViewport(city);
    map.setView([fallback.center[0], fallback.center[1]], fallback.zoom, {
      animate,
    });
    return;
  }

  if (centers.length === 1) {
    const only = centers[0];
    map.setView([only.lat, only.lng], SINGLE_MARKER_ZOOM, { animate });
    return;
  }

  const bounds = L.latLngBounds(centers.map((c) => [c.lat, c.lng]));
  if (bounds.isValid()) {
    const { paddingTopLeft, paddingBottomRight } = computeBalancedFitPadding(map);
    map.fitBounds(bounds, {
      paddingTopLeft,
      paddingBottomRight,
      maxZoom: MULTI_MARKER_FIT_MAX_ZOOM,
      animate,
    });
  }
}

/**
 * Custom OpenStreetMap vector tile layer styled with Saira's dark design tokens.
 * Automatically notifies `onFallback` if WebGL or vector tiles fail so the map
 * switches seamlessly to dark-filtered OpenStreetMap raster tiles.
 */
const SairaVectorTileLayer: React.FC<{ onFallback: () => void }> = ({
  onFallback,
}) => {
  const map = useMap();
  const onFallbackRef = useRef(onFallback);

  useEffect(() => {
    onFallbackRef.current = onFallback;
  }, [onFallback]);

  useEffect(() => {
    ensureMaplibreRtlPlugin();

    let layer: L.MaplibreGL | null = null;
    let glMap: maplibregl.Map | null = null;
    let failed = false;

    const handleError = () => {
      if (failed) return;
      failed = true;
      onFallbackRef.current();
    };

    try {
      layer = maplibreGL({
        style: SAIRA_MAP_STYLE,
        attributionControl: {
          customAttribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        },
      });
      layer.addTo(map);
      glMap = layer.getMaplibreMap();
      glMap.on("error", handleError);
    } catch {
      onFallbackRef.current();
    }

    return () => {
      if (glMap) {
        glMap.off("error", handleError);
      }
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };
  }, [map]);

  return null;
};

interface MapViewportControllerProps {
  centers: ValidGameCenterLocation[];
  city?: string;
  userLocation: UserGeoPosition | null;
  focusUserToken: number;
}

const MapViewportController: React.FC<MapViewportControllerProps> = ({
  centers,
  city,
  userLocation,
  focusUserToken,
}) => {
  const map = useMap();
  const lastBoundsKeyRef = useRef<string>("");
  const lastUserFocusTokenRef = useRef<number>(0);
  const hasUserInteractedRef = useRef<boolean>(false);
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const latestRef = useRef({ centers, city });

  useEffect(() => {
    latestRef.current = { centers, city };
  }, [centers, city]);

  const boundsKey = useMemo(() => {
    if (centers.length === 0) return `empty:${city ?? ""}`;
    return centers.map((c) => `${c.id}:${c.lat}:${c.lng}`).join("|");
  }, [centers, city]);

  const runProgrammaticFit = useCallback(
    (animate: boolean) => {
      isProgrammaticMoveRef.current = true;
      fitMapToCenters(
        map,
        latestRef.current.centers,
        latestRef.current.city,
        animate
      );
      requestAnimationFrame(() => {
        isProgrammaticMoveRef.current = false;
      });
    },
    [map]
  );

  // Track genuine user pan/zoom so ResizeObserver never overrides manual navigation
  useEffect(() => {
    const markUserInteraction = () => {
      if (!isProgrammaticMoveRef.current) {
        hasUserInteractedRef.current = true;
      }
    };

    map.on("dragstart", markUserInteraction);
    map.on("zoomstart", markUserInteraction);

    return () => {
      map.off("dragstart", markUserInteraction);
      map.off("zoomstart", markUserInteraction);
    };
  }, [map]);

  useEffect(() => {
    if (lastBoundsKeyRef.current === boundsKey) {
      return;
    }
    lastBoundsKeyRef.current = boundsKey;
    hasUserInteractedRef.current = false;
    runProgrammaticFit(false);
  }, [boundsKey, runProgrammaticFit]);

  // Center smoothly on the user's location when "من کجام" completes
  useEffect(() => {
    if (!userLocation || focusUserToken === 0) return;
    if (lastUserFocusTokenRef.current === focusUserToken) return;
    lastUserFocusTokenRef.current = focusUserToken;
    hasUserInteractedRef.current = true;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const targetZoom = Math.max(map.getZoom(), USER_LOCATE_ZOOM);
    if (prefersReducedMotion) {
      map.setView([userLocation.lat, userLocation.lng], targetZoom, {
        animate: false,
      });
    } else {
      map.flyTo([userLocation.lat, userLocation.lng], targetZoom, {
        duration: 0.7,
      });
    }
  }, [focusUserToken, map, userLocation]);

  useEffect(() => {
    const container = map.getContainer();
    let frameId = 0;
    let lastWidth = container.clientWidth;
    let lastHeight = container.clientHeight;

    const scheduleInvalidate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        const nextWidth = container.clientWidth;
        const nextHeight = container.clientHeight;
        if (
          !hasUserInteractedRef.current &&
          (nextWidth !== lastWidth || nextHeight !== lastHeight)
        ) {
          lastWidth = nextWidth;
          lastHeight = nextHeight;
          runProgrammaticFit(false);
        }
      });
    };

    scheduleInvalidate();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(frameId);
      };
    }

    const observer = new ResizeObserver(scheduleInvalidate);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [map, runProgrammaticFit]);

  return null;
};

const RecenterMapControl: React.FC<{
  centers: ValidGameCenterLocation[];
  city?: string;
}> = ({ centers, city }) => {
  const map = useMap();
  const latestRef = useRef({ centers, city });

  useEffect(() => {
    latestRef.current = { centers, city };
  }, [centers, city]);

  useEffect(() => {
    const RecenterControl = L.Control.extend({
      onAdd: () => {
        const wrapper = L.DomUtil.create(
          "div",
          "sayra-map-recenter-control leaflet-control"
        );
        const btn = L.DomUtil.create("button", "sayra-map-recenter-btn", wrapper);
        btn.type = "button";
        btn.setAttribute("aria-label", "تنظیم خودکار نمای نقشه");
        btn.setAttribute("title", "تنظیم خودکار نمای نقشه");
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>`;

        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.on(btn, "click", (e) => {
          L.DomEvent.stop(e);
          fitMapToCenters(
            map,
            latestRef.current.centers,
            latestRef.current.city,
            true
          );
        });

        return wrapper;
      },
    });

    const control = new RecenterControl({ position: "topleft" });
    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [map]);

  return null;
};

const UserLocationLayer: React.FC<{ location: UserGeoPosition }> = React.memo(
  ({ location }) => {
    const icon = useMemo(() => createUserLocationIcon(), []);
    const clampedAccuracy = Math.min(
      Math.max(Number.isFinite(location.accuracy) ? location.accuracy : 40, 25),
      MAX_ACCURACY_CIRCLE_METERS
    );

    return (
      <LayerGroup>
        <Circle
          center={[location.lat, location.lng]}
          radius={clampedAccuracy}
          interactive={false}
          pathOptions={{ className: "sayra-user-accuracy-circle" }}
        />
        <Marker
          position={[location.lat, location.lng]}
          icon={icon}
          interactive={false}
          keyboard={false}
          zIndexOffset={500}
          alt="موقعیت فعلی شما"
        />
      </LayerGroup>
    );
  }
);

UserLocationLayer.displayName = "UserLocationLayer";

interface GameCenterPinMarkerProps {
  center: ValidGameCenterLocation;
  onSelect: (center: ValidGameCenterLocation) => void;
}

const GameCenterPinMarker: React.FC<GameCenterPinMarkerProps> = React.memo(
  ({ center, onSelect }) => {
    const markerRef = useRef<L.Marker | null>(null);
    const closeTimerRef = useRef<number | null>(null);
    const icon = useMemo(() => createGameCenterPinIcon(), []);

    const clearCloseTimer = useCallback(() => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }, []);

    const scheduleClose = useCallback(() => {
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        markerRef.current?.closePopup();
      }, 180);
    }, [clearCloseTimer]);

    useEffect(() => {
      return () => {
        clearCloseTimer();
      };
    }, [clearCloseTimer]);

    const markerAriaLabel = `مشاهده گیمنت ${center.name}`;

    useEffect(() => {
      const el = markerRef.current?.getElement();
      if (el) {
        el.setAttribute("aria-label", markerAriaLabel);
      }
    }, [markerAriaLabel]);

    const eventHandlers = useMemo(
      () => ({
        add: (e: L.LeafletEvent) => {
          const marker = e.target as L.Marker | undefined;
          const el = marker?.getElement();
          if (el) {
            el.setAttribute("aria-label", markerAriaLabel);
          }
        },
        click: () => {
          clearCloseTimer();
          onSelect(center);
        },
        mouseover: () => {
          clearCloseTimer();
          markerRef.current?.openPopup();
        },
        mouseout: () => {
          scheduleClose();
        },
        popupopen: (e: L.PopupEvent) => {
          const popupEl = e.popup.getElement();
          if (!popupEl) return;
          popupEl.addEventListener("mouseenter", clearCloseTimer);
          popupEl.addEventListener("mouseleave", scheduleClose);
        },
        popupclose: (e: L.PopupEvent) => {
          const popupEl = e.popup.getElement();
          if (!popupEl) return;
          popupEl.removeEventListener("mouseenter", clearCloseTimer);
          popupEl.removeEventListener("mouseleave", scheduleClose);
        },
      }),
      [center, clearCloseTimer, markerAriaLabel, onSelect, scheduleClose]
    );

    const detailHref = `/gamecenter/${encodeURIComponent(center.id)}`;

    return (
      <Marker
        ref={markerRef}
        position={[center.displayLat, center.displayLng]}
        icon={icon}
        title={markerAriaLabel}
        alt={markerAriaLabel}
        keyboard={true}
        riseOnHover={true}
        eventHandlers={eventHandlers}
      >
        <Popup
          autoPan={true}
          autoPanPadding={[20, 20]}
          offset={[0, -34]}
          closeButton={false}
        >
          <div className="flex flex-col gap-2 p-2.5 text-right" dir="rtl">
            <p className="text-xs font-bold leading-5 text-[var(--text-white)] line-clamp-2">
              {center.name}
            </p>
            <Link
              href={detailHref}
              className="inline-flex h-8 w-full items-center justify-center rounded-card bg-[var(--primary)] px-3 text-xs font-bold text-on-primary transition-colors hover:bg-[var(--primary-hover)]"
            >
              مشاهده گیمنت
            </Link>
          </div>
        </Popup>
      </Marker>
    );
  }
);

GameCenterPinMarker.displayName = "GameCenterPinMarker";

interface GameCentersMarkerLayerProps {
  centers: ValidGameCenterLocation[];
  onSelectCenter: (center: ValidGameCenterLocation) => void;
}

/**
 * Isolated marker layer component; ready to be replaced by a clustering layer
 * if the number of connected centers scales significantly.
 */
const GameCentersMarkerLayer: React.FC<GameCentersMarkerLayerProps> = ({
  centers,
  onSelectCenter,
}) => (
  <LayerGroup>
    {centers.map((center) => (
      <GameCenterPinMarker
        key={center.id}
        center={center}
        onSelect={onSelectCenter}
      />
    ))}
  </LayerGroup>
);

export const GameCentersMapCanvas: React.FC<GameCentersMapCanvasProps> = ({
  centers,
  city,
  onSelectCenter,
}) => {
  const initialViewport = getCityDefaultViewport(city);
  const [useRasterFallback, setUseRasterFallback] = useState<boolean>(
    () => !isWebGLAvailable()
  );
  const [userLocation, setUserLocation] = useState<UserGeoPosition | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [focusUserToken, setFocusUserToken] = useState<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleFallback = useCallback(() => {
    setUseRasterFallback(true);
  }, []);

  const handleLocateUser = useCallback(() => {
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      setLocationError("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setIsLocating(false);
          setLocationError("مختصات دریافت‌شده معتبر نیست.");
          return;
        }
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setFocusUserToken((prev) => prev + 1);
        setIsLocating(false);
      },
      (err) => {
        if (!isMountedRef.current) return;
        setIsLocating(false);
        setLocationError(getGeolocationErrorText(err.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  return (
    <div className={cn("sayra-map-frame", GAME_CENTERS_MAP_HEIGHT_CLASS)}>
      <MapContainer
        center={[initialViewport.center[0], initialViewport.center[1]]}
        zoom={initialViewport.zoom ?? DEFAULT_MAP_ZOOM}
        minZoom={4}
        maxZoom={19}
        zoomSnap={0.25}
        zoomDelta={0.5}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        className="sayra-map-container"
      >
        {useRasterFallback ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            className="sayra-osm-dark-tile"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          />
        ) : (
          <SairaVectorTileLayer onFallback={handleFallback} />
        )}

        <MapViewportController
          centers={centers}
          city={city}
          userLocation={userLocation}
          focusUserToken={focusUserToken}
        />
        <RecenterMapControl centers={centers} city={city} />
        <GameCentersMarkerLayer
          centers={centers}
          onSelectCenter={onSelectCenter}
        />
        {userLocation && <UserLocationLayer location={userLocation} />}
      </MapContainer>

      <div aria-hidden="true" className="sayra-map-vignette" />

      {/* "من کجام" floating control (top-right in RTL) */}
      <div
        dir="rtl"
        className="absolute top-3 right-3 z-[400] flex flex-col items-start gap-2"
      >
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={isLocating}
          aria-label="من کجام - نمایش موقعیت مکانی شما روی نقشه"
          className="inline-flex h-9 items-center gap-1.5 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)]/92 px-3 text-xs font-bold text-[var(--text-white)] shadow-md backdrop-blur-md transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-75 cursor-pointer"
        >
          {isLocating ? (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
            />
          ) : (
            <Icon
              name="navigation"
              size={14}
              className={cn(
                "shrink-0 transition-colors",
                userLocation ? "text-[var(--primary)]" : "text-current"
              )}
            />
          )}
          <span>{isLocating ? "در حال یافتن..." : "من کجام"}</span>
        </button>

        {locationError && (
          <div
            role="status"
            className="flex max-w-[260px] items-start gap-2 rounded-card border border-[var(--accent-red)]/35 bg-[var(--bg-card)]/95 px-3 py-2 text-xs leading-5 text-[var(--text-white)] shadow-lg backdrop-blur-md"
          >
            <Icon
              name="alert"
              size={15}
              className="mt-0.5 shrink-0 text-[var(--accent-red)]"
            />
            <span className="flex-1">{locationError}</span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              aria-label="بستن پیام خطا"
              className="shrink-0 rounded-child p-0.5 text-[var(--text-muted)] hover:text-[var(--text-white)] cursor-pointer"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
      </div>

      {centers.length === 0 && (
        <div
          dir="rtl"
          className="pointer-events-none absolute inset-0 z-[390] flex items-center justify-center p-4"
        >
          <div className="flex items-center gap-2 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)]/95 px-4 py-3 text-xs font-medium text-[var(--text-white)] shadow-lg backdrop-blur">
            <Icon
              name="pin"
              size={16}
              className="text-[var(--primary)] shrink-0"
            />
            <span>
              {city
                ? `در حال حاضر گیمنتی در شهر ${city} روی نقشه ثبت نشده است.`
                : "در حال حاضر گیمنتی روی نقشه ثبت نشده است."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
