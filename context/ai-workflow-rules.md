# Development Workflow

## Approach

Build the Lunar Mission Planner incrementally using a spec-driven workflow. The context files define the product, architecture, UI, standards, and current progress. Implement against these specifications; do not invent scientific behavior or silently substitute mock data for real results.

## Scoping Rules

- Work on one feature unit or subsystem at a time.
- Prefer small, verifiable increments over broad speculative changes.
- Keep UI composition, map integration, external data retrieval, astronomical calculations, terrain analysis, and report export in separate responsibilities.
- Do not combine unrelated UI and backend changes in one implementation step unless an end-to-end slice requires it.

## Recommended Implementation Order

1. Inspect the existing repository and current Next.js documentation.
2. Establish the application shell and theme using the existing design tokens.
3. Implement the mission input form and validation.
4. Implement the lunar map panel and coordinate marker using the chosen map/data integration.
5. Implement the analysis panel's loading, completed, partial, and error states using clearly labelled mock data.
6. Add the Horizons data service and validate observer/time configuration.
7. Add lunar terrain data retrieval and terrain-horizon/obstruction calculations.
8. Connect real analysis results to the dashboard.
9. Implement site/date comparison if included in the active scope.
10. Implement PDF export only after the report data contract is stable.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context files.
- If a requirement is ambiguous, add it to `progress-tracker.md` under Open Questions before implementing it.
- If an external data source does not provide a required field or API, document the limitation and propose a verified alternative.
- Do not present illustrative values as live NASA/JPL measurements.

## UI and Foundation Components

- Do not modify generated third-party foundation components unless explicitly required.
- Keep project-specific styling and feature behavior in app-level components.
- Use the existing shadcn/ui components and add new ones through the project's configured shadcn workflow.
- Keep the UI replaceable: visual components must not own NASA API calls, scientific calculations, or terrain-processing logic.

## Data Integrity

- Validate user-provided coordinates and date/time at the boundary.
- Keep time zones explicit; mission time is UTC.
- Preserve units and source metadata with calculated values.
- Distinguish geometric horizon visibility from terrain-corrected visibility.
- Distinguish terrain visibility from a guaranteed operational communication link.
- Treat missing or partial data as unknown/unavailable, not as zero or success.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:
- Product scope or user flow: `project-overview.md`
- System boundaries, integrations, data contracts: `architecture-context.md`
- UI structure or visual behavior: `ui-context.md`
- Coding conventions: `code-standards.md`
- Current implementation state: `progress-tracker.md`

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant in `architecture-context.md` was violated.
3. Mock data is clearly labelled and cannot be confused with real analysis.
4. `progress-tracker.md` reflects the actual implementation state.

## Current Approved Development Direction — Results Page and SIS

The current approved work is incremental and must preserve the existing mission-planning flow.

### Phase 20 — Results Background Replacement
- Replace only the Mission Operational Results page background image with the exact local asset `Horizon.jpg`.
- Source path on the developer's machine: `C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`.
- Copy the verified source image into the repository's public asset directory and reference it through a browser-safe local path.
- Preserve the image's star field, golden celestial arc, clouded horizon, astronaut, reflective foreground, and golden reflection.
- Handle the portrait source image on landscape viewports without non-uniform stretching. Choose and document the actual fit/crop strategy.
- Verify source dimensions, public asset response, browser decoding, and screenshots at the target desktop/tablet/mobile sizes.
- Scope is strictly limited to the Results page background component and necessary asset wiring. Do not modify cards, layout, navigation, calculations, SIS, LiveKit, or other page backgrounds.

### Phase 21 — SIS Chatbot UI Only
- Add a small floating SIS launcher at the bottom-right of the Mission Operational Results page.
- Clicking it opens a compact right-side chatbot panel based on the approved warm off-white/cream UI reference.
- Show distinct user and SIS message bubbles, welcome/empty state, suggested prompts, text composer, send control, and microphone/speaker controls as visual placeholders.
- Support open, close, and minimize interactions plus responsive desktop/tablet/mobile behavior.
- Static sample messages must be clearly labelled as UI preview content.
- Do not fabricate live assistant responses.

### Future SIS integration (not part of Phase 21)
The later integration phase may connect the Results page's typed mission context to the existing backend RAG/LLM API and reuse the existing LiveKit voice implementation. Inspect existing services before modifying them. Text and voice must share the same mission-context schema and SIS behavior policy. This integration is separate from the UI-only Phase 21.

### Phase completion discipline
- Complete and verify Phase 20 independently before claiming the background is verified.
- Complete and verify Phase 21 independently before claiming the chatbot UI is implemented.
- Do not claim LLM, RAG, context injection, microphone, or LiveKit functionality during Phase 21.
- Update the progress tracker with actual evidence, changed files, test results, and incomplete items.


## New Approved Feature Workstream — 3D Lunar-Surface Rover Simulation

**Status: planned / not implemented.** The next technical task for this workstream is the prepared Phase 2 Cesium dependency setup. This feature adds a lunar-surface rover traverse simulator while preserving all existing mission-planning, analysis-results, and SIS behavior.

### Intended feature

Use a CesiumJS lunar globe, NASA Moon Trek imagery services, and an appropriately selected LOLA elevation product to build a 3D lunar surface. Users configure source/destination coordinates and select the existing General Rover profile. A rover model travels along a candidate traverse; a future terrain-ahead analysis scans supported elevation/slope/roughness data and reports potential hazards.

This is a surface rover simulation, not an Earth-to-Moon spacecraft trajectory simulation.

### 3D simulation implementation sequence

1. **Phase 2 — Cesium dependencies:** audit the repository/package manager, install compatible stable `cesium`, copy its required runtime assets into `public/cesium/`, configure `CESIUM_BASE_URL`, and verify client-only loading. No globe or rover logic in this phase.
2. **Phase 3 — Moon Trek globe:** inspect official WMTS GetCapabilities metadata, then add one verified global/equirectangular Moon Trek imagery layer to a client-only Cesium scene using a documented lunar ellipsoid/reference model.
3. **Phase 4 — LOLA terrain patch:** choose a suitable LOLA DEM/GDR subset, verify projection/units/resolution/no-data/vertical reference, and build a region-specific 3D terrain mesh. Imagery tiles are not elevation data.
4. **Phase 5 — Rover and route:** reuse the existing General Rover definition; add an approved rover model, source/destination markers, and a clearly labelled candidate traverse.
5. **Phase 6 — Visual playback:** add Play/Pause/Reset and rover movement along the candidate route. Do not describe visual interpolation as full physics.
6. **Phase 7 — Terrain-ahead hazard analysis:** calculate supported slope/depression/roughness hazards from real data, report coverage/resolution/method, and add rerouting only after a tested cost model exists.
7. **Phase 8 — SIS integration:** pass a validated simulation snapshot into the existing SIS context mechanism. Do not create a second RAG/LLM or LiveKit system.

### Scope and safety rules

- Keep the current 2D lunar map and the existing mission/results flow available.
- Recommended default: put the 3D simulator on a separate route/view linked from the existing workspace, instead of replacing the current map.
- Reuse existing design tokens and components; the 3D screen should look like the current dark aerospace workspace.
- Use Moon Trek's published WMTS data services; do not scrape its rendered canvas or assume iframe embedding is a stable programmatic integration.
- Read GetCapabilities before configuring layer IDs, matrix sets, tile labels, projections, extents, formats, or URLs.
- Moon Trek imagery tiles provide texture, not terrain height. LOLA DEM/GDR is a separate elevation source.
- Do not use Cesium's default WGS84 Earth ellipsoid or Earth terrain/basemaps for the lunar scene.
- Use the existing General Rover profile; do not invent speed, mass, wheel, clearance, power, or battery values.
- Coarse LOLA data cannot guarantee detection of small rocks/boulders. Require suitable high-resolution data and a validated method before reporting them.
- A render raycast is not equivalent to a scientific terrain-hazard calculation.
- Keep missing/partial/no-data regions unknown or unavailable, never hazard-free by default.
- The simulator is decision support, not rover control, safety certification, or proof of a safe route.
- Preserve SI disclosures and do not use/alter NASA logos, mission identifiers, flags, or NASA branding in SI-generated assets.

The feature architecture, implementation phases, UI specification, data contracts, acceptance criteria, and open technical questions are documented across `project-overview.md`, `architecture-context.md`, `ui-context.md`, and this workflow file. Use these five main context files as the complete maintained specification; do not require a separate roadmap document.

### Phase completion discipline for this workstream

Complete and verify each phase independently before starting the next. Update `progress-tracker.md` with actual changed files, commands, test results, source/data provenance, incomplete items, and evidence. Never mark an imagery, terrain, movement, or hazard-analysis stage complete solely because a visual mock-up renders.
