# Phase 26 — Connect the LiveKit SIS Agent to the LMP SIS UI and Remove Dummy Data
## Implementation Context, Integration Plan, Debug Specification, and Acceptance Criteria

## 1. Objective

Connect the **existing SIS Assistant panel on the main Lunar Mission Planner (LMP) Analysis page** to the already-created **Python LiveKit SIS agent** so users can interact with the real agent through both text and voice.

This phase must also remove all dummy/preview conversation content and replace decorative controls or fake status indicators with real session behavior.

The result must be one functioning SIS experience inside the existing LMP interface:

- Text typed into the current SIS composer reaches the Python LiveKit agent.
- The real agent response appears in the existing SIS message area.
- Microphone input reaches the same agent session.
- Spoken user input is transcribed and shown in the same message history.
- The agent's generated response is shown in that history and its TTS audio is played to the user.
- Text and voice use the same agent, conversation, mission-context policy, Gemini model configuration, and RAG service path.
- All displayed connection, listening, thinking, speaking, loading, and error states come from actual runtime state.
- No seeded sample messages, mock assistant replies, pretend connection statuses, or fake timestamps remain in the user-facing SIS conversation.

**Do not redesign the SIS panel.** Preserve the existing approved warm cream/off-white panel, SIS launcher placement, message-bubble styling, and Analysis workspace composition. This is a functional integration and data-cleanup phase, not a visual redesign.

---

## 2. Context from previous phases

Use these project files as the relevant implementation references. Inspect their current repository equivalents before editing:

1. `phase-22-sis-analysis-page-ui-implementation-context.md` — the existing SIS launcher and cream chat-panel UI. It intentionally implemented UI-only behavior and included a preview conversation that must now be removed.
2. `phase-24-revised-gemini-livekit-sis-agent-and-frontend-setup.md` — the Python LiveKit worker, Gemini Developer API configuration, LiveKit credentials, downloaded React starter, agent registration name, and separate frontend test harness.
3. `phase-25-livekit-sis-voice-agent-testing-and-output-evaluation.md` — existing behavioral tests and LMP-specific quality criteria. Preserve and rerun the relevant test suite after integration.
4. `phase-19-sis-results-context-llm-livekit.md` — the intended mission-context source, RAG integration, conversation continuity, context versioning, and shared text/voice behavior.

### Provider configuration to preserve

- LLM: Google Gemini Developer API through the LiveKit Python Google plugin.
- Environment variable: `GOOGLE_API_KEY` in `voice-agent/.env` only.
- Current selected model/configuration: retain the value already established in the active `voice-agent/.env` / agent source and Phase 24. Do not change models during this phase.
- STT/TTS: retain the currently working LiveKit Inference configuration unless a concrete integration defect requires a separately approved change.
- Agent dispatch name: use the exact value already registered by the Python worker; Phase 24 specifies `lmp-sis-agent` as `SIS_AGENT_NAME`.
- LiveKit Cloud URL/key/secret must match between the worker and the server-side token generator.

Do not reintroduce Cerebras settings or replace the selected Gemini provider.

---

## 3. Critical architecture decision: integrate into the main LMP app

The main LMP app is Next.js 16, TypeScript, Tailwind, and shadcn/ui. The user-facing SIS panel already exists in this application.

The separate `voice-agent/frontend/` React starter created in Phase 24 is a **standalone integration/test harness**, not the production location of the SIS panel. Do not iframe it, embed its entire Next.js application, reverse-proxy it into the Analysis page, or create a second visible SIS interface.

### Required architecture

```text
Main LMP Next.js 16 application
  Analysis page
    Existing SIS launcher and warm cream panel
      Existing message list and composer
      Actual connection / microphone / speaker controls
      LiveKit React session adapter
            |
            | same-origin authenticated POST for session token
            v
      LMP server-side token endpoint
        - validates current application user/session
        - validates selected mission context reference
        - creates a short-lived LiveKit token
        - restricts dispatch to lmp-sis-agent
            |
            | WebRTC + LiveKit data/text streams
            v
      LiveKit Cloud room
            |
            v
      Python SIS Agent (voice-agent/)
        - Gemini LLM
        - STT / TTS
        - same SIS scope and grounding policy
        - current mission context resolver
        - existing LMP RAG/backend integration
```

Use the separate React starter as the implementation reference for correct LiveKit frontend patterns. Reuse only the small, compatible session/auth/chat/audio pieces that are needed. Keep the existing LMP SIS panel as the one user-facing UI.

### Package/version rule

Before installing or changing anything in the main LMP app:

1. Inspect the LMP root `package.json`, lockfile, Next.js version, React version, and existing LiveKit packages.
2. Inspect the resolved packages in `voice-agent/frontend/package.json` and its lockfile.
3. Check current official compatibility for `@livekit/components-react` and `livekit-client` with the LMP host app.
4. Install only the compatible package(s) actually needed by the main app, using its existing package manager and lockfile.
5. Do not copy the React starter's full `package.json` or lockfile into the LMP root.
6. Do not downgrade the main app from Next.js 16 or replace existing app dependencies indiscriminately.
7. Reuse the existing starter only as a source/reference for session lifecycle, transcript, audio and agent-state handling.

If the required LiveKit components package is incompatible with the host app, use the supported lower-level `livekit-client` APIs or a compatible package release. Do not force a dependency conflict to make the starter code compile.

---

## 4. Inspect the current implementation before changing it

Start at the LMP repository root. Review Git status and inspect:

### Existing SIS UI

- Analysis page and navigation component where the SIS launcher is mounted.
- SIS panel, message list, composer, microphone and speaker controls.
- The actual message type/interface and current mock-message arrays.
- Any `UI preview`, `mockMessages`, `sampleMessages`, `demoConversation`, `fakeAssistantReply`, hardcoded timestamp, simulated typing, or fake status logic.
- Current component state and whether the panel is mounted persistently or conditionally unmounted when closed.

### LiveKit integration already created in Phase 24

- `voice-agent/src/agent.py` or the actual worker entrypoint.
- Python `AgentServer`, agent registration/decorator, `AgentSession`, `room_io.RoomOptions`, text-input configuration, microphone/audio setup, Gemini plugin, STT/TTS selection, and `SIS_AGENT_NAME`.
- `voice-agent/.env.example` (read variable names only; never print secret values).
- `voice-agent/frontend/app/page.tsx`, `app/api/token/route.ts`, session provider and transcript components as references.
- Existing token routes, LiveKit SDK dependencies, application authentication, server-side API clients and RAG/context endpoints.
- Phase 25 test suite and latest `TESTING_REPORT.md` if it exists.

### Git safety

- Record initial `git status --short`.
- Do not discard or overwrite uncommitted work.
- Make the smallest scoped changes needed.
- Record all modified files at the end.

If Phase 24 has not produced a working worker or Phase 25 testing shows it is failing to connect, stop and report the precise prerequisite blocker. Do not conceal a broken agent by putting fake data back into the SIS panel.

---

## 5. LiveKit session integration in the existing SIS panel

Use the currently supported LiveKit React session APIs appropriate for the packages resolved in the LMP host application.

The preferred approach is:

- Create one LiveKit session for the active SIS conversation.
- Use an endpoint-backed `TokenSource` for the host LMP app's token route.
- Supply the exact SIS agent name (`lmp-sis-agent`, or the actual registered name read from the Python worker) in the supported agent-session options/dispatch flow.
- Use the session provider required by the installed LiveKit UI components.
- Use the LiveKit session-message API for typed chat and speech transcripts.
- Use the session's real agent state and local/remote audio tracks to drive the UI.

Official API patterns to inspect and follow for the installed version:

- `useSession(...)` and `session.start()` / `session.end()` for session lifecycle.
- `TokenSource.endpoint(...)` for the LMP server-side endpoint.
- `useSessionMessages(session)` for unified session messages and its `send(...)` action.
- `useAgent(...)` or the current session state API for actual connection/listening/thinking/speaking state.
- `AgentSessionProvider` / `SessionProvider` and `AgentChatTranscript` where compatible, or render the same session message data inside the existing custom message bubbles.

Do not start an unrelated second room/session for text and voice. The typed composer and microphone must use the **same active session**.

### Session lifecycle behavior

1. Opening the SIS panel must not fabricate a connection state and must not request microphone permission by itself.
2. The panel may begin in a real `Disconnected` state.
3. The first text submission may establish a text-capable agent session, then send the message after the session is ready.
4. The microphone control must establish/reuse that same session and request microphone access only after the user explicitly clicks the microphone/start-voice control.
5. Do not automatically enable the microphone on page load or merely because the panel is opened.
6. Keep the session controller/provider mounted in a stable Analysis-page location so closing or minimizing the visual panel does not silently create duplicate sessions or destroy the active conversation.
7. Closing/minimizing the panel hides the UI only. It must not unexpectedly disconnect an active conversation.
8. Provide an explicit **End session / Disconnect** action. Ending the session must stop microphone capture and audio playback and clean up the LiveKit room/session.
9. When the Analysis page genuinely unmounts, clean up the session and release media resources.
10. Prevent multiple session starts from rapid clicks. Track a pending start, handle errors, and disable duplicate actions while connecting.

### No unsolicited opening message

Inspect the Python starter for any startup greeting such as `session.generate_reply(...)` immediately after connection. Remove the default unsolicited greeting for this SIS integration unless the product explicitly requires a live introduction. Connecting to the agent must not create an unrequested assistant bubble. The assistant should respond to an actual user text or audio turn.

---

## 6. Connect the text composer to the real agent

The current SIS composer must stop using local preview behavior and send text to the active LiveKit session.

### Required behavior

- When the user clicks Send or presses Enter, submit the text through the LiveKit session-message/text-input pathway supported by the installed SDK.
- Use the documented LiveKit chat topic (`lk.chat`) / session message API; do not send a fake message into local React state and then manufacture a response.
- Disable Send for an empty/whitespace-only draft, while connecting, or while a send is already pending where required.
- Clear the draft only after the send has been accepted; on error, preserve the draft so the user can retry.
- Display the user's message from the real session message/transcript event. Avoid duplicate bubbles caused by both an optimistic local message and a second LiveKit event.
- Render the actual agent reply when received through the session transcript/message stream.
- Render LiveKit's real thinking/composing state while waiting. Do not fake a timer-based typing indicator.
- Preserve Markdown rendering only if the existing message renderer safely supports it; sanitize or use a vetted renderer. Do not allow arbitrary HTML execution.
- Display a concise connection/API error when a send fails. Do not substitute a canned answer.

### Python worker text support

Inspect `AgentSession` / `room_io.RoomOptions` in the installed LiveKit Agents version.

- Confirm text input is enabled (do not set `text_input=False`).
- Confirm incoming frontend text is handled on LiveKit's `lk.chat` text-input pathway.
- Verify the worker can generate an agent response from typed text without requiring microphone input.
- Keep the same Gemini model, system instructions, scope guard, context resolver and RAG service path used by voice turns.
- If the current agent overrides text input behavior, verify that it still calls the same SIS backend logic and does not create a weaker direct-Gemini-only text route.

LiveKit Agents 1.x documents automatic incoming text input on the `lk.chat` text stream. If the currently pinned version behaves differently, follow that installed version's official documentation and record the exact implementation used. Do not assume a legacy chat-data-channel API.

---

## 7. Connect microphone, voice transcription, and speaker output

Replace the current microphone and speaker placeholders with real controls.

### Microphone control

- Use the active session's local microphone track/control.
- Ask for browser microphone permission only after an explicit user action.
- Show real states: `Microphone off`, `Requesting permission`, `Listening`, `Muted`, or a specific permission/device error.
- A microphone permission denial must not break text chat.
- Provide a mute/stop-microphone action that stops publishing audio without necessarily ending the text session.
- Do not claim the agent is listening if the local microphone is disabled or no audio track is published.

### Speech-to-text and transcript

- Show the actual user speech transcript received from LiveKit.
- Display the agent's actual generated transcript.
- Keep typed messages, speech transcripts and agent answers in chronological order within the same session history.
- Do not separately create a second conversation feed for voice.
- Deduplicate transcript/message events using stable IDs/stream metadata where exposed by the SDK; do not rely solely on message text equality because a user may intentionally repeat a phrase.

### Speaker / text-to-speech output

- Render and play the actual remote audio track published by the agent.
- Use the current LiveKit audio rendering/provider component where available, or the supported remote-track attachment mechanism.
- Handle browser autoplay restrictions with a genuine user-activated `Start audio` affordance when required.
- A speaker toggle must actually mute/unmute the remote output or change its volume; it cannot be decorative.
- Show `Speaking` only while the agent's actual state indicates speech output.
- If text transcript arrives but remote audio fails, show the response text and a truthful audio-output error; do not mark voice output as successful.

### Audio turn behavior

- Verify interruption/barge-in, end-of-turn detection, and turn-taking using the existing Phase 25 test scenarios.
- Do not tune STT/TTS models or provider settings in this phase unless a confirmed defect blocks the integration. Any provider change must be separately recorded and tested.

---

## 8. Server-side token endpoint and agent dispatch

The main LMP application must not expose LiveKit API credentials or mint tokens in client code.

### Token endpoint

Create or reuse a same-origin server-side route in the main LMP app, for example:

```text
POST /api/sis/livekit/token
```

The route name is illustrative; follow existing LMP route conventions and reuse an existing secure token route if it already exists.

Use the current LiveKit **standard endpoint TokenSource contract** for the installed SDK version. The standard request can include `room_name`, `participant_identity`, `participant_name`, `room_config`, and permitted metadata/attributes. The standard successful response contains:

```json
{
  "server_url": "wss://...",
  "participant_token": "..."
}
```

Return the expected success status and content type documented by the current LiveKit SDK. Use the `room_config` supplied by the SDK for agent dispatch, but validate it server-side and restrict dispatch to the intended SIS agent. Do not allow the browser to request an arbitrary agent or room dispatch target.

### Security requirements

- Use the LMP application's existing authentication/session mechanism. If no authentication system exists, document that limitation and keep the endpoint explicitly local-development-only; do not claim production security.
- Derive participant identity from the authenticated user/session when possible; otherwise create a unique non-guessable session-scoped identity.
- Generate an isolated room name per SIS conversation/session. Never use one fixed shared room for every user or mission.
- Enforce the intended `lmp-sis-agent` dispatch name in server code.
- Give the participant only the required room grants (join, publish audio/data as needed, subscribe). Do not grant administrative room or participant management permissions.
- Use a short-lived token and the standard room-configuration dispatch mechanism for the installed SDK.
- Validate request size and allowed fields. Reject unexpected or malformed fields.
- Apply CSRF/origin protections in line with the app's auth architecture.
- Keep `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` in server-only environment variables.
- Never place `GOOGLE_API_KEY`, LiveKit API secrets, internal RAG keys or worker credentials in `NEXT_PUBLIC_*`, browser props, `participant_metadata`, room metadata, logs, or client responses.
- Do not reuse the unauthenticated development token route from the standalone React starter as a production route.

### Context reference in token/session initialization

The agent must use the correct current LMP mission context, not a browser-created fake context.

- Build or select the current `ResultContext` using the actual typed mission result state/source defined by the LMP application and Phase 19.
- Validate the context belongs to the authenticated user/project and the current `analysisRunId`.
- Pass only a minimal **opaque context reference**, context version, and conversation/session correlation ID through a supported secure job/session metadata mechanism.
- Never pass the full mission result, user secrets, RAG API key, or private backend credentials in client-controlled room metadata.
- The Python worker must resolve the opaque reference through the trusted LMP backend using server-to-server authentication, or use another already-implemented secure context handoff discovered in the repository.
- Tie the resolved context to the conversation/session ID, analysis run ID, schema version and freshness marker.
- Refresh or reject context when a new analysis run completes. Detect stale/partial/missing/error states.
- If the existing LMP application does not yet expose a secure context endpoint or the Phase 19 typed context implementation, do not invent its schema or fake mission values. Make the LiveKit connection work only for general supported SIS explanations if safe, show `Mission context unavailable` as a real status, and report the missing context integration as a blocker/partial completion.

The worker's RAG request must use the actual existing API route, authentication method and request/response contract discovered in the repository. Do not invent endpoint URLs, field names or API keys.

---

## 9. Remove all dummy/preview data from the SIS UI

This is a mandatory part of the phase, not optional cleanup.

Search the actual SIS UI and remove:

- Hard-coded demo/preview user messages.
- Hard-coded fake assistant answers.
- `mockMessages`, `sampleMessages`, `previewMessages`, `demoConversation`, `fakeResponses`, stubbed chat arrays, test-only message fixtures and local canned replies used by the live page.
- Fake timestamps, fabricated conversation IDs and invented user identities.
- Fake `UI preview`, `Connected`, `Ready`, `Listening`, `Thinking`, `Speaking` or `AI online` labels that are not derived from actual runtime state.
- Timer-driven simulated typing indicators.
- Placeholder microphone/speaker handlers that show a false success state.
- Hard-coded current mission coordinates, terrain measurements, energy figures, citations or rover status used only to make the panel look populated.
- Default agent greeting generated solely because a session connected, unless deliberately required and explicitly treated as a real agent event.
- Silent fallback to the LiveKit homepage agent or any default/demo backend.

### What may remain

- Static non-conversational empty-state instruction copy, such as `Ask SIS about your current lunar mission analysis`.
- A neutral disconnected state when there is truly no active session.
- Suggested prompt chips only if they are clearly prompts (not prior messages) and either derive from the currently available mission fields or are generic LMP help prompts. Clicking a chip should populate the composer; it must not insert a fake response.
- User-facing explanatory copy about microphone permissions, connection errors, or missing mission context.
- A minimal real system event such as `Session connected` only when backed by the actual event, if the design needs it. Do not render status events as fake assistant responses.

### Conversation empty state

When there are no real messages in the current session:

- Show the empty-state instruction and available real mission-context indicator.
- Do not seed an assistant bubble.
- Do not replay an old hardcoded sample exchange.
- Do not invent prior conversation history.

If a real session-history persistence service exists in the LMP backend, load only history for the authenticated user and matching conversation/context identity. If no persistence service exists, show only the current LiveKit session's actual messages and document that refresh/session end clears the history. Do not claim conversation persistence that is not implemented.

---

## 10. Real status and error-state mapping

Drive all SIS status indicators from LiveKit/session/backend state rather than local hard-coded booleans that can drift from reality.

Suggested mapping (adapt to the installed SDK's actual state names):

| UI label | Source of truth |
|---|---|
| Disconnected | No active LiveKit session / session ended |
| Connecting | Session start is pending |
| Connected | LiveKit connection established and the intended SIS agent participant is confirmed |
| Listening | Agent state indicates listening; microphone is actually enabled for voice input |
| Thinking | Agent state indicates processing/thinking |
| Speaking | Agent state or active remote audio indicates speech output |
| Muted | Local microphone track is disabled |
| Microphone permission denied | Browser permission/device API returned the relevant error |
| Reconnecting | Actual connection state indicates reconnection |
| Failed | LiveKit/session failure event or a terminal connection error |
| Mission context unavailable | Trusted context resolver confirms no usable context |
| Mission context stale | Context freshness/version check confirms stale context |

Do not display `Connected` merely because the session start request returned. Verify the room is connected and the intended `lmp-sis-agent` participant has joined (or use the SDK's supported linked-agent state).

Display user-friendly errors and preserve the user's message draft when an error occurs. Avoid exposing raw tokens, stack traces, internal URLs, or secret-bearing response bodies.

---

## 11. Conversation, history, and text/voice consistency

- One user-visible SIS conversation must correspond to one active LiveKit room/session and one conversation identifier.
- Typed input and voice input must go through the same agent pipeline and conversation context.
- Agent replies must appear once as assistant messages, even if both transcript and data-message events are received.
- Voice transcript and typed messages must be visibly distinguishable only if useful (e.g. small microphone/text labels), without creating duplicate bubbles.
- Preserve message order using actual event timestamps/sequence IDs exposed by the SDK.
- If the LMP RAG backend has a conversation history contract, use it and preserve its conversation ID. Otherwise keep history session-scoped and make that limitation clear.
- If the selected mission site, timestamp, analysis run or result version changes while the panel is open, invalidate/refresh the context according to Phase 19. Do not silently attach an old result snapshot to a new question.
- Do not merge messages between different users, rooms, or mission contexts.

---

## 12. SIS UI design preservation

Use the existing Phase 22 visual reference and current application components.

Preserve:

- Existing top navigation and far-right SIS launcher placement.
- Existing warm cream/off-white panel, width, radius, shadow, header design, message bubble styles and typography.
- Existing three-column Mission Input / Lunar Map / Mission Analysis workspace.
- Existing dark space background and page behavior.
- Existing responsive behavior and accessible interaction patterns.

Only alter the SIS panel internals as needed to bind its controls to real data/session state. Do not redesign or reposition the panel. Avoid global styles and unrelated page edits.

Update the header's status label from the Phase 22 preview label to the real state model described in Section 10. Preserve a truthful state when disconnected or when the agent is unavailable.

---

## 13. Implementation sequence

Follow this sequence and keep each step small and verifiable:

1. Inspect Git state, Phase 22 SIS code, Phase 24 Python worker/frontend setup, Phase 25 test results, current app auth, context builder and RAG service.
2. Identify the real Python worker entrypoint, agent name, LiveKit dependency versions, current Gemini model and supported STT/TTS setup. Confirm the worker starts independently before host-UI integration.
3. Verify the worker accepts text on the `lk.chat` input path and can respond to typed text without microphone input. Keep text input enabled in `RoomOptions`.
4. Confirm the existing worker's voice input and TTS path still pass the Phase 25 baseline before changing the host SIS UI.
5. Inspect and install only compatible LiveKit frontend dependencies in the main LMP app; preserve its Next.js 16 and React versions.
6. Implement/reuse the secure same-origin token endpoint with the current LiveKit standard TokenSource contract and intended agent dispatch.
7. Implement the single LiveKit session controller/provider at a stable Analysis-page scope.
8. Connect the existing message composer to the real session text-message API.
9. Connect the microphone and remote speaker audio to the same session.
10. Render actual session messages, live transcripts, agent states, errors and mission-context status in the existing SIS UI.
11. Remove all preview/mock messages, fake replies, fake statuses, placeholder voice handlers, fabricated metadata and homepage-agent fallback from the user-facing SIS path.
12. Connect the trusted mission-context reference and existing RAG/backend contract if those are present and verified. If not present, report the exact missing server contract; do not invent it.
13. Add or update tests for text-only, voice, disconnect, context freshness, error handling, and duplicate message suppression.
14. Run the full Phase 25 agent test suite and the main LMP lint/typecheck/test/build checks.
15. Run the application in a browser and verify the complete user journey, including actual mic permission and audible TTS where hardware/browser support permits.
16. Produce the completion report and evidence described below.

---

## 14. Required end-to-end test scenarios

Use the current Phase 25 test suite and add integration cases for at least the following:

### A. Remove dummy content

- Fresh page load shows no sample user/assistant conversation.
- Empty state appears only as instructional UI copy.
- No fake timestamp, fake conversation ID or demo mission values appear.
- Header reports `Disconnected` until a real session is established.

### B. Text-only interaction

1. Open the SIS panel.
2. Type a real question such as `What can you help me analyze in the Lunar Mission Planner?`.
3. Send it without granting microphone permission.
4. Verify one real user message appears.
5. Verify the Python `lmp-sis-agent` receives it on the `lk.chat` text-input path.
6. Verify Gemini/RAG produces a real response.
7. Verify the actual assistant response appears once in the message list.
8. Verify no microphone permission prompt is triggered by text-only chat.

### C. Voice interaction

1. Click the real microphone control.
2. Grant browser permission.
3. Speak a test question.
4. Verify the agent receives and processes the actual speech transcript.
5. Verify the user transcript appears in the same conversation history.
6. Verify the agent answer appears as text and is played as remote TTS audio.
7. Verify the UI state transitions match actual agent state.

### D. Mixed text and voice in one conversation

1. Send a typed question.
2. Ask a follow-up question by voice.
3. Ask a further follow-up by text.
4. Verify one chronological conversation, one session and one context version are used.
5. Confirm the agent can refer to prior turns appropriately.

### E. Microphone permission denied

- Deny permission or simulate no microphone device.
- Verify a clear microphone error is shown.
- Verify text-only chat still works when the session is otherwise connected.
- Do not show `Listening` when microphone is unavailable.

### F. Disconnect/reconnect

- Disconnect using the explicit control.
- Confirm the room/session ends and mic capture stops.
- Confirm the status becomes `Disconnected`.
- Reconnect and verify a fresh, valid session is created.
- Confirm no duplicate session is left in the room.

### G. Wrong agent / homepage-agent protection

- Test with missing agent dispatch configuration and with an incorrect configured name.
- The UI must show a clear setup/connection error.
- It must never silently connect to LiveKit's homepage agent or another demo agent.
- A successful connection counts only when the expected SIS agent is present.

### H. Mission context grounding

- Use a `TEST_ONLY_SYNTHETIC` context fixture that matches the real typed schema, if available.
- Ask for a mission value explicitly present in the fixture; the answer must match its exact value and units.
- Ask for a missing value; SIS must say it is unavailable, not invent a number.
- Mark the fixture stale; SIS must identify the context as stale.
- Change the analysis run while the SIS panel is open; the next turn must refresh/reject the old context as specified by Phase 19.
- Confirm the same scope, RAG source path and evidence policy apply to text and voice.

### I. Real answer vs audio output

For a voice turn compare:

1. Intended spoken user input.
2. STT transcript received by the agent.
3. Actual agent/Gemini/RAG response text.
4. Frontend transcript content.
5. Audible TTS output.

Record whether they match. Do not call the audio round trip successful merely because the text bubble appeared.

### J. Regression

- Mission Input unchanged.
- Lunar Map unchanged.
- Mission Analysis unchanged.
- Results page unchanged.
- Existing backgrounds and navigation unchanged.
- No duplicate SIS launcher or second chat interface.

---

## 15. Acceptance checklist

### Actual agent connection

- [ ] Existing main LMP SIS panel connects to the Python SIS worker.
- [ ] Correct agent dispatch name is validated.
- [ ] No silent homepage-agent fallback exists in the host LMP path.
- [ ] One session is used for text and voice.
- [ ] Session lifecycle is stable across panel open/minimize/close.

### Real text chat

- [ ] Typed text is sent via the supported LiveKit chat/session-message pathway.
- [ ] Worker receives typed text with microphone disabled.
- [ ] Actual agent response is displayed exactly once.
- [ ] Errors preserve the user's draft and show a truthful state.

### Real voice

- [ ] Microphone permission is user-initiated.
- [ ] Local mic track can be enabled, muted and stopped.
- [ ] User speech transcript appears in the same message list.
- [ ] Agent response transcript appears in the same message list.
- [ ] Actual remote TTS audio is audible.
- [ ] Speaker mute/audio-playback handling works.
- [ ] Listening/thinking/speaking UI states match actual SDK states.

### Mission context and RAG

- [ ] Current context is built from actual LMP state, not hardcoded data.
- [ ] Context reference belongs to the current authorized user/project.
- [ ] Context version and freshness are attached to the conversation.
- [ ] Python worker uses the existing LMP RAG/backend contract.
- [ ] Missing/stale/partial context is handled honestly.
- [ ] Text and voice share the same SIS policy and response path.

### Dummy-data removal

- [ ] No seeded mock messages remain in the live SIS panel.
- [ ] No fake assistant replies or sample mission values remain.
- [ ] No fake connection, microphone, speaker, typing or speaking status remains.
- [ ] No static fake timestamps or conversation IDs remain.
- [ ] No default homepage-agent fallback remains.
- [ ] Empty state is instructional only and contains no conversation bubble.
- [ ] Suggested prompts, if present, do not fabricate replies or data.

### Security and quality

- [ ] LiveKit secrets and Gemini key are server/worker-only.
- [ ] Token endpoint is authenticated or explicitly local-development-only.
- [ ] Tokens are scoped, short-lived and tied to the intended agent/session.
- [ ] Full mission context is not blindly trusted from browser metadata.
- [ ] Logs and screenshots contain no credentials/tokens.
- [ ] Phase 25 test suite is rerun.
- [ ] Lint, typecheck, automated tests and production build pass, or failures are documented.
- [ ] Browser verification confirms the actual user journey.

### UI and regression

- [ ] Approved SIS cream-panel design is preserved.
- [ ] Existing Analysis workspace is unchanged outside the integration boundary.
- [ ] Mobile and desktop layouts remain usable.
- [ ] Accessibility labels, keyboard actions, focus and audio controls are verified.

---

## 16. Required completion report

The coding agent must provide a factual implementation report with:

1. Exact files created, modified and removed.
2. Which mock/preview arrays, bubbles, placeholder controls and fallback paths were removed.
3. The exact LMP component where the LiveKit session is mounted.
4. LiveKit package versions installed in the main LMP app and compatibility check performed.
5. Token endpoint route, authentication method, token scope and agent-dispatch validation approach (do not reveal secret values).
6. Exact worker agent name confirmed at runtime.
7. How typed messages are delivered and how the Python worker handles `lk.chat` text input.
8. How mic input, user transcription, agent transcript and TTS output are connected.
9. How the current mission context is resolved and how its version/freshness are enforced.
10. Whether the existing RAG API is actually connected; include the real route/contract name only if it exists in the repository and do not include credentials.
11. Text-only round-trip result.
12. Voice round-trip result, including whether actual audible TTS was confirmed.
13. Mixed text/voice conversation result.
14. Microphone-denied, reconnect, wrong-agent and stale-context test results.
15. Phase 25 suite, lint, typecheck, tests and build results.
16. Browser screenshots showing the empty state and real conversation after user input. Do not include fake/sample conversations.
17. Any external prerequisites or blocked items, with exact reasons.
18. Confirmation that Mission Input, Lunar Map, Mission Analysis, Results and backgrounds were not unintentionally changed.

Do not claim a test passed unless the corresponding worker, server, browser, audio output, or automated test was actually run. If microphone/audio cannot be tested in the current environment, report it as **not verified**, not passed.

---

## 17. Official technical references

Use the current documentation matching the actual installed SDK versions:

- LiveKit frontend session lifecycle: https://docs.livekit.io/frontends/build/sessions/
- LiveKit standard token endpoint and TokenSource: https://docs.livekit.io/frontends/build/authentication/endpoint/
- LiveKit frontend authentication: https://docs.livekit.io/frontends/build/authentication/
- LiveKit agent chat and transcript components: https://docs.livekit.io/frontends/agents-ui/chat/
- LiveKit agent state: https://docs.livekit.io/frontends/build/agent-state/
- LiveKit Python text input and transcriptions: https://docs.livekit.io/agents/multimodality/text/
- LiveKit Python agent sessions: https://docs.livekit.io/agents/logic/sessions/
- LiveKit session-message React hooks/reference: https://docs.livekit.io/reference/components/react/hook/usesessionmessages/
- SIS mission context design: `phase-19-sis-results-context-llm-livekit.md`
- SIS UI design: `phase-22-sis-analysis-page-ui-implementation-context.md`
- Gemini/worker configuration: `phase-24-revised-gemini-livekit-sis-agent-and-frontend-setup.md`
- Test scenarios and output rubric: `phase-25-livekit-sis-voice-agent-testing-and-output-evaluation.md`

The official LiveKit docs describe a shared session message list for typed chat and speech transcriptions, with a session-message send method; the Python agent receives incoming text on the `lk.chat` topic when text input is enabled. Use the exact APIs supported by the installed version and verify the behavior end to end.

---

## Final instruction to the coding agent

Connect the **existing SIS panel in the main LMP Analysis page** directly to the already-built Gemini-powered Python LiveKit agent. Use one authenticated, server-issued LiveKit session for both text and voice. Send typed messages through the LiveKit chat/session-message pathway, enable real microphone capture only after a user action, render actual speech transcripts and assistant responses in the same conversation, and play actual agent TTS audio. Use the current trusted LMP mission context and existing RAG/backend service if their real contracts are present. Remove every hardcoded preview conversation, fake response, dummy mission value, pretend status, placeholder mic/speaker handler and homepage-agent fallback from the user-facing SIS UI. Keep the approved cream SIS panel and all other LMP workspace features unchanged. Test real text and voice round trips, report every unverified item honestly, and provide a file-by-file completion report.
