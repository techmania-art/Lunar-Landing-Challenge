"""Phase 27: Shared Mission Context Snapshot models and prompt formatting for SIS Agent.

Provides strong validation, room-scoped session caching, and turn-boundary
grounding prompts constructed from the exact right-side Mission Analysis sidebar.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("sis-mission-context")

MISSION_CONTEXT_TOPIC = "lmp.sis.mission-context.v1"
MISSION_CONTEXT_ACK_TOPIC = "lmp.sis.mission-context.ack.v1"


@dataclass
class SunSnapshot:
    status: str
    azimuthDeg: Optional[float]
    elevationDeg: Optional[float]
    geometricStatus: Optional[str]
    observationTimeUtc: Optional[str]
    source: str
    limitation: str


@dataclass
class EarthSnapshot:
    status: str
    azimuthDeg: Optional[float]
    elevationDeg: Optional[float]
    geometricStatus: Optional[str]
    observationTimeUtc: Optional[str]
    source: str
    limitation: str


@dataclass
class SolarEnergySnapshot:
    status: str
    illuminationState: str
    sunElevationDeg: Optional[float]
    terrainHorizonMaskDeg: Optional[float]
    directSolarPowerW: Optional[float]
    estimatedEnergyWh: Optional[float]
    analysisDurationHours: Optional[float]
    directIrradianceModel: str
    terrainDataset: str
    message: str
    assumptions: List[str] = field(default_factory=list)


@dataclass
class RouteTerrainSnapshot:
    status: str
    routeDistanceKm: Optional[float]
    corridorWidthMeters: Optional[float]
    totalObstacles: Optional[int]
    obstacleStatus: str
    maximumSlopeDeg: Optional[float]
    averageSlopeDeg: Optional[float]
    roughnessRmsdMeters: Optional[float]
    detectedCraters: Optional[int]
    cratersInCorridor: Optional[int]
    boulderStatus: str
    elevationMinMeters: Optional[float]
    elevationMaxMeters: Optional[float]
    elevationChangeMeters: Optional[float]
    elevationModel: str
    datum: str
    reasons: List[str] = field(default_factory=list)


@dataclass
class RoverTraverseSnapshot:
    state: str
    routeDistanceKm: Optional[float]
    estimatedDriveTimeHours: Optional[float]
    totalEnergyRequiredWh: Optional[float]
    availableEnergyWh: Optional[float]
    netMarginWh: Optional[float]
    projectedEndingBatteryEnergyWh: Optional[float]
    explanation: str
    assumptions: List[str] = field(default_factory=list)


@dataclass
class CommunicationVisibilitySnapshot:
    geometricStatus: str
    earthAboveHorizon: Optional[bool]
    observationEpoch: str
    source: str
    rfLinkAssessed: bool
    limitation: str


@dataclass
class CommunicationLinkSnapshot:
    status: str
    statusReason: str
    selectedPath: str
    evaluatedAt: Optional[str]
    missionEpoch: Optional[str]
    geometry: Dict[str, Any]
    terrainLos: Dict[str, Any]
    rfLink: Dict[str, Any]
    relay: Dict[str, Any]
    provenance: Dict[str, Any]


@dataclass
class LmpMissionContextSnapshot:
    schemaVersion: str
    contextId: str
    revision: int
    createdAt: str
    mission: Dict[str, Any]
    rover: Dict[str, Any]
    analysisStatus: Dict[str, Any]
    sun: SunSnapshot
    earth: EarthSnapshot
    solarEnergy: SolarEnergySnapshot
    routeTerrain: RouteTerrainSnapshot
    roverTraverse: RoverTraverseSnapshot
    communicationVisibility: CommunicationVisibilitySnapshot
    provenance: Dict[str, Any]
    communicationLink: Optional[CommunicationLinkSnapshot] = None
    raw_payload: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LmpMissionContextSnapshot":
        """Validate and construct snapshot from dictionary payload."""
        if not isinstance(data, dict):
            raise ValueError("Payload must be a dictionary")

        schema_version = data.get("schemaVersion")
        if schema_version != "1.0.0":
            raise ValueError(f"Unsupported schema version: {schema_version}")

        context_id = data.get("contextId")
        if not context_id or not isinstance(context_id, str):
            raise ValueError("contextId must be a non-empty string")

        revision = data.get("revision")
        if revision is None or not isinstance(revision, int) or revision < 0:
            raise ValueError("revision must be a non-negative integer")

        sun_raw = data.get("sun") or {}
        sun = SunSnapshot(
            status=sun_raw.get("status", "unavailable"),
            azimuthDeg=sun_raw.get("azimuthDeg"),
            elevationDeg=sun_raw.get("elevationDeg"),
            geometricStatus=sun_raw.get("geometricStatus"),
            observationTimeUtc=sun_raw.get("observationTimeUtc"),
            source=sun_raw.get("source", "JPL Horizons (Target 10)"),
            limitation=sun_raw.get("limitation", ""),
        )

        earth_raw = data.get("earth") or {}
        earth = EarthSnapshot(
            status=earth_raw.get("status", "unavailable"),
            azimuthDeg=earth_raw.get("azimuthDeg"),
            elevationDeg=earth_raw.get("elevationDeg"),
            geometricStatus=earth_raw.get("geometricStatus"),
            observationTimeUtc=earth_raw.get("observationTimeUtc"),
            source=earth_raw.get("source", "JPL Horizons (Target 399)"),
            limitation=earth_raw.get("limitation", ""),
        )

        solar_raw = data.get("solarEnergy") or {}
        solar_energy = SolarEnergySnapshot(
            status=solar_raw.get("status", "unavailable"),
            illuminationState=solar_raw.get("illuminationState", "UNAVAILABLE"),
            sunElevationDeg=solar_raw.get("sunElevationDeg"),
            terrainHorizonMaskDeg=solar_raw.get("terrainHorizonMaskDeg"),
            directSolarPowerW=solar_raw.get("directSolarPowerW"),
            estimatedEnergyWh=solar_raw.get("estimatedEnergyWh"),
            analysisDurationHours=solar_raw.get("analysisDurationHours"),
            directIrradianceModel=solar_raw.get("directIrradianceModel", "ASTM E490 (1361 W/m²)"),
            terrainDataset=solar_raw.get("terrainDataset", "LOLA DEM"),
            message=solar_raw.get("message", ""),
            assumptions=solar_raw.get("assumptions") or [],
        )

        terrain_raw = data.get("routeTerrain") or {}
        route_terrain = RouteTerrainSnapshot(
            status=terrain_raw.get("status", "NOT_EVALUATED"),
            routeDistanceKm=terrain_raw.get("routeDistanceKm"),
            corridorWidthMeters=terrain_raw.get("corridorWidthMeters"),
            totalObstacles=terrain_raw.get("totalObstacles"),
            obstacleStatus=terrain_raw.get("obstacleStatus", "UNAVAILABLE"),
            maximumSlopeDeg=terrain_raw.get("maximumSlopeDeg"),
            averageSlopeDeg=terrain_raw.get("averageSlopeDeg"),
            roughnessRmsdMeters=terrain_raw.get("roughnessRmsdMeters"),
            detectedCraters=terrain_raw.get("detectedCraters"),
            cratersInCorridor=terrain_raw.get("cratersInCorridor"),
            boulderStatus=terrain_raw.get("boulderStatus", "UNAVAILABLE"),
            elevationMinMeters=terrain_raw.get("elevationMinMeters"),
            elevationMaxMeters=terrain_raw.get("elevationMaxMeters"),
            elevationChangeMeters=terrain_raw.get("elevationChangeMeters"),
            elevationModel=terrain_raw.get("elevationModel", "LRO LOLA Polar DEM (100m/px)"),
            datum=terrain_raw.get("datum", "LOLA Mean Radius"),
            reasons=terrain_raw.get("reasons") or [],
        )

        rover_raw = data.get("roverTraverse") or {}
        rover_traverse = RoverTraverseSnapshot(
            state=rover_raw.get("state", "NOT_EVALUATED"),
            routeDistanceKm=rover_raw.get("routeDistanceKm"),
            estimatedDriveTimeHours=rover_raw.get("estimatedDriveTimeHours"),
            totalEnergyRequiredWh=rover_raw.get("totalEnergyRequiredWh"),
            availableEnergyWh=rover_raw.get("availableEnergyWh"),
            netMarginWh=rover_raw.get("netMarginWh"),
            projectedEndingBatteryEnergyWh=rover_raw.get("projectedEndingBatteryEnergyWh"),
            explanation=rover_raw.get("explanation", ""),
            assumptions=rover_raw.get("assumptions") or [],
        )

        comm_raw = data.get("communicationVisibility") or {}
        communication = CommunicationVisibilitySnapshot(
            geometricStatus=comm_raw.get("geometricStatus", "Geometric Visibility Unavailable"),
            earthAboveHorizon=comm_raw.get("earthAboveHorizon"),
            observationEpoch=comm_raw.get("observationEpoch", ""),
            source=comm_raw.get("source", "JPL Horizons (Target 399)"),
            rfLinkAssessed=False,
            limitation=comm_raw.get(
                "limitation",
                "Geometric visibility only: Operational radio communication availability, link-budget, and antenna coverage have not been evaluated.",
            ),
        )

        comm_link_raw = data.get("communicationLink")
        communication_link = None
        if comm_link_raw and isinstance(comm_link_raw, dict):
            communication_link = CommunicationLinkSnapshot(
                status=comm_link_raw.get("status", "unknown"),
                statusReason=comm_link_raw.get("statusReason", ""),
                selectedPath=comm_link_raw.get("selectedPath", "undetermined"),
                evaluatedAt=comm_link_raw.get("evaluatedAt"),
                missionEpoch=comm_link_raw.get("missionEpoch"),
                geometry=comm_link_raw.get("geometry") or {},
                terrainLos=comm_link_raw.get("terrainLos") or {},
                rfLink=comm_link_raw.get("rfLink") or {},
                relay=comm_link_raw.get("relay") or {},
                provenance=comm_link_raw.get("provenance") or {},
            )

        return cls(
            schemaVersion=schema_version,
            contextId=context_id,
            revision=revision,
            createdAt=data.get("createdAt", datetime.now(timezone.utc).isoformat()),
            mission=data.get("mission") or {},
            rover=data.get("rover") or {},
            analysisStatus=data.get("analysisStatus") or {},
            sun=sun,
            earth=earth,
            solarEnergy=solar_energy,
            routeTerrain=route_terrain,
            roverTraverse=rover_traverse,
            communicationVisibility=communication,
            communicationLink=communication_link,
            provenance=data.get("provenance") or {},
            raw_payload=data,
        )


def format_grounding_block(snapshot: Optional[LmpMissionContextSnapshot]) -> str:
    """Format live mission dashboard snapshot into an authoritative grounding block for LLM prompts."""
    if not snapshot:
        return (
            "[ACTIVE MISSION CONTEXT - STATUS: PENDING]\n"
            "Live Mission Analysis sidebar calculations are currently awaiting user input or completion.\n"
            "Explain that specific numerical ephemerides, solar power, and route terrain metrics are pending analysis."
        )

    mission = snapshot.mission
    lat = mission.get("latitudeDeg")
    lon = mission.get("longitudeDeg")
    epoch = mission.get("observationEpoch", "N/A")

    sun_str = (
        f"Azimuth {snapshot.sun.azimuthDeg}°, Elevation {snapshot.sun.elevationDeg}°, "
        f"Geometric Status: '{snapshot.sun.geometricStatus}' ({snapshot.sun.source})"
        if snapshot.sun.status == "ready"
        else f"Sun ephemeris status: {snapshot.sun.status}"
    )

    earth_str = (
        f"Azimuth {snapshot.earth.azimuthDeg}°, Elevation {snapshot.earth.elevationDeg}°, "
        f"Geometric Status: '{snapshot.earth.geometricStatus}' ({snapshot.earth.source})"
        if snapshot.earth.status == "ready"
        else f"Earth ephemeris status: {snapshot.earth.status}"
    )

    pwr_str = (
        f"{snapshot.solarEnergy.directSolarPowerW} W"
        if snapshot.solarEnergy.directSolarPowerW is not None
        else "N/A"
    )
    nrg_str = (
        f"{snapshot.solarEnergy.estimatedEnergyWh} Wh ({snapshot.solarEnergy.analysisDurationHours}h)"
        if snapshot.solarEnergy.estimatedEnergyWh is not None
        else "N/A"
    )
    solar_str = (
        f"State: {snapshot.solarEnergy.illuminationState}, Direct Solar Power: {pwr_str}, "
        f"Estimated Energy: {nrg_str}, Sun Elevation: {snapshot.solarEnergy.sunElevationDeg}°, "
        f"LOLA Terrain Horizon Mask: {snapshot.solarEnergy.terrainHorizonMaskDeg}°"
    )

    terrain = snapshot.routeTerrain
    terrain_str = (
        f"Status: {terrain.status}, Route Distance: {terrain.routeDistanceKm} km (Corridor: {terrain.corridorWidthMeters}m), "
        f"Obstacles: {terrain.totalObstacles} (Status: {terrain.obstacleStatus}), "
        f"Max Slope: {terrain.maximumSlopeDeg}°, Avg Slope: {terrain.averageSlopeDeg}°, "
        f"Roughness RMSD: {terrain.roughnessRmsdMeters} m, Craters: {terrain.detectedCraters} ({terrain.cratersInCorridor} in corridor), "
        f"Boulders: {terrain.boulderStatus}, Elevation Profile Δz: {terrain.elevationChangeMeters} m "
        f"({terrain.elevationMinMeters}m to {terrain.elevationMaxMeters}m, Model: {terrain.elevationModel})"
        if terrain.status != "NOT_EVALUATED"
        else "Route Terrain: Not Evaluated (Destination coordinates not configured)."
    )

    traverse = snapshot.roverTraverse
    req_energy = f"{traverse.totalEnergyRequiredWh} Wh" if traverse.totalEnergyRequiredWh is not None else "N/A"
    avail_energy = f"{traverse.availableEnergyWh} Wh" if traverse.availableEnergyWh is not None else "N/A"
    margin = (
        f"{traverse.netMarginWh:+.1f} Wh"
        if traverse.netMarginWh is not None
        else "N/A"
    )
    end_battery = (
        f"{traverse.projectedEndingBatteryEnergyWh} Wh"
        if traverse.projectedEndingBatteryEnergyWh is not None
        else "N/A"
    )
    traverse_str = (
        f"State: {traverse.state}, Required Energy: {req_energy}, Available (Battery+Solar): {avail_energy}, "
        f"Net Margin: {margin}, Projected Battery End: {end_battery}, "
        f"Drive Time: {traverse.estimatedDriveTimeHours} h"
        if traverse.state != "NOT_EVALUATED"
        else "Rover Traverse Feasibility: Not Evaluated."
    )

    comm = snapshot.communicationVisibility
    comm_str = (
        f"Geometric Status: '{comm.geometricStatus}', Earth Above Horizon: {comm.earthAboveHorizon}. "
        f"IMPORTANT: Radio frequency link-budget, transceiver margin, and operational antenna coverage have NOT been evaluated. "
        f"Geometric visibility does NOT guarantee operational communication; line-of-sight and RF link closure require separate analysis."
    )

    comm_link = snapshot.communicationLink
    if comm_link:
        rf = comm_link.rfLink
        los = comm_link.terrainLos
        geo = comm_link.geometry
        relay = comm_link.relay

        rf_margin = rf.get("linkMarginDb")
        rf_margin_str = f"{rf_margin:+.1f} dB (req: {rf.get('requiredMarginDb')} dB)" if rf_margin is not None else "Not configured"
        rf_pwr_str = f"Tx: {rf.get('transmitPowerW')} W, Rx: {rf.get('receivedPowerDbm')} dBm, FSPL: {rf.get('pathLossDb')} dB" if rf.get("pathLossDb") is not None else "N/A"
        los_clear = los.get("angularClearanceDeg")
        los_clear_str = f"Clearance: {los_clear:+.2f}° (mask: {los.get('obstructionAngleDeg')}°)" if los_clear is not None else "N/A"

        comm_link_str = (
            f"Overall Status: {comm_link.status.upper()} (Path: {comm_link.selectedPath})\n"
            f"   Assessment Verdict: {comm_link.statusReason}\n"
            f"   Layer 1 (Geometry): Earth Elev {geo.get('earthElevationDeg')}°, Above Horizon: {geo.get('aboveGeometricHorizon')}\n"
            f"   Layer 2 (Terrain LOS): Status '{los.get('status')}', {los_clear_str}, Model: {los.get('source')}\n"
            f"   Layer 3 (RF Link Budget): Status '{rf.get('status')}', Margin: {rf_margin_str}, {rf_pwr_str}\n"
            f"   Layer 4 (Relay Path): Configured: {relay.get('configured')}, Available: {relay.get('available')}, Relay ID: {relay.get('relayId')}"
        )
    else:
        comm_link_str = "Communication Link Analysis: Not evaluated in this snapshot."

    is_stale = snapshot.provenance.get("isStale", False)
    stale_note = " [WARNING: INPUTS CHANGED - SNAPSHOT IS STALE]" if is_stale else ""

    return f"""\
[AUTHORITATIVE DASHBOARD MISSION CONTEXT - REVISION {snapshot.revision}{stale_note}]
Site Coordinates: Lat {lat}°, Lon {lon}°
Observation Epoch: {epoch}
Overall Analysis Status: {snapshot.analysisStatus.get('overall', 'unknown')}

1. Sun Analysis:
   {sun_str}
   Limitation: {snapshot.sun.limitation}

2. Earth Analysis:
   {earth_str}
   Limitation: {snapshot.earth.limitation}

3. Solar Illumination & Energy (ASTM E490 Model):
   {solar_str}
   Scope: Direct solar generation only. Does not reflect battery charge or diffuse reflections.

4. Route Terrain Analysis (LOLA Polar DEM 100m/px):
   {terrain_str}

5. Rover Energy & Traverse Feasibility:
   {traverse_str}
   Scope: Applies strictly to configured route and modeled loads.

6. Communication Link Analysis (Four-Layer Evaluation):
   {comm_link_str}

7. Geometric Communication Visibility (Reference):
   {comm_str}

8. Surrounding Terrain:
   Radial DEM horizon obstruction analysis is scheduled for Phase 8 roadmap (Status: Pending).
"""
