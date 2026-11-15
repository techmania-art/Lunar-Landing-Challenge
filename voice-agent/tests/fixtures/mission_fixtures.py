"""
Synthetic test fixtures for Lunar Mission Planner (LMP) SIS Voice Agent.
Marked: TEST_ONLY_SYNTHETIC.
Adheres strictly to the actual LMP result types:
- Power Situation (Solar power, energy budget, rover consumption)
- Terrain & Communication (NASA JPL Horizons Earth/Sun angles, LOLA DEM obstruction)
- Rover Configuration & Traverse Feasibility
"""

from typing import Any, Dict

TEST_ONLY_SYNTHETIC_FRESH_CONTEXT: Dict[str, Any] = {
    "context_id": "ctx-synthetic-shackleton-001",
    "analysis_run_id": "run-synthetic-20280115-01",
    "schema_version": "1.0",
    "is_stale": False,
    "timestamp_utc": "2028-01-15T12:00:00Z",
    "site": {
        "latitude_deg": -89.50,
        "longitude_deg": 0.00,
        "location_name": "Shackleton Crater Ridge (Connecting Ridge)",
    },
    "power_situation": {
        "direct_solar_power_w": 395.6,
        "total_solar_energy_wh": 1582.6,
        "modeled_duration_hours": 4.0,
        "panel_area_m2": 1.20,
        "panel_efficiency_percent": 28.5,
        "rover_consumption_wh": 48214.5,
        "net_energy_margin_wh": -53384.1,
        "feasibility_state": "INSUFFICIENT_ENERGY",
        "explanation": "Projected battery level falls below required reserve before traverse completes.",
    },
    "terrain_and_communication": {
        "geometric_visibility": "Below reference horizon",
        "earth_elevation_deg": -6.78,
        "earth_azimuth_deg": 352.99,
        "ephemeris_source": "NASA JPL Horizons (Target 399)",
        "terrain_obstruction": "Blocked by Lunar Curvature",
        "route_corridor_hazards": "1 obstacle (6 craters detected)",
        "dem_source": "LOLA Polar DEM (100m/px)",
    },
    "rover_config": {
        "drive_power_w": 75.0,
        "idle_power_w": 20.0,
        "drive_speed_kmh": 0.5,
        "route_distance_km": 321.4,
    },
}

TEST_ONLY_SYNTHETIC_STALE_CONTEXT: Dict[str, Any] = {
    **TEST_ONLY_SYNTHETIC_FRESH_CONTEXT,
    "context_id": "ctx-synthetic-shackleton-stale",
    "is_stale": True,
    "timestamp_utc": "2026-05-10T08:00:00Z",
}

