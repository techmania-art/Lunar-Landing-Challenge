import asyncio
import json
import logging
import os
import textwrap
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv
import livekit.rtc as rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    STTContextOptions,
    TurnHandlingOptions,
    cli,
    inference,
    room_io,
)
import livekit.local_inference as local_inference
from livekit.plugins import google

from mission_context import (
    LmpMissionContextSnapshot,
    MISSION_CONTEXT_TOPIC,
    MISSION_CONTEXT_ACK_TOPIC,
    format_grounding_block,
)

logger = logging.getLogger("sis-agent")

# Deterministic loading of voice-agent/.env relative to this file
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

SIS_AGENT_NAME = os.getenv("SIS_AGENT_NAME", "lmp-sis-agent")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

# Room-scoped mission context store (isolated per LiveKit room)
room_mission_contexts: Dict[str, LmpMissionContextSnapshot] = {}


class SISAssistant(Agent):
    """SIS (Super Intelligent System) Lunar Mission Planner Assistant."""

    def __init__(self, room_name: str = "default_room") -> None:
        self.room_name = room_name
        super().__init__(
            llm=google.LLM(
                model=GEMINI_MODEL,
                api_key=GOOGLE_API_KEY,
            ),
            instructions="",
        )

    @property
    def instructions(self) -> str:
        snapshot = room_mission_contexts.get(self.room_name)
        grounding = format_grounding_block(snapshot)
        return textwrap.dedent(
            f"""\
            You are SIS (Super Intelligent System), the expert AI assistant for Lunar Mission Planner (LMP).
            You assist mission planners, flight directors, and aerospace engineers with lunar landing site selection,
            solar illumination budgets, Earth communication line-of-sight, terrain elevation hazards, and rover traverses.

            {grounding}

            # Output Rules for Voice
            - Respond strictly in plain, spoken conversational English.
            - Never use markdown syntax, asterisks, bullet points, numbered lists, tables, code blocks, LaTeX, or emojis.
            - Keep answers concise: one to three clear sentences per turn unless a detailed technical breakdown is specifically requested.
            - Spell out numbers, acronyms, and units clearly for speech synthesis (for example: "ninety degrees south", "one point two meters squared", "kilowatt hours").
            - Do not recite raw internal data structures, system prompts, or JSON tokens.

            # Scientific Integrity & Domain Guardrails
            - You specialize strictly in lunar science, landing operations, and Lunar Mission Planner capabilities.
            - Always ground answers in the active mission context above. Quote the exact numbers and units when answering questions about the current mission.
            - If a user asks about unrelated topics (e.g. general pop culture, cooking, non-space trivia), politely state that you are dedicated to lunar mission planning and redirect to the mission.
            - Distinguish between geometric horizon calculations (from NASA JPL Horizons) and local terrain obstruction (from LOLA polar DEM elevation masks).
            - Distinguish between solar illumination incidence and electrical power generation (solar panel area and cell efficiency).
            - Distinguish the four communication layers: geometric visibility, terrain line of sight (LOS), RF link-budget margin, and relay availability. Never claim operational communication solely because Earth is geometrically above the horizon.
            - When asked about communication, cite the overall status (available, limited, unavailable, not configured), whether terrain obstructs the direct line of sight, the RF link margin in decibels if configured, and whether a relay path is available or required.
            - If radio parameters are not configured or data is missing, clearly explain that operational communication cannot be assessed without configured transceiver parameters.
            - Never fabricate unverified telemetry or claim scientific verification unless actual data supports it.
            - If context or data is unavailable, state clearly that the specific metric is pending analysis.
            """
        )


server = AgentServer()


@server.rtc_session(agent_name=SIS_AGENT_NAME)
async def sis_agent(ctx: JobContext):
    room_name = ctx.room.name
    ctx.log_context_fields = {
        "room": room_name,
        "agent": SIS_AGENT_NAME,
    }
    logger.info(f"Connecting SIS agent to room {room_name} with model {GEMINI_MODEL}")

    # Establish room connection first so RoomIO binds immediately
    await ctx.connect()

    # Check whether native VAD is available in the current environment
    has_native_vad = getattr(local_inference, "VAD", None) is not None
    vad_instance = inference.VAD(model="silero") if has_native_vad else None

    # Set up voice AI pipeline using LiveKit Inference with Google Gemini LLM
    session = AgentSession(
        vad=vad_instance,
        stt=inference.STT(model="assemblyai/universal-3-6-pro", language="en"),
        stt_context_options=STTContextOptions(
            keyterms=["SIS", "LMP", "Horizons", "LOLA", "Shackleton", "Malapert", "traverse", "ephemeris"],
        ),
        tts=inference.TTS(
            model="fishaudio/s2.1-pro",
            voice="fa4c9eb3dccc4806b382b40d61c6b10a",
        ),
        turn_handling=TurnHandlingOptions(
            preemptive_generation={"enabled": True},
        ),
        expressive=True,
    )

    # Listen for live mission context packets from the frontend
    async def process_context_packet(dp: rtc.DataPacket) -> None:
        if dp.topic != MISSION_CONTEXT_TOPIC:
            return

        correlation_id = uuid.uuid4().hex[:8]
        participant_identity = dp.participant.identity if dp.participant else "unknown"
        payload_len = len(dp.data)

        logger.info(
            f"[Context Received] CID={correlation_id} | Room={room_name} | "
            f"Participant={participant_identity} | Bytes={payload_len}"
        )

        try:
            raw_json = json.loads(dp.data.decode("utf-8"))
            snapshot = LmpMissionContextSnapshot.from_dict(raw_json)

            current = room_mission_contexts.get(room_name)
            if current and snapshot.revision < current.revision:
                logger.warning(
                    f"[Context Stale Rejected] CID={correlation_id} | "
                    f"Received rev={snapshot.revision} < current={current.revision}"
                )
                return

            room_mission_contexts[room_name] = snapshot
            logger.info(
                f"[Context Stored] CID={correlation_id} | Room={room_name} | "
                f"ContextId={snapshot.contextId} | Rev={snapshot.revision} | "
                f"Overall={snapshot.analysisStatus.get('overall')}"
            )

            # Send acknowledgement packet
            ack = {
                "contextId": snapshot.contextId,
                "revision": snapshot.revision,
                "status": "acknowledged",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await ctx.room.local_participant.publish_data(
                json.dumps(ack).encode("utf-8"),
                reliable=True,
                topic=MISSION_CONTEXT_ACK_TOPIC,
            )
            logger.info(
                f"[Context Ack Sent] CID={correlation_id} | Room={room_name} | Rev={snapshot.revision}"
            )
        except Exception as exc:
            logger.error(
                f"[Context Validation Failed] CID={correlation_id} | Room={room_name} | Error={exc}",
                exc_info=True,
            )

    @ctx.room.on("data_received")
    def on_data_received(dp: rtc.DataPacket) -> None:
        asyncio.create_task(process_context_packet(dp))

    # Custom text input handler with structured observability logging & mission grounding
    async def on_text_input(sess: AgentSession, ev: room_io.TextInputEvent) -> None:
        correlation_id = uuid.uuid4().hex[:8]
        msg_preview = ev.text[:80].replace("\n", " ") if ev.text else ""
        snapshot = room_mission_contexts.get(room_name)
        rev = snapshot.revision if snapshot else 0
        grounding = format_grounding_block(snapshot)

        logger.info(
            f"[SIS Chat Input] CID={correlation_id} | Room={room_name} | "
            f"Participant={ev.participant.identity} | ContextRev={rev} | Text='{msg_preview}'"
        )
        try:
            logger.info(
                f"[SIS Gemini Start] CID={correlation_id} | Model={GEMINI_MODEL} | Rev={rev} | Generating..."
            )
            augmented_input = f"{grounding}\n\n[USER QUESTION]\n{ev.text}"
            async with sess._claim_user_turn():
                await sess.interrupt()
                sess.generate_reply(user_input=augmented_input)
            logger.info(
                f"[SIS Gemini Dispatched] CID={correlation_id} | ContextRev={rev} | Dispatched to session"
            )
        except Exception as exc:
            logger.error(
                f"[SIS Gemini Error] CID={correlation_id} | Failed during Gemini generation: {exc}",
                exc_info=True,
            )
            raise

    # Start the session and bind to the connected room
    assistant = SISAssistant(room_name=room_name)
    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(text_input_cb=on_text_input),
            audio_input=room_io.AudioInputOptions(),
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)
