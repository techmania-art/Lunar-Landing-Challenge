# Phase 4 — Download and Prepare the LOLA South-Pole DEM

**Task type:** Data acquisition and offline preparation only  
**Depends on:** Phase 3 global Moon globe and Moon Trek WAC imagery are working in the browser  
**Next phase:** Phase 5 — Implement the prepared local DEM as an interactive 3D lunar terrain surface  
**Primary test site shown in the latest simulation screenshot:** 89.50° S, 0.00° E. This is a starting reference only. Always read the currently selected mission coordinates from the application and validate dataset coverage before choosing a product.

---

## 1. Goal

Acquire the real NASA LOLA elevation data appropriate to the selected mission site, inspect and validate its geospatial metadata, crop a manageable local region, and export a deterministic browser-ready terrain dataset plus a complete manifest.

This phase prepares data. It must **not** implement or modify the Cesium terrain renderer, camera, rover, route, hazard detection, or unrelated UI. The prepared outputs are consumed by Phase 5.

The goal is not to place a multi-gigabyte global GeoTIFF in the browser. Keep the original source data out of `public/` and out of Git. Only a verified, cropped, reasonably sized terrain patch and its manifest may be made available to the web application.

## 2. Source selection rules

### Preferred high-detail product for the current South-Pole test location

NASA/GSFC PGDA — South Pole LOLA DEM Mosaic:

- Product page: https://pgda.gsfc.nasa.gov/products/81
- DEM: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif
- LOLA count map: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif
- Optional precomputed hillshade: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp_hillshade.tif
- Coverage: 87° S to 90° S
- Nominal pixel spacing: 5 m/pixel
- DEM file published size: approximately 3.3 GB
- Count-map published size: approximately 140 MB
- Hillshade published size: approximately 820 MB
- Projection: south-polar stereographic X/Y coordinates in metres
- Body/reference frame: MOON_ME, JPL DE421
- Pixel registration: pixel centres

The latest screenshot shows 89.50° S, 0.00° E, which falls within the stated latitude coverage. Confirm the current selected site and the actual raster footprint before using this dataset. The 5 m figure is pixel spacing, **not a guarantee that every cell represents an independent 5 m measurement**. The DEM includes interpolated fill in empty areas. Use the count map to expose measurement support and do not imply uniform data confidence.

### Broader-coverage fallback

NASA/GSFC PGDA — A New View of the Lunar South Pole from LOLA:

- Product page: https://pgda.gsfc.nasa.gov/products/90
- DEM: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF
- Coverage: 80° S to 90° S
- Nominal pixel spacing: 20 m/pixel
- Published DEM size: approximately 2.6 GB
- Product page identifies these large-area TIFs as Cloud Optimized GeoTIFFs (COGs)
- Projection: south-polar stereographic X/Y coordinates in metres
- Body/reference frame: MOON_ME, JPL DE421

Use this fallback only when the selected location is outside the 5 m mosaic footprint, the 5 m product is unavailable/incompatible, or the team explicitly chooses broader coverage over local detail. Do not switch datasets silently. Record the actual product selected in the manifest and progress report.

### Coordinate coverage policy

- If the live selected location is inside 87°–90° S and inside the raster's actual XY footprint, prefer the 5 m mosaic.
- If it is between 80°–87° S, use the 20 m large-area product if its raster bounds cover the site.
- If it is outside the verified coverage of both products, stop and identify a suitable LOLA product. Do not extrapolate, clamp to a tile edge, or show another site's terrain.
- Longitude at or very near the pole needs careful handling. Validate the projected point against the raster footprint; do not rely only on a simple latitude check.

## 3. Inspect the repository before changing anything

1. Read all five main context files and `context/progress-tracker.md`.
2. Inspect the existing simulation implementation and identify how it obtains the active site coordinates.
3. Confirm the latest Phase 3 state: the global Moon and actual WAC texture are visibly rendered. Do not change that implementation in this phase.
4. Inspect `.gitignore`, `public/`, existing scripts, Python tooling, and package/lock files.
5. Do not add a second copy of an existing data-preparation script or Python environment. Reuse current project conventions where appropriate.
6. Do not alter the active mission inputs or replace the selected location with a hardcoded South-Pole coordinate.

## 4. Download size, disk and network safeguards

The preferred 5 m DEM is a large download (about 3.3 GB), plus its count map (about 140 MB). Before downloading:

- Check available disk space. Require at least 6 GB free for raw inputs, processed outputs, temporary files and safety margin.
- Check the current source URL with `curl.exe -I -L` and record HTTP status, Content-Length if provided, Content-Type and Accept-Ranges.
- Do not assume the 5 m mosaic supports HTTP byte-range reads merely because it is a GeoTIFF. Test range support before attempting remote-window access.
- If reliable range requests are supported and the TIFF is readable as a remote COG, use GDAL/Rasterio remote window reads to avoid downloading the full file.
- If range access is not supported, use a resumable download and tell the developer the expected size before starting. Do not start a multi-gigabyte download without making its size and destination clear in the terminal output.
- Never download the source DEM into `public/`.
- Never commit the raw DEM or count-map source files.

For a resumable Windows PowerShell download, use `curl.exe` (not PowerShell's legacy `curl` alias):

```powershell
New-Item -ItemType Directory -Force data/lunar-terrain/raw | Out-Null
curl.exe -L --fail --retry 5 --retry-delay 2 -C - `
  -o data/lunar-terrain/raw/ldem_87s_5mpp.tif `
  https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif

curl.exe -L --fail --retry 5 --retry-delay 2 -C - `
  -o data/lunar-terrain/raw/ldec_87s_5mpp.tif `
  https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif
```

Only run the full-download commands after confirming disk space and that remote range access is not a suitable alternative. If the data source changes its URL or returns an error, stop and re-verify the official product page; do not guess a mirror.

## 5. Isolated preparation environment

Prefer a separate Python tooling environment so geospatial libraries do not modify the Next.js dependencies.

Example Windows setup if the repository has no existing suitable environment:

```powershell
py -3 -m venv .venv-terrain
.\.venv-terrain\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install numpy rasterio pyproj
```

Create a dedicated requirements file under the existing scripts/tools convention (for example `scripts/terrain/requirements.txt`) and record tested package versions. Do not add Rasterio, GDAL, PyProj or NumPy to `package.json`.

If Rasterio wheels or GDAL are already available in the developer's environment, reuse them. Document the actual versions used. Do not invent a successful install if it has not been tested.

## 6. Data validation before cropping

Use `gdalinfo -json` where available or Rasterio metadata inspection. Capture at minimum:

- Raster width and height.
- Band count and data type.
- NoData value.
- Scale and offset, if present.
- Affine geotransform.
- Pixel registration convention.
- Full CRS WKT and any GeoTIFF projection keys.
- Raster bounds and pixel spacing.
- Compression, tiling/COG layout and block dimensions.
- Dataset statistics and valid-data percentage.
- Actual minimum/maximum and representative sample values after applying scale/offset and NoData rules.

Verify the product's projection and reference frame from the file metadata and official product documentation. The South-Pole products are documented in a south-polar stereographic projection with coordinates in metres and MOON_ME / DE421 conventions. Do not substitute an Earth Antarctic EPSG projection or assume WGS84.

Verify the vertical semantics. Confirm whether the DEM sample values are surface height above the product's stated lunar reference radius and whether any GeoTIFF scale/offset must be applied. Do not blindly add an assumed radius to elevations during this data-preparation phase.

### Mandatory location-to-raster test

1. Obtain the active mission latitude and east-positive longitude from the application state or a documented developer input.
2. Transform that geographic position into the DEM's projected XY using the exact projection definition identified from the DEM metadata/product documentation.
3. Confirm the projected point falls inside the valid raster footprint.
4. Read a small window around the point and confirm it contains valid DEM samples.
5. Record the transform, bounds and validation outcome.

If the file does not contain enough coordinate metadata to perform a defensible transformation, stop and report the missing CRS information. Do not invent projection parameters or silently assume a longitude convention.

## 7. Crop specification

For the current 89.50° S test location, create a default local patch covering **10 km × 10 km**, centred on the active site, if and only if the selected DEM actually covers the full requested patch.

- Keep the source native resolution in a cropped GeoTIFF for archival/reprocessing.
- Generate a browser-oriented height grid at a configurable target spacing. Recommended initial target spacing: 10 m for a 10 km × 10 km patch (about 1001 × 1001 samples).
- Also preserve the native 5 m crop where available (about 2001 × 2001 samples for 10 km × 10 km).
- Resampling method must be recorded. Use a suitable elevation resampling method and do not upsample lower-resolution data to claim higher detail.
- Keep NoData as NoData; do not replace missing values with zero or interpolate across large holes without explicit, documented rules.
- Align the count map to the same output grid. Preserve counts or a validity/quality mask so later rendering can identify cells supported by measured returns versus interpolated fill.
- If the active site or desired patch is too close to the edge of coverage, reduce the crop only with an explicit warning or stop and request an alternative dataset. Do not crop beyond valid coverage.

The crop size and target spacing should be configurable from a CLI. The code must not hardcode the screenshot coordinates as the only supported location.

## 8. Required output layout

Adapt to the repository's actual conventions, but produce an equivalent structure:

```text
data/
  lunar-terrain/
    raw/                         # large downloaded files; gitignored
      ldem_87s_5mpp.tif
      ldec_87s_5mpp.tif
    processed/
      <site-key>/
        dem-native-crop.tif
        heightmap-10m.f32
        heightmap-native-5m.f32  # where applicable
        data-quality-10m.bin    # counts/mask, if available
        terrain-manifest.json
```

Large raw and native-crop files must remain outside `public/` and be gitignored. The Phase 5 implementation should load only the prepared browser-oriented files through an appropriate local service/static route, not the full source DEM. If the processed browser files are placed under `public/`, ensure they are the small cropped products only and record their size. Prefer a Next.js route or static asset convention already used in the repository.

### Manifest requirements

`terrain-manifest.json` must record:

- Schema version.
- Site key and exact source latitude/longitude (degrees; longitude east-positive).
- Crop width/height in metres.
- Raster width/height and row/column ordering.
- Pixel spacing and whether values represent pixel centres.
- Output sample type and byte order for binary files.
- NoData representation.
- Source product title, filename, official product URL and direct file URL.
- Source nominal pixel spacing and stated coverage.
- Source CRS WKT/PROJ metadata exactly as read from the file.
- Source body/reference frame (MOON_ME / DE421 where confirmed).
- Geotransform and bounds.
- Vertical units, scale/offset and reference-radius semantics where confirmed.
- Resampling method and output spacing.
- Valid-sample percentage, NoData percentage, count-map/quality summary.
- Minimum, maximum, mean and representative centre elevation after scale/offset.
- Preparation script version, tool versions and preparation timestamp.
- Warnings and any limitations (including interpolated areas and effective resolution).

Do not fabricate a checksum. Compute and record SHA-256 for downloaded files if practical; for multi-gigabyte files, make checksum computation a documented, optional long-running step rather than blocking initial metadata inspection.

## 9. Data preparation script

Add a reusable script, for example `scripts/terrain/prepare_lola_dem.py`, that:

- Accepts DEM path/URL, optional count-map path/URL, latitude, longitude, crop width/height, target sample spacing and output folder.
- Reads CRS and geotransform from the raster.
- Transforms the selected lunar coordinate to the product's projected coordinate system using verified metadata.
- Checks site and crop coverage before reading/writing output.
- Crops using a proper raster window and preserves source metadata.
- Generates browser-oriented heightmap and quality files.
- Writes a complete manifest.
- Exits non-zero on invalid CRS, out-of-bounds location, missing required data, unsupported data type, failed write or failed validation.
- Prints clear progress and final output sizes.
- Is safe to re-run and does not silently overwrite existing raw data.

The script should expose a `--inspect-only` option so the developer can verify metadata and coverage before a multi-gigabyte download/crop.

## 10. Validation and acceptance criteria

Phase 4 is complete only when all applicable checks pass:

- [ ] The exact source DEM product and official URL are recorded.
- [ ] The active mission location is read from the actual project state or a clearly documented test input.
- [ ] The selected DEM's latitude/longitude and projected bounds cover the site and requested local patch.
- [ ] File size, TIFF readability, CRS, geotransform, units, NoData and pixel spacing are validated.
- [ ] The centre point transforms to the correct raster area and returns valid elevation data.
- [ ] A local crop is generated without altering the source.
- [ ] Browser-oriented heightmap dimensions, byte order and sample count match the manifest.
- [ ] The count/quality layer is aligned when available.
- [ ] NoData and interpolated areas remain distinguishable.
- [ ] Prepared files are much smaller than the global source and are not placed in the Git history as raw files.
- [ ] A preview image (hillshade or elevation colour render) is generated from the cropped DEM for human inspection. Label it as a data preview, not the final Cesium rendering.
- [ ] Python tooling version and exact preparation command are recorded.
- [ ] `context/progress-tracker.md` is updated with file paths, data product, metadata evidence, preparation outputs, warnings, and tests.

Do not report Phase 4 complete if the data download is partial, the coordinate transformation is unverified, the crop is outside coverage, or the output manifest is missing.

## 11. Strict scope boundaries

Do not:

- Modify the existing global Cesium globe or Moon Trek imagery implementation.
- Change the mission input UI or force the selected site to 89.50° S, 0.00° E.
- Implement the terrain renderer in this phase.
- Add rover assets, rover movement, route/pathfinding, scanning, hazard detection, SIS features or new mission calculations.
- Place the 2.6–3.3 GB source products in `public/`.
- Replace real data with synthetic craters, random elevation or a screenshot texture.
- Claim that 5 m pixel spacing means every pixel contains a direct 5 m LOLA measurement.

## 12. Official sources

- PGDA South Pole LOLA DEM Mosaic (5 m/pixel, 87°–90° S): https://pgda.gsfc.nasa.gov/products/81
- Direct 5 m DEM: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif
- Direct 5 m LOLA count map: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif
- PGDA large-area South Pole LOLA DEMs (80°–90° S): https://pgda.gsfc.nasa.gov/products/90
- Direct 20 m fallback DEM: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF
- LOLA PDS archive: https://imbrium.mit.edu/
- Rasterio: https://rasterio.readthedocs.io/
- PROJ: https://proj.org/

**Cite the 5 m mosaic as:** Barker et al. (2021), “Improved LOLA Elevation Maps for South Pole Landing Sites: Error Estimates and Their Impact on Illumination Conditions,” *Planetary & Space Science*, Volume 203, 105119, https://doi.org/10.1016/j.pss.2020.10.030.

**Final handoff to Phase 5:** provide the exact `terrain-manifest.json` path, prepared heightmap path(s), dimensions, spacing, coordinate/CRS metadata, quality-mask path, preview image path, and a short summary of all validation results. Phase 5 must consume these prepared outputs; it must not re-download or guess the source data.
