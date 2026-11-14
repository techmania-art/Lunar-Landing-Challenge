# Phase 5 — User-Driven Coordinates, JPL Horizons, and Real LROC QuickMap Imagery

## 1. Objective

Replace the current dummy lunar map content with real high-resolution lunar surface imagery from the LROC QuickMap/LROC data ecosystem. Make the map and astronomy analysis respond to the coordinates, date, and UTC time supplied by the user.

This phase focuses on:
1. Removing arbitrary application-level coordinate thresholds that reject user-entered latitude/longitude values.
2. Preserving the user's entered coordinates as the source of truth.
3. Converting the coordinates into the exact coordinate conventions required by the map and JPL Horizons adapters.
4. Sending the observer location, date, and time to JPL Horizons for Sun and Earth ephemerides.
5. Displaying real high-resolution lunar imagery from a verified LROC/QuickMap-compatible source.
6. Marking the selected coordinates on the map with a red rectangle/crosshair and a coordinate callout at the corner of the rectangle.
7. Replacing the screenshot's dummy map imagery with actual lunar surface imagery.

Use the latest supplied map screenshot as the visual reference for the map panel and coordinate marker. Preserve the established Lunar Mission Planner workspace layout and visual style.

## 2. Important project rule: remove arbitrary input thresholds, not coordinate semantics

The project owner explicitly requests removal of previous custom thresholds or restrictive application rules on latitude, longitude, and other user-entered mission values.

Implementation requirements:
- Search the entire codebase for hardcoded coordinate thresholds, custom min/max attributes, schema `.min()`/`.max()` rules, clamping, default substitution, and duplicated validation logic.
- Remove arbitrary project-specific restrictions that were added without being required by the selected data provider or coordinate reference system.
- Do not silently clamp, normalize, replace, or rewrite the user's coordinates.
- Do not reject values merely because they fall outside a previous UI threshold.
- Preserve the exact raw values entered by the user for display and traceability.
- Parse values safely and reject malformed/non-finite input such as `NaN` or `Infinity`.
- Do not confuse removing custom thresholds with accepting malformed coordinates or ignoring the external service's documented coordinate conventions.

**Service boundary rule:** Each adapter must apply only the format and domain requirements documented by that specific service and coordinate system. If a value cannot be represented by the map projection or accepted by Horizons, return a clear, service-specific error. Never silently clamp it.

If a projection is unsuitable for a selected coordinate, select a supported projection/transform or explain the limitation. Do not mutate the user's source coordinate to make it fit.

Keep coordinate validation/conversion in a shared domain/adapter layer, not scattered across input components.

## 3. Inspect and document the current implementation

Before modifying code:

1. Read `context/AGENTS.md`, architecture context, UI context, code standards, and progress tracker.
2. Inspect Phase 2 mission input schema and components.
3. Inspect Phase 4 workspace, map panel, selected-coordinate overlay, and analysis panel.
4. Inspect all current coordinate validation, parsing, formatting, and conversion functions.
5. Inspect existing Horizons service/API code, environment variables, and tests.
6. Inspect current map library, projection configuration, map source, and dummy/placeholder map component.
7. Inspect any current LROC/QuickMap integrations and attribution handling.
8. Identify exactly which displayed map content is placeholder imagery, static background imagery, or real provider data.

Do not replace working services with mock implementations. Do not duplicate coordinate models or map adapters.

## 4. User input and coordinate data flow

The mission form remains the source of truth.

Expected flow:

1. User enters latitude, longitude, mission date, and mission time (UTC).
2. Parse the exact values without arbitrary app-level min/max thresholds.
3. Preserve raw entered values and produce a typed numeric coordinate object.
4. Send the coordinate object to the lunar map adapter.
5. Convert to the map provider's required longitude/latitude order, datum, and projection.
6. Centre/reproject the map around the supplied location.
7. Draw the selected-location rectangle, crosshair, and coordinate callout.
8. Send the same mission location and time to the Horizons adapter using the correct lunar observer specification.
9. Parse returned ephemeris data into typed results.
10. Display only values returned by the service or calculated from verified source data.

The map marker and Horizons observer must refer to the same physical location. Avoid independent defaults or coordinate drift.

### Coordinate representation

Use an explicit internal type and document axis order:

```ts
export type LunarCoordinates = {
  latitudeDeg: number;
  longitudeDeg: number;
  rawLatitude: string;
  rawLongitude: string;
};
```

Do not pass ambiguous arrays such as `[lat, lon]` through the codebase without a named type or explicit conversion function.

The map adapter must convert from the internal named representation to the provider's required axis order.

### No silent transformations

- Do not round coordinates before submitting them to Horizons unless the API's documented precision requires it.
- Do not round the internal value just to make the UI look tidy.
- Display a formatted coordinate string separately from the underlying numeric value.
- Document longitude direction (east-positive or west-positive) and latitude convention expected by each service.
- Convert explicitly where conventions differ.
- Preserve the original entered coordinate in the coordinate callout, while optionally showing a separately labelled provider-normalized coordinate if required.

## 5. JPL Horizons integration

### Purpose

Use JPL Horizons to calculate the apparent/geometric positions of solar-system objects for the supplied observer location and mission date/time.

User-facing explanation may say:

> JPL Horizons calculates the positions and movements of celestial objects, such as the Sun and Earth, at specific dates and times, as seen from a specified location.

Keep the explanation concise and accurate. Horizons is an ephemeris system; it does not itself provide the local terrain obstruction analysis or guarantee communications.

Official references:
- Horizons manual: https://ssd.jpl.nasa.gov/horizons/manual.html
- Horizons API documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Horizons tutorial: https://ssd.jpl.nasa.gov/horizons/tutorial.html
- Horizons API index: https://ssd.jpl.nasa.gov/api.html

The current Horizons manual explains that:
- Horizons provides ephemerides and observability data as a function of time and observer location.
- Observer tables can provide quantities such as azimuth and elevation.
- Surface locations on bodies with defined rotation models can be specified using planetodetic/geodetic coordinates.
- The Moon is a supported major body with a high-precision rotation model.
- The longitude/latitude/altitude convention and body reference must be specified correctly.

### Required implementation

1. Read the current official API documentation before constructing requests.
2. Use the Horizons API from a server-side service/route handler, not directly from browser components.
3. Use the Moon as the observer body and supply the user's surface location using the API's documented coordinate-center/observer syntax.
4. Supply the user's selected mission date and time with the correct time-scale semantics.
5. Query the Sun and Earth as targets from the same observer location and same instant.
6. Request observer-table quantities that provide the required angular position information, including azimuth and elevation where supported.
7. Set the coordinate reference frame, time scale, output format, and other relevant options explicitly rather than relying on defaults.
8. Parse the response robustly and check for API-level errors before treating a response as valid data.
9. Store source metadata: requested target, observer, time, units, coordinate convention, and retrieval time.
10. Handle timeouts, rate limits, unavailable ephemeris spans, malformed responses, and upstream errors.
11. Never expose API secrets or internal service configuration to the browser.
12. Do not fabricate fallback Sun/Earth angles when Horizons fails.

### Sun and Earth output

For each target, display available fields such as:
- Azimuth.
- Elevation.
- Observation date/time.
- Observer coordinates.
- Units and coordinate convention.
- Source: JPL Horizons.

Only display fields actually returned by the selected Horizons request and successfully parsed.

### Important distinction

Horizons azimuth/elevation describes the target's position relative to the observer's local reference/horizon geometry. It does not prove the object is visible above local lunar terrain.

Do not label an object "terrain visible" or "terrain unobstructed" unless a separate terrain-elevation/line-of-sight calculation has been implemented.

The Sun's geometric position is not the same as terrain-aware illumination. Earth geometric elevation is not the same as terrain-clear Earth visibility or an operational communication link.

## 6. Real high-resolution lunar map — LROC QuickMap

### Objective

Replace the dummy/static map content inside the Lunar Map panel with real high-resolution lunar surface imagery from the LROC QuickMap/LROC data ecosystem.

Official/context references:
- LROC QuickMap: https://quickmap.lroc.asu.edu/
- LROC data and WMS map services: https://data.lroc.imldi.com/lroc
- NASA LRO data products and QuickMap overview: https://science.nasa.gov/mission/lro/data-products/
- LROC usage terms and citation: https://www.lroc.im-ldi.com/about/terms
- LROC product documentation: https://pds-imaging.jpl.nasa.gov/documentation/LROC_SOC_RDR_SIS_Spec_4_v1-2.pdf

The LROC map services expose a range of products. The official LROC WMS map lists base layers such as:
- LROC WAC global 100 m/px.
- LROC WAC normalized reflectance.
- LROC WAC color shaded relief.
- Clementine elevation map.
- Clementine color ratio.
- Lunar airbrushed shaded relief.
- Lunar Orbiter global mosaic.

It also lists regional/high-resolution products and overlays, including LROC NAC products and regional DTM/footprint products. Availability and zoom-level limits vary by layer.

### Integration requirements

1. Investigate the current QuickMap/LROC service interface and documented map services.
2. Determine whether the selected implementation should use an official WMS/WMTS/Lunaserv endpoint, a documented QuickMap integration interface, or another supported LROC data service.
3. Do not scrape the QuickMap website's internal undocumented requests and treat them as a stable public API.
4. Do not invent a tile URL, layer name, tile matrix, projection, or endpoint.
5. Verify the service's current supported projections, coordinate systems, layer names, and zoom/scale constraints.
6. Configure the map adapter with the verified endpoint and layer metadata.
7. Ensure that the service's usage terms and attribution requirements are followed.
8. Keep map source configuration in one adapter/configuration module.
9. Use the high-resolution layer only where that layer is actually available. Fall back to a verified global/base layer at smaller scales or where regional high-resolution coverage is unavailable.
10. Show a clear loading, no-coverage, and provider-error state.
11. Do not substitute the landing page background image for map data.
12. Do not call a layer "LROC High Resolution" unless the selected source really is the corresponding LROC layer/product.

### Projection handling

The LROC product documentation describes equirectangular and polar stereographic map projections. Polar stereographic is suited to polar regions; equirectangular is commonly used at middle and lower latitudes.

Requirements:
- Choose a projection appropriate to the selected location and actual provider support.
- For lunar south-pole use, investigate and configure the correct polar stereographic mode when supported by the selected source.
- Implement the coordinate transformation through the map library/provider's supported projection adapter.
- Ensure the marker is placed using the same projection and axis order as the base imagery.
- Do not treat standard Earth Web Mercator as an automatically valid lunar projection.
- If a map library cannot support the needed lunar projection, choose a compatible adapter/library or use a verified official map interface; do not fake coordinate alignment.

### QuickMap coordinate navigation

When the user submits coordinates:
- Recenter the real lunar map at that exact selected location.
- Choose a useful initial zoom appropriate to the available imagery.
- Keep zoom and recenter controls working.
- Keep the selected coordinate synchronized with the mission input.
- Do not reset the map to a hardcoded location after each render.
- Do not overwrite user coordinates with the map's viewport centre.

## 7. Selected coordinate marker and red callout

Use the supplied latest map screenshot as the visual reference.

Implement the marker as a true map overlay anchored to the selected geographic coordinate, not a fixed-position decoration.

Visual requirements:
- Red rectangular selection outline.
- Subtle translucent red fill.
- Red centre crosshair.
- Coordinate callout positioned near a corner of the rectangle.
- Thin red connector from the box corner to the callout.
- Dark red translucent callout surface with a red border.
- White/light coordinate text.

Display values in this form:

```text
Lat: -89.50°
Lon: 0.00°
```

Requirements:
- Callout coordinates must come from the same submitted mission input used by Horizons.
- Update the marker whenever the user submits a new coordinate.
- Keep the marker geographically anchored during pan/zoom.
- Reposition the callout if it would otherwise be clipped by map boundaries.
- Ensure marker and callout remain legible at all supported screen sizes.
- Define the rectangle footprint explicitly. Do not imply that it represents a scientifically defined landing safety zone unless a real footprint size has been specified.
- Use a map library overlay/layer mechanism so the marker remains aligned with the imagery.

## 8. Map header and controls

Preserve the map panel header:
- Icon.
- **Lunar Map**
- Subtitle: **Explore terrain, imagery and elevation**
- Layer selector showing the actual configured source/layer.

Controls:
- Zoom in.
- Zoom out.
- Recenter on selected coordinate.

Requirements:
- All controls must call actual map adapter methods.
- Layer selector must only show verified, available layers.
- Do not hardcode a scale bar. Show it only if the map library can calculate it accurately for the selected lunar projection and zoom.
- Keep map attribution visible or accessible as required by the provider.

## 9. Remove the dummy map page/content

Identify and remove the dummy map visualization currently displayed in the workspace.

Replace it with:
- Actual LROC imagery from the configured provider.
- Correct lunar projection and coordinates.
- Real map controls.
- Real selected-location marker and callout.
- Correct loading/error/coverage states.

Do not remove the workspace structure, panel styling, mission input, or analysis panel. Only replace the dummy map content and connect the real coordinate/data flow.

The existing decorative background image may remain behind the workspace, but it must not be mistaken for the actual lunar map layer.

## 10. Architecture and component boundaries

Keep components replaceable and keep provider logic out of presentation components.

Suggested boundaries:

```text
components/
  lunar-map/
    lunar-map-view.tsx
    lunar-map-header.tsx
    lunar-map-controls.tsx
    lunar-map-layer-selector.tsx
    selected-coordinate-overlay.tsx
    map-attribution.tsx

lib/
  coordinates/
    lunar-coordinate-types.ts
    coordinate-format.ts
    coordinate-transform.ts
  services/
    horizons/
      horizons-client.ts
      horizons-request.ts
      horizons-parser.ts
      horizons-types.ts
    lunar-map/
      lroc-map-config.ts
      lroc-map-adapter.ts
      lroc-layer-metadata.ts
```

Adapt this structure to the repository. Reuse existing files where possible.

Rules:
- Do not duplicate coordinate types.
- Do not put API calls inside React components.
- Do not put map-provider internals inside the form.
- Do not expose upstream API response parsing to UI components.
- Keep source metadata and error states typed.
- Keep all secrets server-side.
- Use existing validation and testing libraries.

## 11. Data provenance and user-facing explanation

Add a concise information/help section or tooltip explaining:

**JPL Horizons**
"JPL Horizons calculates the positions and movements of celestial objects, such as the Sun and Earth, at specific dates and times, as seen from a specified location."

**LROC QuickMap**
"Provides lunar imagery and terrain products from the Lunar Reconnaissance Orbiter Camera (LROC), allowing the selected landing location to be viewed in its surrounding lunar landscape."

Make it clear which service supplies each output:
- Map imagery and terrain layers: LROC/QuickMap-compatible data service.
- Sun/Earth ephemerides: JPL Horizons.
- Terrain obstruction: separate calculation using terrain data, only if implemented.

Display source attribution and relevant license/terms. Do not imply that QuickMap itself is the source of Horizons ephemerides.

## 12. Error handling and reliability

Handle:
- Invalid numeric input.
- Coordinate convention mismatch.
- Unsupported projection.
- No high-resolution coverage at requested location/zoom.
- Map tile/WMS request failure.
- Horizons request timeout.
- Horizons API error response.
- Unsupported date/time span.
- Response parse failure.
- Network unavailable.

For each:
- Keep the user's input intact.
- Display a concise, actionable error.
- Avoid silently replacing data with hardcoded sample values.
- Provide retry where appropriate.
- Keep the map and form usable if the Horizons service is unavailable.
- Keep the Horizons results panel usable if map imagery fails, where possible.


## 13. API health, contract, and integration checks

This section is mandatory. Do not treat ordinary UI tests as sufficient API verification.

### 13.1 JPL Horizons API checks

Implement and test:

- **Connectivity/availability:** make a controlled server-side request to the documented Horizons API and distinguish DNS, connection, TLS, timeout, HTTP, and API-level failures.
- **HTTP status:** verify successful HTTP responses before parsing; handle non-2xx responses explicitly.
- **API error payloads:** inspect the documented error fields and reject responses that report an API error even if the HTTP status is successful.
- **Request contract:** verify target, observer centre/location, coordinate convention, date/time, time scale, reference frame, requested quantities, and output format.
- **Response contract:** validate the expected response shape and required fields before mapping to internal types.
- **Numeric validation:** reject missing, non-numeric, non-finite, or out-of-range result fields where the API contract defines a valid range.
- **Units and semantics:** verify azimuth/elevation units and conventions; do not mix degrees/radians or geometric/apparent quantities.
- **Time correctness:** test UTC-to-request formatting and confirm the exact intended observation instant is sent.
- **Timeouts:** configure a bounded request timeout.
- **Retries:** retry only transient failures (for example selected network failures, HTTP 429, and retryable 5xx responses) with bounded exponential backoff and jitter. Respect `Retry-After` when provided. Do not retry malformed requests or permanent 4xx errors indiscriminately.
- **Rate limiting:** handle HTTP 429 and provider guidance without request storms.
- **Caching:** if caching is introduced, key it by target, observer coordinates, date/time, time scale, and all parameters that affect the result. Do not return stale results for a different mission input.
- **Observability:** log request correlation ID, target, observer, time, duration, status, and sanitized error details. Never log secrets or unnecessary sensitive data.
- **Graceful failure:** show a clear unavailable/error state and preserve the user's input. Never substitute hardcoded Sun/Earth values.

### 13.2 LROC/QuickMap map-service checks

Implement and test:

- **Service reachability:** verify the configured WMS/WMTS/tile service can be reached from the application/server/browser architecture selected.
- **Capabilities/metadata:** where supported, request and inspect the provider's official capabilities or layer metadata document.
- **Layer contract:** verify configured layer identifiers, formats, coordinate reference systems, styles, and supported bounds/scale ranges.
- **Projection compatibility:** confirm the selected map projection and request CRS are supported by the actual endpoint.
- **Tile/image response:** verify successful status, expected image content type, and decodable image payload. Do not treat an HTML error page as a valid tile.
- **Coverage and zoom:** test representative locations and zoom levels, including the lunar south-pole region, and handle unavailable high-resolution coverage by using a verified lower-resolution layer.
- **Attribution/terms:** ensure attribution and license/usage requirements are visible or accessible.
- **Failure handling:** handle timeout, unavailable layer, missing coverage, invalid CRS, tile failure, and provider outage without displaying fabricated map content.
- **Map interaction:** verify pan, zoom, recenter, and marker alignment remain correct when imagery is loaded from the actual provider.

### 13.3 Health-check endpoints and diagnostics

Add an application-owned health endpoint only if the project's architecture requires operational health monitoring. It must not expose secrets, internal stack traces, or sensitive provider responses.

Recommended separation:
- `/api/health` — application process/readiness check; does not need to call external providers on every request.
- A protected or development-only diagnostics check — performs controlled upstream checks for Horizons and the map service, with strict timeouts and rate limits.

Do not make every page load call external health checks. Do not let an upstream provider outage make the basic application liveness endpoint appear dead if the app itself is running.

Report external dependencies separately, for example:
- Application: healthy.
- Horizons: reachable / degraded / unavailable / not checked.
- Lunar map provider: reachable / degraded / unavailable / not checked.

Only expose this status publicly if the project explicitly intends to; otherwise keep diagnostics server-side or development-only.

### 13.4 Automated API test matrix

Add automated tests using the existing test stack:

| Test | Expected result |
|---|---|
| Valid Horizons request construction | Correct observer, targets, time, and output parameters |
| Horizons success response | Parsed into typed Sun/Earth result objects |
| HTTP 400/404 | Permanent request/configuration error surfaced |
| HTTP 429 | Rate-limit handling and bounded retry behavior |
| HTTP 500/502/503 | Transient error handling and bounded retry |
| Network timeout | Timeout state; no fabricated result |
| Malformed JSON/text response | Safe parse failure |
| Horizons API error in success payload | Rejected as provider error |
| Missing azimuth/elevation | Missing data represented explicitly, not defaulted |
| Invalid numeric result | Rejected or marked unavailable |
| Valid map capabilities response | Configured layer/CRS metadata accepted |
| Unknown map layer/CRS | Configuration error surfaced |
| Tile returns HTML instead of image | Tile failure detected |
| High-resolution coverage absent | Verified fallback layer used, if available |
| Map provider timeout | Map error state shown; UI remains usable |
| Coordinate change | Map marker and Horizons request use the same selected location |

Use mocked provider responses for deterministic unit and integration tests. Add a small, controlled live smoke test only when network access is available and only when it will not overload external services. Live tests must be optional or separately gated so ordinary CI does not become flaky due to provider outages.

### 13.5 CI and quality gates

Ensure the repository's CI workflow (or documented local verification commands) runs:
- ESLint.
- TypeScript type-check.
- Unit tests.
- API contract/adapter tests.
- Component tests.
- Production build.

Run optional live-provider smoke tests separately from deterministic CI tests. A provider outage should be reported as an external dependency failure, not hidden or converted into a passing test.

If the repository has no CI workflow, add one using the project's existing package manager and scripts. Do not invent script names; define the required scripts and ensure each command actually runs.


## 14. Testing and verification

Use the existing test stack. Do not install duplicate frameworks.

### Coordinate tests
- Values previously blocked only by arbitrary app-level thresholds are no longer blocked by those custom rules.
- Malformed and non-finite inputs are still rejected.
- Coordinate axis order is explicit.
- Longitude direction conversion is correct.
- Map and Horizons receive the same physical location.
- No silent clamping or rounding occurs.

### Horizons service tests
- Request contains correct target body, lunar observer body/location, mission date, and UTC time semantics.
- Sun and Earth requests use the same observer and time.
- API error responses are handled.
- Response parser extracts only requested/available fields.
- Missing or malformed fields do not become fabricated values.
- Timeout and retry behavior are handled.

Mock Horizons responses in unit tests. Do not use live network requests as the only test strategy.

### Map tests
- Real provider configuration is loaded.
- Correct projection is configured.
- Map recentres at the selected coordinates.
- Marker remains attached to the geographic location after pan/zoom.
- Callout displays the selected coordinates.
- Layer selector lists only configured layers.
- Provider errors and missing coverage are displayed.
- Scale bar is shown only if accurate.

### End-to-end tests
- Enter coordinates, date, and UTC time.
- Submit the mission.
- Confirm map recentres.
- Confirm red selection rectangle/crosshair appears.
- Confirm callout shows the exact coordinates.
- Confirm Horizons request uses the same observer and time.
- Confirm Sun/Earth values are rendered only from a valid response.
- Confirm map failure does not fabricate map content.
- Confirm Horizons failure does not fabricate astronomy values.

### Visual checks
Capture and inspect at:
- Desktop: 1672 × 941.
- Tablet: 1024 × 768.
- Mobile: 390 × 844.

Check:
- Map imagery fills the central map panel.
- High-resolution imagery appears at appropriate zoom levels.
- Marker and callout match the supplied screenshot.
- Panel layout remains consistent.
- The map remains distinct from the decorative page background.
- No tile seams, blank tiles, or projection misalignment appear.

## 15. Completion criteria

- [ ] Existing map and coordinate code inspected.
- [ ] Arbitrary app-level latitude/longitude thresholds removed.
- [ ] Service-specific coordinate requirements remain explicit and documented.
- [ ] User coordinates are preserved without silent clamping or mutation.
- [ ] Coordinate conversion is explicit and tested.
- [ ] JPL Horizons server-side integration uses the user's lunar observer location and mission date/time.
- [ ] Sun and Earth ephemerides are requested and parsed.
- [ ] JPL Horizons error handling works.
- [ ] Horizons HTTP/API errors, response contracts, units, time semantics, timeouts, retries, and rate limits are tested.
- [ ] LROC service reachability, capabilities/layer metadata, CRS, image content types, coverage, and failure cases are tested.
- [ ] Application health and external-provider diagnostics are separated appropriately.
- [ ] Deterministic API contract tests run in CI or the documented verification workflow.
- [ ] Dummy map content is removed.
- [ ] Real LROC/QuickMap-compatible imagery is integrated.
- [ ] Projection and layer names are verified against provider documentation.
- [ ] High-resolution regional imagery is used where available, with verified fallback layers.
- [ ] Map recentres to the user's selected coordinates.
- [ ] Red selection rectangle, crosshair, and corner callout are geographically anchored.
- [ ] Callout shows the selected latitude and longitude.
- [ ] Map controls and layer selector work.
- [ ] Attribution and terms are respected.
- [ ] No fabricated scientific values or map tiles are displayed.
- [ ] Tests, lint, type-check, and production build pass, or failures are documented.
- [ ] Desktop/tablet/mobile screenshots have been reviewed.

## 16. Required completion report

When finished, report:

1. Previous thresholds/rules found and removed.
2. Any remaining service-specific coordinate constraints and why they are required.
3. Coordinate format and transformation conventions used.
4. Horizons API request strategy, target IDs, observer configuration, requested quantities, and time scale.
5. Example sanitized request/response summary (never include secrets).
6. LROC/QuickMap-compatible source endpoint, layer names, projection, and zoom/coverage behavior.
7. Whether high-resolution imagery is truly loaded from the provider.
8. Marker/callout geographic anchoring verification.
9. Files created or modified.
10. Tests and commands run with results.
11. Screenshots/viewports reviewed.
12. API health/diagnostic design and provider status checks.
13. API contract test matrix results, including HTTP errors, malformed responses, timeouts, retries, and rate limits.
14. CI/local quality-gate results and any optional live-provider smoke-test results.
15. Known limitations, including any terrain-aware visibility work not yet implemented.

Do not claim that QuickMap, Horizons, or high-resolution imagery is integrated unless it was actually connected and verified. Distinguish real provider data from local mock/test fixtures.

## 17. Official references

- JPL Horizons manual: https://ssd.jpl.nasa.gov/horizons/manual.html
- JPL Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- JPL Horizons tutorial: https://ssd.jpl.nasa.gov/horizons/tutorial.html
- NASA API index: https://ssd.jpl.nasa.gov/api.html
- LROC QuickMap: https://quickmap.lroc.asu.edu/
- LROC WMS map: https://data.lroc.imldi.com/lroc
- NASA LRO data products: https://science.nasa.gov/mission/lro/data-products/
- LROC terms and citation: https://www.lroc.im-ldi.com/about/terms
- LROC product map projection specification: https://pds-imaging.jpl.nasa.gov/documentation/LROC_SOC_RDR_SIS_Spec_4_v1-2.pdf
