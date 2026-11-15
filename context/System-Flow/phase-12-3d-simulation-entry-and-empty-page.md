# Phase 12 — 3D Simulation Entry Button and Empty Page

## Objective

Add a simple clickable entry button at the **bottom-right corner of the central Lunar Map image**. Clicking it must navigate to a separate, initially empty page titled **3D Simulation**.

This phase is only for the entry point, routing, and empty page shell. Do not implement a 3D engine, 3D model, terrain rendering, simulation controls, or simulation logic.

## 1. Inspect the existing application

Before editing:
- Inspect the current Next.js 16 App Router structure and existing page/layout conventions.
- Locate the central Lunar Map component and its image/map container.
- Identify the correct way the project handles internal navigation (Next.js `Link` or the existing navigation pattern).
- Reuse the existing design tokens, typography, spacing, and button styles.
- Preserve all current map interactions, markers, route overlays, and responsive behavior.
- Do not redesign the workspace or change unrelated components.

## 2. Add the 3D Simulation button

Add one small, clear button or compact icon-button labeled **3D Simulation**.

### Exact placement
- Position it inside the central Lunar Map image/container.
- Anchor it to the **bottom-right corner** of that image/container.
- Keep a consistent small inset from the right and bottom edges.
- Ensure it stays attached to the map container, not the browser viewport or the whole page.
- Use a suitable stacking order so it appears above the map image.
- Do not cover important map controls, coordinate labels, route markers, or attribution. If there is a collision, adjust the inset or existing map-control spacing without moving the button away from the bottom-right area.

### Visual style
- Keep it simple and consistent with the current dark technical interface.
- Use a subtle dark/translucent surface with a visible border.
- Use the existing cyan accent sparingly for hover/focus emphasis.
- Include a small 3D/cube icon only if an appropriate icon is already available in the project; do not add a dependency just for the icon.
- Make the label readable at desktop and mobile sizes.
- Provide hover, active, and keyboard-focus states.
- Ensure sufficient contrast and a usable touch target.
- Add an accessible name; do not rely on the icon alone.

### Behavior
- Clicking the button navigates to the dedicated 3D Simulation page.
- Use the project's internal navigation mechanism, preferably a Next.js `Link` for a normal route transition.
- Destination route: `/3d-simulation`.
- Do not open an external website or a modal.
- Do not trigger the existing Run Mission Analysis action.
- The button must work with keyboard navigation and activation.

## 3. Create the empty 3D Simulation page

Create the page at the App Router location corresponding to:

`/3d-simulation`

The page title and visible heading must be:

**3D Simulation**

### Initial page content
Keep the page intentionally empty and minimal:
- Display the heading `3D Simulation`.
- Use the existing application typography and dark theme.
- Keep the page structure ready for future simulation work.
- A simple return/back navigation to the mission workspace may be included if it follows existing application conventions.
- Do not add a simulated 3D viewport, placeholder planet, canvas, model, chart, fake controls, or sample data.
- Do not install Three.js, React Three Fiber, Babylon.js, or any other 3D library in this phase.
- Do not implement any simulation behavior.

The page must be a real navigable application route, not just a heading conditionally rendered inside the current workspace.

## 4. Responsive behavior

Verify:
- The button remains inside the map container at the bottom-right on desktop.
- It remains visible and tappable on tablet and mobile layouts.
- It does not overlap critical map controls or hide important map information.
- The map remains usable when the button is present.
- The new page renders correctly at desktop and mobile widths.

## 5. Implementation checks — inspect and fix missing work

Do not stop after describing the changes. Inspect the codebase, implement any missing pieces, and verify the behavior.

### Map button checks
- [ ] Button is present in the central Lunar Map image/container.
- [ ] Button is anchored to the container's bottom-right corner.
- [ ] Button label reads `3D Simulation`.
- [ ] Button has visible hover, active, and focus states.
- [ ] Button is accessible by keyboard and has an accessible name.
- [ ] Button does not block existing map controls or mission interactions.
- [ ] Button does not invoke Run Mission Analysis or any unrelated action.

### Page and navigation checks
- [ ] `/3d-simulation` is a real route.
- [ ] The page heading reads `3D Simulation`.
- [ ] Clicking the map button navigates to `/3d-simulation`.
- [ ] Directly opening `/3d-simulation` works.
- [ ] Refreshing `/3d-simulation` does not produce a 404.
- [ ] The page is intentionally empty apart from its heading and optional simple return navigation.
- [ ] No 3D libraries or simulation logic were added.

### Regression checks
- [ ] Existing Lunar Map interactions still work.
- [ ] Existing mission input and analysis panels are unchanged.
- [ ] Phase 7–11 functionality remains intact.
- [ ] Responsive workspace layout remains intact.
- [ ] Type checking, linting, tests, and production build pass using the scripts defined in the project's `package.json`.

If any check fails, fix it and rerun the relevant checks. Do not report a check as passed unless it was actually verified.

## 6. Final implementation report

Report:
1. Files created or modified.
2. Exact location and styling of the map button.
3. Route created for the new page.
4. Navigation behavior verified.
5. Confirmation that the page is intentionally empty and no 3D engine was added.
6. Actual lint, type-check, test, and build results.
7. Any checks that remain blocked or incomplete.

Use these statuses for each check:
- `PASS — already implemented and verified`
- `IMPLEMENTED — added and verified`
- `PARTIAL — partly working`
- `BLOCKED — unable to verify because of a specific dependency or environment issue`
- `FAIL — not working; describe the failure`

Do not claim completion based only on the presence of source files. Verify the actual route and click behavior in the running application.
