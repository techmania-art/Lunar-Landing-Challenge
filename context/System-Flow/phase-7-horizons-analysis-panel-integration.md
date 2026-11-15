# Phase 7 — Integrate JPL Horizons Results into the Mission Analysis Panel

## 1. Objective

Integrate the real data retrieved from the JPL Horizons calculation system into the existing **Mission Analysis panel on the integrated Analysis Workspace page**.

Convert validated Horizons response data into clear, readable analysis cards that help the user understand the Sun and Earth positions at the selected lunar location and mission time.

This phase is specifically about the complete data path:

```text
Mission Input
    ↓
Validated mission coordinates + date + UTC time
    ↓
JPL Horizons request
    ↓
Horizons response
    ↓
Parse + validate + normalize units
    ↓
Sun and Earth analysis models
    ↓
Mission Analysis cards
    ↓
Clear scientific explanation + source + timestamp
```

Do not redesign the overall workspace or replace the existing background, map, or input components. Reuse the existing Mission Analysis panel and its design system.

**Important:** Display only values actually returned by a successful Horizons request. Do not use sample values, hardcoded angles, or fabricated success states.

## 2. Mandatory preliminary inspection

Before implementation:

1. Read `context/AGENTS.md`.
2. Read `context/project-overview.md`.
3. Read `context/architecture-context.md`.
4. Read `context/ui-context.md`.
5. Read `context/code-standards.md`.
6. Read `context/progress-tracker.md`.
7. Read `context/debug-state-and-issue-tracker.md`.
8. Read the Phase 5 Horizons/QuickMap integration context.
9. Read the broader Phase 7 integration context if it exists.
10. Inspect the actual Horizons API adapter, request builder, response parser, types, server routes, and current tests.
11. Inspect the current Mission Analysis panel and its Sun Analysis, Earth Analysis, and Communication Visibility cards.
12. Run existing tests and record the baseline before changing code.

Do not assume Horizons integration works because a card or a loading state is visible. Verify whether the application is receiving and parsing actual Horizons responses.

## 3. Horizons values to integrate

For the initial analysis dashboard, integrate these four primary values:

| Analysis group | Horizons output | Meaning |
|---|---|---|
| Sun Analysis | Sun azimuth | Direction of the Sun relative to the configured local reference convention |
| Sun Analysis | Sun elevation | Sun's angular elevation relative to the configured geometric reference horizon |
| Earth Analysis | Earth azimuth | Direction of Earth relative to the configured local reference convention |
| Earth Analysis | Earth elevation | Earth's angular elevation relative to the configured geometric reference horizon |

For each value, preserve and display the correct:
- Numeric value.
- Unit (normally degrees when the request returns angular quantities in degrees).
- Observation date/time in UTC.
- Target body.
- Observer location/configuration.
- Reference frame and coordinate convention where relevant.
- Data source: JPL Horizons.
- Retrieval or calculation status.

Do not assume the API output is in degrees without checking the actual request parameters and response metadata.

### Scope control

Do not add unrelated Horizons outputs merely because they are available. Add distance, range rate, angular diameter, or other quantities only if the project explicitly requires them and the request/parser is configured to retrieve and validate them.

## 4. Correct scientific interpretation

### 4.1 Sun Analysis

Show:
- Sun azimuth.
- Sun elevation.
- Geometric horizon interpretation, if it can be derived correctly from the returned elevation and documented convention.
- Observation timestamp.

Interpretation rules:
- Positive elevation generally indicates the Sun is above the geometric reference horizon.
- Negative elevation generally indicates the Sun is below the geometric reference horizon.
- Near-zero elevation should be described as near the geometric horizon, using a documented tolerance if one is adopted.
- Do not describe this as terrain-clear sunlight.
- Do not claim sunlight duration, continuous illumination, or shadow status from one instantaneous Horizons result.

### 4.2 Earth Analysis

Show:
- Earth azimuth.
- Earth elevation.
- Geometric horizon interpretation, if the response and reference convention support it.
- Observation timestamp.

Interpretation rules:
- Positive elevation generally indicates Earth is above the geometric reference horizon.
- Negative elevation generally indicates Earth is below the geometric reference horizon.
- Near-zero elevation should be described as near the geometric horizon.
- Do not claim direct communication is possible solely because Earth is geometrically above the horizon.
- Do not claim terrain-clear line of sight without a separate terrain obstruction calculation.

### 4.3 Communication Visibility

Use Horizons Earth elevation only for a **geometric visibility indication**:

- Earth geometrically above horizon.
- Earth geometrically below horizon.
- Near geometric horizon.
- Unavailable / cannot determine.

Clearly label this as geometric visibility.

Do not label it `Communication Available`, `Direct Link`, or `Link Established` unless the application also models terrain obstruction and the required radio link-budget/antenna conditions.

## 5. Request and observer consistency

All displayed Horizons results must correspond to the exact mission request submitted by the user.

Verify:
- Lunar observer body and surface location are configured correctly.
- Latitude and longitude are passed using the provider's documented coordinate convention.
- Longitude direction and units are explicit.
- Mission date and UTC time are converted to the intended observation instant.
- Sun and Earth target identifiers are correct.
- Reference frame and requested quantities are explicit.
- The response timestamp matches the requested observation time or is clearly explained if the API returns a different representation.

Do not silently swap latitude and longitude, change longitude sign, round coordinates, or substitute a different observer location.

The map marker, Horizons observer, and displayed mission input must refer to the same physical location.

## 6. Response parsing and normalization

Keep Horizons-specific parsing inside the service/adapter layer. Do not parse raw Horizons text inside React components.

Create or reuse typed internal models. Conceptually:

```ts
export type AngularMeasurement = {
  value: number;
  unit: "deg";
};

export type CelestialPosition = {
  target: "Sun" | "Earth";
  azimuth: AngularMeasurement;
  elevation: AngularMeasurement;
  observedAtUtc: string;
  source: "JPL Horizons";
  referenceFrame?: string;
  coordinateConvention?: string;
};

export type HorizonsAnalysisResult = {
  status: "success" | "unavailable" | "error";
  observer: {
    latitudeDeg: number;
    longitudeDeg: number;
  };
  requestedAtUtc: string;
  sun?: CelestialPosition;
  earth?: CelestialPosition;
  error?: {
    code: string;
    message: string;
  };
};
```

Adapt this model to the actual response and existing project types. Do not copy the example blindly if it conflicts with the real API schema.

Validation requirements:
- Confirm response is from the expected Horizons request.
- Reject API-level error payloads even when HTTP status is successful.
- Confirm required fields exist.
- Parse numbers safely.
- Reject `NaN`, infinity, missing values, and malformed fields.
- Validate units and reference conventions.
- Preserve the original response or a sanitized diagnostic fixture for debugging where project policy permits.
- Never turn missing values into zero.
- Never display stale results as if they belong to a newly submitted mission.

## 7. Mission Analysis panel presentation

Reuse the current Mission Analysis panel and its visual style.

The panel should contain distinct, easy-to-scan cards:

### 7.1 Sun Analysis card

Display:
- Card title: `Sun Analysis`.
- Status badge: `Live Horizons Data`, `Unavailable`, `Error`, or another accurate state.
- Sun azimuth in degrees.
- Sun elevation in degrees.
- Geometric horizon status.
- Observation timestamp in UTC.
- Source label: `JPL Horizons`.
- A short explanation of what the values mean.
- A limitation note: local terrain obstruction is not included unless a separate terrain calculation has been completed.

Suggested layout:

```text
SUN ANALYSIS                         LIVE HORIZONS DATA

Sun Azimuth                         123.45°
Sun Elevation                         8.20°

Geometric Status: Above horizon

Observation: 2028-01-15 12:00 UTC
Source: JPL Horizons

The Sun is geometrically above the reference horizon.
Local terrain obstruction is not included in this result.
```

The values above are illustrative layout examples only. Never display them as actual mission results.

### 7.2 Earth Analysis card

Display:
- Card title: `Earth Analysis`.
- Accurate data status.
- Earth azimuth in degrees.
- Earth elevation in degrees.
- Geometric horizon status.
- Observation timestamp in UTC.
- Source label: `JPL Horizons`.
- Short explanation.
- Limitation note: terrain obstruction has not been evaluated unless the separate DEM/line-of-sight calculation succeeded.

Suggested layout:

```text
EARTH ANALYSIS                       LIVE HORIZONS DATA

Earth Azimuth                        45.60°
Earth Elevation                      12.30°

Geometric Status: Above horizon

Observation: 2028-01-15 12:00 UTC
Source: JPL Horizons

Earth is geometrically above the reference horizon.
Terrain obstruction and radio link conditions are not included.
```

Again, these are illustrative values only.

### 7.3 Communication Visibility card

Display:
- Geometric Earth visibility status derived from the validated Earth elevation.
- Observation timestamp.
- Source.
- Explicit distinction between geometric visibility and terrain-clear line of sight.
- If a terrain LOS result exists, show it separately with its dataset/resolution and calculation status.
- If radio link-budget analysis does not exist, state that operational communication availability has not been evaluated.

### 7.4 Surrounding Terrain card

Do not populate this card using Horizons data. It must use an appropriate lunar terrain dataset.

If no numeric DEM result is integrated, show `Terrain data unavailable` or `Not yet analysed`. Do not infer elevation, slope, roughness, or obstruction from a map screenshot or Horizons position.

## 8. Data freshness and loading behavior

When the user submits a new mission:
1. Mark old analysis results as stale or clear them.
2. Show a loading state for the new request.
3. Request Horizons data for the new coordinates and timestamp.
4. Validate the response.
5. Update Sun and Earth cards only with results for the latest request.
6. Ignore late responses from older requests.
7. Display a timestamp and source for successful results.

Do not show old results under new coordinates.

Use separate states:
- `idle`
- `loading`
- `success`
- `partial`
- `unavailable`
- `error`

If Sun succeeds but Earth fails, show a partial result rather than hiding the successful value or claiming complete analysis.

## 9. Error handling

Handle these cases explicitly:

| Failure | UI behavior |
|---|---|
| Horizons request timeout | Show unavailable state and retry action |
| HTTP error | Show provider request failure |
| API error payload | Show Horizons calculation error |
| Malformed response | Show invalid response state; do not render values |
| Missing Sun data | Sun card unavailable; Earth may still render |
| Missing Earth data | Earth and geometric visibility unavailable |
| Invalid units/convention | Reject result and report validation error |
| Mission input changed | Mark previous result stale while new request runs |
| Provider rate limit | Respect retry guidance and show a clear message |
| No network | Keep workspace usable and show data unavailable |

Never render hardcoded angles, fake green success badges, or fallback scientific values.

## 10. Testing requirements

Use the project's existing test framework.

### Unit tests
- Horizons response parser extracts Sun azimuth/elevation.
- Horizons response parser extracts Earth azimuth/elevation.
- Unit conversion/normalization is correct.
- Invalid and missing numeric fields are rejected.
- API-level error payload is rejected.
- UTC timestamp is preserved correctly.
- Geometric horizon status is derived correctly from the configured convention.
- Missing Sun data does not incorrectly invalidate valid Earth data, and vice versa.
- No terrain-clear or radio-link claim is generated from geometric elevation alone.

### Component tests
- Sun card displays actual typed values and units.
- Earth card displays actual typed values and units.
- Source and UTC timestamp are visible.
- Unavailable/error states render correctly.
- Partial success renders correctly.
- Stale data is not shown as current.
- Communication card distinguishes geometric visibility from operational link status.
- Terrain card does not display invented DEM metrics.

### Integration tests
- Submitted mission input reaches the Horizons adapter unchanged except for documented conversions.
- Horizons response is parsed into typed models.
- Typed models reach the correct analysis cards.
- A new mission request updates both cards.
- Older async responses cannot overwrite newer results.

### Live smoke test
When network access is available:
- Send a controlled real Horizons request.
- Save a sanitized response fixture.
- Verify the parser against the real response.
- Record observer, target, timestamp, units, and result fields.
- Confirm the browser displays the returned values.

Mocks may be used for deterministic tests but cannot be reported as proof of live Horizons integration.

## 11. Debug and progress tracking

Update:
- `context/progress-tracker.md`
- `context/debug-state-and-issue-tracker.md`
- `context/architecture-context.md` if service contracts or data flow change.

Record:
- Horizons request configuration.
- Actual response validation status.
- Sun and Earth fields retrieved.
- Units and reference convention.
- UI cards connected.
- Tests run and results.
- Any missing or unsupported fields.
- Whether the integration was tested with live Horizons data or mocks only.

Use the existing debug status definitions. Do not mark the integration verified until the live request, response parser, and browser display have all been tested.

## 12. Completion criteria

- [ ] Existing Horizons adapter and Mission Analysis UI inspected.
- [ ] Actual Horizons request configuration verified.
- [ ] Correct observer coordinates and UTC timestamp used.
- [ ] Sun azimuth retrieved and validated.
- [ ] Sun elevation retrieved and validated.
- [ ] Earth azimuth retrieved and validated.
- [ ] Earth elevation retrieved and validated.
- [ ] Units and reference conventions confirmed.
- [ ] Typed internal result model implemented or reused.
- [ ] Raw response parsing remains outside UI components.
- [ ] Sun Analysis card displays real values, units, source, and timestamp.
- [ ] Earth Analysis card displays real values, units, source, and timestamp.
- [ ] Communication card clearly labels geometric visibility.
- [ ] Terrain obstruction is not inferred from Horizons alone.
- [ ] Loading, partial, unavailable, stale, and error states work.
- [ ] No dummy scientific values or misleading success states remain.
- [ ] Unit, component, and integration tests pass.
- [ ] Live Horizons smoke test is recorded, or integration is explicitly marked not live-verified.
- [ ] Debug-state and progress files are updated.

## 13. Required completion report

Provide:
1. Horizons request parameters and observer configuration used.
2. Actual response fields retrieved.
3. Units, time scale, and reference convention.
4. Files created or modified.
5. Typed result model and parser details.
6. Sun Analysis card behavior and fields.
7. Earth Analysis card behavior and fields.
8. Communication Visibility interpretation and limitations.
9. Test commands and actual pass/fail results.
10. Whether real live Horizons data was retrieved and displayed.
11. Debug issue IDs and updated statuses.
12. Progress tracker update.
13. Remaining limitations.

**Do not report this phase complete because the cards render. Complete it only when validated Horizons results flow into the correct analysis cards and the displayed values are traceable to the selected mission request.**
