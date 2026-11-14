<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may differ from prior versions. Before writing code, read the relevant guide in `node_modules/next/dist/docs/`. Follow current project APIs and heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Lunar Mission Planner — Agent Instructions

## 1. Mandatory context reading order

Before implementing code, changing architecture, debugging an issue, or making a technical decision, read these files in order:

1. `context/project-overview.md` — product definition, goals, features, and scope.
2. `context/architecture-context.md` — system structure, integrations, data flow, and invariants.
3. `context/ui-context.md` — visual theme, page layouts, loading states, analysis results, and component conventions.
4. `context/code-standards.md` — implementation rules and conventions.
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach.
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps.
7. `context/debug-state-and-issue-tracker.md` — known bugs, affected phases, observed errors, investigation status, test procedures, and verification evidence.
8. The phase-specific implementation context relevant to the task, such as `context/phase-1-environment-setup.md` through `context/phase-5-horizons-quickmap-integration.md`.
9. `context/lroc-map-debug-retrieval-verification.md` whenever working on LROC/QuickMap imagery, WMS, map tiles, projections, or map-service failures.

If a referenced file does not exist in the repository, report that clearly. Do not silently assume its contents.

## 2. Phase and scope discipline

- Identify the active implementation phase before making changes.
- Follow the matching phase context as the task specification.
- Do not skip required setup, tests, or verification steps.
- Preserve already working features and previously completed phases.
- Do not rewrite unrelated files or introduce unrelated dependencies.
- Reuse the existing architecture, packages, components, and conventions unless a documented technical reason requires a change.
- If implementation changes the architecture, scope, or standards documented in the context files, update the relevant context file.
- Update `context/progress-tracker.md` after each meaningful implementation change.

## 3. Debug-state discipline — mandatory

`context/debug-state-and-issue-tracker.md` is the central record of known issues across all phases.

For every bug or failure:

1. Assign or reuse a stable issue ID.
2. Record the affected phase(s) and feature.
3. Record the exact observed error, reproduction steps, and available evidence.
4. Separate confirmed facts from suspected root causes.
5. Record the investigation and fix being attempted.
6. Define the test steps and acceptance criteria.
7. Run the tests and record actual results, evidence paths, and date.
8. Update the issue status in the debug tracker.
9. Update the progress tracker if the fix changes phase progress.

Use only these statuses:

- `OPEN`
- `INVESTIGATING`
- `FIX IN PROGRESS`
- `READY FOR TEST`
- `VERIFIED FIXED`
- `BLOCKED`
- `NOT REPRODUCED`

Never mark an issue `VERIFIED FIXED` because code was edited, a component rendered, or an endpoint returned HTTP 200. A fix is verified only after its stated acceptance tests pass and evidence is recorded.

Do not erase historical failures. Append a new debug-log entry when an issue is retested or its status changes.

## 4. LROC/QuickMap verification rules

When debugging or implementing LROC/QuickMap imagery:

- Inspect the actual configured endpoint and request parameters.
- Retrieve and parse the official service capabilities metadata.
- Verify exact published layer names, supported CRS/projections, image formats, and coverage.
- Construct a real GetMap request using the verified metadata.
- Retrieve the actual response bytes.
- Check HTTP status, final URL, content type, and byte length.
- Reject XML exceptions, HTML error pages, blank/invalid images, and unexpected content types.
- Decode the image, record dimensions, save it as a debug artifact, and visually inspect that it contains lunar imagery.
- Load the same verified imagery in the actual application and confirm it renders.
- Verify coordinate marker alignment after pan and zoom.
- Do not use a decorative background image, screenshot, mock tile, or placeholder as evidence of real map integration.
- Do not mark the map `VERIFIED FIXED` until image retrieval, decoding, visual inspection, and application display all succeed.

When the LROC debug task is performed, update:
- `context/lroc-map-debug-retrieval-verification.md`
- `context/debug-state-and-issue-tracker.md`

## 5. JPL Horizons and scientific correctness

- Read the current official Horizons documentation before constructing requests.
- Make observer body/location, target, date/time, time scale, coordinate convention, reference frame, and requested quantities explicit.
- Keep upstream requests server-side.
- Validate both HTTP status and API-level error payloads.
- Validate response structure, units, numeric values, and timestamp semantics before exposing results to the UI.
- Handle timeouts, rate limits, transient failures, and malformed responses.
- Never fabricate Sun/Earth values when the service fails.
- Do not claim Horizons calculates local terrain obstruction.
- Distinguish geometric azimuth/elevation from terrain-clear visibility.
- Distinguish Earth line-of-sight from a guaranteed operational radio link.
- Do not claim NASA/JPL data is integrated or scientifically verified unless the implementation actually retrieves and validates it.

## 6. Coordinate and terrain integrity

- Preserve the user's entered coordinate values; do not silently clamp, rewrite, or substitute them.
- Remove arbitrary application-level thresholds when the project specification requires it, but retain documented coordinate-system and provider requirements.
- Reject malformed and non-finite values.
- Use named coordinate fields and explicit conversion functions; never rely on ambiguous latitude/longitude array order.
- Document longitude direction, datum, projection, axis order, and units at service boundaries.
- Ensure the map marker and Horizons observer refer to the same physical location.
- Terrain obstruction, illumination, slope, roughness, and rover suitability must be calculated from appropriate validated terrain/ephemeris data. Do not invent these results.

## 7. Testing and quality gates

Use the test tools already installed in the project. Do not install duplicate frameworks.

For relevant changes, run the applicable checks:
- ESLint.
- TypeScript type-check.
- Unit tests.
- Component tests.
- API contract/integration tests.
- End-to-end/browser tests.
- Production build.

For external services:
- Use deterministic mocked responses for ordinary CI tests.
- Run controlled live smoke tests separately when network access is available.
- Record provider status and evidence.
- Do not let an external outage masquerade as a successful test.
- Do not mark a live integration verified using mocks alone.

If a command fails:
- Capture the actual error.
- Determine whether it is caused by the code, environment, dependency, or external service.
- Fix it when in scope.
- Otherwise record it as blocked with the evidence and next action.

## 8. Security and reliability

- Keep API keys, tokens, and private configuration server-side.
- Never commit secrets or include them in debug reports.
- Do not create unrestricted URL proxies.
- Validate and allowlist upstream service parameters.
- Apply request timeouts, response-size limits, and bounded retries.
- Respect provider rate limits and usage terms.
- Avoid logging unnecessary sensitive data.
- Do not expose stack traces or internal configuration in public health endpoints.

## 9. Required completion report

At the end of each implementation/debug task, report:

1. Phase and scope addressed.
2. Files created or modified.
3. Components, routes, services, or integrations changed.
4. Root cause, if debugging.
5. Fix implemented and any remaining limitations.
6. Commands/tests run and their actual pass/fail results.
7. Evidence paths, screenshots, or retrieved artifacts.
8. Updated issue IDs and statuses in the debug tracker.
9. Updated progress-tracker entries.

Be explicit about what is implemented, what is mocked, what is not tested, and what remains blocked. Never claim completion without evidence.
