# Debug Step — Fix LOLA Terrain Effect Loop and Restore the 3D Viewer

## Purpose

Fix the runtime failure shown in the latest browser/server log. The current simulation is not rendering a usable Moon or local 3D terrain scene. The logs show repeated requests to the terrain manifest endpoint and React's **Maximum update depth exceeded** warning.

This is a targeted debugging step. Do not redesign the simulation, replace the working Moon Trek imagery integration, redownload the LOLA DEM, or begin rover implementation.

## Evidence from the supplied log

The log repeatedly shows:

```text
GET /api/terrain/package?type=manifest&site=site_89_50S_00_00E 200
```

It also reports:

```text
[browser] Maximum update depth exceeded.
    at loadLolaTerrain (components/simulation/lunar-simulation-page.tsx:588:9)
    at MoonViewer.useEffect (components/simulation/lunar-simulation-page.tsx:690:10)
```

The reported state updates occur at:

- `components/simulation/lunar-simulation-page.tsx:588` when the status becomes `loading-manifest`.
- `components/simulation/lunar-simulation-page.tsx:673` when the terrain status becomes `error`.

The server returns HTTP 200 for the manifest route, but that alone does not prove that the manifest JSON is valid, the heightmap is fetched, or a 3D mesh has been constructed and rendered. The repeated requests indicate that the loading effect is being restarted instead of completing once for the selected site.

## Likely root cause to verify

Inspect the `MoonViewer` `useEffect` around line 690 and the parent that passes `onTerrainStatusChange`.

The likely feedback loop is:

1. The parent renders `MoonViewer` and creates a new `onTerrainStatusChange` callback function.
2. `MoonViewer`'s effect depends on that callback.
3. The effect starts `loadLolaTerrain()` and calls `onTerrainStatusChange(...)`.
4. The callback updates parent state.
5. The parent rerenders and creates a new callback identity.
6. React sees the effect dependency changed, cleans up/restarts the effect.
7. The effect fetches the manifest again and updates status again.
8. The loop repeats, producing repeated manifest requests and the maximum-update-depth warning.

Confirm this from the actual source before applying the fix. Do not assume the callback is unstable without inspecting its declaration and dependency list.

## Required fixes

### 1. Stabilize status callbacks

- Find where `onTerrainStatusChange` is declared and passed to `MoonViewer`.
- If it is created inline in the parent, wrap it with `useCallback` using the minimum correct dependencies.
- Prefer a stable callback that delegates to the existing state setter without capturing values that change every render.
- Do not use an empty dependency array if the callback reads changing state.
- Do not silence React hook dependency lint rules to hide the problem.

Example pattern only; adapt to the real component and state types:

```tsx
const handleTerrainStatusChange = useCallback((next: TerrainStatus) => {
  setTerrainStatus((current) => {
    if (areTerrainStatusesEqual(current, next)) return current;
    return next;
  });
}, []);
```

If a correct stable callback cannot be achieved without capturing changing values, use a ref for the latest callback implementation while keeping the effect's actual data dependencies explicit. Do not create a stale-closure bug.

### 2. Make the terrain-loading effect depend on data, not render identity

- Inspect the effect dependency array around line 690.
- It should rerun when the selected site key or another genuine terrain input changes, not on every parent render.
- Keep the selected site key stable and derive it from the authoritative mission input.
- Preserve `exhaustive-deps` correctness.
- Do not move state updates into render or `useMemo`.

### 3. Prevent duplicate requests and clean up correctly

- Use an `AbortController` for the manifest and subsequent package requests where supported.
- Abort requests when the site changes or the viewer unmounts.
- Add a request identity or `useRef` guard keyed by the site and package version to avoid duplicate in-flight manifest loads.
- Do not use a permanent one-time ref that prevents loading a newly selected site.
- Do not repeatedly retry a persistent 404/invalid-manifest response automatically. Show a stable error state and expose an explicit Retry action.
- Keep retry behavior user-triggered or bounded with a clearly defined retry count.

### 4. Validate the manifest before requesting height data

For a single selected site, the expected sequence is:

1. Request manifest once.
2. Check `response.ok`.
3. Parse JSON with error handling.
4. Validate the required schema/version, selected site, file paths, dimensions, pixel spacing, CRS/projection, elevation units, NoData handling and declared data lengths.
5. Request the prepared heightmap and any required quality/metadata assets once.
6. Verify byte length against manifest dimensions and value type.
7. Decode samples and construct the terrain geometry.
8. Attach the geometry to the existing Cesium scene.
9. Publish the final terrain status once.

An HTTP 200 from `/api/terrain/package?type=manifest` must only be reported as **Manifest endpoint reachable** until the JSON and referenced assets have passed validation.

### 5. Do not let a terrain failure blank the global Moon

- Keep the working Cesium Moon globe and Moon Trek imagery mounted independently from optional local LOLA terrain.
- A manifest/heightmap error must show a terrain error panel or status, not unmount or replace the global Moon viewer.
- The viewer must remain usable while local terrain is loading or unavailable.
- If local terrain fails, retain the existing Moon imagery view and provide a Retry action.
- Do not substitute a fake mesh or generated terrain and label it as LOLA.

### 6. Restore the 3D terrain path

Once the effect loop is fixed, verify that the pipeline progresses beyond the manifest request:

- Manifest request occurs once per site load.
- Heightmap request occurs only after manifest validation.
- Heightmap byte length and decoded sample count match the manifest.
- Terrain mesh vertex/index counts are nonzero and consistent with dimensions.
- Elevations preserve the declared scale and offset; do not assume raw Float32 values are metres unless the manifest confirms it.
- NoData samples are masked/handled and are not converted into artificial zero-height terrain.
- The mesh is positioned using the manifest's actual lunar CRS/projection and reference frame. Do not treat lunar polar stereographic coordinates as Earth WGS84 coordinates.
- Terrain imagery is only draped when its projection, extent and registration are verified. Otherwise show a truthful grayscale/hillshade terrain view and mark imagery draping as pending.

## Required diagnostics

Update diagnostics so each stage is separately represented:

- `viewer-initialized`
- `moon-globe-visible`
- `moon-imagery-rendered`
- `manifest-requested`
- `manifest-validated`
- `heightmap-requested`
- `heightmap-validated`
- `terrain-mesh-created`
- `terrain-mesh-attached`
- `terrain-visible`
- `error`

Do not mark a stage passed merely because an earlier stage passed. In particular:

- Manifest HTTP 200 != valid manifest.
- Valid manifest != heightmap loaded.
- Heightmap loaded != mesh created.
- Mesh created != mesh attached.
- Mesh attached != visually visible terrain.

Add safe diagnostics for request count, site key, manifest schema version, dimensions, expected/received bytes, decoded sample count, mesh vertex/index count and errors. Do not log large binary content or private data.

## Required tests

Add or update focused tests for:

1. The terrain manifest effect runs once for a stable selected site and stable callbacks.
2. A terrain status update does not retrigger the manifest request.
3. Changing the selected site triggers exactly one new request for that site.
4. Unmounting or changing site aborts the prior request.
5. A manifest 200 response with invalid JSON/schema shows an error without looping.
6. A missing manifest or heightmap shows an error without looping.
7. A valid manifest leads to exactly one heightmap request and mesh construction.
8. A terrain failure does not unmount the global Moon viewer.
9. Retry makes one bounded new attempt.
10. No React maximum-update-depth warning occurs during the test.

Use the repository's existing test framework and conventions. Do not add a new testing framework for this fix.

## Browser verification

Run the application and inspect the actual simulation route.

Capture evidence for:

- The Moon globe and Moon Trek imagery visible before terrain loading.
- One manifest request for the selected site, not a continuous request stream.
- The heightmap request and successful validation after the manifest.
- A non-empty terrain mesh attached to the Cesium scene.
- Local terrain visually present when the prepared data is valid.
- Global Moon remains visible if local terrain fails.
- Changing site loads the correct site package once.
- No `Maximum update depth exceeded` warning.
- No continuous repeated `/api/terrain/package?type=manifest` requests.

A successful build or unit test alone is not proof of browser rendering. Record screenshots and browser console/network evidence.

## Commands

Use the scripts that actually exist in `package.json`. At minimum run the applicable commands:

```bash
npm run typecheck
npm run lint
npm run test -- --run tests/simulation-page.test.tsx
npm run build
```

If the terrain-specific Python tests exist, run those too. Do not claim a test passed unless it was executed in this work session and its exit code was successful.

## Scope boundaries

- Fix the current infinite-render/request loop first.
- Preserve the working global Cesium Moon and Moon Trek imagery integration.
- Reuse the Phase 34 prepared DEM package and manifest; do not redownload the source DEM.
- Do not rewrite or replace Phase 34 outputs.
- Do not begin rover model, movement, path planning or hazard detection.
- Do not claim LOLA terrain is complete until the local mesh is visibly rendered and validated against the prepared DEM.

## Completion criteria

Mark this debug step **VERIFIED** only when all of the following are true:

1. The React maximum-update-depth warning is gone.
2. Manifest requests no longer repeat for a stable site.
3. The manifest is validated and the heightmap is actually loaded.
4. A non-empty elevation mesh is created and attached.
5. The Moon globe remains visible during loading and terrain failures.
6. Actual local LOLA terrain is visible in the browser.
7. Automated checks pass and browser evidence is recorded.

Otherwise report **PARTIAL** and list the exact first failing pipeline stage. Update `context/progress-tracker.md` and the relevant debug issue tracker with changed files, tests actually executed, screenshots/evidence and remaining work.
