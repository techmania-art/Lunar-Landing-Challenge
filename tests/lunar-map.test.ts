import { describe, it, expect } from "vitest";
import {
  buildLrocWmsUrl,
  LROC_LAYERS,
  LROC_DIRECT_WMS_BASE_URL,
  LROC_LOCAL_PROXY_URL,
} from "@/lib/services/lunar-map/lroc-map-config";
import { getLrocLayerById, getAllLrocLayers } from "@/lib/services/lunar-map/lroc-layer-metadata";

describe("LROC Map WMS Configuration & Adapter", () => {
  it("provides verified published layer names matching official LROC GetCapabilities", () => {
    const layers = getAllLrocLayers();
    const wmsLayerNames = layers.map((l) => l.wmsLayer);

    expect(wmsLayerNames).toContain("luna_wac_global");
    expect(wmsLayerNames).toContain("luna_wac_dtm");
    expect(wmsLayerNames).toContain("luna_clem_ratio");
    expect(wmsLayerNames).toContain("luna_lo");

    // Ensure guessed/unverified layer names are not present
    expect(wmsLayerNames).not.toContain("wac_global");
    expect(wmsLayerNames).not.toContain("wac_color_shade");
    expect(wmsLayerNames).not.toContain("clementine");
  });

  it("constructs valid OGC WMS 1.1.1 GetMap URL with correct parameters", () => {
    const directUrl = buildLrocWmsUrl({
      layer: "luna_wac_global",
      minLon: -20,
      minLat: -90,
      maxLon: 20,
      maxLat: -75,
      width: 800,
      height: 600,
      useDirectUpstream: true,
    });

    expect(directUrl).toContain(LROC_DIRECT_WMS_BASE_URL);
    expect(directUrl).toContain("SERVICE=WMS");
    expect(directUrl).toContain("VERSION=1.1.1");
    expect(directUrl).toContain("REQUEST=GetMap");
    expect(directUrl).toContain("LAYERS=luna_wac_global");
    expect(directUrl).toContain("SRS=EPSG%3A4326");
    expect(directUrl).toContain("BBOX=-20%2C-90%2C20%2C-75");
    expect(directUrl).toContain("WIDTH=800");
    expect(directUrl).toContain("HEIGHT=600");
    expect(directUrl).toContain("FORMAT=image%2Fjpeg");
  });

  it("constructs local application proxy URL by default", () => {
    const proxyUrl = buildLrocWmsUrl({
      layer: "luna_wac_global",
      minLon: -30,
      minLat: -90,
      maxLon: 30,
      maxLat: -60,
    });

    expect(proxyUrl.startsWith(LROC_LOCAL_PROXY_URL)).toBe(true);
    expect(proxyUrl).toContain("LAYERS=luna_wac_global");
    expect(proxyUrl).toContain("SRS=EPSG%3A4326");
  });

  it("retrieves layer metadata by ID safely with default fallback", () => {
    const globalLayer = getLrocLayerById("lroc-wac-global");
    expect(globalLayer.wmsLayer).toBe("luna_wac_global");
    expect(globalLayer.name).toBe("LROC WAC Global (100m)");

    const fallbackLayer = getLrocLayerById("non-existent-id");
    expect(fallbackLayer).toBe(LROC_LAYERS[0]);
  });
});

