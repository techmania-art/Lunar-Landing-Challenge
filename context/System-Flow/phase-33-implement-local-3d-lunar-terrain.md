# Phase 5 — Implement the Local 3D Lunar Terrain Surface

**Task type:** Cesium local terrain rendering and simulation UI integration  
**Depends on:** Phase 3 global Moon/WAC imagery working; Phase 4 LOLA DEM acquisition and preparation completed with a validated `terrain-manifest.json`  
**Primary test location:** Use the active selected mission site. The latest screenshot showed 89.50° S, 0.00° E, but never hardcode it.  
**Out of scope:** Rover movement, obstacle detection, automatic pathfinding, mission feasibility certification and SIS integration.

---

## 1. Goal

Extend the working global Moon scene with a **local, genuinely elevation-driven 3D terrain view** around the currently selected lunar mission site.

The user must be able to:

1. See the existing textured global Moon.
2. Select **Focus Mission Site**.
3. Transition to a close-up terrain patch generated from the prepared LOLA DEM produced by Phase 4.
4. Orbit, zoom, pan and tilt the camera to inspect crater floors, rims, ridges, depressions and slopes.
5. Switch between a global Moon view and local 3D terrain view.
6. Inspect elevation and source/quality metadata for the terrain under the selected location.

This must render actual measured/interpolated LOLA elevation values from the Phase 4 product. It must not create a visually convincing but synthetic terrain surface.

## 2. Preflight: inspect existing implementation

Before modifying code:

1. Read the five main context files, `context/progress-tracker.md`, all Phase 3 debug reports, and the Phase 4 data-preparation report.
2. Inspect `package.json` and the lockfile. Reuse the installed CesiumJS version and existing dependencies. Do not install a second 3D engine unless a documented technical blocker proves it necessary.
3. Inspect the existing Moon viewer, lunar ellipsoid, Moon Trek imagery provider, camera controls, selected-site state, diagnostics model and tests.
4. Inspect the Phase 4 `terrain-manifest.json` and all output files. Validate their byte sizes and sample counts before using them.
5. Confirm the Phase 4 manifest says the selected coordinate lies inside the prepared patch.
6. If Phase 4 output is missing, malformed, out of coverage or not verified, stop and report the exact missing requirement. Do not generate substitute heights.
7. Preserve the working global globe and imagery. Add a local-terrain mode around the existing simulation rather than rebuilding the global Moon.

## 3. Architecture decision

For this first local terrain implementation, prefer a **bounded local mesh patch** attached to the existing Cesium scene, rather than forcing one polar-stereographic raster crop into Cesium's global geographic terrain tiling scheme.

The renderer should be isolated behind a small feature boundary, for example:

```text
components/simulation/
  lunar-simulation-page.tsx
  lunar-globe-viewer.tsx             # existing global scene; preserve
  local-terrain-viewer.tsx           # local patch view/mode
  terrain-controls.tsx
  terrain-inspector.tsx

lib/simulation/terrain/
  terrain-manifest.ts                # runtime manifest validation
  load-terrain-patch.ts              # binary loading and bounds checks
  lunar-coordinate-transform.ts     # verified source CRS -> Moon-fixed mapping
  build-terrain-geometry.ts          # local mesh positions, indices and normals
  terrain-quality.ts                 # count/NoData/interpolation quality handling
  terrain-texture.ts                 # aligned local imagery or truthful relief style
```

Adapt the structure to current repository conventions; do not create duplicate layers if equivalent services/components exist.

### Preferred rendering path

Use Cesium primitives/geometry for the bounded patch when this is the simplest reliable fit for the existing Cesium version:

- Build vertex positions from the prepared DEM samples.
- Build triangle indices using a consistent row/column winding order.
- Build texture coordinates only from a verified georeferenced image overlay.
- Compute or supply correct vertex normals.
- Use a Cesium material/appearance appropriate to the chosen texture or relief visualization.
- Add the geometry as a `Cesium.Primitive` or equivalent supported scene primitive.
- Place the patch in the same lunar fixed frame and reference ellipsoid used by the global Moon.

A custom `TerrainProvider` or quantized-mesh tile service is a possible future architecture for seamless multi-resolution terrain over large areas. Do not introduce it for this bounded first patch unless the existing design requires it. Cesium's `CustomHeightmapTerrainProvider` is a simple option but its documented limitations include no vertex normals, no water mask and no availability support; do not select it without explicitly addressing those limitations and testing it with the non-default lunar ellipsoid and the raster's projection.

## 4. Geospatial correctness — mandatory

The Phase 4 product uses south-polar stereographic X/Y coordinates in metres and the MOON_ME / JPL DE421 reference frame. The dataset is not WGS84 and is not an Earth Antarctic raster.

Before building geometry:

- Read the CRS WKT/PROJ metadata and affine transform from the Phase 4 manifest.
- Confirm the pixel-centre registration and row orientation.
- Confirm x/y units, z units, scale/offset and NoData semantics.
- Confirm the lunar reference frame and the vertical reference-radius interpretation from source metadata.
- Use the verified inverse projection to map raster XY samples to lunar geographic coordinates or a mathematically equivalent verified Moon-fixed Cartesian transform.
- Use the same east-positive/longitude convention and lunar body frame as the existing global WAC globe.
- Do not use an Earth WGS84 ellipsoid, EPSG:3031, or generic Earth coordinate conversion.
- Do not assume that `R + height` is correct until the raster's vertical reference semantics and the viewer's lunar reference radius have been confirmed.
- Do not silently rotate, flip or mirror the DEM to make it look plausible. Validate orientation against known geographic coordinates, the Phase 4 hillshade preview and the WAC texture.

### Alignment test

At minimum, validate three non-collinear test locations in the terrain patch (centre plus two separated corners or control points):

1. Their geographic positions are inside the manifest's requested bounds.
2. Their transformed positions fall on the correct part of the lunar globe.
3. The patch centre coincides with the selected site marker.
4. The patch edges have the expected physical extent.
5. The north/east orientation agrees with the source CRS metadata and Moon Trek map convention.

A single centre marker match is not enough to prove that the patch is not rotated or mirrored.

## 5. Build the terrain mesh

Use the Phase 4 prepared browser-oriented height grid and quality data. Do not load the full source GeoTIFF in the browser.

### Mesh creation

- Validate manifest schema version, dimensions, dtype, byte order, file length, pixel spacing, bounds and NoData marker before allocation.
- Decode the binary heightmap with the manifest's declared byte order and sample type.
- Preserve the documented row/column orientation.
- Construct vertices from the exact projected sample positions and elevation values.
- Construct two triangles per valid grid cell, with consistent winding.
- Do not create triangles across NoData gaps or unsupported areas.
- Compute smooth vertex normals from neighbouring triangles or a robust equivalent; avoid using a flat blue globe material on the local patch.
- Keep source heights in metres. Apply any visualization exaggeration only as a clearly labelled display multiplier; default must be 1.0×.
- If the manifest provides count/quality information, preserve it and expose it to the inspector.
- Use an indexed geometry and avoid duplicating vertices unnecessarily.

### Performance

A full 5 m, 10 km × 10 km patch is approximately 2001 × 2001 samples and can produce about four million vertices. Do not blindly allocate/render the full native grid at every camera distance.

Implement a staged quality strategy:

- Initial/overview mesh: use a documented coarser grid (for example 20 m or a suitable decimation) from the same source crop.
- Close inspection: progressively load a denser prepared grid (for example 10 m, then native 5 m where hardware permits).
- Keep the sample spacing and resampling method visible in metadata.
- Use Web Workers for expensive decode/mesh preprocessing if it improves responsiveness and is compatible with the existing application.
- Dispose old geometry, buffers, materials and textures when changing site, mode or component lifecycle.
- Avoid rebuilding the entire geometry on every React render.
- Respect device capability and support a reduced detail level on mobile.

Do not claim native 5 m geometry if the browser is displaying a 10 m or 20 m decimated grid.

## 6. Surface appearance and texture alignment

The local terrain should visually match the lunar surface, not look like a generic blue heightmap.

Priority:

1. Use a georeferenced local lunar image layer/texture that is proven to align with the DEM. For the South Pole patch, inspect Moon Trek's South Pole WAC imagery/map services and verify their projection and tile matrix before using them. Do not reuse an equatorial/equirectangular tile matrix as a polar texture without a correct reprojection.
2. If a suitable imagery texture is not yet aligned, render the actual DEM as a shaded-relief/elevation material derived from measured height values. Label it clearly as an elevation/shaded-relief view, not as a photographic WAC texture.
3. Never use a decorative Moon image, procedural crater generator or random noise as a substitute for measured terrain.

If generating a local texture from Moon Trek imagery:

- Query the official WMTS capabilities for the correct South Pole layer, style, format and tile matrix set.
- Reproject/mosaic only the tiles needed for the local crop using a verified CRS transformation.
- Record the tile identifiers, source URL, projection and resampling method.
- Confirm texture tie points against the DEM patch before displaying it.
- Do not mark texture alignment as verified based only on a successful image request.

### Lighting and relief

- Use a coherent directional light and ambient contribution to make relief visible.
- Allow camera tilt and ground-level views.
- Add optional hillshade/elevation/slope visualization modes only when derived from the actual data.
- Keep the natural relief at 1× by default. If users increase vertical exaggeration, show the selected multiplier prominently.
- Avoid over-darkening that hides measured surface detail.

## 7. Global-to-local view interaction

Retain the existing global Moon mode and the current working Moon Trek WAC layer.

### Global Moon mode

- Show the existing fully textured lunar globe.
- Preserve its existing camera controls, imagery provider and diagnostics.
- Keep selected mission coordinates and marker synchronized with application state.

### Focus Mission Site / Local Terrain mode

When the user chooses **Focus Mission Site**:

1. Validate the active selected coordinates.
2. Confirm they match the Phase 4 terrain patch manifest/site key and lie within its bounds.
3. Transition camera smoothly to the patch centre.
4. Switch to the local terrain mesh view or reveal it as a correctly aligned patch.
5. Show a local camera angle that makes relief visible (oblique default); allow top-down and ground/low-oblique inspection.
6. Display a selected-site marker attached to the actual mesh surface, not a fixed screen pixel.
7. Keep the global Moon available through **Global Moon**.
8. If the selected site changes and no matching prepared patch exists, show **Terrain data not prepared for this site** and do not display another site's terrain.

Do not scale the local patch arbitrarily to fill the screen. Preserve its true horizontal dimensions relative to the Moon. Use camera framing to make it viewable.

## 8. UI requirements

Preserve the existing dark aerospace UI and current three-column simulation layout. Do not redesign the whole page.

### Add to the simulation controls

- **Global Moon** button — returns to global globe mode.
- **Focus Mission Site** button — enters local terrain mode.
- **Terrain layer** selector:
  - Lunar imagery + 3D elevation (only when image alignment is verified)
  - Elevation
  - Hillshade
  - Slope (only when calculated from real data or supplied by the source)
- **Camera view** selector: Top / Oblique / Ground.
- **Vertical exaggeration** control, initially 1.0×.
- Optional **Terrain quality** selector: Overview / Detailed / Native, showing actual sample spacing for each.

### Add a local terrain information panel

Display values derived from the selected DEM patch:

- Selected coordinates.
- Elevation (m), sampled/interpolated with method identified.
- Local grid/sample spacing.
- Source product and acquisition/reference metadata.
- Data quality/count status where available.
- NoData/interpolated warning when applicable.
- Current vertical exaggeration.

If the clicked location has no valid DEM sample, show **Elevation unavailable**. Never use 0 m as a default.

### Loading and errors

Provide separate honest states:

- Loading terrain manifest.
- Loading elevation data.
- Building local terrain geometry.
- Terrain ready.
- Terrain partially available (NoData/quality gaps).
- Terrain not prepared for selected site.
- Unsupported CRS or invalid manifest.
- Texture unavailable while elevation relief remains viewable.
- Rendering/performance failure with a retry or lower-detail option.

Do not mark a single generic status “Terrain loaded” before the manifest, binary data, mesh and visual rendering checks have completed.

## 9. Testing and verification

### Unit tests

Test:

- Manifest schema validation and unsupported schema rejection.
- Binary byte length equals width × height × bytes/sample.
- Correct byte-order decoding using known fixture values.
- Row orientation and pixel-centre handling.
- NoData handling and prevention of triangles across invalid cells.
- Coordinate transform for the patch centre and at least two corners/control points.
- Mesh index bounds and triangle winding.
- Elevation sample lookup returns correct units and does not substitute zero for missing data.
- Vertical exaggeration defaults to 1.0 and changes display only, not source values.
- Wrong-site manifest is rejected.

### Browser tests

Use the existing Playwright setup if present; do not add a second browser test framework.

Test:

1. Open the 3D Simulation page; the global textured Moon remains visible.
2. Click **Focus Mission Site**; the local terrain patch becomes visible.
3. Confirm the patch has measurable relief and is not a flat image plane.
4. Rotate to an oblique/low angle and observe crater floors/rims as actual geometry.
5. Switch between Global Moon and Local Terrain without losing the selected site.
6. Change the mission coordinate; stale terrain must not remain labelled as current.
7. Change terrain quality and confirm the displayed resolution label changes honestly.
8. Test missing DEM and invalid manifest states.
9. Check browser console and network for errors.
10. Capture screenshots of global, local top-down, local oblique and local ground/low-angle views.

### Evidence required for PASS

- Screenshots showing the complete textured global Moon.
- Screenshots showing the local elevation mesh from top-down and oblique/low-angle camera views.
- Browser console/network evidence that the prepared Phase 4 files loaded successfully.
- Diagnostics confirming the exact source DEM, sample spacing, dimensions and manifest site key.
- A numeric elevation sample at the patch centre that matches the source raster within the documented interpolation/resampling tolerance.
- A terrain profile across the patch showing non-constant values where source data indicates relief.
- Unit tests, typecheck, lint, production build and browser tests passing.

A hillshade screenshot alone is not proof of 3D geometry. The surface must visibly change under camera angle and be backed by actual elevation samples.

## 10. Diagnostics model

Keep distinct checks, for example:

- Terrain manifest: PASS / FAIL.
- Heightmap decode: PASS / FAIL.
- CRS transformation: PASS / FAIL.
- Site within patch: PASS / FAIL.
- Geometry generated: PASS / FAIL.
- Non-flat relief verified: PASS / FAIL.
- Quality mask loaded: PASS / PARTIAL / NOT AVAILABLE.
- Local imagery alignment: PASS / PARTIAL / NOT AVAILABLE.
- Browser visual acceptance: PASS / FAIL / NOT TESTED.

Do not label the DEM as “NASA terrain verified” if only the URL or manifest was read. Keep data retrieval, decoding, geometry generation and browser visual acceptance as separate stages.

## 11. Strict scope boundaries

Do not implement in this phase:

- Rover model, wheels, steering, speed or movement.
- Route animation or source-to-destination traverse.
- Obstacle scanner, rock/crater detection or hazard avoidance.
- A* pathfinding or route optimization.
- Rover physics or energy simulation.
- SIS/LMM context integration.
- New NASA scientific calculations unrelated to rendering the selected DEM.
- Replacement of the global Moon/WAC renderer.

These are later phases. Keep the terrain component reusable for rover navigation later.

## 12. Documentation updates

After implementation, update:

- `context/architecture-context.md`: data contract, local terrain renderer, CRS and transform boundaries.
- `context/ui-context.md`: global/local mode, controls, loading and failure states.
- `context/project-overview.md`: local LOLA terrain visualization capability, with resolution and limitations.
- `context/code-standards.md`: terrain binary/CRS/NoData and mesh rules if not already covered.
- `context/ai-workflow-rules.md`: phase completion evidence and boundaries.
- `context/progress-tracker.md`: exact files, DEM version, source product, actual sample spacing, tests, screenshots and remaining issues.

Do not mark the phase fully complete if texture alignment is pending; the elevation mesh can be separately reported as verified while surface imagery alignment remains partial.

## 13. Acceptance criteria

Phase 5 is verified only when:

- [ ] The existing global Moon and Moon Trek WAC imagery still work.
- [ ] A validated Phase 4 manifest and prepared data files are used.
- [ ] The active mission location matches the prepared terrain patch.
- [ ] The selected local terrain is generated from actual LOLA DEM heights.
- [ ] Camera oblique/ground views demonstrate real geometric relief.
- [ ] The selected-site marker is attached to the terrain at the correct location.
- [ ] Horizontal patch dimensions and elevations use documented units and scales.
- [ ] The UI reports source resolution, actual rendered sample spacing and vertical exaggeration.
- [ ] NoData, interpolation and quality metadata are represented honestly.
- [ ] Local imagery is aligned or clearly shown as unavailable; no misregistered texture is presented as real.
- [ ] Global-to-local switching works and does not break the existing Moon globe.
- [ ] Unit, browser, typecheck, lint and production build checks pass.
- [ ] Screenshots and runtime evidence are recorded in the progress tracker.

**Final status:** `VERIFIED` only after actual elevation-derived relief is visible in the browser and supported by numeric/source evidence. Otherwise report `PARTIAL` and name the exact missing criterion.

## 14. Official technical references

- PGDA South Pole LOLA DEM Mosaic (5 m/pixel, 87°–90° S): https://pgda.gsfc.nasa.gov/products/81
- PGDA 80°–90° S large-area LOLA DEMs: https://pgda.gsfc.nasa.gov/products/90
- Moon Trek: https://trek.nasa.gov/moon/
- Cesium `CustomHeightmapTerrainProvider` and its limitations: https://cesium.com/learn/cesiumjs/ref-doc/CustomHeightmapTerrainProvider.html
- Cesium `TerrainProvider` overview: https://cesium.com/learn/cesiumjs/ref-doc/TerrainProvider.html
- Rasterio: https://rasterio.readthedocs.io/
- PROJ: https://proj.org/

**Required citation for the 5 m South Pole mosaic:** Barker et al. (2021), “Improved LOLA Elevation Maps for South Pole Landing Sites: Error Estimates and Their Impact on Illumination Conditions,” *Planetary & Space Science*, Volume 203, 105119, https://doi.org/10.1016/j.pss.2020.10.030.
