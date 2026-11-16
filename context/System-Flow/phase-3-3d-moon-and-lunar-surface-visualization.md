# PHASE 3 — 3D Moon Globe and Real Lunar Surface Visualization

**Project:** Lunar Mission Planner (LMP)  
**Phase:** 3  
**Status:** Ready for implementation  
**Prerequisite:** Phase 2 CesiumJS dependency/runtime setup has already been completed by the developer.  
**Primary outcome:** Display a real, interactive 3D Moon using NASA Moon Trek imagery and a local area of actual LOLA elevation-driven terrain around the selected mission coordinates.

---

## 1. Mission and scope

Implement the first working 3D lunar visualization inside the existing Lunar Mission Planner application.

The completed phase must contain two connected visualization levels:

1. **Global lunar globe:** a complete Moon-shaped 3D globe using a lunar ellipsoid and NASA Moon Trek LRO Wide Angle Camera (WAC) global imagery.
2. **Local lunar surface:** a zoomed-in region around the selected mission location whose surface geometry is generated from real LOLA LDEM elevation samples, not a decorative image, random height field, or hand-modelled crater.

Users must be able to rotate, zoom, pan, return to the global Moon view, and focus the camera on the current mission coordinates. The global globe and local terrain must use one consistent lunar coordinate reference, ellipsoid/reference radius, longitude convention, and vertical unit.

### Recommended page integration

Use a dedicated 3D Simulation view/route if that fits the existing application routing. Add only the minimum navigation entry needed to reach it. Reuse the existing LMP dark aerospace theme, header patterns, typography, spacing, borders, and responsive conventions. Do not redesign the landing page, mission input flow, existing 2D map, Results page, SIS, LiveKit, or mission analysis panels.

If the repository already has an approved simulation route or equivalent feature entry point, reuse it instead of creating a duplicate.

### Strict scope boundary

**Included:**
- CesiumJS lunar globe configured for the Moon.
- NASA Moon Trek global lunar imagery via WMTS.
- Actual LOLA LDEM elevation data prepared for a bounded local surface region.
- Real 3D local terrain geometry around the current selected location.
- Camera controls, globe/local-view switching, selected-coordinate focus/marker.
- Data source, resolution, coverage, loading, partial and error UI states.
- Responsive visual layout and verification.

**Not included in Phase 3:**
- Rover 3D model, rover animation, wheel physics, or rover telemetry.
- Source-to-destination route line or pathfinding.
- Forward scanner, lidar simulation, hazard detection, crater avoidance, or obstacle alerts.
- SIS integration or LiveKit changes.
- Sun/Earth ephemeris calculations or mission illumination simulation.
- Changes to existing NASA Horizons, analysis, report export, or Results page features.

Do not add these future features as inactive controls or imply that they work.

---

## 2. Mandatory repository audit before editing

Before changing any file:

1. Read the five current project context documents:
   - `ai-workflow-rules.md`
   - `architecture-context.md`
   - `code-standards.md`
   - `project-overview.md`
   - `ui-context.md`
2. Inspect the repository structure, current Next.js App Router setup, package manager, lockfile, existing route/navigation conventions, theme tokens, and current lunar map implementation.
3. Inspect the completed Phase 2 dependency setup and verify the installed Cesium package/version and static runtime assets.
4. Inspect `package.json` and lockfile. **Do not reinstall Cesium or add duplicate 3D engines.** Do not add Three.js, React Three Fiber, or a second globe library.
5. Identify whether the existing app has a reusable mission-input state/store/context. Use that same authoritative selected latitude/longitude; do not duplicate mission state or hard-code a production location.
6. Record the current branch/worktree state before edits. Do not overwrite or revert unrelated local changes.

If the Cesium runtime assets or CSS are already configured by Phase 2, reuse them. Only repair a verified Phase 2 defect that blocks Phase 3, and document the repair.

---

## 3. Phase implementation sequence

Complete the following steps in order. Keep each checkpoint independently testable. Do not move to the next step while the current checkpoint has a blocking error.

### Step 3.1 — Create an isolated client-only Cesium scene

1. Follow the existing app route/component structure. Keep Cesium initialization in a client-only component.
2. Ensure the Cesium scene is never initialized during Next.js server rendering. Use the existing client boundary and dynamic import approach where required by the installed Next.js/Cesium versions.
3. Use a React effect or equivalent lifecycle-safe controller to create the Cesium `Viewer` only after its container is mounted.
4. Prevent duplicate Viewer creation during React Strict Mode mount/unmount cycles.
5. Destroy the Viewer and release listeners/handlers on unmount.
6. Make the Cesium canvas/container fill its allocated panel without overflowing the page.
7. Disable or hide Cesium default widgets that conflict with LMP's custom interface (timeline, animation, geocoder, scene mode, base-layer picker, navigation help, fullscreen) unless one is explicitly reused as an accessible control.
8. Preserve the Cesium data attribution/credit display. Do not hide source credits.
9. Configure the Cesium static asset base URL using the already-installed Phase 2 runtime setup. Verify worker and widget assets load from the local public path; do not assume the existing value is correct without checking.

**Checkpoint A:** A blank, stable Cesium canvas loads on the target page, resizes correctly, produces no SSR/window errors, and cleans up when leaving the route.

### Step 3.2 — Configure the actual Moon globe

1. Inspect the installed Cesium version for `Ellipsoid.MOON` support. Prefer `Cesium.Ellipsoid.MOON` when present.
2. Configure the Viewer globe using a `Cesium.Globe` constructed with the lunar ellipsoid. Confirm the scene globe and every imagery/terrain provider use the same ellipsoid.
3. If the installed version does not expose `Ellipsoid.MOON`, use a documented lunar reference sphere radius verified from the selected NASA/PDS source and construct an explicit spherical ellipsoid. Do not use WGS84, an Earth globe, or an arbitrary visual scale.
4. Keep longitude and latitude semantics consistent with the Moon Trek layer and the selected LOLA DEM. Explicitly document east-positive/west-positive handling and any longitude normalization.
5. Keep the Moon in Cesium 3D scene mode. Hide Earth atmosphere/haze effects that would make the lunar globe look like Earth. Use a restrained deep-space background; do not use NASA logos or NASA mission branding as decoration.
6. Enable globe lighting only with an honest preview lighting direction. Do not claim the lighting represents the selected mission date/time or a calculated real Sun position in Phase 3.

**Checkpoint B:** The screen shows a full lunar globe with the correct lunar scale and orientation, not Earth. Rotation, zoom and pan work.

### Step 3.3 — Integrate NASA Moon Trek global imagery through WMTS

Use NASA Moon Trek's **LRO WAC Global Mosaic** as the primary global lunar surface texture.

Candidate GetCapabilities endpoint (verify availability and metadata before using):

`https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml`

NASA also documents the service catalog and tile request pattern here:

- https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- https://api.nasa.gov/ (Vesta/Moon/Mars Trek WMTS section)

Execution:

1. Request and inspect the WMTS GetCapabilities XML for the selected product.
2. Read the actual layer identifier, style identifier, tile-matrix-set identifier, CRS, bounding box, tile dimensions, image format, minimum/maximum tile matrix identifiers, and matrix labels from the capabilities document.
3. Verify that the tile-matrix set is compatible with the Cesium tiling scheme selected for the lunar globe. Use a geographic/equirectangular scheme only when the capabilities document confirms the expected CRS and matrix layout. Do not guess `default028mm`, layer names, extensions, tile rows/columns, or zoom levels.
4. Configure `Cesium.WebMapTileServiceImageryProvider` using the exact values and RESTful URL template exposed by the service. Supply the lunar ellipsoid and matching tiling scheme.
5. Use HTTPS. Test representative tile requests at low and higher levels before adding the layer to the Viewer.
6. Verify CORS from the browser. Do not immediately introduce a broad Next.js tile proxy. If direct browser access fails, capture the exact error and evaluate a narrowly scoped, cache-aware proxy only if needed and allowed by the service.
7. Add proper source credit in the UI/Cesium credit display. Keep a visible source label such as `NASA LRO WAC — Moon Trek`.
8. Treat missing tiles as missing data coverage. Do not stretch another tile, paint in fake texture, or silently show an unrelated basemap.
9. Add resilient loading and error handling for slow service responses, HTTP errors, missing tile coverage, and offline conditions.

**Checkpoint C:** The complete lunar globe is visibly textured with NASA Moon Trek WAC imagery. The map has no Earth imagery, broken tile grid, blank quadrants caused by incorrect matrix metadata, or misleading fallback imagery.

### Step 3.4 — Identify and prepare real LOLA local elevation data

The current general-rover test location is near:
- Source: latitude `0°`, longitude `10°` east.
- Previously suggested nearby test destination: latitude `-0.01°`, longitude `10.01°` east.

Read the actual current mission input from application state. The values above are test coordinates only and must not override a user's selected site.

Use the PDS Geosciences Node LOLA GDR/DEM documentation and archive:

- https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- https://pds-geosciences.wustl.edu/missions/lro/lola_faq.htm
- https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/Lunar%20Reconnaissance%20Orbiter%20%28LRO%29/LOLA/GDR/GDRDEM.htm

LOLA product-selection guidance:

1. Use a gridded GDR DEM for a latitude/longitude elevation grid; do not use raw EDR/RDR tracks as if they were a ready-made global height raster.
2. For the near-equatorial test coordinates, inspect the equirectangular/cylindrical `LDEM_1024` regional products. The PDS ODE catalogue identifies `LDEM_1024` as approximately `29.612 m` per pixel at the lunar equator. Verify this in the current product metadata before displaying it.
3. The tile `LDEM_1024_15S_00S_000_030` covers the southern latitude band from 15°S to 0° and longitude 0°–30°E. Because the example source latitude is exactly 0°, include the adjoining northern tile if the chosen local crop extends north of the equator. Determine tile names and bounds from the archive catalogue; do not infer them from a guessed filename.
4. Prefer the PDS JPEG2000 product plus its detached label/auxiliary files when that is the most practical verified download. Do not assume a browser can decode the source JP2 directly.
5. Do not put a whole approximately gigabyte-scale raw global or regional IMG file in `public/`, bundle it into JavaScript, or download it for every browser session.
6. Prepare a bounded local terrain asset. Start with a roughly 5–10 km square centered on the selected coordinate, constrained by actual data coverage. Crop only what is needed and retain enough margin for a smooth camera transition and the sample traverse area.
7. Use a verified geospatial preparation tool already available in the environment (for example GDAL) or a clearly isolated preparation script. Inspect the toolchain before adding dependencies. Do not change the main app runtime dependency tree merely to decode one offline dataset if a preparation-time tool is more appropriate.
8. Convert the raster into a browser-efficient format suitable for the chosen Cesium implementation (for example, a compact tiled heightmap/terrain asset or a local mesh asset with a georeferenced transform). Keep the source product ID, source URL, label file, acquisition/product metadata, pixel size, dimensions, bounds, no-data value, scaling and offset alongside the derived file.
9. Preserve no-data values as a mask. Do not convert no-data to zero elevation.
10. Verify the raster's latitude orientation, longitude origin/direction, pixel registration, row order, and coordinate reference before using the samples. A vertically flipped or west/east-shifted DEM is a release blocker.

**Height conversion is mandatory:**

- Read the detached PDS `.LBL`/product metadata for the exact scale, offset, data type, byte order, no-data value, and units.
- The PDS LOLA documentation distinguishes `HEIGHT`, `PLANETARY_RADIUS`, and geoid-relative `TOPOGRAPHY`. Do not apply the same conversion blindly to every product.
- If constructing positions relative to the Moon reference sphere, convert each sample to radius relative to the same reference sphere used by the Cesium lunar ellipsoid. For the applicable GDR products, verify the product label and documented offset (the PDS FAQ describes a reference offset of 1,737,400 m for relevant GDR data). Do not add the offset twice.
- If displaying geoid-relative topography instead, obtain the matching geoid product and subtract the geoid radius consistently. Label the displayed quantity correctly.
- Keep all geometry positions in metres. Keep any display-only vertical exaggeration separate from the scientific source values.

**Checkpoint D:** A small, georeferenced, browser-efficient elevation asset is available with a verified source, correct pixel scale, bounds, vertical conversion, and no-data mask. The asset is not a fabricated heightmap.

### Step 3.5 — Render the local terrain as real 3D geometry

Choose the implementation only after inspecting the installed Cesium version and the processed DEM format.

Preferred implementation order:

1. **Best if feasible:** implement a proper custom Cesium terrain provider/tile pipeline that exposes the LOLA samples as terrain tiles on the lunar ellipsoid. This lets Cesium's globe imagery layer drape the Moon Trek imagery over the actual terrain.
2. **Acceptable bounded MVP:** generate a georeferenced local terrain mesh from actual LOLA samples and add it as a Cesium primitive/model anchored to the selected lunar location. Use actual DEM values for every vertex; use the same Moon ellipsoid, local east-north-up frame, and map bounds. Apply a locally prepared image texture if it can be accurately georegistered to the mesh.
3. A Cesium `CustomHeightmapTerrainProvider` may be used for a first local heightmap implementation only after its limitations are accounted for. Official Cesium documentation states that it does not provide vertex normals, water masks, or availability metadata. Add an appropriately derived hillshade/normal visualization if needed; document the limitation. Do not describe it as a complete high-fidelity terrain provider.

Implementation requirements:

- Do not substitute Cesium World Terrain or an Earth DEM. This is lunar terrain.
- Do not use a flat plane with a Moon texture and call it elevation terrain.
- Do not create procedural/random craters to fill holes in the actual DEM.
- Use the DEM geotransform and the selected lunar coordinate frame to calculate every terrain vertex position.
- Match the local terrain patch to the global lunar ellipsoid at its boundary. Avoid visible cracks, floating edges, duplicate surfaces/z-fighting, or a discontinuity in reference radius.
- Compute usable surface normals or a hillshade layer where supported by the implementation.
- Handle missing-data cells as transparent/unavailable or interpolate only with a documented, conservative method that does not invent terrain.
- Add skirts or edge handling only to hide mesh tile seams; do not let skirts create fictional crater walls or safety hazards.
- Keep the true vertical scale at `1.0×` by default. If a visual exaggeration control is included, label it `Display exaggeration` and make clear that it is not real height.
- Keep the global lunar imagery visible while zoomed in. The local elevation geometry should not appear as a separate unrelated patch or texture.

**Checkpoint E:** When zooming into the selected location, the lunar surface visibly rises and falls according to measured LOLA heights. The local surface aligns with the globe and imagery, and the app can report the data resolution and extent used.

### Step 3.6 — Camera, coordinate focus and user controls

Provide only controls required to inspect the Moon and its surface:

- `Global Moon` — zoom out to show the complete lunar globe.
- `Focus Mission Site` — fly to the currently selected mission latitude/longitude.
- `Surface View` — enter an oblique close-up view of available local elevation terrain.
- `Reset Camera` — restore the default camera state.
- Mouse/touch orbit, pan and zoom using Cesium camera controls.
- A coordinate readout for the selected site, formatted with the actual values and degree units.
- A small selected-location marker or reticle on the global/local view. Do not create a route line or rover marker in this phase.

Use the existing authoritative mission state. When the mission coordinates change, update the selected marker and offer/perform camera focus according to the existing UX conventions. Do not silently change the mission input because the user panned the camera.

Coordinate checks:
- Confirm `0°, 10°E` appears in the correct equatorial/eastern location on the globe.
- Confirm the local DEM crop is centered at the same coordinate.
- Verify the longitude convention between UI, Moon Trek WMTS and LOLA DEM. Document any normalization.
- Do not transform the coordinates using Earth-only datum/projection assumptions without confirming the lunar product's coordinate reference.

**Checkpoint F:** Camera controls work; mission focus and coordinate marker are correctly aligned; no coordinate changes occur from camera interaction unless map selection is explicitly implemented.

### Step 3.7 — Build the simulation visual shell

Reuse existing LMP design tokens and visual standards. Recommended screen layout:

- **Header:** `Lunar Mission Planner / 3D Simulation`, data status and return-to-planner navigation.
- **Main viewport:** dominant Cesium lunar globe/local terrain scene.
- **Compact left controls:** current site coordinates, Globe/Surface view, layer selector (only layers actually implemented), camera reset.
- **Compact right information panel:** selected coordinate, active imagery source, elevation source, DEM resolution, coverage bounds and terrain data status.
- **Viewport footer:** visible data credits and loading/coverage status.

Visual requirements:
- Match the existing dark navy/near-black aerospace theme.
- Use existing CSS custom properties/Tailwind theme tokens. Do not scatter raw hex colors or introduce another theme.
- Preserve existing Geist typography and the project's spacing/radius patterns.
- Keep the 3D viewport visually dominant; avoid covering it with oversized opaque panels.
- Ensure panel controls do not intercept camera drag gestures unintentionally.
- Desktop: use a broad central viewport with compact side panels.
- Tablet/mobile: stack or use collapsible panels; keep the globe usable and avoid horizontal overflow.
- Provide loading, partial, unavailable and error states. Do not report `Terrain loaded` until the DEM is successfully decoded and rendered.
- Display `Imagery: NASA Moon Trek LRO WAC` and `Elevation: NASA LRO LOLA LDEM_1024` only when those exact sources are the active data.
- Always show data coverage and resolution; if the imagery and DEM resolutions differ, explain this in metadata.

Do not show rover telemetry, speed, battery, scanning beams, hazard cards, or navigation route controls in this phase.

### Step 3.8 — Performance and reliability

- Keep the large source DEM out of the browser bundle and out of the repository's public folder.
- Load only the processed local patch required for the selected site and current view.
- Use lazy loading and cancellation for terrain preparation/loading where appropriate.
- Avoid rebuilding the Viewer or terrain mesh on every React render.
- Debounce camera focus changes when mission coordinates are edited rapidly.
- Avoid unnecessary imagery layer recreation.
- Use request cancellation/cleanup and guard against state updates after unmount.
- Handle tile 404/5xx, service timeout, CORS failure, unavailable coverage, DEM parse failure, and malformed metadata.
- If the local DEM is unavailable, continue to show the correctly textured global Moon with a clear `Local elevation data unavailable` message. Do not show zero-elevation terrain and claim the surface is ready.
- If a provider or dataset is too slow, profile the actual bottleneck before lowering resolution or adding caches.

### Step 3.9 — Tests and verification

Run the repository's existing checks; do not replace or weaken them:

1. package-manager typecheck command (inspect `package.json` first).
2. ESLint/lint command.
3. existing unit tests.
4. production Next.js build.
5. browser verification using the project's existing Playwright or E2E setup if available.

Add targeted tests for new pure functions, especially:
- parsing/validating DEM metadata;
- DN-to-height/reference-radius conversion;
- pixel row/column to latitude/longitude mapping;
- longitude normalization;
- no-data handling;
- local crop bounds and dimension limits.

Manual/browser acceptance tests:

- [ ] The simulation route opens without breaking the existing mission planner.
- [ ] The globe is visibly the Moon, not Earth.
- [ ] Moon Trek imagery loads over the globe using actual WMTS capabilities metadata.
- [ ] Tile attribution is visible.
- [ ] Globe is interactive: rotate, zoom, pan.
- [ ] `Global Moon` returns to full-globe framing.
- [ ] `Focus Mission Site` targets the current selected coordinates.
- [ ] At the test site `0°, 10°E`, the marker and local DEM crop are geographically aligned.
- [ ] Surface View shows real height variation generated from LOLA DEM samples.
- [ ] DEM height conversion and pixel resolution are verified against the PDS label/documentation.
- [ ] Surface imagery and DEM geometry line up without obvious shifts, mirroring, or vertical inversion.
- [ ] No-data/missing coverage is displayed honestly.
- [ ] No DEM data is falsely labelled as high-resolution rock detection.
- [ ] No rover, pathfinding, hazard, SIS or LiveKit code was changed.
- [ ] No console errors, failed runtime assets, broken network requests or WebGL lifecycle leaks.
- [ ] Desktop, tablet and mobile layouts remain usable.
- [ ] Existing mission input, map, analysis, Results page and SIS functionality remain unchanged.

Capture screenshots at minimum:
- 1920×1080 desktop — global Moon view.
- 1440×900 desktop — local surface view.
- 390×844 mobile — responsive simulation view.

---

## 4. Suggested component and service boundaries

Adapt to the current repository. Reuse existing folders and conventions; do not create duplicate architecture layers.

Possible structure:

```text
app/
  simulation/                 # only if this matches current route conventions
    page.tsx
components/
  simulation/
    lunar-simulation-page.tsx
    cesium-lunar-viewer.tsx    # client-only Cesium lifecycle boundary
    simulation-toolbar.tsx
    terrain-info-panel.tsx
    simulation-status.tsx
lib/
  lunar-globe/
    lunar-ellipsoid.ts
    moon-trek-wmts.ts
    cesium-viewer-options.ts
  lunar-terrain/
    dem-metadata.ts
    dem-height-conversion.ts
    dem-georeferencing.ts
    local-terrain-loader.ts
scripts/
  prepare-lola-terrain.*      # only if preprocessing is required; do not add a second runtime service
public/
  cesium/                     # reuse Phase 2 output; do not duplicate
  data/lunar-terrain/          # only small processed assets, never full source archives
```

Responsibilities:
- React components own layout and user interactions only.
- Cesium controller/service owns Viewer lifecycle, imagery layers, globe, camera and primitives.
- WMTS service/config owns NASA layer metadata and URL construction.
- Terrain preparation/loader owns source parsing, georeferencing, conversion and mesh/terrain delivery.
- Shared types define source metadata, coverage, loading state and selected-site details.

Do not put tile URL construction, raw PDS parsing, elevation math, or Cesium Viewer setup inside a large page component.

---

## 5. Data contract and UI state

Use typed state consistent with existing project conventions.

The scene should distinguish:
- `idle`
- `loading-imagery`
- `imagery-ready`
- `loading-terrain`
- `ready`
- `partial`
- `error`

At minimum, store/display metadata for:
- selected latitude/longitude;
- lunar coordinate convention/reference;
- imagery provider name/product ID, layer, matrix set and time/version if present;
- DEM source/product ID, source URL, label file, bounds, dimensions, pixel size, projection, no-data value, scale/offset and vertical reference;
- load timestamp and warnings.

Do not infer source metadata from a filename if the label/capabilities document says otherwise.

---

## 6. Non-negotiable scientific and project rules

1. The lunar globe must use a lunar ellipsoid, not WGS84.
2. Moon Trek imagery and LOLA DEM must have compatible coordinate conventions and be correctly georeferenced.
3. WMTS tile metadata must come from GetCapabilities; do not hard-code unverified matrix parameters.
4. LOLA height values must be converted using the exact PDS label/product metadata.
5. Distinguish height above reference sphere from geoid-relative topography.
6. Preserve no-data as unavailable; never turn it into zero.
7. Do not create fake craters or synthetic terrain and describe them as NASA-derived.
8. Do not imply the WAC imagery has the same spatial resolution as the LOLA DEM.
9. Do not imply that a 29.6 m DEM detects small boulders or rover-scale hazards.
10. Display-only vertical exaggeration must not modify scientific measurements.
11. Do not claim mission-date solar illumination or live Sun lighting in this phase.
12. Do not expose secrets or add a Cesium ion token unless an approved dependency explicitly requires it. Prefer the verified NASA WMTS and locally prepared LOLA data for this scope.
13. Keep NASA source credits, but do not add NASA logos, mission insignia or NASA branding as decorative UI.
14. The phase is a visualization feature, not autonomous landing/rover certification.
15. No unrelated project features may be rewritten.

---

## 7. Completion report requirements

At completion, update the five current context files only where their information changes:
- `project-overview.md` — add the delivered 3D visualization as implemented only after it is verified.
- `architecture-context.md` — record the actual Moon Trek WMTS layer, ellipsoid, DEM pipeline, coordinate convention and component boundaries.
- `ui-context.md` — document the implemented simulation screen and responsive behavior.
- `code-standards.md` — add only reusable new standards actually adopted.
- `ai-workflow-rules.md` — record the completed phase, checks and next approved unit.

Do not create extra context files unless explicitly requested.

Create a concise Phase 3 implementation report including:
- summary of what is implemented;
- exact files changed;
- exact package versions (confirm no unnecessary dependency changes);
- NASA WMTS product/layer and capabilities values used;
- LOLA DEM product IDs, downloaded source assets, derived asset size, resolution, extent and height conversion;
- coordinate convention and lunar reference radius;
- screenshots and tested viewport sizes;
- typecheck/lint/test/build results;
- known limitations and anything not completed.

Use one of these honest final statuses:
- `VERIFIED` — all required acceptance items passed with evidence.
- `PARTIAL` — the global Moon works but real local LOLA terrain or another requirement remains incomplete.
- `BLOCKED` — a required NASA data/service or technical compatibility issue prevents implementation.

Never report `VERIFIED` merely because the page compiles or a textured sphere appears.

---

## 8. Official technical references

Use current documentation and product metadata as the authority; verify against the versions and labels actually installed/downloaded.

### NASA Moon Trek / WMTS
- Moon Trek: https://trek.nasa.gov/moon/
- Moon Trek WMTS catalog: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- NASA WMTS overview and tile metadata guidance: https://api.nasa.gov/

### LOLA / PDS
- LOLA archive: https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- LOLA data FAQ and height conversion guidance: https://pds-geosciences.wustl.edu/missions/lro/lola_faq.htm
- LOLA GDR DEM product/resolution documentation: https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/Lunar%20Reconnaissance%20Orbiter%20%28LRO%29/LOLA/GDR/GDRDEM.htm

### CesiumJS
- CesiumJS Viewer: https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html
- Cesium Ellipsoid: https://cesium.com/learn/cesiumjs/ref-doc/Ellipsoid.html
- Cesium Globe: https://cesium.com/learn/cesiumjs/ref-doc/Globe.html
- Cesium WMTS imagery provider: https://cesium.com/learn/cesiumjs/ref-doc/WebMapTileServiceImageryProvider.html
- Cesium TerrainProvider: https://cesium.com/learn/cesiumjs/ref-doc/TerrainProvider.html
- Cesium CustomHeightmapTerrainProvider limitations: https://cesium.com/learn/cesiumjs/ref-doc/CustomHeightmapTerrainProvider.html
- Create 3D terrain from heightmaps: https://cesium.com/learn/3d-tiling/ion-tile-terrain/

---

## 9. Final execution instruction to the coding agent

Implement Phase 3 only. Start with repository inspection and the global Moon globe. Verify the Moon Trek service from GetCapabilities, then prepare and render a small, real LOLA elevation region around the current selected site. Work incrementally through the checkpoints and stop at a clearly documented blocker rather than fabricating data or silently changing architecture. Preserve all existing LMP features. Do not begin rover, route, hazard-detection, SIS or LiveKit work in this phase.
