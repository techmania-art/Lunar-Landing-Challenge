# Phase 11 — Route Terrain Analysis Card, Background Image, and Backend Implementation

## Objective

Implement a complete, data-driven Route Terrain Analysis feature in the Lunar Mission Planner.

The feature must:
1. Display a dedicated Terrain Analysis card in the right-hand Mission Analysis panel, immediately below the existing Solar Energy card.
2. Use the supplied image as the card background: `C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\terrain.jpg`.
3. Keep the background at medium brightness so it is visible but does not reduce text or chart readability.
4. Implement the backend processing required to calculate terrain information along the selected rover route.
5. Display real, source-backed results and clearly distinguish valid, partial, unavailable, estimated, and failed results.
6. Preserve all existing Phase 7, 8, 9, and 10 functionality.

This is an implementation phase, not a static mockup. Do not populate the card with hardcoded sample values or fabricated scientific results.

---

## 1. Inspect the existing project first

The existing application uses Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Geist Sans, and Geist Mono. It has a three-panel workspace:
- Left: Mission Input and configuration
- Center: Lunar Map
- Right: Mission Analysis

Before changing code:
- Inspect the current folder structure, routes, components, API routes, server utilities, data models, and Phase 10 rover/route implementation.
- Reuse existing route geometry, mission state, design tokens, API conventions, and analysis patterns.
- Do not create a second route-planning system if one already exists.
- Do not redesign the full workspace.
- Keep Phase 8 Solar Energy and its animation intact.
- Keep the Phase 9 cyan lightning pin intact.
- Keep Phase 10 rover configuration, battery calculations, and traverse feasibility intact.
- Do not add dependencies unless genuinely required.

If the existing implementation differs from this specification, preserve working project conventions and integrate into the current architecture.

---

## 2. Terrain background image

### Source image

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\terrain.jpg`

### Asset handling

Do not reference the Windows absolute path from browser code. Copy the image into the project's public asset directory, for example:

`public/assets/terrain.jpg`

If the project already has an established public asset directory, follow that convention. The browser should use a public path such as `/assets/terrain.jpg`.

Verify that the image exists and loads. If the file cannot be found at the supplied location, do not silently substitute another image. Report the missing asset and leave a documented placeholder path for the developer to resolve.

### Background placement and appearance

- Apply the image only to the Route Terrain Analysis card in the right Mission Analysis panel.
- It must sit behind the card content, not replace the data display.
- Use medium brightness: visible and recognizable, but not overpowering labels, values, charts, or status indicators.
- Apply a dark translucent overlay and tune it against the actual image.
- Keep text and data surfaces sufficiently opaque for contrast.
- Use `background-size: cover`, a suitable background position, and `background-repeat: no-repeat`.
- Preserve the card's border, radius, spacing, and responsive behavior.
- Do not apply this background globally or to the entire Mission Analysis panel.
- Do not use the image as input for DEM calculations, crater detection, slope, elevation, roughness, or obstacle counts.

Suggested initial styling (adjust after viewing the actual asset):

```css
.terrain-analysis-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background-image:
    linear-gradient(
      rgba(8, 8, 9, 0.48),
      rgba(8, 8, 9, 0.62)
    ),
    url("/assets/terrain.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

These overlay values are a starting point, not a guarantee of medium brightness. Verify the rendered card and adjust the overlay. Keep foreground content in a positioned layer above the background. Interactive controls and charts must remain usable.

---

## 3. Required workspace layout

### Left panel — Mission Input

Keep the left panel for inputs and configuration. Reuse the existing Phase 10 fields:
- Landing location latitude and longitude
- Mission date and UTC time
- Optional comparison location
- Solar panel configuration
- Rover configuration
- Route source/start coordinates
- Route destination coordinates
- Existing route planning or route selection controls
- Run Mission Analysis and Reset controls

Do not move terrain result metrics into the left input panel. Keep it focused on configuration.

### Center panel — Lunar Map

Reuse the current lunar map and route display.

Where supported:
- Display the selected source and destination.
- Display the selected route or route corridor.
- Display detected terrain features at their route-relative geographic positions.
- Use distinct symbols for craters and other detected hazards.
- Allow users to inspect a feature's details without overcrowding the map.
- Preserve existing map imagery and coordinate behavior.

Only plot features with valid geographic coordinates. Never invent marker locations.

### Right panel — Mission Analysis

Add the Route Terrain Analysis card immediately below the existing Solar Energy card.

Preserve all existing analysis cards, including Sun Analysis, Earth Analysis, Communication Visibility, and Rover Energy & Traverse Feasibility. Do not remove or break them.

---

## 4. Terrain Analysis card — required information

The card heading should read **Route Terrain Analysis**. Include the analyzed source and destination, or an equivalent route identifier.

### A. Route overview

Display:
- Route distance, with units (km or m)
- Route analysis coverage/data-coverage status
- Number of terrain samples or analyzed segments, if available
- Analysis status and data source

Route distance must come from the application's actual route geometry. Do not hardcode a distance. Use one consistent distance calculation and unit conversion across the application.

### B. Total obstacle count

Display a prominent **Total Obstacles** metric.

Rules:
- Count distinct detected hazards intersecting or affecting the configured route corridor.
- Do not count every DEM pixel or sample as a separate obstacle.
- Deduplicate detections representing the same physical feature.
- Define and document corridor width and detection rules.
- Distinguish a confirmed count of zero from unavailable data.
- Show detection coverage or confidence context where available.
- Never report zero merely because no data was returned or detection failed.

States:
- Numeric count only when supported by valid analysis.
- `Unable to determine` when required data or processing is unavailable.
- `Partial coverage` when only part of the route has usable data.
- `Analysis failed` when processing failed.

### C. Crater detection

Display where supported:
- Number of detected craters affecting the route
- Crater location or route-relative position
- Estimated diameter (m)
- Estimated depth (m), only when resolution and method support it
- Whether the crater intersects the route corridor
- Severity/traversal concern only when a documented rule supports it

Do not invent dimensions. If diameter is supported but depth is not, show diameter and mark depth unavailable.

### D. Boulder and rock hazards

Display when suitable high-resolution imagery or a validated detection dataset is available:
- Number of detected boulders/rock hazards
- Geographic or route-relative location
- Estimated size/diameter, with units
- Whether the feature intersects or approaches the route corridor
- Detection source and confidence, if available

A coarse DEM must not be presented as a reliable boulder detector. If suitable imagery or a validated detection model is unavailable, say boulder detection is unavailable rather than displaying a fabricated zero.

### E. Slope analysis

Display:
- Maximum slope along the analyzed route
- Average slope, if computed using a documented method
- Steepest segment location or route-relative distance
- Number or length of segments exceeding the configured rover slope limit, if configured
- Slope units in degrees (°) or percent, clearly labeled

Calculate slope from a suitable numeric elevation model, using a documented method and appropriate handling of DEM resolution and projection. Do not label a route safe solely because average slope is low; retain local steep sections.

### F. Surface roughness

Display:
- Roughness metric and its units or definition
- Roughest route segment
- Route-relative location of rough sections
- Coverage and source resolution

Explain the metric in the UI (for example, local elevation variability over a defined neighborhood). Do not present an unexplained arbitrary score as a scientific measurement.

If DEM resolution is too coarse for rover-scale roughness, mark the result as limited or unavailable.

### G. Elevation profile

Display a compact elevation profile chart:
- X-axis: distance along route, with units.
- Y-axis: elevation, with units and reference datum when known.
- Use actual sampled DEM elevations.
- Mark missing-data gaps rather than hiding them with interpolation.
- If interpolation is used, document the method and identify estimated portions.
- Include minimum, maximum, and elevation change only when supported by valid samples.
- Keep the chart responsive and readable.

### H. Terrain traversability summary

Show an overall terrain assessment only when required inputs and terrain coverage are adequate.

Account for configured rover capabilities, where modeled:
- Maximum allowable slope
- Ground clearance and wheel/obstacle capability
- Maximum acceptable roughness
- Route corridor hazards
- Data coverage and resolution

Use explicit states:
- `PASSES CONFIGURED LIMITS`
- `WARNINGS — REVIEW ROUTE`
- `EXCEEDS CONFIGURED LIMITS`
- `UNDETERMINED`
- `NOT EVALUATED`

Do not claim a route is safe or universally traversable based on obstacle count alone. Explain that this is an assessment under configured rover parameters and available terrain data.

---

## 5. Backend implementation

Implement a real processing pipeline integrated with the existing Next.js application. Inspect current server-side modules and API conventions first; extend them rather than duplicating them.

### A. Backend responsibilities

The backend must:
1. Receive a validated mission and route request.
2. Validate source/destination coordinates and route geometry.
3. Obtain suitable numeric terrain elevation data for the route corridor.
4. Check data coverage, resolution, coordinate reference system, and vertical datum where available.
5. Sample elevation along the route.
6. Derive terrain metrics from valid elevation data.
7. Detect and deduplicate route-relevant terrain features using supported datasets or validated algorithms.
8. Compare results with configured rover capability limits.
9. Return a structured response for the card and map.
10. Preserve provenance, timestamps, warnings, and per-metric availability states.

Do not run heavy terrain processing in a client component. Keep retrieval and scientific calculations on the server or in a suitable background-processing layer.

### B. Terrain data and scientific constraints

Evaluate appropriate numeric terrain datasets, such as:
- LOLA-derived lunar Digital Elevation Models (DEMs) for elevation, slope, morphology, and roughness at the resolution supported by the selected product.
- Higher-resolution terrain products or suitable LROC imagery for boulder/rock detection, where coverage and access permit.
- Validated crater catalogs or a documented DEM/image-based crater detection pipeline, where available.

Before selecting a data product, verify:
- Geographic coverage of the requested route
- Spatial resolution
- Coordinate reference system and projection
- Vertical datum and elevation units
- Product/version and provenance
- Access method, availability, and rate limits

Important:
- LROC/QuickMap visual imagery is not automatically a numeric DEM.
- A rendered map tile cannot be used as elevation input.
- Horizons celestial-position results are not terrain elevation data and cannot provide crater, boulder, slope, roughness, or route-obstacle measurements.
- The decorative `terrain.jpg` background is not scientific input.
- Do not claim dataset coverage until it has been checked.
- Do not silently combine datasets with incompatible projections, units, or vertical references.

If a suitable dataset cannot be obtained, return an explicit unavailable state and explain which metric could not be calculated.

### C. Route corridor processing

Use the route geometry already produced by the application.

The backend should:
- Sample the route at spacing justified by dataset resolution and analysis purpose.
- Define a configurable corridor width or reuse an existing project setting.
- Record sampling interval and corridor width in the response.
- Avoid implying coarse data resolves small rover-scale hazards.
- Use the same route geometry and distance convention as the map and Phase 10 calculations.

If the current route is a straight-line segment, analyze that segment. If the application supports a planned polyline, analyze the actual selected polyline rather than generating a new straight line.

### D. Elevation, slope, and roughness processing

Implement separate, testable server-side functions for:
- DEM retrieval or loading
- Coordinate transformation
- Route sampling
- Elevation profile generation
- Slope derivation
- Roughness derivation
- Missing-data and coverage assessment

For each derived metric:
- Document the algorithm and assumptions.
- Preserve source resolution and units.
- Handle missing and invalid elevation samples.
- Avoid returning plausible-looking values when calculation failed.
- Do not use a single average to hide local extreme values.

### E. Crater and boulder detection

Implement detection only when a suitable input and defensible method exist.

Crater detection:
- Use a validated crater catalog or documented morphology-based detection method.
- Deduplicate detections.
- Estimate diameter and depth only when input resolution and method support those estimates.
- Determine route-corridor intersection using actual feature geometry.

Boulder detection:
- Require suitable high-resolution imagery or a validated boulder dataset/model.
- Store detection method, source, location, estimated size, and confidence when available.
- Do not infer boulders from a coarse DEM or decorative background.
- If suitable input is absent, return `UNAVAILABLE`.

Do not add an unvalidated machine-learning model merely to make the feature appear complete. If a model is used, document its version, input requirements, validation status, and confidence interpretation.

### F. Obstacle aggregation and deduplication

Create a consistent hazard aggregation step:
- Combine only supported hazard classes.
- Deduplicate overlapping detections representing the same physical feature.
- Keep each feature's type and source.
- Determine whether each feature intersects or falls within the configured route corridor.
- Calculate total obstacle count from distinct route-relevant features.
- Preserve the individual feature list for the map and detail view.

The total must be traceable to the returned feature records. Do not return a total that disagrees with the feature list.

### G. Rover-aware traversability

Reuse Phase 10 rover configuration and capability fields.

Compare terrain results against configured limits only when those values exist and are valid.

If a required rover capability is missing:
- Do not assume a default capability.
- Do not silently treat a missing value as unlimited.
- Return `UNDETERMINED` or `NOT_EVALUATED` and list missing requirements.

Terrain feasibility must not overwrite or bypass Phase 10 energy calculations. Terrain feasibility and energy feasibility are separate checks. Combine them only through the existing Phase 10 logic, reporting each result distinctly.

---

## 6. API contract

Follow existing API conventions. If no suitable endpoint exists, add an endpoint such as:

`POST /api/terrain-analysis`

### Example request shape

Adapt field names to existing project types. Do not duplicate mission or rover state if canonical shared types already exist.

```ts
type TerrainAnalysisRequest = {
  missionId?: string;
  route: {
    coordinates: Array<{
      latitude: number;
      longitude: number;
    }>;
    corridorWidthMeters?: number;
  };
  rover?: {
    maxSlopeDegrees?: number;
    maxObstacleHeightMeters?: number;
    maxRoughness?: number;
    groundClearanceMeters?: number;
  };
  options?: {
    includeElevationProfile?: boolean;
    includeCraterDetection?: boolean;
    includeBoulderDetection?: boolean;
    includeSlopeAnalysis?: boolean;
    includeRoughnessAnalysis?: boolean;
  };
};
```

Validate:
- Latitude range: -90 to 90.
- Longitude range: -180 to 180.
- At least two valid route coordinates.
- Finite numeric values.
- Positive corridor width when supplied.
- Valid rover limits when supplied.
- Reasonable request size and route sample limits.

Reject malformed coordinates with useful validation errors; do not silently coerce them.

### Example response shape

This is a contract example, not real data. Populate it only with retrieved or calculated values.

```ts
type MetricStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "UNAVAILABLE"
  | "FAILED";

type TerrainMetric<T> = {
  status: MetricStatus;
  value: T | null;
  unit?: string;
  message?: string;
  sourceIds?: string[];
};

type TerrainFeature = {
  id: string;
  type: "CRATER" | "BOULDER" | "ROCK" | "OTHER";
  latitude: number;
  longitude: number;
  routeDistanceMeters?: number;
  diameterMeters?: number;
  depthMeters?: number;
  estimatedHeightMeters?: number;
  intersectsRouteCorridor: boolean | null;
  confidence?: number;
  sourceIds: string[];
};

type TerrainAnalysisResponse = {
  analysisId: string;
  status: "COMPLETE" | "PARTIAL" | "UNAVAILABLE" | "FAILED";
  route: {
    distanceMeters: number | null;
    corridorWidthMeters: number | null;
    sampleSpacingMeters: number | null;
  };
  coverage: {
    percentage: number | null;
    status: "COMPLETE" | "PARTIAL" | "NONE" | "UNKNOWN";
    missingSegments?: Array<{
      startDistanceMeters: number;
      endDistanceMeters: number;
    }>;
  };
  obstacleCount: TerrainMetric<number>;
  craterCount: TerrainMetric<number>;
  boulderCount: TerrainMetric<number>;
  maximumSlope: TerrainMetric<number>;
  averageSlope: TerrainMetric<number>;
  roughness: TerrainMetric<number>;
  elevation: {
    status: MetricStatus;
    unit: string;
    datum?: string;
    samples: Array<{
      distanceMeters: number;
      elevationMeters: number | null;
      isInterpolated?: boolean;
    }>;
    minimumMeters: number | null;
    maximumMeters: number | null;
    elevationChangeMeters: number | null;
  };
  features: TerrainFeature[];
  traversability: {
    status:
      | "PASSES_CONFIGURED_LIMITS"
      | "WARNINGS_REVIEW_ROUTE"
      | "EXCEEDS_CONFIGURED_LIMITS"
      | "UNDETERMINED"
      | "NOT_EVALUATED";
    reasons: string[];
    missingRequirements: string[];
  };
  provenance: Array<{
    sourceId: string;
    name: string;
    productVersion?: string;
    resolutionMeters?: number;
    retrievedAt: string;
    processingMethod: string;
  }>;
  warnings: string[];
  generatedAt: string;
};
```

The final implementation may use different names or a normalized schema, but it must preserve equivalent information and explicit per-metric availability.

### API behavior

- Return appropriate HTTP status codes for invalid requests and server failures.
- Return structured error bodies for UI display.
- Do not expose secrets, upstream credentials, or raw provider HTML.
- Add timeout and retry handling for external data retrieval where appropriate.
- Cache reusable source data or derived results when safe, keyed by route, dataset version, and processing configuration.
- Do not cache failed or incomplete results as if complete.
- Log failures with useful diagnostic context without logging secrets.
- If processing is too long for a normal request, use the project's background-job pattern. Return a job identifier and implement status/result retrieval rather than blocking the UI indefinitely.

---

## 7. Frontend implementation

Create or extend a focused component, for example `TerrainAnalysisCard`, consistent with existing right-panel cards.

### Card content hierarchy

1. Heading: `Route Terrain Analysis`
2. Route distance and analysis status
3. Prominent Total Obstacles metric
4. Crater and boulder hazard summary
5. Slope and roughness summary
6. Elevation profile
7. Terrain traversability status and explanation
8. Data source, coverage, and limitations

Use compact sections, expandable details, or tabs if needed, but do not remove important metrics. The background image must remain behind all content.

### UI states

Implement:
- Initial: `Run Mission Analysis to calculate route terrain`
- Loading: progress indicator or skeleton; do not display stale values as current
- Complete: show validated metrics
- Partial: show available results and identify missing segments or unavailable metrics
- Unavailable: explain that suitable terrain data or coverage is missing
- Failed: show a useful error and allow retry
- Stale: if route or rover settings change after analysis, indicate that recalculation is required

When route, corridor width, relevant rover limits, or analysis options change, invalidate or mark affected results stale.

### Display rules

- Always show units.
- Show data source and analysis timestamp.
- Use `—` or `Unable to determine` for unavailable values, not zero.
- Use a confirmed zero only when valid analysis actually found zero qualifying features.
- Label estimated values as estimated.
- Keep warnings visible.
- Make charts and feature lists responsive.
- Ensure keyboard accessibility and meaningful labels.
- Do not use color alone to communicate pass/warning/fail states.

---

## 8. Map integration

Connect the backend feature list to the existing Lunar Map.

Where valid feature coordinates exist:
- Render crater markers.
- Render boulder/rock hazard markers.
- Use consistent marker semantics and a legend.
- Clicking a marker should reveal type, location, estimated dimensions, route distance, source, and confidence when available.
- Highlight route-corridor intersections distinctly from nearby features outside the corridor.
- Do not plot features with missing or invalid coordinates.

The map and Terrain Analysis card must use the same analysis response so their obstacle totals and feature lists cannot diverge.

---

## 9. Data integrity and scientific honesty

For every metric, retain:
- Source dataset/product
- Product version where available
- Spatial resolution
- Retrieval timestamp
- Coordinate reference system and vertical datum where available
- Processing method and relevant parameters
- Coverage status
- Warnings and limitations

Safeguards:
- Missing DEM is not zero elevation.
- No returned detections is not automatically zero obstacles.
- A coarse DEM cannot establish rover-scale boulder absence.
- A crater detection does not automatically mean the route intersects that crater.
- Average slope does not replace maximum/local slope analysis.
- An unavailable metric must not become a favorable traversability result.
- A rendered lunar basemap is not a numeric terrain model.
- `terrain.jpg` is purely decorative.
- Horizons outputs are not a substitute for terrain data.
- Never state that a route is absolutely safe. Report only whether it passes configured checks under available data and assumptions.

---

## 10. Testing requirements

### Backend tests
- Coordinate validation and invalid route rejection
- Route distance consistency
- Route sampling and corridor generation
- DEM coverage checks
- Elevation profile generation
- Missing elevation samples
- Slope calculation
- Roughness calculation
- Crater feature deduplication
- Boulder detection unavailable when suitable input is missing
- Obstacle count matching distinct route-relevant feature records
- Traversability with missing rover limits
- Partial coverage and unavailable metric states
- Provider timeout and error handling
- Response schema validation

### Frontend tests
- Terrain card renders below Solar Energy
- Background image loads from the public asset path
- Medium-brightness overlay preserves readability
- Loading, complete, partial, unavailable, failed, and stale states render correctly
- Confirmed zero is distinct from unavailable
- Units and provenance are displayed
- Elevation chart handles missing samples
- Feature list and map markers use the same response data
- Route changes invalidate prior results

### Integration checks
- Run the app and verify the card in the actual right-hand panel.
- Verify the supplied background image loads in the browser.
- Verify the backend returns real structured data or an explicit unavailable state.
- Verify a changed route triggers new analysis.
- Verify Phase 7–10 features still work.
- Run lint, type checks, and the relevant test suite.

Do not mark the phase complete if the UI only displays mocked terrain metrics.

---

## 11. Acceptance criteria

- [ ] The supplied `terrain.jpg` is copied into public assets and loads.
- [ ] The image appears only behind the Route Terrain Analysis card.
- [ ] The background has medium brightness and foreground content remains readable.
- [ ] The card is immediately below Solar Energy in the right Mission Analysis panel.
- [ ] The card shows route distance and analysis/data coverage status.
- [ ] Total Obstacles is derived from distinct route-relevant feature records.
- [ ] Crater details are displayed only when supported by actual data and a documented method.
- [ ] Boulder/rock details are displayed only when suitable high-resolution input and a valid detection method exist.
- [ ] Slope and roughness are calculated from suitable numeric elevation data.
- [ ] Elevation profile uses actual route samples and identifies missing data.
- [ ] Rover-aware traversability uses configured limits and can return undetermined.
- [ ] API returns structured results, provenance, warnings, and per-metric availability.
- [ ] Center map and card use the same terrain-analysis response.
- [ ] Loading, partial, unavailable, failed, and stale states are implemented.
- [ ] No scientific values are hardcoded or inferred from the decorative background.
- [ ] Phase 7, 8, 9, and 10 behavior remains intact.
- [ ] Lint, type checks, and relevant tests pass.

---

## 12. Final implementation report

When finished, provide:
1. Files created or modified.
2. Where `terrain.jpg` was placed and the final public asset path.
3. Card position and background treatment.
4. Backend endpoints and processing modules implemented.
5. Terrain datasets actually integrated, including resolution and coverage limitations.
6. Which metrics are genuinely calculated and which remain unavailable.
7. How crater and boulder detection are implemented, or why either is unavailable.
8. Tests and commands run, with actual outcomes.
9. Any API credentials, external data access, or dataset setup still required.
10. Known scientific or coverage limitations.

Do not claim full terrain analysis is operational if only the card UI or a partial backend has been implemented.


---

## 13. Mandatory implementation audit — verify, then implement anything missing

**Do not treat this phase as complete after writing a plan, inspecting files, or displaying a UI card.** Perform an implementation audit against the running codebase. For every requirement below, determine whether it is already implemented and working. If it is missing, incomplete, mocked, disconnected, or failing, implement or repair it in this phase.

### A. Audit procedure

For each checklist item, record one of these statuses in the final report:
- `PASS — already implemented and verified`
- `IMPLEMENTED — missing functionality added and verified`
- `PARTIAL — some functionality works; remaining limitation documented`
- `BLOCKED — cannot implement because a specific external dataset, credential, asset, or service is unavailable`
- `FAIL — attempted but not working; include the exact failure`

Do not mark an item `PASS` merely because a component, function, type, or endpoint exists. Verify that it is connected to the real application flow and works with a real request or a clearly identified test fixture.

### B. Inspect the current application before editing

1. Find the existing Mission Analysis panel and identify the actual Solar Energy card.
2. Find the current route source/destination state and route geometry implementation.
3. Find the Phase 10 rover configuration and traverse-feasibility calculation.
4. Find existing API routes, server-side data services, and terrain-related utilities.
5. Find the existing lunar map feature-marker implementation.
6. Find the project's test, lint, and type-check commands.
7. Check whether the supplied `terrain.jpg` has been copied into the repository's public asset directory.

Create a short internal implementation map (file paths and responsibilities) before making changes. Extend the current implementation; do not create duplicate cards, APIs, route models, or rover models.

### C. Required UI verification and repair

Verify each item in the actual running application:

- [ ] The Route Terrain Analysis card exists.
- [ ] It is positioned immediately below the Solar Energy card in the right panel.
- [ ] It uses the supplied `terrain.jpg`, not a generated substitute or unrelated image.
- [ ] The image is served from the project's public asset path and loads without a 404.
- [ ] The background is medium brightness after rendering, not merely configured with an unverified CSS value.
- [ ] The dark overlay preserves readable foreground text, values, chart labels, and status indicators.
- [ ] The background is scoped only to the Terrain Analysis card.
- [ ] The card responds correctly to the application's panel sizing and scrolling.
- [ ] Initial, loading, complete, partial, unavailable, failed, and stale states work.
- [ ] No hardcoded demo metrics are shown as live mission results.
- [ ] The card refreshes when the selected route or relevant analysis configuration changes.

If any item fails, fix it before moving on. If the image is missing from the supplied Windows path and cannot be accessed in the development environment, report that exact blocker; do not pretend the background is installed.

### D. Required backend verification and repair

Verify that the backend is genuinely connected to the Run Mission Analysis workflow:

- [ ] The frontend sends the selected route geometry to the backend.
- [ ] The backend validates all route coordinates and rejects invalid requests.
- [ ] The backend uses the same route geometry as the center map and Phase 10 route calculations.
- [ ] The backend obtains numeric terrain elevation data from a documented source, or returns an explicit unavailable/blocked status.
- [ ] Dataset coverage is checked for the entire route or reported as partial.
- [ ] Dataset resolution, units, coordinate reference system, and vertical datum are retained where available.
- [ ] Route sampling uses a documented interval appropriate to the dataset.
- [ ] Route corridor width is explicit and included in the result metadata.
- [ ] Elevation samples are derived from actual DEM values.
- [ ] Slope is derived from suitable numeric elevation data.
- [ ] Roughness is derived using a documented method and appropriate resolution.
- [ ] Crater detections come from a documented catalog or validated detection method.
- [ ] Boulder/rock detection uses suitable high-resolution input or explicitly returns unavailable.
- [ ] Hazard detections are deduplicated.
- [ ] Total Obstacles is calculated from the returned, distinct, route-relevant feature records.
- [ ] Missing data is never converted to a zero count or zero elevation.
- [ ] Traversability uses the configured rover limits and returns undetermined when required limits or data are missing.
- [ ] API responses include metric-level statuses, source provenance, timestamps, warnings, and coverage information.
- [ ] External service failures, timeouts, and invalid responses are handled without crashing the page.
- [ ] The frontend displays the actual API response rather than a local mock object.

If the project currently contains only placeholder endpoints, mocked arrays, static JSON, hardcoded counts, or simulated terrain values, replace those with the real data pipeline where data access is available. Where data access is not available, implement the integration boundary and explicit unavailable response; do not manufacture a successful result.

### E. Required map integration verification and repair

- [ ] The map uses the same terrain-analysis response as the card.
- [ ] Only valid feature coordinates are plotted.
- [ ] Crater and boulder/rock marker types are distinguishable.
- [ ] Marker details match the corresponding backend feature record.
- [ ] Route-corridor intersection status is represented correctly.
- [ ] The map's feature list and the card's obstacle count cannot disagree due to separate calculations.
- [ ] Changing the route removes or invalidates markers from the previous analysis.

Implement any missing map integration. Do not add invented marker positions for visual completeness.

### F. Required regression checks

Run the project and verify that the following earlier phases still work:

- [ ] Phase 7: Horizons-based Sun and Earth analysis remains functional.
- [ ] Phase 8: Solar illumination/energy calculations and the existing card animation remain functional.
- [ ] Phase 9: The cyan lightning pin remains in its existing Solar Energy heading position and appearance.
- [ ] Phase 10: Rover configuration, battery/energy calculations, route inputs, and traverse-feasibility behavior remain functional.
- [ ] Existing map imagery, coordinate selection, route display, and mission input behavior remain functional.

Do not refactor or restyle these existing features unless a change is strictly required to integrate Phase 11. If a regression is found, repair it and retest.

### G. Automated and manual verification

Run the repository's actual commands for:
- Dependency/build validation, if applicable
- TypeScript type checking
- Linting
- Unit tests
- Relevant integration tests
- Production build

Do not guess command names; inspect `package.json` and use the scripts that actually exist.

Also perform a browser/manual check:
1. Open the mission workspace.
2. Confirm the card order and medium-brightness background.
3. Run analysis with a valid route.
4. Inspect the network request and response.
5. Confirm the card values match the response.
6. Confirm the map markers match the response feature list.
7. Change the route and verify old results become stale or are replaced after recalculation.
8. Test an invalid route.
9. Test a route with incomplete or unavailable terrain coverage, if the data source supports such a case.
10. Confirm that no unavailable metric is displayed as zero.

If browser automation is available in the project, add or update an end-to-end test for the primary flow.

### H. Final report must be evidence-based

For every checklist section, report:
- Status (`PASS`, `IMPLEMENTED`, `PARTIAL`, `BLOCKED`, or `FAIL`)
- Files inspected
- Files changed
- Verification performed
- Actual test command and result
- Remaining limitation, if any

List all unimplemented items explicitly. For each one, state whether it was:
1. implemented during this phase,
2. blocked by missing external data/access, or
3. left incomplete, with a clear reason.

**Do not finish by merely telling the user what should be implemented. Make the code changes for every implementable missing item, run the checks, and report the actual outcome.**
