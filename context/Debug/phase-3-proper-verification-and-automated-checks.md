# Phase 3 — Proper Runtime, Data, and Visual Verification Checks

**Project:** Lunar Mission Planner  
**Feature:** CesiumJS lunar globe and NASA Moon Trek imagery  
**Task type:** Add reliable automated checks and evidence-based runtime diagnostics to the existing Phase 3 implementation  
**Current known state:** The simulation UI shell exists, but the supplied screenshot shows a black viewport, a small blue disk, and no recognizable lunar surface imagery. The real LOLA DEM/local terrain remains deferred.  
**Required result:** The team must be able to determine, through automated tests and browser evidence, whether the Moon globe is visible, whether genuine NASA Moon Trek imagery tiles loaded and rendered, and whether the active mission coordinates correctly control the displayed site.

---

## 1. Objective

Implement a proper verification layer around the existing Phase 3 Cesium simulation. Do not simply add a checklist to the documentation or display success badges unconditionally. Add tests and truthful diagnostics to the existing project so failures are detected and explained.

The checks must distinguish these separate states:

1. The Cesium viewer has initialized.
2. The Moon ellipsoid/globe is configured.
3. The Moon globe is actually visible in the viewport.
4. The NASA Moon Trek imagery provider has initialized.
5. Actual Moon Trek image tile requests have succeeded.
6. The imagery is visibly mapped to the Moon globe.
7. The selected coordinates come from the application's active mission state.
8. The marker and camera use the same coordinates.
9. The local LOLA DEM and elevation geometry are still pending unless separately implemented and visually verified.

A configured provider is not proof of imagery. A loaded ellipsoid is not proof of a recognizable Moon. A canvas existing in the DOM is not proof that the scene rendered correctly.

## 2. Scope and boundaries

### In scope

- Inspect the existing repository, test runner, scripts, route structure, Cesium implementation, and Phase 3 debug fixes.
- Add unit tests for lunar ellipsoid and coordinate handling.
- Add tests for active mission-state synchronization.
- Add checks for Cesium viewer lifecycle and viewport sizing.
- Add checks for the actual NASA WMTS GetCapabilities and tile-request contract.
- Add Playwright/browser verification using the existing E2E stack if available.
- Add truthful runtime diagnostic states to the simulation UI, using existing design tokens and layout.
- Capture screenshots and test/network evidence.
- Update `context/progress-tracker.md` accurately.

### Out of scope

- Do not implement rover models, movement, route planning, obstacle detection, or pathfinding.
- Do not implement the deferred LOLA local DEM pipeline in this task.
- Do not add synthetic Moon textures, generated craters, placeholder success results, or unrelated basemap imagery.
- Do not redesign the simulation screen.
- Do not modify SIS, RAG, Gemini, LiveKit, voice-agent code, results page, mission calculations, or unrelated application routes.
- Do not replace the current Cesium architecture unless a specific verified limitation requires it.
- Do not add a new testing framework if the repository already has an equivalent one.

Preserve the current Next.js, React, TypeScript, Cesium, styling, and package-manager setup.

---

## 3. Start with repository discovery — do not assume scripts or versions

Before changing files, inspect:

- `package.json` and the actual lockfile.
- Installed Cesium version and its public API typings/docs.
- Existing unit/integration test framework and test scripts.
- Existing Playwright/Cypress setup, if present.
- Existing Next.js route for the simulation.
- Current Cesium viewer component and scene initialization.
- Moon ellipsoid/globe configuration.
- Moon Trek imagery provider and layer setup.
- Active mission-input state/context/store and coordinate types.
- Selected-site marker and camera focus handlers.
- Existing Cesium asset-copy setup and `CESIUM_BASE_URL` configuration.
- Current `context/progress-tracker.md`.

Use the existing naming conventions and folder structure. Do not assume the route is `/simulation`, the test command is `npm test`, or that a specific testing library is installed. Discover the actual project structure and scripts first.

Before edits, write a short implementation note listing the real files to be changed and the tests that already exist.

---

## 4. Add a truthful simulation health model

Create or extend one typed diagnostic model in the existing simulation feature layer. Do not spread unrelated booleans across UI components.

Use a state model equivalent to the following, adapted to current code conventions:

```ts
export type CheckState =
  | "not-checked"
  | "checking"
  | "passed"
  | "partial"
  | "failed"
  | "not-applicable";

export interface SimulationCheck {
  state: CheckState;
  label: string;
  detail?: string;
  checkedAt?: string;
  evidence?: string[];
}

export interface SimulationDiagnostics {
  viewer: SimulationCheck;
  lunarEllipsoid: SimulationCheck;
  globeRendering: SimulationCheck;
  imageryCapabilities: SimulationCheck;
  imageryProvider: SimulationCheck;
  imageryTileRequests: SimulationCheck;
  imageryVisible: SimulationCheck;
  selectedCoordinates: SimulationCheck;
  markerSynchronization: SimulationCheck;
  cameraSynchronization: SimulationCheck;
  lolaTerrain: SimulationCheck;
}
```

Requirements:

- Keep the model typed; do not use `any`.
- Keep diagnostic collection separate from visual rendering.
- Each check must be updated only from a real operation or observed evidence.
- Include actionable error details in development/diagnostic mode.
- Do not expose large response bodies, arbitrary remote content, secrets, or stack traces to ordinary users.
- Avoid a permanent noisy diagnostics panel in the normal user experience. Use the existing metadata/status area or a collapsible developer diagnostics section consistent with the current UI.
- The production UI should show concise, truthful states. Detailed request URLs and error messages can remain in development diagnostics.

### Status semantics — mandatory

| Status | Permitted meaning |
|---|---|
| Viewer passed | Cesium viewer is constructed and mounted without a runtime error. |
| Ellipsoid passed | The expected lunar ellipsoid is assigned to the rendered globe. |
| Globe rendering passed | A browser visual test confirms a recognizable lunar globe is visible, not merely a canvas or scene object. |
| Capabilities passed | The current WMTS GetCapabilities document was fetched and parsed; expected layer/matrix information was found. |
| Provider passed | The imagery provider initialized with verified service metadata. |
| Tile requests passed | Actual relevant tile requests returned successful image responses. |
| Imagery visible passed | Browser visual evidence confirms lunar imagery is visibly draped on the visible Moon. |
| Coordinates passed | Displayed coordinate values equal the authoritative active mission state. |
| Marker/camera passed | Marker position and camera focus are derived from the same active mission coordinates. |
| LOLA passed | Only when real DEM data has been loaded, converted, rendered as elevation geometry, and independently verified. Otherwise `not-applicable` or pending, not passed. |

Never map `provider.ready === true` directly to `imageryVisible = passed`.

---

## 5. Unit and component tests

Use the repository's installed test framework. Add focused tests without changing the production architecture.

### 5.1 Moon ellipsoid tests

Verify:

- The simulation globe uses the Moon ellipsoid supported by the installed Cesium version.
- The configured radii are lunar-scale and not Earth/WGS84-scale.
- Any scene body, globe, marker conversion, and camera distance use a consistent lunar reference.
- No duplicate opaque blue placeholder sphere covers the actual globe imagery.

Tests should assert values/relationships, not rely on brittle snapshots of Cesium internal objects. Do not use undocumented Cesium private fields to make tests pass.

### 5.2 Coordinate conversion tests

Add tests for:

- A standard equatorial site: latitude `0`, longitude `10` east.
- The previously discussed nearby test destination: latitude `-0.01`, longitude `10.01` east, only when used as an explicit test fixture.
- A southern-hemisphere site.
- Longitude wrapping/bounds according to the app's existing validation contract.
- Exact north and south pole behavior.
- Correct longitude-first / latitude-second argument order when calling Cesium's degree conversion APIs.
- Marker position uses the Moon ellipsoid and correct height/reference semantics.

Do not silently change the user's active mission coordinates to the test fixture. Test fixtures are isolated from production defaults.

### 5.3 Mission state synchronization tests

Verify:

- Simulation reads the existing authoritative mission input/result state.
- No hardcoded `90° S, 10° E` fallback is used when there is no selected site.
- Missing coordinates render an explicit unselected/unknown state.
- Updating latitude/longitude updates selected-site metadata.
- The marker and camera focus receive the same coordinate object/version.
- Switching between Global Moon and Focus Mission Site does not overwrite the source mission coordinates.
- A stale mission result cannot silently override newer active input state.

Add tests against the actual state/store/context mechanism used by the repository.

### 5.4 Viewer lifecycle tests

Verify where feasible:

- Viewer initialization occurs only after the client container exists.
- Zero-size/unmeasured container does not produce a false successful rendering state.
- Resize triggers an appropriate Cesium resize/reframe operation.
- Unmount destroys the viewer exactly once.
- Remount does not leave duplicate canvases or stale event handlers.
- React development Strict Mode does not create multiple active viewers.

Use public Cesium APIs and observable DOM behavior. Avoid assertions against undocumented private fields.

---

## 6. WMTS service and image tile checks

The existing implementation must use verified Moon Trek WMTS configuration. Do not hardcode unverified values into tests.

### 6.1 GetCapabilities verification

Use the current official Moon Trek service documentation and its live GetCapabilities endpoint to verify:

- Service endpoint.
- Exact layer identifier/title for the intended global WAC mosaic.
- Available styles and the selected style.
- Exact TileMatrixSet identifier.
- Supported matrix identifiers and order.
- Tile dimensions.
- Supported image formats.
- Geographic coverage/bounds.
- Projection/coordinate system and tiling scheme.
- Attribution requirements.

Save a small, sanitized capabilities fixture only if useful for deterministic unit tests. Label fixtures as test fixtures and do not confuse them with live provider output. The live smoke check must still validate the currently configured service.

A successful capabilities response proves only that service metadata is accessible; it does not prove image tiles work.

### 6.2 Tile request checks

Inspect actual tile requests generated by the running Cesium application. For a representative set of tiles intersecting the current global camera view, verify:

- HTTP response is successful.
- Response is not an XML/HTML exception document.
- Content type is a supported image type.
- Image data has non-zero dimensions and can be decoded.
- Tile coordinates/matrix identifiers are valid for that service.
- No systematic 400/403/404/5xx error is occurring.
- Browser CORS and WebGL use are successful.
- The image layer is attached to the same globe visible to the camera.

Do not assume a request is a tile just because its URL contains `tile`. Identify the actual request pattern used by the live provider.

If the WMTS endpoint blocks browser CORS, document the exact origin/header issue. Only introduce a same-origin proxy if required and if it can be implemented safely without exposing credentials or bypassing service terms. Prefer the existing supported public service access path where possible.

### 6.3 Deterministic vs live tests

Use two layers of tests:

1. **Deterministic tests:** test parsing, configuration, coordinate conversion, and request construction against a small fixture.
2. **Live smoke test:** verify the current official endpoint and a representative set of tile requests in a browser-enabled test or controlled diagnostic.

Do not make every ordinary unit test depend on NASA network availability. Live external checks should be a clearly named separate command/job and should report `BLOCKED/UNAVAILABLE` when the service is temporarily unreachable rather than changing a deterministic unit-test result.

---

## 7. Browser end-to-end checks

Use the existing browser E2E tooling if present. If Playwright is already installed, extend it rather than installing a second browser framework.

Add stable `data-testid` attributes only where needed for reliable tests. Do not select elements using fragile CSS class names or visible text alone when a stable semantic locator is possible.

### 7.1 Simulation page loads

Verify:

- The actual simulation route is reachable through the LMP UI.
- Page title/header is visible.
- Central Cesium container has non-zero dimensions.
- Cesium canvas is attached to the intended viewport.
- No uncaught browser exceptions occur.
- No repeated failed Cesium static asset requests occur.

### 7.2 Global Moon view

Verify all of the following:

- The camera reaches the global Moon state.
- The Moon globe occupies a meaningful portion of the viewport and is not clipped or rendered as a tiny disk.
- The ellipsoid is lunar-scale.
- At least representative Moon Trek WAC image tiles load successfully.
- The visible surface is demonstrably lunar imagery rather than a solid blue fill or star field.
- Screenshot is captured from the real running browser.

A canvas count or `viewer.scene.globe` existence check alone must not pass this test.

### 7.3 Focus Mission Site

Verify:

- The active mission coordinates are read from the application state.
- Camera focus moves to those exact coordinates.
- The selected-site marker appears at the expected location on the lunar surface.
- The coordinate label matches the selected site.
- The camera does not jump to a hardcoded pole/default location.
- Changing active mission coordinates and refocusing updates camera and marker together.

For the exact poles, test the app's defined coordinate convention and do not assert a physically unique longitude where none exists.

### 7.4 Camera controls and resize

Verify:

- Global Moon button restores global view.
- Focus Mission Site button focuses the active site.
- Zoom/orbit/pan interaction works.
- Resize does not leave a blank, stretched, or cropped canvas.
- Repeated navigation away/back does not create duplicate canvases or broken WebGL state.

### 7.5 Screenshot assertions

Capture real-browser screenshots at minimum:

- 1920 × 1080 desktop — Global Moon.
- 1440 × 900 desktop — Global Moon and Focus Mission Site.
- 1366 × 768 desktop — Global Moon.
- 768 × 1024 tablet.
- 390 × 844 mobile.

Visual review must answer:

- Is a full Moon recognizable?
- Are lunar surface features visible?
- Is the imagery on the Moon rather than behind it?
- Is the camera correctly framed?
- Are the coordinate marker and label synchronized?
- Does the diagnostic UI report what the screenshot actually proves?

If a screenshot shows a black starfield and small blue disk, the visual test must fail even if the DOM and Cesium setup checks pass.

Use screenshot comparison only where stable enough; otherwise combine structural assertions, network response evidence, and mandatory manual screenshot review. Do not use one brittle exact-pixel snapshot as the only proof of a correct 3D scene.

---

## 8. Runtime diagnostics UI

Add a compact, truthful diagnostic display in the existing simulation page without redesigning it.

Suggested rows:

| Check | Example truthful status |
|---|---|
| Cesium Viewer | Ready / Failed |
| Lunar Ellipsoid | Configured / Incorrect |
| Moon Globe | Visible / Not visible / Not verified |
| Moon Trek WMTS | Capabilities verified / Unavailable |
| Imagery Provider | Ready / Failed |
| WAC Tiles | N loaded / Failed / Pending |
| Surface Imagery | Visible / Partial / Not visible |
| Selected Site | `lat, lon` / Not selected |
| Marker + Camera | Synchronized / Mismatch |
| LOLA Terrain | Deferred / Not loaded |

Requirements:

- Use the existing design tokens and visual hierarchy.
- Keep the main view focused on the Moon, not a wall of debug text.
- Provide a collapsible **Diagnostics** area for detailed checks.
- Include a refresh/retry action only if it actually re-runs the relevant health checks.
- Distinguish `not checked`, `checking`, `passed`, `partial`, and `failed`.
- Show the time of the last check.
- Do not show a green checkmark for untested assumptions.
- Do not show successful terrain status when LOLA is deferred.
- In production, avoid exposing raw error stacks or sensitive request details.

The ordinary status text should be concise; development mode may include the failing layer, matrix, tile request, HTTP response, and error category.

---

## 9. Recommended automated commands

Inspect the existing package scripts and preserve the established package manager. Add or adjust scripts only when needed.

Recommended logical checks (use the project's actual script names):

1. TypeScript type-check.
2. ESLint.
3. Unit/component tests.
4. Production build.
5. Simulation browser E2E tests.
6. Separate live NASA WMTS smoke test.

If the repository already supports a combined check command, extend it. Otherwise, add one clearly named script such as `check:simulation` that runs the relevant local/deterministic tests. Keep live network tests separate, for example `check:simulation:live`, so an external NASA service outage does not make all local tests unusable.

Do not invent script names in documentation without confirming they exist in `package.json`. Record the exact commands actually run and their exit codes.

---

## 10. Failure handling rules

Each failure must be actionable and must stop false success states.

Examples:

- Viewer container has zero size → report `Viewer failed to size`, do not report globe visible.
- Moon ellipsoid is not assigned to the actual rendered globe → report `Lunar ellipsoid mismatch`.
- GetCapabilities cannot be fetched → report `WMTS capabilities unavailable`; do not guess configuration.
- WMTS layer ID is absent → report `Configured layer not found`.
- Tile returns 404/400 → report failing matrix/row/column and response category in development diagnostics.
- Tile returns HTML/XML rather than an image → report `Invalid tile response`.
- Provider initializes but no image tiles are visible → report `Provider ready; imagery not verified`.
- Globe is off-screen/tiny → report `Moon not visibly framed`.
- Active coordinates absent → show `No mission site selected`, never a hidden hardcoded default.
- Marker and camera use different input versions → report `Coordinate synchronization failed`.
- LOLA data absent → report `LOLA terrain deferred`, not `terrain loaded`.

Do not silently catch and discard meaningful rendering/network errors. Log development diagnostics safely and show a user-friendly status.

---

## 11. Required acceptance gates

The implementation is complete only when the evidence gates below pass.

### Gate A — Local quality checks

- [ ] TypeScript passes.
- [ ] ESLint passes.
- [ ] Existing unit/component tests pass.
- [ ] Production build passes.
- [ ] No unrelated test failures were hidden or skipped.

### Gate B — Cesium scene

- [ ] Viewer mounts once and has non-zero dimensions.
- [ ] Actual rendered globe uses the Moon ellipsoid.
- [ ] Camera frames a recognizable full Moon.
- [ ] No opaque blue placeholder obscures the globe.
- [ ] Resize and unmount/remount behavior works.

### Gate C — NASA imagery

- [ ] Current GetCapabilities response is successfully parsed.
- [ ] Exact layer, style, TileMatrixSet, matrix identifiers and formats are verified.
- [ ] Representative real tile requests return successful image data.
- [ ] Browser decodes the tile responses without CORS/WebGL image errors.
- [ ] Genuine WAC imagery is visibly mapped onto the Moon in a real-browser screenshot.
- [ ] UI does not claim imagery success merely because a provider object exists.

### Gate D — Coordinates

- [ ] Active site comes from the authoritative LMP mission state.
- [ ] No silent hardcoded default is used.
- [ ] Marker, metadata and camera focus use the same coordinate values.
- [ ] Coordinate changes propagate correctly.
- [ ] Pole edge cases are handled honestly.

### Gate E — Scope and data integrity

- [ ] LOLA local DEM is still marked deferred unless actually implemented.
- [ ] No synthetic terrain is presented as measured LOLA data.
- [ ] Existing LMP, SIS, LiveKit and results page behavior remains intact.
- [ ] Runtime diagnostics distinguish configured, loaded, rendered, unavailable and unverified states.

If Gate A passes but B/C/D fail, report `PARTIAL — BUILD PASSES, VISUAL/DATA CHECKS FAIL`.  
If the globe renders but imagery tiles do not, report `PARTIAL — GLOBE ONLY`.  
If imagery works but the active site is not synchronized, report `PARTIAL — IMAGERY WORKS, COORDINATES FAIL`.  
If all gates A–E pass, the Moon globe/imagery portion may be marked verified. LOLA terrain remains separately deferred until Gate E is updated with actual terrain evidence.

---

## 12. Evidence and reporting requirements

At completion, update `context/progress-tracker.md` and provide a report containing:

1. Exact source files inspected and changed.
2. Root causes discovered and fixes made.
3. Exact Cesium version and viewer configuration used.
4. Exact Moon Trek service/layer/style/TileMatrixSet verified.
5. Number of representative tile requests checked and their HTTP/content-type outcomes.
6. Whether a genuine WAC tile is visibly rendered on the Moon.
7. Coordinate source of truth and synchronization test result.
8. Test commands run and exit codes.
9. Screenshots and viewport sizes.
10. Remaining failures, limitations, and deferred LOLA work.
11. Final status using one of: `VERIFIED`, `PARTIAL`, or `NOT VERIFIED`.

Do not claim browser verification if only unit tests or a production build were run. Do not claim imagery visibility if only the WMTS provider initialized. Do not claim real 3D terrain if LOLA elevation geometry has not rendered.

---

## 13. Official references

Use the exact current API supported by the installed Cesium version and the current Moon Trek service metadata.

- NASA Moon Trek: https://trek.nasa.gov/moon/
- NASA Moon Trek WMTS API documentation: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- CesiumJS WMTS imagery provider: https://cesium.com/learn/cesiumjs/ref-doc/WebMapTileServiceImageryProvider.html
- CesiumJS Globe: https://cesium.com/learn/cesiumjs/ref-doc/Globe.html
- CesiumJS Ellipsoid: https://cesium.com/learn/cesiumjs/ref-doc/Ellipsoid.html
- CesiumJS testing / debugging should follow the installed project's existing test framework and browser tooling.

---

## Final instruction to the coding agent

Implement the checks, not just the checklist. Discover the actual project structure and test tooling first. Add deterministic tests, a separate live NASA WMTS smoke test, real-browser checks, and truthful runtime diagnostics. Preserve the existing Cesium implementation and LMP UI. Fix only the failures demonstrated by the checks. The black viewport / blue disk screenshot must fail the visual acceptance gate. Never mark the Moon imagery as rendered without real tile-response evidence and a real-browser screenshot. Keep LOLA DEM terrain explicitly deferred until actual elevation geometry is loaded and verified.
