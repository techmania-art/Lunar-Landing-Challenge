"""Tests for Phase 27 Mission Context schema validation and grounding."""

import pytest
from src.mission_context import (
    LmpMissionContextSnapshot,
    format_grounding_block,
    MISSION_CONTEXT_TOPIC,
    MISSION_CONTEXT_ACK_TOPIC,
)


@pytest.fixture
def valid_snapshot_dict():
    return {
        "schemaVersion": "1.0.0",
        "contextId": "ctx_test_123",
        "revision": 1,
        "createdAt": "2028-01-15T12:00:00Z",
        "mission": {
            "latitudeDeg": -89.5,
            "longitudeDeg": 0.0,
            "missionDate": "2028-01-15",
            "missionTimeUtc": "12:00",
            "observationEpoch": "2028-01-15 12:00 UTC",
        },
        "rover": {
            "panelAreaM2": 1.2,
            "panelEfficiencyPercent": 28.5,
            "batteryCapacityWh": 1200,
        },
        "analysisStatus": {
            "overall": "complete",
            "sun": "ready",
            "earth": "ready",
            "solarEnergy": "ready",
            "routeTerrain": "ready",
            "roverTraverse": "ready",
            "communicationVisibility": "ready",
            "surroundingTerrain": "pending",
        },
        "sun": {
            "status": "ready",
            "azimuthDeg": 317.07,
            "elevationDeg": 3.13,
            "geometricStatus": "Above horizon",
            "observationTimeUtc": "2028-01-15 12:00 UTC",
            "source": "NASA JPL Horizons (Target 10)",
            "limitation": "Local terrain obstruction is evaluated in Solar panel.",
        },
        "earth": {
            "status": "ready",
            "azimuthDeg": 3.43,
            "elevationDeg": -0.56,
            "geometricStatus": "Below horizon",
            "observationTimeUtc": "2028-01-15 12:00 UTC",
            "source": "NASA JPL Horizons (Target 399)",
            "limitation": "RF link budget not included.",
        },
        "solarEnergy": {
            "status": "ready",
            "illuminationState": "ILLUMINATED",
            "sunElevationDeg": 3.13,
            "terrainHorizonMaskDeg": 1.2,
            "directSolarPowerW": 395.6,
            "estimatedEnergyWh": 1582.4,
            "analysisDurationHours": 4.0,
            "directIrradianceModel": "ASTM E490 (1361 W/m²)",
            "terrainDataset": "LOLA DEM",
            "message": "Direct sunlight available.",
            "assumptions": ["Horizontal flat panel"],
        },
        "routeTerrain": {
            "status": "PASSES_CONFIGURED_LIMITS",
            "routeDistanceKm": 15.2,
            "corridorWidthMeters": 100,
            "totalObstacles": 2,
            "obstacleStatus": "AVAILABLE",
            "maximumSlopeDeg": 12.5,
            "averageSlopeDeg": 4.8,
            "roughnessRmsdMeters": 0.35,
            "detectedCraters": 3,
            "cratersInCorridor": 1,
            "boulderStatus": "UNAVAILABLE",
            "elevationMinMeters": -3200,
            "elevationMaxMeters": -2800,
            "elevationChangeMeters": 400,
            "elevationModel": "LRO LOLA Polar DEM (100m/px)",
            "datum": "LOLA Mean Radius",
            "reasons": ["All corridor slopes under 20° limit"],
        },
        "roverTraverse": {
            "state": "SUFFICIENT_ENERGY",
            "routeDistanceKm": 15.2,
            "estimatedDriveTimeHours": 30.4,
            "totalEnergyRequiredWh": 2400,
            "availableEnergyWh": 2782.4,
            "netMarginWh": 382.4,
            "projectedEndingBatteryEnergyWh": 500,
            "explanation": "Energy budget is positive.",
            "assumptions": ["Constant speed 0.5 km/h"],
        },
        "communicationVisibility": {
            "geometricStatus": "Earth Geometrically Below Horizon",
            "earthAboveHorizon": False,
            "observationEpoch": "2028-01-15 12:00 UTC",
            "source": "JPL Horizons (Target 399)",
            "rfLinkAssessed": False,
            "limitation": "Geometric visibility only. Radio link-budget not evaluated.",
        },
        "provenance": {
            "generatedAt": "2028-01-15T12:00:00Z",
            "isStale": False,
            "models": ["JPL Horizons", "LOLA DEM"],
            "warnings": [],
        },
    }


def test_snapshot_from_dict_success(valid_snapshot_dict):
    snapshot = LmpMissionContextSnapshot.from_dict(valid_snapshot_dict)
    assert snapshot.schemaVersion == "1.0.0"
    assert snapshot.contextId == "ctx_test_123"
    assert snapshot.revision == 1
    assert snapshot.mission["latitudeDeg"] == -89.5
    assert snapshot.sun.azimuthDeg == 317.07
    assert snapshot.solarEnergy.directSolarPowerW == 395.6
    assert snapshot.routeTerrain.maximumSlopeDeg == 12.5
    assert snapshot.roverTraverse.netMarginWh == 382.4
    assert snapshot.communicationVisibility.earthAboveHorizon is False


def test_snapshot_from_dict_invalid_schema():
    with pytest.raises(ValueError, match="Unsupported schema version"):
        LmpMissionContextSnapshot.from_dict({"schemaVersion": "2.0.0"})


def test_snapshot_from_dict_missing_context_id(valid_snapshot_dict):
    valid_snapshot_dict["contextId"] = ""
    with pytest.raises(ValueError, match="contextId must be a non-empty string"):
        LmpMissionContextSnapshot.from_dict(valid_snapshot_dict)


def test_format_grounding_block_contains_all_metrics(valid_snapshot_dict):
    snapshot = LmpMissionContextSnapshot.from_dict(valid_snapshot_dict)
    block = format_grounding_block(snapshot)

    assert "REVISION 1" in block
    assert "Lat -89.5°, Lon 0.0°" in block
    assert "Azimuth 317.07°" in block
    assert "Elevation 3.13°" in block
    assert "Direct Solar Power: 395.6 W" in block
    assert "Estimated Energy: 1582.4 Wh" in block
    assert "Status: PASSES_CONFIGURED_LIMITS" in block
    assert "Route Distance: 15.2 km" in block
    assert "Max Slope: 12.5°" in block
    assert "State: SUFFICIENT_ENERGY" in block
    assert "Net Margin: +382.4 Wh" in block
    assert "Radio frequency link-budget" in block


def test_format_grounding_block_none_handled():
    block = format_grounding_block(None)
    assert "STATUS: PENDING" in block
    assert "Explain that specific numerical ephemerides" in block


def test_snapshot_with_communication_link(valid_snapshot_dict):
    valid_snapshot_dict["communicationLink"] = {
        "status": "available",
        "statusReason": "Direct RF link closed with +5.2 dB margin over Earth ground station (DSN 34m aperture).",
        "selectedPath": "direct",
        "evaluatedAt": "2028-01-15T12:00:00Z",
        "missionEpoch": "2028-01-15 12:00 UTC",
        "geometry": {
            "earthAzimuthDeg": 3.43,
            "earthElevationDeg": 4.5,
            "aboveGeometricHorizon": True,
        },
        "terrainLos": {
            "status": "clear",
            "obstructionAngleDeg": 1.0,
            "angularClearanceDeg": 3.5,
            "source": "LOLA Polar Topography Profile (100m/px)",
        },
        "rfLink": {
            "status": "pass",
            "transmitPowerW": 5.0,
            "receivedPowerDbm": -124.8,
            "pathLossDb": 211.0,
            "linkMarginDb": 5.2,
            "requiredMarginDb": 3.0,
        },
        "relay": {
            "configured": False,
            "evaluated": False,
            "available": None,
            "relayId": None,
        },
        "provenance": {
            "isStale": False,
        },
    }

    snapshot = LmpMissionContextSnapshot.from_dict(valid_snapshot_dict)
    assert snapshot.communicationLink is not None
    assert snapshot.communicationLink.status == "available"
    assert snapshot.communicationLink.selectedPath == "direct"
    assert snapshot.communicationLink.rfLink["linkMarginDb"] == 5.2

    block = format_grounding_block(snapshot)
    assert "6. Communication Link Analysis (Four-Layer Evaluation):" in block
    assert "Overall Status: AVAILABLE (Path: direct)" in block
    assert "Layer 1 (Geometry): Earth Elev 4.5°, Above Horizon: True" in block
    assert "Layer 2 (Terrain LOS): Status 'clear', Clearance: +3.50°" in block
    assert "Layer 3 (RF Link Budget): Status 'pass', Margin: +5.2 dB (req: 3.0 dB)" in block
    assert "Layer 4 (Relay Path): Configured: False" in block
