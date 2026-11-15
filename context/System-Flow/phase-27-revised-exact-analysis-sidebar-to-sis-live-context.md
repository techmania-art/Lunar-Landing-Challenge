# Phase 27 — Live Mission Context Sync from Mission Analysis Dashboard to SIS

**Project:** Lunar Mission Planner (LMP) — Super Intelligent System (SIS)  
**Phase:** 27  
**Type:** Implementation + integration debug + verification  
**Priority:** High  
**Status:** Ready for implementation  
**Primary objective:** Make SIS receive and use the latest real mission-analysis details displayed in the exact right-side `Mission Analysis` sidebar inside the Analysis/workspace page shown in the user-supplied screenshot, with emphasis on every actually rendered energy/power and terrain/communication metric.

---

## 1. Context from the completed Phase 26 reports

Treat the two supplied reports as the current implementation baseline:

- `SIS_CHAT_DEBUG_REPORT.md`
- `SIS_LIVEKIT_UI_INTEGRATION_DEBUG_REPORT.md`

They report that the text conversation round-trip is verified: the Python worker registers as `lmp-sis-agent`, the UI uses a real LiveKit session and transcript, Gemini produces streamed replies, and the Phase 26 unit, typecheck, lint, pytest and Playwright checks passed. The main SIS panel is `components/sis/sis-chat-panel.tsx`; the right-side dashboard is the Mission Analysis area in the LMP workspace; the Python worker is `voice-agent/src/agent.py`; the token route is `app/api/sis/livekit/token/route.ts`.

The reports also state that the RAG indexing endpoint remains in local-development mode and that the agent has a guarded fallback when mission context is unavailable. Do not represent RAG retrieval as fully production-ready unless the implementation is independently verified.

**This phase is not another LiveKit chat setup.** Do not rebuild the chat UI, replace the working Gemini configuration, or redo the already-verified session integration. The missing capability to implement is live, structured, mission-specific dashboard context flowing into the already-working SIS session.

---

## 2. Required user-visible outcome

When the user changes the selected lunar location, date/time, rover configuration, or triggers a new energy/terrain analysis, SIS must receive the latest values from the right-side Mission Analysis dashboard. When the user then asks a question, the answer must be grounded in the current dashboard snapshot—not an earlier snapshot, mock data, a guessed value, or generic model knowledge.

Examples of expected questions:

- “How much solar power is being generated at this location right now?”
- “What is the current battery/energy situation?”
- “Why is the solar output low?”
- “Is the rover in terrain shadow?”
- “What terrain hazards are affecting this route?”
- “How does the slope or roughness affect the traverse?”
- “Is Earth geometrically visible, and is terrain blocking the line of sight?”
- “Summarize all energy and terrain risks for this selected mission.”

The agent must explain the actual numbers, units, status, timestamp, data source and important assumptions displayed by the dashboard. It must clearly state when a value is pending, unavailable, stale, invalid or uncertain.

---

## 2A. Exact dashboard source confirmed by the user-supplied screenshot

**The source is specifically the right-side `Mission Analysis` sidebar inside the Analysis/workspace page.** Use the sidebar shown in the supplied screenshot as the UI reference. Do not read mission data from a separate Results page, the left Mission Input panel, the center Lunar Map, a different dashboard, or an old test fixture.

The implementation starting point identified by the Phase 26 report is `components/workspace/mission-analysis-panel.tsx`, with supporting child cards, hooks, stores, selectors and API result types under `components/analysis/`. Verify the actual current component tree and follow the state/data objects that render this exact sidebar. File names are starting points, not permission to assume the architecture without inspection.

### Screenshot-confirmed sections and fields

The supplied screenshot is a partial viewport capture of the right-side sidebar. It visibly confirms these sections and field labels:

1. **Mission Analysis / Analysis Complete**
   - Overall analysis-complete status.
   - Verification/source message for NASA JPL Horizons ephemerides.
   - Observation epoch shown in UTC.

2. **Sun Analysis**
   - `Sun Azimuth` (degrees).
   - `Sun Elevation` (degrees).
   - `Geometric Status` (for example, the displayed state label).
   - The short geometric-status explanation.
   - `Observation` timestamp.
   - `Data Source` and Horizons target identifier.
   - The visible limitation note that local terrain obstruction is evaluated in the Solar Illumination & Energy panel below.

3. **Earth Analysis**
   - `Earth Azimuth` (degrees).
   - `Earth Elevation` (degrees).
   - `Geometric Status`.
   - The short geometric-status explanation.
   - `Observation` timestamp.
   - `Data Source` and Horizons target identifier.
   - The visible limitation note that local terrain obstruction and RF radio-link conditions are not included in the geometric result.

4. **Solar Illumination & Energy**
   - The section is visible beginning at the bottom of the screenshot.
   - Its status badge is visible (the screenshot shows `Illuminated (Direct Sunlight)`).
   - The metric tiles continue below the screenshot crop. Inspect the full scrollable sidebar and its backing components to inventory every energy metric; do not infer unseen labels or values from this cropped image.

5. **Terrain / Communication / rover-related analysis below the visible crop**
   - Inspect the remainder of this same Mission Analysis sidebar and all its expandable/scrollable sections.
   - Include every terrain, hazard, traverse and communication field that is actually rendered there and backed by current analysis state.
   - Do not invent a Terrain & Communication section or metrics if the current sidebar does not contain them; report exactly what exists and where it appears.

### Important handling of screenshot values

The screenshot is a visual locator and field-label reference, **not a source of runtime values**. It contains one example observation (`2026-11-12 12:00 UTC`) and example Sun/Earth figures. Do not hardcode, seed, or use those displayed example values as test expectations. At runtime, SIS must receive the latest values from the canonical state/API result objects that the currently rendered sidebar uses.

The screenshot distinguishes geometric Horizons data from terrain-aware illumination and radio-link analysis. Preserve those distinctions in the context schema and in SIS answers. In particular:

- `Sun Elevation` / `Sun Geometric Status` are Horizons geometric values; they are not by themselves a complete terrain-aware illumination result.
- `Earth Elevation` / `Earth Geometric Status` are Horizons geometric values; they do not establish terrain-aware line of sight or an operational RF link.
- The Sun card explicitly directs the user to the Solar Illumination & Energy section for local terrain obstruction.
- The Earth card explicitly warns that local terrain obstruction and RF radio-link conditions are not included in its geometric result.

### Required implementation inventory update

Before implementing transport, produce a table mapping each metric visible in the **entire right-side Mission Analysis sidebar** to:

- exact displayed section and label;
- canonical TypeScript field / selector / API response path;
- value type and unit;
- calculation status and timestamp source;
- provenance/source metadata;
- serialized mission-context key;
- test proving that the current sidebar value reaches SIS.

This inventory must include the screenshot-confirmed fields above plus every additional energy, terrain, rover and communication field found below the fold. It must not include guessed fields merely because they are desirable for lunar mission planning.

---

## 3. Source of truth: exact right-side Mission Analysis sidebar in the Analysis page

Before writing code, inspect the existing Mission Analysis components, state stores, hooks, selectors, API response types and calculation services. Identify the canonical data structures that populate every visible energy/power and terrain/communication card, metric tile, status label and result detail.

Likely inspection targets include (verify exact paths before editing):

- `components/workspace/mission-analysis-panel.tsx`
- `components/analysis/` and its child panels/cards
- energy / solar analysis state and API response types
- terrain analysis, DEM, horizon, obstruction and traverse result types
- Earth visibility / communication analysis state
- shared mission input, selected coordinates, date/time and rover configuration state
- `components/sis/sis-chat-panel.tsx`
- `voice-agent/src/agent.py`

### Mandatory source-of-truth rules

1. Reuse the same normalized state/selectors/data objects that the dashboard itself renders. Do not create a second independent calculation or data-fetching path just for SIS.
2. Do not scrape the rendered DOM, labels or screenshots. Read the underlying typed state/API result.
3. Include **all currently displayed energy, power, terrain, hazard, traverse and communication metrics** that are relevant to the selected mission. Do not silently omit cards or tiles.
4. Preserve each metric's exact displayed value, unit, status and explanatory note. Do not convert units unless the original value and converted value are both clearly labelled and conversion is deterministic.
5. Preserve the distinction between `0`, `null`, unavailable, not calculated, stale, failed and pending. A missing value must never be converted to zero.
6. Do not invent new metric values or assume that a metric exists. The implementation agent must discover the actual dashboard schema and make an inventory in its report.
7. If the dashboard changes, SIS must receive the revised snapshot without requiring a page reload or a new LiveKit room.

---

## 4. Dashboard metric inventory — capture everything that actually exists

The implementation agent must create a code-backed inventory before integration. Include every current dashboard field in the relevant groups below **when it exists in the code/UI**; these are categories to inspect, not permission to fabricate missing measurements.

### A. Energy and power

Capture all dashboard-provided fields relating to:

- solar illumination, sun visibility, direct-sun status and terrain-shadow status;
- irradiance or available solar resource;
- solar panel area, efficiency, orientation, incidence angle or other panel assumptions, if displayed;
- generated/available electrical power, with units;
- rover/system power demand, load or consumption, with units;
- battery capacity, remaining energy, state of charge, reserve or energy margin, if calculated;
- estimated operating duration/endurance or time-to-depletion, if calculated;
- energy balance, budget or surplus/deficit indicators;
- time interval, epoch and simulation/mission duration used by the model;
- warnings, constraints, calculation state and any energy-specific explanatory detail.

Do not infer battery energy from solar output. Do not equate a terrain shadow with an empty battery. A terrain-shadow result can mean zero direct solar generation for that sample only when the model explicitly reports it; it does not mean stored battery energy is zero.

### B. Terrain, hazards and rover traverse

Capture all dashboard-provided fields relating to:

- DEM/elevation and vertical reference information;
- slope/grade, roughness and terrain classification;
- crater/rock/obstacle detections, counts, sizes, distances and hazard severity, if displayed;
- route segments, waypoints, traverse distance, elevation change and route-specific metrics, if displayed;
- local horizon profile, terrain obstruction, line-of-sight blockage and shadow conditions;
- traverse feasibility, mobility/clearance status, grade limits or risk indicators, if the app computes them;
- landing/traverse site assessment fields and explanatory warnings;
- DEM/data source, spatial resolution, coverage, coordinate reference system and processing timestamp when available.

Do not infer safe traversal from obstacle count alone. Do not present landing suitability as equivalent to route traversability. Do not claim terrain safety when the dashboard only reports a geometric metric or an incomplete analysis.

### C. Communication and visibility (keep physical concepts separate)

Capture all dashboard-provided communication/visibility fields, including where available:

- Earth azimuth/elevation and geometric visibility state;
- terrain-aware line-of-sight state or obstruction result;
- link-budget / operational radio status only if an actual link-budget model is present;
- relay/site details, source, time and limitations.

Keep geometric Earth visibility, terrain-aware line of sight and operational RF link availability as separate concepts. Do not upgrade a geometric visibility value into an operational communication guarantee.

### D. Mission identity and analysis provenance

Every snapshot must also identify the context to which the metrics belong:

- selected latitude/longitude and coordinate convention;
- selected site/mission identifier, if one exists;
- selected date/time and timezone or UTC epoch convention;
- rover configuration/version used by the analysis;
- analysis run ID or result version, where available;
- source API/dataset/model name and relevant versions;
- `generatedAt`, per-section calculation timestamp and stale/fresh status;
- error/warning/partial-result status and missing fields.

If the app has no mission ID, do not invent one. Use an existing stable analysis/run key or a generated client-side session identifier clearly marked as such.

---

## 5. Shared versioned mission-context contract

Create one explicit contract shared by the frontend and Python agent. Suggested name: `LmpMissionContextSnapshot`.

- `schemaVersion`: a semantic or integer schema version.
- `contextId`: stable ID for this snapshot.
- `revision`: monotonically increasing revision for the active mission context.
- `createdAt`: ISO-8601 timestamp.
- `mission`: coordinates, selected site/mission key, date/time, rover configuration and relevant input parameters.
- `analysisStatus`: overall status plus per-section statuses (`ready`, `pending`, `partial`, `stale`, `error`, `unavailable`).
- `energy`: structured set of all current energy/power metrics.
- `terrain`: structured set of all current terrain/hazard/traverse metrics.
- `communication`: structured visibility / terrain-LOS / link-budget metrics that actually exist.
- `provenance`: sources, timestamps, versions, units, assumptions and warnings.

Represent each metric consistently, for example:

```json
{
  "key": "dashboard-stable-metric-key",
  "label": "Exact dashboard label",
  "value": 0,
  "unit": "W",
  "status": "ready",
  "source": "actual source/model identifier",
  "asOf": "2026-11-15T07:00:00Z",
  "note": null
}
```

The example is a schema illustration only; do not copy its value or label into application data. Use `value: null` with an accurate status for unavailable/pending values. A numeric zero is valid only when the dashboard actually supplies zero.

Keep the shared schema strongly typed in TypeScript and validate it in Python (Pydantic or the project's existing validation approach). Do not maintain two drifting hand-written lists of metric field names. Preserve unknown dashboard fields in an explicit `additionalMetrics`/extensions collection only when their labels, values, units and statuses can be carried safely; do not drop newly added dashboard tiles silently.

---

## 6. Live synchronization architecture

### Preferred flow

1. Mission Analysis dashboard state updates after a user input change or completed API calculation.
2. A dedicated selector/serializer builds the latest `LmpMissionContextSnapshot` from the existing canonical dashboard data.
3. The SIS panel publishes the snapshot to the connected LiveKit room using a **reliable** data packet on a namespaced topic, for example `lmp.sis.mission-context.v1`.
4. The Python agent validates the packet, checks its source participant/room and schema version, stores it in the current room/session context, and acknowledges the received `contextId` + `revision` on a separate acknowledgement topic, for example `lmp.sis.mission-context.ack.v1`.
5. The frontend marks the matching revision as synced only after receiving the acknowledgement.
6. Before sending each `lk.chat` user message, the frontend must ensure the latest dashboard revision has been acknowledged. If the latest context is not synced, show a truthful “Syncing mission data” state and do not silently send a question against stale context.
7. The Python agent freezes the latest accepted context revision at the beginning of each user turn and uses that same snapshot throughout the response.
8. On room reconnect, worker restart or frontend remount, resend the latest dashboard snapshot and wait for acknowledgement before enabling context-dependent questions.

Use the installed SDK versions already present in the root project and Python environment. Inspect the installed API signatures instead of upgrading dependencies unnecessarily. LiveKit JavaScript supports reliable `publishData` with a topic, and Python rooms expose received data packets; verify exact signatures against the installed versions.

### Payload-size handling

LiveKit reliable data packets are limited to approximately 15 KiB of user payload. Measure the serialized snapshot before publishing.

- Do not send DEM rasters, map tiles, images, large arrays or raw terrain grids to Gemini through the data channel.
- Send dashboard-derived metrics, route/hazard summaries and source/provenance metadata.
- If the structured snapshot exceeds the supported data-packet limit, store the snapshot through a server-side mission-context endpoint/store and send only an authenticated opaque `contextId`/revision reference to the worker. The worker must retrieve the exact snapshot server-to-server using a server-only credential.
- Do not silently truncate terrain or energy details to make the payload fit.

### Reliability, ordering and isolation

- Debounce rapid dashboard changes, but never lose the newest revision.
- Ignore out-of-order revisions; do not replace a newer context with an older packet.
- Acknowledge only after validation and successful storage in the session context.
- Include `contextId`, `revision` and a correlation ID in logs.
- Keep context scoped per LiveKit room and linked participant/session. Never use one process-global mission snapshot shared between different users or rooms.
- Verify that the sender is the expected linked participant; reject unexpected participant context packets.
- On timeout or invalid acknowledgement, retry a bounded number of times and show a clear sync error. Do not report “Synced” optimistically.

---

## 7. SIS agent behavior with live dashboard context

Update the existing `voice-agent/src/agent.py` context handling and system instructions. Do not replace the existing Gemini API configuration, STT/TTS providers, text-input handling or LiveKit session setup that Phase 26 verified.

At the start of every user turn, SIS must:

1. Read the most recently acknowledged and validated dashboard snapshot for the current room/participant.
2. Confirm the snapshot revision and freshness/status.
3. Use the dashboard values as the authoritative source for the selected mission's current computed metrics.
4. Use RAG documentation for scientific explanations, definitions and references—not to overwrite current dashboard measurements.
5. If the relevant analysis is pending, stale, partial, failed or unavailable, say so explicitly and explain which value cannot yet be confirmed.
6. Keep zero, missing, unavailable and pending values distinct.
7. Explain the metric label and unit in plain language and identify the timestamp/source when that affects interpretation.
8. Separate facts reported by the dashboard from explanations/inferences. Clearly qualify any inference.
9. Never invent a numeric value, source, confidence, safety result or operational status.

### Required scientific distinctions

- Terrain illumination/shadow is not the same thing as battery state of charge.
- Instantaneous solar generation is not the same thing as mission-total energy without a time-integrated model.
- Geometric Earth visibility is not the same thing as terrain-aware line of sight or an operational RF link.
- Landing suitability is not the same thing as rover traverse safety.
- Slope, roughness, obstacle count and hazard detections must only support the conclusions that the actual mobility/traverse model permits.

### Answer examples (behavioral requirements, not hardcoded response text)

- When asked about energy: summarize only the current energy metrics in the latest snapshot, with units and status. Mention unavailable battery/endurance data rather than estimating it.
- When asked about terrain: summarize the current terrain metrics and hazard/traverse result, explaining the DEM/source limitations.
- When asked for an overall risk summary: combine only current valid energy, terrain and communication sections; identify incomplete sections.
- When context is missing: ask the user to run or refresh the relevant dashboard analysis rather than answering from invented sample data.

---

## 8. Frontend behavior and status display

Keep the existing SIS panel, visual style, LiveKit starter-adapted controls, transcript and working text/voice interactions unchanged except for the context-sync behavior needed here.

Add a compact, truthful mission-data sync indicator in the SIS header or an existing status area. Suggested states:

- `Mission data syncing`
- `Mission data synced · [revision/time]`
- `Mission data stale`
- `Mission data unavailable`
- `Mission data sync failed`

Do not confuse this indicator with the LiveKit connection/agent status badge. Room connected does not mean the latest dashboard context has been synchronized.

When a new dashboard result arrives:

- build a new revision;
- publish it to the agent;
- wait for acknowledgement;
- update the sync indicator;
- make the latest snapshot available to the next chat turn.

Suggested questions may remain as empty-state prompts, but must be sent through the same path that synchronizes the latest context before sending the text message.

Do not add seeded metrics, sample energy values, mock terrain results, fake “live” timestamps or placeholder context.

---

## 9. Security and trust boundaries

- Keep `GOOGLE_API_KEY`, LiveKit secrets and any context-service credentials server-side. Never publish them in LiveKit data packets or expose them to the browser.
- Treat client-originated mission context as untrusted input even though it was serialized from the dashboard. Validate types, bounds, units, schema, sender identity and allowed keys before the agent consumes it.
- Do not accept arbitrary client-supplied `source`, confidence or “verified” flags without checking the dashboard's canonical source metadata.
- Do not log full sensitive payloads or API keys. Log safe metric keys, snapshot ID/revision, status and correlation IDs; redact coordinates or mission values if project policy requires it.
- Use the server-side snapshot retrieval path if a large context must be stored; authenticate the Python worker to the endpoint.
- Fail closed for malformed or wrong-room context. Do not fall back to a previous user's data.

---

## 10. Implementation boundaries — do not regress Phase 26

### Expected areas of change (verify exact paths)

- Mission Analysis dashboard selectors/serializer or a small shared mission-context module.
- `components/sis/sis-chat-panel.tsx` for publish/ack/sync status and send gating.
- `voice-agent/src/agent.py` for context packet reception, validation, session-scoped storage and per-turn prompt injection.
- Shared TypeScript/Python schema definitions or schema fixtures.
- Focused frontend, Python and end-to-end tests.

### Preserve

- Existing working SIS layout and cream chatbot styling.
- Existing adapted LiveKit React starter components.
- Existing token endpoint and `lmp-sis-agent` dispatch configuration.
- Existing Gemini API configuration and current STT/TTS configuration.
- Existing `lk.chat` messaging and streamed response transcript.
- Existing workspace three-panel layout and all analysis UI.
- Existing Horizons, energy, terrain, RAG and calculation services.

### Explicit non-goals

- Do not rebuild the chatbot UI.
- Do not re-implement lunar energy or terrain calculations.
- Do not change the Gemini model or provider.
- Do not redesign or replace the RAG system.
- Do not create mock mission values to make the demo look populated.
- Do not send raw DEM/image/map content to Gemini.
- Do not change unrelated workspace panels or Results UI.
- Do not store mission context globally across sessions.

---

## 11. Required test plan

### A. Dashboard-to-schema coverage

1. Enumerate every visible energy/power and terrain/communication field in the right dashboard.
2. Assert every field is represented in the serialized snapshot, including label, value, unit and status.
3. Verify that `0`, `null`, pending, unavailable, error and stale remain distinguishable.
4. Verify source timestamps, coordinate/time selection and rover configuration are included where present.
5. Confirm no dashboard tile is silently omitted when the schema evolves.

### B. Live synchronization

1. Open one SIS session and confirm the worker has joined.
2. Publish initial dashboard context and verify acknowledgement of the exact revision.
3. Change selected coordinates/date/time and complete a new analysis; verify a higher revision arrives without reloading the page or reconnecting the room.
4. Change rover configuration and verify context updates when the dashboard results refresh.
5. Send a question immediately after an update; prove the answer used the acknowledged latest revision.
6. Simulate a missing/delayed acknowledgement; prove the UI does not silently send against stale data.
7. Reconnect the room and prove the latest snapshot is re-sent and acknowledged.
8. Send an older revision after a newer one; prove it is rejected/ignored.
9. Open two sessions with different mission contexts; prove neither agent session can read the other's context.

### C. Energy question tests

Use actual values from the running dashboard at test time; do not hardcode fabricated expected values.

- Ask for current solar generation and verify exact value/unit/status against the latest dashboard.
- Ask for the current energy balance / load / battery / endurance fields that actually exist.
- Ask why the generation is low and verify the response uses current illumination/shadow and panel assumptions only if the dashboard provides them.
- Verify that a missing battery metric is described as unavailable rather than guessed.
- Verify that a shadow state does not incorrectly become “battery empty.”

### D. Terrain question tests

- Ask for current slope, roughness, elevation and any other displayed terrain metrics.
- Ask which hazards affect the route; verify exact current hazard/obstacle details and route segment if available.
- Ask whether the traverse is safe; verify the answer is limited to the actual traverse model result and does not infer from obstacle count alone.
- Ask whether terrain is shadowing the site and verify the current terrain result/time.
- Verify DEM source/resolution/coverage/datum details are accurately qualified where available.

### E. Communication and scientific distinction tests

- Ask whether Earth is visible; verify geometric visibility and its current time.
- Ask whether terrain blocks line of sight; verify terrain-aware result separately.
- Ask whether the radio link is operational; if no link-budget model is present, SIS must state that operational RF availability is not established.
- Verify no conflation of geometric visibility, terrain LOS and operational link status.

### F. UI, voice and regression

- Confirm the context indicator changes truthfully across syncing/synced/stale/error.
- Confirm text chat continues to use the actual LiveKit session transcript.
- Confirm microphone/STT/TTS still works and uses the same latest context as text chat.
- Confirm suggested-question chips sync context before sending.
- Confirm no dummy context, mock values or preview messages appear.
- Run existing frontend tests, Python tests, typecheck, lint, production build and the LiveKit/Playwright end-to-end test.
- Run responsive checks at the existing supported viewport sizes and confirm no workspace layout regression.

---

## 12. Observability requirements

Add structured, non-secret logs for each snapshot lifecycle:

- `context_build_started`
- `context_built`
- `context_publish_started`
- `context_received`
- `context_validation_failed`
- `context_ack_sent`
- `context_ack_received`
- `context_stale_rejected`
- `context_used_for_turn`

Each event should include safe identifiers such as `room_name`, `participant_identity`, `context_id`, `revision`, `schema_version`, payload byte count, section statuses and correlation ID. Do not log API keys or full unredacted mission payloads.

For every generated assistant answer in debug mode, record which context revision it used. Make this traceable in logs/tests; do not expose internal implementation details to ordinary end users.

---

## 13. Deliverables and completion report

The coding agent must produce:

1. A metric inventory mapping each right-dashboard energy/terrain/communication field to its canonical source and serialized field key.
2. The shared versioned mission-context contract and validation tests.
3. The live frontend-to-agent sync/ack implementation.
4. The Python per-session context cache and per-turn use logic.
5. The SIS data-sync status display.
6. Automated tests for update ordering, missing/stale data and session isolation.
7. End-to-end evidence showing the exact dashboard revision used in a real SIS answer.
8. `PHASE_27_MISSION_CONTEXT_SYNC_REPORT.md` containing:
   - root architecture and data flow;
   - all metric fields discovered and mapped;
   - files changed;
   - transport choice and payload-size measurements;
   - test commands and actual pass/fail results;
   - sample redacted logs with matching context revision;
   - screenshots of synced and stale/error states;
   - limitations and any dashboard data that is not currently available.

Do not mark the phase complete because the room connects or because the SIS badge is green. Completion requires proof that a newly changed right-dashboard energy/terrain value reaches the agent and is used correctly in its next response.

---

## 14. Acceptance criteria

Phase 27 is complete only when all of the following are true:

- [ ] Every currently displayed energy/power and terrain/communication metric has been inventoried and mapped.
- [ ] SIS receives a current, versioned snapshot from the Mission Analysis dashboard.
- [ ] A dashboard update reaches the already-open SIS session without a room reconnect or page reload.
- [ ] The frontend receives an acknowledgement for the exact snapshot revision before sending a context-dependent question.
- [ ] Each agent turn uses one stable snapshot revision from start to finish.
- [ ] The answer's metric values, units, status and timestamp match the dashboard revision used.
- [ ] Missing, stale, pending, zero and error values are handled distinctly.
- [ ] No mission context leaks across rooms/participants.
- [ ] No API keys or secrets are exposed in the browser or data packets.
- [ ] Existing Phase 26 chat, voice and workspace regression tests pass.
- [ ] `PHASE_27_MISSION_CONTEXT_SYNC_REPORT.md` contains real evidence, not assumed success.

---

## 15. Official LiveKit references

Use the documentation and APIs compatible with the installed SDK versions; do not upgrade dependencies merely to match an example.

- LiveKit data packets (reliable delivery, topics, Python receive and JavaScript publish APIs, 15 KiB reliable payload guidance): https://docs.livekit.io/transport/data/packets/
- LiveKit text input (`lk.chat`, frontend `sendText`, Python text input callback): https://docs.livekit.io/agents/multimodality/text/
- LiveKit agent session / room options: https://docs.livekit.io/agents/logic/sessions/

