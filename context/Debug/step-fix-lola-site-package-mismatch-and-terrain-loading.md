# Debug Step — Fix LOLA Site-Package Mismatch and Local Terrain Loading

## Objective

Fix the current local-terrain loading failure without changing the working global Moon imagery, re-downloading the LOLA source DEM, or rebuilding the Cesium viewer.

The latest screenshot and server log show that the application is requesting a terrain package for a different site than the site prepared during the earlier Phase 34 workflow.

### Evidence from the current run

Selected site shown in the screenshot:

- Latitude: `9.00° S` (`-9.0000°`)
- Longitude: `10.00° E` (`10.0000°`)
- Requested site key: `site_09_00S_10_00E`

Request observed in the Next.js log:

```text
GET /api/terrain/package?type=manifest&site=site_09_00S_10_00E 404
```

The previously prepared Phase 34 package was recorded for:

- Latitude: `89.50° S` (`-89.5000°`)
- Longitude: `0.00° E` (`0.0000°`)
- Recorded site key: `site_89_50S_00_00E`

These are different lunar regions. A South Pole crop must not be served as terrain for `9° S, 10° E`.

## Required outcome

1. The global Moon and working NASA Moon Trek imagery remain visible at all times.
2. The Local 3D Terrain mode requests the package that corresponds to the currently selected mission coordinates.
3. If a prepared package exists for the selected site, its manifest and heightmap load and are validated before rendering.
4. If no package exists for that site, show a clear `PACKAGE_NOT_PREPARED` or `OUTSIDE_DATA_COVERAGE` state—not a generic terrain failure and not fabricated terrain.
5. The user can test the already-prepared Phase 34 site by selecting `-89.5000°, 0.0000°`.
6. Do not download the original multi-gigabyte DEM again during this debug step.

---

## Step 1 — Audit the actual Phase 34 output before changing code

Inspect the repository and local filesystem. Do not assume paths from documentation are correct.

1. Find the actual processed terrain package directory.
2. Locate its `terrain-manifest.json`.
3. Read the manifest and record:
   - `site_key`;
   - selected latitude and longitude;
   - raster width and height;
   - actual source pixel spacing and output sample spacing;
   - projected bounds and CRS WKT;
   - NoData value and valid sample count/percentage;
   - actual paths and sizes of the DEM crop, heightmap and optional quality/count file.
4. Confirm every file referenced by the manifest exists and has a non-zero, plausible size.
5. Confirm the manifest site really corresponds to `-89.5°, 0°` (within documented tolerance).
6. Do not modify, delete, rename or regenerate the completed Phase 34 source files as part of this audit.

If the manifest or heightmap cannot be found, stop and report the exact missing path. Do not create an empty replacement or claim the package is available.

## Step 2 — Trace site selection from UI to API

Inspect the complete data path:

`Mission input/state -> simulation page -> MoonViewer props -> site-key builder -> /api/terrain/package -> manifest lookup`

Verify that:

- The simulation receives the authoritative selected mission latitude and longitude.
- Latitude sign and longitude east-positive convention are preserved.
- The displayed coordinate, marker coordinate, camera target, API query and site key all derive from the same normalized coordinate object.
- No `-89.5, 0` fallback is silently substituted when the user selected another site.
- No stale value from a previous mission run is used.
- The site-key formatting is deterministic and shared between preparation and API lookup code.

Add or reuse one canonical helper for site-key generation. Do not maintain separate, slightly different formatting logic in the Python preparation script, React component and API route.

Expected examples (confirm against the existing canonical format):

```text
-89.5000, 0.0000 -> site_89_50S_00_00E
-9.0000, 10.0000 -> site_09_00S_10_00E
```

The exact rounding/precision policy must be explicit. Do not round two distinct user sites into the same key without a documented crop-centering/tolerance policy.

## Step 3 — Correct the API package-discovery behavior

Inspect the route handling:

`GET /api/terrain/package?type=manifest&site=<siteKey>`

The route must:

1. Validate `type` and `site` query parameters.
2. Resolve the requested site key only inside the configured processed-terrain root.
3. Prevent path traversal and arbitrary filesystem reads.
4. Resolve the manifest path using the actual Phase 34 directory structure.
5. Read and validate the manifest before returning it.
6. Return the manifest's actual relative asset URLs or the repository's established asset references; do not leak absolute Windows filesystem paths to the browser.
7. Check that referenced assets exist before advertising the package as available.
8. Avoid reading the entire large raw DEM when a manifest or small local crop is requested.

### Required structured response behavior

Use the project's existing API response conventions where possible. The UI must be able to distinguish these states:

- `PACKAGE_AVAILABLE`: manifest and all required terrain assets exist and pass basic validation.
- `PACKAGE_NOT_PREPARED`: the selected location is within a known source-product region, but no site-specific processed crop exists.
- `OUTSIDE_DATA_COVERAGE`: the selected location is outside the verified source DEM footprint.
- `MANIFEST_NOT_FOUND`: no manifest exists for the requested key.
- `MANIFEST_INVALID`: manifest exists but schema, coordinate, CRS or required metadata validation fails.
- `ASSET_NOT_FOUND`: the manifest references a missing heightmap/DEM asset.
- `ASSET_INVALID`: an asset exists but its size, dimensions, encoding or sample count is invalid.
- `SERVER_ERROR`: unexpected API/filesystem failure.

A `404` may remain appropriate for a missing package, but return a structured machine-readable error code and explanatory message. Do not collapse all missing-package cases into a generic `LOLA Terrain Unavailable` error.

Do not return `PACKAGE_AVAILABLE` merely because the manifest file exists. Confirm the required heightmap asset is present and consistent with the manifest.

## Step 4 — Make the UI honest and useful for the selected site

For the current screenshot's selection (`-9°, 10°`), if no matching prepared package exists, show:

**Local terrain not prepared for this site**

`The current mission location is 9.00° S, 10.00° E. The available prepared LOLA package is for a different region (89.50° S, 0.00° E). Select the prepared test site or prepare a terrain crop for this location.`

Provide an explicit action such as **Use Prepared Test Site** only if the product owner wants this workflow. Clicking it must deliberately update the mission selection to `-89.5°, 0°` and synchronize the marker and camera. Never silently change the selected site.

For the prepared site, the terrain loading state should proceed through clear stages:

1. Resolving site package.
2. Validating manifest.
3. Loading heightmap.
4. Validating heightmap dimensions and sample values.
5. Building terrain mesh.
6. Attaching terrain to the Cesium scene.
7. Verifying visible local terrain.

Only report each stage complete after its operation actually succeeds.

Keep the Global Moon view mounted and usable if local terrain package lookup fails.

## Step 5 — Fix/guard React loading lifecycle if still present

Earlier logs showed `Maximum update depth exceeded` around `loadLolaTerrain` and `onTerrainStatusChange`. Confirm whether this issue still exists in the current code before making changes.

If present:

- Stabilize the parent status callback with `useCallback`, or use a callback ref where appropriate.
- Ensure the terrain-loading effect depends only on stable inputs such as normalized site key, manifest URL and explicit reload generation.
- Do not include a newly created inline callback/object in the effect dependency list.
- Do not call state setters unconditionally from an effect that is retriggered by the state update.
- Use an `AbortController` or cancellation flag for stale fetches.
- Prevent duplicate in-flight manifest/heightmap requests for the same site key.
- Keep retry behavior explicit and bounded; do not create an automatic retry loop.
- Reset loading state only when the selected site/package key genuinely changes or the user explicitly retries.

Add a regression test proving that a status update does not trigger another manifest request by itself.

## Step 6 — Verify with the prepared Phase 34 site

Use these exact test coordinates first:

```text
Latitude:  -89.5000
Longitude:   0.0000
Expected recorded package key: site_89_50S_00_00E
```

Then:

1. Select `-89.5°, 0°` through the actual mission input flow.
2. Open 3D Simulation.
3. Confirm the selected-site card displays `89.50° S, 0.00° E`.
4. Confirm the API requests `site_89_50S_00_00E`.
5. Confirm the manifest endpoint returns the expected manifest.
6. Confirm the heightmap request returns the expected bytes and content length.
7. Confirm width, height, data type, byte order and sample count match the manifest.
8. Confirm elevation samples are finite where valid and preserve NoData/mask semantics.
9. Confirm the resulting terrain mesh is attached and visible in Local 3D Terrain mode.
10. Switch to Global Moon and confirm the global textured Moon still works.

After that, deliberately select `-9°, 10°` again. The application must clearly report that a package is not prepared for that site (unless a valid package for it actually exists). It must not display the South Pole terrain at the wrong location.

## Step 7 — Required automated tests

Add/fix focused tests for:

- canonical site-key generation for both the prepared South Pole site and the current `-9°, 10°` screenshot site;
- API manifest lookup for a valid prepared package;
- missing package response for an unprepared site;
- invalid manifest response;
- missing heightmap asset response;
- path traversal rejection;
- no substitution of one site's package for another;
- coordinate consistency between UI props, marker and API request;
- no repeated manifest request caused only by status state updates;
- cancellation of stale requests when the selected site changes;
- global Moon remains available when terrain package lookup returns a structured error.

Run the relevant existing checks, using the project's actual scripts:

- focused terrain/API tests;
- focused simulation component tests;
- `npm run typecheck`;
- `npm run lint`;
- production build;
- browser E2E checks if configured.

Do not modify or bypass existing tests merely to make this step pass.

## Step 8 — Browser evidence and completion report

Capture screenshots for both cases:

### Case A — Prepared site

- Selected site: `-89.5°, 0°`.
- Manifest status: passed.
- Heightmap status: passed.
- Local mesh: visibly rendered from actual LOLA samples.
- Global Moon: still works after switching back.

### Case B — Unprepared site

- Selected site: `-9°, 10°`.
- UI clearly reports `PACKAGE_NOT_PREPARED` or the correct coverage state.
- No false success badge.
- No South Pole terrain shown at the equatorial/subtropical site.
- Global Moon imagery remains visible.

Update `context/progress-tracker.md` with:

- root cause;
- files changed;
- exact package key and manifest used;
- API response codes and structured status values;
- test commands and actual results;
- browser screenshots/evidence paths;
- unresolved issues.

## Strict scope boundaries

- Do not re-download the original multi-gigabyte LOLA DEM.
- Do not regenerate or overwrite the completed Phase 34 package unless validation proves a specific asset is corrupt and the reason is documented.
- Do not implement rover models, rover movement, obstacle detection or pathfinding.
- Do not redesign the simulation UI.
- Do not remove the working global Moon imagery.
- Do not hardcode the South Pole package as the answer for every mission location.
- Do not fabricate elevation data or claim terrain is verified because an API returned HTTP 200.

## Definition of done

This debug step is complete only when:

1. The prepared `-89.5°, 0°` package is discovered and loaded correctly.
2. Its actual LOLA heightmap produces visible local 3D terrain geometry.
3. The `-9°, 10°` selection is handled honestly as unprepared/outside coverage unless a matching package exists.
4. The global textured Moon remains functional in both cases.
5. Manifest requests do not loop or multiply due to React state updates.
6. Automated checks pass and browser evidence is recorded.

If the prepared manifest or assets are missing, stop at package audit and report the exact missing file. Do not mark this step complete.
