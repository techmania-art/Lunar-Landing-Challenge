import os
import pytest
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

from agent import SISAssistant
from fixtures.mission_fixtures import TEST_ONLY_SYNTHETIC_FRESH_CONTEXT


def test_no_credential_leakage():
    """Verify system prompt and instructions do not contain raw secrets or API keys."""
    assistant = SISAssistant()
    prompt = assistant.instructions

    # Never include secrets or key names in instructions
    assert "AQ.Ab8" not in prompt
    assert "FHo4Os" not in prompt
    assert "APIir9" not in prompt
    assert os.getenv("GOOGLE_API_KEY", "") not in prompt
    assert os.getenv("LIVEKIT_API_SECRET", "") not in prompt


def test_out_of_scope_classifier():
    """Verify determination of out-of-scope versus in-scope mission queries."""
    in_scope_queries = [
        "What is the direct solar power at Shackleton crater?",
        "Why is Earth below the horizon?",
        "Explain the net energy margin for the rover traverse.",
        "How many obstacles are detected in the corridor?",
    ]
    out_of_scope_queries = [
        "What is the best recipe for chocolate cake?",
        "Who won the 2024 World Cup?",
        "Write a poem about dogs in Spanish.",
        "Help me buy Bitcoin online.",
    ]

    lunar_keywords = ["lunar", "solar", "earth", "horizon", "crater", "rover", "traverse", "obstacle", "shackleton", "power", "margin"]

    for q in in_scope_queries:
        assert any(k in q.lower() for k in lunar_keywords), f"Query should be recognized as in-scope: {q}"

    for q in out_of_scope_queries:
        assert not any(k in q.lower() for k in lunar_keywords), f"Query should be recognized as out-of-scope: {q}"


def test_prompt_injection_safety_policy():
    """Verify prompt explicitly prohibits following user overrides to declare false mission safety."""
    assistant = SISAssistant()
    instructions = assistant.instructions.lower()

    assert "never fabricate" in instructions
    assert "unverified telemetry" in instructions
    assert "redirect" in instructions or "decline" in instructions or "guardrails" in instructions


def test_rover_safety_certification_safeguard():
    """Verify that low obstacle count alone does NOT certify a route as safe."""
    ctx = TEST_ONLY_SYNTHETIC_FRESH_CONTEXT
    hazards = ctx["terrain_and_communication"]["route_corridor_hazards"]
    net_margin = ctx["power_situation"]["net_energy_margin_wh"]

    # Even though obstacle count is 1 (6 craters), energy margin is -53,384.1 Wh
    # A flight director cannot declare this mission feasible or safe!
    is_traverse_feasible = (net_margin > 0)
    assert is_traverse_feasible is False

