# Phase 8 — Solar Illumination and Energy Availability

## 1. Objective

Implement a solar-energy assessment for the user's selected lunar location.

Use the mission coordinates and time, JPL Horizons Sun-position results, and a suitable lunar terrain elevation dataset to determine whether direct sunlight reaches the selected rover location.

The application must then:
- If the location is illuminated, estimate solar power and energy using configured rover solar-panel specifications.
- If the location is terrain-shadowed or the Sun is below the horizon, report **No direct solar energy available** for that time and location.
- If only part of the analysis interval is illuminated, calculate energy only over illuminated periods.
- If required data is missing or invalid, report **Unable to determine**, not darkness or zero energy.

**Terminology:** Do not say the rover has “no energy source” in an absolute sense. This calculation only establishes whether direct solar energy is available. Stored battery energy or another power source is outside scope unless separately modelled.

This phase focuses on solar illumination and energy availability. Earth communication obstruction is a separate calculation.

## 2. Mandatory preliminary inspection

Before implementation:

1. Read `context/AGENTS.md`.
2. Read project overview, architecture, UI, code standards, workflow rules, progress tracker, and debug-state tracker.
3. Read the CSA/NASA research notes and existing Horizons integration context.
4. Inspect the mission input, Horizons adapter, Mission Analysis panel, terrain adapter, and test setup.
5. Verify which features are implemented, mocked, unavailable, or blocked.
6. Run existing checks and record the baseline.

Do not assume numeric terrain data is available merely because lunar imagery is displayed. A map image is not a digital elevation model (DEM).

## 3. Required inputs

### Mission inputs
Reuse the canonical mission request:
- Lunar latitude and longitude.
- Mission date.
- Mission time (UTC).
- Analysis interval or mission duration, if supplied.

Do not silently alter coordinates, date, or time.

### Solar-panel configuration
Energy generation cannot be calculated from sunlight alone. Add or reuse explicit configuration fields:
- Solar panel active area (m²).
- Panel conversion efficiency.
- Panel orientation/normal, or a documented assumption such as a fixed horizontal panel.
- System derating/loss factor, if modelled.
- Temperature model, if supported by validated inputs.

If panel specifications are missing, the application may report illumination status and sunlight duration, but must not invent watts or watt-hours. Any demonstration defaults must be labelled as assumptions and configurable.

## 4. Data sources and responsibilities

| Source | Data | Responsibility |
|---|---|---|
| JPL Horizons | Sun direction/position at the lunar observer and requested times | Sun azimuth/elevation over time |
| LOLA-derived or other suitable numeric lunar DEM | Terrain elevation around the selected location | Local terrain horizon and shadow obstruction |
| LROC imagery | Visual surface context | Map display and visual cross-check only; not a numeric DEM |
| Rover configuration | Panel area, efficiency, orientation, losses | Convert sunlight into estimated electrical power |

Record dataset identity, resolution, coordinate reference system, vertical datum, coverage, and source for terrain calculations.

## 5. Determine whether the location is illuminated

A positive Horizons Sun elevation alone does not prove that sunlight reaches the rover. Nearby ridges and crater walls may block the Sun.

For each sample time in the analysis interval:

1. Obtain Sun azimuth and elevation from a valid Horizons result.
2. Retrieve a numeric DEM covering the relevant terrain.
3. Transform the rover coordinate and terrain samples into a consistent lunar coordinate reference system.
4. Calculate the local terrain horizon angle in the Sun's azimuth direction.
5. Compare Sun elevation with the local terrain horizon.
6. Account for near-horizon uncertainty and the solar disk if supported.
7. Return an explicit illumination state.

Required states:
- `ILLUMINATED`: direct sunlight is clear of modelled local terrain.
- `TERRAIN_SHADOWED`: local terrain blocks direct sunlight.
- `GEOMETRICALLY_BELOW_HORIZON`: Sun is below the geometric reference horizon.
- `UNCERTAIN`: terrain coverage, resolution, coordinate transformation, or calculation quality is insufficient.
- `UNAVAILABLE`: required provider/data request failed.

Do not classify missing DEM or failed Horizons requests as darkness.

Conceptual decision:

```text
if ephemeris or terrain data is missing:
    state = UNAVAILABLE or UNCERTAIN
else if Sun is below geometric horizon:
    state = GEOMETRICALLY_BELOW_HORIZON
else if Sun elevation is above local terrain horizon:
    state = ILLUMINATED
else:
    state = TERRAIN_SHADOWED
```

Use a documented tolerance near the horizon. Do not introduce arbitrary thresholds without scientific or numerical justification.

## 6. Calculate solar power when illuminated

Only calculate power when illumination is valid and required panel specifications are available.

A simplified direct-beam model is:

\[
P(t)=A \times \eta \times G(t) \times
\max(0,\cos(\theta(t))) \times L
\]

Where:
- \(P(t)\): estimated electrical power (W).
- \(A\): active panel area (m²).
- \(\eta\): panel conversion efficiency as a fraction.
- \(G(t)\): direct solar irradiance at the lunar surface (W/m²), using a documented model.
- \(\theta(t)\): angle between incoming sunlight and panel normal.
- \(L\): documented system derating/loss factor, if used.

If terrain blocks direct sunlight:

\[
P_{\text{direct}}(t)=0
\]

This means zero modelled direct solar generation at that time. It does not mean the rover battery is empty or that every possible energy source is unavailable.

### Irradiance requirements
- Use a documented solar irradiance value/model appropriate to the Moon and mission date.
- State whether the model uses solar constant, heliocentric-distance correction, or other adjustments.
- Do not treat lunar surface irradiance as measured local weather data.
- Do not silently include diffuse/reflected light. If not modelled, state that the estimate covers direct solar generation only.

### Panel orientation
Use the configured panel normal when available. If assuming a horizontal panel, label it. A changing rover attitude or tracking panel requires a time-dependent orientation model.

## 7. Calculate energy over time

For an analysis interval, sample illumination and power over time and integrate:

\[
E_{\mathrm{Wh}} \approx
\sum_{i=1}^{n}
\frac{P_i+P_{i+1}}{2}
\cdot \frac{\Delta t_i}{3600}
\]

Where \(\Delta t_i\) is in seconds.

Report:
- Total analysed interval.
- Total illuminated duration.
- Total shadowed duration.
- Longest continuous shadow interval.
- Estimated direct solar energy in Wh or kWh, only when panel specifications and irradiance inputs are valid.
- Sampling interval and terrain resolution.
- Assumptions and uncertainty.

Do not calculate a mission-period energy total from one instantaneous Horizons result. A single timestamp supports only an instantaneous illumination/power assessment.

## 8. Required behavior for dark or unlit locations

When valid data proves the location is not illuminated at the requested time:
- Set direct solar power to `0 W` for that time sample.
- Show `NO DIRECT SOLAR ENERGY AVAILABLE`.
- Explain whether the reason is terrain shadow or Sun below the geometric horizon.
- Show the observation timestamp.
- Do not display a positive generated-energy value for that instant.
- Do not label the rover as having no energy source.
- For a time interval, continue evaluating later samples; the location may receive sunlight later.

If the result is `UNCERTAIN` or `UNAVAILABLE`, do not display `0 W` as a proven physical result. Show `Unable to determine` and the reason.

## 9. Mission Analysis panel presentation

Integrate results into the existing right-hand Mission Analysis panel. Preserve the current workspace design.

### Solar Illumination card
Display:
- Illumination state.
- Sun azimuth and elevation.
- Local terrain horizon angle in the Sun's direction.
- Observation timestamp.
- Terrain dataset and resolution.
- Source/provenance.

### Solar Energy card
When illuminated and all required inputs exist, display:
- Estimated instantaneous solar power (W).
- Estimated energy over the selected interval (Wh/kWh).
- Solar panel area.
- Panel efficiency.
- Panel orientation/assumption.
- Irradiance model/source.
- Estimated illuminated duration.
- Model limitations.

When valid data shows darkness or terrain shadow, display:

```text
NO DIRECT SOLAR ENERGY AVAILABLE

The selected location is not receiving direct sunlight
at the requested mission time.

Estimated direct solar power: 0 W
Reason: Terrain shadow / Sun below geometric horizon
Observation: [actual UTC timestamp]
```

When data is insufficient, display:

```text
SOLAR ENERGY: UNABLE TO DETERMINE

Required terrain, ephemeris, or rover panel data is unavailable.
No energy estimate has been generated.
```

### Mission interval summary
If an interval was requested, show:
- Sunlight availability percentage.
- Total illuminated time.
- Total shadowed time.
- Longest continuous darkness period.
- Estimated direct solar energy over the interval.

Label results as model estimates and show the interval and sampling resolution.

## 10. Data integrity and state handling

Use typed result states, adapting to existing project types:

```ts
type SolarAvailabilityStatus =
  | "illuminated"
  | "terrain-shadowed"
  | "below-horizon"
  | "uncertain"
  | "unavailable";

type SolarEnergyResult = {
  status: SolarAvailabilityStatus;
  observedAtUtc: string;
  directSolarPowerW?: number;
  estimatedEnergyWh?: number;
  illuminatedDurationSeconds?: number;
  shadowedDurationSeconds?: number;
  reason?: string;
  assumptions: string[];
  sourceMetadata: {
    ephemerisSource: string;
    terrainDataset?: string;
    terrainResolutionM?: number;
  };
};
```

Rules:
- Never use zero to represent missing data.
- Zero watts is valid only when a successful calculation establishes no direct sunlight for that sample.
- Clear stale results when a new mission request is submitted.
- Prevent older asynchronous results from overwriting the latest mission.
- Keep provider errors distinct from physical darkness.
- Keep raw provider response parsing outside React components.

## 11. Testing requirements

Use the existing test framework; do not install duplicate frameworks.

### Unit tests
- Sun response parsing and units.
- DEM sample and coverage parsing.
- Coordinate transformation.
- Local terrain horizon calculation.
- Sun/terrain visibility comparison.
- Below-geometric-horizon classification.
- Terrain-shadow classification.
- Uncertain and unavailable states.
- Solar incidence angle.
- Solar power calculation and units.
- Energy integration over time.
- Zero direct power for a verified shadowed sample.
- No energy estimate when panel configuration is missing.
- No false zero when terrain or Horizons data is unavailable.

### Component tests
- Illuminated state displays correct result.
- Terrain-shadowed state displays `No direct solar energy available`.
- Below-horizon state displays the correct reason.
- Unavailable/uncertain state does not show fabricated zero.
- Power and energy units are correct.
- Assumptions and provenance are visible.
- New mission input clears or marks previous results stale.

### Integration tests
- Mission input reaches Horizons unchanged except documented conversions.
- Horizons Sun direction reaches illumination calculation.
- DEM terrain reaches local horizon calculation.
- Illumination state controls direct solar power.
- Panel configuration reaches the power model.
- Power samples integrate into interval energy.
- Results reach the existing right-hand Mission Analysis panel.

### Live data tests
When network access is available:
- Retrieve a real Horizons Sun-position response for a controlled lunar observer/time.
- Retrieve real numeric DEM data for a supported region.
- Run illumination calculation.
- Save sanitized input/output evidence.
- Confirm browser displays the calculated result.

Mocks are suitable for deterministic CI but do not prove live scientific-data integration.

## 12. Failure handling

| Failure | Required result |
|---|---|
| Horizons unavailable | Solar illumination and energy unavailable |
| DEM unavailable | Terrain-aware illumination unavailable |
| DEM coverage missing | Uncertain/unavailable, not automatically dark |
| Coordinate transform fails | Reject calculation and show error |
| Panel configuration missing | Show illumination, omit energy estimate |
| Irradiance model missing | Show illumination, omit physical power estimate |
| Invalid units | Reject result |
| Mission input changes | Discard or mark old result stale |
| Valid terrain shadow | Direct solar power is 0 W for that sample |
| Valid Sun below geometric horizon | Direct solar power is 0 W for that sample |

## 13. Debug and progress tracking

Update:
- `context/progress-tracker.md`
- `context/debug-state-and-issue-tracker.md`
- `context/architecture-context.md` if contracts or calculations change.

Record:
- Terrain dataset and resolution.
- Horizons request and response verification.
- Illumination algorithm and assumptions.
- Panel specifications and source.
- Irradiance model and units.
- Test outputs and evidence.
- Whether results were live-data verified or mock-tested.

Use established debug statuses. Do not mark the phase verified until real data has been processed and the output checked in the browser.

## 14. Completion criteria

- [ ] Existing architecture and data sources inspected.
- [ ] Mission coordinates and UTC time used consistently.
- [ ] Real Sun ephemeris retrieved and validated.
- [ ] Numeric lunar DEM retrieved and validated.
- [ ] DEM coverage and resolution recorded.
- [ ] Local terrain horizon calculated.
- [ ] Illuminated, terrain-shadowed, below-horizon, uncertain, and unavailable states distinguished.
- [ ] Dark/shadowed valid sample reports 0 W direct solar generation.
- [ ] Missing data is not misreported as darkness or zero energy.
- [ ] Panel specifications are explicit and traceable.
- [ ] Irradiance and panel-incidence calculations documented.
- [ ] Energy integrated only over a defined interval.
- [ ] Results appear in the existing right-hand Mission Analysis panel.
- [ ] UTC timestamp, units, assumptions, and sources displayed.
- [ ] Unit, component, integration, and browser tests pass or failures documented.
- [ ] Progress and debug trackers updated with evidence.

## 15. Required completion report

Provide:
1. Files created or modified.
2. Horizons and terrain datasets actually used.
3. Terrain resolution and coverage.
4. Illumination method and local horizon result.
5. Solar-panel specifications and source.
6. Irradiance model and assumptions.
7. Actual calculated illumination status.
8. Actual solar power and interval energy, if calculable.
9. Exact UI card and fields updated.
10. Test commands and actual pass/fail results.
11. Live-data versus mock-data verification status.
12. Updated debug issue IDs and progress tracker.
13. Remaining limitations.

**Final verification rule:** The phase is not complete merely because the UI says “No direct solar energy available.” It is complete only when the application distinguishes verified darkness from missing data, calculates power/energy for illuminated periods using documented rover specifications, and displays traceable results in the Mission Analysis panel.

---

# Phase 8 UI Revision — Mission Input Solar Energy Configuration

## 17. UI objective and placement

Add a **Solar Energy** accordion directly below **Compare Location (Optional)** in the existing left-hand **Mission Input** panel.

Do not move the detailed scientific results into the input panel. Keep responsibilities separated:

- **Left Mission Input panel:** collect optional solar-panel configuration and analysis-duration inputs.
- **Center Lunar Map:** continue showing the selected lunar location and existing map layers/markers.
- **Right Mission Analysis panel:** show calculated illumination, terrain-shadow, power, and energy results.

The Solar Energy accordion must match the existing Mission Input panel's dark technical visual language. It must not introduce a new page, modal, full-screen animation, or competing dashboard.

### Placement order

Preserve the existing mission input fields and append Solar Energy after Compare Location:

1. Landing latitude and longitude.
2. Mission date.
3. Mission time (UTC).
4. Compare Location (Optional).
5. **Solar Energy** (new expandable section).
6. Existing mission submit/analyse action, in its current position and behavior unless the existing layout requires otherwise.

The accordion should be collapsed by default to protect vertical space in the narrow input panel. When expanded, it must remain usable at desktop and mobile widths.

## 18. Solar Energy accordion contents

Use the heading **Solar Energy** with a restrained sun/energy icon and a short supporting description such as:

> Configure the rover's solar panels and analysis duration.

Include these optional fields:

| Field | Control | Validation and meaning |
|---|---|---|
| Panel area (m²) | Numeric input | Must be greater than zero; active solar-cell area, not total rover surface area |
| Panel efficiency (%) | Numeric input | Greater than 0 and no more than 100; convert to a fraction in calculations |
| Panel orientation | Select/radio control | At minimum: horizontal fixed panel, sun-tracking panel, and custom orientation |
| Analysis duration (hours) | Numeric input | Optional; greater than zero; used to define a time interval, not a substitute for a start time |
| Optional system derating/loss factor | Optional numeric input or advanced setting | Only include if the backend supports and documents it |

Do not force users to enter panel specifications merely to calculate whether the location is illuminated. With panel fields empty, the app must still run the Sun-position and terrain-illumination assessment, but it must not show fabricated W or Wh/kWh values.

### Orientation requirements

- **Horizontal fixed panel:** explicitly means the panel normal points along the local lunar vertical/up direction.
- **Sun tracking:** only offer as a real calculation mode if the backend models the panel normal following the Sun over time.
- **Custom orientation:** must capture a well-defined panel normal or the project's documented orientation representation. Do not present a dropdown option that has no corresponding backend model.
- If the backend cannot yet support a selected orientation, mark it unavailable and prevent an unsupported power estimate.

Avoid ambiguous labels such as “horizontal” without explaining the panel normal convention.

## 19. Frontend result responsibilities

The input accordion is for configuration, not a second copy of the detailed results.

After mission analysis:
- Keep the input values visible and preserve them when the user opens/closes the accordion.
- Show a compact status hint only if useful, such as `Analysis results available` or `Configure panel details for power estimates`.
- Display authoritative scientific results in the right-hand Mission Analysis panel.
- Do not show hardcoded preview numbers, sample Sun angles, invented power, or a fake “live” status in production.
- If the analysis has not run, show a neutral helper message explaining that results appear after analysis.

The right-hand panel should retain the detailed Solar Illumination and Solar Energy cards specified in Sections 9 and 10 above.

## 20. Subtle lightning visual effect

Add a decorative, low-intensity cyan lightning animation **only inside the Solar Energy accordion/card surface**. It is a visual accent, not a scientific visualization.

### Visual direction

- Dark navy/charcoal card background consistent with existing workspace surfaces.
- Thin cyan-blue electrical arcs with occasional short branches.
- Brighter than the initial low-intensity prototype, but still restrained and clearly secondary to labels, fields, and results.
- Use a short soft glow around the arc; avoid full-card flashes, white screen flashes, large bloom, or continuous lightning.
- Keep all text, inputs, focus rings, and buttons fully legible.
- Keep the canvas clipped to the Solar Energy card bounds.
- Canvas must not intercept pointer/touch events.

Suggested starting values (tune after browser review):
- Peak arc opacity: approximately 0.65–0.8.
- Main stroke width: approximately 1.5–2 CSS pixels.
- Glow blur: approximately 8–13 CSS pixels.
- Arc fade duration: approximately 250–450 ms.
- Random strike interval: approximately 4–8 seconds.
- Use occasional branches, not a dense branching storm.

These are presentation defaults, not strict scientific values. Review on the actual dark UI and reduce intensity if it distracts from the form.

### Implementation requirements

Use native browser capabilities only:
- HTML Canvas.
- CSS for positioning, clipping, layering, and card styling.
- JavaScript/TypeScript animation using `requestAnimationFrame`.

Do not add a third-party animation package solely for this effect.

Recommended component separation, adapted to the actual repository conventions:

```text
components/
  mission/
    SolarEnergy.tsx
    SolarLightning.tsx
    solar-energy.css
```

This is a suggested structure, not a mandate to create duplicate components if equivalent components already exist.

`SolarEnergy` responsibilities:
- Render the accordion and solar configuration controls.
- Own or receive typed form state.
- Validate optional panel configuration.
- Pass valid configuration into the existing mission-analysis request flow.
- Preserve current input values across accordion expand/collapse.

`SolarLightning` responsibilities:
- Render a decorative canvas positioned absolutely inside the Solar Energy card.
- Size the canvas to its card container and account for device pixel ratio.
- Draw occasional arcs and branches with a restrained glow and fade.
- Never render mission values or affect scientific calculations.

### Canvas lifecycle and accessibility

- Use `useEffect` and `useRef` (or the project's established equivalent) for canvas setup.
- Start animation only after the component mounts and the canvas has a measurable size.
- Use `ResizeObserver` or the project's supported resize mechanism to update canvas dimensions.
- Cancel every `requestAnimationFrame` loop on cleanup.
- Clear pending timers/timeouts and disconnect observers on cleanup.
- Ensure only one animation loop and one strike scheduler exist per mounted component.
- Avoid stale closures and avoid recreating the animation loop on every form input change.
- Respect `prefers-reduced-motion: reduce`: disable the animation or render a static subtle accent.
- Consider pausing when the card is not visible or the page is backgrounded, if straightforward in the existing architecture.
- Use `pointer-events: none`, `aria-hidden="true"` and an appropriate non-interactive canvas role/label strategy.
- Keep the canvas behind content using a positioned card container, clipping, and explicit stacking contexts. Verify that it does not cover focus outlines or tooltips.

### Animation is decorative only

Never use lightning flashes to indicate:
- Solar power availability.
- Electrical output or battery charge.
- A successful API response.
- Sunlight or terrain-shadow state.
- Errors or warnings.

Scientific status must be communicated through text, values, and accessible status indicators. The animation must not be the only way to convey information.

## 21. Suggested frontend state model

Adapt to the project's existing form and API types. Do not create a second independent source of truth for mission coordinates/date/time.

Example shape:

```ts
type SolarPanelOrientation =
  | { kind: "horizontal" }
  | { kind: "sun-tracking" }
  | {
      kind: "custom";
      normalX: number;
      normalY: number;
      normalZ: number;
    };

type SolarPanelConfiguration = {
  areaM2: number;
  efficiencyPercent: number;
  orientation: SolarPanelOrientation;
  deratingFactor?: number;
};

type SolarEnergyInput = {
  panel?: SolarPanelConfiguration;
  analysisDurationHours?: number;
};
```

Only expose orientation modes that the calculation service actually supports. If the project's lunar coordinate convention differs, document the mapping for custom normal components.

Validation:
- Reject empty strings only when a field is required for the selected calculation.
- Reject `NaN`, infinity, zero/negative area, efficiency outside (0, 100], and non-positive duration.
- Do not silently clamp invalid values.
- Show inline validation messages in the same style as existing inputs.
- Missing optional panel data should disable only the electrical power/energy estimate, not the illumination assessment.

## 22. Responsive and interaction requirements

- On desktop, keep the accordion within the existing left input column width.
- On mobile, allow the accordion and its fields to use the full available width without horizontal overflow.
- Use the existing design system controls, spacing, borders, typography, and focus states.
- Do not introduce bright cyan filled backgrounds across the entire card. Reserve cyan for subtle borders, icons, status details, and lightning.
- Ensure expanded content does not overlap the mission submit button.
- Preserve keyboard navigation and visible focus.
- The accordion trigger must expose expanded/collapsed state accessibly.
- The user must be able to run illumination analysis without opening the accordion or entering panel specifications.

## 23. Testing and acceptance criteria for the revised UI

### Mission input and configuration
- [ ] Solar Energy appears directly below Compare Location (Optional).
- [ ] Accordion is collapsed by default and expands/collapses correctly.
- [ ] Solar configuration values persist when accordion is toggled.
- [ ] Panel area and efficiency validation works.
- [ ] Analysis duration validation works.
- [ ] Unsupported orientation modes are not offered as functional options.
- [ ] Empty panel configuration still allows illumination analysis.
- [ ] No default sample values are mistaken for real rover specifications.
- [ ] Existing mission inputs and submit flow continue to work.

### Lightning effect
- [ ] Lightning appears only inside the Solar Energy card.
- [ ] Arcs are visibly stronger than the initial subtle prototype but do not overpower the form.
- [ ] No full-screen or full-card white flash occurs.
- [ ] Canvas remains clipped to the card.
- [ ] Inputs, buttons, text selection, focus rings, and tooltips remain usable.
- [ ] Animation pauses/disables for reduced-motion preference.
- [ ] No duplicate animation loops, timers, or observers remain after unmount.
- [ ] Resizing and accordion expansion do not distort or misplace the canvas.
- [ ] No third-party dependency is added solely for lightning.

### Scientific integration
- [ ] The frontend submits optional panel configuration through the existing typed analysis flow.
- [ ] Illumination can be assessed without panel specifications.
- [ ] Power and energy are withheld if panel inputs or required physical data are missing.
- [ ] Valid shadow produces zero direct solar generation for that sample, not a claim of zero battery energy.
- [ ] Missing/failed Horizons or DEM data produces `Unable to determine`, not `0 W`.
- [ ] Right-hand Mission Analysis panel remains the authoritative place for scientific results.

### Quality gates
- [ ] Run formatting and lint checks.
- [ ] Run TypeScript checks.
- [ ] Run relevant unit/component tests.
- [ ] Run the production build.
- [ ] Test desktop and mobile layouts in a browser.
- [ ] Inspect lightning effect at normal UI brightness and verify readability.
- [ ] Record actual test results and any blockers in the project debug/progress tracker.

## 24. Completion report

When implementation is complete, report:
1. Files created or modified.
2. Exact location of the Solar Energy accordion.
3. Supported panel fields and orientation modes.
4. How the lightning animation lifecycle and reduced-motion behavior work.
5. Whether illumination analysis works without panel configuration.
6. Whether power/energy calculations are connected to real validated data or remain unavailable.
7. Tests/checks actually run and their results.
8. Known limitations and unresolved blockers.

Do not mark Phase 8 complete merely because the accordion and lightning animation render. Scientific calculations, real data integration, state handling, and the acceptance tests must also be verified.

