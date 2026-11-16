# Phase 34 — Complete LOLA DEM Download and Prepare the Local Terrain Package

**Task type:** Data acquisition, preparation-script correction, and geospatial validation only  
**Builds on:** The existing Phase 32 source-validation work  
**Next phase:** Phase 35 — Implement the prepared local LOLA DEM as interactive 3D lunar terrain  
**Current screenshot site:** 89.50° S, 0.00° E (verify against the live mission state before using it; never assume this remains selected)

---

## 0. Execution summary and current known state

The previous implementation report says the repository already contains:

- `scripts/terrain/prepare_lola_dem.py`
- `scripts/terrain/requirements.txt`
- `.venv-terrain/` (inspect whether it is valid and has the required packages installed)
- `context/System-Flow/phase-32-download-prepare-lola-dem.md`
- `context/progress-tracker.md`
- Existing terrain service/type files under `lib/services/terrain/`

The earlier Phase 32 work reportedly:

- Checked the official LOLA DEM and count-map URLs.
- Received HTTP 200 and `Accept-Ranges: bytes` for both source URLs at that time.
- Ran the preparation script in `--inspect-only` mode and reported the current test site inside the product footprint.
- Did **not** complete the raw DEM/count-map downloads.
- Did **not** produce a validated local crop or a Phase 5/35-ready data package.

Treat these statements as previous-run reports, not as proof that the files still exist. Inspect the current repository and filesystem before continuing. The prior run also removed a temporary `data/` directory after a download attempt, so do not assume any partial download is available.

**This phase must finish the data-preparation work only. It must not build the Cesium terrain renderer.**

## 1. Goal

Acquire the official NASA/GSFC PGDA LOLA elevation DEM and its count/quality map for the active mission site, validate both geospatial rasters, prepare a correctly georeferenced local terrain crop, and produce an explicit manifest and browser-oriented height grid for Phase 35.

Phase 34 is complete only when all of the following are true:

1. The selected data product is appropriate for the active mission coordinates.
2. The raw files are fully downloaded and readable, or a verified remote-COG workflow has produced an equivalent local crop without a full download.
3. The selected site and requested crop are within the real raster footprint.
4. The DEM and LDEC count map are correctly aligned.
5. The native-resolution crop and correctly resampled browser height grid exist.
6. NoData and interpolated-vs-measured support are preserved distinctly.
7. The manifest matches every generated file's dimensions, byte length, CRS, transforms, units, and sample spacing.
8. A human-readable preview has been generated from the actual prepared data.

Do not implement or modify the Cesium globe, imagery provider, camera, UI, rover, route, pathfinding, hazard detection, or SIS in this phase.

## 2. Official source product and selection rules

### Preferred product for the current South Pole test site

NASA/GSFC Planetary Geology, Geophysics and Geochemistry Laboratory (PGDA), **South Pole LOLA DEM Mosaic**:

- Product page: `https://pgda.gsfc.nasa.gov/products/81`
- DEM: `https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif`
- Count map: `https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif`
- Optional hillshade (do not download unless needed): `https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp_hillshade.tif`
- Stated coverage: 87° S to 90° S
- Nominal pixel spacing: 5 m/pixel
- Published size: approximately 3.3 GB for DEM and 140 MB for the count map
- Projection: south-polar stereographic X/Y coordinates in metres
- Body/reference frame: MOON_ME, JPL DE421
- Registration: pixel-centred (the projected X/Y coordinate is the pixel centre)
- The DEM contains interpolated fill in empty pixels.
- The count map represents the number of LOLA returns contributing to each pixel; the mosaic process can produce non-integer count values in overlap zones.

The source product page explains that this mosaic was assembled from multiple overlapping fields. Do not interpret its 5 m grid spacing as proof that every 5 m cell is an independent direct laser measurement. Preserve and expose the count map as a data-support indicator.

The current screenshot's 89.50° S, 0.00° E site is within the product's stated latitude band, but the active site may have changed. The actual transformed projected coordinate and full requested crop must be checked against the raster bounds before preparation.

### Broader-coverage fallback

Use the 20 m product only if the active location is not covered by the 5 m mosaic, the 5 m product cannot be read correctly, or the developer explicitly chooses wider coverage over higher nominal grid spacing:

- Product page: `https://pgda.gsfc.nasa.gov/products/90`
- DEM: `https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF`
- Coverage: 80° S to 90° S
- Nominal pixel spacing: 20 m/pixel
- South-polar stereographic coordinates in metres, MOON_ME / DE421 as documented by the product

Do not silently change products. Record the exact chosen source and reason in the manifest and progress tracker. Never use a product outside its verified raster footprint.

### Required scientific citation

Record this citation in the manifest/report when using the 5 m mosaic:

Barker et al. (2021), “Improved LOLA Elevation Maps for South Pole Landing Sites: Error Estimates and Their Impact on Illumination Conditions,” *Planetary & Space Science*, Volume 203, 105119. DOI: `https://doi.org/10.1016/j.pss.2020.10.030`.

## 3. Mandatory repository inspection before downloads

Before modifying or downloading anything:

1. Read the five main project context files and `context/progress-tracker.md`.
2. Read `context/System-Flow/phase-32-download-prepare-lola-dem.md` and this Phase 34 brief.
3. Inspect the existing `scripts/terrain/prepare_lola_dem.py` and `scripts/terrain/requirements.txt` rather than creating duplicate scripts.
4. Inspect `.venv-terrain/` and verify the exact Python interpreter and installed package versions.
5. Inspect `data/lunar-terrain/raw/` and `data/lunar-terrain/processed/` for complete, partial, or stale files.
6. Inspect `.gitignore` and ensure raw, partial, temporary and large processed source data are excluded from Git.
7. Inspect the live application state or existing mission-state model to determine the actual selected latitude and east-positive longitude. Use 89.50° S, 0.00° E only if it is still the selected site or is explicitly passed as the test input.
8. Confirm Phase 3 global Moon rendering remains functional, but do not modify its implementation.

Do not remove, overwrite, or truncate any existing files until their state and sizes have been recorded. If a partial download exists, inspect whether it is resumable before restarting.

## 4. Audit and correct the existing preparation script before a large download

The previous script is a starting point, not automatically production-ready. Audit and fix the following issues before downloading several gigabytes:

### 4.1 Target-spacing / output-name mismatch

The previous script writes `heightmap-10m.f32` while directly serializing the source crop samples. Merely naming a file `10m` and writing `output_spacing_meters = 10` does not perform 10 m resampling.

Required correction:

- Preserve a native 5 m crop GeoTIFF.
- Generate a separate browser height grid whose actual affine transform and sample spacing match its declared target spacing (initially 10 m).
- Use a documented elevation resampling method. For 5 m to 10 m aggregation, prefer an appropriate area/average method unless the data metadata or intended use justifies another method.
- Record the exact method, output dimensions, pixel-centre convention and actual spacing in the manifest.
- Add a validation that recalculates spacing from the output transform and fails if it does not match the manifest within an explicit tolerance.

### 4.2 NoData handling

The previous script may fill missing raster values with zero when the source has no explicit NoData value. This is unsafe because zero may be a valid elevation value.

Required correction:

- Preserve the source GeoTIFF's NoData value and GDAL/raster mask.
- For browser binary files, use an explicit validity mask and a documented NoData encoding (for example IEEE float32 NaN, with a separate binary validity mask).
- Never replace missing height samples with 0 m.
- Ensure mesh preparation in Phase 35 can skip invalid cells and will not bridge large NoData gaps.

### 4.3 Count-map alignment

The previous script appears to reuse the DEM crop window when reading the count map. Do not assume the count map has identical dimensions, transform, bounds or CRS solely because it is paired with the DEM.

Required correction:

- Inspect both rasters independently.
- Validate their CRS and geospatial footprints.
- Reproject/resample the count map onto the exact DEM output grid with a documented method appropriate for count/support data (do not use bilinear interpolation for counts).
- Preserve the distinction between a valid DEM pixel whose count is zero (interpolated/fill) and an invalid/NoData pixel.
- Do not create a zero-filled count file when the count map is unavailable. Mark it unavailable and stop if the count map is required by this phase.

### 4.4 Bounds and crop safety

- Transform the active site using the exact CRS obtained from source metadata.
- Compute the full requested crop bounds in projected metres.
- Confirm the entire requested crop is inside the source raster before reading it.
- Do not allow negative/out-of-bounds raster windows to be silently clipped.
- If the crop is not fully covered, stop and report available coverage; do not silently shrink or shift the patch.
- Preserve the source pixel-centre registration and row/column orientation.

### 4.5 Site-key correctness

The prior `site_key` helper appears to assume all locations are south and east. Make its hemisphere notation correct for both hemispheres (N/S and E/W), while retaining a stable key for the current site. The manifest must contain the numeric coordinates independently of the key.

### 4.6 Download safety

The existing `--download` path uses Python `urlopen` and does not provide the documented resumable behavior. Do not rely on it for the multi-gigabyte download unless it is upgraded and tested.

Prefer a PowerShell script using `curl.exe` with resume support, or a tested Python downloader that supports HTTP Range, partial-file validation and safe resume. Never use PowerShell's legacy `curl` alias.

### 4.7 Repeatability and failure behavior

- Do not overwrite valid complete outputs without an explicit `--force` option.
- Use temporary output names and atomic rename after successful validation.
- Exit non-zero on partial/invalid data, unsupported CRS, mismatched count map, invalid crop, short file, or failed write.
- Add unit tests for the corrected resampling, NoData, quality alignment and manifest logic using small synthetic test rasters. Synthetic rasters are allowed for software tests only and must never be used as project terrain data.

## 5. Python environment and dependency check

The previous report shows failed attempts while creating/installing `.venv-terrain`; verify its actual current state.

On Windows PowerShell, use the repository's intended Python interpreter. If Python 3.12 was the interpreter used previously, verify it directly rather than assuming the `py` launcher is configured:

```powershell
& ".\.venv-terrain\Scripts\python.exe" -V
& ".\.venv-terrain\Scripts\python.exe" -m pip --version
& ".\.venv-terrain\Scripts\python.exe" -c "import numpy, rasterio, pyproj; print('numpy', numpy.__version__); print('rasterio', rasterio.__version__); print('pyproj', pyproj.__version__)"
```

If the environment is invalid, recreate it only after checking the existing environment and repository convention. Install from `scripts/terrain/requirements.txt` and record exact tested versions. Do not add Rasterio/GDAL/PyProj/NumPy to the Node `package.json`.

Do not begin the raw download if required packages cannot open and inspect a small GeoTIFF fixture or the downloaded data.

## 6. Download preflight — disk, network, and remote access

### 6.1 Disk-space requirement

The official product page currently lists about 3.3 GB for the 5 m DEM and 140 MB for the count map. Require at least **6 GB of free space** on the target volume before full download; 8 GB or more is preferable to provide room for temporary/processed data and retries.

- Check the actual volume containing the project/data directory, not just the system drive by assumption.
- Print free bytes and the required estimate in the terminal.
- Include raw DEM, count map, partial files, native crop, browser grid, temporary resampling, preview, and safety margin in the estimate.
- If insufficient space, do not download. Report the exact deficit and propose a different user-approved local data directory/drive. Do not move the project or change the target drive automatically.

### 6.2 Re-check official URLs

Run fresh requests immediately before download and record:

- HTTP status after redirects.
- Content-Length if returned.
- Content-Type.
- Accept-Ranges.
- ETag and Last-Modified if returned.
- Final URL after redirects.

If the current server response differs from the previous Phase 32 report, stop and inspect the official PGDA product page. Do not guess alternative mirrors or file names.

### 6.3 Range support

- Test a small byte-range request and verify a genuine `206 Partial Content` response and a valid `Content-Range` header.
- Do not interpret `Accept-Ranges: bytes` by itself as proof that the data can be efficiently accessed as a COG.
- Confirm the TIFF is tiled/COG-compatible using metadata and block layout before using remote window reads.
- If remote range access is not reliable or the source is not a suitable COG, use the resumable full-download path.

### 6.4 Full download behavior

If full download is required and preflight passes, use `curl.exe` with retry and resume support. Keep a `.part` or resumable target in `data/lunar-terrain/raw/`; do not place it under `public/`.

Example PowerShell pattern (adapt after inspecting current file state):

```powershell
New-Item -ItemType Directory -Force "data/lunar-terrain/raw" | Out-Null

curl.exe --location --fail --retry 5 --retry-delay 3 --continue-at - `
  --output "data/lunar-terrain/raw/ldem_87s_5mpp.tif" `
  "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif"

curl.exe --location --fail --retry 5 --retry-delay 3 --continue-at - `
  --output "data/lunar-terrain/raw/ldec_87s_5mpp.tif" `
  "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif"
```

Do not launch both large downloads simultaneously unless the connection and storage can handle it. Sequential download is preferred for easier recovery and diagnosis. On interruption, keep the partial file and resume it; do not delete a potentially resumable file.

Do not run an unbounded automatic retry loop. Report repeated failures and stop.

## 7. Validate the completed raw products

For both DEM and count map:

- File exists at the expected path.
- File size matches the server's Content-Length when available, or a documented official size within a justified tolerance.
- File is not an HTML error page or short/truncated response.
- Rasterio/GDAL can open and read representative windows.
- Width, height, band count, dtype, compression, tiling/block layout and NoData are recorded.
- CRS WKT, GeoTransform, bounds and pixel-centre registration are recorded.
- Pixel spacing and units match the official product metadata.
- DEM values are read after applying scale/offset and NoData rules.
- Count-map values are plausible and are not mistaken for height values.
- Site and requested local crop are covered by both products after independent CRS/footprint checks.

Compute SHA-256 for the downloaded files if practical. This is a multi-gigabyte pass; report if it is omitted, and never invent a checksum. Record size, modified time, source URL and available ETag regardless.

## 8. Prepare the active-site crop

### 8.1 Active site

- Read the actual selected mission latitude and east-positive longitude from the current app state or explicitly supplied test input.
- For the current screenshot, expected test input is 89.50° S, 0.00° E only if that is still selected.
- Never assume a coordinate simply because the preparation script has a default.
- Record the source of the selected coordinate and timestamp/run ID where available.

### 8.2 Crop dimensions and outputs

Default local crop: **10 km × 10 km**, centred on the selected site, only if the complete crop is inside the valid raster coverage.

Produce:

1. `dem-native-crop.tif` — source-native 5 m crop with CRS, geotransform and masks preserved.
2. `heightmap-10m.f32` — browser-oriented grid truly resampled to 10 m spacing; do not merely rename native data.
3. `quality-counts-10m.f32` or an equivalent aligned count/support raster — with count aggregation semantics documented.
4. `validity-mask-10m.bin` — optional/required depending on the chosen binary contract; it must distinguish invalid NoData from valid interpolated DEM cells with zero measured-return counts.
5. `terrain-preview.png` — visualization generated from the actual crop, preferably a clearly labelled elevation/shaded-relief preview.
6. `terrain-manifest.json` — complete machine-readable data contract for Phase 35.

Keep any native-resolution intermediate count map if required for reproducibility. Do not make the full source GeoTIFF or count map a public web asset.

### 8.3 Resampling rules

- Use the DEM's projected metre grid; do not resample in degrees.
- Use an appropriate method for downsampling elevation (document it; average is a reasonable starting point from 5 m to 10 m).
- The output affine transform must describe the actual 10 m grid.
- Do not upsample lower-resolution source data and claim higher detail.
- Align count/support data to the exact output grid using a count-appropriate method; state whether values are sum, mean, or another defined aggregation.
- Preserve source-native crop separately so future processing can be reproduced.

### 8.4 Count map and interpolation interpretation

The DEM is surface-interpolated and includes filled empty pixels. Therefore:

- DEM-valid + LDEC > 0: measured-return support exists for that cell/aggregation window.
- DEM-valid + LDEC = 0: elevation may be interpolated/fill; do not label it as a direct measurement.
- DEM NoData/mask invalid: no usable elevation value; do not replace with zero.
- Non-integer count values can occur in mosaic overlaps; preserve them and do not round away provenance.

If the count map has its own NoData mask, preserve it separately from count=0.

## 9. Manifest contract for Phase 35

Write a versioned `terrain-manifest.json` describing the actual files, not intended settings. At minimum include:

- `schemaVersion`.
- `site`: latitude, longitude, longitude convention, selected-site source, site key.
- `crop`: width/height in metres and centre coordinate.
- `source`: official product title/page, exact source filenames/URLs, published and actual file sizes, source nominal spacing, source coverage, citation.
- `geodesy`: CRS WKT, projection name, X/Y units, MOON_ME/DE421 frame, pixel registration, geotransform, raster bounds, row/column orientation.
- `vertical`: source units, scale, offset, vertical datum/reference semantics as verified; no assumed lunar radius.
- `nativeRaster`: path, width, height, dtype, spacing, NoData, mask info.
- `browserGrid`: path, width, height, dtype, explicit byte order (little-endian if used), actual spacing, affine transform/bounds, resampling method, NoData encoding.
- `quality`: count-map path, dimensions, alignment method, count aggregation semantics, count=0 interpretation, NoData interpretation, valid/interpolated percentages.
- `statistics`: valid sample percentage, NoData percentage, min/max/mean/median, centre sample and its support count where available.
- `preparation`: script version, Python/Rasterio/PROJ versions, command used, timestamp UTC.
- `integrity`: file sizes and SHA-256 values if calculated.
- `warnings`: interpolation limitations, resolution limitations, coverage and quality gaps.

The manifest must contain enough information for Phase 35 to create geometry without guessing coordinate transforms, array orientation, binary dimensions, units, byte order or NoData semantics.

## 10. Output layout

Reuse the repository convention, but produce an equivalent structure:

```text
scripts/
  terrain/
    prepare_lola_dem.py
    requirements.txt
    download_lola_products.ps1       # only if a separate resumable downloader is needed
    tests/
      test_prepare_lola_dem.py

data/
  lunar-terrain/
    raw/                              # source products; gitignored
      ldem_87s_5mpp.tif
      ldec_87s_5mpp.tif
    processed/
      <site-key>/
        dem-native-crop.tif
        heightmap-10m.f32
        quality-counts-10m.f32
        validity-mask-10m.bin
        terrain-preview.png
        terrain-manifest.json
```

Do not move the prepared data into `public/` during Phase 34. Phase 35 will choose the appropriate local loading/static/API mechanism after reviewing the actual output sizes. The raw source files must remain outside `public/` and excluded from Git.

## 11. Tests and verification

### Script/unit tests

Use small test rasters created only for software tests. Cover:

- Site-to-DEM coordinate transform.
- Site and full-crop bounds checks.
- Correct pixel-centre registration and row orientation.
- Correct true 5 m native crop metadata.
- Actual 10 m resampling and output transform.
- NoData preservation and no substitution with 0.
- DEM-valid / count-zero interpolated state.
- Count map alignment and count aggregation semantics.
- Binary byte order and exact byte-length checks.
- Manifest values match generated files.
- Repeat execution does not corrupt complete existing outputs.
- Interrupted download can be resumed without treating partial bytes as complete.

### Raw file / crop verification

- Open both raw GeoTIFFs and read real windows.
- Confirm crop covers the full intended area.
- Confirm selected-site centre sample is valid or explicitly unavailable.
- Compare centre/corner coordinates against the raster transform.
- Confirm output grid spacing from its geotransform.
- Verify output byte length equals `width × height × bytesPerSample` for each binary layer.
- Confirm quality/count data aligns with the same grid or records its independent grid correctly.
- Generate and inspect the preview image.

### Project checks

- Run the existing Python tests relevant to terrain preparation.
- Run `npm run typecheck`, `npm run lint`, the relevant existing test suite and `npm run build` if no unrelated blocker exists.
- Do not modify Cesium rendering code to make this data phase pass.

## 12. Documentation updates

Update only the relevant documentation with verified results:

- `context/progress-tracker.md`: Phase 34 exact status, downloaded file sizes, selected product, site, crop, outputs, tests and unresolved issues.
- `context/architecture-context.md`: add the verified prepared terrain data contract only if it changes/clarifies the current architecture.
- `context/code-standards.md`: record data/NoData/CRS handling rules if they are not already present.
- `context/ai-workflow-rules.md`: update phase sequencing only if needed.

Do not mark the 3D terrain renderer as implemented. This phase ends at a verified prepared data package.

## 13. Strict scope boundaries

Do not:

- Modify the existing Cesium Moon globe or NASA Moon Trek imagery provider.
- Change the mission UI or hardcode the selected South Pole coordinates.
- Implement the local 3D terrain mesh or Cesium terrain provider.
- Add rover models, movement, route, scanning, hazard detection, pathfinding or physics.
- Add SIS integration or modify LiveKit/RAG/LLM.
- Put multi-gigabyte source data in `public/` or Git.
- Replace real source data with synthetic terrain for the project output.
- Claim native 5 m measurements everywhere; distinguish grid spacing from LDEC support and effective resolution.
- Claim Phase 34 complete solely because the URLs return HTTP 200.

## 14. Final report format

At completion, report:

1. Active site coordinates and how they were obtained.
2. Chosen PGDA product and why its footprint covers the site/crop.
3. Python interpreter and package versions.
4. Remote preflight results (HTTP status, Content-Length, range support, ETag if available).
5. Raw download file sizes and integrity results.
6. Source raster dimensions, CRS, transform, spacing, units, NoData and masks.
7. Crop dimensions and exact bounds.
8. Native and browser-grid dimensions and actual spacing.
9. Count-map alignment and measured-vs-interpolated statistics.
10. Exact manifest and output file paths.
11. Unit/project test results.
12. Screenshot or preview path.
13. Remaining blockers.

Set status to `PHASE 34: VERIFIED` only when the complete prepared data package passes the checks above. Otherwise use `PARTIAL` and identify the exact incomplete operation. The next step is Phase 35, which consumes the manifest and prepared files to implement local 3D terrain rendering.

## 15. Official references

- NASA/GSFC PGDA South Pole LOLA DEM Mosaic: https://pgda.gsfc.nasa.gov/products/81
- Direct 5 m DEM: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif
- Direct 5 m LOLA count map: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif
- NASA/GSFC PGDA broader 80°–90° S LOLA DEM products: https://pgda.gsfc.nasa.gov/products/90
- NASA/GSFC PGDA high-resolution south-pole site products and data-quality discussion: https://pgda.gsfc.nasa.gov/products/78
- Rasterio documentation: https://rasterio.readthedocs.io/
- PROJ documentation: https://proj.org/

The PGDA product page states that the 5 m mosaic GeoTIFF is 3.3 GB, the LDEC count map is 140 MB, data are in south-polar stereographic X/Y metres and MOON_ME / DE421, coordinates use pixel-centre registration, and the DEM fills empty pixels by interpolation. Use the current official page as the authority if published metadata changes.
