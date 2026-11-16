# Step — Fix Moon Trek WMTS 403 Errors and Restore the Lunar Globe

## Objective

Fix the current Phase 3 rendering failure in the **existing** Cesium lunar simulation. The latest browser evidence shows repeated HTTP `403` responses from requests whose visible URL pattern ends with `1.0.0/?service=WMTS&version=...`, followed by a completely black central viewport.

The required outcome is a visible lunar globe textured with real NASA Moon Trek LRO WAC imagery. This step does **not** implement LOLA elevation terrain; LOLA remains deferred until the global imagery globe is working.

## Evidence and likely root cause

The screenshot shows repeated failed XHR tile requests with HTTP `403`, while the central Cesium viewport is black. A previous diagnostic marked a representative WAC tile request as passed, but that check did not prove that the browser's actual Cesium imagery requests were successful or rendered.

NASA's Trek documentation describes RESTful WMTS tile URLs in this form:

```text
https://{WMTS endpoint}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg
```

NASA documents this specific global Moon WAC layer and sample level-zero tile paths:

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/1.jpg
```

A direct request to the first URL was observed to return a real lunar surface image during preparation of this step. This proves that this exact REST-style sample tile was reachable from the research environment; it does **not** prove browser CORS, all tile levels, or the current application configuration are correct.

The most likely issue is a mismatch between the request encoding/configuration used by the current Cesium provider and the NASA Trek endpoint. The screenshot's `.../1.0.0/?service=WMTS...` request pattern is KVP-style, while the documented sample is RESTful. Treat this as the first hypothesis to test, not as a proven root cause until the actual response body and code are inspected.

## Strict boundaries

- Debug and extend the existing Cesium viewer. Do not replace the simulation page or redesign its layout.
- Do not add a second globe, a second Cesium viewer, another mapping library, or a duplicate data service.
- Do not use an Earth imagery provider, random texture, generated Moon texture, screenshot, static image, or local decorative sphere as a substitute for the NASA lunar imagery.
- Do not disable browser security, CORS protections, TLS validation, or content-security policy to hide the failure.
- Do not add an untrusted public proxy. A same-origin proxy is not the first solution; use it only if an independently verified provider policy/CORS limitation requires it and document the reason.
- Do not claim imagery is rendered merely because capabilities XML loads, a provider initializes, or a standalone curl request succeeds.
- Preserve the mission input flow, current selected-site state, workspace, Results page, SIS, LiveKit, and all unrelated functionality.
- LOLA DEM terrain remains deferred. Do not report it as complete in this step.

## Execution checklist

### 1. Capture the real failing request before changing code

1. Open the simulation in the browser.
2. Open Developer Tools → Network.
3. Enable **Preserve log**, disable cache, and reload the page.
4. Filter to `trek`, `WMTS`, or `jpg`.
5. Select one failing `403` request and record:
   - the complete Request URL;
   - HTTP method;
   - request headers relevant to origin/referrer;
   - response headers;
   - response body/text;
   - Initiator stack and calling file/line;
   - whether the response is from NASA or another intermediary.
6. Confirm whether the application is sending KVP parameters such as `service=WMTS`, `request=GetTile`, `layer`, `tilematrix`, `tilerow`, and `tilecol` to a base path ending in `/1.0.0/`.
7. Inspect the current provider construction and the exact installed Cesium version/type definitions before editing.

Do not infer the cause from the status code alone. A `403` is an HTTP denial; it is not automatically a CORS error. Record any separate browser CORS message.

### 2. Verify NASA's current capabilities document

Request and inspect:

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml
```

Parse the actual XML and record these values from the selected layer:

- `ows:Identifier` for the layer;
- `Format`;
- `ResourceURL` template and extension;
- style identifier;
- tile matrix set identifier;
- supported CRS / coordinate reference system;
- every `TileMatrix` identifier;
- matrix width and height at each level;
- tile width and tile height;
- bounding box / coverage.

Do not hardcode assumptions from a previous run if the live capabilities document supplies different values. Use the exact layer and matrix metadata associated with the selected LRO WAC global mosaic.

### 3. Validate representative REST tiles independently

At minimum test both global level-zero tiles using the exact identifiers from the capabilities document. The documented sample URLs are:

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/1.jpg
```

For each sample:

- verify HTTP status is successful;
- verify the response content type matches the capabilities document (the sample URLs use `.jpg`);
- verify the response bytes are a valid image, not an HTML/XML error body;
- verify the image decodes in a browser;
- verify the tile depicts lunar surface imagery;
- test at least one relevant higher zoom tile whose row/column is derived from the capabilities and the current camera/site.

A manually fetched sample tile is only a provider availability check. It is not yet proof that Cesium rendered it.

### 4. Correct the Cesium request encoding

Inspect the installed Cesium version's `WebMapTileServiceImageryProvider` documentation and TypeScript declarations. The current provider supports WMTS KVP and RESTful requests in current versions, but its URL must be configured according to the selected mode.

**Preferred approach:** use the NASA RESTful tile URL template if the installed provider version supports it. The template must be assembled from the live capabilities values and follow this pattern:

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg
```

Use the exact case-sensitive placeholder names required by the installed Cesium version. If the existing Cesium version cannot reliably produce this RESTful template, use `Cesium.UrlTemplateImageryProvider` with an explicit template only after mapping Cesium `z/x/y` to the actual WMTS matrix identifiers and row/column convention established from the capabilities document.

For the global equirectangular layer, the Trek documentation describes a global pyramid whose first zoom level has two columns and one row, then four columns and two rows at the next level. Verify these dimensions in the actual capabilities document. If they match, configure a geographic tiling scheme with the Moon ellipsoid and matching level-zero tile counts; do not use Cesium's default Web Mercator tiling scheme.

Do not leave a KVP base URL ending in `/1.0.0/` if the chosen fix is to use the RESTful resource template. After the change, inspect Network again: tile requests should be RESTful paths ending in the correct matrix/row/column and image extension, not the previous rejected `?service=WMTS&...` route.

### 5. Verify browser CORS and image decoding separately

From the actual application origin, verify that the browser is allowed to load the tile images for WebGL use. Check:

- no CORS policy error in Console;
- no `net::ERR_*` failure;
- no 403/404/5xx tile response;
- valid JPEG/PNG response bytes;
- successful browser image decode;
- no WebGL texture upload errors.

Do not treat a `curl.exe` success as a CORS test. Do not add `mode: "no-cors"`; opaque responses cannot be inspected and do not fix WebGL texture access.

### 6. Verify Cesium layer attachment and scene rendering

Inspect the actual runtime viewer and confirm:

- the viewer exists and has not been destroyed;
- the WebGL canvas has non-zero width and height;
- the render loop is active and the scene is not in a render-error state;
- the lunar globe is visible;
- the intended imagery layer is present in `viewer.imageryLayers`;
- the imagery layer is enabled and has non-zero alpha;
- the provider is ready;
- the provider uses the correct Moon ellipsoid and geographic tiling scheme;
- tile requests for the visible camera area succeed;
- the imagery layer is attached to the lunar globe, not only registered in a diagnostics object;
- no opaque CSS overlay is covering the Cesium canvas;
- React lifecycle does not create and immediately destroy the viewer or remove the imagery layer after initialization.

If needed, temporarily use a neutral lunar-gray globe base color as a **diagnostic-only fallback** to determine whether the globe mesh/camera renders independently of imagery. Remove or clearly label this fallback before acceptance; it must never be reported as NASA imagery.

### 7. Fix the black viewport and camera only if the globe is still absent

After imagery requests are correct, test the globe without the imagery layer to isolate scene rendering from tile loading.

Check:

- Moon ellipsoid dimensions and units;
- camera position and direction;
- near/far clipping range;
- camera target and selected-site orientation;
- globe visibility and base material;
- canvas dimensions and parent container sizing;
- CSS `display`, `visibility`, `opacity`, stacking and clipping;
- WebGL context loss or render exceptions;
- duplicate viewer creation or premature destruction.

The Moon must be a recognizable sphere in the viewport before imagery acceptance can pass. A black canvas is a failure even if a diagnostics card says the viewer initialized.

### 8. Verify the selected-site coordinates

The most recent screenshot reports approximately `89.50° S, 0.00° E`. Earlier screenshots showed different coordinates. Trace the displayed location to the authoritative mission state.

- Use the existing selected mission input/state as the source of truth.
- Do not hardcode `90° S, 10° E`, `89.5° S, 0° E`, or `0°, 10° E` as production defaults unless that is the actual active mission input.
- Keep longitude east-positive as documented by the application.
- Ensure the marker, selected-site metadata and camera focus use the same values.
- Handle exact-pole longitude deliberately because longitude is geometrically indeterminate at the pole.
- Add a test that changes the selected mission coordinates and verifies the marker/camera target update.

### 9. Correct the diagnostics semantics

Split the existing broad checks into distinct evidence-backed states. At minimum show:

1. Capabilities document retrieved.
2. Layer metadata parsed.
3. Representative REST tile request successful.
4. Browser image decode successful.
5. Cesium imagery provider ready.
6. Imagery layer attached to the globe.
7. Visible-area tile requests successful.
8. Lunar globe visibly rendered.
9. Moon surface imagery visibly rendered.
10. Selected-site coordinates synchronized.
11. LOLA terrain deferred / not implemented.

A capabilities or tile-request pass must not automatically set “Surface Imagery Visible” to passed. Keep the visual confirmation acceptance check as `PARTIAL` or `PENDING` until a real browser screenshot confirms visible Moon surface detail.

### 10. Automated and browser verification

Run the repository's actual scripts from `package.json`; do not invent script names. At minimum run the available equivalent of:

```bash
npm run typecheck
npm run lint
npm run test -- --run tests/simulation-page.test.tsx
npm run build
```

Add or update tests for:

- exact REST tile URL construction from capabilities metadata;
- no unintended KVP request URL generation when REST mode is selected;
- correct matrix ID, row and column mapping;
- correct Moon ellipsoid and geographic tiling scheme;
- imagery provider/layer readiness and attachment;
- selected-site marker/camera synchronization;
- honest partial/failure state when tile requests fail.

Use the project's existing Playwright/browser-test setup if present. Verify at least one desktop viewport and one mobile viewport. Capture a screenshot after all tile requests settle. The screenshot must show an identifiable textured Moon with lunar craters; a black viewport or uniform blue/gray sphere fails visual acceptance.

## Required acceptance criteria

This step may be reported **VERIFIED** only when all of the following are true:

- [ ] The actual failing 403 URL and response cause have been recorded.
- [ ] The live capabilities document was inspected and its relevant metadata recorded.
- [ ] The correct NASA REST tile template is used, or another encoding is justified by actual service evidence.
- [ ] Actual browser tile requests return successful image responses without 403 errors.
- [ ] Browser image decode and WebGL texture use succeed without CORS errors.
- [ ] A recognizable complete lunar globe is visible in Global Moon mode.
- [ ] Real Moon Trek WAC imagery and craters are visibly rendered on the globe.
- [ ] Focus Mission Site targets the authoritative selected coordinates.
- [ ] Marker, metadata and camera remain synchronized.
- [ ] No mock or generated lunar texture is being passed off as NASA imagery.
- [ ] Typecheck, lint, focused tests and production build pass.
- [ ] Browser screenshots and Network/Console evidence are recorded.

If only the REST tile fetch works but Cesium still shows a black viewport, report `PARTIAL` and continue debugging the imagery attachment/scene lifecycle. If the globe renders but tile imagery does not, report `PARTIAL`. Do not proceed to LOLA terrain implementation until the global imagery globe is verified.

## Required documentation updates

Update:

- `context/Debug/debug-state-and-issue-tracker.md`
- `context/progress-tracker.md`

Record:

- root cause confirmed (or explicitly `not yet confirmed`);
- exact old failing URL pattern and new request URL pattern;
- capabilities metadata used;
- changed files;
- tests and command outputs;
- browser viewport(s) tested;
- screenshots/evidence paths;
- remaining blockers;
- LOLA terrain still deferred.

## Reference documentation

- NASA Moon Trek: https://trek.nasa.gov/moon/
- NASA Trek WMTS documentation: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- NASA WAC global mosaic capabilities: https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml
- NASA documented global WAC level-zero sample tile: https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg
- Cesium WMTS provider documentation: https://cesium.com/learn/cesiumjs/ref-doc/WebMapTileServiceImageryProvider.html
- Cesium URL template provider documentation: https://cesium.com/learn/cesiumjs/ref-doc/UrlTemplateImageryProvider.html
