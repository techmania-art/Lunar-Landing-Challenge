# Phase 2 — Set Up and Download 3D Libraries and Dependencies

## Project
Lunar Mission Planner — Stage 1 foundation for a 3D lunar-surface simulation using NASA Moon Trek imagery and, in a later phase, LOLA elevation data.

## Objective
Prepare the existing Next.js + React + TypeScript application to use CesiumJS. Install the library with the repository's existing package manager, copy Cesium's required browser runtime assets into the Next.js `public` directory, configure safe client-only loading, and verify the setup.

**This phase is dependency setup only. Do not build the Moon globe, integrate the Moon Trek layer, download a bulk lunar imagery dataset, create terrain meshes, add rover models, or implement navigation/hazard detection. Those belong to later phases.**

---

## 1. Mandatory repository audit before changing anything

1. Work only inside the existing Lunar Mission Planner repository.
2. Inspect the actual repository root, `package.json`, lockfiles, Next.js configuration, TypeScript configuration, `app/layout.tsx` (or the actual root layout), and existing `scripts/` directory.
3. Confirm the project uses the Next.js App Router or Pages Router. Follow the existing structure; do not migrate routers.
4. Identify the active package manager from the repository's lockfile and `packageManager` field:
   - `package-lock.json` → npm
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → Yarn
   - `bun.lock` / `bun.lockb` → Bun
5. Use only that package manager. Do not create a second lockfile or replace an existing lockfile.
6. Record the existing Node.js, package-manager, Next.js, React, and TypeScript versions before installation.
7. Check the current working tree and preserve all pre-existing user changes. Do not reset, clean, or overwrite unrelated files.

If the repository is not the expected application or the package manager cannot be identified safely, stop and report the finding instead of guessing.

## 2. Dependency decision

### Required now

- `cesium` — the 3D geospatial rendering engine. Use the npm package's built-in TypeScript declarations.

Install the latest stable CesiumJS release compatible with the existing project, using the identified package manager. Verify the version first (`npm view cesium version` for npm, or the equivalent registry query for the active package manager), then install that exact stable version and allow the lockfile to record it.

For npm, the intended pattern is:

```powershell
npm view cesium version
npm install cesium@<verified-stable-version>
```

Replace the placeholder with the version returned by the registry. Do not install a beta, alpha, release candidate, or nightly build.

### Do not install in this phase

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `resium` or another React wrapper for Cesium
- `@types/cesium` (CesiumJS includes TypeScript declarations)
- `geotiff`, `proj4`, raster-processing libraries, or pathfinding packages

These are either competing engines, unnecessary wrappers/types, or dependencies for later data-processing and navigation phases. Add future dependencies only after the exact LOLA data format and processing approach have been selected.

Do not add Cesium ion tokens or NASA API keys. This phase must not introduce secrets. The public Moon Trek WMTS endpoint and its layer details will be verified separately before imagery integration.

## 3. Download and copy Cesium browser runtime assets

CesiumJS requires its static runtime assets to be served by the web application. Create an idempotent Node.js script at:

`scripts/copy-cesium-assets.mjs`

The script must copy these four directories from the installed Cesium package:

- `node_modules/cesium/Build/Cesium/Workers`
- `node_modules/cesium/Build/Cesium/ThirdParty`
- `node_modules/cesium/Build/Cesium/Assets`
- `node_modules/cesium/Build/Cesium/Widgets`

Destination:

- `public/cesium/Workers`
- `public/cesium/ThirdParty`
- `public/cesium/Assets`
- `public/cesium/Widgets`

Implementation requirements:

1. Use Node's built-in `fs/promises` or `fs` and `path`; do not add a copy utility dependency.
2. Resolve all paths relative to `process.cwd()` (the repository root), not a hard-coded Windows path.
3. Create `public/cesium/` when it does not exist.
4. Copy recursively and overwrite only the generated Cesium asset folders. Never delete or replace the entire `public/` directory.
5. Fail with a clear, actionable error if the installed Cesium asset source is missing.
6. Print a short success message listing the copied asset directories.
7. Running the script more than once must be safe.

Add a package script named `cesium:copy-assets` that invokes this file. Preserve every existing package script. Do not replace or remove existing `preinstall`, `postinstall`, `predev`, `dev`, `prebuild`, or `build` scripts. If automated copying is needed later, compose with existing lifecycle scripts without changing their behavior; for this phase, the explicit copy command is sufficient.

Run the asset-copy script after dependency installation.

## 4. Configure the Cesium asset base URL and client-only loading

Cesium must be initialized only in the browser. Do not import or instantiate Cesium from a Server Component or code that executes during server rendering.

Create a small, reusable client-side loading boundary in the existing component organization. Follow these rules:

1. Any component that initializes Cesium must include `"use client"`.
2. Set `window.CESIUM_BASE_URL = "/cesium/"` before dynamically importing the `cesium` package.
3. Dynamically import Cesium from a browser-only execution path (for example, inside a `useEffect` or a client-only dynamic component).
4. Do not statically import Cesium from a Server Component, a server utility, or the root layout.
5. Import Cesium's widget CSS from `cesium/Build/Cesium/Widgets/widgets.css` using the location permitted by the repository's Next.js router (normally the root layout for global CSS). Do not introduce duplicate CSS imports.
6. Keep the loader reusable for the later Moon Trek globe phase.
7. Do not initialize the default Earth WGS84 globe as if it were the Moon. Do not enable Cesium World Terrain, OpenStreetMap, Google imagery, or other Earth defaults for the lunar simulation.
8. Do not add a Cesium ion access token or expose any secret in client code.

If the existing Next.js bundler requires an explicit static-asset configuration, add only the minimal configuration compatible with the current Next.js version. Do not blindly add a Webpack plugin or replace the project's bundler configuration. Prefer the explicit Node copy script above for the four runtime asset folders.

## 5. Add a minimal setup verification

Create a temporary, isolated developer verification page/component that is not linked in the public navigation and does not replace any existing map or workspace. It should:

- Run only in the browser.
- Set `CESIUM_BASE_URL` before dynamically importing Cesium.
- Verify that essential exports such as `Viewer`, `Ellipsoid`, and `WebMapTileServiceImageryProvider` can be imported.
- Verify that a known copied file under `/cesium/Assets/` can be fetched successfully (HTTP 200).
- Display a clear pass/fail result and the error message if a check fails.
- Avoid initializing an Earth basemap or presenting Earth data as lunar data.

Remove the temporary verification page after tests if the repository does not have an established developer-only test route. Keep the reusable loader and asset-copy script.

## 6. Validation

Run all relevant checks using the existing package manager and project scripts:

1. Dependency installation completes without errors.
2. The existing lockfile is updated; no second lockfile is created.
3. `cesium:copy-assets` completes successfully.
4. Confirm all four directories exist under `public/cesium/` and contain files.
5. Run TypeScript type-checking using the existing script or the repository's established command.
6. Run lint using the existing script.
7. Run the production build using the existing script.
8. Run the temporary browser verification page and confirm the Cesium import and static asset request succeed.
9. Inspect the final diff to ensure unrelated application files and behavior are unchanged.

Do not claim success for a check that was not actually run. Report any check blocked by environment or missing tools.

## 7. Strict scope boundaries

Do not:

- Build or redesign the existing Lunar Mission Planner UI.
- Replace the existing lunar map or any current map provider.
- Add a new navigation item or public page for the simulator.
- Implement the Moon Trek WMTS layer yet.
- Guess a Moon Trek layer identifier, tile matrix set, projection, URL template, or tile format. Those must be read from the official WMTS GetCapabilities document in the imagery-integration phase.
- Download all Moon Trek map tiles or large LOLA datasets during dependency setup.
- Generate fake lunar imagery, fake elevation values, or fabricated mission data.
- Add procedural craters or random terrain and label them as real lunar data.
- Implement rover movement, obstacle detection, pathfinding, lighting analysis, or communication analysis.
- Modify SIS, LiveKit, Gemini, Horizons, authentication, API routes, or unrelated application features.
- Add NASA logos, NASA insignia, mission patches, or other NASA branding to generated assets.

## 8. Completion report

At the end, create or update a concise report at:

`docs/PHASE_2_CESIUM_DEPENDENCY_SETUP_REPORT.md`

Include:

- Existing project versions and package manager identified.
- CesiumJS version installed.
- Files created or modified.
- Four runtime asset directories copied and their destination.
- How browser-only loading and `CESIUM_BASE_URL` were configured.
- Commands executed and their actual results.
- Any warnings, blockers, or follow-up work.
- Confirmation that no Moon Trek tiles, LOLA datasets, or rover simulation logic were integrated in this phase.

## Definition of done

Phase 2 is complete only when CesiumJS is installed through the existing package manager, its four runtime asset folders are copied into `public/cesium/`, the application can load Cesium on the client without SSR errors, the static asset check succeeds, TypeScript/lint/build checks pass (or any failure is clearly documented), and all unrelated Lunar Mission Planner features remain intact.

---

## Official references

- CesiumJS downloads and npm installation: https://cesium.com/downloads/
- CesiumJS npm package and TypeScript declaration information: https://www.npmjs.com/package/cesium
- CesiumJS Quickstart, including `CESIUM_BASE_URL` and required static asset folders: https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/
- NASA Moon Trek: https://trek.nasa.gov/moon/
- NASA Trek WMTS API documentation: https://trek.nasa.gov/tiles/apidoc/
- NASA Open APIs — Moon Trek WMTS overview: https://api.nasa.gov/
