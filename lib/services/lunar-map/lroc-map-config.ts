export interface LrocLayerDefinition {
  id: string;
  name: string;
  wmsLayer: string;
  description: string;
  resolution: string;
  attribution: string;
}

export const LROC_LAYERS: LrocLayerDefinition[] = [
  {
    id: "lroc-wac-global",
    name: "LROC WAC Global (100m)",
    wmsLayer: "luna_wac_global",
    description: "Lunar Reconnaissance Orbiter Camera Wide Angle Camera Global Morphology Mosaic",
    resolution: "100 m/pixel",
    attribution: "NASA / GSFC / Arizona State University (LROC)",
  },
  {
    id: "lroc-color-shaded-relief",
    name: "LROC Color Shaded Relief",
    wmsLayer: "luna_wac_dtm",
    description: "LROC WAC Global Color Shaded Relief Topography",
    resolution: "100 m/pixel",
    attribution: "NASA / GSFC / ASU / USGS",
  },
  {
    id: "clementine-uvvis",
    name: "Clementine Color Ratio",
    wmsLayer: "luna_clem_ratio",
    description: "Clementine UVVIS 750nm / 950nm false-color multispectral ratio map",
    resolution: "200 m/pixel",
    attribution: "NASA / DOD / USGS / LPI",
  },
  {
    id: "lunar-orbiter",
    name: "Lunar Orbiter Mosaic",
    wmsLayer: "luna_lo",
    description: "Lunar Orbiter Global Mosaic (USGS / NASA)",
    resolution: "60 m/pixel",
    attribution: "NASA / USGS / LPI",
  },
];

export const LROC_DIRECT_WMS_BASE_URL = "https://wms.im-ldi.com/";
export const LROC_LOCAL_PROXY_URL = "/api/lunar-map";

/**
 * Builds a valid OGC WMS 1.1.1 GetMap request URL.
 * By default routes through the application proxy /api/lunar-map for reliability.
 */
export function buildLrocWmsUrl(params: {
  layer: string;
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  width?: number;
  height?: number;
  useDirectUpstream?: boolean;
}): string {
  const width = params.width || 800;
  const height = params.height || 600;

  const baseUrl = params.useDirectUpstream ? LROC_DIRECT_WMS_BASE_URL : LROC_LOCAL_PROXY_URL;
  const queryParams = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: params.layer,
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: `${params.minLon},${params.minLat},${params.maxLon},${params.maxLat}`,
    WIDTH: width.toString(),
    HEIGHT: height.toString(),
    FORMAT: "image/jpeg",
  });

  return `${baseUrl}?${queryParams.toString()}`;
}
