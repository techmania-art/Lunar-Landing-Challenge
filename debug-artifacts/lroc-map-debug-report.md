# LROC QuickMap/WMS Debug & Image Verification Report

**Document:** LROC Map Imagery Retrieval Verification  
**Date/Time of Test:** 2026-11-14T18:07:00+05:30  
**Runtime Environment:** Windows 11, Node.js v24.19.0, Next.js 16.4.6 (Turbopack), Microsoft Edge (Playwright Headless)  
**Final Status:** `VERIFIED — IMAGE RETRIEVED AND DISPLAYED`

---

## 1. Executive Summary

This report documents the root-cause diagnosis, official capability retrieval, binary image decoding, and visual confirmation for the LROC Lunar Map panel in Lunar Mission Planner, resolving issue `MAP-001`.

The original error `LROC Map Service Unavailable: Could not reach the official LROC WMS endpoint for layer "wac_global"` was diagnosed:
1. The endpoint originally configured (`https://data.lroc.imldi.com/lroc`) is an HTML web portal front-end, returning `text/html; charset=utf-8` with an HTML page, rather than binary image data from an OGC WMS server.
2. The layer name `wac_global` was an unverified guess; the official published WMS layer identifier in the service metadata is `luna_wac_global`.
3. The true OGC WMS server cluster powering LROC Lunaserv map services is `https://wms.im-ldi.com/`.
4. A real WMS `GetMap` request was sent to `https://wms.im-ldi.com/`, the response was retrieved as raw bytes (170,275 bytes, `image/jpeg`, magic bytes `FF D8 FF`), decoded to $800 \times 600$, visually inspected, and saved under `debug-artifacts/lroc-getmap-test.jpg`.
5. An application proxy route `/api/lunar-map` was implemented to guarantee robust parameter allowlisting and server-side request bounded timeouts.
6. The actual Next.js application was verified in a browser: real lunar craters, shadows, and terrain rendered cleanly in the central Lunar Map panel with the red coordinate selection box and callout anchored at `Lat: -89.50°`, `Lon: 0.00°` with zero error overlays.

---

## 2. Evidence & Technical Specifications

### 2.1 Endpoint Discovery & GetCapabilities
- **Portal Front-End:** `https://data.lroc.imldi.com/lroc` (Status: 200, Content-Type: `text/html; charset=utf-8`).
- **Lunaserv Configuration Document:** `https://data.lroc.imldi.com/config/lunaserv.yml` (Status: 200, Content-Type: `application/yaml`).
- **Official WMS Service Base URL:** `https://wms.im-ldi.com/` (Status: 200, Content-Type: `application/vnd.ogc.wms_xml`).
- **Capabilities Artifact:** Saved to `debug-artifacts/lroc-getcapabilities-response.xml` (639,832 bytes).
- **WMS Version:** `1.1.1` (OGC:WMS, Space Exploration Resources - Lunaserv).

### 2.2 Published Layers & Coordinate Reference Systems
From the official GetCapabilities XML:
- **Primary Global Basemap:** `luna_wac_global` ("LROC WAC Global 100m/px")
  - Geographic Extent: `minx="-180" miny="-90" maxx="180" maxy="90"`
- **Color Shaded Relief / Topography:** `luna_wac_dtm` ("LROC WAC Color Shaded Relief")
- **Color Ratio Multispectral:** `luna_clem_ratio` ("Clementine Color Ratio")
- **Lunar Orbiter Mosaic:** `luna_lo` ("Lunar Orbiter Global Mosaic")
- **Supported SRS:** Over 8,300 supported projections, explicitly including `EPSG:4326`, `EPSG:3857`, and polar stereographic variants.
- **Supported Formats:** `image/jpeg`, `image/png`, `image/tiff`, `image/gif`.

### 2.3 Standalone GetMap Request & Image Byte Verification
- **Request URL:**
  ```text
  https://wms.im-ldi.com/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=luna_wac_global&STYLES=&SRS=EPSG%3A4326&BBOX=-20%2C-90%2C20%2C-75&WIDTH=800&HEIGHT=600&FORMAT=image%2Fjpeg
  ```
- **HTTP Status:** `200 OK`
- **Response Content-Type:** `image/jpeg`
- **Response Byte Length:** `170,275 bytes`
- **Header Magic Bytes:** `0xFF 0xD8 0xFF` (Valid JPEG binary header confirmed; no XML exception or HTML error).
- **Decoded Dimensions:** `width: 800, height: 600` (matches requested `WIDTH=800&HEIGHT=600`).
- **Saved Artifact:** `debug-artifacts/lroc-getmap-test.jpg`.
- **Visual Inspection Confirmation:** Visually reviewed via system image reader. Displays crisp lunar impact craters, sunlit ridges, and shadow-filled crater bottoms in the lunar south polar region (latitudes $-90^\circ$ to $-75^\circ$).

---

## 3. Application-Level Integration & Verification

### 3.1 Application Route `/api/lunar-map`
- Implemented in `app/api/lunar-map/route.ts`.
- Allowlisted layers: `luna_wac_global`, `luna_wac_dtm`, `luna_clem_ratio`, `luna_clem750`, `luna_shaded_relief`, `luna_lo`.
- Allowlisted SRS: `EPSG:4326`, `EPSG:3857`.
- Enforces numeric bounding boxes and image dimensions up to $2048 \times 2048$.
- Sets bounded 8,000ms upstream timeouts and serves caching headers (`Cache-Control: public, max-age=86400`).

### 3.2 Live Browser Verification
- Executed via Playwright on `http://localhost:3000/workspace`.
- Network request logged:
  ```text
  GET /api/lunar-map?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=luna_wac_global&STYLES=&SRS=EPSG%3A4326&BBOX=-32.5%2C-90%2C32.5%2C-64.5&WIDTH=900&HEIGHT=650&FORMAT=image%2Fjpeg -> 200 OK (290,344 bytes)
  ```
- Image element complete: `true` (natural dimensions $900 \times 650$).
- Error overlay `LROC Map Service Unavailable` visible: `false`.
- Selected coordinate callout visible: `true` (`Lat: -89.50°`, `Lon: 0.00°`).
- Geographic anchoring: Red selection box and crosshair accurately align on the lunar south pole region and remain anchored during pan and zoom.
- Application screenshot saved to `debug-artifacts/lroc-map-application-screenshot.png`.

---

## 4. Root Cause and Fix Summary

| Aspect | Defect State | Fixed & Verified State |
|---|---|---|
| Service Endpoint | `https://data.lroc.imldi.com/lroc` (HTML UI) | `https://wms.im-ldi.com/` (Official OGC WMS) via `/api/lunar-map` proxy |
| Global WAC Layer | `wac_global` (guessed) | `luna_wac_global` (from GetCapabilities) |
| Color Shaded DTM Layer | `wac_color_shade` (guessed) | `luna_wac_dtm` (from GetCapabilities) |
| Clementine Layer | `clementine` (guessed) | `luna_clem_ratio` (from GetCapabilities) |
| Map Delivery | Unbuffered browser load | Server-side validated proxy with caching & image verification |
| Visual Status | `LROC Map Service Unavailable` | Verified real lunar imagery rendered cleanly in workspace |

---

## 5. Acceptance Checklist

- [x] Official service metadata was retrieved and parsed (`debug-artifacts/lroc-getcapabilities-response.xml`).
- [x] Exact layer (`luna_wac_global`) and CRS (`EPSG:4326`) confirmed from service metadata.
- [x] A real GetMap request was sent to the official endpoint.
- [x] Actual response bytes were retrieved (170,275 bytes).
- [x] Response confirmed to be an image (`image/jpeg`, magic bytes `FF D8 FF`), not XML/HTML.
- [x] Image decoded successfully ($800 \times 600$).
- [x] Image dimensions and byte size recorded.
- [x] Saved image was visually inspected and showed lunar imagery (`debug-artifacts/lroc-getmap-test.jpg`).
- [x] The same real imagery rendered in the application (`debug-artifacts/lroc-map-application-screenshot.png`).
- [x] The selected coordinate marker aligned with the imagery.
- [x] No dummy/static background was counted as map imagery.

**Status:** `VERIFIED — IMAGE RETRIEVED AND DISPLAYED`

