# SIS Chat Has No Agent Reply — Focused Debug Context

## Symptom

The SIS panel shows a user message (for example, “What does this mean for the rover?”) and a green **Connected** indicator, but no assistant response appears. The suggested-question chips remain visible and the conversation does not advance.

## Evidence supplied

The Next.js terminal shows:

```text
POST /api/sis/livekit/token 200
POST /api/horizons 200
GET /workspace?... 200
```

These entries establish that the Next.js page/API requests completed and the token endpoint returned HTTP 200. They do **not** establish that:

- the Python LiveKit worker is running or registered;
- the worker was dispatched into the user's room;
- the worker received the text message;
- the Gemini request succeeded;
- the agent published a response/transcript;
- the SIS React component subscribed to and rendered that response.

The screenshot displays a user bubble without an assistant bubble. Treat the green badge as unverified until its implementation is checked: a room/client connection is not the same as an agent being available and responding.

## Primary diagnostic hypothesis

The browser may have joined LiveKit and obtained a token successfully, while the Python worker is stopped, registered against a different LiveKit project/deployment, or not dispatched to the room. A second likely issue is that the UI publishes text but the Python session's `lk.chat` input path is disabled or not configured. A third possibility is that the agent receives the message but Gemini or transcript rendering fails.

Do not assume one cause before collecting evidence.

## Required investigation order

### 1. Inspect the actual runtime and configuration

- Inspect the existing `voice-agent` Python project, its entrypoint, `pyproject.toml`, lockfile, `.env`/`.env.local` loading code, and agent name.
- Inspect the main LMP token route at `/api/sis/livekit/token`, the client `useSession`/`TokenSource` setup, and the SIS component's send/transcript hooks.
- Do not create a second agent, duplicate token endpoint, or separate replacement chatbot.
- Do not expose, print, screenshot, or commit API keys/secrets.
- Verify that the Next.js process and Python worker use the same LiveKit project values (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`). A successful Next.js token request does not prove the separate Python process loaded its own credentials.
- Verify which environment filename the Python entrypoint actually loads. Do not assume `.env` and `.env.local` are interchangeable. Ensure `GOOGLE_API_KEY` is available to the Python worker process, not merely to Next.js.

### 2. Prove the Python worker is running and registered

- Start the existing Python agent in a separate terminal from the `voice-agent` directory using the command documented by that repository, for example:

```powershell
uv run src/agent.py dev
```

- If the LiveKit CLI is installed and the project supports entrypoint auto-detection, use verbose development mode:

```powershell
lk agent dev --log-level DEBUG
```

- Do not run two copies of the same worker simultaneously.
- Capture startup output and confirm successful registration with the intended LiveKit project/deployment.
- Keep this terminal open while testing the browser UI. The Next.js terminal and Python worker terminal are separate processes with separate logs.
- If no worker registration is visible, fix startup, dependency, environment, or LiveKit credential problems before investigating React rendering.

### 3. Verify agent dispatch and room identity

- Confirm the token endpoint returns a valid token for the same LiveKit project used by the worker.
- Confirm the user participant and agent are joining the same room.
- Inspect the dispatch configuration. If using an explicit agent name, it must exactly match the Python `@server.rtc_session(agent_name="...")` registration and the frontend/token dispatch configuration. If using automatic dispatch, do not accidentally require an explicit name.
- Check the LiveKit Agent Console/room participants to verify that an agent participant actually joins the room.
- The UI must distinguish at least: disconnected, connecting, room connected/agent waiting, agent connected/listening, agent thinking, and error. Do not show “Connected” as proof that Gemini has answered.

### 4. Verify the LiveKit text-chat path

- Inspect the React send function. For standard LiveKit Agents text chat, the frontend sends text through the LiveKit chat API on topic `lk.chat` (the current `@livekit/components-react` `useChat().send()` hook is a supported route when used inside the correct session/room context).
- Verify the SIS composer invokes the real LiveKit `send()` operation and awaits/catches its result. Do not only append a local bubble to React state.
- Inspect the Python `AgentSession.start(..., room_options=room_io.RoomOptions(...))` configuration. Ensure `text_input` has not been disabled (`text_input=False`). Explicitly enable it where appropriate for the installed LiveKit Agents version.
- By default, LiveKit Agents monitors the `lk.chat` topic and generates a response to incoming text. If the project uses a custom `TextInputOptions` handler, verify that it actually forwards the received text to the active `AgentSession` and triggers a response. Do not register a custom handler that consumes the message without responding.
- Add temporary structured debug logs at the receive boundary: room name, message received (redact sensitive mission content if needed), and correlation ID. Never log credentials.

### 5. Verify Gemini response generation

- Add structured logs around the LLM request lifecycle: input accepted, Gemini request started, response completed, and exception/timeout.
- Confirm the worker process can read `GOOGLE_API_KEY` and uses the configured Gemini model/plugin.
- Check for missing key, invalid key, model-not-found, quota/rate-limit, network, timeout, and incompatible plugin/version errors.
- Do not put `GOOGLE_API_KEY` in `NEXT_PUBLIC_*`, browser code, local storage, or the client bundle.
- Do not convert an LLM error into a fabricated SIS answer. Surface a truthful recoverable error in the panel and log the exception server-side with secrets redacted.

### 6. Verify assistant output is published and rendered

- After Gemini returns, confirm the LiveKit agent publishes its text/transcription output to the room/session using the installed LiveKit Agents version's standard behavior.
- Inspect the exact hook used by the SIS transcript. The GitHub starter's transcript view reads session messages through `useSessionMessages(session)`; its composer sends via `useChat().send()`. Confirm both hooks are inside the same intended `SessionProvider`/`AgentSessionProvider` and connected room session.
- Confirm the transcript component receives updated messages after the agent speaks/responds. Do not maintain separate unsynchronized fake-message state and LiveKit message state.
- Ensure the transcript handles both user and agent messages, stable message IDs, partial/final transcription updates, empty states, and errors.
- If the agent's audio is playing but no text bubble appears, isolate the transcript-publication/subscription problem from the LLM/voice problem. Do not assume TTS playback implies text transcript delivery.

### 7. Test in layers

1. **Worker-only text test:** use the LiveKit Agent Console in text mode or the current LiveKit agent debugger. Confirm a prompt produces a real Gemini response without the React UI.
2. **Browser text test:** open SIS, send one short question, confirm the Python worker receives it, Gemini completes, and the assistant response appears in the same chat panel.
3. **Browser voice test:** grant microphone permission, speak one question, confirm STT transcript, agent processing, TTS playback, and transcript update.
4. **Failure test:** stop the worker and verify the UI changes to an accurate waiting/disconnected/error state rather than remaining falsely “Connected.”
5. **Refresh/reconnect test:** verify session cleanup/reconnection and make clear that LiveKit in-room message history is not automatically durable across page refreshes. Do not claim persistence unless it is implemented.

## Expected evidence before declaring fixed

Capture logs from both terminals and a browser screenshot. A successful text turn should show, in order:

1. Python worker started and registered.
2. Agent dispatched/joined the same room as the user.
3. User text received through the LiveKit chat input path.
4. Gemini generation started and completed successfully.
5. Agent response/transcript published.
6. SIS transcript rendered the assistant response.

The browser must show the actual assistant answer beneath the user message, not a hardcoded sample. Suggested-question chips must invoke the same real send path as the composer.

## Deliverables

- Fix the confirmed root cause with the smallest targeted changes.
- Preserve the adapted LiveKit starter UI inside the existing LMP SIS panel. Do not replace it with a new chat implementation.
- Preserve the current panel styling, LMP workspace, map, analysis/results pages, backgrounds, and existing mission/RAG architecture.
- Remove any static “Connected” state if it is not driven by actual LiveKit/session state.
- Add or update automated tests for message dispatch, error handling, and transcript updates.
- Create `SIS_CHAT_DEBUG_REPORT.md` containing: confirmed root cause, files changed, commands used, worker logs summary, browser/network evidence, Gemini response evidence, tests run, and remaining limitations.
- Do not report success unless a real user prompt produces a real agent response visible in the SIS panel.

## Official references

- LiveKit text input and `lk.chat` topic: https://docs.livekit.io/agents/multimodality/text/
- LiveKit agent development and debug mode: https://docs.livekit.io/reference/developer-tools/livekit-cli/agent/
- LiveKit session input options: https://docs.livekit.io/agents/logic/sessions/
- React `useChat`: https://docs.livekit.io/reference/components/react/hook/usechat/
- React `useSessionMessages`: https://docs.livekit.io/reference/components/react/hook/usesessionmessages/
- LiveKit agent debugger guidance: https://docs.livekit.io/testing/overview/
