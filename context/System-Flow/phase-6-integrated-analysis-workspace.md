# Phase 6 — Merge Analysis Background into the Mission Workspace

## 1. Objective

Combine the existing separate Analysis page and the main Lunar Mission Planner workspace into **one integrated workspace page**.

Use the supplied screenshots as the visual reference:

- **Screenshot 1:** The existing Analysis page with the looping MP4 background component.
- **Screenshot 2:** The main three-panel Mission Planner workspace containing Mission Input, Lunar Map, and Mission Analysis.

The desired result is the Screenshot 2 workspace, with the existing Phase 3 looping video background from Screenshot 1 integrated behind the workspace as a decorative background layer.

### Critical requirements

- Reuse the existing looping MP4 background component.
- **Do not modify, recreate, redesign, or replace the background component itself.**
- Integrate that component into the main workspace page/layout.
- Remove the separate standalone Analysis page after its background behavior has been successfully merged.
- Keep the Mission Input, Lunar Map, and Mission Analysis panels together on one page.
- Configure the routes and workflow protection correctly.
- Verify in a real browser that the original video background component displays behind the complete workspace.
- Preserve existing map, Horizons, mission-input, and analysis functionality.

This phase is an integration and routing task, not a redesign of the background or a replacement of the workspace.

## 2. Mandatory preliminary inspection

Before making changes:

1. Read `context/AGENTS.md`.
2. Read project overview, architecture, UI, code standards, workflow rules, progress tracker, and debug-state tracker.
3. Read the Phase 3 looping MP4 background context.
4. Read the Phase 4 workspace implementation context.
5. Read the Phase 5 Horizons/QuickMap integration context.
6. Inspect the actual repository route tree and framework version.
7. Find the exact existing background component and inspect its imports, asset path, CSS, playback settings, fallback, and reduced-motion behavior.
8. Find the standalone Analysis page route and its layout.
9. Find the main Mission Planner/workspace route and its current three-panel implementation.
10. Inspect existing authentication, session, middleware/proxy, route guard, and mission-input state mechanisms.
11. Inspect existing navigation links and all references to the old Analysis route.
12. Run the current project checks before editing and record the baseline.

Do not assume file names or route paths. Discover the real implementation first.

## 3. Desired final page

The final page should visually combine the two supplied references:

### Background layer

Use the existing Phase 3 MP4 background component, unchanged, as a full-viewport decorative layer behind the application.

### Foreground workspace

Render the complete workspace from Screenshot 2 above that background:

1. Top navigation.
2. Mission Input panel on the left.
3. Lunar Map panel in the centre.
4. Mission Analysis panel on the right.

The foreground panels must remain legible. Use the existing panel surfaces, borders, and gradients to maintain contrast over the moving video.

### Layering model

The intended visual stacking is:

```text
Application page
├── Existing looping MP4 background component (unchanged)
│   └── Decorative video layer, behind all content
└── Workspace foreground
    ├── Navigation
    └── Three-panel workspace
        ├── Mission Input
        ├── Lunar Map
        └── Mission Analysis
```

Implementation requirements:
- Background fills the viewport.
- Background is behind all interactive content.
- Background must not intercept pointer events.
- Foreground content has a higher stacking order.
- Do not create a second video element if the existing background component already renders one.
- Avoid duplicate playback and unnecessary video downloads.
- Keep the video muted, autoplaying, looping, and inline according to the existing Phase 3 implementation.
- Preserve the existing static fallback and reduced-motion behavior.
- Do not place the video inside the map panel. It belongs behind the entire workspace.
- Do not apply a dark filter directly to the video element if that would modify the existing background component. Use the existing foreground panel surfaces or a separate page-level overlay only if required for readability.

## 4. Background component preservation

The Phase 3 background component is already implemented and must be reused.

### Do not change

Unless a verified integration defect makes a change unavoidable, do not modify:
- The video source path.
- The MP4 asset.
- The component's playback attributes.
- The component's internal markup.
- Its existing CSS/animation behavior.
- Its fallback behavior.
- Its reduced-motion support.

Do not generate a new video, image, or animation.

### Integration method

- Import the existing component into the shared workspace page or appropriate route layout.
- Place it once at the page/layout level.
- Keep it outside the three panel components.
- Ensure the video remains fixed/absolute behind the page content as designed by the existing component.
- Ensure the page wrapper establishes a predictable stacking context.
- Avoid creating conflicting `z-index`, `position`, `overflow`, or transform styles.
- If the component currently assumes it owns a standalone page, adapt only the minimum integration boundary needed; do not redesign the background itself.

### Asset verification

Confirm that the existing MP4 file resolves from the browser at the expected public URL.

Verify:
- HTTP response succeeds.
- Response content type is a video type.
- Video metadata loads.
- Playback starts where browser autoplay policy permits.
- Playback loops.
- Video remains muted.
- No repeated video elements or duplicate requests are created.

If the asset is missing, report the exact missing path. Do not replace it with a fabricated asset.

## 5. Main workspace integration

Reuse the existing Phase 4 workspace components. Do not rebuild the page from scratch.

The final foreground must retain:

### Navigation
- Lunar Mission Planner logo/title.
- Mission Planner navigation item.
- Analysis, Compare, and About links only where valid routes exist.
- Active state for the integrated workspace.
- Existing Back to Input behavior if the application has a separate input step.

### Mission Input panel
- Latitude.
- Longitude.
- Mission date.
- Mission time (UTC).
- Optional comparison coordinates.
- Analyse Mission Conditions action.
- Existing validation and submitted mission state.

### Lunar Map panel
- Actual configured LROC imagery where the provider is available.
- Map controls and configured layer selector.
- Selected-coordinate red rectangle and crosshair.
- Coordinate callout.
- Existing loading/error states.
- Do not use the background video as a map-data fallback.

### Mission Analysis panel
- Sun Analysis.
- Earth Analysis.
- Communication Visibility.
- Surrounding Terrain.
- Analysis progress/loading states.
- PDF export only if genuinely implemented.
- Preserve the distinction between real data, unavailable data, and not-yet-implemented calculations.

Do not introduce dummy scientific results to make the combined page look complete.

## 6. Remove the standalone Analysis page

After the background is successfully integrated into the main workspace:

1. Identify the old standalone Analysis page route.
2. Move or reuse any genuinely required functionality in the integrated workspace.
3. Remove the standalone page implementation if it is now redundant.
4. Remove unused route-specific layout or styles only after confirming no other route depends on them.
5. Search the repository for all links, imports, redirects, tests, and references to the old route.
6. Update all navigation to the final integrated route.
7. Add a redirect from the old Analysis URL to the integrated workspace route if users or bookmarks may still access it.
8. Do not leave duplicate pages that both render the same workspace.
9. Do not delete the reusable background component or its MP4 asset.

### Route migration

Discover the existing route names first. Do not assume `/analysis`, `/planner`, or `/workspace` without inspecting the repository.

Choose one canonical route for the integrated workspace and document it. Update all internal links to that route.

If the old Analysis route has external/bookmarked usage, redirect it to the canonical workspace route rather than leaving a 404.

## 7. Route protection and mission workflow

Implement route protection using the project's existing authentication and state architecture.

### First inspect what already exists

Check whether the project has:
- Authentication provider.
- Server-side session handling.
- Protected route middleware/proxy.
- Mission configuration persistence.
- Session or cookie-based workflow state.
- Existing route guards.

Do not add a second authentication system if one already exists.

### Protect the workspace workflow

The integrated workspace must not open in an invalid or incomplete mission state.

If the application uses a mission-input-first workflow:
- The input page is the entry point.
- A successful form submission creates a validated mission configuration.
- The validated configuration is persisted using the existing project mechanism.
- The user is navigated to the integrated workspace route.
- The workspace loads the saved mission configuration.
- If the required mission configuration is missing or invalid, redirect the user back to the input page and explain that mission details are required.
- Do not use hardcoded sample coordinates as a substitute for missing state.
- Ensure refresh behavior is intentional and documented.
- Ensure the Back to Input control returns to the input page without losing valid values unless the user explicitly resets them.

### Security distinction

A client-side/session workflow guard is not authentication or security authorization.

- If real user authentication exists, enforce access on the server using the established session/auth provider and current Next.js routing conventions.
- If no authentication system exists, implement only the mission-workflow guard and clearly document that it is not an authentication boundary.
- Do not claim that a `sessionStorage` check, hidden button, or client redirect securely protects a route.
- Do not introduce fake login screens or hardcoded credentials.
- Do not expose private server data through client-side route guards.
- Keep protected server data behind server-side authorization if such data exists.

### Next.js compatibility

This project may use a Next.js version with changed conventions. Read the installed documentation in `node_modules/next/dist/docs/` before implementing middleware/proxy, layouts, redirects, or route handlers.

Use the current version's recommended route-protection mechanism. Do not copy obsolete middleware examples from older Next.js versions.

## 8. State preservation and navigation behavior

Verify the full user journey:

1. User opens the Mission Planner input page.
2. User enters latitude, longitude, date, and UTC time.
3. User submits valid mission details.
4. The application stores the validated mission configuration.
5. User navigates to the integrated workspace.
6. The video background appears behind the workspace.
7. Mission Input shows the submitted values.
8. Lunar Map uses the same coordinates.
9. Mission Analysis uses the same date/time and coordinates.
10. User can return to input and edit the mission.
11. Resubmitting updates the same workspace rather than opening a second standalone page.

Avoid duplicate state sources. The form, map marker, Horizons request, and analysis panel must use the same validated mission configuration.

## 9. Visual and responsive requirements

Use the supplied screenshots as the visual acceptance references.

### Desktop

- Video background spans the full viewport.
- Navigation remains readable.
- Three panels remain aligned horizontally.
- Map retains the largest width.
- Foreground panels remain legible over moving video.
- No separate Analysis hero page is shown.
- No duplicate header or nested page shell appears.
- Avoid unnecessary page scroll at the reference desktop viewport where possible.

### Tablet and mobile

- Preserve the background component's responsive behavior.
- Stack the panels when required.
- Prevent horizontal overflow.
- Keep form controls, map interactions, and analysis cards accessible.
- Ensure the video does not cause layout shifts or cover controls.
- Verify performance and readability on narrow screens.

### Accessibility and motion

- Respect the existing `prefers-reduced-motion` behavior.
- Keep the video decorative and hidden from assistive technology.
- Ensure keyboard focus remains visible.
- Ensure the video layer cannot capture pointer or keyboard interaction.
- Maintain sufficient contrast for foreground text and controls.

## 10. Testing and verification

Use the project's existing test framework. Do not install duplicate tools.

### Background component tests

- Existing background component is reused, not duplicated.
- Component is mounted exactly once on the integrated workspace.
- MP4 source resolves successfully.
- Video is muted, looping, and inline.
- Background is behind foreground content.
- Background does not intercept clicks.
- Reduced-motion fallback works.
- Missing video asset is reported clearly.

### Route tests

- Canonical workspace route loads correctly after valid mission submission.
- Direct access without required mission workflow state redirects to input.
- Valid mission state survives intended navigation and refresh behavior.
- Back to Input navigates correctly.
- Old standalone Analysis route redirects to the canonical workspace route.
- No dead links or redirect loops remain.
- If authentication exists, unauthenticated and unauthorized requests are blocked server-side.

### Workspace integration tests

- Mission Input, Lunar Map, and Mission Analysis appear together on one page.
- Submitted coordinates appear consistently in the form, map callout, and analysis request.
- Existing map controls still work.
- Existing LROC error and loading states remain correct.
- Analysis results are not fabricated.
- No duplicate background video is rendered.
- No duplicate workspace page is reachable through internal navigation.

### Browser verification — mandatory

Run the application and inspect the actual integrated page in a browser.

At minimum:
1. Open the canonical workspace route through the normal user flow.
2. Confirm the MP4 visibly plays behind all three panels.
3. Confirm the video is the same existing Phase 3 background asset/component.
4. Confirm the video loops and remains muted.
5. Confirm the workspace is the foreground content.
6. Confirm the map imagery is not replaced by or confused with the background video.
7. Navigate to input and back.
8. Try direct access without mission state.
9. Open the old Analysis URL and confirm redirect behavior.
10. Inspect browser console and network requests for errors and duplicate video downloads.

Take a screenshot of the final integrated page at:
- Desktop: `1912 × 911` or a comparable desktop viewport.
- Tablet: `1024 × 768`.
- Mobile: `390 × 844`.

Compare the final page with both supplied reference screenshots.

### Quality gates

Run:
- ESLint.
- TypeScript type-check.
- Unit tests.
- Component tests.
- Route/navigation tests.
- Browser/E2E tests.
- Production build.

Record actual command output and failures. Do not report checks as passing if they were not run.

## 11. Required debug and progress updates

Update:
- `context/progress-tracker.md`
- `context/debug-state-and-issue-tracker.md`

Record:
- Phase 6 implementation status.
- Canonical route.
- Old route and redirect behavior.
- Existing background component reused.
- Confirmation that its implementation was not changed.
- Browser playback verification result.
- Route guard behavior and whether it is workflow protection or real authentication.
- Test commands and actual outcomes.
- Any remaining defects.

Create or update issue IDs for:
- Background asset/playback failure.
- Duplicate background rendering.
- Incorrect route/redirect behavior.
- Missing mission state.
- Authentication/authorization failure, if applicable.

## 12. Completion criteria

- [ ] Existing Phase 3 background component inspected.
- [ ] Existing background component reused without redesign or replacement.
- [ ] Existing MP4 asset preserved.
- [ ] Background mounted once behind the workspace.
- [ ] Background visibly plays in the integrated page.
- [ ] Video loops, remains muted, and respects reduced-motion behavior.
- [ ] Three-panel Mission Planner workspace is the foreground page.
- [ ] Mission Input, Lunar Map, and Mission Analysis are on the same page.
- [ ] Existing mission data flow is preserved.
- [ ] Standalone Analysis page is removed or redirected after successful integration.
- [ ] One canonical workspace route is documented.
- [ ] All internal links point to valid routes.
- [ ] Mission workflow route guard works.
- [ ] Real server-side authentication is enforced if an auth provider exists.
- [ ] No fake authentication or misleading security claims are introduced.
- [ ] Direct access, refresh, back navigation, and old-route redirect are tested.
- [ ] Desktop, tablet, and mobile layouts are reviewed.
- [ ] Browser console and network checks are clean or documented.
- [ ] ESLint, type-check, tests, and production build pass or failures are documented.
- [ ] Progress and debug-state documents are updated.

## 13. Required completion report

When finished, provide:

1. Files created, modified, and removed.
2. Existing background component name and location.
3. Confirmation whether its source code was left unchanged.
4. MP4 public asset URL and actual browser playback result.
5. Final canonical workspace route.
6. Old standalone Analysis route behavior.
7. Route guard implementation and its security scope.
8. Confirmation that all three workspace panels render on the same page.
9. Browser screenshots and viewport sizes inspected.
10. Test commands run and actual pass/fail results.
11. Progress/debug tracker updates.
12. Remaining limitations.

**Do not mark Phase 6 complete until the existing MP4 background is visibly playing behind the integrated three-panel workspace in a real browser and the route behavior has been tested.**
