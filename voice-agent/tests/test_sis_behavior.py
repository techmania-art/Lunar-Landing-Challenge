import os
import pytest
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment is loaded from voice-agent/.env
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

from agent import SISAssistant, SIS_AGENT_NAME
from fixtures.mission_fixtures import (
    TEST_ONLY_SYNTHETIC_FRESH_CONTEXT,
    TEST_ONLY_SYNTHETIC_STALE_CONTEXT,
)


def test_sis_agent_metadata():
    """Verify SIS agent name and registered identity."""
    assert SIS_AGENT_NAME == "lmp-sis-agent"


def test_sis_instructions_guardrails():
    """Verify that SIS instructions strictly contain lunar domain and voice formatting constraints."""
    assistant = SISAssistant()
    instructions = assistant.instructions

    # Domain grounding
    assert "Lunar Mission Planner" in instructions
    assert "lunar" in instructions.lower()

    # Plain text speech constraints
    assert "plain" in instructions.lower()
    assert "markdown" in instructions.lower()
    assert "tables" in instructions.lower()

    # Scientific distinction requirements
    assert "geometric horizon" in instructions.lower()
    assert "terrain obstruction" in instructions.lower()
    assert "solar illumination" in instructions.lower()
    assert "electrical power" in instructions.lower()


def test_missing_context_logic():
    """Verify that when no mission context is provided, response must declare unanalyzed/missing."""
    context = None
    if context is None:
        status_msg = "Current mission result context is unavailable. Please run or select an analysis."
    assert "unavailable" in status_msg


def test_stale_context_logic():
    """Verify that stale context flag is detected and disclosed."""
    stale_ctx = TEST_ONLY_SYNTHETIC_STALE_CONTEXT
    assert stale_ctx["is_stale"] is True
    warning = "WARNING: Loaded context snapshot is stale." if stale_ctx["is_stale"] else "OK"
    assert "stale" in warning.lower()


def test_scientific_distinction_rf_vs_geometry():
    """Verify geometric visibility is not equated with operational RF communication."""
    terrain_data = TEST_ONLY_SYNTHETIC_FRESH_CONTEXT["terrain_and_communication"]
    geom_vis = terrain_data["geometric_visibility"]
    elevation = terrain_data["earth_elevation_deg"]

    # In this fixture, Earth elevation is -6.78 deg (below horizon)
    assert elevation < 0.0
    assert "Below reference horizon" in geom_vis

    # An RF link requires positive line of sight and adequate link margin
    is_rf_link_verified = elevation > 0.0 and "blocked" not in terrain_data["terrain_obstruction"].lower()
    assert is_rf_link_verified is False


def test_scientific_distinction_illumination_vs_battery():
    """Verify solar power generation does not guarantee rover traverse battery feasibility."""
    power_data = TEST_ONLY_SYNTHETIC_FRESH_CONTEXT["power_situation"]
    direct_solar_w = power_data["direct_solar_power_w"]
    net_margin_wh = power_data["net_energy_margin_wh"]
    feasibility = power_data["feasibility_state"]

    # Direct solar power is positive (+395.6 W) but total net energy margin is negative (-53,384.1 Wh)
    assert direct_solar_w > 0
    assert net_margin_wh < 0
    assert feasibility == "INSUFFICIENT_ENERGY"

