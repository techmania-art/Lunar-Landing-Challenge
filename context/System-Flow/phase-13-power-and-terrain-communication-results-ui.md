# Phase 13 — Mission Results UI: Power Situation and Terrain/Communication Situation

## Objective

Implement the **results UI only** for the Lunar Mission Planner. Display two separate, visually distinct result boxes side by side:

- **Left box: Power Situation** — uses `energy.jpg` as its background.
- **Right box: Terrain & Communication Situation** — uses a clean, smooth, solid/translucent UI surface with no background image. It presents whether terrain is interrupting or obstructing communication.

Use the existing dark technical UI theme. Keep the Power Situation image treatment, but do not place `terrain.jpg` or any other background image inside the Terrain & Communication Situation card.

This phase is a frontend presentation task only. Do not implement new scientific calculations, terrain processing, radio/link-budget calculations, or backend services. Connect to existing result state/API data if it already exists. If a value is not available, show an honest unavailable/placeholder state; do not invent a result.

---

## 1. Inspect the existing project first

Before editing:
- Inspect the existing mission results/analysis page and identify where final results are currently rendered.
- Inspect existing Solar Energy, Terrain Analysis, Communication Visibility, and Phase 10 rover/energy result components.
- Reuse existing data types, state, API response fields, and formatting utilities where available.
- Inspect the project's existing theme tokens and card styles.
- Preserve all existing functionality and navigation, including the `/3d-simulation` route from Phase 12.
- Do not duplicate result calculations or introduce a second source of truth.
- Do not add dependencies for this UI task.

The requested two-box layout should be added to the appropriate final-results area, not placed over the central Lunar Map unless that is how the existing application presents final results.

## 2. Background assets

### A. Power Situation background

Use the supplied local asset:

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\energy.jpg`

Copy it into the project's public asset directory, following existing conventions. Preferred destination:

`public/assets/energy.jpg`

Use the browser path:

`/assets/energy.jpg`

Do not reference the Windows absolute path in browser code. Verify the asset exists and loads. If it cannot be accessed, report that as a blocker; do not silently substitute another image.

### B. Terrain & Communication Situation surface

Do **not** use `terrain.jpg` as a background in this card. Do not copy, load, reference, or apply the Phase 11 terrain image for this card.

Build the Terrain & Communication Situation card as a clean, smooth surface:
- Use the existing dark surface/elevated-surface theme token.
- Use a subtle border and consistent corner radius.
- Use restrained spacing and clear typography.
- Use a very subtle surface gradient only if it improves depth; do not use an image.
- Keep the card visually calm and uncluttered.
- Keep the content readable without a backdrop image or image overlay.

### C. Background and legibility rules

- Apply `energy.jpg` only to the Power Situation card.
- The Terrain & Communication Situation card must have no background image.
- Keep the Power card image readable with an appropriate overlay and legible foreground content.
- Do not use either decorative image as scientific input.

Suggested styling direction:

```css
.power-situation-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background-image:
    linear-gradient(rgba(8, 8, 9, 0.42), rgba(8, 8, 9, 0.60)),
    url("/assets/energy.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.terrain-communication-card {
  background: var(--bg-surface, #111114);
  border: 1px solid var(--border-default, #2a2a30);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}
```

Adapt to existing project tokens and component conventions. Do not add an image, pseudo-element image, or image-backed overlay to `.terrain-communication-card`.

---

## 3. Layout and visual theme

### Two-card layout

Create two separate result cards in one responsive row:

| Left | Right |
|---|---|
| Power Situation | Terrain & Communication Situation |
| `energy.jpg` background | `terrain.jpg` background |
| Power/energy output | Terrain-caused communication status |

Requirements:
- Equal visual importance and consistent card height on desktop where practical.
- Consistent border, corner radius, padding, heading treatment, and spacing.
- Maintain the established dark theme and cyan accent.
- Use the existing Geist typography and project design tokens.
- Avoid excessive glow or bright overlays.
- Keep enough contrast between background and foreground content.
- At narrower widths, stack the cards vertically in a logical order: Power Situation first, Terrain & Communication Situation second.
- Do not cause horizontal overflow.

Use the existing theme tokens where available. The established palette includes:
- Base background: `#080809`
- Surface: `#111114`
- Elevated surface: `#18181c`
- Default border: `#2a2a30`
- Primary text: `#f0f0f4`
- Secondary text: `#c0c0cc`
- Muted text: `#808090`
- Cyan accent: `#00c8d4`
- Success: `#34d399`
- Warning: `#fbbf24`
- Error: `#ff4d4f`

Do not redefine global theme tokens just for these two cards.

---

## 4. Left card — Power Situation

### Heading

**Power Situation**

Use the energy background image behind this card.

### Display fields

Use only fields already supplied by the existing solar-energy and rover-energy result models. Show the relevant values that exist, such as:
- Current power situation/status
- Solar generation or available power (W)
- Estimated energy generated over the configured interval (Wh or kWh)
- Rover energy consumption (W or Wh, if available)
- Battery state of charge (%), if available
- Remaining energy or energy margin (Wh), if available
- Estimated energy sufficiency for the selected traverse, if already calculated
- Relevant warning or explanation

Do not force all fields into the card if the current response does not contain them. Prefer a compact summary with the most important status and a few supporting metrics.

### Status presentation

Use the existing energy/traverse result status if available. For example:
- Sufficient energy
- Insufficient energy
- Conditional / review required
- Undetermined
- Not evaluated

Do not derive a new energy status in the frontend. Do not show an assumed battery percentage, power generation, or energy margin.

If a value is missing:
- Display `Unavailable` or `Not evaluated`.
- Do not display `0` unless the backend explicitly returned a valid measured/calculated zero.

---

## 5. Right card — Terrain & Communication Situation

### Heading

**Terrain & Communication Situation**

Use the Phase 11 terrain background image behind this card.

The purpose of this card is to communicate whether terrain obstructs the geometric line of sight or communication path between the rover and the relevant Earth/relay endpoint, based on existing analysis output.

### Display fields

Use only existing terrain and communication analysis response fields. Show relevant available values, such as:
- Communication visibility/status
- Terrain obstruction status
- Whether terrain interrupts or blocks the geometric line of sight
- Earth elevation/azimuth if already provided by the existing Horizons analysis
- Terrain obstruction location or route-relative position, if available
- Relevant route/terrain hazard context
- Analysis coverage and source status
- A short explanation of the result

Use clear status wording:
- `Terrain obstruction detected`
- `No terrain obstruction detected in analyzed coverage`
- `Communication visibility undetermined`
- `Terrain analysis unavailable`
- `Partial terrain coverage`

Only show `Terrain obstruction detected` when an existing validated terrain/line-of-sight result supports it.

### Important scientific distinction

Do not infer operational radio communication from geometric visibility alone.

- Horizons provides geometric celestial positions, not terrain ray tracing.
- Terrain obstruction requires suitable elevation data and a line-of-sight/terrain-horizon analysis.
- A geometric Earth-above-horizon result does not prove an operational radio link.
- Operational communication availability may additionally require antenna pointing, frequency, transmit power, receiver sensitivity, relay configuration, and a link budget.

If the current project only has Earth azimuth/elevation and does not yet perform terrain line-of-sight analysis, show a clear state such as:

`Terrain communication obstruction: Not evaluated`

Supporting explanation:

`Earth geometric visibility is available, but terrain line-of-sight analysis has not been verified.`

Do not label communication as interrupted merely because a crater or obstacle exists somewhere along the rover route. The obstruction must be evaluated along the actual communication line of sight to the relevant endpoint.

---

## 6. Data binding and UI-only scope

This phase changes presentation, not science.

- Connect each card to the existing application result state or API response.
- Reuse the canonical Phase 8/10 energy results for Power Situation.
- Reuse existing Phase 7 communication geometry and Phase 11 terrain outputs for Terrain & Communication Situation.
- Do not create duplicate calculations in React components.
- Do not create new backend endpoints or data-processing pipelines in this phase.
- Do not add fake/mock values to make the cards look populated.
- If existing data is not available, render the appropriate unavailable/not-evaluated state with a concise explanation.
- If existing data models need a display adapter, implement a typed adapter that maps existing fields without changing their scientific meaning.

If the app currently has no verified terrain line-of-sight output, the UI must clearly show that communication obstruction has not yet been evaluated. Do not simulate an interruption.

---

## 7. UI states

Both cards should support:
- Initial / no analysis yet
- Loading
- Complete result
- Partial result
- Unavailable
- Failed
- Stale result after mission inputs or route changes

Do not leave old values visible as current after the route, mission time, rover configuration, or relevant analysis inputs change.

Use consistent status badges or labels. Do not communicate state using color alone; include text.

---

## 8. Responsive and accessibility requirements

- Desktop: two cards side by side.
- Tablet/mobile: cards stack vertically.
- Keep all content within card bounds.
- Ensure sufficient text contrast over both background images.
- Provide meaningful heading hierarchy.
- Ensure status indicators are readable by assistive technology.
- Do not rely on background imagery or color alone to communicate meaning.
- Preserve keyboard accessibility for any existing card actions.
- Avoid adding interactive controls unless already supported by the current results workflow.

---

## 9. Mandatory implementation checks

Inspect the actual codebase, implement missing UI work, and verify it in the running app. Do not merely describe the changes.

### Asset checks
- [ ] `energy.jpg` is copied to the public assets directory.
- [ ] `/assets/energy.jpg` loads without a 404.
- [ ] The Terrain & Communication Situation card has no background image or image-backed overlay.
- [ ] The Terrain & Communication Situation card uses a clean, smooth surface consistent with the dark theme.
- [ ] `energy.jpg` is applied only to the Power Situation card.
- [ ] Power card foreground text, values, and status labels remain readable.

### Layout checks
- [ ] Power Situation is the left card on desktop.
- [ ] Terrain & Communication Situation is the right card on desktop.
- [ ] Both cards have consistent styling and appropriate visual balance.
- [ ] Cards stack correctly on smaller screens.
- [ ] No horizontal overflow or overlap occurs.
- [ ] Existing workspace and navigation remain intact.

### Data checks
- [ ] Power Situation uses actual existing energy result data.
- [ ] Terrain & Communication Situation uses actual existing terrain/communication result data.
- [ ] No hardcoded scientific values are displayed as live results.
- [ ] Missing values are shown as unavailable/not evaluated, not zero.
- [ ] Terrain obstruction is shown only if supported by a validated line-of-sight result.
- [ ] Geometric visibility is not described as confirmed operational radio communication.
- [ ] Stale results are clearly identified after relevant input changes.

### Regression checks
- [ ] Phase 7 Sun/Earth analysis remains functional.
- [ ] Phase 8 Solar Energy analysis and animation remain functional.
- [ ] Phase 9 Solar Energy lightning pin remains unchanged.
- [ ] Phase 10 rover energy and traverse results remain functional.
- [ ] Phase 11 Terrain Analysis card remains functional.
- [ ] Phase 12 `/3d-simulation` route and map entry button remain functional.

Run the actual scripts found in `package.json` for linting, type checking, tests, and production build. Verify the two-card layout in the browser at desktop and mobile widths.

If any check fails, repair it and rerun the relevant check. Do not mark it as passed without verification.

---

## 10. Final implementation report

Report:
1. Files created or modified.
2. Where `energy.jpg` was placed and its public URL path.
3. Confirmation that no terrain background image is used in the Terrain & Communication Situation card.
4. Confirmation that the Terrain & Communication Situation card uses a clean, smooth surface.
5. Final layout and Power Situation image treatment.
5. Exact existing data fields connected to each card.
6. Which values remain unavailable or not evaluated.
7. Confirmation that no new backend/scientific calculation was introduced.
8. Actual lint, type-check, test, and build results.
9. Any incomplete or blocked checks.

Use these statuses:
- `PASS — already implemented and verified`
- `IMPLEMENTED — added and verified`
- `PARTIAL — partly working`
- `BLOCKED — unable to verify because of a specific dependency or asset issue`
- `FAIL — not working; describe the failure`

Do not claim completion based only on the cards rendering. Verify their assets, actual data binding, responsive behavior, and regression checks.


---

## Phase 13 revision — terrain card background removal

This revision supersedes any earlier instruction in this file that says to use `terrain.jpg` as the Terrain & Communication Situation card background.

Final required appearance:
- **Power Situation (left):** keep the `energy.jpg` background.
- **Terrain & Communication Situation (right):** remove the background image completely and use a clean, smooth dark-theme card surface.
- Do not alter the Terrain & Communication card's data binding or communication-status logic.
- Do not change the Phase 11 Route Terrain Analysis card; this revision applies only to the Phase 13 results card.
