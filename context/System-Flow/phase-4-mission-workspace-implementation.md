# Phase 4 — Full Lunar Mission Planner Workspace

## 1. Objective

Implement the complete mission-planning workspace shown in the Phase 4 reference screenshot.

The page must reproduce the screenshot's overall layout, proportions, component hierarchy, visual treatment, and interactions. It is the main workspace that users reach after entering or submitting mission details.

The workspace has three primary panels:

1. **Mission Input** — left panel.
2. **Lunar Map** — centre panel.
3. **Mission Analysis** — right panel.

Also implement the top navigation, background treatment, map selection overlay, map controls, analysis visual, loading/progress state, and completed-analysis state.

Use the supplied screenshot as the authoritative visual reference. It is 1672 × 941 pixels. Do not replace it with a generic dashboard design.

## 2. Required preliminary inspection

Before coding:

1. Read `context/AGENTS.md` and the relevant architecture, UI, code-standard, and progress context files.
2. Inspect the existing Phase 2 landing/input page.
3. Inspect the Phase 3 analysis-page video background work and current route structure.
4. Inspect installed packages, map libraries, data providers, validation modules, and tests.
5. Reuse existing components and tokens where appropriate.
6. Check the supplied screenshot and compare the current implementation with it.
7. Do not rebuild or duplicate working components unnecessarily.

Keep the landing/input page and its background separate from this workspace. Preserve the separate Analysis page MP4 behavior established in Phase 3 if it is already implemented. Do not accidentally place the Phase 3 video on the workspace unless the project design explicitly requires it.

## 3. Workspace layout

### Desktop composition

At the reference viewport of approximately 1672 × 941:

- Top navigation occupies a compact horizontal band across the top.
- Main workspace begins below the navigation.
- Three panels are aligned horizontally.
- Left Mission Input panel: approximately 20% of workspace width.
- Centre Lunar Map panel: approximately 52% of workspace width.
- Right Mission Analysis panel: approximately 25% of workspace width.
- Use consistent gaps between panels.
- Panels have matching rounded corners and thin cool-blue borders.
- The workspace panels should be tall and aligned.
- The lunar landscape remains visible below the panels as in the reference.
- Avoid unnecessary page scrolling at the reference desktop size.

The centre map is the visual focus and should receive the most width.

### Responsive behavior

Tablet:
- Reduce panel gaps and padding.
- Preserve the map's visual priority.
- Stack the analysis panel below the map if three columns become too narrow.
- Keep mission input accessible without clipping.

Mobile:
- Stack the panels vertically in this order:
  1. Mission Input
  2. Lunar Map
  3. Mission Analysis
- Keep all controls touch-accessible.
- Avoid horizontal overflow.
- Use a practical map height on narrow screens.
- Preserve panel headings and clear separation.
- Navigation may collapse or wrap while retaining its links.

## 4. Background and global theme

Use the existing project background assets and CSS tokens. Maintain the dark lunar mission-control aesthetic from the screenshot:

- Deep navy/near-black space background.
- Subtle star details if already present in the supplied background asset.
- Lunar terrain visible along the lower portion of the viewport where the existing background supports it.
- Cool blue panel borders and subtle blue highlights.
- Dark translucent panel surfaces.
- High-contrast white text and muted secondary text.

Do not introduce a new unrelated background image or regenerate the existing asset.

Use existing semantic theme tokens. Avoid scattering raw color values across components. If additional panel-specific tokens are needed, define them centrally.

The map imagery itself should remain clear and sufficiently bright. Do not apply the page's dark overlay over the map tiles or imagery.

## 5. Top navigation

Recreate the top navigation shown in the screenshot.

Left:
- Lunar/planet logo mark.
- Text: **Lunar Mission Planner**.

Right navigation:
- **Mission Planner** — active pill.
- **Analysis**
- **Compare**
- **About**

Requirements:
- Match the screenshot's spacing, alignment, font weight, and compact height.
- Active Mission Planner item uses a rounded blue/dark translucent pill.
- Use the project's icon library where an icon is required.
- Use semantic links.
- Link to routes that actually exist.
- Do not create dead links or routes that return 404.
- If Compare or About pages are not implemented, keep their destinations as explicit placeholders or disable them consistently with the existing navigation pattern.

## 6. Left panel — Mission Input

Panel title:
- Sliders/settings icon.
- **Mission Input**

Reproduce the fields and visual style shown in the reference.

### Landing Location

Section label:
- Location pin icon.
- **Landing Location**

Two inputs in one row on desktop:

| Field | Initial/example value | Validation |
|---|---:|---|
| Latitude (°) | `-89.50` | -90 through 90 |
| Longitude (°) | `0.00` | -180 through 180 |

Requirements:
- Preserve decimal precision for display where appropriate.
- Use numeric inputs with visible labels.
- Show inline validation errors.
- Do not silently clamp invalid values.

### Mission Date

Section label:
- Calendar icon.
- **Mission Date**

Example display in the screenshot:
- `15 Jan 2028`

Requirements:
- Use a date input or accessible date picker already installed.
- Store a stable date value.
- Validate required date input.
- Format the visible value consistently with the screenshot.

### Mission Time (UTC)

Section label:
- Clock icon.
- **Mission Time (UTC)**

Default/example value:
- `12:00`

Requirements:
- Treat the value as UTC.
- Do not silently convert it to the user's local timezone.
- Keep the selected hour and minute intact.

### Compare Location (Optional)

Section label:
- Layers/stack icon.
- **Compare Location (Optional)**

Placeholder:
- `e.g. -88.8, 12.4`

Requirements:
- Accept a latitude/longitude pair separated by a comma.
- Optional.
- Validate both coordinate ranges if supplied.
- Convert to a typed structured object before use.

### Analyse button

Text:
- **Analyse Mission Conditions**

Requirements:
- Full-width blue button with play/triangle icon.
- Match the screenshot's gradient, radius, spacing, and typography.
- Validate all required fields and optional comparison coordinates.
- On success, update the shared mission state and initiate the workspace analysis flow.
- Prevent duplicate submission while an operation is pending.
- Show an accessible disabled/loading state.
- Do not fabricate scientific results.

### Shared mission input type

Reuse the existing Phase 2 type/schema if present. Do not create duplicate types.

Expected conceptual payload:

```ts
export type MissionInput = {
  latitude: number;
  longitude: number;
  missionDate: string; // YYYY-MM-DD
  missionTimeUtc: string; // HH:mm
  additionalSite?: {
    latitude: number;
    longitude: number;
  };
};
```

## 7. Centre panel — Lunar Map

Panel header:
- Map icon.
- **Lunar Map**
- Subtitle: **Explore terrain, imagery and elevation**
- Layer selector on the right.

### Map provider and projection

Use the map library and lunar imagery/data provider already selected and documented in the project architecture.

Important:
- Do not assume an Earth web map projection or default Earth basemap is suitable for lunar coordinates.
- Confirm the provider's coordinate system, projection, tile scheme, and supported zoom levels.
- Use the correct lunar coordinate transformation.
- Do not invent map tiles, elevation values, or geographic features.
- If the selected provider/data source is not configured, show a clear unavailable/error state rather than fabricated imagery.

### Map imagery

The map should:
- Fill the central panel below its header.
- Display high-resolution lunar surface imagery where the configured source supports it.
- Centre or pan to the selected latitude/longitude.
- Update when mission coordinates change or are submitted.
- Maintain aspect ratio and resize correctly.
- Provide loading, error, and empty states.

### Selected coordinate overlay

When valid coordinates are selected:
- Draw a red rectangular selection box around the selected location.
- Draw a red centre crosshair/marker.
- Add a red coordinate callout connected to the selection box.
- Display latitude and longitude in the callout.
- Match the screenshot's red border, translucent red fill, line connector, and typography.
- Keep the marker anchored to the actual geographic coordinate when the map pans or zooms.
- Do not use fixed screen coordinates for a marker that should represent a geographic location.
- Ensure the marker remains visible and correctly positioned at different zoom levels.

The selection rectangle's geographic footprint or screen-space size must be explicitly defined. Do not imply that it represents a measured landing-site safety boundary unless its size is grounded in real data.

### Map controls

Recreate the controls shown in the screenshot:

- Zoom in (+).
- Zoom out (−).
- Recenter/locate selected coordinates.
- Layer selector control.

Controls must work:
- Zoom controls call the map library's zoom methods.
- Recenter control returns to the selected mission coordinate.
- Layer selector changes to a real configured layer.
- If a layer is unavailable, do not show it as selectable.
- Buttons must have accessible labels/tooltips.
- Do not leave decorative but nonfunctional controls.

### Layer selector

The screenshot shows:
- **LROC (High Resolution)**

Requirements:
- Use the layer name only if that actual source is configured.
- If multiple layers are available, list only verified configured layers.
- Keep layer metadata and source attribution available where required.
- Do not label generic imagery as LROC.

### Scale indicator

The screenshot shows a scale bar (0–10 km).

Requirements:
- Display a scale only if it is calculated from the actual map projection, zoom, and viewport.
- Do not hardcode a 10 km scale bar.
- If the map library/provider cannot provide a reliable scale, omit it.

### Coordinate status control

At the bottom-right of the map:
- Show a compact coordinate status/control with a crosshair icon.
- Display the current selected coordinates.
- Keep it synchronized with the form and map marker.

## 8. Right panel — Mission Analysis

Panel title:
- Analysis/chart icon.
- **Mission Analysis**
- Subtitle during processing: **Computing lunar environmental conditions...**

This panel has two principal states:

1. Processing/loading state.
2. Completed analysis state.

Keep the panel's dimensions stable between states to avoid layout shifts.

### 8.1 Processing/loading state

The screenshot includes a moon visual with an orbit-like blue circular arc.

Implement a decorative moon animation:
- A moon image/visual centred within a blue circular orbital ring.
- Subtle rotation, glow, or light movement.
- A small bright marker on the ring, if it can be implemented cleanly.
- Respect `prefers-reduced-motion`.
- Keep it decorative and hide it from assistive technology where appropriate.

The screenshot shows:
- **Analysing mission data...**

Below it, show four progress stages in a horizontal row on desktop:

1. **Fetching Terrain Data**
2. **Calculating Sun Position**
3. **Computing Earth Position**
4. **Generating Analysis**

Progress behavior:
- Use actual task states from the analysis workflow.
- Show completed, active, pending, and failed states distinctly.
- Do not advance progress using arbitrary timers or pretend that work has completed.
- If the backend does not expose granular progress, use an honest indeterminate loading state and do not mark individual steps complete.
- If a task fails, display the failure and a retry action where appropriate.
- Keep progress accessible with semantic status text or an appropriate progress role.

### 8.2 Completed analysis state

When real analysis data is available, replace the loading visual/progress content with analysis summaries.

Include the analysis categories specified by the project:

#### Sun Analysis
Display only calculated/source-backed fields such as:
- Sun azimuth.
- Sun elevation.
- Geometric horizon status.
- Terrain-aware illumination status only if terrain obstruction calculations are implemented.

Clearly distinguish geometric position from terrain-clear sunlight.

#### Earth Analysis
Display only calculated/source-backed fields such as:
- Earth azimuth.
- Earth elevation.
- Geometric horizon status.
- Terrain-aware line-of-sight only if terrain obstruction calculations are implemented.

Clearly distinguish geometric visibility from terrain-clear line of sight.

#### Communication Visibility
Display visibility windows only when the application has the necessary geometry and communication assumptions.
Do not claim a working radio link without antenna, relay, and link-budget constraints.
Clearly label any result as geometric visibility if that is all the system calculates.

#### Surrounding Terrain
Display only available and validated terrain metrics, such as:
- Elevation.
- Slope.
- Roughness.

Do not invent terrain values if the selected data source does not provide them.

#### Export Analysis
Provide a PDF export action only if a real export implementation is available.
Do not show a button that does nothing.
If PDF export is not part of this phase's implemented functionality, mark it as a future feature or omit the control.

## 9. Scientific correctness and architecture boundaries

The UI must not imply that visual placeholders are real mission analysis.

Keep responsibilities separate:

- UI components render values and states.
- Form schema validates user input.
- Service modules retrieve data from external providers.
- Analysis modules calculate astronomy/terrain results.
- Shared types define request and response contracts.

Important scientific distinctions:
- JPL Horizons provides astronomical positions, not local terrain obstruction.
- Geometric above-horizon is not the same as terrain-clear visibility.
- Terrain obstruction requires an appropriate elevation/terrain model and calculations.
- Communication visibility is not equivalent to a guaranteed operational radio link.
- A loading animation is decorative and must not represent an actual lunar phase calculation.

Do not place API calls or scientific calculations inside presentational components.

## 10. Component architecture

Follow existing project conventions and reuse current components.

Suggested structure:

```text
components/
  workspace/
    mission-workspace.tsx
    workspace-navigation.tsx
    mission-input-panel.tsx
    lunar-map-panel.tsx
    mission-analysis-panel.tsx
  mission-input/
    landing-location-fields.tsx
    mission-date-field.tsx
    mission-time-field.tsx
    compare-location-field.tsx
    analyse-mission-button.tsx
  lunar-map/
    lunar-map-view.tsx
    map-toolbar.tsx
    map-layer-selector.tsx
    selected-location-overlay.tsx
    map-coordinate-status.tsx
  mission-analysis/
    analysis-loading-state.tsx
    lunar-orbit-animation.tsx
    analysis-progress.tsx
    sun-analysis-card.tsx
    earth-analysis-card.tsx
    communication-visibility-card.tsx
    terrain-analysis-card.tsx
    export-analysis-action.tsx
```

The structure is a guide, not a requirement to create every file if equivalent components already exist.

Rules:
- Keep components small and replaceable.
- Keep map provider logic in a map adapter/service layer.
- Keep scientific calculations outside React presentation components.
- Reuse Phase 2 form schema and types.
- Do not duplicate UI libraries.
- Use the existing icon library.
- Avoid unnecessary client components; use client components only where browser interaction is required.

## 11. State and data flow

Define a clear shared flow:

1. User edits mission input.
2. Input is validated.
3. Validated mission input is stored in shared page state.
4. Map recentres and updates its selected-coordinate overlay.
5. Analysis workflow begins.
6. Actual task status is reflected in the analysis panel.
7. Real results are rendered when available.
8. Errors are presented with retry/recovery behavior.

Use the project's existing state management approach. Do not add a new global state library unless there is a documented need.

Ensure the form, map marker, coordinate status, and analysis request all use the same validated coordinate values.

## 12. Accessibility

Verify:
- Semantic page landmarks and headings.
- Visible labels for all form fields.
- Accessible names for map controls.
- Keyboard-operable controls.
- Visible focus indicators.
- Error text associated with the relevant field.
- Progress state announced accessibly.
- Decorative moon animation hidden from screen readers.
- Sufficient text contrast on dark panels.
- Reduced-motion support.
- Usability at 200% zoom.
- No critical functionality depends only on color.

## 13. Testing and verification

Use the testing tools already configured. Do not install duplicate test frameworks.

### Unit tests
- Coordinate validation boundaries.
- Optional compare-site parsing.
- Mission request payload.
- Progress-state mapping.
- Analysis result formatting.
- No fabricated defaults for unavailable scientific data.

### Component tests
- All three panels render.
- Navigation active state is correct.
- Mission input defaults and validation work.
- Analyse action sends validated values.
- Map controls invoke the expected map adapter methods.
- Layer selector only offers configured layers.
- Marker callout reflects selected coordinates.
- Loading state shows the four specified stages.
- Completed state renders actual provided results.
- Error state and retry behavior work.
- Reduced-motion behavior disables decorative animation.

### Browser/E2E tests
- Workspace loads without console errors.
- Desktop three-column layout matches the reference.
- Tablet and mobile layouts stack correctly.
- Form edits update selected coordinates.
- Valid submission updates the map and begins analysis.
- Invalid submission shows errors and does not start analysis.
- Map controls work.
- Map imagery errors are handled visibly.
- Loading state is stable and does not cause layout shifts.
- Analysis errors do not show fabricated results.
- Keyboard navigation works.
- Reduced-motion preference is respected.

### Visual comparison

Capture screenshots at:
- Reference desktop: `1672 × 941`.
- Tablet: approximately `1024 × 768`.
- Mobile: approximately `390 × 844`.

Compare:
- Navigation height and alignment.
- Panel widths, gaps, border, and radius.
- Mission Input typography and field spacing.
- Map header and image viewport.
- Red selection rectangle and coordinate callout.
- Map control placement.
- Right analysis panel moon/orbit visual.
- Progress indicator alignment and labels.
- Background terrain visibility below the panels.
- Overall contrast and visual balance.

Do not claim pixel-perfect matching without inspecting an actual screenshot of the implemented page.

## 14. Scope boundaries

In scope:
- Full workspace page and navigation.
- Mission Input panel.
- Lunar Map panel and real map controls.
- Selected-coordinate overlay.
- Mission Analysis panel.
- Loading and progress states.
- Completed analysis presentation for real data supplied by existing services.
- Responsive behavior.
- Accessibility.
- Tests and visual comparison.

Out of scope unless already implemented and verified:
- Inventing or fabricating scientific data.
- Claiming terrain-aware sunlight without terrain calculations.
- Claiming terrain-clear Earth line of sight without terrain calculations.
- Claiming operational communications without a link budget and relay assumptions.
- Fake progress completion.
- Fake map layers or scale bars.
- New authentication system.
- Replacing the existing landing page.
- Replacing the separate Phase 3 Analysis page background.

## 15. Completion criteria

- [ ] Existing Phase 2 and Phase 3 work inspected and preserved.
- [ ] Workspace matches the supplied reference composition.
- [ ] Top navigation implemented with valid destinations.
- [ ] Mission Input panel includes all specified fields and validation.
- [ ] Lunar Map panel uses the configured lunar map provider and correct projection.
- [ ] Map zoom, recenter, and layer controls work.
- [ ] Selected location marker and coordinate callout stay geographically anchored.
- [ ] Scale bar is shown only when reliable.
- [ ] Mission Analysis panel includes loading and completed/error states.
- [ ] Moon/orbit animation is decorative and respects reduced motion.
- [ ] Four progress stages are displayed without fake progress.
- [ ] Analysis values are source-backed and scientifically qualified.
- [ ] Desktop, tablet, and mobile layouts work.
- [ ] Accessibility checks pass.
- [ ] Unit, component, and E2E tests pass, or limitations are documented.
- [ ] ESLint, TypeScript check, and production build pass.
- [ ] Visual screenshots have been reviewed against the supplied reference.
- [ ] No dead controls, fake data, or broken routes remain.

## 16. Required completion report

When finished, report:

1. Files created and modified.
2. Routes added or changed.
3. Components implemented.
4. Map provider, projection, and layer configuration used.
5. Map controls and selected-coordinate behavior verified.
6. Mission form validation and shared state flow.
7. Analysis states and data sources actually connected.
8. Which scientific calculations are real and which remain unavailable.
9. Tests and commands run with results.
10. Screenshots/viewports reviewed.
11. Known limitations and next-phase dependencies.

Do not claim completion for a feature that is only a visual placeholder. Clearly distinguish implemented UI from working data integration and scientific calculations.
