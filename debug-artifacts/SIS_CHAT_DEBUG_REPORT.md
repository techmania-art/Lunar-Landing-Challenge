# SIS Chat Agent No Reply — Debug & Verification Report

**Document type:** Diagnostic and Verification Report  
**Issue ID:** `SIS-CHAT-027`  
**Phase:** Phase 26 (LiveKit SIS Agent Integration & Chat Dispatch)  
**Date:** 2026-11-15  
**Status:** `VERIFIED FIXED`

---

## 1. Confirmed Root Causes

1. **False "Connected" Status Badge Masking Missing Worker:**
   - In `@livekit/components-react`, `session.isConnected` only indicates that the client WebRTC connection to the LiveKit Cloud room has been established.
   - It did **not** verify that the Python agent worker was online or had joined the room.
   - Consequently, when the Python worker was stopped, the UI displayed a green "Connected" badge while the user message sat in the room with no agent listening.

2. **Windows Native VAD Stub `NoneType` Crash:**
   - On Windows environments, `livekit-local-inference` sets `_NativeVAD = None`.
   - Passing `vad=inference.VAD(model="silero")` in `AgentSession` caused `livekit/agents/inference/vad.py` to call `None()`, triggering a fatal `TypeError: 'NoneType' object is not callable` in `_vad_task` as soon as the session started.

3. **Room Connection Deadlock (Call Ordering):**
   - In `voice-agent/src/agent.py`, `await session.start(room=ctx.room)` was invoked before `await ctx.connect()`.
   - In LiveKit Agents 1.8.x, `session.start` requires the room to be connected; calling `ctx.connect()` after resulted in a 10-second deadlock warning (`"The room connection was not established within 10 seconds after calling job_entry. This might mean that job_ctx.connect() was never invoked"`).

4. **Keyterm Detection 10.0s Timeout:**
   - Configuring `keyterm_detection={"enabled": True}` in `STTContextOptions` triggered an external keyterm detection pass that timed out after 10.0 seconds on every turn, blocking LLM generation.

5. **Client `useSession` Cold Start Timeout:**
   - The default `agentConnectTimeoutMilliseconds` in `useSession` is 20,000ms. If initial worker startup and room join took longer, the agent was prematurely marked as failed (`agent.state = "failed"`).

6. **Suggested-Question Chips State Clutter:**
   - Suggested question chips persisted during active conversation, cluttering the message history.

---

## 2. Files Changed & Targeted Fixes

### 1. `lunar-mission-planner/voice-agent/src/agent.py`
- **Immediate Room Connection:** Inverted start sequence so `await ctx.connect()` is called before `await session.start(room=ctx.room)`.
- **Safe VAD Fallback:**
  ```python
  has_native_vad = getattr(local_inference, "VAD", None) is not None
  vad_instance = inference.VAD(model="silero") if has_native_vad else None
  ```
- **Removed Keyterm Timeout:** Kept domain `keyterms=[...]` but removed `keyterm_detection={"enabled": True}`.
- **Structured Observability:** Configured `room_io.TextInputOptions(text_input_cb=on_text_input)` with logging for correlation ID, room name, participant identity, input preview, and Gemini turn generation lifecycle.

### 2. `lunar-mission-planner/components/sis/sis-chat-panel.tsx`
- **Truthful Status Hierarchy:**
  - `Disconnected`: `session.connectionState === "disconnected"`
  - `Connecting...`: `session.connectionState === "connecting" || agent.state === "connecting"`
  - `Waiting for Agent...`: `session.isConnected && !agent.isConnected`
  - `Agent Ready`: `session.isConnected && agent.isConnected && agent.state !== "thinking" && agent.state !== "speaking"`
  - `Listening...`: `agent.state === "listening" || (isMicActive && !isMicMuted)`
  - `Thinking...`: `agent.state === "thinking"`
  - `Speaking...`: `agent.state === "speaking"`
  - `Agent Unavailable`: `sessionError || agent.state === "failed"`
- **Extended Timeout:** Added `agentConnectTimeoutMilliseconds: 60000` to `useSession`.
- **Suggested Question Wiring:** Updated `handlePromptClick(prompt)` to invoke `handleSendMessage(prompt)`, and rendered chips strictly when `displayMessages.length === 0`.

### 3. `lunar-mission-planner/tests/sis-assistant.test.tsx`
- Added comprehensive unit tests for truthful status badge states and suggested chip send invocation.

### 4. `lunar-mission-planner/scripts/verify_livekit_e2e.js`
- Added Chromium WebRTC media stream flags (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`) to allow reliable automated headless execution.

---

## 3. Commands Used

```powershell
# 1. Start Python worker in voice-agent
cd "lunar-mission-planner\voice-agent"
.\.venv\Scripts\python src/agent.py dev

# 2. Run automated Playwright E2E chat verification
cd "lunar-mission-planner"
node scripts/verify_livekit_e2e.js

# 3. Run frontend test suite
npm test

# 4. Run TypeScript check & linter
npm run typecheck
npm run lint

# 5. Run Python pytest suite
cd "lunar-mission-planner\voice-agent"
.\.venv\Scripts\python -m pytest tests/
```

---

## 4. Worker Logs Summary

```text
2026-11-15 07:13:36,121 - INFO livekit.agents - starting worker {"version": "1.8.12", "rtc-version": "1.2.1"}
2026-11-15 07:13:36,121 - INFO livekit.agents - plugin registered {"plugin": "livekit.plugins.google", "version": "1.8.12"}
2026-11-15 07:13:36,445 - INFO livekit.agents - registered worker {"agent_name": "lmp-sis-agent", "deployment": "", "id": "AW_ThmsDQAFHYJo", "url": "wss://nasa-search-engine-p6azzhac.livekit.cloud", "region": "India South", "protocol": 19}
```

When client connected and prompt was submitted:
```text
[BROWSER CONSOLE] info connected to Livekit Server edition: 1, version: 1.13.11, protocol: 19, region: India South
[T+1s] Connecting...
[T+2s] User message sent: "What does this mean for the rover?" -> Header: Listening...
[T+3s] Header: Thinking...
[T+4s] Agent stream started: "I can only..." -> Header: Speaking...
[T+13s] Full Gemini response completed -> Header: Listening...
```

---

## 5. Browser & Gemini Response Evidence

- **User Prompt:** `"What does this mean for the rover?"`
- **Real Agent Response Streamed:**
  > *"I can only assist with lunar mission planning, landing site selection, and rover traverses. If you have questions about lunar terrain or communication lines, let me know."*
- **Visual Artifacts:**
  - `phase-26-sis-empty-state.png`: Clean empty state with truthful status and 4 suggested question chips.
  - `phase-26-sis-real-conversation.png`: Active chat showing user bubble and streamed assistant bubble, with suggested chips automatically hidden.
  - `phase-26-sis-minimized.png`: Floating status pill reflecting active session state.

---

## 6. Automated Tests Run & Verification Results

| Test Suite | Result | Scope |
|---|---|---|
| Vitest (`npm test`) | 119/119 PASSED (14 test files) | Frontend components, math, coordinates, Horizons, SIS panel |
| Pytest (`pytest tests/`) | 12/12 PASSED (3 test files) | Voice agent, system prompts, guardrails, dispatch |
| TypeScript (`npm run typecheck`) | 0 ERRORS | Full strict typing across Next.js 16 app |
| ESLint (`npm run lint`) | 0 ERRORS, 0 WARNINGS | Code quality and formatting compliance |
| Playwright E2E (`verify_livekit_e2e.js`) | SUCCESS (true) | Real LiveKit Cloud room round-trip and Gemini response |

---

## 7. Remaining Limitations

1. **In-Room Session Persistence:**
   LiveKit Cloud WebRTC chat messages reside in the transient room session. Refreshing the browser initiates a new room session; persistent cross-session chat history requires an external database if desired in future phases.
2. **Windows Local Inference VAD:**
   On Windows, native Silero VAD compilation is bypassed due to missing native wheels in `livekit-local-inference`; audio turns rely on energy/WebRTC VAD and text turns operate natively.

