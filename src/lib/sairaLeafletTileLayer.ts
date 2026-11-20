import type * as LType from "leaflet";
import type maplibreglType from "maplibre-gl";
import { SAIRA_MAP_STYLE } from "@/lib/sairaMapStyle";

const RTL_PLUGIN_URL = "/vendor/mapbox-gl-rtl-text.js";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

let rtlPluginInitialized = false;

export function isWebGLAvailable(): boolean {
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

function ensureMaplibreRtlPlugin(maplibregl: typeof maplibreglType): void {
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

export interface AttachSairaTileLayerOptions {
  attribution?: boolean;
}

/**
 * Attaches Sayra's custom OpenStreetMap dark vector tile layer (matching the home page map)
 * to a Leaflet map instance, with automatic fallback to dark-filtered OSM raster tiles
 * if WebGL or vector tiles are unavailable.
 */
export function attachSairaTileLayer(
  map: LType.Map,
  L: typeof LType,
  options: AttachSairaTileLayerOptions = {}
): () => void {
  const showAttribution = options.attribution ?? true;
  let disposed = false;
  let vectorLayer: LType.MaplibreGL | null = null;
  let glMap: maplibreglType.Map | null = null;
  let rasterLayer: LType.TileLayer | null = null;

  const attachRasterFallback = () => {
    if (disposed || rasterLayer) return;
    if (vectorLayer && map.hasLayer(vectorLayer)) {
      map.removeLayer(vectorLayer);
    }
    rasterLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "sayra-osm-dark-tile",
      attribution: showAttribution ? OSM_ATTRIBUTION : "",
    }).addTo(map);
  };

  if (!isWebGLAvailable()) {
    attachRasterFallback();
    return () => {
      disposed = true;
      if (rasterLayer && map.hasLayer(rasterLayer)) {
        map.removeLayer(rasterLayer);
      }
    };
  }

  Promise.all([import("maplibre-gl"), import("@maplibre/maplibre-gl-leaflet")])
    .then(([maplibreMod, maplibreLeafletMod]) => {
      if (disposed) return;
      const maplibregl = maplibreMod.default ?? maplibreMod;
      const maplibreGL = maplibreLeafletMod.default ?? maplibreLeafletMod;

      ensureMaplibreRtlPlugin(maplibregl);

      vectorLayer = maplibreGL({
        style: SAIRA_MAP_STYLE,
        attributionControl: showAttribution
          ? { customAttribution: OSM_ATTRIBUTION }
          : false,
      });
      vectorLayer.addTo(map);

      glMap = vectorLayer.getMaplibreMap();
      glMap.on("error", attachRasterFallback);
    })
    .catch(() => {
      attachRasterFallback();
    });

  return () => {
    disposed = true;
    if (glMap) {
      glMap.off("error", attachRasterFallback);
    }
    if (vectorLayer && map.hasLayer(vectorLayer)) {
      map.removeLayer(vectorLayer);
    }
    if (rasterLayer && map.hasLayer(rasterLayer)) {
      map.removeLayer(rasterLayer);
    }
  };
}
