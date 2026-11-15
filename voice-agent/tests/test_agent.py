import os
from pathlib import Path
import pytest
from dotenv import load_dotenv

# Ensure environment is loaded from voice-agent/.env
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

from agent import SISAssistant, SIS_AGENT_NAME, GEMINI_MODEL


def test_sis_agent_configuration():
    """Verify SIS agent name, model, and environment setup."""
    assert SIS_AGENT_NAME == "lmp-sis-agent"
    assert "gemini" in GEMINI_MODEL.lower()
    assert os.getenv("LIVEKIT_URL", "").startswith("wss://")
    assert len(os.getenv("LIVEKIT_API_KEY", "")) > 0
    assert len(os.getenv("LIVEKIT_API_SECRET", "")) > 0
    assert len(os.getenv("GOOGLE_API_KEY", "")) > 0


def test_sis_assistant_instantiation():
    """Verify SIS assistant can instantiate with Gemini LLM and correct lunar prompt."""
    assistant = SISAssistant()
    assert assistant is not None
    # Verify lunar domain instructions are configured
    assert "Lunar Mission Planner" in assistant.instructions
    assert "plain" in assistant.instructions.lower()
