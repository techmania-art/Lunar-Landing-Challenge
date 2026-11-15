# Phase 10 — Rover Configuration, Energy Budget, and Traverse Feasibility

## 1. Objective

Extend the Phase 8 solar-illumination/energy calculation and Phase 9 Solar Energy UI into a **Rover Configuration and Traverse Feasibility** feature.

The user should be able to configure a rover, select lunar coordinates and a mission interval, and receive an evidence-based estimate of:

1. Solar energy generated at the selected coordinates and over the selected time interval.
2. Energy available to the rover after accounting for storage and system constraints, where battery data is supplied.
3. Energy required for a proposed traverse, based on a route and a documented rover power/energy model.
4. Whether the configured rover has sufficient energy for that specific proposed traverse, with uncertainty and safety margin clearly stated.

The application must not claim that a rover can “traverse the Moon” as a whole based only on a landing coordinate and solar-panel output. Feasibility must refer to a **defined route, distance, terrain profile, mission duration, and rover load model**. If no route or consumption model is available, report that traverse sufficiency cannot yet be determined.

## 2. Mandatory project inspection

Before implementation:

1. Read `AGENTS.md` and all mandatory project context files.
2. Read the complete Phase 8 and Phase 9 specifications.
3. Inspect the existing Solar Energy card, mission-input state, Horizons integration, DEM/terrain integration, map coordinate handling, route/path capabilities, and API types.
4. Identify which energy and terrain values are real, mocked, unavailable, or inferred.
5. Inspect current tests and run baseline checks.
6. Record existing working-tree changes. Do not overwrite or revert unrelated work.

Reuse existing components and services wherever possible. Do not duplicate the Solar Energy card or create a second source of truth for mission coordinates.

## 3. Rover Configuration UI

### 3.1 Placement

Add a **Rover Configuration** area within the existing Solar Energy accordion in the left-hand Mission Input panel, or use a compact nested section if that best fits the existing card.

Do not redesign the overall three-panel workspace. Preserve the Phase 9 lightning pin, the existing Solar Energy card, and all unrelated components.

### 3.2 Presets and editable parameters

Provide a preset selector with an explicitly labelled baseline:

**Generic Lunar Rover — Reference Configuration**

Use the following initial reference values only as editable modelling assumptions, not as the specifications of a real rover:

| Parameter | Initial reference value | Notes |
|---|---:|---|
| Solar panel active area | 1.20 m² | Reuse the current UI value |
| Solar panel efficiency | 28.5% | Reuse the current UI value |
| Panel orientation | Horizontal Fixed (Zenith Normal) | Reuse the current UI selection |
| Analysis duration | 4 hours | Reuse current UI value; duration of analysis window, not rover lifetime |
| Battery capacity | Not prefilled | Must be supplied or explicitly selected as a modelling assumption |
| Usable battery fraction / depth-of-discharge limit | Not prefilled | Needed to calculate usable stored energy |
| Average traverse power | Not prefilled | Must be measured, sourced, or explicitly modelled |
| Idle/housekeeping power | Not prefilled | Needed for energy consumed while not driving |
| Drive speed | Not prefilled | Needed to estimate route time |
| Safety reserve | Not prefilled | User-configurable or documented conservative assumption |

Do not present the initial four values as an official or universal lunar rover standard. Label the preset as a hypothetical reference model. Do not silently insert invented battery, motor, or rover-consumption specifications.

### 3.3 Required configuration fields

Organize the fields into compact groups:

**Solar generation**
- Panel active area (m²).
- Panel efficiency (%).
- Panel orientation / panel normal.
- Optional system derating factor, only if supported by the energy model.

**Energy storage**
- Battery nominal capacity (Wh), required for battery sufficiency assessment.
- Maximum usable depth of discharge (%) or minimum state-of-charge reserve (%).
- Initial battery state of charge (%).
- Optional battery charge/discharge efficiency, if modelled.

**Rover consumption**
- Average driving electrical power (W), or a validated energy-per-distance model (Wh/km).
- Idle/housekeeping power (W).
- Optional payload/instrument power (W).
- Optional communications/heater power (W), only if these loads are part of the model.
- Maximum/nominal traverse speed (m/s or km/h), if time feasibility is calculated.
- Safety reserve (%).

**Traverse target**
- Destination latitude and longitude, or a route drawn/selected on the lunar map.
- Route distance must be calculated from the actual route geometry, not guessed from endpoint labels.
- If a route is not selected, the app may show local energy availability but must not give a route-completion verdict.

Use units in every label. Validate ranges and show inline errors. Distinguish user-supplied values from preset assumptions.

## 4. Coordinate-dependent solar generation

Every change to the selected landing coordinates, destination/route, mission date, mission time, analysis duration, panel configuration, or panel orientation must invalidate affected derived results and trigger a recalculation when the user submits or explicitly refreshes the analysis.

The solar calculation must use the actual selected coordinates and time samples:

1. Obtain Sun position from the validated Horizons integration for the lunar observer and requested timestamps.
2. Obtain numeric DEM coverage for the selected location and route corridor.
3. Calculate local terrain horizon and direct illumination for each time sample.
4. Calculate panel incidence angle using the configured panel normal.
5. Calculate direct solar power only for illuminated samples.
6. Integrate power over the requested interval to estimate generated energy.

The selected coordinates must materially affect:
- Sun/terrain obstruction comparison.
- Local illumination windows.
- Shadow duration.
- Solar generation over time.

Do not reuse cached results from a different coordinate, time, DEM version, panel configuration, or route. Cache keys must include all relevant inputs and dataset/model versions.

If the coordinates change but the app cannot retrieve valid Horizons/DEM data, show `Unable to determine`; do not retain stale energy values or show zero as a substitute.

## 5. Energy budget model

Maintain clear separation between **generated energy**, **stored energy**, **usable energy**, and **energy consumed**.

### 5.1 Solar energy generated

Use the validated Phase 8 power model and time integration. Do not replace it with a single fixed “watts per square metre” constant without documenting the irradiance source and assumptions.

### 5.2 Battery energy

If battery capacity and initial state of charge are provided:

\[
E_{\mathrm{initial}} = C_{\mathrm{battery}} \times SOC_{\mathrm{initial}}
\]

where capacity is in Wh and SOC is a fraction from 0 to 1.

Apply the configured usable-SOC/depth-of-discharge limit. Account for charging efficiency and discharge efficiency only when supported by documented values.

A simplified energy balance over time is:

\[
E_{\mathrm{stored}}(t+\Delta t) =
\operatorname{constrain}\left(
E_{\mathrm{stored}}(t) +
E_{\mathrm{solar,stored}} -
E_{\mathrm{load}}
\right)
\]

The implementation must define battery capacity limits, minimum reserve, charge/discharge losses, and whether excess solar generation is curtailed. Do not allow stored energy to exceed battery capacity or fall below the configured reserve in a feasible plan.

If battery parameters are absent, report solar generation but do not claim that stored/usable battery energy is known.

### 5.3 Rover energy consumption

For a simple constant-power approximation:

\[
E_{\mathrm{drive}} = P_{\mathrm{drive}} \times t_{\mathrm{drive}}
\]

\[
E_{\mathrm{idle}} = P_{\mathrm{idle}} \times t_{\mathrm{idle}}
\]

\[
E_{\mathrm{payload}} = P_{\mathrm{payload}} \times t_{\mathrm{payload}}
\]

\[
E_{\mathrm{required}} =
E_{\mathrm{drive}} + E_{\mathrm{idle}} + E_{\mathrm{payload}} + \cdots
\]

If using an energy-per-distance model:

\[
E_{\mathrm{drive}} = e_{\mathrm{distance}} \times d
\]

where \(e_{\mathrm{distance}}\) is Wh/km and \(d\) is route distance in km.

Do not mix a power model and an energy-per-distance model without explicitly defining how they interact. Avoid double-counting loads.

Terrain can materially affect traverse energy. If the project has a validated slope/roughness/mobility energy model, use it and document its provenance. If not, clearly label the traverse energy as a simplified estimate that does not account for detailed wheel slip, sinkage, obstacle negotiation, or slope-dependent traction.

## 6. Traverse feasibility decision

A feasibility verdict is allowed only when all required inputs are valid:
- Route geometry and distance.
- Valid terrain coverage for the route, if terrain is part of the mobility assessment.
- Rover energy-consumption model.
- Battery capacity and initial state of charge, if stored energy is included in the verdict.
- Solar-generation timeline for the route/mission interval, if solar recharge is included.
- Mission duration/speed assumptions.
- Safety reserve.

Calculate the energy budget over the actual proposed timeline, including driving and idle loads, and solar charging at the relevant coordinates/times.

Possible states:

- `SUFFICIENT_ENERGY`: modelled energy covers the proposed traverse and configured reserve remains.
- `INSUFFICIENT_ENERGY`: modelled energy falls below the required reserve or reaches a battery constraint before route completion.
- `CONDITIONALLY_FEASIBLE`: energy sufficiency depends on an explicit condition, such as a charging stop, revised route, or longer illumination window.
- `UNDETERMINED`: required configuration, route, terrain, ephemeris, or consumption data is missing or invalid.
- `NOT_EVALUATED`: user has not requested a traverse assessment.

Never convert `UNDETERMINED` into a positive or negative verdict.

### Important scope of the conclusion

Do not state that the rover can traverse the entire Moon. A valid statement is:

> Based on the configured rover model and selected route, the estimated energy budget is sufficient / insufficient for this proposed traverse under the stated assumptions.

If the user asks about traversing the Moon generally, explain that this is not a meaningful single energy test: lunar surface traversal would require a defined route, distance, terrain, mission duration, communications constraints, thermal survival strategy, and multiple operational constraints.

## 7. Results UI

Keep detailed results in the existing right-hand Mission Analysis panel. Do not move scientific outputs into the left-hand configuration form.

Add or extend a **Rover Energy & Traverse Assessment** result card with:

**Rover configuration summary**
- Preset name and whether values are defaults, user-entered, or sourced from a real rover.
- Panel area, efficiency, orientation.
- Battery capacity, initial/usable energy, and reserve.
- Drive/idle/payload load assumptions.

**Solar generation**
- Selected coordinates and observation/analysis interval.
- Illuminated duration and shadow duration.
- Estimated solar energy generated (Wh/kWh).
- Data availability and uncertainty.
- DEM and Horizons provenance.

**Traverse assessment**
- Route start and destination coordinates.
- Route distance.
- Estimated drive time and total mission time.
- Estimated drive, idle, and other load energy.
- Estimated solar contribution along the route/time interval.
- Initial battery energy, minimum battery energy during the traverse, final projected energy.
- Required reserve and energy margin.
- Feasibility state and a plain-language explanation.

Use clear units and avoid false precision. Include a concise assumptions/limitations disclosure that can expand for details.

Suggested result wording:

- **Sufficient:** “The configured rover model has an estimated energy margin of X Wh after the proposed traverse and reserve requirement. This result applies only to the selected route and assumptions.”
- **Insufficient:** “The projected battery level falls below the required reserve before the proposed traverse is complete. Consider a shorter route, lower loads, a longer charging window, or a different start time.”
- **Undetermined:** “Traverse energy sufficiency cannot be determined because [specific missing input/data]. No feasibility verdict has been generated.”

Never display a green success state when only solar illumination is known but battery and rover loads are not.

## 8. Coordinate and route interaction behavior

- Reuse the canonical mission coordinate state; do not create duplicate latitude/longitude state.
- When landing coordinates change, mark the previous illumination/energy result stale.
- When destination or route changes, mark route distance and traverse assessment stale.
- When date/time/duration changes, invalidate all time-dependent solar and battery projections.
- When panel or rover configuration changes, invalidate energy and traverse results but retain unrelated map/ephemeris data if still valid.
- Clearly identify which coordinate is the rover start and which is the destination.
- Validate lunar coordinate ranges and coordinate reference system according to the existing application conventions; do not invent new coordinate constraints.
- If the route crosses areas without DEM coverage, disclose the uncovered segment and withhold any terrain-dependent definitive verdict.

## 9. Data provenance and scientific integrity

For every derived result, retain:
- Input coordinates and timestamps.
- Horizons request/response identity and target/observer settings.
- DEM dataset, resolution, coverage, CRS, and vertical datum.
- Solar irradiance model/source.
- Rover preset/version and user overrides.
- Battery and load assumptions.
- Route geometry and distance method.
- Sampling interval and numerical integration method.
- Uncertainty or known omitted effects.

Do not use LROC imagery as numeric terrain data. Do not treat a successful map-tile display as proof that DEM data is available.

Do not label the Generic Lunar Rover preset as NASA/CSA/ISRO-certified or as a real rover specification.

## 10. Testing and acceptance criteria

### Rover configuration
- [ ] Generic Lunar Rover preset is labelled as a hypothetical reference configuration.
- [ ] Existing Phase 8 values are reused as the initial solar reference values: 1.20 m², 28.5%, Horizontal Fixed (Zenith Normal), 4 hours.
- [ ] Battery and rover load parameters are not fabricated or silently prefilled as real-world facts.
- [ ] User can edit configuration and see validation feedback.
- [ ] Configuration is included in the typed analysis request and result provenance.

### Coordinate-dependent energy
- [ ] Changing latitude/longitude causes a new location-dependent analysis.
- [ ] Changing date/time/duration recalculates time-dependent illumination and energy.
- [ ] Changing panel configuration recalculates generated energy.
- [ ] Stale results are clearly marked and never presented as current.
- [ ] Missing Horizons/DEM data yields `UNDETERMINED`/unavailable, not zero generation.
- [ ] Shadowed samples contribute zero direct solar generation only when shadow is established by valid data.
- [ ] Energy integration is tested against known synthetic cases.

### Battery and traverse
- [ ] Battery state respects capacity and configured reserve.
- [ ] Charging/discharging efficiency is applied only when configured and supported.
- [ ] Drive and idle loads are not double-counted.
- [ ] Route distance comes from actual route geometry.
- [ ] Traverse feasibility requires a valid route and consumption model.
- [ ] Insufficient, sufficient, conditional, and undetermined cases are tested.
- [ ] A solar-only result cannot be reported as proof that the rover can traverse a route.
- [ ] No result claims that the rover can traverse the entire Moon.

### UI and regression
- [ ] Existing Phase 9 lightning pin remains unchanged.
- [ ] Existing Phase 8 lightning animation remains unchanged.
- [ ] Existing Mission Input, Lunar Map, and Mission Analysis components retain their current behavior except for the explicitly scoped additions.
- [ ] Desktop and mobile layouts remain usable.
- [ ] Accessibility, keyboard interaction, and reduced-motion behavior remain intact.

### Quality gates
- [ ] Run formatting/lint checks.
- [ ] Run TypeScript checks.
- [ ] Run unit/component/API/integration tests relevant to the changes.
- [ ] Run production build.
- [ ] Test coordinate changes and stale-result handling in the browser.
- [ ] Record actual results and blockers in the project's debug/progress tracker.

## 11. Completion report

Report:
1. Files created/modified.
2. Rover preset and all configurable fields.
3. Which values are user inputs, assumptions, or sourced real-rover data.
4. How coordinate changes trigger recalculation.
5. How solar generation, battery balance, and traverse consumption are modelled.
6. Whether the route and terrain model are real, simplified, or unavailable.
7. Whether the app can issue a traverse feasibility verdict, and under which assumptions.
8. Tests/checks actually run and their results.
9. Known limitations and unresolved blockers.

Do not mark Phase 10 complete merely because the configuration form renders. Real coordinate-dependent energy calculations, a defined route, battery/load modelling, and verified feasibility states are required.
