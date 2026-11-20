"use client";

import React, { useEffect, useRef } from "react";
import type * as LType from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/components/map/game-centers-map.css";
import { attachSairaTileLayer } from "@/lib/sairaLeafletTileLayer";
import { cn } from "@/lib/utils";

export interface LeafletMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactive?: boolean;
  onSelect?: (lat: number, lng: number) => void;
  markerLabel?: string;
  className?: string;
}

function createPinIcon(L: typeof LType, label?: string): LType.DivIcon {
  const safeLabel = label
    ? label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "";

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
      ${
        safeLabel
          ? `<div style="padding:2px 8px;border-radius:6px;background:rgba(31,31,35,0.92);border:1px solid #B8F34A;color:#B8F34A;font-size:11px;font-weight:700;white-space:nowrap;margin-bottom:4px;box-shadow:0 4px 12px rgba(0,0,0,0.45);font-family:inherit;">${safeLabel}</div>`
          : ""
      }
      <svg width="32" height="38" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
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

export const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  zoom,
  interactive = false,
  onSelect,
  markerLabel,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const markerRef = useRef<LType.Marker | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let cleanupTileLayer: (() => void) | null = null;
    const container = containerRef.current;
    if (!container) return;

    const initialZoom = zoom ?? (interactive ? 14 : 15);

    import("leaflet").then((leafletModule) => {
      if (!isMounted || !containerRef.current) return;
      const L = leafletModule.default ?? leafletModule;

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: initialZoom,
        zoomControl: interactive,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
      });

      cleanupTileLayer = attachSairaTileLayer(map, L, { attribution: false });

      const marker = L.marker([latitude, longitude], {
        icon: createPinIcon(L, markerLabel),
        draggable: interactive,
      }).addTo(map);

      if (interactive) {
        map.on("click", (e: LType.LeafletMouseEvent) => {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          onSelectRef.current?.(newLat, newLng);
        });

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          onSelectRef.current?.(newLat, newLng);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;

      // Ensure tiles and dimensions render properly inside modals/tabs
      requestAnimationFrame(() => {
        if (isMounted) map.invalidateSize();
      });
      setTimeout(() => {
        if (isMounted) map.invalidateSize();
      }, 250);

      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(containerRef.current);
      }
    });

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (cleanupTileLayer) {
        cleanupTileLayer();
        cleanupTileLayer = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Initialize map once per interactive/zoom mode; coordinate updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // Sync marker position and map center/zoom when coordinates change externally
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const current = marker.getLatLng();
    if (
      Math.abs(current.lat - latitude) > 1e-6 ||
      Math.abs(current.lng - longitude) > 1e-6
    ) {
      marker.setLatLng([latitude, longitude]);
      map.setView([latitude, longitude], zoom ?? map.getZoom(), { animate: true });
    }
  }, [latitude, longitude, zoom]);

  // Update marker label if it changes
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default ?? leafletModule;
      marker.setIcon(createPinIcon(L, markerLabel));
    });
  }, [markerLabel]);

  return (
    <div
      className={cn(
        "sayra-map-frame relative z-0 w-full h-56 sm:h-64 rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-body)]",
        className
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "sayra-map-container w-full h-full",
          interactive ? "cursor-crosshair" : "cursor-default"
        )}
      />
      <div aria-hidden="true" className="sayra-map-vignette" />
    </div>
  );
};
