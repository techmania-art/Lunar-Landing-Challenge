# Phase 34 — Resume and Complete LOLA DEM Preparation

**Document type:** Continuation / recovery instructions for the existing Phase 34  
**Do not create a new phase number.**  
**Scope:** Safely continue the interrupted LOLA download and finish the terrain data package expected by Phase 35.

---

## 1. Objective

Continue the existing Phase 34 work from its current on-disk and code state. The project already has a corrected terrain-preparation workflow, a Python dependency file, and focused tests. The latest reported validation is:

- `npm run typecheck` succeeded.
- `scripts/terrain/tests/test_prepare_lola_dem.py` reported `2 passed`.
- `scripts/terrain/prepare_lola_dem.py` exists and is the active preparation pipeline.
- The official LOLA DEM download was interrupted while the file `data/lunar-terrain/raw/ldem_87s_5mpp.tif` was approximately 285 MB.
- The final local terrain package has not yet been generated or verified.

The goal is to resume safely, validate the complete official input data, generate the local terrain crop and manifest, run the focused tests, and update `context/progress-tracker.md` with evidence.

**Do not restart Phase 34 from scratch. Do not overwrite existing work.**

## 2. Non-negotiable preservation rules

Before changing anything, inspect the current repository state and preserve all changes already made by the previous Phase 34 execution.

Do not:

- delete, truncate, rename, or overwrite the existing 285 MB partial DEM;
- start a second downloader while an existing download process is still active;
- download the same file into a second location without a documented reason;
- switch silently to a different LOLA product, resolution, URL, projection, or reference frame;
- replace the current terrain-preparation script wholesale;
- remove or rewrite the existing focused tests simply to make them pass;
- change the working Cesium globe, Moon Trek imagery, WMTS configuration, simulation UI, SIS, LiveKit, or unrelated application features;
- begin Phase 35 terrain rendering as part of this task;
- claim a partial TIFF is valid or that the terrain package is complete before validation.

The 5 m/pixel South Pole product and its currently configured URLs are the active Phase 34 data choice according to the latest status. Preserve that choice unless a hard technical blocker is found. If a blocker requires a different product, stop and document the evidence and proposed alternative rather than silently switching.

## 3. Step 0 — Establish the exact current state

Run all commands from the repository root:

```powershell
Set-Location "C:\Users\hp\OneDrive\Desktop\Lunar Landing\lunar-mission-planner"
```

Inspect and record:

1. `git status --short` and relevant diffs.
2. `context/progress-tracker.md`.
3. `scripts/terrain/prepare_lola_dem.py`.
4. `scripts/terrain/requirements.txt`.
5. `scripts/terrain/tests/test_prepare_lola_dem.py`.
6. `.gitignore` rules for `data/lunar-terrain/` and temporary download files.
7. The configured DEM URL and count-map URL in the script/configuration.
8. Existing files under `data/lunar-terrain/raw/` and `data/lunar-terrain/processed/`.
9. Available disk space on the volume containing the project and data directory.

Do not assume the earlier report is still exact. Record the current partial file size and last-write time:

```powershell
Get-Item "data/lunar-terrain/raw/ldem_87s_5mpp.tif" -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime
```

Inspect whether a download process is already active. If a process is still downloading this exact URL/file, monitor it; do not start another process. Do not terminate it unless it is demonstrably stalled and the user has approved stopping it.

Add a short continuation note to the progress tracker only after establishing the actual state.

## 4. Step 1 — Confirm the partial file can be resumed

Use the exact DEM URL already configured in the repository. Do not copy a URL from an old prompt if the current script or manifest records a different authoritative URL.

Check remote metadata:

- HTTP status.
- `Content-Length` (if provided).
- `Accept-Ranges`.
- `ETag` and `Last-Modified` (if provided).
- Redirected final URL.

Compare the remote total length with the local partial file size. A 285 MB local file is not proof that 285 MB of valid TIFF data has been received.

### Resume policy

Use this decision sequence:

1. **Downloader still active:** monitor the existing process and verify its output path. Do not launch a duplicate.
2. **Downloader stopped and server supports byte ranges:** resume the same file from its current byte offset, using the existing downloader if it already supports safe resume. Otherwise, add a small, tested resume capability to the current download utility.
3. **Server does not support byte ranges:** do not append blindly. Preserve the partial file, report the limitation, and request approval before restarting or selecting an alternate official data access method.
4. **ETag/Last-Modified changed:** do not append content from a different remote object. Preserve the partial file and investigate the source version first.

For a curl-based resume, use `curl.exe -C -` only after confirming that the partial file belongs to the same source object and the server accepts ranges. Never use a plain `-o` command that silently truncates the partial file.

A robust downloader should:

- write to a `.part` file or otherwise preserve the existing partial on failure;
- verify the requested `Range` start offset and the returned `Content-Range`;
- append only when the server confirms the correct byte range;
- retry transient network failures with bounded backoff;
- flush and close the file safely;
- rename to the final `.tif` name only after the complete expected length is received;
- retain enough metadata to verify the same source object on the next resume.

Do not implement a new downloader if the existing script already provides these guarantees. Audit and improve only what is missing.

## 5. Step 2 — Verify the completed DEM download

After the download reaches the remote expected size:

1. Confirm the final file size matches the remote `Content-Length`, if supplied.
2. Confirm the file signature is a valid TIFF/BigTIFF as expected by the product.
3. Open the file with Rasterio/GDAL.
4. Read raster metadata and at least several windows, including a window around the selected mission site.
5. Confirm there are no truncated-file, directory, block-read, or decompression errors.
6. Record dimensions, band count, data type, NoData value, scale, offset, transform, CRS, bounds, pixel spacing, and valid-pixel statistics.
7. Verify the selected site is within the actual raster footprint.
8. Verify that the raster values and units match the official product documentation.

If any read fails, retain the file for diagnosis and report the error. Do not declare the DEM valid because the file exists or has a plausible size.

## 6. Step 3 — Download and validate the matching count map

Inspect the currently configured count-map URL and metadata. Download the matching count map only after confirming it belongs to the same product/version, coverage, projection, dimensions, and pixel alignment as the DEM.

Use the same safe resume and integrity rules as the DEM. Then verify:

- dimensions match the DEM;
- CRS and geotransform match, or any difference is explicitly handled through a correct alignment operation;
- valid values are interpreted according to the source documentation;
- NoData is preserved;
- no zero-filled substitute is presented as measured quality information.

If the count map is unavailable, do not fabricate it. Preserve the pipeline's explicit unavailable/unknown quality state and document whether the existing Phase 34 acceptance criteria require the count map before completion. Do not create a quality file filled with zeros and label it as real count data.

## 7. Step 4 — Audit lunar coordinate handling before cropping

This is a scientific correctness gate.

The selected mission location must come from the application's authoritative mission state or an explicit command-line argument. Do not silently use the script's default coordinates if the active mission input differs.

For the current reported South Pole test, the intended location has been `89.5° S, 0° E`, but confirm it against the actual current mission input before preparing the crop.

Inspect the DEM's own metadata and product documentation to establish:

- lunar body-fixed coordinate convention;
- east-positive or west-positive longitude convention;
- lunar reference frame (including MOON_ME / DE421 where specified by the product);
- projection type and all projection parameters;
- lunar reference radius or ellipsoid parameters;
- axis order and units;
- pixel registration (pixel-is-area or pixel-is-point);
- elevation units and scale/offset.

**Do not assume EPSG:4326/WGS84 is an appropriate source CRS for lunar coordinates.** The selected longitude/latitude must be transformed using a verified lunar geographic CRS and the exact DEM projection parameters. If the correct lunar-to-raster transformation cannot be established from authoritative metadata, stop before cropping and document the blocker. Do not generate a plausible-looking but geographically misplaced patch.

Before writing outputs, verify that the transformed selected site falls inside the DEM footprint and that the crop bounds are valid. Log the transformation details and the distance between the requested site and crop centre.

## 8. Step 5 — Generate the local terrain crop

Reuse `scripts/terrain/prepare_lola_dem.py` and its existing tested interfaces. Do not replace it with a new pipeline.

Generate the currently specified local crop centred on the actual selected mission site (the existing Phase 34 specification uses a 10 km × 10 km crop unless the current script/progress tracker has a more recent approved value).

Requirements:

- crop in the DEM's native projected coordinate system;
- preserve the native DEM crop as a GeoTIFF;
- preserve the source geotransform, CRS, NoData, scale and offset;
- preserve raw measured elevations without silently changing units;
- use a documented resampling method for any lower-resolution render heightmap;
- do not label a file `heightmap-10m` unless its actual sample spacing is 10 m;
- if resampling to 10 m from a 5 m source, document the chosen method and explain that this does not create new 10 m measurements;
- preserve the source count map's alignment and quality semantics;
- keep crop edges and NoData regions explicit;
- avoid writing into an existing verified output directory without comparing or backing up it first.

If the active Phase 34 script already implements these rules, use it and validate the outputs rather than rewriting the processing logic.

## 9. Step 6 — Produce and validate the manifest

The prepared output must contain a `terrain-manifest.json` with enough information for Phase 35 to load the patch without guessing.

At minimum, the manifest must record:

- schema version;
- selected mission latitude/longitude and longitude convention;
- source product name, version and official source URL;
- source download timestamp and remote ETag/Last-Modified when available;
- source raster dimensions, data type, CRS/projection, transform, bounds, pixel spacing, NoData, scale, offset and elevation units;
- lunar reference frame and body radius/ellipsoid parameters;
- crop dimensions and bounds in the native projected CRS;
- output raster dimensions and actual X/Y spacing;
- resampling method, if any;
- count-map presence/status and quality-data interpretation;
- valid/NoData sample counts and percentages;
- output file paths and byte sizes;
- checksums for prepared outputs where practical;
- preparation script version/commit or timestamp;
- warnings and limitations.

The manifest must not claim 5 m independent measurement support in regions that are interpolated or invalid. It must preserve unknown quality states.

## 10. Step 7 — Generate a preview and compare source samples

Generate the existing preview output if the project workflow supports it. The preview is a visualization aid, not proof by itself.

Validation must include:

- compare a set of crop elevation samples against the corresponding source DEM samples;
- verify the centre pixel corresponds to the intended selected site within the known pixel-registration tolerance;
- inspect NoData handling at crop edges;
- confirm the generated heightmap dimensions and byte length match manifest dimensions and Float32 storage;
- confirm the preview is derived from the prepared elevation data;
- record minimum, maximum and a small set of representative sample values with units and source provenance.

Do not apply arbitrary vertical exaggeration to the source elevation values during data preparation. Vertical exaggeration belongs to the Phase 35 renderer and must default to 1×.

## 11. Step 8 — Run tests and checks

Run the existing focused tests first:

```powershell
.\.venv-terrain\Scripts\python.exe -m pytest scripts/terrain/tests/test_prepare_lola_dem.py -q
```

If the project's Python environment uses a different interpreter, use the already configured environment and document it; do not create duplicate environments without need.

Then run:

```powershell
npm run typecheck
```

Do not change unrelated TypeScript code. If the script or its tests are modified, add tests for:

- resume offset and `Content-Range` validation;
- server ignoring Range requests;
- changed ETag/Last-Modified;
- truncated download detection;
- GeoTIFF metadata validation;
- selected-site coverage and coordinate transform;
- correct crop bounds and output transform;
- heightmap byte length and spacing;
- NoData and quality-mask behavior;
- source-to-crop sample agreement.

Run lint/build only if the existing project workflow requires it or relevant application code changes. Phase 34 is a data-preparation task; avoid unrelated frontend edits.

## 12. Step 9 — Update project documentation

Update `context/progress-tracker.md` with exact evidence.

Keep the Phase 34 status as `PARTIAL` until all required source files have been completed and validated and the local terrain package has been generated.

When complete, record:

- source product and exact URLs;
- actual final file sizes;
- download completion and integrity results;
- DEM and count-map metadata;
- selected coordinates and verified lunar coordinate transformation;
- crop dimensions, bounds and actual output spacing;
- manifest path;
- focused test results;
- typecheck result;
- any unavailable quality data or coverage limitations.

Do not mark Phase 35 as started or change the Cesium terrain renderer in this task.

## 13. Required final output from the coding agent

Return a concise execution report containing:

1. Files inspected and changed.
2. Whether a downloader was already active when the task began.
3. Whether the existing partial DEM was resumed or simply monitored.
4. Final DEM and count-map sizes and integrity checks.
5. Verified lunar CRS/reference-frame and selected-site coverage.
6. Generated crop directory and exact file list.
7. Manifest path and key metadata.
8. Tests and typecheck results.
9. Actual bytes transferred during this continuation, if measurable.
10. Remaining blockers, if any.

If the download is still incomplete, report `PHASE 34 — PARTIAL`, preserve the partial file, and state the exact next safe action. Do not claim success based on an HTTP 200 response, a partial file, a passing unit test, or a successful TypeScript check alone.

---

## Phase 34 completion gate

Phase 34 is complete only when all applicable conditions are true:

- [ ] The existing DEM download is safely completed and validated.
- [ ] The matching count map is completed and validated, or its documented unavailability is handled according to the approved project requirement.
- [ ] Correct lunar coordinate transformation and selected-site coverage are proven.
- [ ] The local crop is generated from the real source raster.
- [ ] Native crop, render heightmap and quality data (if available) are internally consistent.
- [ ] Manifest accurately describes units, CRS, reference frame, spacing, provenance and file paths.
- [ ] Preview and source-sample comparisons pass.
- [ ] Focused Python tests pass.
- [ ] `npm run typecheck` passes.
- [ ] `context/progress-tracker.md` records evidence and remaining limitations.

**Only after this gate passes may Phase 35 consume the prepared terrain package.**
