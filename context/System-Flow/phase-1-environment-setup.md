# Phase 1 — Environment, Dependencies, and Component Verification

## Objective

Prepare the existing Lunar Mission Planner repository for feature development. Install and configure the dependencies confirmed by `context/architecture-context.md`, verify that every imported library and UI component resolves correctly, and establish repeatable quality checks.

**This phase is setup only.** Do not implement mission calculations, connect live NASA services, build the full dashboard, or invent placeholder scientific results.

## Read first

Before changing files, read these project documents:

1. `context/AGENTS.md`
2. `context/project-overview.md`
3. `context/architecture-context.md`
4. `context/ui-context.md`
5. `context/code-standards.md`
6. `context/ai-workflow-rules.md`
7. `context/progress-tracker.md`

Inspect the existing repository (`package.json`, lockfile, `tsconfig.json`, Next.js config, Tailwind config, `src/` or `app/`, `components/`, and `node_modules/`) before installing anything. Preserve the existing package manager, scripts, folder structure, and working configuration where possible. Do not recreate an already initialized application.

The installed Next.js version may have changed APIs. Read the relevant documentation under `node_modules/next/dist/docs/` before modifying Next.js configuration or using framework APIs.

## Confirmed technology baseline

Use the architecture document as the source of truth. Confirm actual installed versions and compatibility before selecting versions or upgrading packages.

| Dependency / technology | Phase 1 action | Verification |
|---|---|---|
| Next.js 16 | Confirm installed version; install or align only if required | `next --version`, production build |
| React / React DOM | Confirm versions compatible with installed Next.js | TypeScript check and build |
| TypeScript | Ensure strict TypeScript configuration | `tsc --noEmit` |
| Tailwind CSS | Confirm the configured version and Next.js integration | Build and verify theme styles compile |
| shadcn/ui | Initialize/configure against the existing project; do not treat it as a single runtime package | Run its CLI, inspect `components.json`, add only needed components |
| lucide-react | Install if absent | Import and render a test icon |
| CSS custom properties / Tailwind theme tokens | Configure the existing theme using project tokens from `ui-context.md` | Build and inspect token usage |

Use the package manager indicated by the repository lockfile. Do not mix npm, pnpm, yarn, or bun lockfiles. Do not use floating or wildcard dependency versions. Avoid unnecessary major-version upgrades.

## Technologies that are not yet selected

The architecture deliberately leaves these choices open. Do not silently choose and install a library as if it were already approved.

- **Lunar map renderer:** evaluate options such as Leaflet or MapLibre only after confirming support for the required lunar coordinate reference system/projection, custom lunar imagery/tiles, coordinate overlays, zoom, recentering, and layer switching. A default Earth basemap configuration is not sufficient.
- **Lunar data provider:** verify the actual imagery/elevation dataset, access method, coordinate system, licensing, and service limits. QuickMap is a discovery/exploration resource, not proof of a turnkey application API.
- **PDF export:** select a browser-side or server-side PDF solution only after checking the report requirements and compatibility with the installed Next.js runtime.
- **Charts:** add a chart library only if the approved UI requires plotted data. Do not install Recharts merely because it appeared in an earlier suggestion.
- **Testing tools:** add the testing setup described below if the repository does not already have an equivalent working setup.
- **Database, authentication, queues, and collaboration:** do not add these unless confirmed by requirements.

For each proposed new dependency, record its purpose, compatibility, whether it is required now, and why an existing dependency cannot do the job. Keep optional integrations out of the baseline install.

## Setup tasks

### 1. Repository and runtime audit

- Identify the package manager from the lockfile and use it consistently.
- Check the Node.js version against the installed Next.js requirements.
- Inspect existing scripts and configuration before editing.
- Check for duplicate, deprecated, incompatible, or unused dependencies.
- Record the current baseline versions and any pre-existing failures before making changes.
- Do not delete or regenerate the lockfile without a clear reason.

### 2. Install and configure confirmed dependencies

- Ensure Next.js, React, React DOM, TypeScript, and Tailwind are installed and mutually compatible.
- Configure strict TypeScript without weakening existing checks to make errors disappear.
- Configure shadcn/ui using its current CLI and the existing project's styling conventions.
- Confirm the `@/*` alias only if it matches the actual `tsconfig.json` configuration; do not assume it exists.
- Install `lucide-react` if it is not already present.
- Keep the dark theme centralized in CSS custom properties and Tailwind theme tokens, following `ui-context.md`.
- Do not copy shadcn foundation component source manually when the CLI can add the component.

### 3. shadcn/ui component inventory

Inspect the actual UI requirements and add only the components needed for the initial application shell and mission-input form. Likely candidates include:

- button
- input
- label
- card
- select
- popover
- calendar (if a date-picker is needed and supported by the configured shadcn setup)
- tooltip
- separator
- skeleton
- sonner (only if toast notifications are required)

This list is a candidate inventory, not an instruction to install every component. Confirm the exact component names and CLI behavior from the current shadcn documentation/CLI. Do not add a component that is not used or needed by the approved UI.

For every component added:

1. Confirm its source file exists in the configured components directory.
2. Confirm all imported dependencies resolve.
3. Confirm the component exports the symbol used by the application.
4. Confirm its styles use the project's theme tokens and do not introduce unrelated palette colors.
5. Add a small compile/render smoke test where practical.
6. Remove stale imports and unused components.

### 4. Establish automated checks

Use existing equivalent tools if already configured. Otherwise establish a minimal testing setup compatible with the repository's installed versions.

Required checks:

- **Lint:** run the configured ESLint command.
- **Type check:** run `tsc --noEmit` or the repository's equivalent.
- **Production build:** run the Next.js production build.
- **Unit/component tests:** use Vitest with React Testing Library (and the appropriate DOM environment) unless an existing test runner is already established.
- **Browser smoke test:** use Playwright if the project can run a browser test in the development/CI environment. Install the required browser binaries using the official Playwright install command.
- **Dependency audit:** run the package manager's audit command and record findings. Do not apply automatic major upgrades or blindly force-fix dependency trees.

Suggested scripts (adapt to the actual package manager and current configuration):

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

Do not overwrite existing scripts blindly. If the repository uses a different lint command or test runner, preserve and document it. Make the `check` script invoke the actual configured commands.

### 5. Component and import verification

Create a dependency/component verification checklist or test that covers all imports introduced during this phase.

At minimum verify:

- Framework and React imports compile.
- TypeScript path aliases resolve.
- Tailwind styles and global CSS compile.
- Every shadcn component imported by the app exists and exports the expected symbol.
- Every Lucide icon imported by the app resolves.
- No unresolved imports, missing packages, invalid component paths, or case-sensitive path mistakes remain.
- No browser-only package is imported into a Server Component unless it is intentionally isolated behind a Client Component boundary.
- No server-only provider secret or API key is exposed to client-side code.

Use static checks and a real compile/build; do not rely only on manually checking package names. If a dependency has no reliable smoke test, document the limitation.

### 6. Minimal setup verification page

Create only a small temporary or permanent setup/shell page that proves the installed UI stack works. It may render a heading, a card, a labelled input, a button, and a Lucide icon using the configured theme. It must not pretend to perform mission analysis or show fabricated lunar measurements.

If this page is intended to remain in the product, keep it as a clean application shell rather than naming it a test page. Do not add a fake lunar map or fabricated NASA data.

## Acceptance criteria

Phase 1 is complete only when all applicable items below pass:

- [ ] Existing repository structure and package manager are preserved.
- [ ] Node.js and installed Next.js versions are recorded and compatible.
- [ ] Next.js, React, React DOM, TypeScript, and Tailwind are installed/configured consistently.
- [ ] shadcn/ui CLI configuration is valid and documented.
- [ ] `lucide-react` is installed and a representative icon import compiles.
- [ ] Theme tokens are centralized and compile successfully.
- [ ] Every UI component imported in this phase exists, exports the expected symbol, and has its dependencies installed.
- [ ] No unresolved imports or TypeScript errors remain.
- [ ] Lint passes.
- [ ] Type check passes.
- [ ] Unit/component smoke tests pass.
- [ ] Production build passes.
- [ ] Playwright smoke test passes if browser testing is configured; otherwise the blocker is documented.
- [ ] Dependency audit findings are recorded and triaged.
- [ ] Undecided map, terrain, chart, and PDF technologies remain explicitly unselected until verified.
- [ ] `context/progress-tracker.md` is updated with completed work, versions, commands, results, and remaining decisions.

## Required final report from the coding agent

At the end of Phase 1, report:

1. Dependencies installed, with exact versions and reasons.
2. Existing dependencies reused rather than duplicated.
3. shadcn components added and where they live.
4. Configuration files created or changed.
5. Exact commands run and pass/fail results for lint, typecheck, tests, build, browser smoke test, and audit.
6. Any warnings, vulnerabilities, skipped checks, or environment blockers.
7. Technologies still awaiting selection and the evidence needed to select them.
8. Confirmation that no scientific calculations or live-data claims were implemented in this phase.

Do not mark a check as passed unless the command was actually run and its result observed. Do not hide failures by disabling lint rules, loosening TypeScript, skipping tests, or suppressing build errors.
