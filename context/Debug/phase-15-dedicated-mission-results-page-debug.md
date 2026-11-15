# Phase 15 — Dedicated Mission Operational Results Page
## Debug, Refactor, Implementation, and Completion Verification Specification

## 1. Objective

Replace the current workflow where the final mission result is displayed inside the Analysis page/sidebar with a dedicated, full-page **Mission Operational Results** page.

The dedicated results page must use the approved glassmorphism reference image from the conversation as its visual target:

`/mnt/data/a_large_sleek_sci_fi_glassmorphism_dashboard_ui_o.png`

The reference establishes:
- Full-screen lunar/space background with a visible horizon and central illuminated path.
- A compact top navigation/header.
- Centered `MISSION OPERATIONAL RESULTS` page title.
- Two large, equally sized, horizontally aligned glass panels.
- **Power Situation** on the left.
- **Terrain & Communication Situation** on the right.
- Spacious inner metric tiles, aligned headings, readable status badges, dedicated warning/explanation areas, and scientific provenance footers.
- Cool blue smoked-glass surfaces, fine cyan/ice-blue borders, subtle highlights, and soft shadows.

Do not treat the generated reference image as a source of live values. Use it only as a layout and styling reference.

The goal is to refactor presentation and navigation, not to rewrite scientific calculations.

---

## 2. Non-negotiable project constraints

Before editing:
- Inspect the current Next.js 16 + TypeScript + Tailwind + shadcn/ui project.
- Read `package.json`, route structure, app layout, existing navigation, and current Analysis page.
- Locate the existing Power Situation and Terrain & Communication Situation components.
- Locate their current data sources, state management, API calls, and scientific calculation services.
- Locate the current mission results page/sidebar rendering and determine whether a results route already exists.
- Locate the actual background image asset in the repository. Reuse the existing public asset for the approved lunar background if present. Do not reference a Windows absolute path from browser code.
- Locate the exact approved reference image if it has been added to the project. If it is not present, use the screenshot/reference supplied in the conversation as the visual specification; do not block implementation solely because the reference file is not copied into the repository.

Do not:
- Change or rewrite Phase 7–13 scientific calculations.
- Replace live API results with hardcoded screenshot values.
- Create duplicate energy, Horizons, terrain, route, or communication calculations.
- Remove mission input functionality.
- Remove the 3D Simulation page or its navigation.
- Remove the Analysis workflow if it is still needed to run calculations or inspect intermediate scientific data.
- Mark the final result as valid if required analysis is incomplete.
- Mark the phase complete solely because a page or component file exists.

Important interpretation of “remove the Analysis page showing the final result”:
- Remove the final Power Situation and Terrain & Communication Situation result cards from the Analysis page/sidebar.
- Move the final result presentation to the dedicated Mission Operational Results page.
- Keep any analysis controls, intermediate diagnostics, map, input workflow, and scientific debug functions that are still needed by the mission workflow.
- Do not delete the entire Analysis page unless inspection confirms it contains nothing except the final result cards and no workflow depends on it.
- If the Analysis page is fully replaced, preserve a safe redirect or a clearly explained route transition. Do not leave broken links.

---

## 3. Dedicated page and routing

Create a dedicated route using the actual Next.js App Router conventions. Preferred route:

`/mission-results`

Page title:
**Mission Operational Results**

Provide:
- A top navigation/header consistent with the existing app.
- A clear selected/active Results navigation state.
- A link back to the mission workspace/analysis workflow.
- Existing Dashboard and 3D Simulation navigation, where applicable.
- A visible mission analysis status indicator derived from real app state, not hardcoded as “complete”.

Navigation requirements:
- Add a clear **View Results** / **Mission Operational Results** action from the workspace once results are available.
- Direct navigation to `/mission-results` must work.
- Refreshing the page must work.
- If results are not available, show a useful empty state with an action to return to Mission Analysis and run it.
- If mission inputs or analysis settings change after results were generated, mark the report/results as stale.
- Use the existing canonical mission state and persistence strategy.
- Do not invent a second state store or hardcode sample results.
- Provide a return-to-analysis/workspace action.

If the Analysis page route is no longer needed:
- Only redirect or retire it after confirming no controls, map, inputs, or diagnostics depend on it.
- Document the route decision in the final implementation report.

---

## 4. Approved page layout

Use the supplied approved reference as the visual target, not the earlier cramped mockups.

### A. Overall page

- Full-viewport background using the existing approved lunar/space image asset.
- `background-size: cover`, centered, no-repeat.
- Apply only a restrained dark navy page overlay if required for legibility.
- Keep the background recognizable and visible, especially the horizon/path region.
- Center the page content in a max-width container.
- Avoid edge-to-edge cards.
- Maintain comfortable top and side margins.
- The page must scroll vertically if necessary; never clip content to force a fixed-height layout.

### B. Header and title

- Existing LMP brand/logo.
- Navigation items based on actual app routes, including Dashboard, Analysis, Simulation, and Results where available.
- Results should appear active.
- A mission status pill driven by real analysis state.
- Centered title: `MISSION OPERATIONAL RESULTS`.
- Subtitle: `Lunar Rover Mission Assessment` or equivalent project wording.

### C. Two main cards

Use a two-column CSS grid on desktop:
- Left card: Power Situation.
- Right card: Terrain & Communication Situation.
- Equal width and visual weight.
- Equal top alignment.
- Similar overall card height when content permits, but allow natural height expansion if one card has more content.
- Consistent 24–32px inter-card gap.
- Center the two-card group horizontally.
- Do not position cards at extreme viewport corners.

Suggested container:
- `width: min(calc(100% - 48px), 1480px)`
- `margin-inline: auto`
- `grid-template-columns: repeat(2, minmax(0, 1fr))`
- `gap: clamp(20px, 3vw, 40px)`

### D. Card visual treatment

Use the approved glassmorphism reference:
- Smoked deep-navy glass background with enough translucency to show the background through it.
- Approximate starting surface: `rgba(9, 22, 36, 0.68)`; tune visually against the actual background and text contrast.
- `backdrop-filter: blur(18px) saturate(135%)`.
- Matching `-webkit-backdrop-filter`.
- Thin cyan/ice-blue border with restrained opacity.
- Soft external shadow, not a heavy black box shadow.
- Very subtle top-edge highlight.
- Rounded corners around 24–30px.
- Do not make cards so transparent that metric text loses contrast.
- Avoid thick neon outlines or strong continuous glow.

Suggested CSS starting point:

```css
.mission-result-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgba(155, 213, 239, 0.30);
  border-radius: 26px;
  background: rgba(9, 22, 36, 0.68);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  backdrop-filter: blur(18px) saturate(135%);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(235, 249, 255, 0.12);
}

.mission-result-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(220, 246, 255, 0.55),
    transparent
  );
  pointer-events: none;
}
```

This is a starting point. Use existing project tokens and check contrast in the real browser.

### E. Inner metric tiles

- Use smaller smoked-glass tiles inside the main cards.
- Keep metric tiles aligned in a consistent 2-column grid where possible.
- Use consistent tile padding, corner radius, and label/value spacing.
- Metric labels should be subdued but readable.
- Main values should be visually prominent.
- Units must remain visible.
- Use color only to communicate meaningful status:
  - Cyan/ice blue: neutral or informational.
  - Green: validated active/healthy/pass.
  - Amber: warning or marginal.
  - Red: validated critical obstruction/failure.
  - Grey: unavailable/not evaluated.
- Never use green to represent missing or unevaluated values.
- Avoid unnecessary decorative icons or emoji. Reuse the project's existing icon library and icon conventions.

### F. Card content organization

Power Situation:
- Header and real generation status.
- Direct solar power with W.
- Panel area with m².
- Total solar energy with Wh/kWh.
- Analysis duration with hours.
- Rover consumption and drive/idle context.
- Net energy margin/post-reserve status.
- Route/destination status and explanatory text.
- Model/data provenance footer.

Terrain & Communication Situation:
- Header and geometric visibility/communication status.
- Earth horizon elevation and azimuth with units.
- Terrain obstruction status.
- Route corridor hazard status.
- Plain-language explanation.
- Warning that geometric visibility does not establish operational radio-link availability.
- Terrain line-of-sight status only if DEM ray tracing is actually implemented and verified.
- Model/source/provenance footer and epoch/time when available.

Preserve every field that the existing components currently support. Do not drop content to match the reference image.

---

## 5. Responsive behavior

Desktop:
- Two equal columns.
- Cards side by side.
- Centered group and balanced spacing.

Tablet:
- Two columns only if each card remains readable.
- Otherwise stack at the project's tablet breakpoint.

Mobile:
- Single column.
- Power Situation first.
- Terrain & Communication Situation second.
- No horizontal scrolling.
- All metric labels, values, warnings, and provenance must remain visible.
- No clipped card footer or fixed-height content region.

Test at minimum:
- 1440px desktop.
- 1024px tablet/compact desktop.
- 768px tablet.
- 390px mobile.

---

## 6. Component refactor

Refactor the existing detailed result cards into reusable components only if necessary.

Suggested structure (adapt to the actual project):

```text
components/
  mission-results/
    mission-operational-results-page.tsx
    power-situation-card.tsx
    terrain-communication-card.tsx
    result-metric-tile.tsx
    result-status-badge.tsx
```

Do not duplicate these components if equivalent reusable components already exist.

The dedicated results page should compose the existing card components and consume the same canonical analysis state/API data as the previous implementation.

Sidebar/Analysis page:
- Remove the full detailed Power Situation card.
- Remove the full detailed Terrain & Communication Situation card.
- Add a compact Results navigation link/button or small status summary.
- Preserve mission input, run-analysis controls, map, diagnostics, and intermediate outputs needed for the workflow.

---

## 7. Backend and data integrity

This is primarily a frontend route/layout refactor. Reuse the current backend and data services.

- Do not create new scientific endpoints unless the existing architecture genuinely requires one.
- Do not change Phase 7–13 calculation algorithms.
- Do not replace provider responses with fixture data in production.
- Do not hardcode reference screenshot values such as 10.7 W, 42.72 Wh, -6.78°, or 352.99°.
- Keep the current canonical result data model.
- Preserve data timestamps, units, source labels, uncertainty, warnings, and failure states.
- Preserve distinction between:
  - Geometric Earth visibility.
  - Terrain line-of-sight visibility.
  - Operational radio-link availability.
- Preserve distinction between:
  - Solar illumination.
  - Instantaneous solar power.
  - Integrated solar energy.
  - Battery energy and rover energy consumption.
- Keep `Not Evaluated`, `Unavailable`, `Partial`, and `Failed` states as they are.
- A valid numeric zero must remain distinguishable from a missing value.
- Do not show the mission as complete unless the real analysis workflow reports completion.

---

## 8. Debug page / implementation procedure

Before changing code, record the actual source files and data path.

### Debug inventory

- [ ] Current Analysis page route identified.
- [ ] Existing detailed Power Situation component identified.
- [ ] Existing detailed Terrain & Communication Situation component identified.
- [ ] Current source of power data identified.
- [ ] Current source of Horizons/communication data identified.
- [ ] Current source of terrain/route data identified.
- [ ] Existing mission state persistence strategy identified.
- [ ] Existing full-page background asset path identified.
- [ ] Existing navigation components identified.
- [ ] Existing tests and scripts identified.

### Implementation sequence

1. Extract or reuse the existing Power Situation card component.
2. Extract or reuse the existing Terrain & Communication Situation card component.
3. Create `/mission-results`.
4. Compose both cards in the approved two-column glassmorphism layout.
5. Apply the approved full-page background asset.
6. Add the Results navigation action.
7. Remove the two detailed cards from the Analysis page/sidebar.
8. Preserve all analysis controls and intermediate scientific workflows.
9. Add empty, loading, stale, partial, error, and completed states based on actual result state.
10. Verify desktop and mobile layout.
11. Run automated checks and inspect the running browser page.
12. Fix any regressions before marking complete.

---

## 9. Mandatory implementation and output checks

The phase is not complete merely because the page route exists or the cards look correct with mock data.

### Route and navigation checks

- [ ] `/mission-results` resolves successfully.
- [ ] Results navigation opens the dedicated page.
- [ ] The Results navigation item appears active on the dedicated page.
- [ ] Return-to-analysis/workspace navigation works.
- [ ] Refreshing the results route works.
- [ ] Empty state appears when no result state exists.
- [ ] Analysis page no longer displays the full detailed result cards.
- [ ] Analysis page still retains required controls and workflows.
- [ ] No broken route or navigation link remains.

### Visual checks

- [ ] Approved lunar/space background is loaded.
- [ ] Background remains visible through the page.
- [ ] Page heading is centered.
- [ ] Both cards are centered as one group.
- [ ] Cards have equal desktop widths and aligned top edges.
- [ ] Inter-card gap is consistent.
- [ ] Glassmorphism is visible but text remains readable.
- [ ] Inner metric tiles align consistently.
- [ ] Warnings and provenance are not clipped.
- [ ] No unwanted horizontal scrolling.
- [ ] Mobile cards stack in the correct order.
- [ ] Layout matches the approved reference image closely.

### Power Situation content checks

- [ ] Header and status.
- [ ] Direct solar power and W.
- [ ] Panel area and m².
- [ ] Total solar energy and Wh/kWh.
- [ ] Analysis duration and h.
- [ ] Rover consumption state and context.
- [ ] Net energy margin/post-reserve state.
- [ ] Route/destination state and explanatory message.
- [ ] Model/source provenance.
- [ ] Correct unavailable/not-evaluated handling.

### Terrain & Communication content checks

- [ ] Header and status.
- [ ] Geometric visibility.
- [ ] Earth horizon elevation and azimuth with units.
- [ ] Terrain obstruction state.
- [ ] Route corridor hazards.
- [ ] Plain-language explanation.
- [ ] Geometric visibility versus operational link warning.
- [ ] Terrain LOS claim only if verified DEM ray tracing exists.
- [ ] Model/source/provenance and epoch/time.
- [ ] Correct unavailable/not-evaluated handling.

### Data/backend checks

- [ ] Both cards use the same canonical result state/API data as before.
- [ ] No reference-image values are hardcoded.
- [ ] Units and timestamps are preserved.
- [ ] No scientific calculation is duplicated.
- [ ] Stale results are identified.
- [ ] Analysis completion badge reflects real state.
- [ ] Errors are surfaced clearly.
- [ ] Missing data is not rendered as a false zero or success.

### Regression checks

- [ ] Mission inputs still work.
- [ ] Run Mission Analysis still works.
- [ ] Lunar map still works.
- [ ] Phase 7 Horizons output still works.
- [ ] Phase 8 Solar Energy still works.
- [ ] Phase 9 lightning pin is unchanged.
- [ ] Phase 10 rover energy/traverse logic still works.
- [ ] Phase 11 route terrain analysis still works.
- [ ] Phase 12 3D Simulation still works.
- [ ] Phase 13 Power Situation and Terrain & Communication data remain available.
- [ ] No new console errors or failed network requests.

---

## 10. Automated tests and browser verification

Use the testing libraries already installed in the repository.

Add/update tests for:
- Results route renders.
- Both result cards render.
- Real supplied state values appear in the correct card.
- Missing fields render the correct unavailable/not-evaluated state.
- Results navigation works.
- Detailed cards are absent from the Analysis sidebar.
- Analysis controls remain present.
- Mobile layout stacks the cards.
- Desktop layout renders two columns.
- Background asset resolves.
- Stale/empty/error states render correctly.

Run the actual scripts present in `package.json`:
- Type checking.
- Linting.
- Unit/component tests.
- Production build.

Browser verification:
1. Open the Analysis/workspace page.
2. Confirm detailed result cards are no longer embedded in the sidebar.
3. Run or load a real mission analysis.
4. Open `/mission-results`.
5. Verify the header and background.
6. Verify both cards are centered and balanced.
7. Verify all available Power Situation fields.
8. Verify all available Terrain & Communication fields.
9. Verify provenance and warnings.
10. Refresh the page and check state persistence.
11. Change mission input and verify stale-state behavior.
12. Test desktop, tablet, and mobile.
13. Inspect browser console and network failures.

If the browser or a required external data provider is unavailable, report the limitation. Do not claim that browser verification passed without actually running it.

---

## 11. Completion gate

Do not mark Phase 15 complete until:
- The dedicated results route is implemented and reachable.
- Both existing result cards are moved out of the Analysis sidebar.
- The approved glassmorphism reference is implemented closely.
- The actual background image loads.
- Both cards render the existing real result data.
- All supported fields and warnings remain visible.
- Analysis controls and upstream workflows remain functional.
- All automated checks pass.
- Desktop and mobile browser verification passes.

If any item fails:
- Fix it if possible.
- Otherwise label it `PARTIAL`, `BLOCKED`, or `FAIL`.
- Identify the exact file, check, error, and next action.
- Do not mark the phase complete because a static mockup looks correct.

Use these statuses in the final implementation report:
- `PASS — already implemented and verified`
- `IMPLEMENTED — added and verified`
- `PARTIAL — partly working`
- `BLOCKED — unavailable asset, data, provider, or environment`
- `FAIL — verification failed`

---

## 12. Final implementation report

At completion, provide:
1. New results route.
2. Files created and modified.
3. Which result components were reused/extracted.
4. Which detailed cards were removed from Analysis/sidebar.
5. Which Analysis controls and workflows were preserved.
6. Background asset path and load verification.
7. Desktop/tablet/mobile visual verification.
8. Field-by-field output verification for both cards.
9. Backend/state/API source used by each card.
10. Automated test commands and actual results.
11. Lint, type-check, and production build results.
12. Any remaining partial, blocked, or failed items.

Never claim the phase is complete without evidence from actual code and tests.


---

## 13. Expanded end-to-end verification matrix — check every item

Run this expanded matrix in addition to the checks above. A checkbox may be marked PASS only after the implementation has been inspected or tested. If an item does not apply, record `N/A` with a reason; do not silently skip it.

### A. Complete page-render verification

- [ ] Page title and subtitle are visible.
- [ ] Header/logo is visible and correctly aligned.
- [ ] Navigation is visible and all links resolve.
- [ ] Results navigation state is active.
- [ ] Mission status badge reflects the actual analysis lifecycle.
- [ ] Background image is the intended lunar/space asset.
- [ ] Background image is loaded from a valid public URL.
- [ ] Background is behind all page content.
- [ ] Background is not stretched, tiled, or obscured by an opaque page layer.
- [ ] Page overlay preserves readability without hiding the image.
- [ ] Main content has a maximum width and is horizontally centered.
- [ ] Both result cards are visible on initial desktop viewport.
- [ ] Power Situation is on the left.
- [ ] Terrain & Communication Situation is on the right.
- [ ] Both cards have matching top alignment and balanced visual weight.
- [ ] Main cards have consistent radius, border, glass opacity, blur, and shadow.
- [ ] Card text contrast is readable over both bright and dark areas of the background.
- [ ] Inner metric tiles use consistent spacing and alignment.
- [ ] No text, icon, badge, metric, warning, or footer is clipped.
- [ ] No overlapping elements or accidental card collisions.
- [ ] No horizontal scrollbar appears at supported viewport widths.
- [ ] Page can scroll to the full content if content exceeds viewport height.

### B. Power Situation — field-by-field checks

For each field, verify both its label and its value/state. Verify units whenever the field is numeric.

- [ ] Power Situation heading.
- [ ] Solar generation state/badge.
- [ ] Direct solar power value.
- [ ] Direct solar power unit (`W`).
- [ ] Solar panel area.
- [ ] Panel area unit (`m²`).
- [ ] Total solar energy value.
- [ ] Total solar energy unit (`Wh` or `kWh`).
- [ ] Analysis duration.
- [ ] Duration unit (`h`).
- [ ] Rover consumption state/value.
- [ ] Drive consumption context.
- [ ] Idle consumption context.
- [ ] Net energy margin.
- [ ] Post-reserve/battery reserve interpretation.
- [ ] Source/destination route state.
- [ ] Empty-route explanation when no destination is supplied.
- [ ] Rover energy/traverse status when route and rover configuration exist.
- [ ] Model name/source.
- [ ] Data timestamp/epoch where provided.
- [ ] Missing panel configuration is not replaced by assumed values.
- [ ] Missing battery/load inputs are not replaced by invented values.
- [ ] Valid zero power/energy is shown as zero, not as missing.
- [ ] Unavailable energy is not shown as zero.
- [ ] Not-evaluated energy is not shown as a successful/green result.
- [ ] Energy values match the canonical Phase 8/10 analysis result.

### C. Terrain & Communication Situation — field-by-field checks

- [ ] Terrain & Communication Situation heading.
- [ ] Geometric visibility state.
- [ ] Earth horizon elevation.
- [ ] Elevation unit (`°`).
- [ ] Earth horizon azimuth.
- [ ] Azimuth unit (`°`).
- [ ] Horizons target/source information.
- [ ] Observation epoch/time and UTC label when available.
- [ ] Terrain obstruction state.
- [ ] Route corridor hazard state.
- [ ] Route hazard count when the validated detector supplies one.
- [ ] Crater hazard information when the validated detector supplies it.
- [ ] Boulder/rock hazard information when suitable imagery and detection are available.
- [ ] Slope information and units when DEM analysis supplies it.
- [ ] Surface roughness information when the terrain model supplies it.
- [ ] Elevation profile information when route sampling supplies it.
- [ ] Plain-language communication explanation.
- [ ] Geometric visibility warning is present.
- [ ] Operational radio link is not claimed without a link budget.
- [ ] Terrain line-of-sight is not claimed without a verified DEM ray-tracing result.
- [ ] Route hazards are not conflated with Earth communication obstruction.
- [ ] Missing terrain coverage is shown as unavailable/partial, not clear/safe.
- [ ] Zero hazards is shown only when valid coverage and detector output support zero.
- [ ] Model/source, DEM resolution, coverage, and provenance are shown when available.
- [ ] Terrain/communication values match the canonical Phase 7/11 analysis results.

### D. Scientific interpretation and verdict checks

- [ ] Landing suitability is not inferred from rover traverse feasibility alone.
- [ ] Landing safety is not declared unless landing-specific criteria and data are implemented.
- [ ] Power sufficiency is not inferred from solar illumination alone.
- [ ] Battery reserve is included when the energy model supports it.
- [ ] Geometric Earth visibility is not described as a confirmed radio link.
- [ ] Terrain LOS is distinguished from geometric horizon visibility.
- [ ] Single-time illumination is not described as mission-duration energy.
- [ ] Missing/partial data does not produce a PASS.
- [ ] Uncertainty, data coverage, and configured thresholds are disclosed.
- [ ] The overall status is generated from actual available evidence and explicit rules.
- [ ] If required evidence is missing, overall status is `INSUFFICIENT DATA` or equivalent.
- [ ] Each warning links to or identifies the affected result where possible.

### E. Analysis page extraction checks

- [ ] Full Power Situation card is removed from Analysis page/sidebar.
- [ ] Full Terrain & Communication Situation card is removed from Analysis page/sidebar.
- [ ] No duplicate detailed result cards remain in a second sidebar section.
- [ ] A compact link/status to Mission Operational Results remains available.
- [ ] Mission Input fields remain functional.
- [ ] Mission date/time controls remain functional.
- [ ] Compare Location remains functional if present.
- [ ] Solar Energy configuration remains functional.
- [ ] Rover Configuration remains functional.
- [ ] Traverse Configuration remains functional.
- [ ] Run Mission Analysis remains functional.
- [ ] Reset Inputs remains functional.
- [ ] Lunar Map remains functional.
- [ ] Map markers and route overlays remain functional.
- [ ] Intermediate scientific diagnostics remain available where needed.
- [ ] 3D Simulation navigation/page remains functional.
- [ ] No orphaned component imports or dead navigation links remain.

### F. Cross-phase regression checks

Verify the relevant existing feature, not merely its presence in the codebase.

- [ ] Phase 1 dependency/build setup remains valid.
- [ ] Phase 2 mission input UI and validation remain functional.
- [ ] Phase 3 background video component remains unchanged and functional.
- [ ] Phase 4 three-panel workspace and map remain functional.
- [ ] Phase 5 LROC/QuickMap imagery and coordinate handling remain functional.
- [ ] Phase 6 integrated analysis workspace remains functional.
- [ ] Phase 7 Horizons Sun/Earth results remain correct and visible in their intended workflow.
- [ ] Phase 8 solar illumination/energy outputs remain correct.
- [ ] Phase 9 Solar Energy lightning pin remains present and unchanged.
- [ ] Phase 10 rover energy and traverse feasibility remain correct.
- [ ] Phase 11 terrain analysis remains correct and connected to route/DEM data.
- [ ] Phase 12 3D Simulation page remains reachable.
- [ ] Phase 13 Power Situation and Terrain & Communication Situation data remain intact.
- [ ] Phase 14 suitability/reporting logic, if already implemented, remains available and is not contradicted by the new page.
- [ ] No phase-specific styling or behavior has been unintentionally overwritten.

### G. Data lifecycle and failure-state checks

- [ ] Initial loading state is understandable.
- [ ] No-analysis empty state is understandable.
- [ ] Successful analysis state displays current results.
- [ ] Partial analysis state identifies missing sections.
- [ ] Provider/API failure state is visible and does not look like a pass.
- [ ] Stale result state appears after relevant inputs change.
- [ ] Re-running analysis refreshes the results page data.
- [ ] Refreshing the browser does not silently lose results if the project is designed to persist them.
- [ ] Direct URL navigation behaves correctly.
- [ ] Back navigation behaves correctly.
- [ ] Concurrent/repeated analysis requests do not display mismatched results.
- [ ] Old result values cannot be mistaken for results from newly changed coordinates/time.
- [ ] UTC/local time labels remain unambiguous.
- [ ] Data provenance is preserved across navigation.

### H. Responsive and accessibility checks

- [ ] 1440px desktop: two balanced columns.
- [ ] 1024px: no card compression or unreadable text.
- [ ] 768px: layout follows the chosen tablet breakpoint.
- [ ] 390px mobile: cards stack in correct order.
- [ ] Narrow mobile: no horizontal scrolling.
- [ ] Keyboard users can reach all navigation and actions.
- [ ] Focus indicators are visible.
- [ ] Status is not conveyed by color alone.
- [ ] Headings follow a logical hierarchy.
- [ ] Icons have accessible names when meaningful; decorative icons are hidden from assistive technology.
- [ ] Reduced-motion preference is respected.
- [ ] Text remains legible at browser zoom 200%.

### I. Engineering quality checks

- [ ] No TypeScript errors.
- [ ] No lint errors.
- [ ] No failed unit/component tests.
- [ ] No failed end-to-end tests.
- [ ] Production build completes.
- [ ] No React key warnings.
- [ ] No hydration mismatch warnings.
- [ ] No uncaught browser console errors.
- [ ] No unexpected 404s for images, fonts, routes, or API endpoints.
- [ ] No duplicated expensive scientific API requests caused by rendering the new page.
- [ ] No secrets or API keys exposed to the browser.
- [ ] No new dependency added without a clear need.
- [ ] Existing dependency and package scripts are used.
- [ ] No temporary debug fixtures are accidentally used as production data.

### J. Final evidence table

Before reporting completion, fill in this table with actual evidence:

| Area | Result | Evidence |
|---|---|---|
| Results route | PASS / FAIL | Route and browser result |
| Background asset | PASS / FAIL | Public asset path and network response |
| Centered two-card layout | PASS / FAIL | Desktop screenshot |
| Mobile layout | PASS / FAIL | Mobile screenshot/viewport |
| Power Situation fields | PASS / PARTIAL / FAIL | Field-by-field check |
| Terrain & Communication fields | PASS / PARTIAL / FAIL | Field-by-field check |
| Sidebar extraction | PASS / FAIL | Analysis page inspection |
| Analysis controls | PASS / FAIL | Interaction test |
| Backend/state connection | PASS / FAIL | API/state evidence |
| Empty/loading/error/stale states | PASS / PARTIAL / FAIL | Test results |
| Phase 1–13 regression | PASS / PARTIAL / FAIL | Regression test results |
| Type check | PASS / FAIL | Exact command and output |
| Lint | PASS / FAIL | Exact command and output |
| Unit/component tests | PASS / FAIL | Exact command and output |
| End-to-end tests | PASS / FAIL | Exact command and output |
| Production build | PASS / FAIL | Exact command and output |

The final status must be `PARTIAL` or `BLOCKED` if any critical item is unverified. Do not convert an unrun test into a PASS.
