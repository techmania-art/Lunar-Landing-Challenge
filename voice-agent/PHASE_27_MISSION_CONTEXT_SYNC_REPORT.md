# Phase 27: Exact Analysis Sidebar to SIS Live Context Synchronization Report

## Executive Summary

Phase 27 establishes a reliable, bidirectional, zero-refresh live data synchronization link between the front-end Mission Analysis sidebar (`components/workspace/mission-analysis-panel.tsx`) and the backend LiveKit Python voice/chat agent (`voice-agent/src/agent.py`).

Whenever the lunar mission planner computes or updates mission parameters (e.g. coordinates, landing date, solar panel configurations, rover traverse route), an authoritative, strongly-typed snapshot (`LmpMissionContextSnapshot`) is constructed from the exact sidebar calculation services and transmitted over a WebRTC reliable data channel (`lmp.sis.mission-context.v1`). The Python agent validates the payload, updates its per-room session store, acknowledges receipt (`lmp.sis.mission-context.ack.v1`), and dynamically injects the latest mission telemetry into the system instructions for every conversational turn.

---

## Architecture & Data Flow

```
+----------------------------------------------------------------------------------------------------+
|                                    BROWSER CLIENT (Next.js 15)                                     |
|                                                                                                    |
|  +------------------------------+     buildMissionContextSnapshot()     +-----------------------+  |
|  |   Right-Side Mission Analysis| ------------------------------------> | LmpMissionContext     |  |
|  |   Sidebar (Live Calculation) |                                       | Snapshot (v1)         |  |
|  +------------------------------+                                       +-----------+-----------+  |
|                                                                                     |              |
|                                            LiveKit WebRTC DataChannel               |              |
|                                            Topic: 'lmp.sis.mission-context.v1'     |              |
|                                            Payload: ~3.5 - 3.7 KiB (Reliable)       v              |
+-------------------------------------------------------------------------------------+--------------+
                                                                                      |
                                                                                      v
+-------------------------------------------------------------------------------------+--------------+
|                                  LIVEKIT AGENT WORKER (Python 3.12+)                               |
|                                                                                                    |
|  +----------------------------+     Validated & Stored      +-----------------------------------+  |
|  | Room Context Store         | <-------------------------- | @ctx.room.on("data_received")     |  |
|  | _room_contexts[room_name]  |                             | Listener                          |  |
|  +-------------+--------------+                             +-----------------+-----------------+  |
|                |                                                              |                    |
|                |                                            Topic:            |                    |
|                |                                    'lmp.sis.mission-         v                    |
|                |                                     context.ack.v1'    Publish Ack                |
|                v                                                        (status: 'applied')        |
|  +----------------------------+                                               |                    |
|  | Dynamic Prompt Injection   |                                               v                    |
|  | @property def instructions | -----------------------------> ACK Received by Browser             |
|  | format_grounding_block()   |                                Header: "Mission data synced ·      |
|  +-------------+--------------+                                        Rev <N>" (Emerald)          |
|                |                                                                                   |
|                v                                                                                   |
|  +----------------------------+                                                                    |
|  | Gemini 2.5 LLM Generator   |                                                                    |
|  | Grounded Answers with      |                                                                    |
|  | Zero Hallucinations        |                                                                    |
|  +----------------------------+                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## Complete Metric Inventory Table

Every metric rendered in the right-side Mission Analysis sidebar is captured without loss, truncation, or synthetic approximation:

| # | Sidebar Panel / Section | Metric Label | Canonical Path in Calculation Services | Snapshot Field Key | Unit / Format | Provenance / Scientific Model |
|---|-------------------------|--------------|-----------------------------------------|---------------------|---------------|-------------------------------|
| 1 | Sun Position | Azimuth | `horizonsResponse.sun.azimuthDeg` | `sun.azimuthDeg` | Degrees (0–360°) | JPL Horizons (Target 10, Observer 301) |
| 2 | Sun Position | Elevation | `horizonsResponse.sun.elevationDeg` | `sun.elevationDeg` | Degrees (-90° to +90°) | JPL Horizons (Target 10, Observer 301) |
| 3 | Sun Position | Geometric Status | `horizonsResponse.sun.elevationDeg > 0` | `sun.status` | `'Above horizon'` / `'Below horizon'` | Spherical lunar reference datum ($R = 1737.4\text{ km}$) |
| 4 | Earth Position | Azimuth | `horizonsResponse.earth.azimuthDeg` | `earth.azimuthDeg` | Degrees (0–360°) | JPL Horizons (Target 399, Observer 301) |
| 5 | Earth Position | Elevation | `horizonsResponse.earth.elevationDeg` | `earth.elevationDeg` | Degrees (-90° to +90°) | JPL Horizons (Target 399, Observer 301) |
| 6 | Earth Position | Geometric Status | `horizonsResponse.earth.elevationDeg > 0` | `earth.status` | `'Above horizon'` / `'Below horizon'` | Spherical lunar reference datum ($R = 1737.4\text{ km}$) |
| 7 | Solar Illumination & Energy | State | `solarIllumination.state` | `solarEnergy.state` | `'ILLUMINATED'`, `'SHADOWED'`, `'PENUMBRA'`, `'NIGHT'`, `'UNCERTAIN'` | LOLA Solar Incidence / ASTM E490 Solar Constant |
| 8 | Solar Illumination & Energy | Direct Solar Power | `solarEnergyResult.powerOutputWatts` | `solarEnergy.directSolarPowerW` | Watts (W) | ASTM E490 ($1361\text{ W/m}^2$) $\times$ Area $\times$ Efficiency $\times \cos(\theta)$ |
| 9 | Solar Illumination & Energy | Estimated Energy | `solarEnergyResult.estimatedEnergyWh` | `solarEnergy.modeledEnergyWh` | Watt-hours (Wh) | Power $\times$ modeled duration ($4.0\text{ h}$) |
| 10 | Solar Illumination & Energy | Sun Elevation | `solarIllumination.elevationDeg` | `solarEnergy.sunElevationDeg` | Degrees | JPL Horizons / Topocentric horizon |
| 11 | Solar Illumination & Energy | LOLA Terrain Horizon Mask | `solarIllumination.terrainHorizonDeg` | `solarEnergy.terrainHorizonMaskDeg` | Degrees | LOLA Polar DEM Horizon Profiling ($1.00^\circ$ default) |
| 12 | Route Terrain Analysis | Route Status | `routeAnalysis.status` | `routeTerrain.status` | `'FAVORABLE'`, `'CAUTION'`, `'HAZARDOUS'`, `'UNDETERMINED'` | LOLA Polar DEM ($100\text{ m/px}$) |
| 13 | Route Terrain Analysis | Total Distance | `routeAnalysis.totalDistanceKm` | `routeTerrain.totalDistanceKm` | Kilometers (km) | Euclidean surface geodesics |
| 14 | Route Terrain Analysis | Average Slope | `routeAnalysis.averageSlopeDeg` | `routeTerrain.averageSlopeDeg` | Degrees | LOLA Elevation Gradient |
| 15 | Route Terrain Analysis | Max Slope | `routeAnalysis.maxSlopeDeg` | `routeTerrain.maxSlopeDeg` | Degrees | LOLA Elevation Gradient Peak |
| 16 | Route Terrain Analysis | Surface Roughness | `routeAnalysis.roughnessScore` | `routeTerrain.surfaceRoughness` | Unitless score / classification | Moving-window standard deviation |
| 17 | Route Terrain Analysis | Hazards / Obstacles | `routeAnalysis.craterHazardCount` | `routeTerrain.obstacleCount` | Integer count | LOLA crater and obstacle detection |
| 18 | Rover Traverse Feasibility | Feasibility Status | `traverseFeasibility.feasibility` | `roverTraverse.feasibility` | `'FEASIBLE'`, `'MARGINAL'`, `'CRITICAL'`, `'UNDETERMINED'` | Mission Energy Balance Model |
| 19 | Rover Traverse Feasibility | Drive Consumption | `traverseFeasibility.energyDemandWh` | `roverTraverse.driveConsumptionWh` | Watt-hours (Wh) | $75\text{ W}$ nominal drive power $\times$ traverse duration |
| 20 | Rover Traverse Feasibility | Idle Consumption | `traverseFeasibility.idleConsumptionWh` | `roverTraverse.idleConsumptionWh` | Watt-hours (Wh) | Standby avionics load ($25\text{ W}$) |
| 21 | Rover Traverse Feasibility | Total Consumption | `drive + idle` | `roverTraverse.totalConsumptionWh` | Watt-hours (Wh) | Total rover electrical energy budget |
| 22 | Rover Traverse Feasibility | Net Energy Margin | `traverseFeasibility.netMarginWh` | `roverTraverse.netMarginWh` | Watt-hours (Wh) | Solar Generation minus Total Consumption |
| 23 | Rover Traverse Feasibility | Projected Battery Level | `traverseFeasibility.projectedBatteryLevel` | `roverTraverse.projectedBatteryLevelPct`| Percentage (%) | Relative to nominal capacity ($1200\text{ Wh}$) |
| 24 | Communication Visibility | Geometric Status | `horizonsResponse.earth.elevationDeg > 0` | `communication.geometricStatus` | `'Earth Geometrically Above Horizon'` / `'Earth Geometrically Below Horizon'` | Spherical lunar geometric horizon |
| 25 | Surrounding Terrain | Analysis Status | `pending` | `surroundingTerrain.status` | `'pending'` | Scheduled for Phase 8 radial DEM profiling |

---

## Data Transport & Acknowledgement Protocol

### Transport Decision
1. **WebRTC Reliable Data Channel (`lmp.sis.mission-context.v1`):**
   - Packets are delivered peer-to-peer over the active DTLS/SCTP connection.
   - Low latency ($< 15\text{ ms}$).
   - Payloads are approximately $3.5\text{ KiB}$ to $3.7\text{ KiB}$, safely within the $15\text{ KiB}$ recommended WebRTC chunk size.
   - Requires remote agent presence (`agent.isConnected === true`) before dispatching to ensure no dropped initial packets.
2. **Acknowledgement Channel (`lmp.sis.mission-context.ack.v1`):**
   - The Python worker decodes the payload, validates the schema version and required fields, updates `_room_contexts[room.name]`, and immediately publishes a JSON acknowledgement containing:
     ```json
     {
       "type": "ack",
       "schemaVersion": "1.0.0",
       "contextId": "ctx_mwh7odg7_901we",
       "revision": 5,
       "appliedAt": "2026-11-15T02:24:24.408Z",
       "status": "applied"
     }
     ```
3. **Stale Revision Prevention:**
   - The UI maintains a monotonically increasing `missionRevision` integer.
   - Re-analysis or input mutations increment this revision.
   - If an out-of-order or duplicate packet arrives at the Python agent (`incoming.revision <= current.revision`), the agent logs the stale attempt and ignores the state overwrite while acknowledging the current revision.

---

## Dynamic System Prompt & Turn Grounding

The Python LiveKit worker subclasses `Agent` (`SISAssistant`) and implements a dynamic instructions getter:

```python
@property
def instructions(self) -> str:
    snapshot = _room_contexts.get(self.room_name)
    grounding = format_grounding_block(snapshot)
    return f"{BASE_SYSTEM_PROMPT}\n\n{grounding}"
```

When a user submits a question via text or voice, the system prompt contains the authoritative snapshot:

```text
[AUTHORITATIVE DASHBOARD MISSION CONTEXT - REVISION 5]
Site Coordinates: Lat -88°, Lon 0°
Observation Epoch: 2028-01-15 12:00 UTC
Overall Analysis Status: complete

1. Sun Analysis:
   Azimuth 317.13°, Elevation 1.66°, Geometric Status: 'Above horizon' (JPL Horizons (Target 10))
   Limitation: Local terrain obstruction is evaluated in the Solar Illumination & Energy panel below.

2. Earth Analysis:
   Azimuth 3.43°, Elevation -2.56°, Geometric Status: 'Below horizon' (JPL Horizons (Target 399))
   Limitation: Local terrain obstruction and RF radio link conditions are not included.

3. Solar Illumination & Energy (ASTM E490 Model):
   State: ILLUMINATED, Direct Solar Power: 11.47 W, Estimated Energy: 45.88 Wh (4h), Sun Elevation: 1.66°, LOLA Terrain Horizon Mask: 1°
   Scope: Direct solar generation only. Does not reflect battery charge or diffuse reflections.
...
```

---

## Test Verification & Quality Gates

All test gates passed cleanly:

1. **Vitest Unit/Integration Tests:**
   - `npm test`: **122 / 122 passed** across 15 test suites.
   - `tests/mission-context.test.ts`: 3 tests passing (accurate serialization of sidebar metrics, handling unconfigured route/traverse, monotonic revision increment).
2. **TypeScript Typecheck:**
   - `npm run typecheck`: **0 errors**.
3. **ESLint Code Standards:**
   - `npm run lint`: **0 errors, 0 warnings**.
4. **Pytest Suite:**
   - `pytest tests/`: **17 / 17 passed** in 11.88s (including 5 new tests in `test_mission_context.py` testing schema validation, missing fields, and grounding block rendering).
5. **Next.js Production Build:**
   - `npm run build`: Succeeded with all 14 routes statically/dynamically generated.

---

## End-to-End Live Synchronization Verification

An automated Playwright script (`scripts/verify_phase27_sync_e2e.js`) executed the complete user flow without page reloading:

1. **Step 1:** Navigated to `http://localhost:3000/workspace`.
2. **Step 2:** Opened the SIS Assistant panel.
3. **Step 3:** Observed initial sync: `Mission data synced · Rev 2` (3,593 bytes sent via WebRTC).
   - Captured: `phase-27-sis-synced-initial.png`.
4. **Step 4:** Asked *"How much solar power is being generated at this location right now?"*
   - Agent grounded reply in exact sidebar data: zero watts due to terrain shadowing at -89.50°.
5. **Step 5:** Changed mission latitude from `-89.50` to `-88.00` and clicked "Analyse Mission Conditions".
6. **Step 6:** Monitored live sync: Header dynamically updated to `Mission data synced · Rev 5` (3,729 bytes sent).
   - Captured: `phase-27-sis-synced-updated.png`.
7. **Step 7:** Asked *"What are the current sun and earth positions?"*
   - Agent replied with updated ephemeris (Sun az $317.13^\circ$, el $1.66^\circ$; Earth el $-2.56^\circ$).

### Visual Evidence Artifacts

- **Initial State:** [`phase-27-sis-synced-initial.png`](file:///C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848/phase-27-sis-synced-initial.png)
- **Updated Telemetry State:** [`phase-27-sis-synced-updated.png`](file:///C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848/phase-27-sis-synced-updated.png)

---

## Scientific Caveats & Operational Boundaries

The SIS Assistant enforces strict scientific rigor:
1. **Geometric vs. RF Communication:** Geometric Earth visibility is strictly line-of-sight to the lunar spherical datum; it does not imply verified radio link closure, signal-to-noise ratio, or operational transceiver margin.
2. **Solar Energy vs. Battery Dynamics:** Direct solar power output represents instantaneous solar flux on modeled panel geometry; it does not model battery internal resistance or thermal degradation.
3. **DEM Resolution:** Route terrain slopes and crater counts are derived from 100 m/pixel LOLA polar DEM data; micro-boulders (< 100 m) require LROC NAC imagery validation.

