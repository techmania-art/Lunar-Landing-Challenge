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

## Latest Background Requirement — Supersedes Earlier Fit Guidance

The latest approved background task is to replace the current background source in the existing background component with the exact `Horizon.jpg` asset.

- Source on the developer's machine: `C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`.
- Copy the exact file into the project's existing public/static asset directory; use a browser-safe URL.
- Render as a full-viewport background (`100vw × 100vh`) with `background-size: cover`, `background-position: center`, and `background-repeat: no-repeat`.
- Keep the background behind all existing UI.
- Preserve the image aspect ratio; `cover` may crop the image depending on viewport aspect ratio. Do not stretch non-uniformly.
- Preserve existing UI layouts, interactions, foreground animations, and functionality.
- Do not modify backend code, add dependencies, redesign the UI, or change unrelated components/styles.
- Verify asset loading, responsive behavior, console/network errors, and screenshots at desktop/tablet/mobile sizes.

This latest explicit requirement supersedes earlier suggestions to prefer `contain` or preserve every pixel of the portrait image at all costs. Use `cover` as specified and document the actual crop at each viewport.

### Context maintenance rule
When a newer user instruction changes an existing requirement, update all relevant project context documents and remove or clearly mark superseded guidance so coding agents do not receive contradictory instructions. Keep the phase history, but identify the latest active requirement as authoritative.


## 3D Simulation — Additional Coding Standards

> Source note: the uploaded file named `code-standards.md` contains a copy of the Development Workflow document (plus the latest background rule), rather than a standalone set of coding conventions. Its supplied content is preserved above. The following section adds simulation-specific standards without silently replacing the source material.

### TypeScript and state

- Use strict TypeScript; avoid `any`. Use explicit discriminated unions for simulation state, terrain-data status and hazard categories.
- Keep one canonical simulation state for the scene and telemetry panel.
- Use explicit units in property names (`latitudeDegrees`, `distanceAheadMeters`, `elevationMeters`, `headingDegrees`).
- Keep coordinates, source/destination, route progress, data provenance and hazard events typed.
- Preserve `null`, unavailable, unknown, partial, stale and no-data conditions; never coerce them to zero or success.
- Validate user inputs and external data at module boundaries.
- Do not store a second stale copy of source/destination coordinates when an authoritative mission/simulation state already exists.

### Cesium and Next.js

- Cesium initialization must occur in browser-only client code; dynamically import it where required to avoid server-side rendering failures.
- Set `window.CESIUM_BASE_URL` before importing Cesium.
- Keep Cesium runtime asset copying idempotent and limited to the Cesium folders under `public/cesium/`.
- Clean up Cesium Viewer instances, event listeners, animation callbacks, entities, primitives and data sources when components unmount or relevant state changes.
- Do not create a Viewer on every React render.
- Do not leave Cesium's default WGS84 Earth model or default Earth imagery/terrain in a lunar scene.
- Do not expose access tokens or privileged provider credentials in client code.

### Geospatial and data processing

- Read and validate WMTS GetCapabilities before coding a Moon Trek layer.
- Do not guess layer IDs, styles, tile matrix sets, tile labels, projections, extents, image format or endpoints.
- Keep raster retrieval, projection conversion, DEM parsing, mesh generation and hazard calculations out of React view components.
- Record lunar coordinate convention, CRS/frame, vertical datum, units, resolution, no-data values, product/source version, retrieval time and processing method.
- Never treat image pixels or WMTS tiles as elevation measurements.
- Do not present synthetic/test terrain as NASA-measured terrain.
- Check memory use and tile/DEM subset sizes. Do not download entire global products when a regional subset is sufficient.

### Rover simulation and hazards

- Reuse the existing General Rover profile; do not invent engineering parameters.
- Clearly label visual interpolation as visual playback, not full rover physics.
- Keep rendering collisions/raycasts distinct from terrain-derived hazard analysis.
- Thresholds for slope, roughness, crater boundaries or other hazards must be documented and tested.
- Only emit rock/boulder detections when supported by appropriate high-resolution data and a validated detector.
- A no-hazard result is not proof of a safe route.
- Route replanning requires an explicit cost model and validated pathfinding implementation.
- Do not claim that collision was avoided unless the implemented simulation actually computed that outcome.
- Keep UI rendering, NASA data services, terrain transforms, route calculations and hazard logic in separate modules.

### UI and performance

- Reuse existing CSS tokens and shadcn/ui components. Do not scatter hard-coded colors or add a competing visual theme.
- Keep the 3D viewport responsive and avoid rendering hidden/duplicate WebGL viewers.
- Respect reduced motion and provide keyboard/touch alternatives for camera and playback controls.
- Ensure that the 3D scene cleans up resources to prevent WebGL context leaks.
- Use explicit loading, partial, unavailable and error states.
- Add tests for coordinate transforms, route interpolation, state transitions, DEM no-data handling, hazard thresholds and synchronization between scene and telemetry.

### AI/SI provenance

- Record the source and licence/provenance for rover models and any textures.
- Clearly label illustrative or synthetic terrain as illustrative; never mix it into measured terrain calculations.
- Follow the challenge's SI disclosure rules for AI-generated images/videos, audio, code and data.
- Do not generate, alter, or include NASA logos, flags, mission identifiers or NASA design elements in SI-generated assets.
