# Debug & Fix — LOLA Terrain Package Discovery

**Task type:** Focused debug/fix step (not a new project phase)  
**Primary symptom:** The 3D Simulation page displays:

> LOLA Terrain Loading Error  
> LOLA Terrain Unavailable  
> Prepared terrain package unavailable for site `site_89_50S_00_00E`

**Known project context:** Phase 34 has been marked complete in `context/progress-tracker.md`. The project has a terrain preparation script at `scripts/terrain/prepare_lola_dem.py`, a terrain package API under `/api/terrain/package`, and a Cesium simulation component at `components/simulation/lunar-simulation-page.tsx`. A prior run reported that the manifest API returned HTTP 200 repeatedly, while the browser also logged `Maximum update depth exceeded` from the terrain-loading effect around `MoonViewer` and `onTerrainStatusChange`.

The purpose of this task is to make the application reliably discover and serve the **already prepared** Phase 34 package for the active site. Do not download the source DEM again unless repository inspection proves the prepared package is actually absent or invalid and the user explicitly approves a new download.

---

## 1. Non-negotiable scope

1. Fix prepared-terrain package discovery and delivery for the existing site key `site_89_50S_00_00E`.
2. Inspect and fix the actual package API route, filesystem path resolution, manifest validation, and referenced file delivery.
3. Fix the React effect loop that repeatedly requests the manifest, if it is still present.
4. Preserve the currently working Moon Trek global Moon imagery and Cesium globe.
5. Keep terrain loading failure isolated: a missing local terrain package must never blank, destroy, or remount the global Moon viewer.
6. Do not change NASA Moon Trek WMTS configuration as part of this task unless logs prove the failure is related to it. The current reported error is specifically local terrain package discovery.
7. Do not implement rover models, rover motion, obstacle detection, pathfinding, or new terrain-analysis features.
8. Do not silently regenerate or overwrite the Phase 34 DEM, heightmap, count/quality raster, or manifest.
9. Do not fabricate data or return success when a file is missing.
10. Update `context/progress-tracker.md` and the existing debug issue tracker with actual evidence only.

## 2. Start with repository and data audit — no changes yet

Inspect the exact current repository state before editing:

- `context/progress-tracker.md`
- `context/architecture-context.md`
- `scripts/terrain/prepare_lola_dem.py`
- `scripts/terrain/requirements.txt`
- the route implementing `/api/terrain/package`
- `components/simulation/lunar-simulation-page.tsx`
- `tests/simulation-page.test.tsx`
- `scripts/terrain/tests/test_prepare_lola_dem.py`
- `.gitignore`
- the actual `data/lunar-terrain/` directory and its subdirectories

Record the actual files and sizes found. Do not infer file existence from the progress tracker or from a successful API response.

### Required filesystem discovery

Find and report:

- all `terrain-manifest.json` files under the expected processed-data root;
- all prepared DEM crops;
- all heightmap files;
- all quality/count files, if any;
- the actual directory name containing the prepared site package;
- whether the raw DEM is still present, partially downloaded, or absent;
- whether the prepared data is ignored by Git as intended.

The expected site key is:

```text
site_89_50S_00_00E
```

The expected package layout may look like:

```text
data/lunar-terrain/
  raw/                         # large source files; never browser-served directly
  processed/
    site_89_50S_00_00E/
      terrain-manifest.json
      dem-native-crop.tif
      heightmap-*.f32
      data-quality-*.bin        # only if genuinely generated
      terrain-preview.png       # optional diagnostic preview
```

This layout is a discovery target, not permission to move or rename files blindly. The actual manifest may specify a different valid output location. The route and preparation script must agree on one canonical package root.

If the package does not exist, stop the rendering path from repeatedly requesting it. Report `PACKAGE_NOT_FOUND` accurately and explain which expected files are absent. Do not claim Phase 34 data exists just because the tracker says Phase 34 complete.

## 3. Find and fix the package-root/path-resolution mismatch

Trace the entire path from the frontend request to the filesystem:

```text
active mission coordinates
  -> site-key generation
  -> GET /api/terrain/package?type=manifest&site=...
  -> route validates site key
  -> route resolves canonical processed-data root
  -> route resolves terrain-manifest.json
  -> route validates manifest
  -> route returns manifest
  -> frontend resolves manifest asset paths
  -> frontend requests heightmap / quality data
```

Check common causes without assuming any one is the cause:

- API route is resolving relative to the current working directory instead of the project root.
- Route expects `public/` but Phase 34 writes under `data/`.
- Route expects `processed/<site>/` but script writes to a different configured `--output-dir`.
- The site-key format differs between frontend, preparation script, manifest and API route.
- Case sensitivity or punctuation/decimal normalization differs.
- Windows path separators are being returned to browser code.
- Manifest contains absolute paths from the developer machine.
- Route incorrectly assumes a default file name such as `heightmap-10m.f32` when manifest names a different file.
- Files are missing because the download/crop process did not finish, despite the progress tracker being updated.

### Required implementation rules

- Define one canonical, server-side package root based on a stable project-root path, not on whichever directory the process happens to start in.
- Keep raw multi-gigabyte source data outside public static assets.
- Only allow validated site keys matching the project's documented format. Do not accept arbitrary path segments from a query parameter.
- Resolve all manifest-referenced files relative to the selected package directory, then verify the resolved path remains inside that directory (path traversal protection).
- Do not trust absolute paths from a manifest. Prefer package-relative paths.
- Return explicit `404` for a missing package or file, `400` for invalid query parameters, and `500` for unexpected server errors. Do not return HTTP 200 with an error-shaped manifest.
- Return useful structured error fields, for example `code`, `message`, `siteKey`, and `missingFiles` without leaking secrets or unrelated absolute machine paths.
- Do not expose raw source DEM files through this endpoint.
- Support byte-range requests for large prepared binary files if the frontend needs streaming; otherwise use an explicit bounded response strategy. Do not read a huge file fully into memory on every request.
- Set correct content types for JSON, TIFF, binary float heightmap, and PNG preview responses.
- Add cache headers appropriate to immutable prepared package assets; do not cache a missing package indefinitely.

## 4. Validate the manifest contract before serving it

Inspect the actual Phase 34 manifest schema and preserve its real field names. Do not invent a new schema or rewrite the manifest solely to match assumptions in the UI.

At minimum validate (when those fields exist in the project's actual manifest):

- schema version;
- site latitude and longitude;
- east-positive longitude convention;
- site key;
- DEM source name and product;
- projection / CRS metadata;
- vertical datum or body reference frame, if supplied;
- source resolution and output spacing;
- width and height;
- dtype and byte order for binary files;
- elevation units, scale and offset;
- NoData representation;
- pixel registration / geotransform or equivalent spatial transform;
- file paths and file sizes;
- preparation timestamp and provenance.

### Important consistency checks

For a raw Float32 heightmap, the expected byte count is normally:

```text
width * height * 4
```

This check is valid only if the manifest explicitly says Float32, one value per cell, and no header/tiling/compression. If the format differs, calculate the expected size from the actual format contract.

Check that:

- the file exists;
- its byte length matches the manifest's declared dimensions/encoding;
- the heightmap has finite, plausible values after applying the documented scale and offset;
- NoData values are preserved/masked, not changed into real zero elevation;
- the prepared patch actually covers the requested mission site;
- the manifest's site coordinates are consistent with the site key within the intended rounding policy.

If the package manifest belongs to a different site, do not reuse it silently. Return `SITE_MISMATCH` and allow the user to choose the correct site or prepare the correct package.

## 5. Make the API endpoints testable independently

Implement or preserve a clear endpoint contract. Adapt this to existing routes rather than adding duplicate endpoints.

### Manifest request

```http
GET /api/terrain/package?type=manifest&site=site_89_50S_00_00E
```

Expected successful response:

- HTTP 200;
- JSON manifest for exactly the requested site;
- stable package-relative asset URLs or API URLs;
- no raw Windows absolute paths;
- no claim that terrain has rendered merely because the manifest exists.

Expected failure:

- HTTP 404 with `PACKAGE_NOT_FOUND` if the package is missing;
- HTTP 409 with `SITE_MISMATCH` if package metadata does not match the requested site;
- HTTP 422 with `INVALID_MANIFEST` if required metadata or referenced files are invalid;
- HTTP 400 with `INVALID_SITE_KEY` for malformed site key.

### Heightmap request

Use the exact path contract declared by the manifest. Confirm:

- HTTP 200 or valid HTTP 206 for a byte-range request;
- response content type matches the actual binary format;
- returned byte count matches the requested range / full file;
- no HTML error page is accidentally returned with HTTP 200;
- browser-side parsing produces the expected number of samples.

Add endpoint tests using the project's test framework. Use a small temporary test fixture with synthetic values only for tests; ensure test fixtures are clearly identified and never used by the production simulation.

## 6. Fix the React terrain-loading loop

The previously reported browser log showed:

```text
Maximum update depth exceeded
at loadLolaTerrain (...:588)
MoonViewer.useEffect (...:690)
```

and repeated requests to:

```text
/api/terrain/package?type=manifest&site=site_89_50S_00_00E
```

Inspect current source to confirm whether this loop remains. Do not apply a blind dependency-array workaround.

### Required design

- Keep Cesium Viewer initialization in its own effect, independent of terrain package loading.
- Keep terrain package discovery/loading in a separate effect or explicit loader hook.
- Stabilize parent-to-child callbacks with `useCallback`, or use a ref for status callbacks where appropriate.
- Do not include unstable inline callback/object identities in the terrain-loading effect dependencies.
- The effect should depend on stable primitives such as `siteKey` and a deliberate retry counter.
- Fetch the manifest once per site key unless the user explicitly retries or the site key changes.
- Deduplicate concurrent requests with an in-flight promise/cache keyed by site key.
- Use `AbortController` or an equivalent cancellation strategy when the selected site changes or the component unmounts.
- Avoid setting state after unmount.
- Do not trigger a retry loop automatically on a deterministic 404 or invalid manifest.
- Provide a user-controlled **Retry Terrain Load** action that performs one bounded retry sequence.
- Do not use a changing callback identity as a reason to refetch.
- Keep status transitions finite: `idle -> loading-manifest -> loading-heightmap -> building-mesh -> ready`, or `error`.
- Do not send a status update if the status code and relevant message are unchanged.

### Request-count acceptance test

For one mount and one unchanged selected site:

- one manifest request at initial load;
- one heightmap request after a valid manifest;
- no repeated requests caused by status state updates;
- no React `Maximum update depth exceeded` warning;
- changing the site triggers one new package load;
- clicking Retry triggers one new attempt.

## 7. Keep the global Moon visible when local terrain fails

The global Moon Trek imagery and Cesium globe are already working according to the latest user screenshot. Preserve them.

Required behavior:

- A terrain package `404`, bad manifest, missing heightmap, decoding failure, or mesh error must not destroy the Cesium Viewer.
- Keep Global Moon mode usable.
- Show a compact local-terrain error panel with the actual failure code and a retry action.
- Do not replace the global Moon with a black canvas.
- Do not show a blue fallback sphere as if it were the local terrain.
- Dispose only terrain-specific resources on terrain failure; do not destroy the shared viewer.

## 8. Test coverage required

Add or update focused tests for:

### Site key and manifest
- `-89.5, 0` maps to `site_89_50S_00_00E` using the established convention.
- equivalent coordinate formatting produces the same site key;
- a different site cannot accidentally receive this manifest;
- missing manifest returns `PACKAGE_NOT_FOUND`;
- malformed manifest returns `INVALID_MANIFEST`;
- path traversal is rejected;
- manifest file paths stay within the package root.

### File integrity
- missing heightmap is detected before the browser attempts mesh creation;
- declared dimensions and byte count are validated;
- NoData and non-finite values are handled honestly;
- wrong site coverage is rejected.

### React lifecycle
- mount with a valid package requests the manifest once;
- status updates do not cause repeated manifest requests;
- stable site does not create repeated requests after error;
- site change causes one new request;
- retry causes one new request;
- unmount cancels/ignores pending work;
- the global viewer stays mounted if local terrain loading fails.

### Browser acceptance
- no `Maximum update depth exceeded` warning;
- no repeated manifest request loop;
- diagnostics distinguish manifest found, heightmap found, heightmap parsed, mesh created, mesh attached and mesh visibly rendered;
- the existing textured global Moon remains visible in all terrain error states.

## 9. Required local verification commands

Use the project's actual package scripts, but at minimum run:

```powershell
npm run typecheck
npm run lint
npm run test -- --run tests/simulation-page.test.tsx
```

Run the focused terrain tests using the existing Python environment, for example:

```powershell
.\.venv-terrain\Scripts\python.exe -m pytest scripts\terrain\tests\test_prepare_lola_dem.py -q
```

Run the production build if it is part of the project's normal verification workflow:

```powershell
npm run build
```

Do not report a command as passed if it was not executed. Do not hide unrelated existing failures; document them.

## 10. Browser verification procedure

1. Start the app using the existing development command.
2. Open `/3d-simulation` (or the actual existing simulation route).
3. Confirm the global Moon texture appears.
4. Expand diagnostics.
5. Confirm manifest discovery is attempted once.
6. Confirm the API response site key matches `site_89_50S_00_00E`.
7. Confirm the manifest's referenced heightmap exists and is served correctly.
8. Confirm parsed sample count and mesh construction status.
9. If a valid terrain package is available, verify visible relief in Local Terrain mode.
10. If terrain package validation fails, verify the global Moon remains usable and the error is explicit.
11. Refresh the page and confirm the request count remains bounded.
12. Change the selected site and verify only the new package is requested.

Capture screenshots of:

- Global Moon with diagnostics expanded;
- Local Terrain success, if the real package is valid;
- Local Terrain error state, if the package is unavailable;
- browser console/network evidence showing no request loop.

## 11. Honest status rules

Use separate status fields. Do not compress all loading into one `LOLA Terrain` status.

Suggested states:

| Check | Pass condition |
|---|---|
| Package discovery | Correct manifest found on disk for requested site |
| Manifest validation | Required metadata and site identity are valid |
| Heightmap asset | Correct referenced file exists and is served |
| Heightmap decoding | Browser parses correct dimensions/sample count |
| Mesh generation | Geometry is created using decoded elevation values |
| Mesh attachment | Geometry is attached to Cesium scene at correct lunar location |
| Visual relief | Browser screenshot confirms non-flat elevation geometry |

Rules:

- HTTP 200 from the manifest endpoint does not prove the package files exist.
- Manifest found does not prove heightmap delivered.
- Heightmap delivered does not prove correctly decoded elevation samples.
- Mesh object created does not prove visible terrain rendering.
- Do not mark `READY` until actual local 3D relief is visible and coordinate-aligned.
- If the package is absent, Phase 34 remains `PARTIAL` or requires a documented correction; do not silently change its historical status.

## 12. Files allowed to change

Expected, subject to repository inspection:

- the existing `/api/terrain/package` route;
- `components/simulation/lunar-simulation-page.tsx` or a focused terrain loader hook/component;
- shared terrain package types/validators in the existing terrain service directory;
- focused API/React tests;
- `context/progress-tracker.md`;
- `context/Debug/debug-state-and-issue-tracker.md`.

Do not modify the working Moon Trek imagery integration, global Moon camera logic, mission input workflow, results page, SIS, LiveKit, RAG, Horizons calculations, or unrelated application styling.

Do not add new libraries unless the existing stack cannot perform the required operation and the need is documented.

## 13. Required final report

At completion, report:

1. Actual root cause of package unavailability.
2. Exact route and files changed.
3. Whether the prepared site package physically exists.
4. Manifest path and validated site key.
5. Heightmap path, size, encoding and dimensions.
6. Number of manifest/heightmap requests for one page load.
7. Whether the React update loop is gone.
8. Whether the global Moon remains visible during terrain errors.
9. Whether actual 3D relief is visibly rendered.
10. Commands executed and real results.
11. Screenshots or browser evidence captured.
12. Remaining blockers.

**Completion condition:** Package discovery works, the React request loop is eliminated, and the global Moon stays visible. Mark local 3D terrain as verified only if the actual prepared LOLA heightmap has been decoded, converted to geometry, attached at the correct lunar coordinates, and visually confirmed in the browser. If the package files are missing or corrupt, report the exact missing artifact and stop without downloading or generating substitute terrain.
