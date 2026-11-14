# Phase 2 — Mission Input Landing Page UI

## Objective

Implement the Lunar Mission Planner landing/input page to closely match the supplied reference screenshot.

This phase is focused on the user-facing input experience only. Do not implement the lunar map workspace, scientific calculations, API integrations, or analysis results in this phase.

**Primary requirement:** the final page must visually match the supplied screenshot as closely as possible in layout, proportions, typography, colors, spacing, gradients, imagery, borders, and responsive behavior. Do not replace the design with a generic dashboard or generic login template.

## 1. Reference and design intent

Use the screenshot supplied with this task as the authoritative visual reference.

The reference contains:
- A full-viewport lunar landscape background.
- A dark navy/black upper sky that blends into the landscape.
- A visible Earth rising behind the lunar horizon, positioned around the center-left.
- A lunar surface with an astronaut in the lower middle area.
- A compact navigation bar at the top.
- Hero content on the left.
- A bright, pale mission configuration card on the right.

This is a mission-planning landing/input page, not a username/password authentication screen. Do not add login, password, sign-up, or social-auth fields.

## 2. Layout and composition

### Desktop layout

Reproduce the screenshot's overall composition:

- Full viewport background, minimum height `100svh`.
- Top navigation spans the page with comfortable horizontal padding.
- Main content begins below the navigation and uses a two-column composition.
- Left column: approximately 58–60% of the available content width.
- Right column: approximately 38–40%, containing the mission configuration card.
- Keep the hero text clear of the configuration card.
- The Earth and lunar horizon should remain visible between and behind the two columns, as in the reference.
- Avoid unnecessary scrolling at common desktop viewport sizes around 1440×900 and 1672×941.
- Keep the mission card fully visible where possible; if the viewport is shorter, allow natural page scrolling rather than clipping its controls.

### Navigation

At the top:
- Left: circular lunar/planet-style logo mark and the text **Lunar Mission Planner**.
- Right: three navigation items:
  - **Mission Planner** — active item, shown inside a rounded dark translucent pill.
  - **About**
  - **Documentation**
- Use the same alignment, spacing, weight, and visual hierarchy as the screenshot.
- Use semantic links or buttons. Do not leave decorative controls that look interactive but do nothing.
- If About and Documentation routes do not exist yet, use safe placeholder links or non-interactive text until their destinations are implemented. Do not invent routes that cause 404 errors.

## 3. Background image and gradient blending

The background is a major part of the design and must not look like a rectangular image pasted behind the content.

Requirements:
- Use the approved lunar landscape/Earth background asset already present in the project, if available.
- If the correct asset is not present, do not silently substitute an unrelated image. Identify the missing asset and report it.
- Use a full-bleed background image with appropriate `cover` behavior and positioning.
- Preserve the recognizable lunar horizon, Earth, and astronaut composition.
- Add layered CSS gradients/overlays to blend the image into the dark navy upper background and improve text readability.
- The gradient must transition smoothly; avoid visible seams, hard horizontal bands, or a uniformly black overlay.
- Keep the lunar terrain bright enough to retain texture and detail.
- Keep the Earth visible and naturally integrated with the sky.
- Ensure the background does not reduce the mission card's readability.

Suggested implementation approach:
- Place the background image in a dedicated background layer.
- Add separate gradient overlay layers for the upper sky, side readability, and lower transition if needed.
- Keep overlays configurable through CSS variables or a small set of centralized styles.
- Use `background-position` tuned to match the reference rather than relying on arbitrary defaults.
- Ensure the background is decorative (`aria-hidden="true"`) and does not interfere with keyboard interaction.

Do not use the entire reference screenshot as the page background. Rebuild the interface with real HTML components and use only the appropriate lunar scene asset as the background.

## 4. Left hero section

Recreate the left-side content in the same order and hierarchy:

1. Outlined badge:
   - Rocket icon.
   - Text: **NASA SPACE APPS CHALLENGE**
   - Blue/cyan border and text.
   - Rounded capsule shape.

2. Main heading:
   - Line 1: **Plan Your**
   - Line 2: **Lunar Mission**
   - Large, bold typography.
   - First line near-white.
   - Second line light blue.
   - Match the line breaks shown in the screenshot.
   - Use responsive font sizing while preserving the same visual emphasis.

3. Description:
   - **Explore landing locations and evaluate lunar environmental conditions.**
   - Break into two lines on desktop similarly to the screenshot.
   - White or near-white text with comfortable line height.

4. Feature highlights:
   - Sun icon + **Sun Analysis**
   - Earth/globe icon + **Earth Analysis**
   - Mountain/terrain icon + **Terrain & Elevation**
   - Use compact circular translucent icon backgrounds.
   - Align the three items horizontally on desktop.
   - Keep the labels readable and evenly spaced.

Use the installed icon library (Lucide React, if included in the project) rather than emoji. Keep icon sizes, stroke weight, and alignment consistent.

## 5. Mission Configuration card

The right-side card is the primary interactive element.

Visual requirements:
- Bright white/off-white surface with a subtle cool tint.
- Rounded corners similar to the screenshot.
- Soft, restrained shadow.
- Adequate internal padding.
- Dark navy headings and labels.
- Blue icons for section labels.
- Inputs have pale backgrounds, thin cool-gray borders, rounded corners, and clear focus states.
- The card must remain readable over the background.
- Do not use excessive transparency on the card.

### Card heading

At the top of the card:
- Sliders/settings icon.
- Heading: **Mission Configuration**
- Supporting text: **Enter mission details to analyse lunar conditions.**

Use the exact spelling and wording shown in the screenshot.

### Field 1 — Landing Location

Section label:
- Map pin icon.
- **Landing Location**

Two inputs in one row on desktop:

| Field | Label | Placeholder | Required behavior |
|---|---|---|---|
| Latitude | Latitude (°) | e.g. -89.5 | Numeric coordinate input |
| Longitude | Longitude (°) | e.g. 0.0 | Numeric coordinate input |

Validation:
- Latitude must be between `-90` and `90`.
- Longitude must be between `-180` and `180`.
- Reject empty values when the user submits the mission.
- Accept valid decimal values, including negative values.
- Show clear inline validation messages.
- Do not silently clamp or rewrite invalid values.

### Field 2 — Mission Date

Section label:
- Calendar icon.
- **Mission Date**

Input:
- Placeholder: **Select a date**
- Use a native date input or the project's selected accessible date-picker component.
- Store and submit a well-defined date value.
- Required.
- Display validation feedback if missing or invalid.

### Field 3 — Mission Time (UTC)

Section label:
- Clock icon.
- **Mission Time (UTC)**

Input:
- Default value: **12:00**
- Use a native time input or accessible time-picker component.
- Treat the entered time as UTC, not the user's local timezone.
- Required.
- Preserve the selected hour and minute without silently converting to local time.

### Field 4 — Additional Site (Optional)

Section label:
- Layers/stack icon.
- **Additional Site (Optional)**
- Supporting text: **Add another location to compare (lat, lon)**

Input:
- Placeholder: **e.g. -88.8, 12.4**
- Optional.
- Accept a latitude/longitude pair separated by a comma.
- Validate latitude and longitude ranges independently.
- If supplied, parse it into structured numeric latitude and longitude values.
- If empty, do not block submission.

### Submit button

Text:
- **Analyse Mission Conditions**

Appearance:
- Full width.
- Blue gradient from brighter blue to deep navy-blue, matching the screenshot.
- Rounded corners.
- White bold text.
- Small play/triangle icon before the label.
- Clear hover, focus-visible, active, and disabled states.

Behavior:
- Validate all required fields and the optional comparison site.
- On invalid input, show inline errors and do not submit.
- On valid input, call a clearly defined submit handler with structured form data.
- For this phase, the handler may log the validated payload in development or pass it to a typed placeholder callback.
- Do not fabricate scientific analysis or show fake analysis results.
- Prevent accidental duplicate submissions while the handler is running.
- Show a clear loading/disabled state if submission is asynchronous.

## 6. Form data contract

Use a typed form model. Suggested TypeScript shape:

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

Keep form parsing and validation outside the visual field components. Reuse the project's validation library (Zod if it was installed in Phase 1); do not add a second validation library.

Do not place API calls, astronomy calculations, terrain calculations, or external service logic inside the form components.

## 7. Visual system

Use the project's existing design tokens and fonts. Do not introduce a competing color system.

The existing project theme includes these tokens:

```css
--bg-base: #080809;
--bg-surface: #111114;
--bg-elevated: #18181c;
--bg-subtle: #1e1e23;
--border-default: #2a2a30;
--border-subtle: #3a3a42;
--text-primary: #f0f0f4;
--text-secondary: #c0c0cc;
--text-muted: #808090;
--text-faint: #505060;
--accent-primary: #00c8d4;
--accent-primary-dim: rgba(0, 200, 212, 0.12);
--accent-ai: #6457f9;
--accent-ai-text: #8b82ff;
--state-error: #ff4d4f;
--state-success: #34d399;
--state-warning: #fbbf24;
```

The screenshot's mission card also requires light surfaces and dark text. Define card-specific semantic tokens rather than scattering arbitrary hex values through components.

Typography:
- Use the project's existing Geist Sans and Geist Mono setup.
- Use Geist Sans for headings, labels, navigation, and body copy.
- Use Geist Mono only where numeric/technical values benefit from it.
- Match the screenshot's strong heading hierarchy and compact form typography.

## 8. Responsive behavior

### Desktop
- Keep the two-column layout.
- Keep the hero on the left and the configuration card on the right.
- Keep latitude and longitude side by side.
- Keep the three feature highlights in one row where space permits.

### Tablet
- Reduce horizontal padding and column gap.
- Allow the card to become slightly wider relative to the hero.
- Prevent the hero and card from colliding.
- If needed, move the card below the hero while preserving the visual hierarchy.

### Mobile
- Stack content vertically.
- Navigation must remain usable; collapse or simplify it without introducing an unrelated design.
- Place the hero first and the mission card after it.
- Keep the background image recognizable but reposition/crop it to retain the lunar atmosphere.
- Stack latitude and longitude fields vertically when needed.
- Make all form controls and the submit button comfortably touch-accessible.
- Avoid horizontal overflow.
- Ensure text remains readable against the image.

## 9. Component structure

Build the page from small, reusable components. Adapt paths to the repository's existing conventions rather than restructuring the whole project.

Suggested component boundaries:

```text
components/
  landing/
    landing-page.tsx
    landing-background.tsx
    landing-navigation.tsx
    hero-section.tsx
    feature-highlights.tsx
    mission-configuration-card.tsx
    landing-location-fields.tsx
    mission-date-field.tsx
    mission-time-field.tsx
    additional-site-field.tsx
    mission-submit-button.tsx
```

Suggested supporting modules:

```text
lib/
  validation/
    mission-input-schema.ts
types/
  mission.ts
```

Requirements:
- Keep components focused on rendering and user interaction.
- Keep validation logic in the validation module.
- Keep the submit handler separate from field presentation.
- Use existing shadcn/ui components where they fit the reference.
- Do not create duplicate versions of components already present.
- Use consistent labels, IDs, and accessible descriptions.
- Use semantic `main`, `header`, `nav`, `section`, `form`, and `label` elements.

## 10. Accessibility and interaction checks

Verify:
- Every input has a visible label.
- Every label is correctly associated with its input.
- Keyboard navigation follows a logical order.
- Focus indicators are visible against both light and dark surfaces.
- Validation errors are associated with their relevant fields.
- Color is not the only way errors or states are communicated.
- The page works at 200% zoom.
- Reduced-motion preferences are respected if transitions or background effects are added.
- Decorative icons and background layers are hidden from assistive technology where appropriate.

## 11. Testing and verification

Add or update tests using the test tools already configured in Phase 1.

### Unit tests
- Latitude boundaries: `-90`, `90`, and invalid values outside the range.
- Longitude boundaries: `-180`, `180`, and invalid values outside the range.
- Valid negative and decimal coordinates.
- Required date validation.
- Valid and invalid time values.
- Optional comparison site parsing.
- Invalid comparison-site latitude/longitude.
- Form payload shape.

### Component tests
- All expected labels and placeholders render.
- Mission time defaults to `12:00`.
- Additional Site is optional.
- Validation errors appear for invalid inputs.
- Submit handler is not called when validation fails.
- Submit handler receives structured data when the form is valid.
- Loading/disabled state prevents duplicate submission.

### Browser/E2E checks
- Landing page loads without console errors.
- Desktop layout resembles the reference screenshot.
- Tablet and mobile layouts do not overflow.
- Form can be completed using a keyboard.
- Valid form submission works.
- Invalid form submission displays errors.
- Navigation items do not lead to broken routes.

### Visual verification
Compare the implementation with the reference screenshot at approximately `1672 × 941`.

Check these items explicitly:
- Navigation position and spacing.
- Hero column width and vertical position.
- Heading size, line breaks, and colors.
- Earth and lunar horizon visibility.
- Background gradient blending.
- Mission card width, height, and position.
- Input dimensions, spacing, and border radius.
- Button size and gradient.
- Overall balance and contrast.

Do not claim pixel-perfect completion without actually running and reviewing a screenshot of the implemented page.

## 12. Scope boundaries

In scope:
- Landing/input page.
- Background image composition and gradient overlays.
- Navigation visual treatment.
- Hero content.
- Mission configuration form.
- Client-side validation.
- Responsive behavior.
- Accessibility.
- Tests and visual verification.

Out of scope for Phase 2:
- Lunar map workspace.
- QuickMap or Moon Trek integration.
- JPL Horizons requests.
- Sun or Earth position calculations.
- Terrain/elevation analysis.
- Communication visibility calculations.
- PDF export.
- Real authentication or user accounts.
- Backend scientific processing.

Do not implement out-of-scope functionality as fake buttons or fabricated results.

## 13. Completion criteria

Phase 2 is complete only when:

- [ ] The landing page follows the supplied screenshot's composition and visual design.
- [ ] The lunar background blends naturally with the dark gradient.
- [ ] Navigation, hero content, and mission card are implemented.
- [ ] All five input values/areas are present: latitude, longitude, mission date, UTC mission time, and optional comparison site.
- [ ] Mission time defaults to `12:00` UTC.
- [ ] Coordinate and date/time validation works.
- [ ] The submit button sends a typed, validated payload to the phase-appropriate handler.
- [ ] Desktop, tablet, and mobile layouts work.
- [ ] Accessibility checks pass.
- [ ] Unit, component, and E2E tests pass, or any unavailable test is explicitly documented.
- [ ] ESLint, TypeScript checks, and production build pass.
- [ ] A screenshot of the implemented page has been reviewed against the supplied reference.
- [ ] No fake scientific results, broken navigation routes, or nonfunctional controls remain.

## 14. Required implementation report

When finished, provide:
1. Files created or modified.
2. Components implemented.
3. Form validation rules implemented.
4. Tests added and their results.
5. Commands run and their results (`lint`, type-check, tests, build).
6. Visual comparison notes at the reference viewport.
7. Any missing background asset or unresolved design dependency.
8. Any known limitations carried into the next phase.

Do not begin Phase 3 until this phase's completion report is provided.
