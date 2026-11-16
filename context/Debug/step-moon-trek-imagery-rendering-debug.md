# Step — Fix Moon Trek Imagery Rendering on the Existing Lunar Globe

## Objective

Fix the current Phase 3 rendering issue without rebuilding the simulation page or replacing the existing Cesium implementation.

The latest browser screenshot shows:
- The simulation UI and diagnostics panel render.
- Cesium Viewer initializes.
- The Moon ellipsoid is configured and appears as a large, uniformly blue disk/sphere.
- The central viewport does not show recognizable lunar surface imagery or craters.
- The diagnostics report that a representative Moon Trek WMTS tile request returned JPEG data, but this does **not** prove that the imagery is rendered on the globe.
- LOLA local terrain remains deferred and must stay explicitly unverified.

The immediate deliverable is a recognizable lunar globe visibly textured with the correct NASA Moon Trek LRO WAC imagery.

## Scope and constraints

1. Debug the existing Cesium scene, imagery provider, and diagnostics. Do not rebuild the simulation page from scratch.
2. Preserve the current layout, styling, navigation, existing mission flow, SIS, LiveKit, and unrelated features.
3. Do not add another 3D engine or a decorative Moon texture as a substitute for NASA imagery.
4. Do not treat a successful capabilities request, HTTP 200 response, JPEG content type, or provider construction as proof of rendered imagery.
5. Do not mark imagery as `PASSED` until a browser-level visual check confirms the WAC texture is visible on the lunar globe.
6. Keep LOLA DEM integration and local terrain relief marked `DEFERRED` / `NOT VERIFIED`. They are not part of this step.
7. Do not hardcode mission coordinates. Use the authoritative selected mission state already used by the application.

## Step 1 — Reproduce and record the failure

1. Start the application using the repository's existing development command.
2. Open the 3D Simulation route in a real browser.
3. Expand the diagnostics panel.
4. Capture a screenshot showing the blue globe and current diagnostic statuses.
5. Open browser DevTools and record:
   - Console errors and warnings.
   - Network requests to the Moon Trek capabilities document.
   - Network requests for imagery tiles.
   - HTTP status, response content type, response size, and failed requests.
   - Any Cesium imagery-provider or WebGL errors.
6. Record the active selected latitude and longitude from application state and compare them with the values shown in the UI and marker.

Do not change implementation until the failure has been reproduced and the evidence has been recorded.

## Step 2 — Verify the NASA WMTS service definition

Use the official Moon Trek WMTS capabilities document and the exact imagery service already selected by the application.

Verify all of the following from the capabilities response; do not guess values:

- Service endpoint and URL template / `ResourceURL`.
- Exact WAC imagery layer identifier.
- Supported style identifier.
- Image format (expected format must be confirmed from capabilities, not assumed).
- Tile matrix set identifier.
- Coordinate reference system / projection.
- Tile matrix identifiers and available zoom levels.
- Tile width and tile height.
- Matrix width and matrix height at each tested level.
- Row and column ordering.
- Any scale denominator or top-left corner information needed by the mapping library.

Compare the exact WMTS scheme with the Cesium provider configuration. A geographic/equirectangular service must not be treated as Web Mercator or as Cesium's default Earth imagery tiling scheme.

If the capabilities document exposes both `ResourceURL` and KVP request forms, use the form that is explicitly supported and compatible with the chosen Cesium provider. Record the final URL template with placeholders, not secrets.

### Required tile probes

1. Identify valid representative tiles from the capabilities document for the WAC layer.
2. At the global/coarsest matrix level, test every tile column required to cover the world, not just one arbitrary tile. For a two-column, one-row matrix, probe both columns.
3. Test at least one tile corresponding to the current camera's visible geographic region.
4. Save or inspect the returned image bytes locally during debugging.
5. Verify that each response is actually a decodable image with non-zero dimensions and meaningful lunar imagery, not an HTML/XML error body returned with an unexpected content type.
6. Record the exact matrix identifier, row, column, response status, content type, and image dimensions for each probe.

Do not infer a complete global imagery path from a single successful tile.

## Step 3 — Verify Cesium imagery provider compatibility

Inspect the existing provider construction and verify:

1. The provider uses the exact WAC layer identifier and style from capabilities.
2. The provider uses the correct tile matrix set / tiling scheme for the Moon Trek service.
3. The projection and geographic bounds match the Moon Trek service.
4. The provider's tile matrix identifiers, row/column addressing, and zoom-level mapping match the WMTS service.
5. The Cesium globe is configured with the lunar ellipsoid, not the default WGS84 Earth ellipsoid.
6. The lunar ellipsoid reference radius and coordinate convention remain consistent with the project architecture.
7. The imagery provider is ready before the layer is added, and any asynchronous errors are caught and surfaced.

If Cesium's standard WMTS provider cannot represent the service's matrix scheme correctly, do not force an incompatible configuration. Implement a small, typed custom imagery provider/adapter that maps Cesium tile requests to the verified WMTS matrix and row/column scheme. Keep this adapter isolated in the simulation data/rendering layer.

## Step 4 — Verify that the imagery layer is actually attached and visible

After the provider is ready, inspect the live Cesium viewer and confirm:

- The imagery layer exists in `viewer.imageryLayers`.
- The layer references the expected WAC provider.
- The layer is enabled (`show` is true).
- Its alpha is not zero and brightness/contrast/saturation settings are not hiding the imagery.
- It is ordered above any base/fallback layer that could cover it.
- There is no opaque blue material or fallback layer being drawn over the imagery.
- The layer is attached to the same viewer/globe instance currently displayed in the central viewport.
- The layer is not being removed or replaced during React effects, rerenders, or cleanup.
- The imagery layer's provider error event is observed and reported.

Inspect whether the blue appearance comes from the ellipsoid's `baseColor`, a fallback material, an empty imagery layer, a failed tile set, or another primitive. Keep a fallback base color only for uncovered areas; it must not conceal successfully loaded WAC imagery.

Avoid creating multiple Cesium viewers or duplicate imagery layers during React rerenders. Verify viewer lifecycle and cleanup behavior.

## Step 5 — Verify visible-tile selection and camera coverage

The camera must be looking at the lunar globe and the WAC provider must request tiles that overlap the visible globe region.

1. Confirm the camera's position and orientation are expressed relative to the lunar ellipsoid.
2. Confirm the camera is not inside the globe, pointed away from it, or clipped by the near/far planes.
3. Confirm the globe has a useful on-screen diameter and is not an incorrectly scaled marker or primitive.
4. Confirm the current view requests the tile matrix levels expected for its camera distance.
5. Confirm requested row/column values are within the matrix dimensions.
6. Confirm the selected mission-site marker is positioned on the same lunar reference frame and coordinate convention.
7. Check whether the selected site is the intended mission site. The earlier screenshot showed `90° S, 10° E`, whereas the stated test mission was `0°, 10° E`. Trace the displayed value to the real application state; do not silently substitute either value.
8. At an exact pole, treat longitude as a coordinate convention rather than a unique physical point and avoid misleading marker behavior.

## Step 6 — Update diagnostics so they measure real outcomes

The current diagnostics conflate provider setup and actual imagery rendering. Split the imagery status into separate checks, for example:

- `WMTS_CAPABILITIES`: capabilities document retrieved and parsed.
- `WMTS_TILE_HTTP`: required representative tiles returned successful responses.
- `WMTS_TILE_DECODE`: tile bytes decoded as images with expected dimensions.
- `CESIUM_IMAGERY_PROVIDER`: compatible provider successfully constructed.
- `CESIUM_IMAGERY_ATTACHED`: WAC imagery layer attached to the active viewer and visible.
- `IMAGERY_VISUAL_CONFIRMATION`: browser screenshot/visual acceptance confirms recognizable WAC lunar imagery on the globe.

Rules:

- A passed HTTP check must not automatically pass image decode, layer attachment, or visual confirmation.
- If a browser test can inspect layer state but cannot robustly prove the rendered pixels, report visual confirmation as `MANUAL_VERIFICATION_REQUIRED` rather than `PASSED`.
- If any prerequisite fails, surface `FAILED` or `PARTIAL` with the specific reason.
- Do not show a generic `Imagery: Loaded` status when only the provider has initialized.
- Preserve source attribution: NASA Moon Trek / LRO WAC.

## Step 7 — Correct coordinate source and marker synchronization

Trace the entire data flow:

`mission form / active mission state -> simulation route props or context -> selected site model -> coordinate formatting -> Cesium camera and marker`

Verify:

- Latitude and longitude come from the currently selected mission state.
- The selected site card, metadata, marker label, and focus-camera action all use the same values.
- No separate hardcoded `90`, `-90`, `0`, or `10` fallback silently overrides the selected mission input.
- Coordinate formatting does not swap latitude and longitude or invert longitude sign.
- The lunar east-positive longitude convention is applied consistently with the source data and Cesium projection.
- Missing mission coordinates produce an explicit empty/unavailable state rather than a plausible-looking default.

Add or update unit tests for coordinate propagation and formatting. Use the project's existing authoritative mission-state contract.

## Step 8 — Browser-level verification

Use the browser testing approach already configured in the repository. Do not add a new test framework if an existing one can perform the checks.

Verify at minimum:

### Global Moon mode
- The Cesium viewer is visible and initialized.
- A recognizable spherical Moon appears in the central viewport.
- Actual NASA Moon Trek WAC imagery is visible on the globe.
- The surface is not uniformly blue.
- At least one recognizable lunar surface feature / crater texture is visible at a suitable zoom level.
- Rotation, zoom and pan work.
- No uncaught Cesium, WebGL, imagery-provider, or React lifecycle errors occur.

### Focus Mission Site mode
- The camera moves to the authoritative selected mission coordinates.
- The marker remains on the lunar surface and in the correct location.
- Imagery for the visible local region is requested and rendered.
- The displayed coordinate labels match the source state.

### Responsive layouts
- Desktop: the globe remains visible and correctly sized.
- Tablet: the globe remains usable without panel overlap.
- Mobile: controls remain accessible and the globe is not clipped to an unusable size.

Capture screenshots for the global Moon view and focused mission-site view. Store them in the repository's existing test-artifact location and link them from the debug report.

## Step 9 — Automated test and quality gates

Run the repository's actual package scripts; inspect `package.json` rather than assuming script names.

At minimum, run the available equivalents of:

- TypeScript typecheck.
- ESLint.
- Focused simulation unit/component tests.
- Browser/e2e tests for the simulation page if configured.
- Production build.

Add tests where needed for:

- WMTS capabilities parsing / required metadata.
- WMTS URL template and tile coordinate mapping.
- Invalid tile matrix row/column rejection.
- Image response validation and decode errors.
- Provider configuration using Moon Trek metadata.
- Imagery layer attachment and error-state handling.
- Mission coordinate propagation and marker formatting.
- Honest diagnostic state transitions.

Do not mock a passing imagery render in the browser test. Unit tests may mock network responses to test logic, but at least one real-browser run must use the real NASA service when network access is available.

## Step 10 — LOLA terrain remains a separate deferred task

This step is only about making Moon Trek imagery render on the existing lunar globe.

- Do not claim that the local terrain is 3D because the lunar ellipsoid is spherical.
- Do not generate random crater geometry or procedural height noise and describe it as LOLA data.
- Keep the elevation source status as `DEFERRED` / `NOT VERIFIED` until real LOLA elevation samples are loaded, converted correctly, and rendered as measurable terrain relief.
- Keep imagery and elevation status separate in the UI and progress tracker.

## Required implementation report

Update `context/Debug/debug-state-and-issue-tracker.md` and `context/progress-tracker.md` with:

1. Root cause of the blue, untextured globe.
2. Exact WMTS layer, style, tile matrix set, and tiling scheme verified from capabilities.
3. Representative tile probe results (matrix / row / column / status / decoded dimensions).
4. Whether the provider attached to the active Cesium viewer.
5. Exact code files changed and why.
6. Screenshots of the real textured global Moon and focused site view.
7. Test commands and actual pass/fail results.
8. Remaining limitations and failed checks.
9. Explicit separate status for WAC imagery and LOLA terrain.

## Acceptance criteria

This step is complete only when all applicable criteria below are evidenced:

- [ ] A recognizable lunar globe is visible in the application.
- [ ] NASA Moon Trek LRO WAC imagery is visibly draped over the globe.
- [ ] The globe is not a uniformly blue sphere.
- [ ] WMTS capabilities and tile matrix configuration match the actual NASA service metadata.
- [ ] Actual tile responses are decoded and suitable for display.
- [ ] The imagery layer is attached and visible on the active Cesium viewer.
- [ ] Visible camera regions receive the expected tiles.
- [ ] Global Moon rotation, zoom and pan work.
- [ ] Focus Mission Site uses the authoritative selected mission coordinates.
- [ ] Marker and metadata agree on coordinate values and convention.
- [ ] Browser console/network evidence has been reviewed.
- [ ] Desktop, tablet and mobile layouts remain usable.
- [ ] Relevant tests, typecheck, lint and production build pass.
- [ ] Debug/progress documents reflect the real evidence.
- [ ] LOLA terrain remains marked deferred unless independently implemented and verified.

If the real Moon Trek imagery still cannot be rendered, report the step as `PARTIAL` or `BLOCKED`, document the exact technical blocker, and do not substitute a decorative texture or claim success.
