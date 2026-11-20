import type { MapOptions } from "maplibre-gl";

export type SairaVectorStyle = Exclude<NonNullable<MapOptions["style"]>, string>;

export const OPENFREEMAP_TILEJSON_URL = "https://tiles.openfreemap.org/planet";
export const OPENFREEMAP_GLYPHS_URL =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

const PERSIAN_NAME_EXPRESSION: [
  "coalesce",
  ["get", string],
  ["get", string],
  ["get", string],
  ["get", string],
] = [
  "coalesce",
  ["get", "name:fa"],
  ["get", "name"],
  ["get", "name:nonlatin"],
  ["get", "name:en"],
];

/**
 * Custom minimal dark vector map style tailored to Saira's design tokens:
 * - Land: #101014 (--bg-body)
 * - Buildings: #1B1B21 with #282832 outline
 * - Parks / Green spaces: muted botanical olive (#152218 / #18291B)
 * - Water & Rivers: deep midnight slate (#0E1A26 / #142638)
 * - Streets: graphite hierarchy (#26262F -> #3D3E48) with warm olive-tinted motorways (#45483A)
 * - Decluttered: POIs, transit icons, and one-way arrows removed; Persian labels prioritized
 */
export const SAIRA_MAP_STYLE: SairaVectorStyle = {
  version: 8,
  name: "Sayra Dark Minimal",
  sources: {
    openmaptiles: {
      type: "vector",
      url: OPENFREEMAP_TILEJSON_URL,
    },
  },
  glyphs: OPENFREEMAP_GLYPHS_URL,
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#101014",
      },
    },
    {
      id: "landuse_residential",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      maxzoom: 14,
      filter: ["==", ["get", "class"], "residential"],
      paint: {
        "fill-color": "#131318",
        "fill-opacity": 0.75,
      },
    },
    {
      id: "landcover_wood",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      minzoom: 8,
      filter: [
        "match",
        ["get", "class"],
        ["wood", "forest", "grass"],
        true,
        false,
      ],
      paint: {
        "fill-color": "#152218",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.35, 13, 0.85],
      },
    },
    {
      id: "landuse_park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      minzoom: 9,
      filter: [
        "match",
        ["get", "class"],
        ["park", "grass", "cemetery", "recreation_ground", "village_green"],
        true,
        false,
      ],
      paint: {
        "fill-color": "#18291B",
        "fill-outline-color": "#233A25",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.45, 14, 0.9],
      },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: {
        "fill-antialias": true,
        "fill-color": "#0E1A26",
        "fill-outline-color": "#182C40",
      },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#142638",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 14, 2.4, 18, 5],
      },
    },
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-antialias": true,
        "fill-color": "#1B1B21",
        "fill-outline-color": "#282832",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.2, 0.92],
      },
    },
    {
      id: "highway_path",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 14,
      filter: [
        "match",
        ["get", "class"],
        ["path", "pedestrian", "footway"],
        true,
        false,
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#1E1E24",
        "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.75, 18, 2.5],
      },
    },
    {
      id: "highway_minor_casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 12,
      filter: [
        "match",
        ["get", "class"],
        ["minor", "service", "track"],
        true,
        false,
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#15151A",
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 12, 1.4, 18, 12],
      },
    },
    {
      id: "highway_minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 11,
      filter: [
        "match",
        ["get", "class"],
        ["minor", "service", "track"],
        true,
        false,
      ],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#26262F",
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 11, 0.6, 18, 10],
      },
    },
    {
      id: "highway_secondary_casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 9,
      filter: ["match", ["get", "class"], ["secondary", "tertiary"], true, false],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#17171D",
        "line-width": ["interpolate", ["exponential", 1.45], ["zoom"], 9, 1.2, 18, 16],
      },
    },
    {
      id: "highway_secondary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 9,
      filter: ["match", ["get", "class"], ["secondary", "tertiary"], true, false],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#31313B",
        "line-width": ["interpolate", ["exponential", 1.45], ["zoom"], 9, 0.8, 18, 13.5],
      },
    },
    {
      id: "highway_primary_casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 7,
      filter: ["match", ["get", "class"], ["primary", "trunk"], true, false],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#141419",
        "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 7, 1.4, 18, 20],
      },
    },
    {
      id: "highway_primary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 7,
      filter: ["match", ["get", "class"], ["primary", "trunk"], true, false],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#3D3E48",
        "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 7, 0.9, 18, 17],
      },
    },
    {
      id: "highway_motorway_casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 5,
      filter: ["==", ["get", "class"], "motorway"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#262A1E",
        "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 5, 1.5, 18, 24],
      },
    },
    {
      id: "highway_motorway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 5,
      filter: ["==", ["get", "class"], "motorway"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#454A38",
        "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 5, 1, 18, 20],
      },
    },
    {
      id: "boundary_country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 2],
      paint: {
        "line-color": "#2E2E35",
        "line-width": 1.2,
      },
    },
    {
      id: "boundary_state",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 5,
      filter: ["==", ["get", "admin_level"], 4],
      paint: {
        "line-color": "#25252A",
        "line-width": 0.8,
        "line-dasharray": [3, 2],
      },
    },
    {
      id: "water_name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      minzoom: 10,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 450,
        "text-field": PERSIAN_NAME_EXPRESSION,
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
      },
      paint: {
        "text-color": "#5E81A3",
        "text-halo-color": "#0E1A26",
        "text-halo-width": 1.4,
      },
    },
    {
      id: "highway_name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 320,
        "text-field": PERSIAN_NAME_EXPRESSION,
        "text-font": ["Noto Sans Regular"],
        "text-max-angle": 30,
        "text-rotation-alignment": "map",
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10.5, 17, 12.5],
      },
      paint: {
        "text-color": "#9CA3AF",
        "text-halo-color": "#101014",
        "text-halo-width": 1.6,
      },
    },
    {
      id: "place_suburb",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 11,
      maxzoom: 15,
      filter: [
        "match",
        ["get", "class"],
        ["suburb", "neighbourhood", "quarter"],
        true,
        false,
      ],
      layout: {
        "text-field": PERSIAN_NAME_EXPRESSION,
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 14, 13],
      },
      paint: {
        "text-color": "#9CA3AF",
        "text-halo-color": "#101014",
        "text-halo-width": 1.6,
      },
    },
    {
      id: "place_city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      maxzoom: 13,
      filter: ["match", ["get", "class"], ["city", "town"], true, false],
      layout: {
        "text-field": PERSIAN_NAME_EXPRESSION,
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 10, 15],
      },
      paint: {
        "text-color": "#E5E7EB",
        "text-halo-color": "#101014",
        "text-halo-width": 1.8,
      },
    },
  ],
};
