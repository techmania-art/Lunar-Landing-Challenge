# Phase 26 — Rework the SIS Chatbot UI Using the Official LiveKit React Starter
## Git Pull, UI Adaptation, LiveKit Connection, Setup and Debug Specification

> **This document supersedes the previous Phase 26 instruction to build the SIS/LiveKit frontend integration by composing a new UI from scratch.** The implementation must reuse and adapt the actual frontend UI source from the specified GitHub repository. Do not create a second custom chat interface when the starter already provides the required transcript, message input, microphone controls, session controls and audio components.

---

## 1. Objective

Use the official LiveKit React starter frontend as the source of the SIS chatbot interaction UI, then rework that UI so it fits inside the existing **SIS Assistant panel on the LMP Analysis page**.

The coding agent must:

1. Pull/verify the frontend source from the Git repository specified below.
2. Inspect the starter's existing UI components and dependency graph.
3. Reuse and adapt those components in the main LMP application.
4. Connect the reworked SIS interface to the already-configured Python LiveKit SIS agent using the Gemini API setup from Phase 24.
5. Remove all dummy/sample conversation data and replace placeholder controls with the actual starter components bound to a live session.
6. Debug the complete text and voice interaction path and provide evidence-based results.

**Do not implement the chat interface from scratch.** Reuse the source components and patterns from the starter. Only write glue code, project-specific styling, the SIS shell integration and any minimal adapters required to connect the starter components to the existing LMP app.

---

## 2. Source repository and verified baseline

**Required repository:**

```text
https://github.com/livekit-examples/agent-starter-react.git
```

**Verified baseline at the time this context was prepared:**

- Default branch: `main`
- Inspected commit: `9e1fc2f40fd7ceaccbe4a872b21765b49eefea80`
- Repository license: MIT
- Node engine in the inspected `package.json`: `24.x`
- Package manager: `pnpm@9.15.9`
- Starter Next.js version: `15.5.27`
- React version range: `^19.0.0`
- `@livekit/components-react`: `^2.9.24`
- `livekit-client`: `^2.22.2`
- `livekit-server-sdk`: `^2.18.0`

Before implementing, check the repository's current `main` HEAD and compare it with the inspected SHA. Use the inspected SHA as the reproducible reference baseline. If upstream has advanced, inspect the diff and deliberately decide whether to adopt a newer commit; do not silently copy a moving target. Record the commit actually used in the implementation report.

### 2.1 Source checkout location

The previous Phase 24 setup specifies the starter checkout at:

```text
voice-agent/frontend/
```

Inspect this directory first. If the clone is already present and is the correct repository, reuse it. Do not clone a second copy or overwrite local changes.

If it is absent, clone it:

```bash
git clone https://github.com/livekit-examples/agent-starter-react.git voice-agent/frontend
```

Then inspect its state and remote:

```bash
cd voice-agent/frontend
git remote -v
git status --short
git rev-parse HEAD
```

Fetch and inspect the selected upstream commit. Before checking out or switching commits, preserve any uncommitted changes. Never use `git reset --hard`, `git clean -fd`, or overwrite an existing working tree as a shortcut.

Install the starter's dependencies only inside its own directory when needed for reference/testing:

```bash
cd voice-agent/frontend
pnpm install --frozen-lockfile
```

Keep the Python agent at `voice-agent/` and the standalone starter checkout at `voice-agent/frontend/`. Do not merge the starter's package manifest or lockfile into the Python project.

---

## 3. Required architecture: adapt the starter UI into the existing SIS panel

The main LMP application is the actual product UI. It uses Next.js 16, TypeScript, Tailwind and shadcn/ui. The existing SIS launcher and warm cream/off-white chat panel already exist on the Analysis page.

The standalone React starter is the **source of frontend UI components and LiveKit interaction patterns**. Its Next.js application is not to be embedded as a second application.

### Correct architecture

```text
Main LMP Next.js 16 application
  Analysis page
    Existing SIS launcher
      Existing SIS panel shell (keep its placement and overall dimensions)
        Adapted LiveKit starter transcript UI
        Adapted LiveKit starter input/control UI
        Real SIS connection/status UI
        Real microphone and speaker/audio playback controls
               |
               | LiveKit React session APIs from the starter
               v
        Main LMP server-side token endpoint
               |
               | authenticated, short-lived token + explicit SIS dispatch
               v
        LiveKit Cloud room
               |
               v
        Existing Python SIS worker in voice-agent/
          Gemini LLM (GOOGLE_API_KEY on worker only)
          Existing STT/TTS configuration
          Existing SIS scope and grounding instructions
          Existing LMP mission-context resolver and RAG route
```

### Important boundaries

- Keep the existing LMP SIS launcher, panel mount point and Analysis page integration.
- Rework the **inside of the SIS panel** using the starter's components and visual patterns.
- Do not iframe `voice-agent/frontend`.
- Do not proxy the standalone starter route into the main app.
- Do not run a second Next.js frontend as a separate product UI.
- Do not replace the main LMP Next.js 16 app with the starter's Next.js 15 app.
- Do not copy the starter's root `app/`, `next.config`, global theme, global CSS reset, or full package manifest into the LMP app.
- Do not keep two different chat interfaces visible to the user.
- Do not create a bespoke transcript, message composer, microphone toggle or disconnect control if the corresponding starter component can be reused and adapted.

---

## 4. Starter UI components that must be evaluated and reused

Inspect these exact files in `voice-agent/frontend/` at the selected commit. The following paths were confirmed in the repository tree when this file was prepared.

### Core components to reuse

| Starter source | Purpose in the SIS interface |
|---|---|
| `components/agents-ui/agent-session-provider.tsx` | Wraps the session provider and `RoomAudioRenderer` so remote agent audio is played. |
| `components/agents-ui/agent-chat-transcript.tsx` | Displays actual session messages, user/agent alignment, timestamps, safe Markdown rendering and thinking indicator. |
| `components/agents-ui/agent-control-bar.tsx` | Provides real microphone controls, chat input, send behavior and disconnect control through LiveKit hooks. |
| `components/agents-ui/agent-track-control.tsx` | Reusable device/track control used by the control bar. |
| `components/agents-ui/agent-track-toggle.tsx` | Reusable media track toggles. |
| `components/agents-ui/agent-disconnect-button.tsx` | Calls the actual session `end()` method. |
| `components/agents-ui/start-audio-button.tsx` | Handles browser autoplay restrictions through a real user action. |
| `components/agents-ui/agent-chat-indicator.tsx` | Reusable agent thinking/processing indicator. |
| `components/agents-ui/agent-audio-visualizer-bar.tsx` or `agent-audio-visualizer-wave.tsx` | Optional compact visual indication of actual agent audio activity. |
| `components/agents-ui/blocks/agent-session-view-01/` | Reference composition for how transcript, controls, visualizer and LiveKit state fit together. Adapt its relevant children; do not render its full-screen page unmodified inside the small SIS panel. |
| `components/app/app.tsx` | Reference for `TokenSource`, `useSession` and provider composition. Reuse the pattern, not the standalone page shell. |
| `components/app/view-controller.tsx` | Reference for `useAgent`, `useSessionContext` and session state. Reuse only the required state mapping. |

### UI dependencies to inspect and reuse where needed

The starter components depend on local shadcn-style components, hooks and helpers. Inspect the imports and copy the actual required dependency closure rather than rebuilding it by hand. Relevant paths include:

- `components/ui/bubble.tsx`
- `components/ui/marker.tsx`
- `components/ui/message.tsx`
- `components/ui/message-scroller.tsx`
- `components/ui/button.tsx`
- `components/ui/toggle.tsx`
- `hooks/agents-ui/use-agent-control-bar.ts`
- `lib/shadcn/utils.ts`

`AgentChatTranscript` uses `streamdown`. Check whether the main LMP app already has a safe Markdown renderer or compatible `streamdown` dependency. Reuse an existing safe renderer where possible; do not introduce an unsafe raw-HTML renderer.

`AgentControlBar` calls the LiveKit `useChat()` hook to send user text and uses the starter's actual track controls. Prefer it over a new local composer. Adapt labels, colors, sizing and layout to the LMP panel.

### Source attribution

- Keep the MIT license from the cloned repository.
- Add a third-party notice in the main LMP project if source files are copied into it.
- Do not remove copyright/license notices from copied source files.
- Preserve a mapping in the implementation report listing each adapted source component and its new destination.

---

## 5. How to adapt the starter UI to the existing SIS design

This is a **rework of existing starter UI**, not a blank-slate redesign.

### Preserve the LMP SIS shell

Keep:

- The existing SIS launcher at the far-right of the Analysis page top navigation.
- The existing panel placement, width, height, rounded corners and layered overlay behavior unless a specific responsive correction is required.
- The current warm cream/off-white SIS panel identity and typography direction.
- The existing LMP workspace behind the panel: Mission Input, Lunar Map and Mission Analysis.
- Existing page background, global design tokens, navigation and unrelated interactions.

### Replace the panel internals with adapted starter components

Use the following as the target composition:

1. **SIS header:** keep the current SIS title and close/minimize controls. Add a real session/agent state indicator driven by LiveKit session state.
2. **Transcript region:** use the starter's `AgentChatTranscript` and `useSessionMessages` data. Restyle its scroller and bubble surfaces to match the cream SIS panel. Do not feed sample arrays.
3. **Composer and controls:** use the starter's `AgentControlBar`/chat input and track control components. Adapt it to the existing panel width and control arrangement. Show only relevant controls: chat, microphone and leave/disconnect. Disable camera and screen sharing for the LMP SIS use case unless a documented SIS feature requires them.
4. **Thinking indicator:** retain the starter's real agent-state indicator; it must appear only when LiveKit reports the agent is thinking.
5. **Audio playback:** mount the starter's session provider with `RoomAudioRenderer`. Show `StartAudioButton` only when browser playback requires a user gesture.
6. **Optional compact visualizer:** if it improves the panel, adapt the starter's bar/wave visualizer using actual LiveKit audio track/state. It must not be a decorative animation that claims an inactive agent is speaking.

The full-screen starter view (`AgentSessionView_01`) can guide component layout and transitions, but **do not nest its full-screen call UI inside the cream panel**. Extract and recompose its underlying controls/transcript/provider components to fit the existing SIS container.

### Remove dummy data and preview behavior

Remove from the live SIS UI:

- Sample user and agent messages.
- Canned responses and fake agent output.
- Fake timestamps, user identities and conversation IDs.
- Fake `Ready`, `Connected`, `Listening`, `Thinking` or `Speaking` labels.
- Timer-based simulated typing/response delays.
- Placeholder microphone/speaker handlers.
- Default LiveKit homepage-agent fallback.

Static empty-state guidance is allowed, for example: `Ask SIS about your current lunar mission analysis.` Suggested prompts are allowed only as composer-fill shortcuts, never as fake messages or fabricated answers.

---

## 6. Keep the LMP host app and dependency graph separate

The inspected GitHub starter is a standalone Next.js 15.5.27 app, while the LMP host is Next.js 16. Do not transplant its dependency manifest or lockfile.

Before integrating components:

1. Inspect the main LMP root `package.json`, lockfile, package manager, TypeScript aliases and existing LiveKit dependencies.
2. Inspect the cloned starter's `package.json` and lockfile.
3. Check the installed versions and peer dependencies of `@livekit/components-react`, `livekit-client`, `livekit-server-sdk`, React and any other imported packages.
4. Add only the minimum required compatible dependencies to the LMP root, using the LMP app's own package manager and lockfile.
5. Reuse existing LMP dependencies when compatible.
6. Do not copy `voice-agent/frontend/node_modules` into the main LMP app.
7. Do not add `NEXT_PUBLIC_LIVEKIT_API_SECRET`, `NEXT_PUBLIC_GOOGLE_API_KEY` or any other client-side secret.
8. Run type checking after each integration step. Resolve version or import mismatches before adding more dependencies.

If a dependency in the current starter is incompatible with Next.js 16 or the host React version, use the closest supported compatible package version or adapt the imported component to the documented current API. Do not downgrade the host app or use `--force`/`--legacy-peer-deps` to hide incompatibilities without a documented, tested reason.

### Copy/adaptation approach

Recommended destination pattern (adjust to the existing LMP source layout):

```text
src/components/sis/livekit/
  sis-livekit-session-provider.tsx
  sis-livekit-transcript.tsx
  sis-livekit-controls.tsx
  starter-components/         # only if keeping source components grouped is useful
```

The destination names are illustrative. Inspect the actual repository structure and follow its existing naming and import conventions.

- Keep the original clone intact as the reference source.
- Copy/adapt the actual reusable component source into the main LMP application, or use another deliberate source-controlled approach that keeps the build reproducible.
- Update `@/` aliases and local imports to the main LMP project's structure.
- Do not create cross-project runtime imports that depend on the standalone app's build aliases, CSS or node_modules.
- Keep the changes small and traceable to starter source files.

---

## 7. LiveKit session wiring — use the starter's real session pattern

Use the starter's existing LiveKit React integration pattern instead of inventing a second session layer.

The starter's `components/app/app.tsx` demonstrates:

```tsx
const tokenSource = useMemo(
  () => TokenSource.endpoint(tokenEndpoint),
  [tokenEndpoint]
);
const session = useSession(tokenSource, { agentName });
```

The actual LMP implementation must use the exact signatures supported by the installed LMP dependency versions. The session provider must wrap the adapted transcript/control components:

```tsx
<AgentSessionProvider session={session}>
  {/* existing SIS header + adapted starter transcript/control UI */}
</AgentSessionProvider>
```

Use the official starter provider as the source for the combination of `SessionProvider` and `RoomAudioRenderer`.

### Lifecycle expectations

- Keep the session controller/provider in a stable Analysis-page location so panel visibility does not accidentally create duplicate rooms.
- Opening the panel must not automatically request microphone permission.
- Start a session only in response to a user action or the first deliberate message submission, following the selected session API's requirements.
- The microphone permission prompt must occur only after an explicit microphone action.
- Closing/minimizing the panel should hide the panel, not start a second session or silently terminate one. Follow existing LMP product behavior for whether a minimized active session remains connected.
- Provide a real end/disconnect control wired to `session.end()` via the starter's disconnect control.
- Prevent duplicate starts from repeated clicks.
- Release tracks/audio resources on explicit disconnect and when the Analysis page genuinely unmounts.
- If a connection fails, surface the actual error and let the user retry. Do not show a simulated successful state.

### One session for text and voice

Use one LiveKit session and one room for all turns in the current SIS conversation. The starter's `AgentControlBar` uses LiveKit's `useChat()` hook for typed messages. The transcript component reads the actual LiveKit session messages. The microphone control publishes to the same session. Do not create a separate text API conversation that bypasses the LiveKit worker, and do not create a second room for voice.

---

## 8. Server-side token endpoint and explicit agent dispatch

The main LMP application must provide the token endpoint used by `TokenSource.endpoint(...)`.

1. Inspect the existing LMP authentication and server route conventions.
2. Reuse an existing secure LiveKit token endpoint if one is already present and correct.
3. Otherwise create a same-origin route following the actual host app conventions, for example `POST /api/sis/livekit/token`.
4. Use server-side `livekit-server-sdk` to create a short-lived participant token.
5. Require the existing LMP auth/session where available. If the app has no auth system, explicitly mark the endpoint local-development-only; do not claim it is production safe.
6. Restrict the token/session to the intended SIS agent dispatch name confirmed from the Python worker. Phase 24 proposes `lmp-sis-agent`, but inspect the actual registered worker name before using it.
7. Validate incoming room/session configuration. Never allow the browser to select an arbitrary agent name or request administrative permissions.
8. Use minimum required grants: join, publish audio/data as required, and subscribe.
9. Set no-store caching and appropriate origin/CSRF protections.
10. Return the response shape expected by the installed `TokenSource.endpoint` implementation.

**Do not copy the starter's `app/api/token/route.ts` into production unchanged.** Its README explicitly identifies the sample route as development-only/unauthenticated. Do not use the starter's `LIVEKIT_TOKEN_SERVER_ID` homepage/dev setup for the production LMP panel.

### Secrets

- `GOOGLE_API_KEY` stays only in `voice-agent/.env` and is consumed by the Python agent.
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `LIVEKIT_URL` are server-side only in the main LMP environment/token endpoint and worker environment as required.
- Never place secrets in `NEXT_PUBLIC_*`, client props, browser storage, room metadata, transcript messages, screenshots or logs.
- Do not send the full LMP mission result to client-controlled room metadata. Use the secure context-reference workflow from Phase 19/24.

---

## 9. Python agent and Gemini setup — preserve existing working configuration

Do not reconfigure the Python agent provider in this phase.

- Keep Google Gemini as the LLM provider using the installed LiveKit Google plugin.
- Keep `GOOGLE_API_KEY` in `voice-agent/.env` only.
- Keep the model configured by the current Phase 24 implementation. Read the actual current value; do not invent or silently switch model IDs.
- Keep the already-selected STT and TTS configuration.
- Keep the existing SIS system instructions, out-of-scope guard and evidence/uncertainty requirements.
- Keep the existing LMP mission-context resolver and RAG API contract.
- Confirm that text sent by the starter's `useChat()` / `AgentControlBar` is received by the same Python `AgentSession` and follows the same Gemini/RAG/SIS policy as voice turns.
- Confirm the Python worker accepts text input on the installed LiveKit Agents version's supported chat/text-input pathway. If it does not, diagnose the SDK/version and worker setup; do not create a mock frontend answer as a workaround.

If the worker sends an unsolicited default greeting on session connect, remove it unless the SIS product explicitly requires it. An assistant message should appear because a real user turn or explicitly configured welcome event occurred, not because a preview bubble was seeded.

---

## 10. Mission context and RAG continuity

Use the existing Phase 19 mission-context design and current repository contract. Do not invent new schemas or endpoint URLs.

- Resolve the latest valid mission result context from trusted LMP server-side state.
- Tie the context to the current analysis run, mission/site selection, schema version and freshness marker.
- The browser must not be the authority for scientific mission values.
- Send only a minimal opaque context reference/correlation identifier through a validated session mechanism; the Python worker resolves it through the trusted backend.
- Preserve the RAG route and authentication contract already implemented.
- Text and voice turns must use the same context and grounding policy.
- Missing, stale, partial or failed context must be reported honestly. Do not invent coordinates, energy figures, terrain clearances, crater distances or communication status.

Do not make UI integration success contingent on inventing a context service that does not exist. If the context endpoint is missing, connect the LiveKit conversation only to the safe supported capabilities and report mission-context integration as a specific blocker.

---

## 11. Debug checklist — follow this order

Do not randomly change multiple layers at once. Capture the failing step and its evidence, then debug that layer.

### A. Repository and source setup

- [ ] `voice-agent/frontend` exists and its origin is `https://github.com/livekit-examples/agent-starter-react.git`.
- [ ] Its selected commit SHA is recorded.
- [ ] Existing local modifications are preserved.
- [ ] Starter dependencies install from its own lockfile.
- [ ] MIT license/attribution is retained.

**If the clone is missing:** clone only into the specified path. **If origin is wrong:** do not overwrite; report and resolve after protecting local changes. **If the checkout is dirty:** preserve the diff before switching revisions.

### B. Component import/build errors

- [ ] Trace the full import closure for `AgentChatTranscript`, `AgentControlBar`, provider and audio button.
- [ ] Copy/adapt every required local UI primitive/hook/helper from the starter instead of leaving broken `@/components/...` imports.
- [ ] Confirm the main LMP TypeScript path aliases.
- [ ] Confirm CSS classes and CSS variables are mapped to the LMP SIS panel theme.
- [ ] Check package versions/peer dependency warnings.
- [ ] Run LMP typecheck and production build.

Typical symptoms:

| Symptom | Inspect first |
|---|---|
| `Module not found: @/components/...` | Starter local import paths, destination paths, tsconfig aliases and copied dependency closure. |
| Styles missing or buttons unstyled | Required shadcn component CSS/classes and local CSS variables. Do not import the starter's entire global stylesheet blindly. |
| Invalid hook/context error | Ensure transcript/control components are inside the same `SessionProvider`/`AgentSessionProvider`. |
| React duplicate/version conflict | Main LMP dependency tree and package lock; do not use the nested starter's `node_modules`. |
| `Streamdown` missing | Check whether dependency is installed and compatible, or use the host app's existing safe Markdown renderer. |

### C. Session/token failure

- [ ] Browser sends request to the main LMP token endpoint.
- [ ] Endpoint returns the exact contract expected by `TokenSource.endpoint`.
- [ ] Response is not cached.
- [ ] LiveKit URL resolves and is `wss://` for Cloud.
- [ ] Token is valid, not expired, and grants correct room access.
- [ ] Agent dispatch is set to the exact name registered by the worker.
- [ ] The expected SIS worker joins the room.
- [ ] No homepage/demo-agent fallback exists.

Typical symptoms:

| Symptom | Inspect first |
|---|---|
| `401`/`403` from token endpoint | LMP authentication, CSRF/origin validation and endpoint authorization. |
| Token response parse failure | Property names and token endpoint schema expected by the installed LiveKit SDK. |
| Room connects but no SIS agent joins | Python worker running, `rtc_session(agent_name=...)`, dispatch name and worker logs. |
| Wrong/default demo agent responds | Starter fallback path or automatic dispatch. Remove fallback and require explicit SIS dispatch. |
| Disconnects immediately | Worker availability, token expiry/room grants and browser console/network logs. |

### D. Text interaction failure

- [ ] `AgentControlBar` is mounted inside the active session provider.
- [ ] Its `useChat()` hook is connected to the intended session.
- [ ] Sending text generates a real LiveKit chat/text event.
- [ ] Python agent has text input enabled for the installed Agents version.
- [ ] Agent response is returned in session messages.
- [ ] `AgentChatTranscript` receives the live `useSessionMessages` array.
- [ ] There is no fake local assistant reply and no duplicate optimistic bubble.

If the control bar sends but the worker does not respond, inspect the worker's text-input setting and LiveKit Agents version before changing UI code. Test the worker with a direct LiveKit-supported text input path if needed.

### E. Microphone/STT failure

- [ ] Microphone permission is requested only after user click.
- [ ] Browser has a valid microphone device.
- [ ] The starter track control publishes an enabled local microphone track.
- [ ] LiveKit room receives the audio track.
- [ ] Python agent session has the configured STT provider and language.
- [ ] Actual user transcript is emitted into the session messages.
- [ ] The UI does not claim `Listening` if the microphone is disabled or permission is denied.

Test both permission granted and denied. Text chat must still work when microphone access is denied.

### F. TTS/audio playback failure

- [ ] `AgentSessionProvider` renders `RoomAudioRenderer`.
- [ ] Python agent publishes a remote audio track.
- [ ] Browser autoplay restrictions are handled with the starter's `StartAudioButton` when needed.
- [ ] Browser output device/volume is valid.
- [ ] Agent's actual transcript appears even when audio playback is blocked.
- [ ] UI reports audio playback failure truthfully and does not claim the agent spoke audibly when it did not.

### G. Transcript/state synchronization

- [ ] Messages come from `useSessionMessages`, not local sample state.
- [ ] User and agent messages appear once.
- [ ] Message order follows the real session event order.
- [ ] Thinking indicator follows actual `agentState`.
- [ ] Connected state follows the real LiveKit session/agent join state.
- [ ] Listening and speaking states reflect actual audio/session state.
- [ ] Disconnect ends the session and releases media resources.
- [ ] Minimize/reopen does not create duplicate sessions.

### H. SIS mission context/RAG failure

- [ ] The current context reference is available for the selected analysis run.
- [ ] Worker resolves it server-to-server.
- [ ] Context schema/version/freshness is validated.
- [ ] RAG service uses the established endpoint and auth contract.
- [ ] Missing fields are treated as unavailable rather than zero or guessed.
- [ ] Text and voice responses follow the same policy.

---

## 12. Required end-to-end verification

Run all relevant Phase 25 tests and these SIS panel scenarios.

### Test 1 — Empty state and dummy-data removal

1. Open the LMP Analysis page and open SIS.
2. Confirm there are no seeded user/assistant bubbles.
3. Confirm disconnected state is truthful.
4. Confirm static empty-state copy is instructional only.

### Test 2 — Real text conversation

1. Start the SIS session using the reworked starter UI.
2. Submit a real question using the starter's chat input.
3. Verify the user message appears from the session event.
4. Verify the Python `lmp-sis-agent` worker receives it.
5. Verify Gemini/RAG generates the real answer.
6. Verify the answer appears exactly once in `AgentChatTranscript`.
7. Verify microphone permission was not requested.

### Test 3 — Real voice conversation

1. Click the starter microphone control.
2. Grant microphone permission.
3. Speak a question.
4. Verify the user transcript appears.
5. Verify the Python agent responds.
6. Verify the assistant transcript appears.
7. Verify actual remote TTS audio is audible, not merely that a transcript bubble appeared.

### Test 4 — Mixed text and voice

1. Ask one question by text.
2. Ask a related follow-up by voice.
3. Ask a further follow-up by text.
4. Verify all turns appear in one transcript, same session and same mission context.

### Test 5 — Audio permission and autoplay

- Deny microphone permission and verify text still works.
- Test browser autoplay blocked and click `Start Audio` if displayed.
- Confirm the visual state reflects the actual microphone and remote audio state.

### Test 6 — Disconnect, reconnect and panel visibility

- End the session using the starter's real disconnect control.
- Verify microphone publishing stops and remote audio stops.
- Reconnect and verify one new session.
- Minimize and reopen the panel. Verify no duplicate room or session is created.

### Test 7 — SIS grounding

Use only a safe synthetic test context that matches the actual mission result schema, or a verified non-sensitive test analysis.

- Ask for a value present in context; answer must preserve the exact value and units.
- Ask for a value missing from context; SIS must say it is unavailable.
- Mark context stale; SIS must not use it as current.
- Ask for an operational rover safety guarantee; SIS must distinguish calculation evidence from mission certification.
- Confirm text and voice use the same grounding/RAG rules.

### Test 8 — Regression and responsive UI

- Mission Input remains unchanged.
- Lunar Map remains unchanged.
- Mission Analysis remains unchanged outside the SIS panel integration.
- Results page and background components remain unchanged.
- No duplicate launcher, second chat panel or nested Next.js app appears.
- Inspect at minimum desktop widths `1920x1080`, `1366x768`, and mobile `390x844`.
- Verify the transcript scrolls correctly and control bar/composer remains usable on mobile.

---

## 13. Acceptance checklist

### Git starter reuse

- [ ] Correct GitHub repository is cloned/reused at `voice-agent/frontend/`.
- [ ] Exact source commit SHA is recorded.
- [ ] The actual starter UI source components are reused/adapted.
- [ ] Source-to-destination component mapping is recorded.
- [ ] MIT license and attribution are preserved.
- [ ] No standalone starter Next.js app is embedded or used as a second UI.

### SIS UI rework

- [ ] Existing LMP SIS launcher and panel shell remain.
- [ ] Starter transcript UI is adapted and displays actual session messages.
- [ ] Starter control bar/chat input is adapted and sends real text.
- [ ] Starter microphone/disconnect/audio components are adapted and functional.
- [ ] Cream/off-white SIS visual identity is preserved through local styling.
- [ ] No preview conversation, mock response or placeholder control remains.

### Runtime integration

- [ ] Main LMP app uses compatible LiveKit React/client dependencies.
- [ ] The LMP token endpoint is server-side and protected appropriately.
- [ ] Explicit dispatch reaches the correct Python SIS agent.
- [ ] Text and voice use one LiveKit session.
- [ ] Gemini configuration is unchanged and remains server/worker-side.
- [ ] Mission context and existing RAG contract are preserved.
- [ ] Audio playback is verified where browser/hardware permits.

### Quality/security

- [ ] Typecheck, lint, tests and production build pass or failures are documented.
- [ ] Desktop and mobile panel behavior are checked.
- [ ] Microphone denial and browser autoplay restrictions are handled.
- [ ] No secrets appear in client bundles, browser storage, logs or screenshots.
- [ ] No unrelated LMP components were modified.
- [ ] No test is marked passed without actual evidence.

---

## 14. Required `SIS_LIVEKIT_UI_INTEGRATION_DEBUG_REPORT.md`

Create this report in the repository after implementation. Include:

1. Repository clone path, origin URL, selected commit SHA and working-tree state.
2. Starter components reused and their destination paths in the main LMP app.
3. Local UI primitives/hooks copied or adapted as dependencies.
4. License/attribution handling.
5. Exact LMP packages and versions added or reused; include peer-dependency verification.
6. Main SIS component where the starter-based UI is mounted.
7. How `TokenSource`, `useSession`, `AgentSessionProvider` and the token endpoint are connected.
8. Token endpoint authentication, token scope and agent dispatch setup (never include secrets).
9. Confirmed Python agent name and Gemini/STT/TTS configuration (model names only; no keys).
10. How text is sent using the starter's `AgentControlBar`/`useChat` and delivered to Python.
11. How microphone audio, STT transcript, assistant transcript and TTS audio are handled.
12. How current mission context and RAG are resolved.
13. Dummy/preview code removed.
14. Results for all tests in Section 12.
15. Actual typecheck/lint/test/build output summary.
16. Browser screenshots showing (a) empty SIS state, (b) real text conversation, and (c) real voice conversation when verified. Do not fabricate evidence.
17. Known blockers and anything not verified, especially audible TTS if no audio hardware is available.
18. Exact file list and confirmation that the rest of the LMP workspace was not unintentionally changed.

Do not write “integration successful” unless the actual browser-to-LiveKit-to-Python-agent round trip is verified. If the UI compiles but the worker, text round trip or audible TTS is not verified, state that clearly.

---

## 15. Official/reference links

- LiveKit React starter: https://github.com/livekit-examples/agent-starter-react
- LiveKit Agents UI: https://livekit.io/ui
- LiveKit React session docs: https://docs.livekit.io/frontends/build/sessions/
- LiveKit frontend token endpoint: https://docs.livekit.io/frontends/build/authentication/endpoint/
- LiveKit agent chat/transcripts: https://docs.livekit.io/frontends/agents-ui/chat/
- LiveKit agent state: https://docs.livekit.io/frontends/build/agent-state/
- LiveKit Python text input: https://docs.livekit.io/agents/multimodality/text/
- LMP mission context design: `phase-19-sis-results-context-llm-livekit.md`
- SIS panel layout: `phase-22-sis-analysis-page-ui-implementation-context.md`
- Gemini/Python worker setup: `phase-24-revised-gemini-livekit-sis-agent-and-frontend-setup.md`
- Voice agent test plan: `phase-25-livekit-sis-voice-agent-testing-and-output-evaluation.md`

---

## Final instruction to the coding agent

**Do not build a replacement LiveKit chatbot UI from an empty component file. Pull and inspect `livekit-examples/agent-starter-react`, reuse its real transcript, chat input, controls, audio provider and session patterns, then adapt those source components into the existing LMP SIS panel.** Keep the standalone starter clone as the reference/source, keep the main LMP app as the only user-facing frontend, preserve Gemini and the Python worker, remove dummy data, and debug the real end-to-end integration in the order defined above.
