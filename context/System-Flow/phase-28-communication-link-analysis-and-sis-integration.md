# Phase 28 — Communication Link Analysis & Live SIS Integration

**Project:** Lunar Mission Planner (LMP) — Super Intelligent System (SIS)  
**Phase:** 28  
**Type:** Feature implementation + analysis integration + debugging + verification  
**Priority:** High  
**Status:** Ready for implementation  
**Depends on:** Phase 26 (verified LiveKit SIS chat/voice integration) and Phase 27 (live Mission Analysis sidebar-to-SIS mission-context synchronization)

---

## 1. Objective

Implement a dedicated **Communication Link Analysis** feature as a separate phase of the Lunar Mission Planner. It must appear in the existing **right-side Mission Analysis sidebar on the Analysis/workspace page** and provide an honest assessment of whether the rover can communicate with Earth, directly or through a configured relay.

This is a new analysis capability. Do not treat it as already implemented merely because the existing Earth Analysis card displays Earth azimuth, elevation, or geometric horizon status.

The implementation must distinguish four independent layers:

1. **Geometric visibility:** Is Earth above the rover's geometric reference horizon at the selected mission epoch?
2. **Terrain line of sight (LOS):** Does lunar terrain obstruct the rover-to-Earth direction?
3. **RF link budget:** Given actual radio hardware and link parameters, does the estimated received signal satisfy the receiver requirement and required link margin?
4. **Relay availability:** Is a configured and evaluated relay path available when the direct path is not usable?

The output is a communication assessment, not a generic “connected” indicator. Never claim that the rover has an operational RF link solely because Earth is geometrically above the horizon.

## 2. Phase Boundary and Relationship to Phase 27

**Phase 28 is separate from Phase 27.** Complete and preserve Phase 27's live mission-context synchronization for the actual values already displayed in the right-side Mission Analysis sidebar, especially Solar Illumination & Energy, power, terrain, hazards and rover-traverse results.

Phase 28 adds the missing communication-analysis capability and then extends the existing Phase 27 mission-context contract so SIS receives the newly calculated communication result alongside the already-synchronized mission data.

Do not merge the communication calculations into Phase 27's energy/terrain implementation. Do not redo the working LiveKit text/voice integration, Gemini provider configuration, SIS chat UI, or the Phase 27 transport pipeline. Reuse them.

If Phase 27 is not yet implemented in the actual repository, inspect its context design and create only the minimal compatible interface needed; do not claim Phase 27 work exists unless verified in source code and runtime tests.

## 3. Exact UI Location

Add a card titled **Communication Link Analysis** to the existing right-side **Mission Analysis** sidebar in the Analysis/workspace page.

- Place it near the existing Earth Analysis card and before/near relevant Terrain & Communication results, following the existing card order and visual hierarchy.
- Preserve Sun Analysis, Earth Analysis, Solar Illumination & Energy, terrain, rover, and all other existing sidebar sections.
- Reuse existing typography, dark card surfaces, borders, spacing, status pills, icons and responsive behavior.
- Do not create a new page, modal-only workflow, independent dashboard, or second analysis panel.
- Do not redesign the workspace's three-panel layout.
- The card must show an overall status, a concise status reason, the epoch, and the supporting metrics that are actually available.

### 3.1 Status values

Use the following semantic states (adapt the exact enum names to project conventions):

| Display status | Meaning |
|---|---|
| `Available` | A direct or configured relay path passed all evaluated geometry, terrain-LOS and RF criteria. |
| `Limited` | A path is usable under the configured model but has marginal link margin or another explicit validated limitation. |
| `Unavailable` | All evaluated candidate paths fail a decisive criterion, such as blocked LOS or insufficient RF margin. |
| `Unknown` | Evidence is missing, stale, contradictory, or insufficient to determine availability. |
| `Not configured` | Required radio parameters and/or relay configuration are absent, so no valid operational link assessment can be completed. |
| `Analysis pending` | The current mission inputs are being evaluated. |
| `Analysis error` | The current communication calculation failed. |

Do not show a green success state for `Unknown`, `Not configured`, `Analysis pending`, or `Analysis error`. Keep the geometric Earth visibility badge separate from the overall communication status.

## 4. Required Analysis Layers

### 4.1 Geometric Earth visibility

Reuse the current Earth ephemeris and selected rover/site geometry already used by the Analysis page. Where available, show:

- Earth azimuth (degrees)
- Earth elevation (degrees)
- Geometric horizon status
- Observation epoch and time standard (UTC or explicitly identified mission time)
- Data source and target identifier
- Rover/site coordinates and relevant altitude or antenna height, when available

This is geometric information only. Do not rename it as a radio connection or operational communication result.

### 4.2 Terrain line-of-sight assessment

Inspect the current terrain-analysis implementation and use an actual numeric lunar DEM/elevation model and a supported horizon/ray-tracing calculation. Do not use rendered map imagery as elevation data.

Where the model supports them, calculate and display:

- Terrain LOS status: `Clear`, `Blocked`, `Unknown`, or `Not evaluated`
- Terrain data source and model/version
- DEM resolution, coverage, projection and vertical datum, when known
- Local terrain horizon/obstruction angle along the Earth azimuth
- Earth line-of-sight elevation relative to the local terrain horizon
- Angular clearance, when computed
- Obstruction distance/location, only when produced by the actual terrain calculation
- Calculation timestamp and coverage/uncertainty warnings

If the numeric DEM is missing, incomplete, stale, outside its coverage, or unsuitable for the selected line-of-sight test, report `Unknown` or `Not evaluated` and explain why. Never convert missing DEM coverage into `Clear`.

### 4.3 RF link-budget assessment

Only calculate an RF result when the necessary radio and mission parameters are available and validated. First inspect the existing rover configuration and project types. Reuse actual fields if they exist; do not invent hardware defaults.

Required/typical inputs may include:

- Rover transmitter output power and units
- Transmit antenna gain and pointing/orientation assumptions
- Earth-station/receiver antenna gain and pointing assumptions
- Carrier frequency or band
- Rover-to-Earth slant range at the selected epoch
- Cable, polarization, system and other applicable losses
- Receiver sensitivity or required received power
- Bandwidth, data rate and modulation assumptions if required by the selected model
- Required link margin / engineering threshold

Derived metrics may include only model-supported values, for example:

- Free-space path loss
- Estimated received power
- Receiver sensitivity/threshold
- Link margin in dB
- RF pass/marginal/fail result

Document the selected link-budget model and its assumptions in code comments or a short methodology document. Validate units and reject impossible values. Do not silently substitute arbitrary power, antenna gain, frequency, receiver sensitivity, or margin defaults.

If radio configuration is absent, show `Not configured` or `Unknown`, and identify which required inputs are missing. A positive RF margin cannot override blocked terrain LOS; a clear LOS path cannot override a failed or unconfigured RF budget.

### 4.4 Relay-path assessment

Display relay availability only if the application has a real relay configuration, suitable relay position/ephemeris data, and a supported path calculation.

Where supported, record:

- Relay identifier/name
- Relay observation epoch and source
- Relay visibility/path state
- Rover-to-relay and relay-to-Earth checks, to the extent the actual model supports them
- Calculation timestamp and warnings

If no relay model/configuration/data exists, explicitly show `No relay configured` or `Not evaluated`. Do not invent relay satellites, coverage, schedules, or availability.

## 5. Overall Communication Status Resolver

Create a typed, unit-tested status resolver. The resolver must combine the evidence layers rather than copy the Earth Analysis badge.

Minimum decision rules:

- **Available:** at least one evaluated direct or configured relay route passes all required geometry, terrain LOS checks (where applicable), and RF criteria with the configured minimum margin.
- **Limited:** a route passes the configured usability criteria but has a marginal link margin or an explicitly identified limitation.
- **Unavailable:** all evaluated routes fail a decisive check, such as Earth below the geometric horizon for direct path, terrain-blocked LOS, or inadequate RF margin.
- **Unknown:** evidence is missing, stale, contradictory, or insufficient to decide.
- **Not configured:** no valid RF configuration and no evaluable relay path are available.
- **Pending/Error:** represent the calculation lifecycle accurately.

Required edge cases:

1. Earth below the geometric horizon makes the direct geometric path unavailable at that epoch. It does not prove that every relay path is unavailable.
2. Earth above the geometric horizon with unknown terrain LOS must not produce `Available`.
3. Clear terrain LOS with no RF inputs must remain `Not configured` / `Unknown`.
4. A valid RF margin with a terrain-blocked path must not produce `Available`.
5. A relay may rescue an unavailable direct path only if the relay path is actually configured, evaluated, and passes its supported checks.
6. Any site, mission epoch, rover, antenna, RF, relay or relevant terrain-source change must mark old results stale/pending until recalculation completes.

## 6. Typed Data Contract and Phase 27 Context Extension

Create or extend a typed, versioned `CommunicationLinkAnalysis` result. Adapt names to current repository conventions and to the real calculations found during inspection. The following is a reference shape, not a requirement to fabricate unsupported values:

```ts
export type CommunicationStatus =
  | "available"
  | "limited"
  | "unavailable"
  | "unknown"
  | "not_configured"
  | "pending"
  | "error";

export interface CommunicationLinkAnalysis {
  status: CommunicationStatus;
  statusReason: string;
  selectedPath: "direct" | "relay" | "none" | "undetermined";
  evaluatedAt: string | null;
  missionEpoch: string | null;
  geometry: {
    earthAzimuthDeg: number | null;
    earthElevationDeg: number | null;
    aboveGeometricHorizon: boolean | null;
  };
  terrainLos: {
    status: "clear" | "blocked" | "unknown" | "not_evaluated";
    obstructionAngleDeg: number | null;
    angularClearanceDeg: number | null;
    obstructionDistanceM: number | null;
    source: string | null;
    modelVersion: string | null;
    resolutionM: number | null;
    warning: string | null;
  };
  rfLink: {
    status: "pass" | "marginal" | "fail" | "not_configured" | "not_evaluated";
    frequencyHz: number | null;
    transmitPowerW: number | null;
    transmitAntennaGainDbi: number | null;
    receiveAntennaGainDbi: number | null;
    slantRangeM: number | null;
    pathLossDb: number | null;
    receivedPowerDbm: number | null;
    receiverSensitivityDbm: number | null;
    linkMarginDb: number | null;
    requiredMarginDb: number | null;
    modelName: string | null;
    warning: string | null;
  };
  relay: {
    configured: boolean;
    evaluated: boolean;
    available: boolean | null;
    relayId: string | null;
    source: string | null;
    warning: string | null;
  };
  provenance: {
    source: string[];
    calculationVersion: string | null;
    warnings: string[];
    stale: boolean;
  };
}
```

Rules:

- `null` plus an explicit status/reason represents missing or unsupported data. Do not use zero or `false` as a substitute for unknown.
- Only retain fields the implementation can support and trace to real source data.
- Include source, model/version, mission epoch, evaluated timestamp, freshness, and warnings.
- Extend the existing Phase 27 mission-context contract/version with a `communicationLink` property. Do not create a competing parallel context format.
- Keep the complete existing energy and terrain fields intact.

## 7. Live Synchronization to SIS

Reuse the Phase 27 live dashboard-to-SIS mission-context pipeline.

When communication analysis is recalculated:

1. Update the canonical Mission Analysis state with the new communication result.
2. Publish a refreshed complete mission snapshot containing the existing mission, energy and terrain data plus `communicationLink`.
3. Include the snapshot ID/version, source timestamp, mission epoch and freshness state.
4. Wait for the same agent acknowledgement mechanism used by Phase 27; SIS must answer from the latest acknowledged snapshot, not an unacknowledged client-side update.
5. When the calculation is pending or stale, send that state explicitly. Do not label the previous result current.

Do not create a separate communication-only LiveKit topic or snapshot channel if Phase 27 already provides a mission-context transport. Keep payloads compact. If the full snapshot exceeds the transport limit, reuse the existing authenticated server-side snapshot/reference mechanism; do not silently truncate or drop communication fields.

Never include Gemini, LiveKit, or other API secrets in the browser payload or mission snapshot.

## 8. SIS Agent Behavior

Update the Python SIS agent's context instructions and response grounding to answer questions such as:

- “Can the rover communicate directly with Earth at this time?”
- “Is the communication path blocked by lunar terrain?”
- “Is the RF link budget sufficient?”
- “What is the link margin?”
- “Would a relay be required?”
- “Why is communication unavailable?”
- “What information is missing to determine communication availability?”

SIS must explain the difference between geometric visibility, terrain LOS, RF link budget and relay availability. Mention the active mission epoch and relevant data source when useful.

Never:

- infer operational RF communication from Earth being above the horizon;
- claim a terrain-clear path when the DEM/LOS result is missing or unknown;
- claim a valid RF link when required RF inputs are missing;
- claim a relay is available without a configured and evaluated relay result;
- reuse stale communication results as current;
- invent antenna, transmitter, receiver, relay, frequency, power, link margin or coverage values.

When evidence is insufficient, SIS must say that operational communication cannot currently be determined and identify the exact missing or stale items represented in the mission context.

## 9. Implementation Workflow

### Step 1 — Inspect before editing

Inspect the current repository and identify:

- the exact right-side Mission Analysis sidebar component and current card order;
- Earth Analysis/ephemeris result types and selected mission epoch;
- terrain DEM, local horizon, obstruction, LOS and ray-tracing services;
- rover/radio configuration types and current mission inputs;
- any existing RF or relay calculation logic;
- Phase 27 shared mission-context schema, snapshot builder, freshness/versioning, LiveKit transport and acknowledgement path;
- `voice-agent/src/agent.py` mission-context handler and system instructions;
- existing tests and current report conventions.

Do not assume files or APIs exist because they are named in this specification. Confirm the actual code paths.

### Step 2 — Produce a source/field inventory

Before implementation, create a table listing each proposed displayed communication metric with:

- UI label/card field;
- canonical TypeScript state/API field;
- type and unit;
- calculation status and timestamp source;
- provenance/model source;
- serialized mission-context key;
- test that proves the value reaches SIS.

Mark unavailable capabilities as `Not implemented` / `Not configured`; do not create fake inventory entries as if backed by code.

### Step 3 — Implement only supported calculation layers

Reuse existing calculations. Add new terrain LOS or RF calculations only when suitable inputs and scientifically defensible models are available. If the repository lacks required DEM coverage, radio settings, relay data or model support, expose a truthful unavailable state and document the gap rather than faking a completed link.

### Step 4 — Integrate card and context

Add the sidebar card, typed result, status resolver, Phase 27 snapshot extension and SIS agent interpretation. Preserve all existing sidebar and workspace behavior.

### Step 5 — Debug and verify

Use structured logs with a correlation/snapshot ID across calculation, sidebar state, mission-context publication, agent acknowledgement and SIS response. Log statuses and IDs, not secrets or unnecessary personal data.

## 10. Required Test Scenarios

1. **Earth below geometric horizon:** direct geometric path is unavailable; no claim that every relay path is unavailable.
2. **Earth above horizon, terrain LOS blocked:** direct communication is unavailable even though the Earth geometry card says above horizon.
3. **Earth above horizon, terrain LOS unknown:** status is `Unknown`, never `Available`.
4. **Clear LOS, no radio configuration:** display `Not configured`; no RF availability claim.
5. **Clear LOS, valid RF budget above required margin:** display direct path available with model, assumptions and computed margin.
6. **Clear LOS, RF budget below threshold:** display `Unavailable` or `Limited` according to the explicit configured criterion.
7. **Terrain blocked but a configured relay passes:** report `Available via relay` only when the relay path calculation actually passes.
8. **No relay configured:** clearly report no relay configuration; do not infer alternate coverage.
9. **Mission site/epoch/rover/radio configuration changes:** old results become stale/pending until recalculation finishes.
10. **Live SIS update:** change a communication input or mission epoch, wait for sidebar recalculation and agent acknowledgement, then ask SIS about communication without refreshing the page. SIS must use the new snapshot.
11. **Missing/stale context:** SIS explains that it cannot determine current communication status and identifies missing/stale evidence.
12. **Regression:** Sun Analysis, Earth Analysis, Solar Illumination & Energy, terrain, rover, existing Phase 27 live context sync, and Phase 26 text/voice sessions continue to work.

## 11. Required Verification

Run the applicable repository checks:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- Python `pytest` suite
- existing LiveKit end-to-end text interaction test
- browser verification of the full right-side Analysis sidebar at desktop and mobile widths
- mission-context freshness/acknowledgement test
- live SIS communication round-trip without page refresh

Add unit tests for status resolution, input validation, unit conversions, RF calculations, context serialization and stale-state handling. Add integration tests for terrain LOS and relay decisions where the actual models exist.

## 12. Required Debug/Completion Report

Create `PHASE_28_COMMUNICATION_LINK_REPORT.md` documenting:

- actual files inspected and changed;
- the exact UI location of the new card;
- which layers are genuinely implemented: geometry, terrain LOS, RF link budget, relay;
- whether terrain LOS calculations already existed or were added;
- whether the RF model already existed or was added;
- the model equations/assumptions and required input parameters;
- which relay data/model exists, or why relay remains not configured;
- source/provenance and freshness behavior;
- test inputs and outputs, clearly marked as test data where applicable;
- test results and screenshots;
- any remaining scientific or coverage limitations.

Do not mark the phase `VERIFIED` merely because the card renders. Verification requires supported calculations, truthful missing-data behavior, successful live mission-context acknowledgement and an SIS answer grounded in the latest communication snapshot.

---

## Definition of Done

Phase 28 is complete only when the existing right-side Mission Analysis sidebar contains a dedicated **Communication Link Analysis** card; the card's overall state is correctly derived from geometric visibility, numeric-terrain LOS, a validated RF budget and any genuinely evaluated relay path; the communication result is added to the existing Phase 27 versioned mission-context snapshot; the SIS agent acknowledges and uses the latest snapshot in live text/voice conversations without a page refresh; all relevant tests pass; and the report clearly identifies any layer that remains `Unknown`, `Not configured`, `Not evaluated`, pending or unsupported.
