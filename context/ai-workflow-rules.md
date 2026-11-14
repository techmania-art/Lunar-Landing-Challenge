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
