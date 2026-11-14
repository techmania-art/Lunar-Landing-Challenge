# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes; do not layer workarounds.
- Do not mix UI composition, API retrieval, scientific calculations, and data persistence.
- Respect the boundaries in `architecture-context.md`.
- Reuse existing repository conventions before introducing new dependencies.

## TypeScript

- Strict mode is required.
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Validate unknown external input at system boundaries.
- Use explicit units in names, such as `azimuthDegrees`, `elevationMeters`, and `timeUtc`.
- Prefer discriminated unions for loading, success, partial, and error states.
- Do not use magic numbers for scientific thresholds without documenting the source and meaning.

## Next.js and React

- Default to React Server Components.
- Add `"use client"` only when browser interactivity, hooks, map interaction, animation, or client state requires it.
- Keep route handlers focused on validation, orchestration, and response shaping.
- Keep external provider clients and analysis logic in shared modules, not inside visual components.
- Read the installed Next.js documentation before using APIs that may have changed.

## Styling

- Use CSS custom property tokens defined in `globals.css` and mapped to Tailwind tokens via `@theme inline`.
- Do not introduce raw Tailwind palette classes such as `zinc-*` or arbitrary hardcoded colors in components.
- Follow the existing project tokens and the dark theme defined in `ui-context.md`.
- Use consistent radius conventions: `rounded-xl` for small controls, `rounded-2xl` for cards/panels, and `rounded-3xl` for large overlays.
- Keep contrast high and ensure the lunar background does not make text or controls difficult to read.

## Components

- Use shadcn/ui components where suitable.
- Add components through the configured shadcn workflow rather than copying foundation component implementations.
- Keep project-specific layout and behavior in app-level components.
- Keep the UI components replaceable and driven by typed props/state.
- Do not place provider API calls inside `SunAnalysisCard`, `EarthAnalysisCard`, or other display-only components.

## API and External Data

- Validate latitude (-90 to +90) and longitude (-180 to +180).
- Validate date and UTC time formats before querying external services.
- Handle provider timeouts, rate limits, malformed responses, and missing fields.
- Normalize provider responses into application-owned types.
- Preserve source names, units, calculation timestamps, and warnings.
- Do not silently convert missing data to zero.
- Do not label geometric visibility as operational communication availability.

## Scientific Display

- Always show units for angles, distances, elevations, and time windows.
- Use UTC consistently for mission time and communication windows.
- Distinguish geometric solar elevation from terrain-corrected illumination.
- Distinguish geometric Earth visibility from terrain-corrected line of sight.
- If the terrain calculation is not available, display `Unknown` or `Unavailable`.
- Demo data must be visibly labelled as demo/illustrative.

## Accessibility

- Inputs require persistent labels.
- Buttons and map controls require accessible names.
- Provide keyboard focus styles.
- Do not rely on colour alone to communicate status.
- Respect reduced-motion preferences for the Moon loading animation.
- Keep responsive layouts usable without horizontal scrolling.

## File Organization

Follow the repository's existing structure. Suggested responsibility boundaries:

- `components/` — UI composition.
- `lib/services/` — external data clients.
- `lib/analysis/` — astronomical/terrain analysis orchestration.
- `lib/validation/` — input schemas and validation.
- `types/` — shared contracts.
- `app/api/` — route handlers, if server endpoints are needed.
- `public/` — static images and assets.
- `context/` — project documentation.
